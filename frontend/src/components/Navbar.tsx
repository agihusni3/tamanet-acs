import React, { useState, useEffect } from 'react';
import { Bell, Sun, Moon, Menu } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { BrandingEditModal } from './BrandingEditModal';
import { NotificationPopover } from './NotificationPopover';
import { AccountDropdown } from './AccountDropdown';
import { ProfileEditModal } from './ProfileEditModal';

interface NavbarProps {
  onQuickAction?: (action: string) => void;
  onToggleMobileSidebar?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleMobileSidebar,
  onNavigateTab,
}) => {
  const { branding, theme, toggleTheme, user, unreadNotificationsCount, toast } = useAppContext();

  // Modals & Popovers state
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // NOC Real-time Telemetry (Updated on storage event, no 1-second polling)
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  useEffect(() => {
    const updateAlertCount = () => {
      try {
        const saved = localStorage.getItem('acs_alerts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setActiveAlertsCount(parsed.filter((a: any) => a.status === 'ACTIVE').length);
            return;
          }
        }
      } catch {}
      setActiveAlertsCount(0);
    };

    updateAlertCount();
    window.addEventListener('storage', updateAlertCount);
    return () => {
      window.removeEventListener('storage', updateAlertCount);
    };
  }, []);

  return (
    <>
      <header className="h-14 sm:h-16 bg-white/95 dark:bg-dark-800/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between z-[1500] shrink-0 select-none relative transition-colors duration-150">
        {/* Left Area: Mobile Brand Header & Desktop Section Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={onToggleMobileSidebar}
            aria-label="Buka Menu Navigasi"
            className="md:hidden w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Mobile Only Brand (On Desktop, Brand is already present in Sidebar) */}
          <div className="flex md:hidden items-center gap-2 py-1 select-none">
            <BrandLogo branding={branding} size="sm" />
            <span className="font-bold text-xs tracking-wider text-slate-900 dark:text-white truncate">
              {branding.appName}
            </span>
          </div>

          {/* Desktop Subtle Console Indicator */}
          <div className="hidden md:flex items-center text-xs font-mono text-slate-500">
            <span>NOC Management Console</span>
          </div>
        </div>

        {/* Center Area: NOC Operational Status Badge */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('faults')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium border transition-colors bg-slate-100 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeAlertsCount === 0 ? 'bg-slate-400' : 'bg-slate-900 dark:bg-white'
              }`}
            />
            <span>
              {activeAlertsCount === 0 ? 'Sistem Normal' : `${activeAlertsCount} Alarm Aktif`}
            </span>
          </button>
        </div>


        {/* Right User Controls: Dark/Light Mode, Notifications, Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* 1. Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={`Ubah ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
            title={`Mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-slate-300 hover:text-white" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 hover:text-slate-900" />
            )}
          </button>

          {/* 2. Interactive Notification Bell Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsAccountDropdownOpen(false);
              }}
              aria-label="Notifikasi sistem"
              title="Notifikasi Sistem"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center relative transition-all active:scale-95 shadow-sm ${
                isNotificationOpen
                  ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white'
                  : 'bg-slate-100 dark:bg-dark-900 border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white absolute top-1.5 right-1.5 sm:top-2 sm:right-2 ring-2 ring-white dark:ring-dark-900" />
              )}
            </button>

            {/* Notification Popover Dropdown */}
            <NotificationPopover
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
              onNavigateTab={onNavigateTab}
            />
          </div>

          {/* 3. Interactive User Account Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsAccountDropdownOpen(!isAccountDropdownOpen);
                setIsNotificationOpen(false);
              }}
              title="Menu Akun Administrator"
              className={`flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-300 dark:border-slate-800 py-1 rounded-xl transition-all active:scale-95 ${
                isAccountDropdownOpen ? 'opacity-90' : 'hover:opacity-85'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {user.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider">
                  {user.role}
                </div>
              </div>
            </button>

            {/* Account Dropdown Menu */}
            <AccountDropdown
              isOpen={isAccountDropdownOpen}
              onClose={() => setIsAccountDropdownOpen(false)}
              onOpenEditProfile={() => setIsProfileModalOpen(true)}
              onOpenBranding={() => setIsBrandingModalOpen(true)}
              onNavigateTab={onNavigateTab}
            />
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-[3000] bg-slate-900 text-slate-100 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 shadow-2xl animate-fadeIn backdrop-blur-md flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span>{toast}</span>
        </div>
      )}

      {/* Branding Customization Modal */}
      <BrandingEditModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
      />

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
