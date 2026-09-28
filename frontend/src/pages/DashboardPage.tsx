import React from 'react';
import {
  Activity,
  Router,
  AlertTriangle,
  Zap,
  TrendingDown,
  Server,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">NOC Overview Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Sistem Pemantauan TR-069 & Jaringan Fiber Optik (1.000 Target Pelanggan)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('mapping')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/25 flex items-center gap-2 transition-all"
          >
            <span>Buka GIS Mapping</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Modem Terdaftar</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-brand-400 flex items-center justify-center">
              <Router className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white mt-3 font-mono">1,000</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Semua unit Huawei & Zimlink</span>
        </div>

        <div className="bg-dark-800 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Modem Online</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-3 font-mono">942</div>
          <span className="text-[11px] text-slate-400 mt-1 block">94.2% Uptime Jaringan</span>
        </div>

        <div className="bg-dark-800 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Modem Offline</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-3 font-mono">58</div>
          <span className="text-[11px] text-rose-400 mt-1 block">42 Dying-Gasp (Mati Listrik), 16 LOS</span>
        </div>

        <div className="bg-dark-800 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Redaman Rendah (&lt; -25 dBm)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-3 font-mono">27</div>
          <span className="text-[11px] text-amber-400 mt-1 block">Perlu inspeksi teknisi / bending kabel</span>
        </div>
      </div>

      {/* Main Grid: OLT Status & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OLT Status Section */}
        <div className="lg:col-span-2 bg-dark-800 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Status OLT (Hioso & Hisfocus)</h2>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              2 OLT Aktif
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-dark-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">OLT-01 Hioso EPON (Air Naningan)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">EPON 4-Port</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">IP: 192.168.10.2 &bull; Total Terdaftar: 480 ONU</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-emerald-400">460 Online</span>
                <span className="text-xs font-mono text-rose-400">20 Offline</span>
              </div>
            </div>

            <div className="bg-dark-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">OLT-02 Hisfocus (HSGQ EPON)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">EPON 8-Port</span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">IP: 192.168.10.3 &bull; Total Terdaftar: 520 ONU</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-emerald-400">482 Online</span>
                <span className="text-xs font-mono text-rose-400">38 Offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Distribution & Summary */}
        <div className="bg-dark-800 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Distribusi Merek Modem</h2>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Huawei EchoLife & OptiXstar</span>
                <span className="font-mono text-brand-400">760 Unit (76%)</span>
              </div>
              <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full" style={{ width: '76%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                <span>Zimlink EPON / XPON Series</span>
                <span className="font-mono text-purple-400">240 Unit (24%)</span>
              </div>
              <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '24%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
