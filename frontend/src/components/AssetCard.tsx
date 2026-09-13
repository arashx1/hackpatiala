import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { Asset } from '../types';
import { SparklineChart } from './SparklineChart';
import { CandlestickChart } from './CandlestickChart';
import { RiskGauge } from './RiskGauge';
import { HypeBadge } from './HypeBadge';
import { JargonTooltip } from './JargonTooltip';
import {
  getCoinGeckoId,
  fetchCryptoLivePrice,
  fetchCryptoMarketChart7d,
  fetchStockLivePrice,
} from '../lib/api';

interface AssetCardProps {
  asset: Asset;
  onSimulate: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSimulate }) => {
  // Live price & change state with failsafe fallback to asset props
  const [currentPrice, setCurrentPrice] = useState<number>(asset.price);
  const [currentChange24h, setCurrentChange24h] = useState<number>(asset.change24h);
  const [sparklineData, setSparklineData] = useState<number[]>(
    asset.priceHistory?.slice(-7) || asset.priceHistory || []
  );
  const [isLastKnownPrice, setIsLastKnownPrice] = useState<boolean>(false);
  const [isChartComingSoon, setIsChartComingSoon] = useState<boolean>(false);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');

  // References to keep track of last successful values
  const lastKnownPriceRef = useRef<number>(asset.price);
  const lastKnownChangeRef = useRef<number>(asset.change24h);
  const lastKnownSparklineRef = useRef<number[]>(
    asset.priceHistory?.slice(-7) || asset.priceHistory || []
  );

  const isCrypto = asset.type === 'crypto';

  useEffect(() => {
    let isMounted = true;

    async function loadLiveData() {
      if (isCrypto) {
        // ── Crypto Live Fetch (CoinGecko) ───────────────────────────
        const coingeckoId = getCoinGeckoId(asset.ticker);

        // 1. Fetch live price & 24h change
        const priceRes = await fetchCryptoLivePrice(coingeckoId);
        if (!isMounted) return;

        if (priceRes && typeof priceRes.price === 'number' && priceRes.price > 0) {
          setCurrentPrice(priceRes.price);
          setCurrentChange24h(priceRes.change24h);
          lastKnownPriceRef.current = priceRes.price;
          lastKnownChangeRef.current = priceRes.change24h;
          setIsLastKnownPrice(false);
        } else {
          // Failsafe: fall back to last successfully fetched or initial price
          setCurrentPrice(lastKnownPriceRef.current);
          setCurrentChange24h(lastKnownChangeRef.current);
          setIsLastKnownPrice(true);
        }

        // 2. Fetch 7-day sparkline from CoinGecko /market_chart
        const chartRes = await fetchCryptoMarketChart7d(coingeckoId);
        if (!isMounted) return;

        if (chartRes && chartRes.length >= 2) {
          setSparklineData(chartRes);
          lastKnownSparklineRef.current = chartRes;
          setIsChartComingSoon(false);
        } else if (lastKnownSparklineRef.current.length >= 2) {
          setSparklineData(lastKnownSparklineRef.current);
          setIsChartComingSoon(false);
        } else {
          setIsChartComingSoon(true);
        }
      } else {
        // ── Stock / ETF Live Fetch (Backend Route /api/price/{symbol}) ─
        const stockRes = await fetchStockLivePrice(asset.ticker);
        if (!isMounted) return;

        if (stockRes && typeof stockRes.price === 'number' && stockRes.price > 0) {
          setCurrentPrice(stockRes.price);
          setCurrentChange24h(stockRes.change24h);
          lastKnownPriceRef.current = stockRes.price;
          lastKnownChangeRef.current = stockRes.change24h;
          setIsLastKnownPrice(stockRes.isFallback);

          if (stockRes.priceHistory7d && stockRes.priceHistory7d.length >= 2) {
            setSparklineData(stockRes.priceHistory7d);
            lastKnownSparklineRef.current = stockRes.priceHistory7d;
            setIsChartComingSoon(false);
          } else if (lastKnownSparklineRef.current.length >= 2) {
            setSparklineData(lastKnownSparklineRef.current);
            setIsChartComingSoon(false);
          } else {
            setIsChartComingSoon(true);
          }
        } else {
          // Failsafe fallback
          setCurrentPrice(lastKnownPriceRef.current);
          setCurrentChange24h(lastKnownChangeRef.current);
          setIsLastKnownPrice(true);
          if (lastKnownSparklineRef.current.length >= 2) {
            setSparklineData(lastKnownSparklineRef.current);
            setIsChartComingSoon(false);
          } else {
            setIsChartComingSoon(true);
          }
        }
      }
    }

    // Initial fetch on mount
    loadLiveData();

    // Poll every 45 seconds (within 30-60s requirement)
    const interval = setInterval(() => {
      loadLiveData();
    }, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [asset.ticker, asset.type, isCrypto]);

  const isPositive = currentChange24h >= 0;

  const handleSimulateClick = () => {
    // Pass real live price to Decision Coach
    onSimulate({
      ...asset,
      price: currentPrice,
      change24h: currentChange24h,
      priceHistory: sparklineData.length > 0 ? sparklineData : asset.priceHistory,
    });
  };

  return (
    <div className="r-card p-5 flex flex-col justify-between">
      <div>
        {/* Header: Name, Ticker, Type */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold text-[17px] tracking-[-0.3px]"
                style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
              >
                {asset.ticker}
              </h3>
              <span
                className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full"
                style={{ fontFamily: 'Archivo, sans-serif', background: '#EAE4DC', color: '#424647' }}
              >
                {asset.type}
              </span>
            </div>
            <p
              className="text-[12px] font-medium truncate max-w-[180px] mt-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              {asset.name}
            </p>
          </div>

          {/* Price & Change */}
          <div className="text-right">
            <div
              className="font-semibold text-[17px] font-mono"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div
              className="inline-flex items-center text-[12px] font-semibold"
              style={{ color: isPositive ? '#16a34a' : '#dc2626' }}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(currentChange24h).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* 7-Day Trend: Candlestick or Line */}
        <div className="my-2 rounded-2xl p-2.5" style={{ background: '#F8F4EF', border: '1px solid #E7E7E9' }}>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-semibold"
                style={{ fontFamily: 'Archivo, sans-serif', color: '#424647' }}
              >
                {chartType === 'candles' ? 'Candlesticks' : '7-Day Trend'}
              </span>
              {isLastKnownPrice && (
                <span
                  className="text-[9px] font-medium px-1.5 rounded"
                  style={{ background: '#F6E7CF', color: '#92400e' }}
                >
                  last known
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              {!isChartComingSoon && sparklineData.length >= 2 && (
                <span
                  className="font-mono text-[10px]"
                  style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
                >
                  ${sparklineData[0]?.toFixed(1)} → ${sparklineData[sparklineData.length - 1]?.toFixed(1)}
                </span>
              )}
              {/* Toggle */}
              <div
                className="flex items-center p-0.5 rounded-lg text-[9px] font-bold"
                style={{ background: '#EAE4DC' }}
              >
                <button
                  type="button"
                  onClick={() => setChartType('candles')}
                  className="px-1.5 py-0.5 rounded transition-all"
                  style={{
                    fontFamily: 'Archivo, sans-serif',
                    background: chartType === 'candles' ? '#ffffff' : 'transparent',
                    color: chartType === 'candles' ? '#181D1F' : '#7d7d87',
                    boxShadow: chartType === 'candles' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                  title="Candlestick Chart"
                >
                  Candles
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className="px-1.5 py-0.5 rounded transition-all"
                  style={{
                    fontFamily: 'Archivo, sans-serif',
                    background: chartType === 'line' ? '#ffffff' : 'transparent',
                    color: chartType === 'line' ? '#181D1F' : '#7d7d87',
                    boxShadow: chartType === 'line' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                  title="Line Chart"
                >
                  Line
                </button>
              </div>
            </div>
          </div>

          {isChartComingSoon || sparklineData.length < 2 ? (
            <div className="h-12 flex items-center justify-center text-xs text-gray-400 font-medium italic">
              chart coming soon
            </div>
          ) : chartType === 'candles' ? (
            <CandlestickChart data={sparklineData} currentPrice={currentPrice} height={50} />
          ) : (
            <SparklineChart data={sparklineData} isPositive={isPositive} height={50} />
          )}
        </div>

        {/* Neural Network Badges: Risk Radar + Hype Detector */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <RiskGauge score={asset.riskScore} label={asset.riskLabel} size="sm" />
          <HypeBadge score={asset.hypeScore} label={asset.hypeLabel} size="sm" />
        </div>

        {/* Jargon-Buster Metrics Strip */}
        <div
          className="grid grid-cols-3 gap-1 py-2 px-3 rounded-2xl my-2"
          style={{ background: '#F8F4EF', border: '1px solid #E7E7E9' }}
        >
          <div>
            <span
              className="block text-[10px] mb-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              <JargonTooltip term="Beta" align="left">Beta</JargonTooltip>
            </span>
            <span
              className="font-semibold text-[12px] font-mono"
              style={{ color: '#181D1F' }}
            >
              {asset.beta !== undefined ? asset.beta.toFixed(2) : '1.00'}
            </span>
          </div>

          <div>
            <span
              className="block text-[10px] mb-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              <JargonTooltip term="Volatility" align="center">Vol</JargonTooltip>
            </span>
            <span
              className="font-semibold text-[12px] font-mono"
              style={{ color: '#181D1F' }}
            >
              {asset.volatility !== undefined ? `${(asset.volatility * 100).toFixed(0)}%` : '20%'}
            </span>
          </div>

          <div>
            <span
              className="block text-[10px] mb-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              <JargonTooltip term="Market Capitalisation" align="right">Cap</JargonTooltip>
            </span>
            <span
              className="font-semibold text-[12px] font-mono"
              style={{ color: '#181D1F' }}
            >
              {asset.marketCap || 'Large'}
            </span>
          </div>
        </div>
      </div>

      {/* CTA: Simulate Invest with Decision Coach */}
      <button
        onClick={handleSimulateClick}
        className="mt-3 w-full py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        style={{
          fontFamily: 'Gabarito, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          background: '#181D1F',
          color: '#ffffff',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#FD956D'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#181D1F'}
      >
        <Compass className="w-4 h-4" />
        <span>Practice with Decision Coach</span>
      </button>
    </div>
  );
};
