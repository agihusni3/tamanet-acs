import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { DevicesPage } from './pages/DevicesPage';
import { GisMapPage } from './pages/GisMapPage';
import { CustomersPage } from './pages/CustomersPage';
import { AlertsPage } from './pages/AlertsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AttenuationCalculatorPage } from './pages/AttenuationCalculatorPage';
import { ScheduledRebootPage } from './pages/ScheduledRebootPage';
import { OltsPage } from './pages/OltsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LayoutDashboard, Router, MapPin, AlertTriangle, Users, Menu, Calculator } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoginPage } from './pages/LoginPage';

const VALID_TABS = ['dashboard', 'olts', 'devices', 'schedule-reboot', 'mapping', 'calculator', 'faults', 'customers', 'settings'];

const getInitialTab = (): string => {
  // 1. Periksa URL Hash terlebih dahulu (misal #mapping, #devices, #dashboard)
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (VALID_TABS.includes(hash)) return hash;

  // 2. Periksa memori LocalStorage terakhir kali dibuka
  try {
    const saved = localStorage.getItem('acs_active_tab');
    if (saved && VALID_TABS.includes(saved)) return saved;
  } catch {}

  // 3. Default Page: Dashboard
  return 'dashboard';
};

export function AppContent() {
  const [activeTab, setActiveTabState] = useState<string>(getInitialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Fungsi setActiveTab yang menyimpan state ke localStorage dan hash URL
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('acs_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.history.replaceState(null, '', `#${tab}`);
      }
    } catch {}
  };

  useEffect(() => {
    // Pastikan hash URL selaras dengan initial tab
    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState(null, '', `#${activeTab}`);
    }

    // Tangani navigasi back / forward browser
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('acs_active_tab', hash);
        } catch {}
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  return (
    <div className="fixed inset-0 flex h-full w-full overflow-hidden bg-slate-100 dark:bg-dark-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 overscroll-none select-none">
      {/* Sidebar Navigation (Desktop permanent, Mobile overlay drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Top Navbar with Dynamic Branding, Dark/Light Mode, Notifications, Account */}
        <Navbar
          onQuickAction={() => setActiveTab('mapping')}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />

        {/* Dynamic Page Views with Mobile Safe Area Padding */}
        <main
          className={`flex-1 min-w-0 ${
            activeTab === 'mapping'
              ? 'overflow-hidden h-full pb-[62px] md:pb-0 overscroll-none'
              : 'overflow-y-auto flex flex-col justify-between pb-24 md:pb-0'
          }`}
        >
          <div className={activeTab === 'mapping' ? 'h-full w-full overflow-hidden' : 'flex-1'}>
            <ErrorBoundary>
              <div key={activeTab} className={`w-full ${activeTab === 'mapping' ? 'h-full overflow-hidden' : 'animate-pageFade'}`}>
                {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
                {activeTab === 'olts' && <OltsPage />}
                {activeTab === 'devices' && <DevicesPage />}
                {activeTab === 'schedule-reboot' && <ScheduledRebootPage />}
                {activeTab === 'mapping' && <GisMapPage />}
                {activeTab === 'calculator' && <AttenuationCalculatorPage />}
                {activeTab === 'faults' && <AlertsPage />}
                {activeTab === 'customers' && <CustomersPage />}
                {activeTab === 'settings' && <SettingsPage />}
              </div>
            </ErrorBoundary>
          </div>

          {/* Redesigned Executive Bottom Footer for Content Pages */}
          {activeTab !== 'mapping' && (
            <footer className="mt-8 border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-dark-900/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4 select-none">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-tight">ACS Platform</span>
                  <span>•</span>
                  <span>Enterprise FTTH & CWMP Management</span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>
                    Created by <strong className="font-semibold text-slate-900 dark:text-white">Agi Husni</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Supported by <strong className="font-semibold text-slate-800 dark:text-slate-200">Tama.Net</strong>
                  </span>
                </div>
              </div>
            </footer>
          )}
        </main>

        {/* Touch-Friendly Bottom Navigation Bar (Hanya tampil di Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[62px] bg-dark-800/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-2 z-[2500] select-none shadow-2xl pb-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'dashboard' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-slate-800 text-white' : ''}`}>
              <LayoutDashboard className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium tracking-tight">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'devices' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'devices' ? 'bg-slate-800 text-white' : ''}`}>
              <Router className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium tracking-tight">ONT</span>
          </button>

          <button
            onClick={() => setActiveTab('mapping')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'mapping' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'mapping' ? 'bg-slate-800 text-white shadow-sm' : ''}`}>
              <MapPin className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium tracking-tight">Peta GIS</span>
          </button>

          <button
            onClick={() => setActiveTab('faults')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              activeTab === 'faults' ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'faults' ? 'bg-slate-800 text-white' : ''}`}>
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium tracking-tight">Alert</span>
          </button>

          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-200 transition-all"
          >
            <div className="p-1 rounded-xl">
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] mt-0.5 font-medium tracking-tight">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

function MainRouter() {
  const { isAuthenticated } = useAppContext();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AppContent />;
}

export function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}

export default App;
