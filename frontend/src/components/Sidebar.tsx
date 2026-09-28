import React from 'react';
import {
  LayoutDashboard,
  Router,
  AlertTriangle,
  MapPin,
  Users,
  Settings,
  Shield,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'devices', label: 'ONT Devices', icon: Router },
    { id: 'mapping', label: 'GIS Mapping', icon: MapPin },
    { id: 'faults', label: 'Faults & Alerts', icon: AlertTriangle },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-dark-800 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-wider text-white">PROJECT ACS</span>
          <span className="block text-[10px] text-slate-400 font-mono tracking-widest">TR069 &bull; GIS FTTH</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Menu Utama
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-dark-900/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>GenieACS CWMP</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              :7547 OK
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>NBI API</span>
            <span className="text-emerald-400 font-mono">:7557 Active</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
