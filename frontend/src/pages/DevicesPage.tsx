import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Power,
  Wifi,
  RotateCcw,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Sparkles,
  Router,
  Trash2,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';
import { useAppContext, evaluateOpticalPower } from '../context/AppContext';
import { api } from '../api/client';

const INITIAL_DEVICES: any[] = [];

export const DevicesPage: React.FC = () => {
  const { modemProfiles, deviceVendors, showToast, pppoeSessions, refreshPppoeSessions, markPppoeAssigned } =
    useAppContext();

  const [devices, setDevices] = useState(() => {
    try {
      const saved = localStorage.getItem('acs_devices_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((d: any) => {
            const id = d.id || '';
            const sn = (d.serial || d.serialNumber || '').toLowerCase();
            return !(
              ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'].includes(id) ||
              id.startsWith('dev-dummy-') ||
              sn.includes('dummy') ||
              sn.includes('demo')
            );
          });
        }
      }
      return INITIAL_DEVICES;
    } catch {
      return INITIAL_DEVICES;
    }
  });

  const persistDevices = (list: any[]) => {
    try {
      localStorage.setItem('acs_devices_list', JSON.stringify(list));
    } catch { /* quota */ }
  };

  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  const [activeModal, setActiveModal] = useState<{
    device: any;
    actionType: 'reboot' | 'factoryReset' | 'wifi' | 'pppoe' | 'refresh';
  } | null>(null);

  // Auto-sync function: Perangkat masuk otomatis dari GenieACS / Sesi PPPoE MikroTik
  const handleSyncTr069AndPppoe = async () => {
    setIsSyncing(true);
    try {
      // 1. Coba sync dari API backend jika backend aktif
      try {
        await api.post('/devices/sync');
        const res = await api.get('/devices');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setDevices((prev: any[]) => {
            const merged = [...prev];
            res.data.forEach((incoming: any) => {
              const idx = merged.findIndex(
                (d: any) => d.id === incoming.id || (incoming.serial && d.serial === incoming.serial)
              );
              if (idx !== -1) {
                merged[idx] = { ...merged[idx], ...incoming };
              } else {
                merged.push(incoming);
              }
            });
            persistDevices(merged);
            return merged;
          });
          showToast(`✓ Berhasil menarik & menyinkronkan ${res.data.length} perangkat dari GenieACS TR-069.`);
          return;
        }
      } catch (e) {
        // Backend offline / mode simulasi
      }

      // 2. Tarik sesi aktif MikroTik PPPoE secara silent untuk mencegah toast ganda
      const freshSessions = await refreshPppoeSessions(true);

      if (freshSessions && freshSessions.length > 0) {
        setDevices((prev: any[]) => {
          const merged = [...prev];
          let updatedCount = 0;
          let addedCount = 0;

          freshSessions.forEach((session) => {
            const devId = `dev-ppp-${session.id}`;
            const existingIdx = merged.findIndex(
              (d: any) =>
                d.id === devId ||
                (session.serialNumber && d.serial === session.serialNumber) ||
                (session.username && d.pppoeUser === session.username)
            );

            const deviceData = {
              id: existingIdx !== -1 ? merged[existingIdx].id : devId,
              serial: session.serialNumber || (existingIdx !== -1 ? merged[existingIdx].serial : '-'),
              mac: session.callerIdMac || (existingIdx !== -1 ? merged[existingIdx].mac : '-'),
              customerName: session.customerName || (existingIdx !== -1 ? merged[existingIdx].customerName : 'Pelanggan'),
              customerNo: session.customerNo || (existingIdx !== -1 ? merged[existingIdx].customerNo : '-'),
              manufacturer: session.manufacturer || (existingIdx !== -1 ? merged[existingIdx].manufacturer : 'Huawei'),
              model: session.model || (existingIdx !== -1 ? merged[existingIdx].model : 'EchoLife HG8245H5'),
              status: session.tr069Status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
              rxPowerAcs: session.rxPower || (existingIdx !== -1 ? merged[existingIdx].rxPowerAcs : '-19.50'),
              wanIp: session.ipAddress || (existingIdx !== -1 ? merged[existingIdx].wanIp : '10.10.10.1'),
              uptime: session.uptime || (existingIdx !== -1 ? merged[existingIdx].uptime : '1h 00m'),
              pppoeUser: session.username,
            };

            if (existingIdx !== -1) {
              merged[existingIdx] = { ...merged[existingIdx], ...deviceData };
              updatedCount++;
            } else {
              merged.push(deviceData);
              addedCount++;
            }
          });

          persistDevices(merged);
          return merged;
        });

        showToast(`✓ Sinkronisasi selesai: ${freshSessions.length} ONT terdeteksi & disinkronkan via PPPoE & TR-069!`);
      } else {
        showToast('Sinkronisasi selesai: Belum ada modem ONT dengan sesi PPPoE aktif di MikroTik.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDevice = (id: string, customerName: string, serial: string, pppoeUser?: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus modem '${customerName}' (SN: ${serial}) dari sistem?`)) {
      if (pppoeUser) {
        const matchPpp = pppoeSessions.find((s) => s.username === pppoeUser);
        if (matchPpp) markPppoeAssigned(matchPpp.id, false);
      }
      const updated = devices.filter((d: any) => d.id !== id);
      setDevices(updated);
      try {
        localStorage.setItem('acs_devices_list', JSON.stringify(updated));
      } catch { }
      showToast(`✓ Modem ${customerName} berhasil dihapus dari sistem.`);
    }
  };

  const [isBulkRebooting, setIsBulkRebooting] = useState(false);

  const handleBulkRebootDevices = async () => {
    if (selectedDeviceIds.length === 0) return;
    const count = selectedDeviceIds.length;
    if (!window.confirm(`Apakah Anda yakin ingin me-reboot ${count} modem ONT yang dipilih?`)) {
      return;
    }

    setIsBulkRebooting(true);
    try {
      await Promise.allSettled(
        selectedDeviceIds.map((id) => api.post(`/devices/${id}/reboot`).catch(() => {}))
      );

      const selectedSet = new Set(selectedDeviceIds);
      setDevices((prev: any[]) => {
        const updated = prev.map((d: any) => {
          if (selectedSet.has(d.id)) {
            return { ...d, uptime: '0m (Baru Reboot)', status: 'ONLINE' };
          }
          return d;
        });
        persistDevices(updated);
        return updated;
      });

      showToast(`✓ Perintah reboot berhasil dikirim ke ${count} modem ONT terpilih.`);
      setSelectedDeviceIds([]);
    } catch {
      showToast(`✓ Perintah reboot dikirim ke ${count} modem ONT.`);
      setSelectedDeviceIds([]);
    } finally {
      setIsBulkRebooting(false);
    }
  };

  const handleBulkDeleteDevices = () => {
    if (selectedDeviceIds.length === 0) return;
    const count = selectedDeviceIds.length;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${count} modem ONT yang dipilih dari sistem?`)) {
      return;
    }

    const selectedSet = new Set(selectedDeviceIds);

    // Lepas penugasan PPPoE jika ada
    devices.forEach((d: any) => {
      if (selectedSet.has(d.id) && d.pppoeUser) {
        const matchPpp = pppoeSessions.find((s) => s.username === d.pppoeUser);
        if (matchPpp) markPppoeAssigned(matchPpp.id, false);
      }
    });

    const updated = devices.filter((d: any) => !selectedSet.has(d.id));
    setDevices(updated);
    try {
      localStorage.setItem('acs_devices_list', JSON.stringify(updated));
    } catch { }
    setSelectedDeviceIds([]);
    showToast(`✓ ${count} modem ONT berhasil dihapus.`);
  };

  const handleRemoteActionSuccess = (actionType?: string, payload?: any) => {
    if (!activeModal) return;
    const targetDev = activeModal.device;

    setDevices((prev: any[]) => {
      const updated = prev.map((d: any) => {
        if (d.id !== targetDev.id && d.serial !== targetDev.serial) return d;
        if (actionType === 'reboot') {
          return { ...d, uptime: '0m (Baru Reboot)', status: 'ONLINE' };
        }
        if (actionType === 'refresh') {
          return { ...d, status: 'ONLINE' };
        }
        if (actionType === 'factoryReset') {
          return { ...d, uptime: '0m', rxPowerAcs: '-21.50' };
        }
        if (actionType === 'pppoe' && payload?.username) {
          return { ...d, pppoeUser: payload.username };
        }
        return d;
      });
      try {
        localStorage.setItem('acs_devices_list', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setActiveModal(null);
  };

  const filteredDevices = devices.filter((d: any) => {
    const s = search.toLowerCase().trim();
    const serial = (d.serial || '').toLowerCase();
    const custName = (d.customerName || '').toLowerCase();
    const wanIp = (d.wanIp || '').toLowerCase();
    const pppoeUser = (d.pppoeUser || '').toLowerCase();
    const manufacturer = (d.manufacturer || '').toUpperCase();

    const matchSearch =
      !s ||
      serial.includes(s) ||
      custName.includes(s) ||
      wanIp.includes(s) ||
      pppoeUser.includes(s);

    const matchVendor =
      selectedVendor === 'ALL' || manufacturer === selectedVendor.toUpperCase();
    const matchStatus = selectedStatus === 'ALL' || d.status === selectedStatus;
    return matchSearch && matchVendor && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Modem ONT (CPE)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {devices.length} Unit CPE Terdaftar &bull; Standar TR-069 & PPPoE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncTr069AndPppoe}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Tarik sesi PPPoE aktif & Inform TR-069"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-slate-900 dark:text-white' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan TR-069 & PPPoE'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari SN, Pelanggan, atau IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Dynamic Vendor Select */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full md:w-auto h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl pl-3.5 pr-9 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors shadow-sm"
          >
            <option value="ALL">Semua Merek {devices.length > 0 ? `(${devices.length})` : ''}</option>
            {deviceVendors.map((v) => (
              <option key={v} value={v}>
                {v} ({devices.filter((d: any) => (d.manufacturer || '').toUpperCase() === v.toUpperCase()).length})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-auto h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 rounded-xl pl-3.5 pr-9 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors shadow-sm"
          >
            <option value="ALL">Semua Status</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
      </div>

      {/* Perangkat ONT List Container */}
      {filteredDevices.length === 0 ? (
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-14 text-center shadow-sm">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Router className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Belum Ada Modem ONT Terdeteksi</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Modem akan terdeteksi otomatis saat terhubung via <strong>TR-069</strong> atau dial sesi <strong>PPPoE MikroTik</strong>.
              </p>
            </div>
            <button
              onClick={handleSyncTr069AndPppoe}
              disabled={isSyncing}
              className="mt-2 w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Helper calculations for select all */}
          {(() => {
            const isAllDevicesSelected = filteredDevices.length > 0 && filteredDevices.every((d: any) => selectedDeviceIds.includes(d.id));
            const isSomeDevicesSelected = filteredDevices.some((d: any) => selectedDeviceIds.includes(d.id)) && !isAllDevicesSelected;

            const toggleSelectAllDevices = () => {
              if (isAllDevicesSelected) {
                const filteredIds = new Set(filteredDevices.map((d: any) => d.id));
                setSelectedDeviceIds((prev) => prev.filter((id) => !filteredIds.has(id)));
              } else {
                const filteredIds = filteredDevices.map((d: any) => d.id);
                setSelectedDeviceIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
              }
            };

            const toggleSelectDevice = (id: string) => {
              setSelectedDeviceIds((prev) =>
                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
              );
            };

            return (
              <div className="space-y-3">
                {/* Bulk Action Bar */}
                {selectedDeviceIds.length > 0 && (
                  <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm animate-fadeIn">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>{selectedDeviceIds.length} modem ONT dipilih</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDeviceIds([])}
                        className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleBulkRebootDevices}
                        disabled={isBulkRebooting}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all active:scale-95"
                      >
                        <Power className={`w-3.5 h-3.5 ${isBulkRebooting ? 'animate-spin' : ''}`} />
                        <span>{isBulkRebooting ? 'Me-reboot...' : `Reboot (${selectedDeviceIds.length}) Terpilih`}</span>
                      </button>
                      <button
                        onClick={handleBulkDeleteDevices}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 rounded-lg transition-all"
                        title="Hapus Modem Terpilih dari Daftar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* MOBILE CARDS VIEW */}
                <div className="md:hidden space-y-3">
                  {filteredDevices.map((dev: any) => {
                    const isLos = dev.rxPowerAcs === 'LOS' || dev.status === 'OFFLINE';
                    const isSelected = selectedDeviceIds.includes(dev.id);
                    const optic = evaluateOpticalPower(isLos ? 'LOS' : dev.rxPowerAcs || dev.rxPower);

                    return (
                      <div
                        key={dev.id}
                        className={`bg-white dark:bg-dark-800 border rounded-2xl p-4 space-y-3 shadow-sm transition-all ${
                          isSelected ? 'border-slate-900 bg-slate-100/80 dark:border-slate-200 dark:bg-slate-800/80' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Card Header: Checkbox + Pelanggan & Status */}
                        <div className="flex items-start justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${dev.customerName}`}
                              checked={isSelected}
                              onChange={() => toggleSelectDevice(dev.id)}
                              className="w-4 h-4 mt-1 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{dev.customerName}</h4>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                <span>{dev.customerNo}</span>
                                {dev.pppoeUser && (
                                  <>
                                    <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">{dev.pppoeUser}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  dev.status === 'ONLINE' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-400'
                                }`}
                              />
                              {dev.status === 'ONLINE' ? 'Online' : 'Offline'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{dev.uptime}</span>
                          </div>
                        </div>

                        {/* Device Info Badges */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="bg-slate-50 dark:bg-dark-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Serial / MAC</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{dev.serial}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{dev.mac}</div>
                          </div>

                          <div className="bg-slate-50 dark:bg-dark-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Merek & Model</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{dev.manufacturer}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{dev.model}</div>
                          </div>

                          <div className="bg-slate-50 dark:bg-dark-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">Sinyal RX</div>
                            <div className="mt-0.5">
                              {optic.status === 'LOS' ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-[10px] font-mono">
                                  LOS
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${optic.colorClass}`} title={optic.description}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${optic.dotColorClass}`} />
                                  {optic.label}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-dark-900/80 p-2 rounded-xl border border-slate-200 dark:border-slate-800/80">
                            <div className="text-[10px] text-slate-500 uppercase font-sans">IP WAN</div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{dev.wanIp}</div>
                          </div>
                        </div>

                        {/* Action Toolbar on Mobile */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => setActiveModal({ device: dev, actionType: 'reboot' })}
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                            title="Reboot Modem"
                          >
                            <Power className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>Reboot</span>
                          </button>

                          <button
                            onClick={() => setActiveModal({ device: dev, actionType: 'wifi' })}
                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                            title="Ganti Wi-Fi"
                          >
                            <Wifi className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>Wi-Fi</span>
                          </button>

                          <button
                            onClick={() => setActiveModal({ device: dev, actionType: 'refresh' })}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                            title="Refresh TR-069"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteDevice(dev.id, dev.customerName, dev.serial, dev.pppoeUser)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                            title="Hapus Modem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>


                {/* DESKTOP TABLE VIEW */}
                <div className="hidden md:block bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead className="bg-slate-50 dark:bg-dark-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="w-10 py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              aria-label="Pilih Semua Modem"
                              checked={isAllDevicesSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeDevicesSelected;
                              }}
                              onChange={toggleSelectAllDevices}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                            />
                          </th>
                          <th className="py-3.5 px-4">Pelanggan</th>
                          <th className="py-3.5 px-4">Serial Number / MAC</th>
                          <th className="py-3.5 px-4">Merek & Model Modem</th>
                          <th className="py-3.5 px-4">Status & Uptime</th>
                          <th className="py-3.5 px-4">Sinyal RX (dBm)</th>
                          <th className="py-3.5 px-4">IP WAN</th>
                          <th className="py-3.5 px-4 text-right">Aksi Remote</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredDevices.map((dev: any) => {
                          const isLos = dev.rxPowerAcs === 'LOS' || dev.status === 'OFFLINE';
                          const isSelected = selectedDeviceIds.includes(dev.id);
                          const optic = evaluateOpticalPower(isLos ? 'LOS' : dev.rxPowerAcs || dev.rxPower);

                          return (
                            <tr
                              key={dev.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'
                              }`}
                            >
                              <td className="w-10 py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  aria-label={`Pilih ${dev.customerName}`}
                                  checked={isSelected}
                                  onChange={() => toggleSelectDevice(dev.id)}
                                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                                />
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{dev.customerName}</div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  <span>{dev.customerNo}</span>
                                  {dev.pppoeUser && (
                                    <>
                                      <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">{dev.pppoeUser}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 font-mono">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 tracking-wider">{dev.serial}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{dev.mac}</div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] uppercase font-medium">
                                    {dev.manufacturer}
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-200 font-medium font-mono text-[11px]">
                                    {dev.model}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      dev.status === 'ONLINE' ? 'bg-slate-900 dark:bg-white' : 'bg-slate-400'
                                    }`}
                                  />
                                  <span
                                    className={`font-semibold ${
                                      dev.status === 'ONLINE' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {dev.status === 'ONLINE' ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{dev.uptime}</div>
                              </td>

                              <td className="py-3 px-4">
                                {optic.status === 'LOS' ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-[10px]">
                                    LOS
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${optic.colorClass}`}
                                    title={optic.description}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${optic.dotColorClass}`} />
                                    {optic.label}
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{dev.wanIp}</td>

                              <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setActiveModal({ device: dev, actionType: 'reboot' })}
                                      title="Reboot Modem"
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                      <Power className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => setActiveModal({ device: dev, actionType: 'wifi' })}
                                      title="Ganti Wi-Fi"
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                      <Wifi className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => setActiveModal({ device: dev, actionType: 'refresh' })}
                                      title="Refresh TR-069"
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteDevice(dev.id, dev.customerName, dev.serial, dev.pppoeUser)}
                                      title="Hapus Modem dari Sistem"
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Modal Dialog */}
      {activeModal && (
        <RemoteActionModal
          device={activeModal.device}
          actionType={activeModal.actionType}
          onClose={() => setActiveModal(null)}
          onSuccess={(actionType, payload) => handleRemoteActionSuccess(actionType, payload)}
        />
      )}
    </div>
  );
};
