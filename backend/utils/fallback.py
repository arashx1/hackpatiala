"""
utils/fallback.py - Rules-based fallback computation functions.

Used when ONNX models are unavailable. Provides deterministic, interpretable
heuristics for risk and hype scoring so the API never returns empty data.
"""

from __future__ import annotations

import re


def rules_based_risk_score(
    volatility: float,
    beta: float,
    max_drawdown: float,
) -> dict:
    """Compute a risk score 0-100 using a weighted heuristic.

    Parameters
    ----------
    volatility:
        Annualised return volatility, typically in range [0.0, 1.0+].
    beta:
        Market beta, typically in range [0.0, 3.0].
    max_drawdown:
        Maximum drawdown over the look-back period, typically in range [-1.0, 0.0].

    Returns
    -------
    dict with keys: score (float), label (str), confidence (float), source (str).
    """
    # --- Individual component scores (each 0-100) ---
    # Volatility: 0 vol -> score 0, 1.0 vol -> score 100, clamped
    volatility_score: float = min(100.0, max(0.0, (volatility / 1.0) * 100.0))

    # Beta: 0 beta -> score 0, 3.0 beta -> score 100, clamped
    beta_score: float = min(100.0, max(0.0, (beta / 3.0) * 100.0))

    # Drawdown: 0 drawdown -> score 0, -1.0 drawdown -> score 100, clamped
    drawdown_score: float = min(100.0, max(0.0, abs(max_drawdown) * 100.0))

    # Weighted composite
    score: float = (
        0.40 * volatility_score
        + 0.35 * beta_score
        + 0.25 * drawdown_score
    )
    score = round(score, 2)

    # Label thresholds
    if score < 35:
        label = "Low"
        # Confidence scales with distance from 35
        confidence = round(min(0.95, 0.60 + (35 - score) / 35 * 0.35), 3)
    elif score <= 65:
        label = "Medium"
        # Confidence is lower near boundaries, higher near centre (50)
        distance_from_centre = abs(score - 50) / 15
        confidence = round(0.55 + distance_from_centre * 0.20, 3)
    else:
        label = "High"
        confidence = round(min(0.95, 0.60 + (score - 65) / 35 * 0.35), 3)

    return {
        "score": score,
        "label": label,
        "confidence": confidence,
        "source": "fallback",
    }


def rules_based_hype_score(headlines: list[str]) -> dict:
    """Compute a hype score from keyword density heuristics.

    Scans all headlines for known hype signals — emoji, excited punctuation,
    and pump-related vocabulary — then computes a normalised 0-100 score.

    Parameters
    ----------
    headlines:
        List of raw headline strings.

    Returns
    -------
    dict with keys: hype_score (float), label (str),
    breakdown (list[dict]), source (str).
    """
    HYPE_KEYWORDS: list[str] = [
        "moon",
        "yolo",
        "squeeze",
        "rally",
        "buy now",
        "pump",
        "\U0001f680",  # 🚀
        "\U0001f48e",  # 💎
        "\U0001f64c",  # 🙌
        "to the moon",
        "short squeeze",
        "gamma squeeze",
        "apes",
        "hodl",
        "fomo",
        "parabolic",
        "explode",
        "skyrocket",
        "lambo",
    ]

    if not headlines:
        return {
            "hype_score": 0.0,
            "label": "Fundamentals-driven",
            "breakdown": [],
            "source": "fallback",
        }

    breakdown: list[dict] = []

    for headline in headlines:
        lower = headline.lower()
        total_chars = max(len(lower), 1)

        # Keyword density
        keyword_hits = sum(1 for kw in HYPE_KEYWORDS if kw in lower)
        keyword_density = keyword_hits / total_chars

        # Exclamation density
        exclamation_count = lower.count("!") + lower.count("?") * 0.5
        exclamation_density = exclamation_count / total_chars

        # Raw score for this headline
        raw = keyword_density * 1000 + exclamation_density * 500
        hl_score = round(min(100.0, raw), 2)
        breakdown.append({"headline": headline, "score": hl_score})

    per_scores = [item["score"] for item in breakdown]
    overall = round(sum(per_scores) / len(per_scores), 2) if per_scores else 0.0
    label = "Hype-driven" if overall > 50 else "Fundamentals-driven"

    return {
        "hype_score": overall,
        "label": label,
        "breakdown": breakdown,
        "source": "fallback",
    }
