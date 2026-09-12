import React, { useState, useMemo } from 'react';
import { Search, Sparkles, AlertCircle, Compass, ShieldCheck, Flame } from 'lucide-react';
import { Asset, RiskTolerance, UserFitnessProfile } from '../types';
import { AssetCard } from '../components/AssetCard';
import { FinancialFitnessCard } from '../components/FinancialFitnessCard';

interface DashboardProps {
  assets: Asset[];
  profile: UserFitnessProfile;
  onSimulate: (asset: Asset) => void;
  onToleranceChange: (tolerance: RiskTolerance) => void;
  onOpenModelLab: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  assets,
  profile,
  onSimulate,
  onToleranceChange,
  onOpenModelLab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'stock' | 'etf' | 'crypto' | 'hype' | 'safe'
  >('all');

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Search filter
      const matchesSearch =
        asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'stock') return asset.type === 'stock';
      if (selectedFilter === 'etf') return asset.type === 'etf';
      if (selectedFilter === 'crypto') return asset.type === 'crypto';
      if (selectedFilter === 'hype') return asset.hypeScore >= 50;
      if (selectedFilter === 'safe') return asset.riskScore < 35 && asset.hypeScore < 45;

      return true;
    });
  }, [assets, searchQuery, selectedFilter]);

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg shadow-emerald-950/20">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-semibold border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>GDG Hackathon "Mind Over Money" Edition</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Invest With Clarity. <br className="hidden sm:inline" />
            Counter Impulsive Hype With Real AI.
          </h2>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
            Every number is explained in plain English with our{' '}
            <span className="font-bold underline decoration-dotted underline-offset-2">
              Jargon-Buster
            </span>
            , while trained neural networks rate dangerous risk and detect meme-stock social bubbles.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                const first = assets[0];
                if (first) onSimulate(first);
              }}
              className="px-5 py-2.5 rounded-2xl bg-white text-emerald-900 font-extrabold text-xs hover:bg-emerald-50 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-emerald-700" />
              <span>Start Guided Practice Flow</span>
            </button>

            <button
              onClick={onOpenModelLab}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
            >
              Inspect Model Weights &amp; Confusion Matrix
            </button>
          </div>
        </div>

        {/* Ambient Decorative Background shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none bg-radial-gradient">
          <div className="w-64 h-64 rounded-full border-8 border-white absolute -top-10 -right-10"></div>
          <div className="w-48 h-48 rounded-full border-8 border-emerald-300 absolute bottom-0 right-20"></div>
        </div>
      </div>

      {/* Financial Fitness Gamified Profile Bar */}
      <FinancialFitnessCard profile={profile} onToleranceChange={onToleranceChange} />

      {/* Asset Explorer Bar (Search + Filter Tabs) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <span>Simplified Asset Radar</span>
              <span className="text-xs font-normal text-gray-400">
                ({filteredAssets.length} assets ready)
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Curated for first-time investors with 3-4 metrics maximum. Hover underlined terms for ELI5 definitions.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, name, or crypto..."
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-gray-200 bg-white text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold text-gray-600">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              selectedFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            All Assets
          </button>

          <button
            onClick={() => setSelectedFilter('stock')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              selectedFilter === 'stock'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            Stocks
          </button>

          <button
            onClick={() => setSelectedFilter('etf')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              selectedFilter === 'etf'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            ETFs (Baskets)
          </button>

          <button
            onClick={() => setSelectedFilter('crypto')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
              selectedFilter === 'crypto'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            Crypto
          </button>

          <button
            onClick={() => setSelectedFilter('hype')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
              selectedFilter === 'hype'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white border border-orange-200 hover:border-orange-300 text-orange-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>High Hype Flags</span>
          </button>

          <button
            onClick={() => setSelectedFilter('safe')}
            className={`px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 ${
              selectedFilter === 'safe'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-emerald-200 hover:border-emerald-300 text-emerald-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe Havens</span>
          </button>
        </div>

        {/* Asset Cards Grid */}
        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 space-y-2">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold text-gray-700 text-sm">No assets match your current filters.</p>
            <p className="text-xs text-gray-400">Try clearing the search query or switching categories.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.ticker} asset={asset} onSimulate={onSimulate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
