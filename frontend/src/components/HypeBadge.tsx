import React from 'react';
import { Flame, Activity, Cpu } from 'lucide-react';
import { HypeLevel } from '../types';

interface HypeBadgeProps {
  score: number;
  label: HypeLevel;
  size?: 'sm' | 'md';
  showHeadlineCount?: number;
}

export const HypeBadge: React.FC<HypeBadgeProps> = ({
  score,
  label,
  size = 'md',
  showHeadlineCount,
}) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const isHype = safeScore >= 50 || label === 'Hype-driven';

  if (size === 'sm') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${
          isHype
            ? 'text-orange-700 bg-orange-50 border-orange-200'
            : 'text-sky-700 bg-sky-50 border-sky-200'
        }`}
        title={`Hype Detector Score: ${safeScore}/100 (${label})`}
      >
        {isHype ? (
          <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
        ) : (
          <Activity className="w-3.5 h-3.5 text-sky-500" />
        )}
        <span>{isHype ? 'Hype-driven' : 'Fundamentals'}</span>
        <span className="opacity-70 font-mono text-[11px]">({safeScore})</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-xl border ${
              isHype
                ? 'text-orange-600 bg-orange-50 border-orange-200'
                : 'text-sky-600 bg-sky-50 border-sky-200'
            }`}
          >
            {isHype ? (
              <Flame className="w-4 h-4 animate-pulse text-orange-500" />
            ) : (
              <Activity className="w-4 h-4 text-sky-500" />
            )}
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block">
              Hype Detector
            </span>
            <span className="text-sm font-bold text-gray-900">
              {isHype ? 'Social Hype Surge' : 'Fundamentals Driven'}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black font-mono text-gray-900">{safeScore}</span>
          <span className="text-xs text-gray-400 font-medium">/100</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isHype ? 'bg-gradient-to-r from-orange-400 to-rose-500' : 'bg-sky-500'
          }`}
          style={{ width: `${safeScore}%` }}
        ></div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-purple-500" />
          <span>AI Sentiment Classifier</span>
        </span>
        {showHeadlineCount ? (
          <span className="text-gray-400">
            Headlines: <strong className="text-gray-700 font-mono">{showHeadlineCount}</strong>
          </span>
        ) : (
          <span className="text-gray-400">
            Sentiment: <strong className="text-gray-700">{isHype ? 'Euphorically Hot' : 'Grounded'}</strong>
          </span>
        )}
      </div>
    </div>
  );
};
