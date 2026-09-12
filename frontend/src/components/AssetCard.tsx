import React from 'react';
import { ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';
import { Asset } from '../types';
import { SparklineChart } from './SparklineChart';
import { RiskGauge } from './RiskGauge';
import { HypeBadge } from './HypeBadge';
import { JargonTooltip } from './JargonTooltip';

interface AssetCardProps {
  asset: Asset;
  onSimulate: (asset: Asset) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSimulate }) => {
  const isPositive = asset.change24h >= 0;

  return (
    <div className="group bg-white rounded-3xl p-5 border border-gray-100/90 shadow-sm hover:shadow-xl hover:border-emerald-200/70 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
      {/* Top subtle highlight */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

      <div>
        {/* Header: Name, Ticker, Type */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
                {asset.ticker}
              </h3>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {asset.type}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[180px]">
              {asset.name}
            </p>
          </div>

          {/* Price & Change */}
          <div className="text-right">
            <div className="font-bold text-base text-gray-900 font-mono">
              ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div
              className={`inline-flex items-center text-xs font-semibold ${
                isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(asset.change24h).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* 30-Day Sparkline */}
        <div className="my-2 bg-gray-50/50 rounded-2xl p-2 border border-gray-50">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mb-1 px-1">
            <span>30-Day Trend</span>
            <span className="font-mono">
              ${asset.priceHistory[0]?.toFixed(1)} → ${asset.priceHistory[asset.priceHistory.length - 1]?.toFixed(1)}
            </span>
          </div>
          <SparklineChart data={asset.priceHistory} isPositive={isPositive} height={48} />
        </div>

        {/* Neural Network Badges: Risk Radar + Hype Detector */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <RiskGauge score={asset.riskScore} label={asset.riskLabel} size="sm" />
          <HypeBadge score={asset.hypeScore} label={asset.hypeLabel} size="sm" />
        </div>

        {/* Jargon-Buster Metics Strip */}
        <div className="grid grid-cols-3 gap-1 py-2 px-3 rounded-2xl bg-gray-50/70 text-[11px] text-gray-600 my-2">
          <div>
            <span className="block text-[10px] text-gray-400">
              <JargonTooltip term="Beta">Beta</JargonTooltip>
            </span>
            <span className="font-semibold text-gray-800 font-mono">
              {asset.beta !== undefined ? asset.beta.toFixed(2) : '1.00'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-gray-400">
              <JargonTooltip term="Volatility">Vol</JargonTooltip>
            </span>
            <span className="font-semibold text-gray-800 font-mono">
              {asset.volatility !== undefined ? `${(asset.volatility * 100).toFixed(0)}%` : '20%'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-gray-400">
              <JargonTooltip term="Market Capitalisation">Cap</JargonTooltip>
            </span>
            <span className="font-semibold text-gray-800 font-mono">
              {asset.marketCap || 'Large'}
            </span>
          </div>
        </div>
      </div>

      {/* CTA: Simulate Invest with Decision Coach */}
      <button
        onClick={() => onSimulate(asset)}
        className="mt-3 w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm hover:shadow-emerald-200 flex items-center justify-center gap-1.5"
      >
        <Compass className="w-4 h-4" />
        <span>Practice Trade (Decision Coach)</span>
      </button>
    </div>
  );
};
