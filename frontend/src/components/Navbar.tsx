import React from 'react';
import {
  Compass,
  BookOpen,
  History,
  FileText,
  Cpu,
  Zap,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserFitnessProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'dashboard' | 'glossary' | 'history' | 'document' | 'auth';
  onSelectTab: (tab: 'dashboard' | 'glossary' | 'history' | 'document' | 'auth') => void;
  onOpenModelLab: () => void;
  profile: UserFitnessProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenModelLab,
  profile,
}) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const userDisplayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Investor';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand: FundBee */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onSelectTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-amber-200/50 text-xl font-black">
            <span>🐝</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-xl text-gray-900 tracking-tight leading-none">
                Fund<span className="text-amber-500">Bee</span>
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Beta
              </span>
            </div>
            <span className="text-[11px] text-gray-500 font-medium block">
              Smart Investing &bull; AI Financial Literacy
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
            onClick={() => onSelectTab('document')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === 'document'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Reader</span>
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

        {/* Right Actions: ML Model Lab, Fitness, Supabase Auth */}
        <div className="flex items-center gap-2">
          {/* ML Model Lab for Judges */}
          <button
            onClick={onOpenModelLab}
            className="hidden sm:flex px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors items-center gap-1.5 shadow-xs"
            title="Inspect trained PyTorch/ONNX neural networks and metrics"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span>ML Model Lab</span>
          </button>

          {/* Fitness Pill */}
          <div
            onClick={() => onSelectTab('history')}
            className="cursor-pointer flex items-center gap-2 pl-3 pr-2 py-1 rounded-2xl bg-emerald-50 border border-emerald-200 hover:border-emerald-300 transition-colors shadow-xs"
            title="Your Financial Fitness Score"
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

          {/* Supabase Auth State */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200">
              <div
                onClick={() => onSelectTab('auth')}
                className="cursor-pointer hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                title={`Signed in as ${user.email}`}
              >
                <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {userDisplayName.charAt(0)}
                </div>
                <span className="max-w-[100px] truncate">{userDisplayName}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-xl border border-gray-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-gray-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs ${
                currentTab === 'auth'
                  ? 'bg-amber-500 text-white shadow-amber-200'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-200/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex border-t border-gray-100 px-3 py-2 bg-gray-50/70 justify-around text-xs font-bold text-gray-600">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'dashboard' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectTab('glossary')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'glossary' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Glossary
        </button>
        <button
          onClick={() => onSelectTab('document')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'document' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Doc Reader
        </button>
        <button
          onClick={() => onSelectTab('history')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'history' ? 'bg-white text-emerald-700 shadow-xs' : ''}`}
        >
          Simulations
        </button>
        <button
          onClick={() => onSelectTab('auth')}
          className={`px-2.5 py-1 rounded-lg ${currentTab === 'auth' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700'}`}
        >
          {user ? 'Account' : 'Login'}
        </button>
      </div>
    </header>
  );
};

export default Navbar;
