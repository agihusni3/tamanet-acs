import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Check,
  Trash2,
  Radio,
  Plus,
  RotateCcw,
} from 'lucide-react';

interface NetworkAlert {
  id: string;
  type: 'LOS' | 'DYING_GASP' | 'OPTICAL_LOW' | 'OFFLINE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  deviceId?: string;
  serial?: string;
  message: string;
  time: string;
  status: 'ACTIVE' | 'RESOLVED';
}

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<NetworkAlert[]>(() => {
    try {
      const saved = localStorage.getItem('acs_alerts');
      if (saved) {
        const parsed = JSON.parse(saved);
          return parsed.filter((a: any) => {
            const id = a.id || '';
            return !(
              ['a1', 'a2', 'a3'].includes(id) ||
              id.startsWith('alert-test-') ||
              id.toLowerCase().includes('demo')
            );
          });
      }
      return [];
    } catch {
      return [];
    }
  });

  const [filterType, setFilterType] = useState<'ALL' | 'LOS' | 'DYING_GASP' | 'OPTICAL_LOW' | 'RESOLVED'>('ALL');
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);

  const persistAlerts = (list: NetworkAlert[]) => {
    try {
      localStorage.setItem('acs_alerts', JSON.stringify(list));
    } catch {
      /* quota */
    }
  };

  // Auto-deteksi alarm dari data perangkat dan GIS nodes
  useEffect(() => {
    const detectAlerts = () => {
      let rawDevices: any[] = [];
      try {
        const d = localStorage.getItem('acs_devices_list');
        if (d) rawDevices = JSON.parse(d);
      } catch {
        /* empty */
      }

      let rawNodes: any[] = [];
      try {
        const g = localStorage.getItem('acs_gis_nodes');
        if (g) rawNodes = JSON.parse(g);
      } catch {
        /* empty */
      }

      const ontNodes = rawNodes.filter((n) => n.type === 'ONT');
      const allDevices = [...rawDevices, ...ontNodes];

      const newAlerts: NetworkAlert[] = [];
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      allDevices.forEach((dev) => {
        const serial = dev.serial || dev.serialNumber || dev.id;
        if (!serial) return;

        const isOffline = dev.status === 'OFFLINE' || dev.status === 'offline';
        const rx = parseFloat(dev.rxPower || dev.opticalRx || dev.rxPowerAcs || '0');

        if (isOffline) {
          const alertType: NetworkAlert['type'] = dev.offlineReason === 'DYING_GASP' ? 'DYING_GASP' : 'LOS';
          const alertId = `alert-${alertType.toLowerCase()}-${serial}`;

          newAlerts.push({
            id: alertId,
            type: alertType,
            severity: 'CRITICAL',
            deviceId: dev.id,
            serial,
            message:
              alertType === 'DYING_GASP'
                ? `ONT ${dev.name || serial} terputus (Dying Gasp).`
                : `ONT ${dev.name || serial} kehilangan sinyal optik (LOS).`,
            time: dev.lastInform || now,
            status: 'ACTIVE',
          });
        } else if (rx < -27 && rx > -50) {
          const alertId = `alert-optic-${serial}`;
          newAlerts.push({
            id: alertId,
            type: 'OPTICAL_LOW',
            severity: 'WARNING',
            deviceId: dev.id,
            serial,
            message: `ONT ${dev.name || serial} redaman sinyal lemah (${rx} dBm).`,
            time: now,
            status: 'ACTIVE',
          });
        }
      });

      setAlerts((prev) => {
        const alertMap = new Map<string, NetworkAlert>();
        prev.forEach((a) => alertMap.set(a.id, a));

        let hasChanges = false;
        newAlerts.forEach((a) => {
          if (!alertMap.has(a.id)) {
            alertMap.set(a.id, a);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const merged = Array.from(alertMap.values());
          persistAlerts(merged);
          return merged;
        }
        return prev;
      });
    };

    detectAlerts();
    window.addEventListener('storage', detectAlerts);
    return () => window.removeEventListener('storage', detectAlerts);
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, status: 'RESOLVED' as const } : a));
      persistAlerts(updated);
      return updated;
    });
  };

  const handleBulkAcknowledge = () => {
    if (selectedAlertIds.length === 0) return;
    setAlerts((prev) => {
      const updated = prev.map((a) =>
        selectedAlertIds.includes(a.id) ? { ...a, status: 'RESOLVED' as const } : a
      );
      persistAlerts(updated);
      return updated;
    });
    setSelectedAlertIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedAlertIds.length === 0) return;
    const count = selectedAlertIds.length;
    if (!window.confirm(`Hapus ${count} alarm yang dipilih?`)) return;
    setAlerts((prev) => {
      const updated = prev.filter((a) => !selectedAlertIds.includes(a.id));
      persistAlerts(updated);
      return updated;
    });
    setSelectedAlertIds([]);
  };

  const handleDeleteSingle = (id: string) => {
    setAlerts((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      persistAlerts(updated);
      return updated;
    });
    setSelectedAlertIds((prev) => prev.filter((itemId) => itemId !== id));
  };

  const handleSimulateAlert = () => {
    const types: NetworkAlert['type'][] = ['LOS', 'DYING_GASP', 'OPTICAL_LOW'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const mockSerial = `ONT-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newAlert: NetworkAlert = {
      id: `alert-test-${Date.now()}`,
      type: chosenType,
      severity: chosenType === 'OPTICAL_LOW' ? 'WARNING' : 'CRITICAL',
      serial: mockSerial,
      message:
        chosenType === 'LOS'
          ? `ONT ${mockSerial} kabel drop optik putus`
          : chosenType === 'DYING_GASP'
          ? `ONT ${mockSerial} pemadaman listrik di rumah pelanggan`
          : `ONT ${mockSerial} redaman kritis (-28.9 dBm)`,
      time: now,
      status: 'ACTIVE',
    };

    setAlerts((prev) => {
      const updated = [newAlert, ...prev];
      persistAlerts(updated);
      return updated;
    });
  };

  const losCount = alerts.filter((a) => a.type === 'LOS' && a.status === 'ACTIVE').length;
  const dyingGaspCount = alerts.filter((a) => a.type === 'DYING_GASP' && a.status === 'ACTIVE').length;
  const opticalLowCount = alerts.filter((a) => a.type === 'OPTICAL_LOW' && a.status === 'ACTIVE').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;
  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'RESOLVED') return a.status === 'RESOLVED';
      return a.type === filterType && a.status === 'ACTIVE';
    });
  }, [alerts, filterType]);

  const isAllSelected = filteredAlerts.length > 0 && filteredAlerts.every((a) => selectedAlertIds.includes(a.id));
  const isSomeSelected = filteredAlerts.some((a) => selectedAlertIds.includes(a.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredAlerts.map((a) => a.id));
      setSelectedAlertIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredAlerts.map((a) => a.id);
      setSelectedAlertIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectAlert = (id: string) => {
    setSelectedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gangguan &amp; Alarm Jaringan
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeCount === 0 ? 'bg-slate-400' : 'bg-slate-900 dark:bg-white'
                }`}
              />
              {activeCount === 0 ? 'Normal' : `${activeCount} Aktif`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitoring insiden kabel optik dan daya perangkat secara real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-dark-800 hover:bg-slate-100 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <span>Tes Alarm</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Bulk Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>Semua</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === 'ALL' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {alerts.length}
              </span>
            </button>

            <button
              onClick={() => setFilterType('LOS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'LOS'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>Kabel Putus (LOS)</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === 'LOS' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {losCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType('DYING_GASP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'DYING_GASP'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>Mati Listrik</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === 'DYING_GASP' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {dyingGaspCount}
              </span>
            </button>

            <button
              onClick={() => setFilterType('OPTICAL_LOW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === 'OPTICAL_LOW'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>Redaman Kritis</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterType === 'OPTICAL_LOW' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {opticalLowCount}
              </span>
            </button>

            {resolvedCount > 0 && (
              <button
                onClick={() => setFilterType('RESOLVED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filterType === 'RESOLVED'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>Selesai</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  filterType === 'RESOLVED' ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {resolvedCount}
                </span>
              </button>
            )}
          </div>

          {filteredAlerts.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none bg-white dark:bg-dark-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected;
                }}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer"
              />
              <span>Pilih Semua</span>
            </label>
          )}
        </div>

        {/* Bulk Action Toolbar */}
        {selectedAlertIds.length > 0 && (
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{selectedAlertIds.length} alarm dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedAlertIds([])}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleBulkAcknowledge}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white/10 dark:bg-slate-900/10 hover:bg-white/20 dark:hover:bg-slate-900/20 rounded-lg transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Selesaikan</span>
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900 rounded-lg transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alert List Container */}
      <div className="space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white dark:bg-dark-800/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-2.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Semua Sistem Beroperasi Normal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Tidak ada gangguan jaringan atau pemadaman aktif saat ini.
            </p>
          </div>
        ) : (
          filteredAlerts.map((al) => {
            const isSelected = selectedAlertIds.includes(al.id);

            return (
              <div
                key={al.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-sm ${
                  isSelected
                    ? 'border-slate-900 bg-slate-100/80 dark:border-slate-200 dark:bg-slate-800/80'
                    : al.status === 'RESOLVED'
                    ? 'bg-slate-50 dark:bg-dark-900/40 border-slate-200 dark:border-slate-800/70 opacity-60'
                    : 'bg-white dark:bg-dark-800 border-l-4 border-l-slate-700 dark:border-l-slate-300 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    aria-label={`Pilih alarm ${al.serial || al.id}`}
                    checked={isSelected}
                    onChange={() => toggleSelectAlert(al.id)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer shrink-0"
                  />

                  <div className="p-2 rounded-lg shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {al.type === 'DYING_GASP' ? (
                      <Zap className="w-4 h-4" />
                    ) : al.type === 'OPTICAL_LOW' ? (
                      <Radio className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                        {al.type === 'DYING_GASP'
                          ? 'Mati Listrik (Dying Gasp)'
                          : al.type === 'LOS'
                          ? 'Kabel Putus (LOS)'
                          : 'Redaman Kritis'}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">&bull; {al.time}</span>
                    </div>
                    <p className="text-xs mt-0.5 text-slate-700 dark:text-slate-300 font-medium">{al.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {al.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleAcknowledge(al.id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm flex items-center gap-1 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Selesai</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span>Selesai</span>
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteSingle(al.id)}
                    title="Hapus alarm"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-dark-700 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default AlertsPage;


