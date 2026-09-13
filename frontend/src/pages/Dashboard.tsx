import React, { useState, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Asset, RiskTolerance, UserFitnessProfile } from '../types';
import { AssetCard } from '../components/AssetCard';
import { LiveHypeChecker } from '../components/LiveHypeChecker';

interface DashboardProps {
  assets: Asset[];
  profile: UserFitnessProfile;
  onSimulate: (asset: Asset) => void;
  onToleranceChange: (tolerance: RiskTolerance) => void;
  onOpenModelLab?: () => void;
}

const FILTER_TABS = [
  { id: 'all',    label: 'All Assets' },
  { id: 'stock',  label: 'Stocks' },
  { id: 'etf',    label: 'ETFs' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'hype',   label: '🔥 High Hype' },
  { id: 'safe',   label: '🛡 Safe Havens' },
] as const;

export const Dashboard: React.FC<DashboardProps> = ({
  assets,
  onSimulate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'stock' | 'etf' | 'crypto' | 'hype' | 'safe'>('all');

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedFilter === 'all')    return true;
      if (selectedFilter === 'stock')  return asset.type === 'stock';
      if (selectedFilter === 'etf')    return asset.type === 'etf';
      if (selectedFilter === 'crypto') return asset.type === 'crypto';
      if (selectedFilter === 'hype')   return asset.hypeScore >= 50;
      if (selectedFilter === 'safe')   return asset.riskScore < 35 && asset.hypeScore < 45;
      return true;
    });
  }, [assets, searchQuery, selectedFilter]);

  return (
    <div className="pb-20 space-y-12">

      {/* ────────────────────────────────────────────────────────────
          HERO — Minimal, bold, clean
      ───────────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-4 animate-fade-up">
        <div className="max-w-[820px]">
          {/* Tag */}
          <p className="section-label mb-3 text-emerald-800">
            GDG Hackathon · Mind Over Money
          </p>

          {/* Big headline */}
          <h1
            className="text-[48px] sm:text-[64px] leading-[1.05] tracking-[-0.5px] mb-5"
            style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
          >
            Invest with <span className="coral-gradient-text">clarity.</span>
            <br />
            Not with hype.
          </h1>

          <p
            className="text-[17px] leading-[26px] max-w-[620px]"
            style={{ fontFamily: 'Archivo, sans-serif', color: '#424647' }}
          >
            FundBee uses smart AI models to classify social-media hype vs fundamentals and rate asset danger levels — walking you through an objective decision coach before any trade.
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          HYPE CHECKER IN THE PROGRAM — Real-time Headline Classifier
      ───────────────────────────────────────────────────────────── */}
      <section className="animate-fade-up animate-fade-up-delay-1">
        <LiveHypeChecker />
      </section>

      {/* ────────────────────────────────────────────────────────────
          ASSET RADAR & MARKET CARDS
      ───────────────────────────────────────────────────────────── */}
      <section className="animate-fade-up animate-fade-up-delay-2 space-y-5">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="section-label mb-1">Asset Radar</p>
            <h2
              className="text-[26px] font-semibold tracking-[-0.5px]"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''} tracked
            </h2>
            <p
              className="text-[13px] mt-0.5"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              Hover underlined financial metrics for plain-English ELI5 explanations.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: '#7d7d87' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or name…"
              className="w-full pl-10 pr-4 py-2.5 rounded-full text-[14px] focus:outline-none border"
              style={{
                fontFamily: 'Archivo, sans-serif',
                background: '#ffffff',
                borderColor: '#E7E7E9',
                color: '#181D1F',
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TABS.map((tab) => {
            const active = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as typeof selectedFilter)}
                className="shrink-0 px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer"
                style={{
                  fontFamily: 'Archivo, sans-serif',
                  background: active ? '#181D1F' : '#F8F4EF',
                  color: active ? '#ffffff' : '#424647',
                  border: active ? 'none' : '1px solid #E7E7E9',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div
            className="p-16 text-center rounded-[24px] border space-y-3"
            style={{ borderColor: '#E7E7E9', background: '#F8F4EF' }}
          >
            <AlertCircle className="w-8 h-8 mx-auto" style={{ color: '#c8c8ce' }} />
            <p
              className="font-semibold text-[15px]"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              No assets match these filters
            </p>
            <p
              className="text-[13px]"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              Try clearing the search query or switching categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.ticker} asset={asset} onSimulate={onSimulate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;