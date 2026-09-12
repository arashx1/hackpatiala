import { FitnessLogEntry, RiskTolerance, SimulationTrade, UserFitnessProfile } from '../types';

const STORAGE_KEY = 'moneymind_user_fitness_profile';

const DEFAULT_PROFILE: UserFitnessProfile = {
  score: 72,
  tier: 'Disciplined Investor',
  riskTolerance: 'Moderate',
  history: [
    {
      id: 'init_1',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      delta: +5,
      reason: 'Completed initial investment profile setup and risk assessment questionnaire',
      newScore: 70,
    },
    {
      id: 'init_2',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      delta: +2,
      reason: 'Explored Jargon-Buster definitions for P/E Ratio and Beta',
      newScore: 72,
    },
  ],
  trades: [],
};

export function getFitnessTier(score: number): string {
  if (score >= 85) return 'Zen Master Investor';
  if (score >= 70) return 'Disciplined Investor';
  if (score >= 50) return 'Mindful Saver';
  return 'Impulsive Rookie';
}

export function loadFitnessProfile(): UserFitnessProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.tier = getFitnessTier(parsed.score);
      return parsed;
    }
  } catch {
    // Return default on error
  }
  return DEFAULT_PROFILE;
}

export function saveFitnessProfile(profile: UserFitnessProfile): void {
  try {
    profile.tier = getFitnessTier(profile.score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // LocalStorage failure handling
  }
}

export function calculateTradeImpact(params: {
  amount: number;
  riskScore: number;
  hypeScore: number;
  userRiskTolerance: RiskTolerance;
  confirmed: boolean;
}): { delta: number; reason: string } {
  // If the user walked away from a high-hype asset after coach warning:
  if (!params.confirmed) {
    if (params.hypeScore >= 50) {
      return {
        delta: +4,
        reason: 'Exercised emotional discipline by walking away from a high-hype FOMO spike',
      };
    }
    return {
      delta: +1,
      reason: 'Took time to deliberate rather than executing an impulsive order',
    };
  }

  // If trade was confirmed:
  let delta = 0;
  const reasons: string[] = [];

  // Hype factor
  if (params.hypeScore >= 70) {
    delta -= 8;
    reasons.push('Bought during an extreme hype spike (high FOMO risk)');
  } else if (params.hypeScore >= 50) {
    delta -= 4;
    reasons.push('Allocated capital into elevated social momentum');
  } else {
    delta += 4;
    reasons.push('Invested in fundamentals-driven asset with low social noise');
  }

  // Risk profile match factor
  const isHighRisk = params.riskScore >= 65;
  const isConservative = params.userRiskTolerance === 'Conservative';

  if (isConservative && isHighRisk) {
    delta -= 5;
    reasons.push('Asset risk level significantly exceeds stated Conservative risk tolerance');
  } else if (!isHighRisk) {
    delta += 3;
    reasons.push('Asset volatility matches healthy risk parameters');
  }

  // Sizing sanity check
  if (params.amount > 5000 && params.hypeScore >= 50) {
    delta -= 2;
    reasons.push('Overly large single allocation to a volatile asset');
  }

  const finalDelta = Math.max(-12, Math.min(+10, delta));
  const finalReason = reasons.join('; ');

  return { delta: finalDelta, reason: finalReason || 'Executed simulated paper trade' };
}

export function recordTradeAndScore(
  trade: Omit<SimulationTrade, 'id' | 'timestamp' | 'fitnessDelta' | 'rationale'>,
  impact: { delta: number; reason: string }
): UserFitnessProfile {
  const current = loadFitnessProfile();
  const newScore = Math.max(0, Math.min(100, current.score + impact.delta));

  const newLog: FitnessLogEntry = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    delta: impact.delta,
    reason: impact.reason,
    ticker: trade.ticker,
    newScore,
  };

  const newTrade: SimulationTrade = {
    ...trade,
    id: `trade_${Date.now()}`,
    timestamp: new Date().toISOString(),
    fitnessDelta: impact.delta,
    rationale: impact.reason,
  };

  const updated: UserFitnessProfile = {
    ...current,
    score: newScore,
    tier: getFitnessTier(newScore),
    history: [newLog, ...current.history].slice(0, 30),
    trades: [newTrade, ...current.trades],
  };

  saveFitnessProfile(updated);
  return updated;
}
