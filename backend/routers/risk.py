"""
routers/risk.py - Risk Radar neural network scoring API.

Performs ONNX inference using RiskNet (6 -> 64 -> 32 -> 3) on historical asset
features (annualized volatility, beta vs SPY, max drawdown, log market cap,
encoded sector, volume z-score). Seamlessly falls back to deterministic rule-based
financial scoring if the model or live data is unavailable.
"""

from __future__ import annotations

import json
import logging
import math
from pathlib import Path
from typing import Any, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from utils.cache import risk_feature_cache
from utils.fallback import rules_based_risk_score

logger = logging.getLogger("moneymind.risk")
router = APIRouter()

# Sector encoding mapping (matches risk_model_train.py)
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
    "Crypto": 11,
    "ETF": 12,
    "Unknown": 5,
}

# Load seed asset defaults for offline/fallback lookups
SEED_FILE = Path(__file__).parent.parent.parent / "frontend" / "src" / "data" / "seed_assets.json"
SEED_ASSETS: dict[str, dict[str, Any]] = {}
if SEED_FILE.exists():
    try:
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            for a in data:
                SEED_ASSETS[a["ticker"].upper()] = a
        logger.info("Loaded %d seed assets into risk router fallback", len(SEED_ASSETS))
    except Exception as e:
        logger.warning("Could not parse seed_assets.json: %s", e)


class RiskInput(BaseModel):
    ticker: Optional[str] = None
    annualized_vol: Optional[float] = Field(None, description="Annualized volatility (e.g. 0.25 for 25%)")
    beta_vs_spy: Optional[float] = Field(None, description="Beta relative to S&P 500")
    max_drawdown_1yr: Optional[float] = Field(None, description="Maximum 1yr drawdown (e.g. -0.15)")
    log_market_cap: Optional[float] = Field(None, description="Natural log of market cap")
    sector_encoded: Optional[float] = Field(None, description="Sector numeric code")
    avg_volume_zscore: Optional[float] = Field(0.0, description="Volume z-score")


class RiskResponse(BaseModel):
    ticker: Optional[str]
    score: float
    label: str  # "Low" | "Medium" | "High"
    confidence: float
    components: dict[str, Any]
    source: str  # "onnx" | "fallback"


def _fetch_live_or_seed_features(ticker: str) -> dict[str, float]:
    """Fetch feature vector from yfinance, or fallback to seed_assets / defaults."""
    ticker_upper = ticker.upper()

    if ticker_upper in risk_feature_cache:
        return risk_feature_cache[ticker_upper]

    # Check seed assets first for instant offline response
    if ticker_upper in SEED_ASSETS:
        seed = SEED_ASSETS[ticker_upper]
        vol = float(seed.get("volatility", 0.25))
        beta = float(seed.get("beta", 1.0))
        # Approximate drawdown from price history
        history = seed.get("priceHistory", [])
        drawdown = -0.15
        if history:
            peak = max(history)
            current = history[-1]
            drawdown = (current - peak) / peak if peak > 0 else -0.15

        sector = seed.get("sector", "Technology")
        sec_code = float(SECTOR_MAP.get(sector, 5))

        features = {
            "annualized_vol": vol,
            "beta_vs_spy": beta,
            "max_drawdown_1yr": drawdown,
            "log_market_cap": 25.0,  # default mid-large cap
            "sector_encoded": sec_code,
            "avg_volume_zscore": 0.0,
        }
        risk_feature_cache[ticker_upper] = features
        return features

    # Try yfinance
    try:
        import yfinance as yf

        t = yf.Ticker(ticker_upper)
        hist = t.history(period="1y")
        if not hist.empty and len(hist) > 20:
            pct = hist["Close"].pct_change().dropna()
            vol = float(pct.std() * math.sqrt(252))
            # Calculate drawdown
            cum_max = hist["Close"].cummax()
            dd = ((hist["Close"] - cum_max) / cum_max).min()
            beta = float(t.info.get("beta", 1.0) or 1.0)
            mcap = float(t.info.get("marketCap", 1e10) or 1e10)
            sec_name = t.info.get("sector", "Unknown")
            sec_code = float(SECTOR_MAP.get(sec_name, 5))

            features = {
                "annualized_vol": vol,
                "beta_vs_spy": beta,
                "max_drawdown_1yr": float(dd),
                "log_market_cap": math.log(max(mcap, 1e6)),
                "sector_encoded": sec_code,
                "avg_volume_zscore": 0.0,
            }
            risk_feature_cache[ticker_upper] = features
            return features
    except Exception as exc:
        logger.warning("yfinance fetch failed for %s: %s", ticker, exc)

    # Safe default features
    defaults = {
        "annualized_vol": 0.28,
        "beta_vs_spy": 1.1,
        "max_drawdown_1yr": -0.18,
        "log_market_cap": 24.5,
        "sector_encoded": 5.0,
        "avg_volume_zscore": 0.0,
    }
    risk_feature_cache[ticker_upper] = defaults
    return defaults


def _run_risk_inference(
    request: Request,
    feat_dict: dict[str, float],
    ticker: Optional[str] = None,
) -> RiskResponse:
    """Execute ONNX model or graceful heuristic fallback."""
    models = getattr(request.app.state, "models", {})
    ort_session = models.get("risk")
    scaler = getattr(request.app.state, "scaler_params", {})

    vol = feat_dict.get("annualized_vol", 0.25)
    beta = feat_dict.get("beta_vs_spy", 1.0)
    dd = feat_dict.get("max_drawdown_1yr", -0.15)
    log_mcap = feat_dict.get("log_market_cap", 25.0)
    sector = feat_dict.get("sector_encoded", 5.0)
    vol_z = feat_dict.get("avg_volume_zscore", 0.0)

    # If ONNX model is loaded, run inference
    if ort_session is not None:
        try:
            raw_vec = np.array([vol, beta, dd, log_mcap, sector, vol_z], dtype=np.float32)

            # Standardize if scaler available
            mean = scaler.get("mean")
            std = scaler.get("std")
            if mean and std and len(mean) == 6:
                mean_arr = np.array(mean, dtype=np.float32)
                std_arr = np.array(std, dtype=np.float32)
                std_arr[std_arr == 0] = 1.0
                scaled_vec = (raw_vec - mean_arr) / std_arr
            else:
                scaled_vec = raw_vec

            inp = np.expand_dims(scaled_vec, axis=0)  # shape (1, 6)
            out = ort_session.run(None, {"features": inp})[0][0]  # shape (3,)

            # Softmax
            exp_out = np.exp(out - np.max(out))
            probs = exp_out / np.sum(exp_out)

            labels = ["Low", "Medium", "High"]
            pred_idx = int(np.argmax(probs))
            pred_label = labels[pred_idx]
            confidence = round(float(probs[pred_idx]), 3)

            # Continuous score 0-100: weighted expectation
            # Low centered at 20, Med at 50, High at 85
            continuous_score = round(float(probs[0] * 18.0 + probs[1] * 50.0 + probs[2] * 88.0), 1)

            return RiskResponse(
                ticker=ticker,
                score=continuous_score,
                label=pred_label,
                confidence=confidence,
                components={
                    "volatility": round(vol, 4),
                    "beta": round(beta, 2),
                    "max_drawdown": round(dd, 4),
                    "probabilities": {
                        "low": round(float(probs[0]), 3),
                        "medium": round(float(probs[1]), 3),
                        "high": round(float(probs[2]), 3),
                    },
                },
                source="onnx",
            )
        except Exception as err:
            logger.warning("ONNX inference failed: %s — using rules-based fallback", err)

    # Fallback to rules-based calculation
    fb = rules_based_risk_score(volatility=vol, beta=beta, max_drawdown=dd)
    return RiskResponse(
        ticker=ticker,
        score=fb["score"],
        label=fb["label"],
        confidence=fb["confidence"],
        components={
            "volatility": round(vol, 4),
            "beta": round(beta, 2),
            "max_drawdown": round(dd, 4),
        },
        source="fallback",
    )


@router.get("", response_model=RiskResponse)
async def get_risk_score(
    request: Request,
    ticker: Optional[str] = Query(None, description="Asset ticker symbol, e.g. AAPL, BTC, TSLA"),
    volatility: Optional[float] = Query(None),
    beta: Optional[float] = Query(None),
    drawdown: Optional[float] = Query(None),
):
    """Compute Risk Radar score for a ticker or custom features."""
    if ticker:
        features = _fetch_live_or_seed_features(ticker)
        # Override with explicit queries if provided
        if volatility is not None:
            features["annualized_vol"] = volatility
        if beta is not None:
            features["beta_vs_spy"] = beta
        if drawdown is not None:
            features["max_drawdown_1yr"] = drawdown
        return _run_risk_inference(request, features, ticker=ticker.upper())

    features = {
        "annualized_vol": volatility if volatility is not None else 0.25,
        "beta_vs_spy": beta if beta is not None else 1.0,
        "max_drawdown_1yr": drawdown if drawdown is not None else -0.15,
        "log_market_cap": 25.0,
        "sector_encoded": 5.0,
        "avg_volume_zscore": 0.0,
    }
    return _run_risk_inference(request, features, ticker=None)


@router.post("", response_model=RiskResponse)
async def post_risk_score(request: Request, body: RiskInput):
    """Compute Risk Radar score via POST payload."""
    if body.ticker:
        features = _fetch_live_or_seed_features(body.ticker)
    else:
        features = {
            "annualized_vol": 0.25,
            "beta_vs_spy": 1.0,
            "max_drawdown_1yr": -0.15,
            "log_market_cap": 25.0,
            "sector_encoded": 5.0,
            "avg_volume_zscore": 0.0,
        }

    if body.annualized_vol is not None:
        features["annualized_vol"] = body.annualized_vol
    if body.beta_vs_spy is not None:
        features["beta_vs_spy"] = body.beta_vs_spy
    if body.max_drawdown_1yr is not None:
        features["max_drawdown_1yr"] = body.max_drawdown_1yr
    if body.log_market_cap is not None:
        features["log_market_cap"] = body.log_market_cap
    if body.sector_encoded is not None:
        features["sector_encoded"] = body.sector_encoded
    if body.avg_volume_zscore is not None:
        features["avg_volume_zscore"] = body.avg_volume_zscore

    return _run_risk_inference(request, features, ticker=body.ticker)
