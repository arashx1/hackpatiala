import React, { useState, useEffect } from 'react';
import { Asset, RiskTolerance, UserFitnessProfile } from './types';
import { fetchAllAssets } from './lib/api';
import { loadFitnessProfile, saveFitnessProfile } from './lib/fitnessScore';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { GlossaryPage } from './pages/GlossaryPage';
import { SimulationHistoryPage } from './pages/SimulationHistoryPage';
import { DocumentReaderPage } from './pages/DocumentReaderPage';
import { AuthPage } from './pages/AuthPage';
import { DecisionCoachModal } from './components/DecisionCoachModal';
import { AuthProvider, useAuth } from './context/AuthContext';

export const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [unauthPage, setUnauthPage]       = useState<'home' | 'auth'>('home');
  const [authMode, setAuthMode]           = useState<'signin' | 'signup'>('signup');
  const [assets, setAssets]               = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [currentTab, setCurrentTab]       = useState<
    'home' | 'dashboard' | 'glossary' | 'history' | 'document' | 'auth'
  >('dashboard');
  const [profile, setProfile]             = useState<UserFitnessProfile>(loadFitnessProfile());
  const [selectedSimAsset, setSelectedSimAsset] = useState<Asset | null>(null);

  // Hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'home')           setCurrentTab('home');
      else if (hash === 'glossary')  setCurrentTab('glossary');
      else if (hash === 'history')   setCurrentTab('history');
      else if (hash === 'document')  setCurrentTab('document');
      else if (hash === 'auth')      setCurrentTab('auth');
      else                           setCurrentTab('dashboard');
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: 'home' | 'dashboard' | 'glossary' | 'history' | 'document' | 'auth') => {
    setCurrentTab(tab);
    window.location.hash = tab === 'dashboard' ? '' : `#${tab}`;
  };

  useEffect(() => {
    fetchAllAssets()
      .then((data) => setAssets(data))
      .finally(() => setLoadingAssets(false));
  }, []);

  const handleToleranceChange = (newTol: RiskTolerance) => {
    const updated: UserFitnessProfile = { ...profile, riskTolerance: newTol };
    setProfile(updated);
    saveFitnessProfile(updated);
  };

  const handleTradeCompleted = () => {
    setProfile(loadFitnessProfile());
  };

  // Auth loading splash
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafb' }}>
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#E7E7E9', borderTopColor: '#FD956D' }}
        />
      </div>
    );
  }

  // ── Unauthenticated Visitor Experience ──
  // Starts with Home Page; users can navigate to Sign Up or use instant demo
  if (!user) {
    if (unauthPage === 'home') {
      return (
        <HomePage
          onGetStarted={() => {
            setAuthMode('signup');
            setUnauthPage('auth');
          }}
          onSignIn={() => {
            setAuthMode('signin');
            setUnauthPage('auth');
          }}
          onExploreDemo={() => {
            setCurrentTab('dashboard');
          }}
        />
      );
    }

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center py-12 px-4"
        style={{ background: '#f8fafb' }}
      >
        <AuthPage
          initialMode={authMode}
          onBackToHome={() => setUnauthPage('home')}
          onSuccessRedirect={() => {
            setCurrentTab('dashboard');
          }}
        />
      </div>
    );
  }

  // ── Authenticated User Platform ──
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#ffffff', color: '#181D1F' }}
    >
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab as any}
        profile={profile}
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6">
        {loadingAssets ? (
          <div className="py-32 flex flex-col items-center justify-center gap-5">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#E7E7E9', borderTopColor: '#FD956D' }}
            />
            <p
              className="text-[15px] font-semibold"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#7d7d87' }}
            >
              Bootstrapping FundBee AI models…
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'home' && (
              <HomePage
                onGetStarted={() => handleSelectTab('dashboard')}
                onSignIn={() => handleSelectTab('dashboard')}
                onExploreDemo={() => handleSelectTab('dashboard')}
              />
            )}
            {currentTab === 'dashboard' && (
              <Dashboard
                assets={assets}
                profile={profile}
                onSimulate={(asset) => setSelectedSimAsset(asset)}
                onToleranceChange={handleToleranceChange}
              />
            )}
            {currentTab === 'glossary'  && <GlossaryPage />}
            {currentTab === 'document'  && <DocumentReaderPage />}
            {currentTab === 'auth'      && (
              <AuthPage onSuccessRedirect={() => handleSelectTab('dashboard')} />
            )}
            {currentTab === 'history'   && (
              <SimulationHistoryPage
                profile={profile}
                onSimulateClick={() => {
                  setCurrentTab('dashboard');
                  if (assets.length > 0) setSelectedSimAsset(assets[0]);
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {selectedSimAsset && (
        <DecisionCoachModal
          asset={selectedSimAsset}
          onClose={() => setSelectedSimAsset(null)}
          onTradeCompleted={handleTradeCompleted}
          userRiskTolerance={profile.riskTolerance}
        />
      )}

      {/* Footer */}
      <footer
        className="mt-auto border-t"
        style={{ borderColor: '#E7E7E9', background: '#ffffff' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐝</span>
            <span
              className="text-[15px] font-semibold"
              style={{ fontFamily: 'Gabarito, sans-serif', color: '#181D1F' }}
            >
              FundBee
            </span>
            <span
              className="text-[13px]"
              style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
            >
              · Mind Over Money · © {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-5">
            {[
              { label: 'Overview',    action: () => handleSelectTab('home') },
              { label: 'Markets',     action: () => handleSelectTab('dashboard') },
              { label: 'Doc Reader',  action: () => handleSelectTab('document') },
              { label: 'Glossary',    action: () => handleSelectTab('glossary') },
              { label: 'Account',     action: () => handleSelectTab('auth') },
            ].map((link) => (
              <button
                key={link.label}
                onClick={link.action}
                className="text-[13px] transition-colors cursor-pointer"
                style={{ fontFamily: 'Archivo, sans-serif', color: '#7d7d87' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#181D1F'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#7d7d87'}
              >
                {link.label}
              </button>
            ))}

            <span
              className="text-[11px] font-semibold px-3 py-1 rounded-full"
              style={{
                fontFamily: 'Archivo, sans-serif',
                background: '#D5E2DA',
                color: '#424647',
              }}
            >
              Zero Real Money Ever At Risk
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;