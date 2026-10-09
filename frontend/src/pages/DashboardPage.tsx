import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAppContext, sanitizeIp, evaluateOpticalPower } from '../context/AppContext';
import { loadAllOntDevices } from '../utils/devices';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { olts } = useAppContext();
  const [deviceVersion, setDeviceVersion] = useState(0);

  const displayOlts = olts;
  const totalPonPorts = useMemo(
    () => displayOlts.reduce((sum, o) => sum + (o.ponPortsCount || 4), 0),
    [displayOlts],
  );

  useEffect(() => {
    const handleStorageChange = () => setDeviceVersion((v) => v + 1);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // Perangkat modem ONT riil (menggunakan shared helper)
  const realDevices = useMemo(() => {
    return loadAllOntDevices();
  }, [deviceVersion]);

  const totalModemOnline = useMemo(() => {
    return realDevices.filter((d: any) => d.status === 'ONLINE').length;
  }, [realDevices]);

  const totalModemOffline = useMemo(() => {
    return realDevices.filter((d: any) => d.status === 'OFFLINE').length;
  }, [realDevices]);

  const totalModemCount = realDevices.length;

  const totalRedamanKritis = useMemo(() => {
    return realDevices.filter((d: any) => {
      if (d.status === 'OFFLINE') return false;
      const optic = evaluateOpticalPower(d.rxPowerAcs || d.rxPower);
      return optic.status === 'CRITICAL' || optic.status === 'LOS';
    }).length;
  }, [realDevices]);

  const uptimePercent = totalModemCount > 0 ? ((totalModemOnline / totalModemCount) * 100).toFixed(1) : '0.0';
  const offlinePercent = totalModemCount > 0 ? ((totalModemOffline / totalModemCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Ringkasan NOC &amp; SLA
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            Status Operasional FTTH Real-Time
          </p>
        </div>
      </div>

      {/* KPI Cards (Clean Monochromatic Enterprise Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Modem */}
        <div
          onClick={() => onNavigate('devices')}
          className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Modem
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white my-2 font-mono">
            {totalModemCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Unit ONT terdaftar
          </div>
        </div>

        {/* Card 2: Modem Online */}
        <div
          onClick={() => onNavigate('devices')}
          className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Modem Online
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white my-2 font-mono">
            {totalModemOnline.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0" />
            <span>{uptimePercent}% Terhubung</span>
          </div>
        </div>

        {/* Card 3: Modem Offline */}
        <div
          onClick={() => onNavigate('devices')}
          className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Modem Offline
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white my-2 font-mono">
            {totalModemOffline.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
            <span>{offlinePercent}% Terputus</span>
          </div>
        </div>

        {/* Card 4: Redaman Kritis */}
        <div
          onClick={() => onNavigate('faults')}
          className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col justify-between cursor-pointer transition-colors"
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Redaman Kritis
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white my-2 font-mono">
            {totalRedamanKritis.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>Sinyal &lt; -27 dBm</span>
          </div>
        </div>
      </div>


      {/* Section 2: Kualitas Optik (SLA) & Ringkasan OLT Terpadu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Widget 1: Distribusi Kualitas Sinyal Optik (Optical Power SLA) */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Kesehatan Sinyal Optik (SLA ITU-T)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('devices')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 inline-flex items-center gap-1"
            >
              <span>Lihat Modem</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visual Health Bar */}
          {(() => {
            const normalCount = realDevices.filter((d: any) => {
              if (d.status === 'OFFLINE') return false;
              const o = evaluateOpticalPower(d.rxPowerAcs || d.rxPower);
              return o.status === 'NORMAL';
            }).length;

            const warningCount = realDevices.filter((d: any) => {
              if (d.status === 'OFFLINE') return false;
              const o = evaluateOpticalPower(d.rxPowerAcs || d.rxPower);
              return o.status === 'WARNING';
            }).length;

            const criticalCount = totalRedamanKritis;
            const offlineCount = totalModemOffline;
            const total = totalModemCount || 1;

            const normalPct = ((normalCount / total) * 100).toFixed(1);
            const warningPct = ((warningCount / total) * 100).toFixed(1);
            const criticalPct = ((criticalCount / total) * 100).toFixed(1);
            const offlinePct = ((offlineCount / total) * 100).toFixed(1);

            return (
              <div className="space-y-4">
                {/* Multi-segment Progress Bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-dark-900 gap-0.5 p-0.5 border border-slate-200 dark:border-slate-800">
                  <div
                    style={{ width: `${normalPct}%` }}
                    className="bg-slate-900 dark:bg-slate-100 rounded-full transition-all"
                    title={`Ideal: ${normalCount} (${normalPct}%)`}
                  />
                  <div
                    style={{ width: `${warningPct}%` }}
                    className="bg-slate-600 dark:bg-slate-400 rounded-full transition-all"
                    title={`Waspada: ${warningCount} (${warningPct}%)`}
                  />
                  <div
                    style={{ width: `${criticalPct}%` }}
                    className="bg-slate-400 dark:bg-slate-600 rounded-full transition-all"
                    title={`Kritis: ${criticalCount} (${criticalPct}%)`}
                  />
                  <div
                    style={{ width: `${offlinePct}%` }}
                    className="bg-slate-300 dark:bg-slate-800 rounded-full transition-all"
                    title={`Offline: ${offlineCount} (${offlinePct}%)`}
                  />
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-sans font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-100 shrink-0" />
                      <span>Ideal (&ge; -24 dBm)</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {normalCount} <span className="text-[10px] font-normal text-slate-500">({normalPct}%)</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-sans font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 dark:bg-slate-400 shrink-0" />
                      <span>Waspada (-24 ~ -27)</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {warningCount} <span className="text-[10px] font-normal text-slate-500">({warningPct}%)</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-sans font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                      <span>Kritis (&lt; -27 dBm)</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {criticalCount} <span className="text-[10px] font-normal text-slate-500">({criticalPct}%)</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-sans font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-800 shrink-0" />
                      <span>Offline / LOS</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {offlineCount} <span className="text-[10px] font-normal text-slate-500">({offlinePct}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Widget 2: Ringkasan Infrastruktur OLT */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Infrastruktur OLT ({displayOlts.length} Unit &bull; {totalPonPorts} PON)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('olts')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 inline-flex items-center gap-1"
            >
              <span>Kelola Port OLT</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {displayOlts.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              Belum ada OLT terdaftar di sistem.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px] font-semibold">
                    <th className="pb-2">Perangkat OLT</th>
                    <th className="pb-2">Vendor / Tipe</th>
                    <th className="pb-2 text-center">Port PON</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {displayOlts.map((olt) => {
                    const cleanIp = sanitizeIp(olt.ip);
                    return (
                      <tr
                        key={olt.id}
                        onClick={() => onNavigate('olts')}
                        className="hover:bg-slate-50 dark:hover:bg-dark-900/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-2">
                          <div className="font-bold font-sans text-slate-900 dark:text-white">
                            {olt.name}
                          </div>
                          <div className="text-[11px] text-slate-500">{cleanIp || '-'}</div>
                        </td>
                        <td className="py-2.5 pr-2 font-sans text-slate-600 dark:text-slate-300">
                          {olt.vendor || 'OLT'}{olt.model ? ` ${olt.model}` : ''}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                            {olt.ponPortsCount || 2} Port ({olt.ponType || 'EPON'})
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Normal
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Rincian per-port dan mapping ONU tersedia di menu OLT</span>
            <button
              type="button"
              onClick={() => onNavigate('olts')}
              className="font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-2"
            >
              Buka Semua &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
