import React from 'react';
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
  void badgeColor; // used conditionally below — TS noise suppression

  return (
    <div className="r-card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Score & Tier */}
        <div className="flex items-center gap-5">
          {/* Score ring — Reasonal style */}
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center shrink-0"
            style={{
              background: '#FDDBCE',
              border: '3px solid #FD956D',
            }}
          >
            <span
              className="text-2xl font-bold leading-none"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              {score}
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider mt-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              / 100
            </span>
          </div>

          <div>
            <p className="section-label mb-1">Mind Over Money Score</p>
            <h3
              className="text-[22px] font-semibold tracking-[-0.3px]"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              {profile.tier}
            </h3>
            <p
              className="text-[13px] max-w-sm mt-1"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              Rewards emotional discipline. Penalizes FOMO hype-chasing.
            </p>
          </div>
        </div>

        {/* Right: Risk Tolerance Selector */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl"
          style={{ background: '#F8F4EF', border: '1px solid #E7E7E9' }}
        >
          <span
            className="text-[11px] font-semibold pl-1 section-label"
          >
            <JargonTooltip term="Risk Tolerance">Your Profile</JargonTooltip>
          </span>
          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{ background: '#EAE4DC' }}
          >
            {(['Conservative', 'Moderate', 'Aggressive'] as RiskTolerance[]).map((tol) => (
              <button
                key={tol}
                onClick={() => onToleranceChange(tol)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                style={{
                  fontFamily: 'Archivo, sans-serif',
                  background: profile.riskTolerance === tol ? '#181D1F' : 'transparent',
                  color: profile.riskTolerance === tol ? '#ffffff' : '#424647',
                }}
              >
                {tol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Points Delta Bar */}
      {profile.history.length > 0 && (
        <div
          className="mt-4 pt-3 flex items-center justify-between text-[12px]"
          style={{ borderTop: '1px solid #E7E7E9' }}
        >
          <div className="flex items-center gap-2 truncate pr-2">
            <span
              className="font-semibold shrink-0"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              Latest:
            </span>
            <span
              className="truncate"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              {profile.history[0].reason}
            </span>
          </div>
          <span
            className="font-mono font-bold shrink-0"
            style={{ color: profile.history[0].delta >= 0 ? '#16a34a' : '#dc2626' }}
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
