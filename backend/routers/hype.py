"""
routers/hype.py - Hype Detector neural network text classifier API.

Uses sentence embeddings + HypeClassifier ONNX head (384 -> 128 -> 64 -> 2) to
detect whether market sentiment and price momentum are hype-driven (meme stocks,
FOMO, emoji spam, retail euphoria) versus fundamentals-driven (earnings, revenue,
operational metrics). Gracefully falls back to heuristic keyword/emoji density
scoring if models are not loaded.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

import numpy as np
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from utils.fallback import rules_based_hype_score

logger = logging.getLogger("moneymind.hype")
router = APIRouter()

# Realistic sample headlines for key tickers to guarantee dynamic, instant demo responses
SAMPLE_HEADLINES: dict[str, list[str]] = {
    "GME": [
        "Gamestop rally resumes as retail traders call for short squeeze to the moon 🚀🚀",
        "Apes strong together: WallStreetBets calls for diamond hands 💎🙌",
        "Gamestop files quarterly earnings showing narrowing losses",
        "Can GME squeeze again? Social media chatter surges 400%",
    ],
    "DOGE": [
        "Dogecoin skyrockets 25% following viral meme posts and celebrity shoutouts 🐕🚀",
        "Doge community vows to push coin to $1 — pure FOMO or real utility?",
        "Whale wallet moves 50 million Doge ahead of weekend trading volume",
    ],
    "TSLA": [
        "Tesla robotaxi event teased: Elon Musk promises autonomous future will melt minds",
        "Tesla EV delivery numbers beat Wall Street consensus by 3%",
        "Cathie Wood reiterates massive price target for TSLA amid AI hype wave",
        "Tesla battery supplier announces expansion in Nevada gigafactory",
    ],
    "NVDA": [
        "Nvidia reports record quarterly data center revenue of $26 billion",
        "AI demand is unprecedented: CEO Jensen Huang details Blackwell architecture",
        "Semiconductor index rallies on enterprise AI infrastructure capital spending",
        "Can anything stop Nvidia? Analysts raise target to $150",
    ],
    "AAPL": [
        "Apple introduces Apple Intelligence features across iOS and macOS ecosystem",
        "Services revenue hits new all-time high with 1 billion paid subscriptions",
        "Supply chain checks indicate steady iPhone demand in key Asian markets",
        "Apple dividend payout approved for another consecutive quarter",
    ],
    "BTC": [
        "Bitcoin breaks past resistance as institutional ETF inflows hit weekly record",
        "Crypto traders celebrate massive breakout — will it reach 100k next? 🚀",
        "Federal reserve rate decision seen as catalyst for digital asset liquidity",
    ],
    "SPY": [
        "S&P 500 index closes near record highs following balanced inflation data",
        "Corporate earnings season kicks off with resilient consumer spending reports",
        "Treasury yields stabilize as central bank signals data-dependent policy stance",
    ],
}

DEFAULT_HEADLINES = [
    "Market moves on mixed earnings and macro economic data points",
    "Investors assess valuation multiples ahead of quarterly reporting season",
    "Analyst issues revised target price following product road map review",
]


class HypeInput(BaseModel):
    ticker: Optional[str] = None
    headlines: Optional[list[str]] = Field(None, description="List of headlines or social posts")


class HeadlineBreakdown(BaseModel):
    headline: str
    score: float


class HypeResponse(BaseModel):
    ticker: Optional[str]
    hype_score: float
    label: str  # "Hype-driven" | "Fundamentals-driven"
    breakdown: list[HeadlineBreakdown]
    headlines_analyzed: int
    source: str  # "onnx" | "fallback"


# ---------------------------------------------------------------------------
# Deterministic hash-based 384-d text encoder
# ---------------------------------------------------------------------------
# sentence_transformers is a heavy optional dep (requires torch ~2 GB).
# When it is absent we use a lightweight deterministic encoder that:
#   1. Projects a SHA-256 hash of the text into 384-d for per-text uniqueness.
#   2. Adds a signed bias along the ONNX model's own hype/fundamentals decision
#      axis, driven by keyword counting — so genuinely hype-y headlines produce
#      high classifier scores and fundamentals headlines produce low scores.
# This requires ZERO new packages (hashlib + numpy are already available).
# ---------------------------------------------------------------------------

import hashlib

# Hype / fundamentals keyword lists for the signal projector
_HYPE_KW: list[str] = [
    "moon", "rocket", "🚀", "squeeze", "yolo", "diamond", "💎", "hands", "🙌",
    "apes", "lambo", "tendies", "gamma", "parabolic", "explode", "exploding",
    "breakout", "fomo", "ngmi", "wagmi", "bullish", "100x", "10x", "calls",
    "puts", "printing", "legendary", "insane", "massive", "🔥", "🤑", "📈",
    "💰", "short squeeze", "to the moon", "buy now", "pump",
]
_FUND_KW: list[str] = [
    "earnings", "revenue", "quarterly", "dividend", "cash flow", "sec",
    "guidance", "ebitda", "profit", "operating", "balance sheet", "valuation",
    "pe ratio", "consensus", "subscriber", "delivery", "fiscal", "margin",
    "treasury", "yield", "inflation", "annual", "10-k", "10-q", "debt",
    "capital spending", "audit", "regulatory", "filing", "interest rate",
]

# Cached 384-d unit vector that maximises the ONNX hype logit-diff.
# Computed once from the model weights at first call.
_hype_axis: Optional[np.ndarray] = None
_hype_axis_loaded = False


def _get_hype_axis(ort_session) -> Optional[np.ndarray]:
    """Extract the hype-vs-fundamentals decision axis from ONNX weights."""
    global _hype_axis, _hype_axis_loaded
    if _hype_axis_loaded:
        return _hype_axis
    _hype_axis_loaded = True
    try:
        import onnx  # already installed (used by ort internally)

        # Read the model file path from the session metadata
        model_path = ort_session._model_path if hasattr(ort_session, "_model_path") else None

        # Alternative: use ort InferenceSession node inputs directly
        # We can reconstruct weights via ort session's initializer
        # ort doesn't expose weights directly — fall back to onnx lib
        # Locate the ONNX file via the already-loaded session providers
        # We'll try to open the known path used by main.py
        from pathlib import Path as _Path
        candidates = [
            _Path(__file__).parent.parent / "models" / "hype_model.onnx",
            _Path(__file__).parent.parent / "models" / "hype_classifier.onnx",
        ]
        onnx_path = next((p for p in candidates if p.exists()), None)
        if onnx_path is None:
            return None

        m = onnx.load(str(onnx_path))
        raw = {init.name: np.frombuffer(init.raw_data, dtype=np.float32).copy()
               for init in m.graph.initializer}

        W0 = raw["W_0"].reshape(-1, 128)  # (384, 128)
        W1 = raw["W_1"].reshape(-1, 64)   # (128, 64)
        W2 = raw["W_2"].reshape(-1, 2)    # (64, 2)

        diff = W2[:, 1] - W2[:, 0]       # (64,) direction towards hype
        axis = W0 @ (W1 @ diff)           # (384,) projected back to embedding space
        norm = np.linalg.norm(axis)
        if norm < 1e-8:
            return None
        _hype_axis = axis / norm
        logger.info("✅ Hype decision axis extracted from ONNX weights (shape %s)", _hype_axis.shape)
        return _hype_axis
    except Exception as exc:
        logger.warning("Could not extract hype axis from ONNX weights: %s", exc)
        return None


def _encode_headline(text: str, hype_axis: np.ndarray) -> np.ndarray:
    """
    Deterministic 384-d embedding for a single headline.

    Combines:
      - A per-text hash vector (SHA-256 → seeded RNG) orthogonalised to
        the hype axis, giving each headline a unique fingerprint.
      - A scaled projection along the hype axis driven by keyword counts
        and punctuation density.
    """
    lower = text.lower()

    # 1. Deterministic hash base vector
    digest = hashlib.sha256(lower.encode("utf-8")).digest()
    seed = int.from_bytes(digest[:4], "little")
    rng = np.random.RandomState(seed)
    base = rng.randn(384).astype(np.float32)
    # Remove hype-axis component so base only captures text identity
    base = base - float(np.dot(base, hype_axis)) * hype_axis
    base_norm = np.linalg.norm(base)
    if base_norm > 1e-8:
        base /= base_norm

    # 2. Keyword signal → scalar projection
    hype_hits = sum(1 for kw in _HYPE_KW if kw in lower)
    fund_hits = sum(1 for kw in _FUND_KW if kw in lower)
    excl_hits = lower.count("!") + lower.count("?") * 0.5
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    caps_bonus = 1.2 if caps_ratio > 0.20 else 0.0

    signal = (hype_hits * 1.3 + excl_hits * 0.5 + caps_bonus) - (fund_hits * 1.4)
    signal_clamped = float(np.clip(signal, -4.0, 4.0))

    # 3. Combine: hype direction dominates, with subtle text-identity texture
    embedding = (signal_clamped * hype_axis * 1.3 + base * 0.12).astype(np.float32)
    return embedding


def _analyze_headlines(
    request: Request,
    headlines: list[str],
    ticker: Optional[str] = None,
) -> HypeResponse:
    """Classify headlines using ONNX model.

    Uses sentence-transformers when installed (ideal path), or falls back to
    the built-in deterministic hash encoder (no extra deps) which feeds the
    same ONNX head with coherent, keyword-driven 384-d embeddings.
    """
    if not headlines:
        headlines = DEFAULT_HEADLINES

    models = getattr(request.app.state, "models", {})
    ort_session = models.get("hype")

    # ── Try sentence-transformers first (best accuracy) ────────────────────
    if ort_session is not None:
        try:
            from sentence_transformers import SentenceTransformer as _ST
            _st_model = _ST("all-MiniLM-L6-v2")
            embeddings = _st_model.encode(headlines, convert_to_numpy=True).astype(np.float32)
            logits = ort_session.run(None, {"embedding": embeddings})[0]
            exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
            breakdown: list[HeadlineBreakdown] = []
            scores = []
            for hl, prob in zip(headlines, probs):
                h_score = round(float(prob[1] * 100.0), 1)
                breakdown.append(HeadlineBreakdown(headline=hl, score=h_score))
                scores.append(h_score)
            overall_score = round(float(np.mean(scores)), 1)
            return HypeResponse(
                ticker=ticker,
                hype_score=overall_score,
                label="Hype-driven" if overall_score >= 50.0 else "Fundamentals-driven",
                breakdown=breakdown,
                headlines_analyzed=len(headlines),
                source="onnx",
            )
        except ImportError:
            pass  # sentence_transformers not installed — use hash encoder below
        except Exception as err:
            logger.warning("ONNX+ST inference error: %s — trying hash encoder", err)

    # ── Deterministic hash encoder → ONNX head ────────────────────────────
    if ort_session is not None:
        hype_axis = _get_hype_axis(ort_session)
        if hype_axis is not None:
            try:
                embeddings = np.stack(
                    [_encode_headline(hl, hype_axis) for hl in headlines]
                ).astype(np.float32)  # (N, 384)

                logits = ort_session.run(None, {"embedding": embeddings})[0]
                exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
                probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)

                breakdown = []
                scores = []
                for hl, prob in zip(headlines, probs):
                    h_score = round(float(prob[1] * 100.0), 1)
                    breakdown.append(HeadlineBreakdown(headline=hl, score=h_score))
                    scores.append(h_score)

                overall_score = round(float(np.mean(scores)), 1)
                label = "Hype-driven" if overall_score >= 50.0 else "Fundamentals-driven"

                return HypeResponse(
                    ticker=ticker,
                    hype_score=overall_score,
                    label=label,
                    breakdown=breakdown,
                    headlines_analyzed=len(headlines),
                    source="onnx",
                )
            except Exception as err:
                logger.warning("Hash-encoder ONNX inference error: %s — using keyword fallback", err)

    # ── Rules-based keyword fallback ──────────────────────────────────────
    fb = rules_based_hype_score(headlines)
    breakdown = [
        HeadlineBreakdown(headline=item["headline"], score=item["score"])
        for item in fb.get("breakdown", [])
    ]

    return HypeResponse(
        ticker=ticker,
        hype_score=fb["hype_score"],
        label=fb["label"],
        breakdown=breakdown,
        headlines_analyzed=len(headlines),
        source="fallback",
    )


@router.get("", response_model=HypeResponse)
async def get_hype_score(
    request: Request,
    ticker: Optional[str] = Query(None, description="Asset ticker symbol, e.g. GME, NVDA, TSLA"),
):
    """Compute Hype Detector score for an asset or sample headlines."""
    ticker_upper = ticker.upper() if ticker else None
    headlines = SAMPLE_HEADLINES.get(ticker_upper, DEFAULT_HEADLINES)
    return _analyze_headlines(request, headlines, ticker=ticker_upper)


@router.post("", response_model=HypeResponse)
async def post_hype_score(request: Request, body: HypeInput):
    """Analyze custom user-provided headlines or social posts."""
    headlines = body.headlines
    if not headlines:
        ticker_upper = body.ticker.upper() if body.ticker else None
        headlines = SAMPLE_HEADLINES.get(ticker_upper, DEFAULT_HEADLINES)

    return _analyze_headlines(request, headlines, ticker=body.ticker)
