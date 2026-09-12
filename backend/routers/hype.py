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


# Cached sentence transformer embedding encoder
_embedder = None
_embedder_failed = False


def _get_embedder():
    """Lazy load sentence-transformers model if installed."""
    global _embedder, _embedder_failed
    if _embedder is not None or _embedder_failed:
        return _embedder

    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading sentence-transformers 'all-MiniLM-L6-v2'...")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("SentenceTransformer loaded successfully.")
        return _embedder
    except Exception as e:
        logger.info("SentenceTransformer not loaded (will use fallback scoring): %s", e)
        _embedder_failed = True
        return None


def _analyze_headlines(
    request: Request,
    headlines: list[str],
    ticker: Optional[str] = None,
) -> HypeResponse:
    """Classify headlines using ONNX model or rule-based fallback."""
    if not headlines:
        headlines = DEFAULT_HEADLINES

    models = getattr(request.app.state, "models", {})
    ort_session = models.get("hype")
    embedder = _get_embedder()

    # If both ONNX model and embedder are ready, run deep learning inference
    if ort_session is not None and embedder is not None:
        try:
            # Generate 384-dimensional dense embeddings
            embeddings = embedder.encode(headlines, convert_to_numpy=True).astype(np.float32)  # (N, 384)

            # Run ONNX inference
            logits = ort_session.run(None, {"embedding": embeddings})[0]  # (N, 2)

            # Softmax
            exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)  # class 0: Fund, class 1: Hype

            breakdown: list[HeadlineBreakdown] = []
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
            logger.warning("ONNX hype inference error: %s — falling back to heuristics", err)

    # Fallback to rules_based_hype_score
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
