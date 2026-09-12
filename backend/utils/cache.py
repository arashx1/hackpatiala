"""
utils/cache.py - Shared TTL caches for MoneyMind backend.

Provides module-level TTLCache instances used across routers to avoid
redundant network calls to yfinance and price APIs.
"""

from cachetools import TTLCache

# Cache for yfinance-derived risk features: 5-minute TTL.
# Key: ticker symbol (str) -> dict of raw feature values.
risk_feature_cache: TTLCache = TTLCache(maxsize=100, ttl=300)

# Cache for price data: 1-minute TTL.
# Key: ticker symbol (str) -> dict with price, change24h, history.
price_cache: TTLCache = TTLCache(maxsize=100, ttl=60)
