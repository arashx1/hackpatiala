import React, { useState } from 'react';
import { Flame, LogIn, LogOut, Menu, X } from 'lucide-react';
import { UserFitnessProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentTab: 'home' | 'dashboard' | 'glossary' | 'history' | 'document' | 'auth';
  onSelectTab: (tab: 'home' | 'dashboard' | 'glossary' | 'history' | 'document' | 'auth') => void;
  profile: UserFitnessProfile;
}

const NAV_LINKS: { id: 'dashboard' | 'hype' | 'glossary' | 'document' | 'history'; label: string }[] = [
  { id: 'dashboard', label: 'Markets' },
  { id: 'hype',      label: '🔥 Hype Checker' },
  { id: 'glossary',  label: 'Jargon-Buster' },
  { id: 'document',  label: 'Doc Reader' },
  { id: 'history',   label: 'Sim History' },
];

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userDisplayName =
    user?.fullName ||
    user?.email?.split('@')[0] ||
    'Investor';

  const handleNavClick = (id: string) => {
    if (id === 'hype') {
      if (currentTab !== 'dashboard') {
        onSelectTab('dashboard');
      }
      setTimeout(() => {
        const el = document.getElementById('hype-checker');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }
    onSelectTab(id as any);
  };

  return (
    <header className="sticky top-0 z-50 nav-glass">
      <div className="max-w-[1200px] mx-auto px-6 h-[74px] flex items-center justify-between gap-6">

        {/* ── Logo ── */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-2.5 select-none shrink-0 cursor-pointer"
        >
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center text-white text-lg font-black shadow-sm"
            style={{ background: '#FD956D' }}
          >
            🐝
          </div>
          <div className="flex flex-col leading-none text-left">
            <span
              className="text-[20px] font-semibold tracking-[-0.5px]"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              Fund<span style={{ color: '#FD956D' }}>Bee</span>
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.1em]"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              Mind Over Money
            </span>
          </div>
        </button>

        {/* ── Center Nav (desktop) ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`px-4 py-2 rounded-full text-[14px] transition-colors font-archivo cursor-pointer ${
                currentTab === link.id
                  ? 'bg-[#181D1F] text-white font-semibold'
                  : 'text-[#424647] hover:bg-[rgba(24,29,31,0.07)] hover:text-[#181D1F]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* Quick Hype Checker action */}
          <button
            onClick={() => handleNavClick('hype')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer border"
            style={{
              background: '#FFF5F0',
              borderColor: '#FD956D55',
              color: '#C2410C',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>Hype Detector</span>
          </button>

          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTab('auth')}
                className="hidden sm:flex px-3 py-1.5 rounded-full text-[13px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                style={{ fontFamily: 'Archivo, sans-serif' }}
              >
                {userDisplayName}
              </button>
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSelectTab('auth')}
              className="r-btn-dark !py-2 !px-4 text-[13px] cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t px-6 py-4 bg-white space-y-2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                handleNavClick(link.id);
                setMobileOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 flex items-center justify-between"
            >
              <span>{link.label}</span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Navbar;