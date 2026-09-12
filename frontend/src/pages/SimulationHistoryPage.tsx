import React from 'react';
import { History, Compass } from 'lucide-react';
import { UserFitnessProfile } from '../types';

interface SimulationHistoryPageProps {
  profile: UserFitnessProfile;
  onSimulateClick: () => void;
}

export const SimulationHistoryPage: React.FC<SimulationHistoryPageProps> = ({
  profile,
  onSimulateClick,
}) => {
  const trades = profile.trades;
  const history = profile.history;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 text-teal-700">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Simulation &amp; Decision Log</h2>
            <p className="text-xs text-gray-500 font-medium">
              A permanent journal of your simulated investing choices, Socratic reflections, and Financial Fitness changes.
            </p>
          </div>
        </div>

        <button
          onClick={onSimulateClick}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Practice Another Decision</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase font-bold block">Current Score</span>
          <span className="text-2xl font-black font-mono text-emerald-600">{profile.score}/100</span>
          <span className="text-[11px] text-gray-500 block">{profile.tier}</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase font-bold block">Simulated Trades</span>
          <span className="text-2xl font-black font-mono text-gray-900">{trades.length}</span>
          <span className="text-[11px] text-gray-500 block">Risk tested</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase font-bold block">Risk Profile</span>
          <span className="text-xl font-black text-gray-900">{profile.riskTolerance}</span>
          <span className="text-[11px] text-gray-500 block">Target alignment</span>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Capital Tested</span>
          <span className="text-2xl font-black font-mono text-teal-600">
            ${trades.reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 block">Zero real risk</span>
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900">Decision Journal</h3>

        {trades.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 space-y-3">
            <Compass className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700 text-sm">No simulated trades recorded yet.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Select any asset on the dashboard and click "Practice Trade" to test your decision making with the Socratic Coach.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-800 text-sm font-mono">
                      {trade.ticker}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{trade.assetName}</span>
                        <span className="text-xs font-semibold text-gray-400">
                          ${trade.amount.toLocaleString()} allocation
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {new Date(trade.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Fitness Delta */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                        trade.fitnessDelta >= 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {trade.fitnessDelta >= 0 ? `+${trade.fitnessDelta}` : trade.fitnessDelta} pts
                    </span>
                  </div>
                </div>

                {/* Badges & Rationale */}
                <div className="text-xs space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                      Risk: {trade.riskLabel} ({trade.riskScore})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                      Hype: {trade.hypeLabel} ({trade.hypeScore})
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium italic">
                      Coach Feedback: {trade.rationale}
                    </span>
                  </div>

                  {/* Answers recap */}
                  {Object.keys(trade.answers).length > 0 && (
                    <div className="p-3 rounded-2xl bg-gray-50/70 border border-gray-100 text-[11px] space-y-1">
                      <span className="font-bold text-gray-700 block">Your Socratic Reflections:</span>
                      {Object.entries(trade.answers).map(([k, val]) => (
                        <p key={k} className="text-gray-600">
                          &bull; <span className="font-medium text-gray-800">{val}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fitness Log History */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900">Financial Fitness Activity Log</h3>
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm divide-y divide-gray-100">
          {history.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <p className="text-gray-800 font-medium">{item.reason}</p>
                <span className="text-[10px] text-gray-400 font-mono">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull;{' '}
                  Score reached: <strong>{item.newScore}</strong>
                </span>
              </div>
              <span
                className={`font-mono font-bold shrink-0 text-sm ${
                  item.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {item.delta >= 0 ? `+${item.delta}` : item.delta} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
