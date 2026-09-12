"""
routers/price.py - Market price and sparkline history API.

Fetches current price and 30-day historical sparkline series using yfinance
with caching. Includes seamless fallback to local seed data for instant offline
and demo-ready performance.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from utils.cache import price_cache

logger = logging.getLogger("moneymind.price")
router = APIRouter()

SEED_FILE = Path(__file__).parent.parent.parent / "frontend" / "src" / "data" / "seed_assets.json"
SEED_ASSETS: dict[str, dict[str, Any]] = {}
ALL_SEEDS: list[dict[str, Any]] = []

if SEED_FILE.exists():
    try:
        with open(SEED_FILE, "r", encoding="utf-8") as f:
            ALL_SEEDS = json.load(f)
            for a in ALL_SEEDS:
                SEED_ASSETS[a["ticker"].upper()] = a
        logger.info("Loaded %d seed assets for price router", len(ALL_SEEDS))
    except Exception as e:
        logger.warning("Could not parse seed_assets.json: %s", e)


class PriceData(BaseModel):
    ticker: str
    name: str
    price: float
    change24h: float
    currency: str = "USD"
    priceHistory: list[float] = []
    source: str  # "live" | "seed"


def _fetch_ticker_price(ticker: str) -> PriceData:
    """Fetch live price or seed asset data with caching."""
    t_up = ticker.upper()

    if t_up in price_cache:
        return price_cache[t_up]

    # Try live yfinance
    try:
        import yfinance as yf

        t = yf.Ticker(t_up)
        hist = t.history(period="1mo", interval="1d")
        if not hist.empty and len(hist) >= 5:
            closes = [round(float(c), 2) for c in hist["Close"].tolist()]
            curr_price = round(float(closes[-1]), 2)
            prev_price = float(closes[-2]) if len(closes) >= 2 else curr_price
            change_pct = round(((curr_price - prev_price) / prev_price) * 100.0, 2) if prev_price > 0 else 0.0

            name = t.info.get("shortName") or t.info.get("longName") or t_up
            res = PriceData(
                ticker=t_up,
                name=name,
                price=curr_price,
                change24h=change_pct,
                currency="USD",
                priceHistory=closes,
                source="live",
            )
            price_cache[t_up] = res
            return res
    except Exception as exc:
        logger.info("Live price query failed for %s (%s) — using seed data", t_up, exc)

    # Seed fallback
    if t_up in SEED_ASSETS:
        seed = SEED_ASSETS[t_up]
        res = PriceData(
            ticker=t_up,
            name=seed.get("name", t_up),
            price=seed.get("price", 100.0),
            change24h=seed.get("change24h", 0.0),
            currency="USD",
            priceHistory=seed.get("priceHistory", [100.0] * 30),
            source="seed",
        )
        price_cache[t_up] = res
        return res

    # Generic fallback
    res = PriceData(
        ticker=t_up,
        name=t_up,
        price=100.0,
        change24h=0.0,
        currency="USD",
        priceHistory=[95.0, 96.2, 97.0, 98.4, 99.1, 100.0],
        source="seed",
    )
    price_cache[t_up] = res
    return res


@router.get("/all", response_model=list[PriceData])
async def get_all_prices():
    """Return all featured assets with prices and sparklines."""
    results = []
    for asset in ALL_SEEDS:
        ticker = asset.get("ticker", "")
        results.append(_fetch_ticker_price(ticker))
    return results


@router.get("/{ticker}", response_model=PriceData)
async def get_single_price(ticker: str):
    """Return current price and 30-day sparkline history for a single ticker."""
    return _fetch_ticker_price(ticker)
