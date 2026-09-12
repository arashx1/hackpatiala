import React from 'react';
import { Compass, BookOpen, History, Cpu, Zap } from 'lucide-react';
import { UserFitnessProfile } from '../types';

interface NavbarProps {
  currentTab: 'dashboard' | 'glossary' | 'history';
  onSelectTab: (tab: 'dashboard' | 'glossary' | 'history') => void;
  onOpenModelLab: () => void;
  profile: UserFitnessProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenModelLab,
  profile,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-lg text-gray-900 tracking-tight leading-none">
                MoneyMind
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Beta
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium block">
              Mind Over Money &bull; AI Investing Literacy
            </span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 p-1 rounded-2xl">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'dashboard'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('glossary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'glossary'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Jargon-Buster</span>
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'history'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Simulation Log</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* ML Model Lab for Judges */}
          <button
            onClick={onOpenModelLab}
            className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            title="Inspect trained PyTorch/ONNX neural networks and metrics"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">ML Model Lab</span>
          </button>

          {/* Fitness Pill */}
          <div
            onClick={() => onSelectTab('history')}
            className="cursor-pointer flex items-center gap-2 pl-3 pr-2 py-1 rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-colors shadow-xs"
          >
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 block leading-none">
                Fitness
              </span>
              <span className="text-xs font-black font-mono text-emerald-700 leading-none">
                {profile.score}/100
              </span>
            </div>
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              <Zap className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex border-t border-gray-100 px-4 py-2 bg-gray-50/70 justify-around text-xs font-bold text-gray-600">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-3 py-1 rounded-lg ${currentTab === 'dashboard' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectTab('glossary')}
          className={`px-3 py-1 rounded-lg ${currentTab === 'glossary' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Jargon-Buster
        </button>
        <button
          onClick={() => onSelectTab('history')}
          className={`px-3 py-1 rounded-lg ${currentTab === 'history' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Simulations
        </button>
      </div>
    </header>
  );
};
