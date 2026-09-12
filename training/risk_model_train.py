"""
risk_model_train.py
===================
Trains the Risk Radar neural network on historical asset features.

USAGE:
  python risk_model_train.py [--tickers-file tickers.txt] [--epochs 50]
                             [--output-dir outputs/] [--generate-seed]

PIPELINE:
  1. Data Collection   — yfinance feature extraction (or synthetic fallback)
  2. Label Generation  — weak supervision via percentile-rank heuristics
  3. Model Definition  — RiskNet (6→64→32→3)
  4. Training          — Adam + CrossEntropy, 80/20 stratified split
  5. Evaluation        — classification report + confusion matrix
  6. ONNX Export       — opset 17, verified with onnxruntime
"""

import argparse
import json
import math
import os
import shutil
import sys
import time
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import onnx
import onnxruntime as ort
import pandas as pd
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
import yfinance as yf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tqdm import tqdm

warnings.filterwarnings("ignore")

# ============================================================
# SECTION 0 — CONSTANTS & DEFAULT TICKER LIST
# ============================================================

SECTOR_MAP = {
    "Technology": 0,
    "Healthcare": 1,
    "Financials": 2,
    "Consumer Discretionary": 3,
    "Consumer Staples": 4,
    "Energy": 5,
    "Industrials": 6,
    "Materials": 7,
    "Real Estate": 8,
    "Utilities": 9,
    "Communication Services": 10,
    "Unknown": 5,  # default to middle bucket
}

# 150 S&P 500 + common ETF tickers (hardcoded fallback)
DEFAULT_TICKERS = [
    # Tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA", "AVGO", "ORCL",
    "CRM", "AMD", "INTC", "QCOM", "TXN", "AMAT", "MU", "LRCX", "KLAC", "ADI",
    "SNPS", "CDNS", "NOW", "INTU", "ADBE", "PANW", "CRWD", "ZS", "FTNT",
    # Healthcare
    "JNJ", "UNH", "LLY", "ABBV", "MRK", "TMO", "ABT", "DHR", "BMY", "AMGN",
    "GILD", "ISRG", "SYK", "MDT", "ZBH", "BDX", "EW", "RMD", "IDXX", "DXCM",
    # Financials
    "BRK-B", "JPM", "BAC", "WFC", "GS", "MS", "BLK", "SCHW", "AXP", "CB",
    "MMC", "PGR", "TRV", "ALL", "MET", "PRU", "USB", "PNC", "TFC", "COF",
    # Consumer Discretionary
    "HD", "MCD", "NKE", "SBUX", "TJX", "BKNG", "MAR", "RCL", "CCL", "LOW",
    "ORLY", "AZO", "TSCO", "CMG", "YUM", "DRI", "ULTA",
    # Consumer Staples
    "PG", "KO", "PEP", "COST", "WMT", "PM", "MO", "MDLZ", "CL", "KHC",
    # Energy
    "XOM", "CVX", "COP", "EOG", "SLB", "MPC", "VLO", "PSX", "OXY", "HAL",
    # Industrials
    "CAT", "DE", "HON", "UPS", "FDX", "LMT", "RTX", "NOC", "GE", "MMM",
    "EMR", "ETN", "PH", "ROK", "ITW", "GD", "BA",
    # Materials
    "LIN", "APD", "SHW", "FCX", "NEM", "NUE", "CF",
    # Real Estate
    "AMT", "PLD", "CCI", "EQIX", "PSA", "O", "WELL",
    # Utilities
    "NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE",
    # Communication
    "T", "VZ", "NFLX", "DIS", "CMCSA", "TMUS",
    # ETFs (higher vol / benchmark anchors)
    "SPY", "QQQ", "IWM", "EFA", "EEM", "VTI", "GLD", "SLV", "TLT", "HYG",
    "XLK", "XLF", "XLE", "XLV", "XLI",
]

FEATURES = [
    "annualized_vol",
    "beta_vs_spy",
    "max_drawdown_1yr",
    "log_market_cap",
    "sector_encoded",
    "avg_volume_zscore",
]


# ============================================================
# SECTION 1 — DATA COLLECTION HELPERS
# ============================================================

def fetch_spy_returns() -> pd.Series:
    """Download SPY daily returns used as the market benchmark for beta calculation."""
    spy = yf.download("SPY", period="2y", progress=False)
    spy_returns = spy["Close"].squeeze().pct_change().dropna()
    return spy_returns


def compute_beta(ticker_returns: pd.Series, spy_returns: pd.Series) -> float:
    """
    Compute OLS beta of ticker vs SPY via covariance / variance.

    Returns 1.0 as a neutral fallback when data is insufficient.
    """
    aligned = pd.concat([ticker_returns, spy_returns], axis=1).dropna()
    if len(aligned) < 20:
        return 1.0
    cov = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])
    beta = cov[0, 1] / cov[1, 1] if cov[1, 1] != 0 else 1.0
    return float(beta)


def compute_max_drawdown_1yr(prices: pd.Series) -> float:
    """
    Max drawdown over the last 252 trading days.

    Defined as max((running_peak - price) / running_peak).
    Returns 0.0 when fewer than 20 data points are available.
    """
    prices_1yr = prices.tail(252)
    if len(prices_1yr) < 20:
        return 0.0
    rolling_peak = prices_1yr.cummax()
    drawdown = (rolling_peak - prices_1yr) / rolling_peak
    return float(drawdown.max())


def fetch_ticker_features(
    ticker: str, spy_returns: pd.Series, vol_benchmark: dict
) -> dict | None:
    """
    Download 2 years of data for a single ticker and compute all 6 features.

    Parameters
    ----------
    ticker : str
        Ticker symbol.
    spy_returns : pd.Series
        Pre-downloaded SPY daily returns (benchmark).
    vol_benchmark : dict
        Dict with keys 'avg_volume_mean' and 'avg_volume_std' for z-score normalization
        (populated after a first-pass collection of volumes; pass empty dict for first pass).

    Returns
    -------
    dict | None
        Feature dict or None if the ticker should be skipped.
    """
    try:
        info = yf.Ticker(ticker)
        hist = yf.download(ticker, period="2y", progress=False)

        if hist.empty or len(hist) < 50:
            warnings.warn(f"[SKIP] {ticker}: insufficient history ({len(hist)} rows)")
            return None

        prices = hist["Close"].squeeze()
        volume = hist["Volume"].squeeze()

        daily_returns = prices.pct_change().dropna()
        ann_vol = float(daily_returns.std() * math.sqrt(252))

        beta = compute_beta(daily_returns, spy_returns)
        max_dd = compute_max_drawdown_1yr(prices)

        # Market cap — prefer fast_info, fall back to info dict
        try:
            mkt_cap = info.fast_info.market_cap
        except Exception:
            mkt_cap = info.info.get("marketCap", None)

        if mkt_cap and mkt_cap > 0:
            log_mkt_cap = math.log10(mkt_cap)
        else:
            log_mkt_cap = 9.0  # ~$1B default

        # Sector encoding
        try:
            sector_str = info.info.get("sector", "Unknown") or "Unknown"
        except Exception:
            sector_str = "Unknown"
        sector_enc = SECTOR_MAP.get(sector_str, SECTOR_MAP["Unknown"])

        avg_vol = float(volume.mean())

        return {
            "ticker": ticker,
            "annualized_vol": ann_vol,
            "beta_vs_spy": beta,
            "max_drawdown_1yr": max_dd,
            "log_market_cap": log_mkt_cap,
            "sector_encoded": sector_enc,
            "avg_volume_raw": avg_vol,
            "sector_str": sector_str,
        }

    except Exception as exc:
        warnings.warn(f"[SKIP] {ticker}: {exc}")
        return None


def collect_features(tickers: list[str]) -> pd.DataFrame:
    """
    Fetch features for all tickers.  Skips failures gracefully.

    Returns a DataFrame with columns = FEATURES + ['ticker'].
    """
    print("\n=== STAGE 1: Data Collection ===")
    print(f"Fetching SPY benchmark…")
    spy_returns = fetch_spy_returns()

    rows = []
    for ticker in tqdm(tickers, desc="Downloading tickers"):
        row = fetch_ticker_features(ticker, spy_returns, {})
        if row is not None:
            rows.append(row)

    if len(rows) < 30:
        raise RuntimeError(
            f"Only {len(rows)} tickers succeeded — too few to train. "
            "Run with --generate-seed for offline mode."
        )

    df = pd.DataFrame(rows)

    # Compute avg_volume_zscore now that we have all volumes
    vol_mean = df["avg_volume_raw"].mean()
    vol_std = df["avg_volume_raw"].std()
    df["avg_volume_zscore"] = (df["avg_volume_raw"] - vol_mean) / (vol_std + 1e-9)

    return df[["ticker"] + FEATURES]


# ============================================================
# SECTION 2 — SYNTHETIC DATA (FALLBACK / SEED MODE)
# ============================================================

def generate_synthetic_features(n: int = 300, seed: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic dataset with realistic financial feature distributions.

    Used when --generate-seed is passed or when yfinance is unreachable.
    This is clearly documented as synthetic — never use for production reports.

    Distributions (approximate):
      annualized_vol   ~ LogNormal(mean=-1.5, sigma=0.5)  → mostly 0.10–0.50
      beta_vs_spy      ~ Normal(1.0, 0.4)
      max_drawdown_1yr ~ LogNormal(mean=-2.0, sigma=0.6)
      log_market_cap   ~ Normal(10.0, 1.5)                → $1B–$1T range
      sector_encoded   ~ Uniform integers 0–10
      avg_volume_zscore~ Normal(0.0, 1.0)
    """
    print("\n[SYNTHETIC MODE] Generating synthetic features…")
    rng = np.random.default_rng(seed)

    ann_vol = rng.lognormal(mean=-1.5, sigma=0.5, size=n).clip(0.05, 2.0)
    beta = rng.normal(1.0, 0.4, size=n).clip(-0.5, 3.5)
    max_dd = rng.lognormal(mean=-2.0, sigma=0.6, size=n).clip(0.0, 0.9)
    log_mktcap = rng.normal(10.0, 1.5, size=n).clip(6.0, 13.5)
    sector = rng.integers(0, 11, size=n)
    vol_z = rng.normal(0.0, 1.0, size=n)

    tickers = [f"SYN{i:04d}" for i in range(n)]

    return pd.DataFrame(
        {
            "ticker": tickers,
            "annualized_vol": ann_vol,
            "beta_vs_spy": beta,
            "max_drawdown_1yr": max_dd,
            "log_market_cap": log_mktcap,
            "sector_encoded": sector.astype(float),
            "avg_volume_zscore": vol_z,
        }
    )


# ============================================================
# SECTION 3 — WEAK-SUPERVISION LABEL GENERATION
# ============================================================
# NOTE: These labels are NOT ground-truth annotations.
# They are derived from percentile-rank heuristics applied to
# observed data. Specifically:
#   High risk:   volatility ≥ 70th pct AND beta ≥ 65th pct AND drawdown ≥ 70th pct
#   Low risk:    volatility ≤ 30th pct AND beta ≤ 35th pct AND drawdown ≤ 30th pct
#   Medium risk: everything else
# This is a form of weak (programmatic) supervision.  The model learns
# relative risk rank patterns — not absolute financial risk definitions.
# State this honestly in any public presentation.

def generate_labels(df: pd.DataFrame) -> pd.Series:
    """
    Apply weak-supervision heuristic to assign risk class (0=Low, 1=Medium, 2=High).

    Labels are based on percentile ranks of the three primary risk drivers:
    annualized volatility, market beta, and 1-year max drawdown.
    """
    print("\n=== STAGE 2: Label Generation (Weak Supervision) ===")

    vol_pct = df["annualized_vol"].rank(pct=True) * 100
    beta_pct = df["beta_vs_spy"].rank(pct=True) * 100
    dd_pct = df["max_drawdown_1yr"].rank(pct=True) * 100

    labels = np.ones(len(df), dtype=int)  # default = Medium (1)

    high_mask = (vol_pct >= 70) & (beta_pct >= 65) & (dd_pct >= 70)
    low_mask = (vol_pct <= 30) & (beta_pct <= 35) & (dd_pct <= 30)

    labels[high_mask] = 2  # High
    labels[low_mask] = 0   # Low

    dist = pd.Series(labels).value_counts().sort_index()
    print(f"  Class distribution: Low={dist.get(0,0)}, Medium={dist.get(1,0)}, High={dist.get(2,0)}")

    # Warn on severe imbalance (< 5% of any class)
    for cls, name in [(0, "Low"), (1, "Medium"), (2, "High")]:
        pct = dist.get(cls, 0) / len(labels) * 100
        if pct < 5:
            print(
                f"  ⚠️  WARNING: class '{name}' represents only {pct:.1f}% of data — "
                "consider collecting more diverse tickers."
            )

    return pd.Series(labels, name="risk_label")


# ============================================================
# SECTION 4 — MODEL DEFINITION
# ============================================================

class RiskNet(nn.Module):
    """
    Feedforward network for 3-class asset risk classification.

    Architecture:
      Input (6 features)
        → Linear(6, 64) + BatchNorm1d(64) + ReLU + Dropout(0.30)
        → Linear(64, 32) + BatchNorm1d(32) + ReLU + Dropout(0.20)
        → Linear(32, 3)   # logits for Low / Medium / High
    """

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(6, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.30),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(0.20),
            nn.Linear(32, 3),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass — returns raw logits (shape: [batch, 3])."""
        return self.net(x)


# ============================================================
# SECTION 5 — TRAINING UTILITIES
# ============================================================

def accuracy(logits: torch.Tensor, labels: torch.Tensor) -> float:
    """Compute batch accuracy from logits and integer labels."""
    preds = logits.argmax(dim=1)
    return (preds == labels).float().mean().item()


def train_epoch(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    """Run one full training epoch. Returns (mean_loss, mean_accuracy)."""
    model.train()
    total_loss, total_acc, n = 0.0, 0.0, 0
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        optimizer.zero_grad()
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(y_batch)
        total_acc += accuracy(logits, y_batch) * len(y_batch)
        n += len(y_batch)
    return total_loss / n, total_acc / n


@torch.no_grad()
def eval_epoch(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    """Evaluate on a data loader. Returns (mean_loss, mean_accuracy)."""
    model.eval()
    total_loss, total_acc, n = 0.0, 0.0, 0
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(device), y_batch.to(device)
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        total_loss += loss.item() * len(y_batch)
        total_acc += accuracy(logits, y_batch) * len(y_batch)
        n += len(y_batch)
    return total_loss / n, total_acc / n


# ============================================================
# SECTION 6 — MAIN TRAINING PIPELINE
# ============================================================

def run_training(args: argparse.Namespace) -> None:
    """Execute the complete training pipeline end-to-end."""

    output_dir = Path(args.output_dir)
    data_dir = Path("data")
    output_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    backend_dir = Path("../backend/models")
    backend_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n🚀 MoneyMind — Risk Radar Training")
    print(f"   Device: {device}")
    print(f"   Output: {output_dir.resolve()}")

    # ── 1. Data ──────────────────────────────────────────────
    features_csv = data_dir / "risk_features.csv"

    if args.generate_seed:
        df = generate_synthetic_features(n=300)
    else:
        # Load ticker list
        if args.tickers_file and Path(args.tickers_file).exists():
            tickers = Path(args.tickers_file).read_text().splitlines()
            tickers = [t.strip() for t in tickers if t.strip()]
            print(f"Loaded {len(tickers)} tickers from {args.tickers_file}")
        else:
            tickers = DEFAULT_TICKERS
            print(f"Using {len(tickers)} hardcoded tickers")

        try:
            df = collect_features(tickers)
        except Exception as exc:
            print(f"\n⚠️  yfinance collection failed: {exc}")
            print("   Falling back to synthetic data (--generate-seed mode)…\n")
            df = generate_synthetic_features(n=300)

    df.to_csv(features_csv, index=False)
    print(f"  Saved raw features → {features_csv}")

    # ── 2. Labels ─────────────────────────────────────────────
    labels = generate_labels(df)

    X = df[FEATURES].values.astype(np.float32)
    y = labels.values.astype(np.int64)

    # ── Normalize ─────────────────────────────────────────────
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X).astype(np.float32)

    # Save scaler as JSON
    scaler_dict = {
        "feature_names": FEATURES,
        "mean": scaler.mean_.tolist(),
        "std": scaler.scale_.tolist(),
    }
    scaler_path = output_dir / "risk_scaler.json"
    with open(scaler_path, "w") as f:
        json.dump(scaler_dict, f, indent=2)
    print(f"  Scaler saved → {scaler_path}")

    # ── Train / Val split ─────────────────────────────────────
    X_train, X_val, y_train, y_val = train_test_split(
        X_scaled, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\n  Train: {len(X_train)}  Val: {len(X_val)}")

    train_ds = torch.utils.data.TensorDataset(
        torch.tensor(X_train), torch.tensor(y_train)
    )
    val_ds = torch.utils.data.TensorDataset(
        torch.tensor(X_val), torch.tensor(y_val)
    )
    train_loader = torch.utils.data.DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = torch.utils.data.DataLoader(val_ds, batch_size=64)

    # ── 3. Model ──────────────────────────────────────────────
    print("\n=== STAGE 3: Model ===")
    model = RiskNet().to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"  RiskNet — {total_params:,} parameters")

    optimizer = optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    # ── 4. Training loop ──────────────────────────────────────
    print(f"\n=== STAGE 4: Training ({args.epochs} epochs) ===")
    best_val_acc = 0.0
    checkpoint_path = output_dir / "risk_best.pt"
    train_acc_history, val_acc_history = [], []

    for epoch in range(1, args.epochs + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        vl_loss, vl_acc = eval_epoch(model, val_loader, criterion, device)
        train_acc_history.append(tr_acc)
        val_acc_history.append(vl_acc)

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            torch.save(model.state_dict(), checkpoint_path)

        if epoch % 10 == 0 or epoch == 1:
            print(
                f"  Epoch {epoch:3d}/{args.epochs}  "
                f"train_loss={tr_loss:.4f}  train_acc={tr_acc:.3f}  "
                f"val_loss={vl_loss:.4f}  val_acc={vl_acc:.3f}"
            )

    print(f"\n  ✅ Best val accuracy: {best_val_acc:.4f}")
    print(f"  Checkpoint → {checkpoint_path}")

    # ── 5. Evaluation ─────────────────────────────────────────
    print("\n=== STAGE 5: Evaluation ===")

    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()

    with torch.no_grad():
        X_val_t = torch.tensor(X_val).to(device)
        val_logits = model(X_val_t)
        val_preds = val_logits.argmax(dim=1).cpu().numpy()

    train_acc_final = train_acc_history[-1]
    val_accuracy = float((val_preds == y_val).mean())

    print(f"  Train accuracy (last epoch): {train_acc_final:.4f}")
    print(f"  Val accuracy  (best model) : {val_accuracy:.4f}")
    print("\n  Classification Report:")
    print(
        classification_report(
            y_val, val_preds, target_names=["Low", "Medium", "High"]
        )
    )

    # Confusion matrix
    cm = confusion_matrix(y_val, val_preds)
    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["Low", "Medium", "High"],
        yticklabels=["Low", "Medium", "High"],
        ax=ax,
    )
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Label")
    ax.set_title("RiskNet — Confusion Matrix (Validation Set)")
    plt.tight_layout()
    cm_path = output_dir / "risk_confusion_matrix.png"
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"  Confusion matrix → {cm_path}")

    # ── Assertion: guard against exporting a bad model ────────
    assert val_accuracy > 0.6, (
        f"Model underperforming (val_accuracy={val_accuracy:.3f}) — "
        "check labels/features before exporting. "
        "Run with --generate-seed if yfinance data was unavailable."
    )

    # ── 6. ONNX Export ────────────────────────────────────────
    print("\n=== STAGE 6: ONNX Export ===")

    model.load_state_dict(torch.load(checkpoint_path, map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 6)
    onnx_path = output_dir / "risk_model.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        opset_version=17,
        input_names=["features"],
        output_names=["logits"],
        dynamic_axes={"features": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )

    # Verify with onnxruntime
    ort_session = ort.InferenceSession(str(onnx_path))
    sample = np.random.randn(1, 6).astype(np.float32)
    t0 = time.perf_counter()
    ort_out = ort_session.run(None, {"features": sample})
    t1 = time.perf_counter()

    model_size_kb = onnx_path.stat().st_size / 1024
    print(f"  ONNX model size : {model_size_kb:.1f} KB")
    print(f"  ORT sample output: {ort_out[0]}")
    print(f"  Estimated inference time: {(t1 - t0)*1000:.2f} ms")

    # Copy to backend
    shutil.copy(onnx_path, backend_dir / "risk_model.onnx")
    shutil.copy(scaler_path, backend_dir / "risk_scaler.json")
    print(f"  Copied → {backend_dir / 'risk_model.onnx'}")
    print(f"  Copied → {backend_dir / 'risk_scaler.json'}")

    print("\n🎉 Risk Radar training complete!")


# ============================================================
# SECTION 7 — CLI ENTRY POINT
# ============================================================

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Train the MoneyMind Risk Radar neural network.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--tickers-file",
        type=str,
        default=None,
        help="Path to a plain-text file with one ticker per line. "
             "Falls back to the hardcoded 150-ticker list if omitted.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Number of training epochs.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="outputs",
        help="Directory to write checkpoints, ONNX model, and plots.",
    )
    parser.add_argument(
        "--generate-seed",
        action="store_true",
        default=False,
        help="Skip yfinance and generate a synthetic dataset instead. "
             "Useful for offline / CI runs.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_training(args)
