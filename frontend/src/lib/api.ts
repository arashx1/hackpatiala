import { Asset, CoachEvaluation, GlossaryTerm, HypeAssessment, RiskAssessment } from '../types';
import seedAssets from '../data/seed_assets.json';
import glossaryData from '../data/glossary.json';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── CoinGecko Mapping & Caching ─────────────────────────────
export const CRYPTO_COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  DOGE: 'dogecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
};

export function getCoinGeckoId(ticker: string): string {
  const upper = ticker.toUpperCase();
  return CRYPTO_COINGECKO_MAP[upper] || ticker.toLowerCase();
}

interface PriceCacheEntry {
  price: number;
  change24h: number;
  timestamp: number;
}
const cryptoPriceCache = new Map<string, PriceCacheEntry>();
const cryptoChartCache = new Map<string, { data: number[]; timestamp: number }>();

export async function fetchCryptoLivePrice(coingeckoId: string): Promise<{ price: number; change24h: number } | null> {
  const now = Date.now();
  const cached = cryptoPriceCache.get(coingeckoId);
  if (cached && now - cached.timestamp < 30000) {
    return { price: cached.price, change24h: cached.change24h };
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const info = data[coingeckoId];
    if (info && typeof info.usd === 'number') {
      const entry: PriceCacheEntry = {
        price: info.usd,
        change24h: typeof info.usd_24h_change === 'number' ? Math.round(info.usd_24h_change * 100) / 100 : 0,
        timestamp: now,
      };
      cryptoPriceCache.set(coingeckoId, entry);
      return { price: entry.price, change24h: entry.change24h };
    }
  } catch {
    // Return null on failure/rate limit
  }
  return null;
}

export async function fetchCryptoMarketChart7d(coingeckoId: string): Promise<number[] | null> {
  const now = Date.now();
  const cached = cryptoChartCache.get(coingeckoId);
  if (cached && now - cached.timestamp < 300000) {
    return cached.data;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coingeckoId)}/market_chart?vs_currency=usd&days=7`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (Array.isArray(json.prices) && json.prices.length > 0) {
      const rawPrices: number[] = json.prices.map((p: [number, number]) => p[1]);
      const step = Math.max(1, Math.floor(rawPrices.length / 28));
      const sampled: number[] = [];
      for (let i = 0; i < rawPrices.length; i += step) {
        sampled.push(Math.round(rawPrices[i] * 100) / 100);
      }
      if (sampled[sampled.length - 1] !== rawPrices[rawPrices.length - 1]) {
        sampled.push(Math.round(rawPrices[rawPrices.length - 1] * 100) / 100);
      }
      cryptoChartCache.set(coingeckoId, { data: sampled, timestamp: now });
      return sampled;
    }
  } catch {
    // Return null on failure/rate limit
  }
  return null;
}

export async function fetchStockLivePrice(ticker: string): Promise<{
  price: number;
  change24h: number;
  priceHistory7d?: number[];
  isFallback: boolean;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/price/${encodeURIComponent(ticker)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        price: data.price,
        change24h: data.change24h,
        priceHistory7d: data.priceHistory7d || data.priceHistory,
        isFallback: !!data.is_fallback,
      };
    }
  } catch {
    // Fallback handled by caller
  }
  return null;
}

export async function fetchAllAssets(): Promise<Asset[]> {
  try {
    const res = await fetch(`${API_BASE}/price/all`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const prices = await res.json();
      // Merge live price updates with seed asset metadata (riskScore, hypeScore, etc.)
      const priceMap = new Map<string, any>(prices.map((p: any) => [p.ticker.toUpperCase(), p]));
      return (seedAssets as Asset[]).map((asset) => {
        const live = priceMap.get(asset.ticker.toUpperCase());
        if (live) {
          return {
            ...asset,
            price: live.price,
            change24h: live.change24h,
            priceHistory: live.priceHistory?.length ? live.priceHistory : asset.priceHistory,
          };
        }
        return asset;
      });
    }
  } catch {
    // Graceful offline fallback to bundled seed data
  }
  return seedAssets as Asset[];
}

export async function fetchRiskScore(ticker: string): Promise<RiskAssessment> {
  try {
    const res = await fetch(`${API_BASE}/risk-score?ticker=${encodeURIComponent(ticker)}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }

  const asset = (seedAssets as Asset[]).find(
    (a) => a.ticker.toUpperCase() === ticker.toUpperCase()
  );
  return {
    ticker,
    score: asset?.riskScore ?? 45,
    label: asset?.riskLabel ?? 'Medium',
    confidence: 0.85,
    components: {
      volatility: asset?.volatility ?? 0.25,
      beta: asset?.beta ?? 1.0,
      max_drawdown: -0.15,
    },
    source: 'fallback',
  };
}

export async function fetchHypeScore(ticker: string): Promise<HypeAssessment> {
  try {
    const res = await fetch(`${API_BASE}/hype-score?ticker=${encodeURIComponent(ticker)}`, {
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }

  const asset = (seedAssets as Asset[]).find(
    (a) => a.ticker.toUpperCase() === ticker.toUpperCase()
  );
  return {
    ticker,
    hype_score: asset?.hypeScore ?? 35,
    label: asset?.hypeLabel ?? 'Fundamentals-driven',
    breakdown: [
      { headline: `${ticker} financial reporting remains consistent with targets`, score: 25 },
      { headline: `Market commentary focuses on long-term capital efficiency`, score: 30 },
    ],
    headlines_analyzed: 2,
    source: 'fallback',
  };
}

export async function explainTerm(term: string): Promise<GlossaryTerm> {
  try {
    const res = await fetch(`${API_BASE}/explain?term=${encodeURIComponent(term)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to local glossary search
  }

  const clean = term.toLowerCase().trim();
  const match = (glossaryData as GlossaryTerm[]).find(
    (g) =>
      g.term.toLowerCase() === clean ||
      g.slug.toLowerCase() === clean ||
      g.keywords?.some((k) => k.toLowerCase() === clean || clean.includes(k.toLowerCase()))
  );

  if (match) return match;

  return {
    term,
    slug: clean.replace(/\s+/g, '-'),
    eli5: `${term} is a financial metric that helps investors measure how an investment behaves and how its price fluctuates.`,
    analogy: `Think of ${term} like checking the weather before heading outside so you know what gear to bring.`,
    source: 'fallback',
  };
}

export async function fetchGlossary(): Promise<GlossaryTerm[]> {
  try {
    const res = await fetch(`${API_BASE}/explain/all`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }
  return glossaryData as GlossaryTerm[];
}

export async function evaluateDecisionWithCoach(params: {
  ticker: string;
  assetName: string;
  amount: number;
  userRiskTolerance: string;
  riskScore: number;
  riskLabel: string;
  hypeScore: number;
  hypeLabel: string;
}): Promise<CoachEvaluation> {
  try {
    const res = await fetch(`${API_BASE}/coach/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: params.ticker,
        asset_name: params.assetName,
        amount: params.amount,
        user_risk_tolerance: params.userRiskTolerance,
        risk_score: params.riskScore,
        risk_label: params.riskLabel,
        hype_score: params.hypeScore,
        hype_label: params.hypeLabel,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline fallback
  }

  // Smart client-side fallback coach
  const isHighHype = params.hypeScore >= 50;
  const isHighRisk = params.riskScore >= 65;

  if (isHighHype) {
    return {
      ticker: params.ticker,
      asset_name: params.assetName,
      amount: params.amount,
      risk_match: !isHighRisk,
      hype_warning: true,
      status: 'hype_warning',
      coach_headline: `⚠️ High Social Hype Detected: ${params.ticker} is spiking with elevated social sentiment (${params.hypeScore}/100).`,
      socratic_questions: [
        {
          id: 'q_hype',
          question: `Are you buying ${params.ticker} because you understand the underlying business, or because everyone is talking about it online?`,
          why_it_matters:
            'Buying into momentum spikes (FOMO) is the #1 mistake beginner investors make.',
          options: [
            'I understand the business fundamentals',
            'I saw it trending on social media',
            'I have not done deep research yet',
          ],
        },
        {
          id: 'q_drawdown',
          question: `If this position drops 25% by Friday, what will you do?`,
          why_it_matters:
            'Pre-committing to an exit or hold plan prevents panic selling at the bottom.',
          options: [
            'I would panic and sell immediately',
            'I am prepared to hold for 3+ years',
            'I have a pre-defined stop loss',
          ],
        },
      ],
      fitness_impact_preview: -5,
      source: 'client_fallback',
    };
  }

  return {
    ticker: params.ticker,
    asset_name: params.assetName,
    amount: params.amount,
    risk_match: true,
    hype_warning: false,
    status: 'sound_decision',
    coach_headline: `✅ Thoughtful Decision: ${params.ticker} is driven by steady fundamentals.`,
    socratic_questions: [
      {
        id: 'q_thesis',
        question: `What is your primary investment horizon for this $${params.amount.toLocaleString()} allocation?`,
        why_it_matters:
          'Time in the market beats timing the market when investing in fundamentals-backed assets.',
        options: [
          'Over 5+ years (long-term wealth building)',
          '1 to 3 years (medium-term goal)',
          'Less than 6 months',
        ],
      },
      {
        id: 'q_diversify',
        question: `Does this investment represent less than 10% of your total target portfolio?`,
        why_it_matters:
          'Keeping single-stock allocations disciplined prevents catastrophic losses.',
        options: [
          'Yes, it is a healthy small piece of my portfolio',
          'No, it is a huge chunk of all my savings',
        ],
      },
    ],
    fitness_impact_preview: +6,
    source: 'client_fallback',
  };
}
