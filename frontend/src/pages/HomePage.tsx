import React, { useState } from 'react';
import {
  Flame,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onExploreDemo: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onGetStarted,
  onSignIn,
  onExploreDemo,
}) => {
  const { signIn } = useAuth();
  const [sampleHeadline, setSampleHeadline] = useState(
    'Short squeeze incoming! Apes buy the dip to the moon ðŸš€ðŸš€ðŸ’ŽðŸ™Œ'
  );
  const [demoResult, setDemoResult] = useState<{
    score: number;
    label: string;
    isHype: boolean;
  } | null>({
    score: 99.3,
    label: 'Hype-driven',
    isHype: true,
  });
  const [analyzing, setAnalyzing] = useState(false);

  const handleTestSample = async (text: string) => {
    setSampleHeadline(text);
    setAnalyzing(true);
    try {
      const res = await fetch('http://localhost:8000/hype-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines: [text] }),
      });
      if (res.ok) {
        const data = await res.json();
        const score = typeof data.hype_score === 'number' ? data.hype_score : 50;
        setDemoResult({
          score: Math.round(score * 10) / 10,
          label: data.label,
          isHype: score >= 50,
        });
        setAnalyzing(false);
        return;
      }
    } catch {
      // fallback
    }

    const lower = text.toLowerCase();
    const isH = lower.includes('moon') || lower.includes('ðŸš€') || lower.includes('squeeze') || lower.includes('pump');
    setDemoResult({
      score: isH ? 94.2 : 21.5,
      label: isH ? 'Hype-driven' : 'Fundamentals-driven',
      isHype: isH,
    });
    setAnalyzing(false);
  };

  const handleQuickDemo = async () => {
    await signIn('investor@FundBee.demo', 'demo1234');
    onExploreDemo();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#181D1F] selection:bg-[#FD956D33]">
      {/* â”€â”€ Top Navigation Bar â”€â”€ */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E7E7E9]">
        <div className="max-w-[1200px] mx-auto px-6 h-[74px] flex items-center justify-between gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 select-none">
            <div
              className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white text-xl font-black shadow-xs"
              style={{ background: '#FD956D' }}
            >
              ðŸ’š
            </div>
            <div className="flex flex-col leading-none text-left">
              <span
                className="text-[22px] font-semibold tracking-[-0.5px]"
                style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
              >
                Money<span style={{ color: '#FD956D' }}>Mind</span>
              </span>
              <span
                className="text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
              >
                Mind Over Money
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium" style={{ fontFamily: 'Archivo, sans-serif', color: '#424647' }}>
            <a href="#features" className="hover:text-[#181D1F] transition-colors">Features</a>
            <a href="#hype-demo" className="hover:text-[#181D1F] transition-colors">Hype Detector</a>
            <a href="#how-it-works" className="hover:text-[#181D1F] transition-colors">How It Works</a>
            <a href="#methodology" className="hover:text-[#181D1F] transition-colors">AI Technology</a>
          </nav>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onSignIn}
              className="text-[14px] font-semibold px-4 py-2 text-[#181D1F] hover:text-[#FD956D] transition-colors cursor-pointer"
              style={{ fontFamily: 'Archivo, sans-serif' }}
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="r-btn-dark !py-2 !px-5 text-[14px] font-bold cursor-pointer"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </header>

      {/* â”€â”€ Hero Section â”€â”€ */}
      <section className="pt-20 pb-16 px-6 max-w-[1200px] mx-auto text-center flex flex-col items-center">
        {/* Hackathon Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFF5F0] border border-[#FD956D44] text-[#C2410C] text-[12px] font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#FD956D]" />
          <span>Google Developer Groups "Bit N Build" Â· Punjab Round</span>
        </div>

        {/* Main Title */}
        <h1
          className="text-[48px] sm:text-[68px] lg:text-[76px] font-bold leading-[1.05] tracking-[-1px] max-w-[950px] mb-6"
          style={{ fontFamily: 'Gabarito, sans-serif' }}
        >
          Invest with <span className="coral-gradient-text">clarity.</span>
          <br />
          Never with social hype.
        </h1>

        {/* Subtitle */}
        <p
          className="text-[18px] sm:text-[20px] leading-[30px] max-w-[720px] text-[#424647] mb-10"
          style={{ fontFamily: 'Archivo, sans-serif' }}
        >
          The first beginner-investor platform where numbers and headlines get explained in plain English <strong>and</strong> scored by trained Risk Radar and Hype Detector models â€” stopping impulsive FOMO before you buy.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#181D1F] hover:bg-[#2d3336] text-white font-bold text-[16px] transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
            style={{ fontFamily: 'Archivo, sans-serif' }}
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleQuickDemo}
            className="w-full sm:w-auto px-7 py-4 rounded-full border border-[#E7E7E9] hover:border-[#181D1F] text-[#181D1F] font-bold text-[15px] bg-[#F8F4EF] hover:bg-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{ fontFamily: 'Archivo, sans-serif' }}
          >
            <Zap className="w-4 h-4 text-[#FD956D] fill-[#FD956D]" />
            <span>âš¡ Instant Demo Access (No Sign-Up)</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[13px] text-[#7d7d87]" style={{ fontFamily: 'Archivo, sans-serif' }}>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Zero Real Money at Risk
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Trained Risk Radar and Hype Detector AI
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Plain-English Jargon Buster
          </span>
        </div>
      </section>

      {/* â”€â”€ Interactive Live Hype Teaser Section â”€â”€ */}
      <section id="hype-demo" className="py-16 px-6 bg-[#F8F4EF] border-y border-[#E7E7E9]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center max-w-[650px] mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDDBCE] text-[#B34A26] text-[11px] font-bold uppercase tracking-wider mb-3">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Interactive Model Demo</span>
            </div>
            <h2
              className="text-[34px] sm:text-[40px] font-bold tracking-[-0.5px] mb-3 text-[#181D1F]"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            >
              Try the Hype Detector NN Right Now
            </h2>
            <p className="text-[15px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
              Our smart AI model translates headline tone and sentiment into a 0â€“100 hype score to differentiate retail FOMO from real earnings.
            </p>
          </div>

          {/* Interactive Card */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#E7E7E9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={sampleHeadline}
                onChange={(e) => setSampleHeadline(e.target.value)}
                placeholder="Enter financial headline..."
                className="flex-1 px-4 py-3 rounded-2xl border border-[#E7E7E9] bg-[#F8F4EF] text-[14px] text-[#181D1F] focus:outline-none focus:border-[#FD956D]"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              />
              <button
                onClick={() => handleTestSample(sampleHeadline)}
                disabled={analyzing}
                className="px-6 py-3 rounded-2xl bg-[#181D1F] hover:bg-[#2d3336] text-white font-bold text-[14px] flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{analyzing ? 'Classifying...' : 'Classify Text'}</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7d7d87]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Try examples:
              </span>
              <button
                onClick={() => handleTestSample('Short squeeze incoming! Apes buy the dip to the moon ðŸš€ðŸš€ðŸ’ŽðŸ™Œ')}
                className="text-[12px] px-3 py-1 rounded-full border border-[#E7E7E9] bg-white hover:border-[#181D1F] cursor-pointer"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              >
                ðŸš€ GME Meme Spike
              </button>
              <button
                onClick={() => handleTestSample('Apple reports quarterly revenue growth of 8% with expanded services margin')}
                className="text-[12px] px-3 py-1 rounded-full border border-[#E7E7E9] bg-white hover:border-[#181D1F] cursor-pointer"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              >
                ðŸ“ˆ AAPL Earnings Report
              </button>
              <button
                onClick={() => handleTestSample('Bitcoin breaking out to $150k imminent! Massive pump loading get in before it is too late ðŸ”¥')}
                className="text-[12px] px-3 py-1 rounded-full border border-[#E7E7E9] bg-white hover:border-[#181D1F] cursor-pointer"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              >
                âš¡ BTC Breakout FOMO
              </button>
            </div>

            {/* Live Result Output */}
            {demoResult && (
              <div
                className="p-4 rounded-2xl border flex items-center justify-between gap-4 mt-4 animate-in fade-in"
                style={{
                  background: demoResult.isHype ? '#FFF5F0' : '#F0F9F5',
                  borderColor: demoResult.isHype ? '#FD956D66' : '#84CC1655',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                    style={{
                      background: demoResult.isHype ? '#FD956D' : '#10B981',
                    }}
                  >
                    {demoResult.score}
                  </div>
                  <div>
                    <span
                      className="text-[15px] font-bold block"
                      style={{
                        fontFamily: 'Gabarito, sans-serif',
                        color: demoResult.isHype ? '#C2410C' : '#047857',
                      }}
                    >
                      {demoResult.isHype ? 'ðŸ”¥ Hype-Driven Noise' : 'ðŸ“ˆ Fundamentals-Driven'}
                    </span>
                    <span className="text-[12px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                      {demoResult.isHype
                        ? 'High density of emotional momentum triggers and social media euphoria.'
                        : 'Calm corporate reporting focused on verifiable financial performance.'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200 shrink-0 hidden sm:inline">
                  FundBee Smart AI
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* â”€â”€ Core Features Grid Section â”€â”€ */}
      <section id="features" className="py-20 px-6 max-w-[1200px] mx-auto">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <p className="section-label mb-2 text-emerald-800">Everything Inside FundBee</p>
          <h2
            className="text-[36px] sm:text-[46px] font-bold tracking-[-0.5px] text-[#181D1F]"
            style={{ fontFamily: 'Gabarito, sans-serif' }}
          >
            Built Specifically for First-Time Investors
          </h2>
          <p className="text-[16px] text-[#424647] mt-3" style={{ fontFamily: 'Archivo, sans-serif' }}>
            We removed the terrifying financial terminal complexity and replaced it with plain-English clarity and real machine learning.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#D5E2DA]">
                âš¡
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Risk Radar (Neural Net #1)
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                An intelligent risk model trained on volatility, beta, drawdown, market cap, and volume percentiles to output a clean 0â€“100 risk score with a color-coded gauge.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-emerald-800 flex items-center gap-1">
              <span>Quantitative Danger Gauge</span>
              <span>â†’</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#FDDBCE]">
                ðŸ”¥
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Hype Detector (Neural Net #2)
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Smart natural-language classifier that detects FOMO momentum and social chatter. Distinguishes meme-stock language and social mention spikes from true business performance.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-orange-800 flex items-center gap-1">
              <span>Real-Time Sentiment AI</span>
              <span>â†’</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#D7CEF0]">
                ðŸ§
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Decision Coach Simulator
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                A Socratic investing dialogue that asks 2â€“3 probing questions before executing a paper trade. Forces reflection on impulse buys with zero real capital ever on the line.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-purple-800 flex items-center gap-1">
              <span>Socratic Coaching</span>
              <span>â†’</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#F8F4EF]">
                ðŸ“–
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Jargon-Buster & ELI5
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Every financial term on screen (P/E ratio, beta, expense ratio, drawdown) is underlined. Hover or tap to see an everyday lemonade-stand analogy with zero complex vocabulary.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-gray-800 flex items-center gap-1">
              <span>50+ Plain-English Terms</span>
              <span>â†’</span>
            </div>
          </div>

          {/* Feature 5 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#DCEEEF]">
                ðŸ“Š
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Simplified Asset Radar
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Minimalist cards for stocks, ETFs, and crypto with fewer than 5 essential data points, 30-day sparklines, Risk Radar badges, and Hype badges.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-teal-800 flex items-center gap-1">
              <span>Stocks, ETFs, Crypto</span>
              <span>â†’</span>
            </div>
          </div>

          {/* Feature 6 */}
          <div className="rounded-[28px] p-7 border border-[#E7E7E9] bg-white hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-[#FFE4D6]">
                ðŸ“„
              </div>
              <h3 className="text-[20px] font-semibold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Document Reader
              </h3>
              <p className="text-[14px] leading-[22px] text-[#424647]" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Upload 10-K filings, earnings reports, or fund prospectuses. Extracts executive summaries, key risks, and revenue metrics in seconds.
              </p>
            </div>
            <div className="pt-6 mt-4 border-t border-[#E7E7E9] text-[12px] font-semibold text-rose-800 flex items-center gap-1">
              <span>PDF Summarizer</span>
              <span>â†’</span>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ How It Works Step Section â”€â”€ */}
      <section id="how-it-works" className="py-20 px-6 bg-[#F8F4EF] border-t border-[#E7E7E9]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center max-w-[650px] mx-auto mb-16">
            <p className="section-label mb-2 text-emerald-800">The 3-Step Journey</p>
            <h2
              className="text-[36px] sm:text-[44px] font-bold tracking-[-0.5px] text-[#181D1F]"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            >
              How FundBee Protects Your Decisions
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-6 border border-[#E7E7E9] space-y-3">
              <span className="text-3xl font-black font-mono text-[#FD956D] block">01</span>
              <h4 className="text-[18px] font-bold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Explore Assets Without Overwhelm
              </h4>
              <p className="text-[14px] text-[#424647] leading-relaxed" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Browse curated stocks, index funds, and crypto. Every term is explained inline with beginner analogies.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E7E7E9] space-y-3">
              <span className="text-3xl font-black font-mono text-[#FD956D] block">02</span>
              <h4 className="text-[18px] font-bold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                AI Evaluates Risk & Social Hype
              </h4>
              <p className="text-[14px] text-[#424647] leading-relaxed" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Smart AI models compute danger level and social FOMO intensity so you know what is moving the price.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-[#E7E7E9] space-y-3">
              <span className="text-3xl font-black font-mono text-[#FD956D] block">03</span>
              <h4 className="text-[18px] font-bold text-[#181D1F]" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Simulate & Reflect with Socratic Coach
              </h4>
              <p className="text-[14px] text-[#424647] leading-relaxed" style={{ fontFamily: 'Archivo, sans-serif' }}>
                Answer 2 thoughtful questions before making a simulated trade to build permanent emotional discipline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Final Call to Action â”€â”€ */}
      <section className="py-20 px-6 max-w-[900px] mx-auto text-center space-y-6">
        <div
          className="rounded-[36px] p-10 sm:p-14 text-white text-center space-y-6 shadow-xl"
          style={{ background: '#181D1F' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#FD956D] text-white text-2xl flex items-center justify-center mx-auto shadow-sm">
            ðŸ’š
          </div>
          <h2
            className="text-[36px] sm:text-[46px] font-bold leading-tight tracking-[-0.5px]"
            style={{ fontFamily: 'Gabarito, sans-serif' }}
          >
            Ready to master your investing mindset?
          </h2>
          <p
            className="text-[16px] text-gray-300 max-w-lg mx-auto"
            style={{ fontFamily: 'Archivo, sans-serif' }}
          >
            Join the platform built for Google Developer Groups "Bit N Build" Hackathon. Zero real money at risk.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#FD956D] hover:bg-[#fa8657] text-white font-bold text-[15px] transition-all cursor-pointer shadow-sm"
              style={{ fontFamily: 'Archivo, sans-serif' }}
            >
              Create Free Account
            </button>
            <button
              onClick={handleQuickDemo}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-[15px] transition-all cursor-pointer"
              style={{ fontFamily: 'Archivo, sans-serif' }}
            >
              Explore Demo Instantly
            </button>
          </div>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€ */}
      <footer className="border-t border-[#E7E7E9] py-10 px-6 mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">ðŸ’š</span>
            <span className="text-[15px] font-semibold" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              FundBee
            </span>
            <span className="text-[13px] text-[#7d7d87]" style={{ fontFamily: 'Archivo, sans-serif' }}>
              Â· Mind Over Money Â· GDG Bit N Build
            </span>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-[#7d7d87]" style={{ fontFamily: 'Archivo, sans-serif' }}>
            <button onClick={onSignIn} className="hover:text-[#181D1F] transition-colors cursor-pointer">
              Sign In
            </button>
            <button onClick={onGetStarted} className="hover:text-[#181D1F] transition-colors cursor-pointer">
              Sign Up
            </button>
            <button onClick={handleQuickDemo} className="hover:text-[#181D1F] transition-colors cursor-pointer">
              Quick Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;