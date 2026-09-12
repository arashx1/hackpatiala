"""
routers/price.py - Market price and sparkline history API.

Fetches live price data for stocks/ETFs:
1. If STOCK_API_KEY is configured in backend/.env, uses Finnhub free quote API.
2. If STOCK_API_KEY is not set or Finnhub rate-limits/fails, falls back to yfinance (7-day history).
3. If network fails, falls back to seed asset data with is_fallback=True.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

import httpx
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
    priceHistory7d: list[float] = []
    source: str  # "finnhub" | "yfinance" | "seed" | "fallback"
    is_fallback: bool = False


async def _fetch_from_finnhub(ticker: str, api_key: str) -> Optional[dict[str, Any]]:
    """Fetch current quote from Finnhub free API."""
    url = f"https://finnhub.io/api/v1/quote?symbol={ticker.upper()}&token={api_key}"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                curr_price = float(data.get("c", 0.0))
                # Finnhub returns 0 if symbol not found or empty
                if curr_price > 0:
                    change_pct = float(data.get("dp", 0.0))
                    return {
                        "price": round(curr_price, 2),
                        "change24h": round(change_pct, 2),
                    }
    except Exception as exc:
        logger.info("Finnhub quote fetch error for %s: %s", ticker, exc)
    return None


async def _fetch_ticker_price_async(ticker: str) -> PriceData:
    """Fetch live price or seed asset data with caching."""
    t_up = ticker.upper()

    if t_up in price_cache:
        return price_cache[t_up]

    stock_api_key = os.getenv("STOCK_API_KEY", "").strip()

    # 1. Try Finnhub if API key is present
    if stock_api_key:
        finnhub_res = await _fetch_from_finnhub(t_up, stock_api_key)
        if finnhub_res:
            seed = SEED_ASSETS.get(t_up, {})
            name = seed.get("name", t_up)
            # Use seed or 7d history if available
            history = seed.get("priceHistory", [])
            history7d = history[-7:] if len(history) >= 7 else history
            res = PriceData(
                ticker=t_up,
                name=name,
                price=finnhub_res["price"],
                change24h=finnhub_res["change24h"],
                currency="USD",
                priceHistory=history,
                priceHistory7d=history7d,
                source="finnhub",
                is_fallback=False,
            )
            price_cache[t_up] = res
            return res

    # 2. Try yfinance
    try:
        import yfinance as yf

        t = yf.Ticker(t_up)
        # Fetch 7 days of daily history
        hist = t.history(period="7d", interval="1d")
        if not hist.empty and len(hist) >= 2:
            closes = [round(float(c), 2) for c in hist["Close"].tolist()]
            curr_price = round(float(closes[-1]), 2)
            prev_price = float(closes[-2]) if len(closes) >= 2 else curr_price
            change_pct = round(((curr_price - prev_price) / prev_price) * 100.0, 2) if prev_price > 0 else 0.0

            name = t.info.get("shortName") or t.info.get("longName") or SEED_ASSETS.get(t_up, {}).get("name", t_up)
            res = PriceData(
                ticker=t_up,
                name=name,
                price=curr_price,
                change24h=change_pct,
                currency="USD",
                priceHistory=closes,
                priceHistory7d=closes,
                source="yfinance",
                is_fallback=False,
            )
            price_cache[t_up] = res
            return res
    except Exception as exc:
        logger.info("yfinance query failed for %s (%s) — falling back to seed", t_up, exc)

    # 3. Seed fallback (safe failsafe)
    if t_up in SEED_ASSETS:
        seed = SEED_ASSETS[t_up]
        history = seed.get("priceHistory", [100.0] * 30)
        history7d = history[-7:] if len(history) >= 7 else history
        res = PriceData(
            ticker=t_up,
            name=seed.get("name", t_up),
            price=seed.get("price", 100.0),
            change24h=seed.get("change24h", 0.0),
            currency="USD",
            priceHistory=history,
            priceHistory7d=history7d,
            source="seed",
            is_fallback=True,
        )
        price_cache[t_up] = res
        return res

    # 4. Generic fallback
    res = PriceData(
        ticker=t_up,
        name=t_up,
        price=100.0,
        change24h=0.0,
        currency="USD",
        priceHistory=[95.0, 96.2, 97.0, 98.4, 99.1, 100.0],
        priceHistory7d=[95.0, 96.2, 97.0, 98.4, 99.1, 100.0],
        source="fallback",
        is_fallback=True,
    )
    price_cache[t_up] = res
    return res


@router.get("/all", response_model=list[PriceData])
async def get_all_prices():
    """Return all featured assets with prices and sparklines."""
    results = []
    for asset in ALL_SEEDS:
        ticker = asset.get("ticker", "")
        p = await _fetch_ticker_price_async(ticker)
        results.append(p)
    return results


@router.get("/{ticker}", response_model=PriceData)
async def get_single_price(ticker: str):
    """Return current price and 7-day sparkline history for a single ticker."""
    return await _fetch_ticker_price_async(ticker)
