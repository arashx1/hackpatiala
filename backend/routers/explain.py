"""
routers/explain.py - Jargon-Buster explanation API.

Provides plain-English, ELI5 definitions and real-world analogies for financial
terms. Queries the local curated glossary with fuzzy keyword matching, falling
back to Google Gemini (or an intelligent category-aware financial explainer)
when an unlisted or slang term is requested.
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Ensure latest .env variables are loaded with override
load_dotenv(Path(__file__).parent.parent / ".env", override=True)

logger = logging.getLogger("moneymind.explain")
router = APIRouter()

# ---------------------------------------------------------------------------
# Dynamic Glossary Loading
# ---------------------------------------------------------------------------
GLOSSARY_PATH = Path(__file__).parent.parent / "data" / "glossary.json"
_CACHED_GLOSSARY: list[dict[str, Any]] = []
_LAST_MTIME: float = 0.0


def get_glossary() -> list[dict[str, Any]]:
    """Load or reload glossary terms dynamically whenever glossary.json changes."""
    global _CACHED_GLOSSARY, _LAST_MTIME
    if GLOSSARY_PATH.exists():
        try:
            mtime = GLOSSARY_PATH.stat().st_mtime
            if mtime != _LAST_MTIME or not _CACHED_GLOSSARY:
                with open(GLOSSARY_PATH, "r", encoding="utf-8-sig") as f:
                    _CACHED_GLOSSARY = json.load(f)
                _LAST_MTIME = mtime
                logger.info("Loaded %d glossary terms from %s", len(_CACHED_GLOSSARY), GLOSSARY_PATH)
        except Exception as e:
            logger.error("Failed to load glossary.json: %s", e)
    return _CACHED_GLOSSARY


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
    """Search for a term in the local glossary by exact term, slug, or whole-word match."""
    norm_q = _normalize(query)
    if not norm_q:
        return None

    glossary = get_glossary()

    # 1. Exact term or slug match
    for item in glossary:
        if _normalize(item.get("term", "")) == norm_q or item.get("slug", "") == norm_q:
            return item

    # 2. Whole-word match in term (e.g. "sip" matching "SIP (Systematic Investment Plan)")
    pattern = rf"\b{re.escape(norm_q)}\b"
    for item in glossary:
        norm_term = _normalize(item.get("term", ""))
        if re.search(pattern, norm_term):
            return item

    # 3. Exact or whole-word match in keywords array
    for item in glossary:
        for kw in item.get("keywords", []):
            norm_kw = _normalize(kw)
            if norm_kw == norm_q or re.search(pattern, norm_kw):
                return item

    return None


async def explain_with_gemini(term: str) -> Optional[dict[str, str]]:
    """Query Google Gemini API for an ELI5 definition with real-world analogy."""
    load_dotenv(Path(__file__).parent.parent / ".env", override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # Skip placeholder, empty, or non-Google AI Studio keys
    if not api_key or api_key.lower() in {"apikey", "placeholder", "your_gemini_api_key_here"}:
        return None

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            f"You are a friendly, encouraging financial tutor for absolute beginner investors. "
            f"Explain the financial term or slang '{term}'.\n"
            "Rules:\n"
            "1. eli5: Exactly 1-2 simple sentences explaining what it means in plain English without jargon.\n"
            "2. analogy: A vivid, everyday real-world analogy (e.g. food, sports, games, shopping).\n"
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
        if "eli5" in parsed and "analogy" in parsed:
            return {
                "eli5": parsed["eli5"],
                "analogy": parsed["analogy"],
            }
    except Exception as exc:
        logger.warning("Gemini explain failed for '%s': %s", term, exc)

    return None


# Specialized acronym lookup table for instant high-quality beginner explanations
FINANCIAL_ACRONYMS: dict[str, tuple[str, str]] = {
    "sip": (
        "A Systematic Investment Plan (SIP) is a disciplined way to invest a fixed amount of money periodically (e.g. monthly) into stocks or mutual funds instead of a single lump sum.",
        "Like a monthly gym routine for your savings — instead of trying to bench-press 300 lbs on day one, you build financial muscle consistently month after month.",
    ),
    "dca": (
        "Dollar-Cost Averaging (DCA) is an investing strategy where you invest equal sums of money at regular intervals regardless of short-term price fluctuations.",
        "Like buying groceries every Sunday — some weeks milk is on sale and some weeks it's pricier, but over time your average cost per gallon evens out pleasantly.",
    ),
    "roi": (
        "Return on Investment (ROI) measures how much money you gained or lost relative to what you originally invested, expressed as a percentage.",
        "If you buy a bicycle for $50 and sell it for $75, your $25 gain represents a 50% ROI on your original cash.",
    ),
    "nav": (
        "Net Asset Value (NAV) represents the per-share value of a mutual fund or ETF, calculated daily by dividing total net assets by outstanding shares.",
        "Counting all the money in a piggy bank and dividing by the number of coins to find what each individual coin slice is worth.",
    ),
    "ipo": (
        "An Initial Public Offering (IPO) is the very first time a privately held company offers its shares to regular everyday investors on a public stock exchange.",
        "A popular local underground bakery deciding to open its doors to nationwide supermarket shelves for everyone to buy.",
    ),
    "pe": (
        "The Price-to-Earnings (P/E) ratio compares a company's current stock price to its earnings per share, indicating how much investors pay for each $1 of annual profit.",
        "Paying $20 for a neighborhood lemonade stand that generates $2 a year in profit means a P/E of 10 — it takes 10 years of earnings to cover your purchase price.",
    ),
    "eps": (
        "Earnings Per Share (EPS) shows how much profit a company generates for each individual share of stock owned by investors.",
        "If a pizza earns $20 in profit and is sliced into 10 pieces, each slice produced $2 of earnings.",
    ),
    "cagr": (
        "Compound Annual Growth Rate (CAGR) shows the smoothed average yearly rate at which an investment grew from beginning to end.",
        "Like calculating your average driving speed on a road trip, even though you hit red lights and highway speed zones along the way.",
    ),
    "rsi": (
        "The Relative Strength Index (RSI) is a momentum gauge that evaluates whether a stock is overbought (too hot, above 70) or oversold (too cheap, below 30).",
        "A runner's heart rate monitor — if it spikes too high, they're exhausted and need a breather; if it drops too low, they have plenty of room to sprint.",
    ),
    "macd": (
        "MACD (Moving Average Convergence Divergence) tracks two different price moving averages to spot shifts in momentum and trend direction.",
        "Watching two runners on a track — when the faster sprinter pulls ahead of the pacer, it signals an impending burst of acceleration.",
    ),
    "reit": (
        "A Real Estate Investment Trust (REIT) is a company that owns, finances, or operates income-producing real estate and pays out most of its rental income to shareholders as dividends.",
        "Teaming up with hundreds of people to buy an entire shopping mall and splitting the monthly tenant rent checks.",
    ),
    "etf": (
        "An Exchange-Traded Fund (ETF) is an investment fund that trades on stock exchanges just like a regular stock, but holds a diversified basket of dozens or hundreds of assets.",
        "A pre-packaged fruit basket with apples, oranges, and bananas so you don't have to buy each individual fruit separately.",
    ),
    "fd": (
        "A Fixed Deposit (FD) is a savings instrument where you deposit cash with a bank for a fixed period in exchange for a guaranteed interest rate.",
        "Locking your money in a safe for a year — you promise not to touch it, and in return the bank guarantees you a predetermined bonus when unlocked.",
    ),
    "fomo": (
        "Fear Of Missing Out (FOMO) is the psychological urge to buy a skyrocketing asset because you see others making quick profits and dread being left behind.",
        "Seeing a huge crowd run screaming into a store and joining the stampede without knowing what is even on sale.",
    ),
    "hodl": (
        "HODL is crypto slang for refusing to sell your assets during sharp market crashes, committing to hold them long-term through thick and thin.",
        "Staying securely strapped into your rollercoaster seat during a vertical drop rather than trying to jump off mid-loop.",
    ),
}


def generate_heuristic_explanation(term: str) -> dict[str, str]:
    """Graceful, category-aware explanation when a term is not in the curated glossary and Gemini is absent."""
    clean = term.strip().title()
    lower = term.lower().strip()
    norm_clean = re.sub(r"[^a-zA-Z0-9]", "", lower)

    # 1. Exact acronym match
    if norm_clean in FINANCIAL_ACRONYMS:
        eli5, analogy = FINANCIAL_ACRONYMS[norm_clean]
        return {"eli5": eli5, "analogy": analogy}

    # 2. Ratios, Margins & Valuation Multiples
    if any(w in lower for w in ["ratio", "yield", "margin", "multiple", "rate", "percent", "score", "beta", "metric"]):
        return {
            "eli5": f"{clean} is a comparative financial metric that helps investors evaluate an asset's efficiency, valuation, or relative performance against peers.",
            "analogy": f"Think of {clean} like the fuel-efficiency rating (mpg) on a car sticker — it lets you compare different options fairly before deciding what to purchase.",
        }

    # 3. Cryptocurrencies & Web3 Terms
    if any(w in lower for w in ["crypto", "token", "coin", "blockchain", "wallet", "nft", "staking", "airdrop", "web3", "defi", "gas", "mint"]):
        return {
            "eli5": f"{clean} is a digital asset or protocol mechanism within the cryptocurrency ecosystem that enables decentralized exchange, network security, or ownership.",
            "analogy": f"Think of {clean} like arcade tokens or amusement park tickets — they carry genuine utility and tradeable value inside their dedicated digital ecosystem.",
        }

    # 4. Trading Tactics & Execution Orders
    if any(w in lower for w in ["trade", "trading", "order", "short", "long", "scalp", "arbitrage", "hedge", "leverage", "swap"]):
        return {
            "eli5": f"{clean} is a market execution strategy used by investors and traders to profit from price movements or protect their capital from unexpected downturns.",
            "analogy": f"Think of {clean} like a specialized offensive or defensive play in sports — effective when planned carefully, but risky without disciplined practice.",
        }

    # 5. Market Cycles & Sentiment Swings
    if any(w in lower for w in ["crash", "bubble", "dip", "correction", "squeeze", "rally", "recession", "inflation", "panic", "greed"]):
        return {
            "eli5": f"{clean} describes a broader market phase or psychological momentum wave driven by economic shifts and collective investor sentiment.",
            "analogy": f"Think of {clean} like changing ocean tides or seasonal weather — recognizing the cycle helps you stay composed rather than making emotional mistakes.",
        }

    # 6. Funds, Portfolios & Capital Allocation
    if any(w in lower for w in ["fund", "portfolio", "allocation", "equity", "debt", "bond", "asset", "security"]):
        return {
            "eli5": f"{clean} is an investing vehicle or portfolio structure that helps investors organize, diversify, and grow their capital over time.",
            "analogy": f"Think of {clean} like a multi-pocket backpack — each compartment carries a distinct set of tools suited for different legs of your financial journey.",
        }

    # 7. Default intelligent fallback
    return {
        "eli5": f"{clean} is an important concept in investing that guides how market participants evaluate risk, understand market behavior, or structure their finances.",
        "analogy": f"Think of {clean} like a compass reading on a long hike — it gives you clear bearings and perspective so you make deliberate, confident moves.",
    }


@router.get("", response_model=ExplainResponse)
async def explain_term(term: str = Query(..., description="Financial term to explain")):
    """Explain a financial term with ELI5 clarity and a real-world analogy."""
    clean_term = term.strip()

    # 1. Search curated glossary
    item = find_in_glossary(clean_term)
    if item:
        return ExplainResponse(
            term=item.get("term", clean_term.title()),
            slug=item.get("slug", _normalize(clean_term).replace(" ", "-")),
            eli5=item.get("eli5", ""),
            analogy=item.get("analogy", ""),
            keywords=item.get("keywords", []),
            source="glossary",
        )

    # 2. Try Gemini API if available and configured
    gemini_res = await explain_with_gemini(clean_term)
    if gemini_res:
        return ExplainResponse(
            term=clean_term.title(),
            slug=_normalize(clean_term).replace(" ", "-"),
            eli5=gemini_res["eli5"],
            analogy=gemini_res["analogy"],
            keywords=[],
            source="gemini",
        )

    # 3. Dynamic category-aware heuristic fallback
    heuristic = generate_heuristic_explanation(clean_term)
    return ExplainResponse(
        term=clean_term.title(),
        slug=_normalize(clean_term).replace(" ", "-"),
        eli5=heuristic["eli5"],
        analogy=heuristic["analogy"],
        keywords=[],
        source="heuristic",
    )


@router.get("/all", response_model=list[dict[str, Any]])
async def get_all_glossary_terms():
    """Retrieve all available glossary terms."""
    return get_glossary()


@router.get("/search")
async def search_glossary(q: str = Query(..., min_length=1)):
    """Search glossary terms by partial match."""
    norm_q = _normalize(q)
    glossary = get_glossary()
    results = []
    for item in glossary:
        term_norm = _normalize(item.get("term", ""))
        keywords_norm = [_normalize(k) for k in item.get("keywords", [])]
        if norm_q in term_norm or any(norm_q in k for k in keywords_norm):
            results.append(item)
    return results
