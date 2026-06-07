import { useState, useEffect, lazy, Suspense } from 'react';
import { PlayerProvider } from './context/PlayerContext';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import BouncingScrappy from './components/BouncingScrappy';
import CharacterBackground from './components/CharacterBackground';
import BottomHeader from './components/BottomHeader';
import FixedBackdrop from './components/FixedBackdrop';
import PublicProfilePage from './pages/PublicProfilePage';
import { NewVersionAvailableBanner } from './components/NewVersionAvailableBanner';

// Lazy load heavy pages for better initial load performance
import DashboardPage from './pages/DashboardPage';
import CodexPage from './pages/CodexPage';
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const StashPage = lazy(() => import('./pages/StashPage'));
const ItemsRaiderCachePage = lazy(() => import('./pages/itemsraidercachepage'));
const BlueprintsPage = lazy(() => import('./pages/BlueprintsPage'));
const XpBreakdownPage = lazy(() => import('./pages/XpBreakdownPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const InteractiveMapPage = lazy(() => import('./pages/InteractiveMapPage'));
const LiveEventTimersPage = lazy(() => import('./pages/LiveEventTimersPage'));
const RaidHistoryPage = lazy(() => import('./pages/RaidHistoryPage'));
const SkillTreePage = lazy(() => import('./pages/SkillTreePage'));
const LoadoutPage = lazy(() => import('./pages/LoadoutPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const WorkshopPage = lazy(() => import('./pages/WorkshopPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));
const TrialsLeaderboardPage = lazy(
  () => import('./pages/TrialsLeaderboardPage'),
);
const StatTrendsPage = lazy(() => import('./pages/StatTrendsPage'));
const TradersPage = lazy(() => import('./pages/TradersPage'));
const EnhancedStatsPage = lazy(() => import('./pages/EnhancedStatsPage'));
const PerformanceMonitorPage = lazy(
  () => import('./pages/PerformanceMonitorPage'),
);

export default function App() {
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'dashboard';
    return (
      new URLSearchParams(window.location.search).get('tab') || 'dashboard'
    );
  };
  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('shiesty:navigate', handler);
    return () => window.removeEventListener('shiesty:navigate', handler);
  }, []);

  // Lightweight URL-based routing for shareable public profile pages.
  // Wrapped in try/catch so any rendering bug here can NEVER block the main
  // app's auth flow.
  try {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const publicMatch = path.match(/^\/u\/([A-Za-z0-9_-]{2,32})\/?$/);
      if (publicMatch) {
        return (
          <div className="min-h-screen bg-shiesty-black">
            <FixedBackdrop />
            <main className="pb-20 relative z-10">
              <PublicProfilePage slug={publicMatch[1]} />
            </main>
            <BottomHeader />
          </div>
        );
      }
    }
  } catch (e) {
    console.error('[App] public-profile route check failed:', e);
  }

  const renderPage = () => {
    switch (activeTab) {
      // --- CORE ---
      case 'dashboard':
        return <DashboardPage />;
      case 'stash':
        return <StashPage />;
      case 'items':
        return <ItemsRaiderCachePage />;
      case 'marketplace':
        return <MarketplacePage />;

      // --- INTELLIGENCE / CODEX ---
      case 'codex':
      case 'combat': // "CODEX" nav tab key
        return <CodexPage />;
      case 'blueprints':
        return <BlueprintsPage />;

      // --- INVENTORY ---
      case 'loadout':
        return <LoadoutPage />;

      // --- STATS / HISTORY ---
      case 'maps':
        return <RaidHistoryPage />;
      case 'xp':
        return <XpBreakdownPage />;
      case 'trends':
        return <StatTrendsPage />;
      case 'enhancedstats':
        return <EnhancedStatsPage />;
      case 'performance':
        return <PerformanceMonitorPage />;

      // --- WORLD / OPERATIONS ---
      case 'mapviewer':
        return <InteractiveMapPage />;
      case 'eventtimers':
        return <LiveEventTimersPage />;
      case 'trials':
        return <TrialsLeaderboardPage />;

      // "PROJECTS" nav tab
      case 'journal':
        return <ProjectsPage />;
      case 'workshop':
        return <WorkshopPage />;

      case 'skilltree':
        return <SkillTreePage />;

      case 'traders':
        return <TradersPage />;

      // --- ACCOUNT ---
      case 'profile':
        return <MyProfilePage />;
      case 'settings':
        return <SettingsPage />;

      // Catch-all for any unmapped keys
      default:
        return <DashboardPage />;
    }
  };

  return (
    <PlayerProvider>
      {/* 1. Changed bg-shiesty-black to bg-transparent to see the video */}
      <div className="relative min-h-screen bg-transparent selection:bg-[var(--color-arc-yellow)] selection:text-black">
        <NewVersionAvailableBanner />
        <FixedBackdrop />
        <CharacterBackground activeTab={activeTab} />
        {/* 3. MAIN DASHBOARD UI */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />

          <main className="flex-grow pb-20">
            <ErrorBoundary fallbackLabel="Dashboard failed to render">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                      <div
                        className="w-8 h-8 mx-auto mb-4 rounded-full animate-spin"
                        style={{
                          border: `2px solid ${'var(--color-arc-yellow)'}`,
                          borderTopColor: 'transparent',
                        }}
                      ></div>
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-arc-muted)' }}
                      >
                        Loading...
                      </p>
                    </div>
                  </div>
                }
              >
                <div key={activeTab} className="page-fade">
                  {renderPage()}
                </div>
              </Suspense>
            </ErrorBoundary>
          </main>

          <footer className="border-t border-[var(--color-arc-border)] py-4 px-6 text-center bg-black/60 backdrop-blur-md relative z-10 mb-16 md:mb-20">
            <p className="text-[9px] text-[var(--color-arc-muted)] uppercase tracking-[0.2em]">
              Stats data via{' '}
              <a
                href="https://arctracker.io"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-arc-yellow)] hover:underline"
              >
                arctracker.io
              </a>
              {' · '}
              Game data via{' '}
              <a
                href="https://github.com/Mahcks/arcraiders-data-api"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-arc-yellow)] hover:underline"
              >
                arcdata.mahcks.com
              </a>
              {' · '}
              Source:{' '}
              <a
                href="https://github.com/RaidTheory/arcraiders-data"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-arc-yellow)] hover:underline"
              >
                RaidTheory/arcraiders-data
              </a>
            </p>
          </footer>
        </div>
        <BouncingScrappy />
        <BottomHeader />
      </div>
    </PlayerProvider>
  );
}
