import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Server,
  Router,
  AlertTriangle,
  MapPin,
  Users,
  Settings,
  Shield,
  Activity,
  X,
  Calculator,
  CalendarClock,
} from 'lucide-react';
import { useAppContext, ROLE_DEFINITIONS, UserRole } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  hasAlertBadge?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { branding, user } = useAppContext();
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);

  const currentRole = (user.role as UserRole) || 'SUPERADMIN';
  const roleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.SUPERADMIN;

  // Monitor active alerts count via storage events
  React.useEffect(() => {
    const updateAlerts = () => {
      try {
        const saved = localStorage.getItem('acs_alerts');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const active = parsed.filter((a: any) => a.status === 'ACTIVE').length;
            setActiveAlertsCount(active);
            return;
          }
        }
      } catch {}
      setActiveAlertsCount(0);
    };

    updateAlerts();
    window.addEventListener('storage', updateAlerts);
    return () => {
      window.removeEventListener('storage', updateAlerts);
    };
  }, []);

  const menuSections: MenuSection[] = [
    {
      title: 'MONITORING NOC',
      items: [
        { id: 'dashboard', label: 'Ringkasan NOC', icon: LayoutDashboard },
        { id: 'faults', label: 'Alarm & Gangguan', icon: AlertTriangle, hasAlertBadge: true },
      ],
    },
    {
      title: 'INFRASTRUKTUR FTTH',
      items: [
        { id: 'olts', label: 'Perangkat OLT', icon: Server },
        { id: 'devices', label: 'Modem ONT (CPE)', icon: Router },
        { id: 'mapping', label: 'Topologi GIS FTTH', icon: MapPin },
      ],
    },
    {
      title: 'OPERASIONAL NOC',
      items: [
        { id: 'schedule-reboot', label: 'Jadwal Pemeliharaan', icon: CalendarClock },
        { id: 'calculator', label: 'Diagnostik Redaman', icon: Calculator },
        { id: 'customers', label: 'Data Pelanggan', icon: Users },
      ],
    },
    {
      title: 'SISTEM & MANAJEMEN',
      items: [
        { id: 'settings', label: 'Konfigurasi Sistem', icon: Settings },
      ],
    },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => roleDef.allowedTabs.includes(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-800 border-r border-slate-200 dark:border-slate-800 select-none transition-colors">
      {/* Brand Header */}
      <div className="h-16 px-5 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo branding={branding} size="md" />
          <div className="min-w-0">
            <span className="font-extrabold text-base sm:text-lg tracking-wider text-slate-900 dark:text-white truncate block">
              {branding.appName}
            </span>
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-widest truncate">
              {branding.tagline}
            </span>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Menu Grouped into Standard NOC Tiers (Filtered by Role Permissions) */}
      <nav className="p-3.5 space-y-4 flex-1 overflow-y-auto">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 py-1 select-none flex items-center justify-between">
              <span>{section.title}</span>
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-xs'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-all duration-150 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                        }`}
                      />

                      <span className="truncate">
                        {item.label}
                      </span>
                    </div>

                    {/* Live Alert Badge for Faults / Alarm item */}
                    {item.hasAlertBadge && activeAlertsCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 shadow-xs shrink-0">
                        {activeAlertsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Active User Role Telemetry Strip */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-dark-900/70">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`w-2 h-2 rounded-full ${roleDef.dotClass} shrink-0`} />
            <div className="min-w-0 flex-1">
              <span className="block font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                {roleDef.title}
              </span>
              <span className="block text-[10px] text-slate-400 font-mono truncate">
                Level {roleDef.level} &bull; {roleDef.role}
              </span>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${roleDef.bgClass} ${roleDef.colorClass} border ${roleDef.borderClass} shrink-0`}>
            L{roleDef.level}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-[3000] md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
          />
          {/* Drawer Slide Content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-drawerSlide">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
