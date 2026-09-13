import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ExternalLink, X } from 'lucide-react';
import { explainTerm } from '../lib/api';
import { GlossaryTerm } from '../types';

interface JargonTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'auto';
}

export const JargonTooltip: React.FC<JargonTooltipProps> = ({
  term,
  children,
  className = '',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(false);
  const [computedAlign, setComputedAlign] = useState<'left' | 'center' | 'right'>('center');
  const [openBelow, setOpenBelow] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Position calculation on open
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const screenW = window.innerWidth;

    // Check vertical space (if near top of screen, show below trigger)
    if (rect.top < 340) {
      setOpenBelow(true);
    } else {
      setOpenBelow(false);
    }

    // Check horizontal alignment
    if (align !== 'auto') {
      setComputedAlign(align);
      return;
    }

    if (rect.right + 180 > screenW || rect.left > screenW * 0.65) {
      setComputedAlign('right');
    } else if (rect.left < 160) {
      setComputedAlign('left');
    } else {
      setComputedAlign('center');
    }
  }, [isOpen, align]);

  // Fetch explanation when opened
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
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Alignment classes for modal
  const alignClasses =
    computedAlign === 'right'
      ? 'right-0'
      : computedAlign === 'left'
      ? 'left-0'
      : 'left-1/2 -translate-x-1/2';

  // Alignment classes for arrow
  const arrowClasses =
    computedAlign === 'right'
      ? 'right-4'
      : computedAlign === 'left'
      ? 'left-4'
      : 'left-1/2 -translate-x-1/2';

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
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
          ref={tooltipRef}
          role="dialog"
          aria-label={`Explanation for ${term}`}
          onClick={(e) => e.stopPropagation()}
          className={`absolute z-50 ${
            openBelow ? 'top-full mt-2' : 'bottom-full mb-2'
          } ${alignClasses} w-[285px] sm:w-[320px] max-w-[calc(100vw-32px)] p-4 bg-white rounded-2xl shadow-2xl border border-emerald-100 ring-4 ring-emerald-50/70 animate-in fade-in zoom-in-95 duration-150 box-border text-left`}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="p-1 rounded-lg bg-emerald-100/80 text-emerald-700 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                {data?.term || term}
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                ELI5
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="pt-2.5 text-xs space-y-2.5 overflow-x-hidden">
            {loading ? (
              <div className="py-4 text-center text-gray-400 flex items-center justify-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-xs">Explaining in plain English...</span>
              </div>
            ) : (
              <>
                <p className="text-gray-700 leading-relaxed break-words whitespace-normal font-normal">
                  {data?.eli5 ||
                    `${term} is an essential investing indicator used to assess portfolio behavior.`}
                </p>

                {data?.analogy && (
                  <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-950 flex items-start gap-2 break-words whitespace-normal">
                    <span className="text-sm shrink-0">💡</span>
                    <div className="leading-snug min-w-0">
                      <span className="font-bold text-amber-950 block text-[11px] mb-0.5">
                        Real-World Analogy:
                      </span>
                      <p className="text-[11px] text-amber-900 leading-normal">
                        {data.analogy}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400 border-t border-gray-50">
                  <span className="italic text-[10px]">
                    Source: {data?.source === 'gemini' ? 'AI Explainer' : 'Curated Glossary'}
                  </span>
                  <a
                    href="#glossary"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.hash = '#glossary';
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-0.5 text-[10px]"
                  >
                    Glossary <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* Tooltip Arrow */}
          <div
            className={`absolute ${
              openBelow
                ? 'bottom-full -mb-px border-t border-l'
                : 'top-full -mt-px border-b border-r'
            } ${arrowClasses} w-2.5 h-2.5 bg-white border-emerald-100 transform rotate-45`}
          ></div>
        </div>
      )}
    </span>
  );
};

export default JargonTooltip;
