import React from 'react';
import { Zap } from 'lucide-react';
import { RiskTolerance, UserFitnessProfile } from '../types';
import { JargonTooltip } from './JargonTooltip';

interface FinancialFitnessCardProps {
  profile: UserFitnessProfile;
  onToleranceChange: (tolerance: RiskTolerance) => void;
}

export const FinancialFitnessCard: React.FC<FinancialFitnessCardProps> = ({
  profile,
  onToleranceChange,
}) => {
  const score = profile.score;

  // Determine badge styling
  const badgeColor =
    score >= 85
      ? 'from-purple-500 to-indigo-600 text-white'
      : score >= 70
      ? 'from-emerald-500 to-teal-600 text-white'
      : score >= 50
      ? 'from-amber-500 to-orange-600 text-white'
      : 'from-rose-500 to-red-600 text-white';

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Score & Tier */}
        <div className="flex items-center gap-5">
          <div
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${badgeColor} flex flex-col items-center justify-center shadow-lg shadow-emerald-100 shrink-0`}
          >
            <span className="text-2xl font-black font-mono tracking-tight leading-none">{score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">
              Fitness
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Mind Over Money Score
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <Zap className="w-3 h-3 text-emerald-500" />
                Adaptive
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">{profile.tier}</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-0.5">
              Reflects emotional discipline. Rewards thoughtful diversification and penalizes FOMO hype-chasing.
            </p>
          </div>
        </div>

        {/* Right: Risk Tolerance Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-50/70 p-3 rounded-2xl border border-gray-100">
          <span className="text-xs font-bold text-gray-500 pl-1">
            <JargonTooltip term="Risk Tolerance">Your Profile:</JargonTooltip>
          </span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
            {(['Conservative', 'Moderate', 'Aggressive'] as RiskTolerance[]).map((tol) => (
              <button
                key={tol}
                onClick={() => onToleranceChange(tol)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  profile.riskTolerance === tol
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Points Delta Bar */}
      {profile.history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="font-semibold text-gray-700 shrink-0">Latest event:</span>
            <span className="truncate text-gray-500">{profile.history[0].reason}</span>
          </div>
          <span
            className={`font-mono font-bold shrink-0 ${
              profile.history[0].delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {profile.history[0].delta >= 0
              ? `+${profile.history[0].delta}`
              : profile.history[0].delta}{' '}
            pts
          </span>
        </div>
      )}
    </div>
  );
};
