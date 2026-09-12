import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Sparkles, Send, Lightbulb } from 'lucide-react';
import { GlossaryTerm } from '../types';
import { explainTerm, fetchGlossary } from '../lib/api';

export const GlossaryPage: React.FC = () => {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customTerm, setCustomTerm] = useState('');
  const [customResult, setCustomResult] = useState<GlossaryTerm | null>(null);
  const [explainingCustom, setExplainingCustom] = useState(false);

  useEffect(() => {
    fetchGlossary()
      .then((data) => setTerms(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredTerms = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return terms;
    return terms.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.eli5.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [terms, searchQuery]);

  const handleExplainCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTerm.trim()) return;
    setExplainingCustom(true);
    try {
      const res = await explainTerm(customTerm.trim());
      setCustomResult(res);
    } catch {
      // Handled
    } finally {
      setExplainingCustom(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Jargon-Buster Glossary</h2>
            <p className="text-xs text-gray-500 font-medium">
              Every complex financial concept explained like you are 5 years old, paired with vivid everyday analogies.
            </p>
          </div>
        </div>

        {/* Custom Term AI Explainer input */}
        <form onSubmit={handleExplainCustom} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Ask Jargon-Buster Any Term (Even Unlisted Or Slang)</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customTerm}
              onChange={(e) => setCustomTerm(e.target.value)}
              placeholder="e.g. Gamma Squeeze, Dead Cat Bounce, Arbitrage, EBITDA..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            <button
              type="submit"
              disabled={explainingCustom || !customTerm.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{explainingCustom ? 'Explaining...' : 'Explain in ELI5'}</span>
            </button>
          </div>

          {customResult && (
            <div className="mt-3 p-4 rounded-xl bg-white border border-emerald-200 shadow-sm space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">{customResult.term}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Source: {customResult.source}
                </span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{customResult.eli5}</p>
              {customResult.analogy && (
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-start gap-2">
                  <span>💡</span>
                  <p><strong>Analogy:</strong> {customResult.analogy}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Directory Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search curated glossary..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          <span className="text-xs text-gray-400 font-medium">
            Showing {filteredTerms.length} of {terms.length} curated terms
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
            Loading curated glossary...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.map((item) => (
              <div
                key={item.slug || item.term}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-gray-900 text-base">{item.term}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      ELI5
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed">{item.eli5}</p>
                </div>

                {item.analogy && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-950 text-xs flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-snug">
                      <span className="font-bold block text-[11px] mb-0.5 text-amber-900">
                        Real-World Analogy:
                      </span>
                      {item.analogy}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
