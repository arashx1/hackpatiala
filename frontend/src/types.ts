export type AssetType = 'stock' | 'etf' | 'crypto';

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type HypeLevel = 'Fundamentals-driven' | 'Hype-driven';
export type RiskTolerance = 'Conservative' | 'Moderate' | 'Aggressive';

export interface Asset {
  ticker: string;
  name: string;
  type: AssetType;
  price: number;
  change24h: number;
  priceHistory: number[];
  riskScore: number;
  riskLabel: RiskLevel;
  hypeScore: number;
  hypeLabel: HypeLevel;
  sector?: string;
  marketCap?: string;
  beta?: number;
  volatility?: number;
}

export interface RiskAssessment {
  ticker?: string;
  score: number;
  label: RiskLevel;
  confidence: number;
  components: {
    volatility?: number;
    beta?: number;
    max_drawdown?: number;
    probabilities?: {
      low: number;
      medium: number;
      high: number;
    };
  };
  source: 'onnx' | 'fallback';
}

export interface HypeAssessment {
  ticker?: string;
  hype_score: number;
  label: HypeLevel;
  breakdown: Array<{ headline: string; score: number }>;
  headlines_analyzed: number;
  source: 'onnx' | 'fallback';
}

export interface GlossaryTerm {
  term: string;
  slug: string;
  eli5: string;
  analogy: string;
  keywords?: string[];
  source?: string;
}

export interface SocraticQuestion {
  id: string;
  question: string;
  why_it_matters: string;
  options: string[];
}

export interface CoachEvaluation {
  ticker: string;
  asset_name: string;
  amount: number;
  risk_match: boolean;
  hype_warning: boolean;
  status: 'sound_decision' | 'hype_warning' | 'risk_mismatch' | 'high_risk_gamble';
  coach_headline: string;
  socratic_questions: SocraticQuestion[];
  fitness_impact_preview: number;
  source: string;
}

export interface SimulationTrade {
  id: string;
  timestamp: string;
  ticker: string;
  assetName: string;
  amount: number;
  price: number;
  riskScore: number;
  riskLabel: RiskLevel;
  hypeScore: number;
  hypeLabel: HypeLevel;
  userRiskTolerance: RiskTolerance;
  answers: Record<string, string>;
  fitnessDelta: number;
  rationale: string;
}

export interface FitnessLogEntry {
  id: string;
  timestamp: string;
  delta: number;
  reason: string;
  ticker?: string;
  newScore: number;
}

export interface UserFitnessProfile {
  score: number; // 0 - 100 (starts at 70)
  tier: string; // "Rookie Observer", "Mindful Saver", "Disciplined Investor", "Zen Master"
  riskTolerance: RiskTolerance;
  history: FitnessLogEntry[];
  trades: SimulationTrade[];
}

export interface DocumentSummaryResult {
  filename: string;
  file_type: string;
  word_count: number;
  truncated: boolean;
  summary: string;
  key_fact: string;
  takeaway: string;
  source: string;
}
