import React, { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Asset, CoachEvaluation, RiskTolerance } from '../types';
import { evaluateDecisionWithCoach } from '../lib/api';
import { calculateTradeImpact, recordTradeAndScore } from '../lib/fitnessScore';
import { RiskGauge } from './RiskGauge';
import { HypeBadge } from './HypeBadge';

interface DecisionCoachModalProps {
  asset: Asset | null;
  onClose: () => void;
  onTradeCompleted: () => void;
  userRiskTolerance: RiskTolerance;
}

export const DecisionCoachModal: React.FC<DecisionCoachModalProps> = ({
  asset,
  onClose,
  onTradeCompleted,
  userRiskTolerance,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [amount, setAmount] = useState<number>(1000);
  const [selectedTolerance, setSelectedTolerance] = useState<RiskTolerance>(userRiskTolerance);
  const [evaluation, setEvaluation] = useState<CoachEvaluation | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<{ confirmed: boolean; delta: number; reason: string } | null>(
    null
  );

  useEffect(() => {
    if (asset && step === 2 && !evaluation && !loadingCoach) {
      setLoadingCoach(true);
      evaluateDecisionWithCoach({
        ticker: asset.ticker,
        assetName: asset.name,
        amount,
        userRiskTolerance: selectedTolerance,
        riskScore: asset.riskScore,
        riskLabel: asset.riskLabel,
        hypeScore: asset.hypeScore,
        hypeLabel: asset.hypeLabel,
      })
        .then((res) => setEvaluation(res))
        .finally(() => setLoadingCoach(false));
    }
  }, [asset, step, evaluation, loadingCoach, amount, selectedTolerance]);

  if (!asset) return null;

  const handleSelectAnswer = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const allQuestionsAnswered =
    evaluation?.socratic_questions.every((q) => !!answers[q.id]) ?? false;

  const handleFinalDecision = (confirmed: boolean) => {
    const impact = calculateTradeImpact({
      amount,
      riskScore: asset.riskScore,
      hypeScore: asset.hypeScore,
      userRiskTolerance: selectedTolerance,
      confirmed,
    });

    if (confirmed) {
      recordTradeAndScore(
        {
          ticker: asset.ticker,
          assetName: asset.name,
          amount,
          price: asset.price,
          riskScore: asset.riskScore,
          riskLabel: asset.riskLabel,
          hypeScore: asset.hypeScore,
          hypeLabel: asset.hypeLabel,
          userRiskTolerance: selectedTolerance,
          answers,
        },
        impact
      );
    } else {
      // If user decided not to buy due to coach warnings, still reward discipline!
      recordTradeAndScore(
        {
          ticker: asset.ticker,
          assetName: asset.name,
          amount,
          price: asset.price,
          riskScore: asset.riskScore,
          riskLabel: asset.riskLabel,
          hypeScore: asset.hypeScore,
          hypeLabel: asset.hypeLabel,
          userRiskTolerance: selectedTolerance,
          answers: { ...answers, outcome: 'Walked away with discipline' },
        },
        impact
      );
    }

    setOutcome({ confirmed, delta: impact.delta, reason: impact.reason });
    setStep(4);
    onTradeCompleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-sky-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-900 text-lg">Decision Coach Simulator</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Zero Real Money
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Testing hypothesis for <strong className="text-gray-800">{asset.name} ({asset.ticker})</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-3 pb-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-500">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-emerald-700' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <span>Allocation</span>
          </div>
          <div className="w-8 h-px bg-gray-200"></div>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-emerald-700' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            <span>NN Signals</span>
          </div>
          <div className="w-8 h-px bg-gray-200"></div>
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-700' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            <span>Socratic Coach</span>
          </div>
          <div className="w-8 h-px bg-gray-200"></div>
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-emerald-700' : ''}`}>
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[11px] font-bold">
              4
            </span>
            <span>Verdict</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: ALLOCATION & PROFILE */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Hypothetical Investment Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[250, 500, 1000, 2500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-3 rounded-2xl border text-sm font-bold transition-all ${
                        amount === val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      ${val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Your Current Risk Profile
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Conservative', 'Moderate', 'Aggressive'] as RiskTolerance[]).map((tol) => (
                    <button
                      key={tol}
                      type="button"
                      onClick={() => setSelectedTolerance(tol)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all ${
                        selectedTolerance === tol
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      {tol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <p className="leading-relaxed">
                  <strong>Mind Over Money Philosophy:</strong> This simulator challenges your subconscious urge
                  to buy impulsively. We will test your conviction with AI-powered Socratic questions before you
                  confirm this simulated order.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: NEURAL NETWORK SIGNALS */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-xs text-gray-500">
                Review how real trained neural networks rate <strong className="text-gray-900">{asset.ticker}</strong> before deciding:
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <RiskGauge score={asset.riskScore} label={asset.riskLabel} />
                <HypeBadge score={asset.hypeScore} label={asset.hypeLabel} />
              </div>

              {loadingCoach ? (
                <div className="p-6 rounded-2xl bg-gray-50 text-center flex flex-col items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs text-gray-500 font-medium">
                    Synthesizing Socratic dialogue based on model scores...
                  </span>
                </div>
              ) : evaluation ? (
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    evaluation.hype_warning
                      ? 'bg-orange-50/80 border-orange-200 text-orange-950'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                    {evaluation.hype_warning ? (
                      <Flame className="w-4 h-4 text-orange-500" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>Coach Note:</span>
                  </div>
                  <p>{evaluation.coach_headline}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 3: SOCRATIC QUESTIONS */}
          {step === 3 && evaluation && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Answer these Socratic prompts honestly. There is no wrong answer, only self-awareness.</span>
              </div>

              {evaluation.socratic_questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <h4 className="font-bold text-gray-900 text-sm">{q.question}</h4>
                  </div>

                  <p className="text-[11px] text-gray-500 italic pl-7">{q.why_it_matters}</p>

                  <div className="space-y-1.5 pl-7 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleSelectAnswer(q.id, opt)}
                          className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                              : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                            </span>
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: VERDICT & FITNESS IMPACT */}
          {step === 4 && outcome && (
            <div className="space-y-5 text-center py-4 animate-in zoom-in-95 duration-200">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  outcome.delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                }`}
              >
                {outcome.delta >= 0 ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertTriangle className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {outcome.confirmed ? 'Simulated Order Completed' : 'Disciplined Restraint Exercised'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{outcome.reason}</p>
              </div>

              {/* Financial Fitness Score Delta Card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 max-w-sm mx-auto">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Financial Fitness Impact
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`text-3xl font-black font-mono ${
                      outcome.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {outcome.delta >= 0 ? `+${outcome.delta}` : outcome.delta} pts
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Your decision has been logged to your local Mind Over Money profile.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div></div>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-200"
            >
              <span>Next: AI Model Signals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={loadingCoach}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-200"
            >
              <span>Meet the Decision Coach</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFinalDecision(false)}
                className="px-4 py-2.5 rounded-2xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all"
                title="Walk away from this trade with discipline"
              >
                Walk Away (No Buy)
              </button>

              <button
                onClick={() => handleFinalDecision(true)}
                disabled={!allQuestionsAnswered}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-200"
              >
                <span>Confirm Paper Trade</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === 4 && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-colors"
            >
              Close & View Updated Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
