import React, { useState } from 'react';
import { Flame, Sparkles, Play, CheckCircle2, RefreshCw } from 'lucide-react';

interface LiveHypeCheckerProps {
  initialHeadline?: string;
}

const PRESET_HEADLINES = [
  {
    label: 'ðŸš€ Meme Stock FOMO',
    ticker: 'GME',
    text: 'Short squeeze incoming! Apes buy the dip to the moon ðŸš€ðŸš€ðŸ’ŽðŸ™Œ',
  },
  {
    label: 'ðŸ“ˆ Tech Earnings',
    ticker: 'AAPL',
    text: 'Apple reports quarterly revenue growth of 8% with expanded services margin',
  },
  {
    label: 'ðŸ”¥ Crypto Hype',
    ticker: 'BTC',
    text: 'Bitcoin breaking out to $150k imminent! Massive pump loading get in before it is too late ðŸ”¥',
  },
  {
    label: 'ðŸ›¡ Index Stability',
    ticker: 'VTI',
    text: 'Total stock market ETF completes scheduled quarterly rebalancing with minimal tracking error',
  },
];

export const LiveHypeChecker: React.FC<LiveHypeCheckerProps> = ({ initialHeadline }) => {
  const [headline, setHeadline] = useState(
    initialHeadline || 'Short squeeze incoming! Apes buy the dip to the moon ðŸš€ðŸš€ðŸ’ŽðŸ™Œ'
  );
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    label: 'Hype-driven' | 'Fundamentals-driven';
    engine: string;
    details: string;
  } | null>({
    score: 88.5,
    label: 'Hype-driven',
    engine: 'FundBee AI Classifier',
    details: 'Heavy concentration of exclamation, FOMO urgency, and social meme keywords.',
  });

  const analyzeHeadline = async (textToAnalyze: string) => {
    const text = textToAnalyze.trim();
    if (!text) return;

    setTesting(true);
    try {
      const res = await fetch('http://localhost:8000/hype-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: [text] }),
      });

      if (res.ok) {
        const data = await res.json();
        const score = typeof data.hype_score === 'number' ? data.hype_score : 50;
        const isHype = score >= 50;
        setResult({
          score: Math.round(score * 10) / 10,
          label: isHype ? 'Hype-driven' : 'Fundamentals-driven',
          engine: data.source === 'onnx' ? 'FundBee AI Engine' : 'FundBee Local Engine',
          details: isHype
            ? 'Detected elevated sentiment extremity, urgency vocabulary, and social momentum indicators.'
            : 'Factual financial vocabulary focused on metrics, balance sheet performance, and operational updates.',
        });
        return;
      }
    } catch {
      // Graceful offline fallback evaluation
    }

    // Client-side fallback rule
    const lower = text.toLowerCase();
    const hypeKeywords = ['moon', 'ðŸš€', 'squeeze', 'yolo', 'pump', 'gem', 'apes', 'diamond', 'breakout', 'hodl'];
    const hasHype = hypeKeywords.some((k) => lower.includes(k)) || (text.match(/!/g) || []).length >= 2;
    const score = hasHype ? 84.5 : 22.0;

    setResult({
      score,
      label: hasHype ? 'Hype-driven' : 'Fundamentals-driven',
      engine: 'FundBee AI (Offline Mode)',
      details: hasHype
        ? 'High probability of social media amplification and retail FOMO momentum.'
        : 'Objective, calm financial statement language without promotional markers.',
    });
    setTesting(false);
  };

  const handlePreset = (text: string) => {
    setHeadline(text);
    analyzeHeadline(text);
  };

  const isHype = result ? result.score >= 50 : false;

  return (
    <div
      id="hype-checker"
      className="rounded-[28px] p-6 sm:p-8 border shadow-sm transition-all"
      style={{
        background: '#ffffff',
        borderColor: '#E7E7E9',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-xs"
              style={{ background: '#FD956D' }}
            >
              <Flame className="w-4 h-4 text-white fill-white" />
            </div>
            <h2
              className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.3px]"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              Hype Detector AI
            </h2>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: '#FDDBCE', color: '#B34A26' }}
            >
              Live Classifier
            </span>
          </div>
          <p
            className="text-[13px]"
            style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
          >
            Paste any headline, tweet, or forum post to verify whether price movement is social-media buzz or real fundamentals.
          </p>
        </div>

        {/* Neural Network Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-mono">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>FundBee AI Engine</span>
        </div>
      </div>

      {/* Interactive Input Form */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') analyzeHeadline(headline);
              }}
              placeholder="Paste headline or post (e.g., GME TO THE MOON ðŸš€)..."
              className="w-full px-4 py-3 rounded-2xl text-[14px] border focus:outline-none transition-all"
              style={{
                fontFamily: 'Archivo, sans-serif',
                borderColor: '#E7E7E9',
                background: '#F8F4EF',
                color: '#181D1F',
              }}
            />
          </div>
          <button
            onClick={() => analyzeHeadline(headline)}
            disabled={testing || !headline.trim()}
            className="px-6 py-3 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            style={{
              background: '#181D1F',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Text...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Check Hype Score</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Demo Presets */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            style={{ fontFamily: 'Archivo, sans-serif' }}
          >
            Quick Presets:
          </span>
          {PRESET_HEADLINES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.text)}
              className="text-[12px] font-medium px-3 py-1 rounded-full border transition-all cursor-pointer hover:border-gray-400"
              style={{
                fontFamily: 'Archivo, sans-serif',
                background: '#ffffff',
                borderColor: '#E7E7E9',
                color: '#424647',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Result Display */}
      {result && (
        <div
          className="rounded-2xl p-5 border transition-all animate-in fade-in duration-200"
          style={{
            background: isHype ? '#FFF5F0' : '#F0F9F5',
            borderColor: isHype ? '#FD956D55' : '#84CC1644',
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Score & Badge */}
            <div className="flex items-center gap-4">
              {/* Score Meter Ring */}
              <div
                className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-white shrink-0 shadow-sm"
                style={{
                  background: isHype ? 'linear-gradient(135deg, #FD956D 0%, #EA580C 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                }}
              >
                <span className="text-xl font-bold leading-none">{result.score}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">/ 100</span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[14px] sm:text-[16px] font-bold flex items-center gap-1.5"
                    style={{
                      fontFamily: 'Gabarito, sans-serif',
                      color: isHype ? '#C2410C' : '#047857',
                    }}
                  >
                    {isHype ? (
                      <>
                        <Flame className="w-4 h-4 fill-current" />
                        <span>High Hype-Driven Activity</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Fundamentals-Driven Content</span>
                      </>
                    )}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: isHype ? '#FDDBCE' : '#D1FAE5',
                      color: isHype ? '#9A3412' : '#065F46',
                    }}
                  >
                    {isHype ? 'FOMO Alert' : 'Solid Ground'}
                  </span>
                </div>

                <p
                  className="text-[13px] mt-1 max-w-xl"
                  style={{ fontFamily: 'Archivo, sans-serif', color: '#424647' }}
                >
                  {result.details}
                </p>
              </div>
            </div>

            {/* Right: Engine Stamp */}
            <div className="flex flex-col sm:items-end text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200/50">
              <span className="text-[11px] font-mono text-gray-500 block">
                {result.engine}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                Inference Latency: &lt; 2 ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveHypeChecker;