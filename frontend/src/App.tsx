import React, { useState, useEffect } from 'react';
import { Asset, RiskTolerance, UserFitnessProfile } from './types';
import { fetchAllAssets } from './lib/api';
import { loadFitnessProfile, saveFitnessProfile } from './lib/fitnessScore';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { GlossaryPage } from './pages/GlossaryPage';
import { SimulationHistoryPage } from './pages/SimulationHistoryPage';
import { DecisionCoachModal } from './components/DecisionCoachModal';
import { ModelLabModal } from './components/ModelLabModal';

export const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'glossary' | 'history'>('dashboard');
  const [profile, setProfile] = useState<UserFitnessProfile>(loadFitnessProfile());
  const [selectedSimAsset, setSelectedSimAsset] = useState<Asset | null>(null);
  const [isModelLabOpen, setIsModelLabOpen] = useState(false);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'glossary') setCurrentTab('glossary');
      else if (hash === 'history') setCurrentTab('history');
      else setCurrentTab('dashboard');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: 'dashboard' | 'glossary' | 'history') => {
    setCurrentTab(tab);
    window.location.hash = tab === 'dashboard' ? '' : `#${tab}`;
  };

  // Load assets
  useEffect(() => {
    fetchAllAssets()
      .then((data) => setAssets(data))
      .finally(() => setLoadingAssets(false));
  }, []);

  const handleToleranceChange = (newTol: RiskTolerance) => {
    const updated: UserFitnessProfile = {
      ...profile,
      riskTolerance: newTol,
    };
    setProfile(updated);
    saveFitnessProfile(updated);
  };

  const handleTradeCompleted = () => {
    setProfile(loadFitnessProfile());
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] text-gray-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenModelLab={() => setIsModelLabOpen(true)}
        profile={profile}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full">
        {loadingAssets ? (
          <div className="py-24 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-semibold text-gray-600">Bootstrapping MoneyMind neural networks and assets...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard
                assets={assets}
                profile={profile}
                onSimulate={(asset) => setSelectedSimAsset(asset)}
                onToleranceChange={handleToleranceChange}
                onOpenModelLab={() => setIsModelLabOpen(true)}
              />
            )}

            {currentTab === 'glossary' && <GlossaryPage />}

            {currentTab === 'history' && (
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

      {/* Socratic Decision Coach Simulator Modal */}
      {selectedSimAsset && (
        <DecisionCoachModal
          asset={selectedSimAsset}
          onClose={() => setSelectedSimAsset(null)}
          onTradeCompleted={handleTradeCompleted}
          userRiskTolerance={profile.riskTolerance}
        />
      )}

      {/* ML Model Lab Modal (Judges Inspection) */}
      <ModelLabModal isOpen={isModelLabOpen} onClose={() => setIsModelLabOpen(false)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} <strong>MoneyMind</strong> &bull; Google Developer Groups &ldquo;Bit N Build&rdquo; Hackathon Submission.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setIsModelLabOpen(true)} className="hover:text-gray-700 underline underline-offset-2">
              Inspect ML Models (ONNX)
            </button>
            <span>&bull;</span>
            <a href="#glossary" onClick={() => handleSelectTab('glossary')} className="hover:text-gray-700">
              Glossary
            </a>
            <span>&bull;</span>
            <span className="text-emerald-600 font-bold">Zero Real Money Ever At Risk</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
