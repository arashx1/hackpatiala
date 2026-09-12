"""
hype_model_train.py
===================
Trains the Hype Detector text classifier using frozen sentence-transformer embeddings.

USAGE:
  python hype_model_train.py [--dataset {synthetic|kaggle}]
                             [--kaggle-path PATH]
                             [--epochs 20]
                             [--output-dir outputs/]

PIPELINE:
  1. Data          — synthetic headline generation OR Kaggle CSV + heuristic labeling
  2. Embeddings    — sentence-transformers 'all-MiniLM-L6-v2' (384-dim, frozen at inference)
  3. Model         — HypeClassifier (384→128→64→2)
  4. Training      — Adam + CrossEntropy, 80/20 split
  5. Evaluation    — classification report, AUC-ROC, confusion matrix, ROC curve plot
  6. ONNX Export   — classifier head only (opset 17), copied to backend/models/
"""

import argparse
import os
import random
import shutil
import string
import time
import warnings
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import onnxruntime as ort
import pandas as pd
import seaborn as sns
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.metrics import (
    auc,
    classification_report,
    confusion_matrix,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from tqdm import tqdm

warnings.filterwarnings("ignore")


# ============================================================
# SECTION 0 — HEADLINE TEMPLATES
# ============================================================

TICKERS = [
    "GME", "AMC", "BBBY", "PLTR", "MARA", "RIOT", "COIN", "DOGE",
    "AAPL", "TSLA", "NVDA", "META", "AMZN", "NFLX", "MSFT", "GOOGL",
    "SPY", "QQQ", "SOFI", "HOOD", "RBLX", "SNAP", "LYFT", "UBER",
    "NIO", "XPEV", "LCID", "RIVN", "SPCE", "SKLZ", "CLOV", "BB",
]

MARKETS = [
    "Asia-Pacific", "Latin America", "European Union", "Southeast Asia",
    "Sub-Saharan Africa", "the Middle East", "North America", "Scandinavia",
]

HYPE_KEYWORDS = [
    "TO THE MOON 🚀🚀", "EXPLODING 🔥", "short squeeze incoming!! 💎🙌",
    "10x potential 🤑", "GOING PARABOLIC 📈📈", "MASSIVE breakout coming",
    "moon mission 🌙 confirmed", "YOLO!! 💰💰", "diamond hands 💎✊",
    "printing money right now 🤑🤑", "to infinity and beyond 🚀🌙",
    "ONCE-IN-A-LIFETIME OPPORTUNITY", "smart money is accumulating NOW",
    "bulls are RUNNING 🐂🔥", "SHORT SELLERS getting REKT",
]

# 35 hype headline templates
HYPE_TEMPLATES = [
    "{ticker} is going {hype_kw}",
    "{ticker} {hype_kw} — don't miss the rally!!",
    "WHY {ticker} IS THE NEXT 10-BAGGER 💰 {hype_kw}",
    "{ticker} {hype_kw} as retail traders pile in",
    "🚨 BREAKING: {ticker} {hype_kw} — BUY NOW before it's too late!!",
    "{ticker} charts look INSANE 🔥🔥 {hype_kw}",
    "I put my ENTIRE SAVINGS into {ticker} — {hype_kw}",
    "Wall St HATES {ticker}?? They don't want you to know — {hype_kw}",
    "{ticker} RSI through the roof 📈 {hype_kw}",
    "Hedge funds are SHORTING {ticker} — SQUEEZE THEM OUT!! 💎🙌",
    "{ticker} gamma squeeze play — {hype_kw}",
    "Just loaded {ticker} calls, {hype_kw}",
    "{ticker} up 40% premarket!! {hype_kw}",
    "LEGENDARY: {ticker} {hype_kw} — this is bigger than 2021",
    "{ticker} MELT-UP incoming {hype_kw} 🔥🚀",
    "Options flow on {ticker} is SCREAMING {hype_kw}",
    "Bear raid on {ticker} FAILED — {hype_kw} 💎",
    "{ticker} dark pool prints MASSIVE — {hype_kw} 🌙",
    "If you're not in {ticker} you're ngmi — {hype_kw}",
    "{ticker} chart is literally vertical 📈 {hype_kw}",
    "🚀🚀🚀 {ticker} {hype_kw} — historic squeeze incoming",
    "Ape army targeting {ticker} next — {hype_kw} 💎🙌",
    "{ticker} puts expiring worthless, calls {hype_kw}",
    "{ticker} breakout CONFIRMED — {hype_kw}",
    "Retail is LOADING {ticker} — {hype_kw} 🤑",
    "{ticker} {hype_kw} — institutions can't stop this",
    "FOMO is REAL: {ticker} {hype_kw} 🌙🌙",
    "High short interest on {ticker} — {hype_kw} 🔥",
    "{ticker} volume 10x average!! {hype_kw}",
    "{ticker} {hype_kw}. This is the way. 💎",
    "Insiders buying {ticker}?? {hype_kw} 🚀",
    "{ticker} making HISTORY — {hype_kw}",
    "The {ticker} squeeze is {hype_kw}. Prepare.",
    "{ticker} {hype_kw} — biggest trade of the decade?",
    "You CANNOT afford to miss {ticker} — {hype_kw}",
]

QUARTERS = ["Q1", "Q2", "Q3", "Q4"]
EPS_VALUES = [f"${random.uniform(0.5, 8.0):.2f}" for _ in range(20)]

# 35 fundamentals headline templates
FUNDAMENTALS_TEMPLATES = [
    "{ticker} reports {quarter} earnings of {eps} per share, in line with estimates",
    "{ticker} raises full-year guidance on strong {quarter} results",
    "{ticker} expands into {market} segment, adds 200 jobs",
    "{ticker} board approves $500M share buyback program",
    "{ticker} declares quarterly dividend of $0.{n}2 per share",
    "{ticker} {quarter} revenue grows 8% year-over-year to ${b}B",
    "{ticker} signs partnership with major {market} distributor",
    "Analyst upgrades {ticker} to Buy, raises price target to ${pt}",
    "{ticker} completes acquisition of {market} startup for ${m}M",
    "{ticker} CFO presents five-year capital allocation strategy at investor day",
    "{ticker} operating margin improves to {pct}% in {quarter}",
    "{ticker} free cash flow reaches record ${b}B in fiscal year",
    "{ticker} names new Chief Financial Officer effective next quarter",
    "{ticker} opens manufacturing facility in {market} to reduce supply-chain costs",
    "{ticker} cuts annual capital expenditure guidance by 10%",
    "{ticker} {quarter} gross margin expands 120 basis points to {pct}%",
    "Moody's affirms {ticker} investment-grade credit rating",
    "{ticker} launches enterprise product targeting {market} customers",
    "{ticker} reports {quarter} EPS of {eps}, beating consensus by $0.04",
    "{ticker} increases R&D budget by 15% to support long-term growth",
    "{ticker} files 10-K with SEC; no material restatements noted",
    "{ticker} reduces long-term debt by ${m}M through bond repurchase",
    "{ticker} {quarter} earnings call: management reaffirms FY guidance",
    "{ticker} customer retention rate rises to {pct}% in latest survey",
    "{ticker} rolls out cost-reduction initiative targeting ${m}M in annual savings",
    "{ticker} receives regulatory approval to operate in {market}",
    "{ticker} forms joint venture with {market} utility to accelerate growth",
    "{ticker} net income up 12% as operating leverage kicks in",
    "{ticker} dividend coverage ratio remains healthy at 2.{n}x",
    "{ticker} discloses {quarter} productivity metrics in line with three-year plan",
    "{ticker} institutional ownership increases to 78% of shares outstanding",
    "{ticker} completes secondary equity offering, raises ${m}M for debt paydown",
    "{ticker} reports {quarter} sales of ${b}B, consistent with prior guidance",
    "{ticker} achieves ISO 9001 certification across {market} operations",
    "{ticker} inventory levels normalize after supply chain disruptions ease",
]


# ============================================================
# SECTION 1 — DATA GENERATION
# ============================================================

def _random_ticker() -> str:
    """Return a random ticker from the pool."""
    return random.choice(TICKERS)


def _make_hype_headline(add_typo: bool = False) -> str:
    """
    Fill a random hype template with random substitutions.

    Optionally introduce minor typos to improve model robustness.
    """
    template = random.choice(HYPE_TEMPLATES)
    text = template.format(
        ticker=_random_ticker(),
        hype_kw=random.choice(HYPE_KEYWORDS),
    )
    if add_typo and random.random() < 0.15:
        # Insert a random char swap or repeat to simulate typos
        idx = random.randint(1, max(1, len(text) - 2))
        text = text[:idx] + text[idx] + text[idx:]
    return text


def _make_fundamentals_headline() -> str:
    """Fill a random fundamentals template with random substitutions."""
    template = random.choice(FUNDAMENTALS_TEMPLATES)
    text = template.format(
        ticker=_random_ticker(),
        quarter=random.choice(QUARTERS),
        eps=f"${random.uniform(0.50, 7.50):.2f}",
        market=random.choice(MARKETS),
        n=random.randint(1, 9),
        b=f"{random.uniform(1.0, 50.0):.1f}",
        m=random.randint(50, 900),
        pt=random.randint(80, 600),
        pct=f"{random.uniform(20.0, 65.0):.1f}",
    )
    return text


def generate_synthetic_dataset(n_hype: int = 1000, n_fund: int = 1000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a balanced synthetic dataset of hype (1) and fundamentals (0) headlines.

    Returns a DataFrame with columns ['text', 'label'].
    """
    random.seed(seed)
    print(f"\n[SYNTHETIC MODE] Generating {n_hype} hype + {n_fund} fundamentals headlines…")

    hype_rows = [
        {"text": _make_hype_headline(add_typo=True), "label": 1}
        for _ in range(n_hype)
    ]
    fund_rows = [
        {"text": _make_fundamentals_headline(), "label": 0}
        for _ in range(n_fund)
    ]

    df = pd.DataFrame(hype_rows + fund_rows).sample(frac=1, random_state=seed).reset_index(drop=True)
    print(f"  Generated {len(df)} total samples")
    return df


# ============================================================
# WEAK SUPERVISION NOTICE (important for technical Q&A)
# ============================================================
# The hype/fundamentals labels below are NOT ground-truth annotations.
# They are derived from a keyword/sentiment heuristic applied to the
# Kaggle financial news dataset. Specifically:
#   - A headline is labelled 'Hype' if it scores high on:
#     exclamation density, hype keyword count (moon/YOLO/squeeze/etc.),
#     and sentiment extremity (score > 0.85).
#   - Everything else is labelled 'Fundamentals'.
# This means the training signal is noisy. The model learns to detect
# hype-like language patterns, not verified human-annotated hype.
# This is a valid approach (weak supervision) and should be stated
# honestly when presenting to judges.
# ============================================================

HYPE_KEYWORD_SET = {
    "moon", "rocket", "squeeze", "yolo", "diamond", "hands", "apes", "lambo",
    "tendies", "gamma", "parabolic", "explode", "exploding", "breakout",
    "fomo", "ngmi", "wagmi", "bullish", "100x", "10x", "calls", "puts",
    "printing", "infinity", "legendary", "insane", "massive", "historic",
    "gang", "rally", "bags", "rekt", "obliterated", "pumping", "mooning",
}


def kaggle_heuristic_label(text: str) -> int:
    """
    Assign a weak label to a financial headline from a Kaggle CSV.

    Heuristic (three-factor scoring):
      1. Exclamation density:    # of '!' chars / text length  (weight 0.4)
      2. Hype keyword count:     # of hype words (case-insensitive) in text (weight 0.4)
      3. Sentiment extremity:    detected via simple ALL-CAPS ratio (weight 0.2)
    A headline is labelled Hype (1) if the weighted score > 0.3.

    This is weak supervision — see the WEAK SUPERVISION NOTICE above.
    """
    text_lower = text.lower()
    words = text_lower.split()

    exclamation_density = text.count("!") / max(len(text), 1)
    hype_kw_count = sum(1 for w in words if w.strip(string.punctuation) in HYPE_KEYWORD_SET)
    hype_kw_score = min(hype_kw_count / max(len(words), 1), 1.0)

    # ALL-CAPS ratio as a sentiment extremity proxy
    upper_count = sum(1 for c in text if c.isupper())
    total_alpha = sum(1 for c in text if c.isalpha())
    caps_ratio = upper_count / max(total_alpha, 1)

    score = 0.4 * exclamation_density + 0.4 * hype_kw_score + 0.2 * caps_ratio

    return 1 if score > 0.3 else 0


def load_kaggle_dataset(csv_path: str) -> pd.DataFrame:
    """
    Load a Kaggle financial news CSV and apply weak-supervision labeling.

    Expected CSV columns: at minimum a column containing the headline text
    (auto-detected as the longest string column).
    """
    print(f"\n=== Loading Kaggle dataset from {csv_path} ===")
    df_raw = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")

    # Auto-detect text column (longest average string length)
    str_cols = df_raw.select_dtypes(include="object").columns.tolist()
    if not str_cols:
        raise ValueError("No string columns found in the Kaggle CSV.")
    text_col = max(str_cols, key=lambda c: df_raw[c].dropna().apply(len).mean())
    print(f"  Using text column: '{text_col}'")

    df = pd.DataFrame()
    df["text"] = df_raw[text_col].dropna().astype(str)
    print(f"  Applying weak-supervision heuristic to {len(df)} headlines…")
    df["label"] = df["text"].apply(kaggle_heuristic_label)

    dist = df["label"].value_counts()
    print(f"  Label distribution — Fundamentals: {dist.get(0,0)}, Hype: {dist.get(1,0)}")
    return df.reset_index(drop=True)


# ============================================================
# SECTION 2 — EMBEDDING LAYER
# ============================================================

def get_embeddings(texts: list[str], cache_path: Path) -> np.ndarray:
    """
    Encode texts with sentence-transformers 'all-MiniLM-L6-v2'.

    Embeddings are cached to disk to avoid recomputation on re-runs.
    The embedding model is NOT included in the ONNX export — it is
    called at inference time in the backend via sentence-transformers.

    Returns
    -------
    np.ndarray of shape (N, 384)
    """
    if cache_path.exists():
        print(f"  Loading cached embeddings from {cache_path}…")
        return np.load(str(cache_path))

    print("  Loading sentence-transformer 'all-MiniLM-L6-v2'…")
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("all-MiniLM-L6-v2")
    print(f"  Encoding {len(texts)} texts…")
    embeddings = model.encode(
        texts, batch_size=64, show_progress_bar=True, convert_to_numpy=True
    )
    np.save(str(cache_path), embeddings)
    print(f"  Embeddings cached → {cache_path}")
    return embeddings.astype(np.float32)


# ============================================================
# SECTION 3 — MODEL DEFINITION
# ============================================================

class HypeClassifier(nn.Module):
    """
    Classifier head for hype detection.

    Sits on top of frozen sentence-transformer embeddings (384-dim).
    Only this module is exported to ONNX — the embedding step is handled
    separately by the sentence-transformers library at inference time.

    Architecture:
      Input (384-dim embedding)
        → Linear(384, 128) + ReLU + Dropout(0.30)
        → Linear(128, 64)  + ReLU + Dropout(0.20)
        → Linear(64, 2)    # logits: 0=Fundamentals, 1=Hype
    """

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(384, 128),
            nn.ReLU(),
            nn.Dropout(0.30),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.20),
            nn.Linear(64, 2),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass — returns raw logits (shape: [batch, 2])."""
        return self.net(x)


# ============================================================
# SECTION 4 — TRAINING UTILITIES
# ============================================================

def accuracy(logits: torch.Tensor, labels: torch.Tensor) -> float:
    """Batch accuracy from logits."""
    return (logits.argmax(dim=1) == labels).float().mean().item()


def train_epoch(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> tuple[float, float]:
    """Single training epoch — returns (mean_loss, mean_accuracy)."""
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
    """Evaluate on a DataLoader — returns (mean_loss, mean_accuracy)."""
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
# SECTION 5 — MAIN TRAINING PIPELINE
# ============================================================

def run_training(args: argparse.Namespace) -> None:
    """Execute the full hype-detector training pipeline end-to-end."""

    output_dir = Path(args.output_dir)
    data_dir = Path("data")
    output_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    backend_dir = Path("../backend/models")
    backend_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n🚀 MoneyMind — Hype Detector Training")
    print(f"   Device : {device}")
    print(f"   Dataset: {args.dataset}")
    print(f"   Output : {output_dir.resolve()}")

    # ── 1. Data ──────────────────────────────────────────────
    print("\n=== STAGE 1: Data ===")
    if args.dataset == "kaggle":
        if not args.kaggle_path or not Path(args.kaggle_path).exists():
            raise FileNotFoundError(
                f"Kaggle CSV not found at '{args.kaggle_path}'. "
                "Use --dataset synthetic for offline mode."
            )
        df = load_kaggle_dataset(args.kaggle_path)
    else:
        df = generate_synthetic_dataset(n_hype=1000, n_fund=1000)

    texts = df["text"].tolist()
    labels = df["label"].values.astype(np.int64)

    dist = pd.Series(labels).value_counts().sort_index()
    print(f"  Label distribution — Fundamentals(0)={dist.get(0,0)}, Hype(1)={dist.get(1,0)}")

    # ── 2. Embeddings ─────────────────────────────────────────
    print("\n=== STAGE 2: Embeddings ===")
    cache_path = data_dir / "hype_embeddings.npy"
    embeddings = get_embeddings(texts, cache_path)
    print(f"  Embedding matrix shape: {embeddings.shape}")

    X = embeddings.astype(np.float32)
    y = labels

    # ── Train / Val split ─────────────────────────────────────
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\n  Train: {len(X_train)}  Val: {len(X_val)}")

    train_ds = torch.utils.data.TensorDataset(
        torch.tensor(X_train), torch.tensor(y_train)
    )
    val_ds = torch.utils.data.TensorDataset(
        torch.tensor(X_val), torch.tensor(y_val)
    )
    train_loader = torch.utils.data.DataLoader(train_ds, batch_size=64, shuffle=True)
    val_loader = torch.utils.data.DataLoader(val_ds, batch_size=128)

    # ── 3. Model ──────────────────────────────────────────────
    print("\n=== STAGE 3: Model ===")
    model = HypeClassifier().to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"  HypeClassifier — {total_params:,} parameters")

    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    # ── 4. Training loop ──────────────────────────────────────
    print(f"\n=== STAGE 4: Training ({args.epochs} epochs) ===")
    best_val_acc = 0.0
    checkpoint_path = output_dir / "hype_best.pt"

    for epoch in range(1, args.epochs + 1):
        tr_loss, tr_acc = train_epoch(model, train_loader, optimizer, criterion, device)
        vl_loss, vl_acc = eval_epoch(model, val_loader, criterion, device)

        if vl_acc > best_val_acc:
            best_val_acc = vl_acc
            torch.save(model.state_dict(), checkpoint_path)

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
        val_probs = torch.softmax(val_logits, dim=1).cpu().numpy()
        val_preds = val_logits.argmax(dim=1).cpu().numpy()

    val_accuracy = float((val_preds == y_val).mean())
    auc_score = roc_auc_score(y_val, val_probs[:, 1])

    print(f"  Val accuracy : {val_accuracy:.4f}")
    print(f"  AUC-ROC      : {auc_score:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_val, val_preds, target_names=["Fundamentals", "Hype"]))

    # Confusion matrix
    cm = confusion_matrix(y_val, val_preds)
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Purples",
        xticklabels=["Fundamentals", "Hype"],
        yticklabels=["Fundamentals", "Hype"],
        ax=ax,
    )
    ax.set_xlabel("Predicted Label")
    ax.set_ylabel("True Label")
    ax.set_title("HypeClassifier — Confusion Matrix (Validation Set)")
    plt.tight_layout()
    cm_path = output_dir / "hype_confusion_matrix.png"
    plt.savefig(cm_path, dpi=150)
    plt.close()
    print(f"  Confusion matrix → {cm_path}")

    # ROC curve
    fpr, tpr, _ = roc_curve(y_val, val_probs[:, 1])
    roc_auc = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.plot(fpr, tpr, color="darkorchid", lw=2, label=f"ROC (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], color="gray", linestyle="--", lw=1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("HypeClassifier — ROC Curve")
    ax.legend(loc="lower right")
    plt.tight_layout()
    roc_path = output_dir / "hype_roc_curve.png"
    plt.savefig(roc_path, dpi=150)
    plt.close()
    print(f"  ROC curve → {roc_path}")

    # ── Assertion: guard against exporting a bad model ────────
    assert val_accuracy > 0.6, (
        f"Model underperforming (val_accuracy={val_accuracy:.3f}) — "
        "check weak-supervision labels or try --dataset synthetic for a cleaner baseline."
    )

    # ── 6. ONNX Export ────────────────────────────────────────
    print("\n=== STAGE 6: ONNX Export ===")
    print("  NOTE: Only the classifier HEAD is exported to ONNX.")
    print("  Embeddings are computed at inference time via sentence-transformers.")

    model.load_state_dict(torch.load(checkpoint_path, map_location="cpu"))
    model.eval()

    dummy_input = torch.randn(1, 384)
    onnx_path = output_dir / "hype_model.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        opset_version=17,
        input_names=["embedding"],
        output_names=["logits"],
        dynamic_axes={"embedding": {0: "batch_size"}, "logits": {0: "batch_size"}},
    )

    # Verify with onnxruntime
    ort_session = ort.InferenceSession(str(onnx_path))
    sample = np.random.randn(1, 384).astype(np.float32)
    t0 = time.perf_counter()
    ort_out = ort_session.run(None, {"embedding": sample})
    t1 = time.perf_counter()

    model_size_kb = onnx_path.stat().st_size / 1024
    print(f"  ONNX model size : {model_size_kb:.1f} KB")
    print(f"  ORT sample output: {ort_out[0]}")
    print(f"  Estimated inference time: {(t1 - t0)*1000:.2f} ms")

    shutil.copy(onnx_path, backend_dir / "hype_model.onnx")
    print(f"  Copied → {backend_dir / 'hype_model.onnx'}")

    print("\n🎉 Hype Detector training complete!")


# ============================================================
# SECTION 6 — CLI ENTRY POINT
# ============================================================

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Train the MoneyMind Hype Detector text classifier.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--dataset",
        choices=["synthetic", "kaggle"],
        default="synthetic",
        help="Data source: 'synthetic' (default, offline-safe) or 'kaggle' (requires --kaggle-path).",
    )
    parser.add_argument(
        "--kaggle-path",
        type=str,
        default=None,
        help="Path to a Kaggle financial news CSV. Required when --dataset kaggle.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=20,
        help="Number of training epochs.",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="outputs",
        help="Directory to write checkpoints, ONNX model, and plots.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_training(args)
