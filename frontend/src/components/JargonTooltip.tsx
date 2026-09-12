import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, X } from 'lucide-react';
import { explainTerm } from '../lib/api';
import { GlossaryTerm } from '../types';

interface JargonTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({ term, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !data && !loading) {
      setLoading(true);
      explainTerm(term)
        .then((res) => setData(res))
        .finally(() => setLoading(false));
    }
  }, [isOpen, term, data, loading]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <span className="relative inline-flex items-center" ref={tooltipRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`cursor-help border-b-2 border-dotted border-emerald-500/70 hover:border-emerald-600 hover:text-emerald-700 transition-colors font-medium inline-flex items-center gap-0.5 text-left focus:outline-none ${className}`}
        title={`Click for ELI5 explanation of ${term}`}
      >
        {children || term}
        <span className="text-emerald-500 text-xs inline-block ml-0.5">?</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`Explanation for ${term}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 p-4 bg-white rounded-2xl shadow-xl border border-emerald-100 ring-4 ring-emerald-50/50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-lg bg-emerald-100/70 text-emerald-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">{data?.term || term}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ELI5
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="pt-2 text-xs space-y-2.5">
            {loading ? (
              <div className="py-4 text-center text-gray-400 flex items-center justify-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                Explaining in plain English...
              </div>
            ) : (
              <>
                <p className="text-gray-700 leading-relaxed">
                  {data?.eli5 || `${term} is an essential investing indicator used to assess portfolio behavior.`}
                </p>

                {data?.analogy && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 flex items-start gap-2">
                    <span className="text-sm shrink-0">💡</span>
                    <div className="leading-snug">
                      <span className="font-semibold text-amber-950 block text-[11px] mb-0.5">
                        Real-World Analogy:
                      </span>
                      {data.analogy}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                  <span className="italic">Source: {data?.source === 'gemini' ? 'AI Explainer' : 'Curated Glossary'}</span>
                  <a
                    href="#glossary"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.hash = '#glossary';
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-0.5"
                  >
                    Glossary <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-3 h-3 bg-white border-b border-r border-emerald-100 transform rotate-45"></div>
        </div>
      )}
    </span>
  );
};
