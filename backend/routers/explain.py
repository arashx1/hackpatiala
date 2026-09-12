"""
routers/explain.py - Jargon-Buster explanation API.

Provides plain-English, ELI5 definitions and real-world analogies for financial
terms. Queries the local curated glossary with fuzzy keyword matching, falling
back to the Gemini API (or intelligent rule-based explainer) when an unknown term
is requested.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("moneymind.explain")
router = APIRouter()

# ---------------------------------------------------------------------------
# Load curated glossary
# ---------------------------------------------------------------------------
GLOSSARY_PATH = Path(__file__).parent.parent / "data" / "glossary.json"
GLOSSARY: list[dict[str, Any]] = []

if GLOSSARY_PATH.exists():
    try:
        with open(GLOSSARY_PATH, "r", encoding="utf-8-sig") as f:
            GLOSSARY = json.load(f)
        logger.info("Loaded %d glossary terms from %s", len(GLOSSARY), GLOSSARY_PATH)
    except Exception as e:
        logger.error("Failed to load glossary.json: %s", e)
else:
    logger.warning("glossary.json not found at %s", GLOSSARY_PATH)


class ExplainResponse(BaseModel):
    term: str
    slug: str
    eli5: str
    analogy: str
    keywords: list[str] = []
    source: str  # "glossary" | "gemini" | "heuristic"


def _normalize(text: str) -> str:
    """Strip punctuation and lowercase."""
    return re.sub(r"[^a-zA-Z0-9\s]", "", text).lower().strip()


def find_in_glossary(query: str) -> Optional[dict[str, Any]]:
    """Search for a term in the local glossary by exact term, slug, or keywords."""
    norm_q = _normalize(query)
    if not norm_q:
        return None

    # Exact term or slug match
    for item in GLOSSARY:
        if _normalize(item.get("term", "")) == norm_q or item.get("slug", "") == norm_q:
            return item

    # Substring / word boundary match in term
    for item in GLOSSARY:
        norm_term = _normalize(item.get("term", ""))
        if norm_q in norm_term or norm_term in norm_q:
            return item

    # Keyword match
    for item in GLOSSARY:
        for kw in item.get("keywords", []):
            if _normalize(kw) == norm_q or norm_q in _normalize(kw):
                return item

    return None


async def explain_with_gemini(term: str) -> Optional[dict[str, str]]:
    """Query Google Gemini API for an ELI5 definition with real-world analogy."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            f"You are a friendly financial tutor for beginner investors. Explain the term '{term}'.\n"
            "Rules:\n"
            "1. eli5: Exactly 1-2 simple sentences explaining the term in plain English without jargon.\n"
            "2. analogy: A vivid everyday real-world analogy (e.g. food, sports, games).\n"
            "Return valid JSON only in this schema:\n"
            '{"eli5": "...", "analogy": "..."}'
        )

        response = await model.generate_content_async(prompt)
        text = response.text.strip()

        # Extract JSON from potential code fences
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        parsed = json.loads(text)
        return {
            "eli5": parsed.get("eli5", f"{term} is a concept used in finance and investing."),
            "analogy": parsed.get("analogy", "Think of it like buying groceries or trading cards."),
        }
    except Exception as exc:
        logger.warning("Gemini explain fallback failed for '%s': %s", term, exc)
        return None


def generate_heuristic_explanation(term: str) -> dict[str, str]:
    """Graceful rule-based explanation when term is not in glossary and Gemini is absent."""
    clean = term.strip().title()
    return {
        "eli5": f"{clean} is an investment indicator used to understand how a financial asset behaves, risks its capital, or generates returns.",
        "analogy": f"Think of {clean} like checking the weather forecast before heading outdoors — it gives you context so you are not caught unprepared.",
    }


@router.get("", response_model=ExplainResponse)
async def explain_term(term: str = Query(..., description="Financial term to explain")):
    """Explain a financial term with ELI5 clarity and a real-world analogy."""
    # 1. Search curated glossary
    item = find_in_glossary(term)
    if item:
        return ExplainResponse(
            term=item.get("term", term),
            slug=item.get("slug", _normalize(term).replace(" ", "-")),
            eli5=item.get("eli5", ""),
            analogy=item.get("analogy", ""),
            keywords=item.get("keywords", []),
            source="glossary",
        )

    # 2. Try Gemini API
    gemini_res = await explain_with_gemini(term)
    if gemini_res:
        return ExplainResponse(
            term=term.strip().title(),
            slug=_normalize(term).replace(" ", "-"),
            eli5=gemini_res["eli5"],
            analogy=gemini_res["analogy"],
            keywords=[],
            source="gemini",
        )

    # 3. Deterministic heuristic fallback
    heuristic = generate_heuristic_explanation(term)
    return ExplainResponse(
        term=term.strip().title(),
        slug=_normalize(term).replace(" ", "-"),
        eli5=heuristic["eli5"],
        analogy=heuristic["analogy"],
        keywords=[],
        source="heuristic",
    )


@router.get("/all", response_model=list[dict[str, Any]])
async def get_all_glossary_terms():
    """Retrieve all available glossary terms."""
    return GLOSSARY


@router.get("/search")
async def search_glossary(q: str = Query(..., min_length=1)):
    """Search glossary terms by partial match."""
    norm_q = _normalize(q)
    results = []
    for item in GLOSSARY:
        term_norm = _normalize(item.get("term", ""))
        keywords_norm = [_normalize(k) for k in item.get("keywords", [])]
        if norm_q in term_norm or any(norm_q in k for k in keywords_norm):
            results.append(item)
    return results
