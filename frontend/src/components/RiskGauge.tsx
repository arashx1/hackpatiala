import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';
import { RiskLevel } from '../types';

interface RiskGaugeProps {
  score: number;
  label: RiskLevel;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score,
  label,
  confidence,
  size = 'md',
  showDetails = true,
}) => {
  // Clamped score
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));

  // Colors & styles
  const isLow = safeScore < 35;
  const isMed = safeScore >= 35 && safeScore <= 65;

  const colorClass = isLow
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : isMed
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-rose-600 bg-rose-50 border-rose-200';

  const barColor = isLow ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-rose-500';

  const Icon = isLow ? ShieldCheck : isMed ? Shield : ShieldAlert;

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${colorClass}`}
        title={`Risk Radar Score: ${safeScore}/100 (${label} Risk)`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>{label} Risk</span>
        <span className="opacity-70 font-mono text-[11px]">({safeScore})</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-xl border ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
              Risk Radar
            </span>
            <span className="text-sm font-bold text-gray-900">{label} Risk</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black font-mono text-gray-900">{safeScore}</span>
          <span className="text-xs text-gray-400 font-medium">/100</span>
        </div>
      </div>

      {/* Visual meter bar */}
      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden relative">
        {/* Subtle background zone markers */}
        <div className="absolute inset-0 flex">
          <div className="w-[35%] border-r border-white/60 bg-emerald-100/40"></div>
          <div className="w-[30%] border-r border-white/60 bg-amber-100/40"></div>
          <div className="w-[35%] bg-rose-100/40"></div>
        </div>
        {/* Animated fill */}
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out relative ${barColor}`}
          style={{ width: `${safeScore}%` }}
        ></div>
      </div>

      {showDetails && (
        <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-500" />
            <span>Trained Neural Network</span>
          </span>
          {confidence && (
            <span className="text-gray-400">
              Confidence: <strong className="text-gray-700 font-mono">{(confidence * 100).toFixed(0)}%</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
