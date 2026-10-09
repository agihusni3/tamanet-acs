import React, { useState, useMemo, useEffect } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useAppContext, OltDevice, sanitizeIp } from '../context/AppContext';
import { OltAccessModal, OltDeviceData } from '../components/OltAccessModal';
import { loadAllOntDevices } from '../utils/devices';

// Model ONU riil yang tersimpan di sistem ACS
interface SystemOnuDevice {
  id: string;
  serial: string;
  mac?: string;
  customerName?: string;
  customerNo?: string;
  manufacturer?: string;
  model?: string;
  status: 'ONLINE' | 'OFFLINE' | string;
  rxPower?: string;
  rxPowerAcs?: string;
  wanIp?: string;
  uptime?: string;
  pppoeUser?: string;
  oltId?: string;
  oltName?: string;
  ponPort?: number | string;
}

export const OltsPage: React.FC = () => {
  const { olts, addOlt, updateOlt, updatePonPortArea, deleteOlt, syncOlt, syncAllOlts, showToast } = useAppContext();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedPonType, setSelectedPonType] = useState('ALL');
  const [syncingOltId, setSyncingOltId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Selected OLT for Access / Settings modal
  const [accessModalOlt, setAccessModalOlt] = useState<OltDeviceData | null>(null);

  // Expanded PON port detail state: record of oltId -> activePortNumber | null
  const [expandedPon, setExpandedPon] = useState<Record<string, number | null>>({});

  // Edit Keterangan Area Modal state
  const [editAreaModal, setEditAreaModal] = useState<{
    oltId: string;
    oltName: string;
    port: number;
    currentDesc: string;
  } | null>(null);
  const [editingAreaText, setEditingAreaText] = useState('');

  // Add OLT Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormPortAreas, setAddFormPortAreas] = useState<Record<number, string>>({});
  const [addForm, setAddForm] = useState({
    name: 'OLT-Hisfocus-2P1G',
    vendor: 'Hisfocus',
    model: '2P1G',
    ip: '192.168.1.100',
    webPort: 80,
    cliPort: 23,
    ponType: 'EPON',
    ponPortsCount: 2,
    snmpCommunity: 'public',
    defaultUser: 'admin',
    defaultPass: 'admin',
  });

  // Load and synchronize registered ONUs from shared helper
  const [registeredOnus, setRegisteredOnus] = useState<any[]>(loadAllOntDevices);

  // Refresh ONUs when storage changes or on mount
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'acs_devices_list' || e.key === 'acs_gis_nodes' || !e.key) {
        setRegisteredOnus(loadAllOntDevices());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Unique vendors list for filter
  const vendorsList = useMemo(() => {
    const set = new Set<string>();
    olts.forEach((o) => {
      if (o.vendor && o.vendor.trim()) set.add(o.vendor.trim());
    });
    return Array.from(set).sort();
  }, [olts]);

  // Filtered OLT list
  const filteredOlts = useMemo(() => {
    return olts.filter((olt) => {
      const q = search.toLowerCase().trim();
      const cleanIp = sanitizeIp(olt.ip);
      const matchSearch =
        !q ||
        olt.name.toLowerCase().includes(q) ||
        cleanIp.toLowerCase().includes(q) ||
        (olt.model && olt.model.toLowerCase().includes(q)) ||
        (olt.vendor && olt.vendor.toLowerCase().includes(q));

      const matchVendor = selectedVendor === 'ALL' || olt.vendor === selectedVendor;
      const matchPonType = selectedPonType === 'ALL' || olt.ponType === selectedPonType;

      return matchSearch && matchVendor && matchPonType;
    });
  }, [olts, search, selectedVendor, selectedPonType]);

  // Total PON Ports across all OLTs
  const totalPonPorts = useMemo(() => {
    return olts.reduce((sum, o) => sum + (o.ponPortsCount || 4), 0);
  }, [olts]);

  // Open OLT Web GUI Management with fully sanitized IP & port
  const handleOpenOltWeb = (olt: OltDevice) => {
    const cleanIp = sanitizeIp(olt.ip);
    if (!cleanIp || cleanIp === '-') {
      showToast(`IP OLT '${olt.name}' belum diset. Silakan konfigurasi IP terlebih dahulu.`);
      setAccessModalOlt(olt as any);
      return;
    }
    const port = olt.webPort && olt.webPort !== 80 && olt.webPort !== 443 ? `:${olt.webPort}` : '';
    const protocol = olt.webPort === 443 ? 'https' : 'http';
    window.open(`${protocol}://${cleanIp}${port}`, '_blank', 'noopener,noreferrer');
  };

  // Sync single OLT
  const handleSyncSingle = async (id: string) => {
    setSyncingOltId(id);
    try {
      await syncOlt(id);
      setRegisteredOnus(loadAllOntDevices());
    } finally {
      setSyncingOltId(null);
    }
  };

  // Sync all OLTs
  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await syncAllOlts();
      setRegisteredOnus(loadAllOntDevices());
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Delete OLT confirmation
  const handleDeleteOlt = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data OLT '${name}' dari sistem?`)) {
      deleteOlt(id);
    }
  };

  // Toggle expanded PON port view
  const togglePonExpand = (oltId: string, portNum: number) => {
    setExpandedPon((prev) => ({
      ...prev,
      [oltId]: prev[oltId] === portNum ? null : portNum,
    }));
  };

  // Handle Add OLT Form Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      showToast('⚠️ Nama OLT wajib diisi.');
      return;
    }
    const cleanIp = sanitizeIp(addForm.ip);
    if (!cleanIp) {
      showToast('⚠️ IP Address OLT wajib diisi.');
      return;
    }

    const portsCount = Number(addForm.ponPortsCount) || 4;
    const ponPorts = Array.from({ length: portsCount }, (_, i) => ({
      port: i + 1,
      name: `PON ${i + 1}`,
      description: addFormPortAreas[i + 1]?.trim() || '',
      online: 0,
      offline: 0,
    }));

    await addOlt({
      name: addForm.name.trim(),
      vendor: addForm.vendor,
      model: addForm.model.trim() || `${addForm.vendor} Standalone`,
      ip: cleanIp,
      webPort: Number(addForm.webPort) || 80,
      cliPort: Number(addForm.cliPort) || 23,
      ponType: addForm.ponType,
      ponPortsCount: portsCount,
      snmpCommunity: addForm.snmpCommunity.trim() || 'public',
      defaultUser: addForm.defaultUser.trim() || 'admin',
      defaultPass: addForm.defaultPass.trim() || 'admin',
      ponPorts,
    });

    setIsAddModalOpen(false);
    setAddFormPortAreas({});
    setAddForm({
      name: '',
      vendor: 'Hioso',
      model: '',
      ip: '',
      webPort: 80,
      cliPort: 23,
      ponType: 'EPON',
      ponPortsCount: 4,
      snmpCommunity: 'public',
      defaultUser: 'admin',
      defaultPass: 'admin',
    });
  };

  const handleSaveArea = async () => {
    if (!editAreaModal) return;
    await updatePonPortArea(editAreaModal.oltId, editAreaModal.port, editingAreaText.trim());
    setEditAreaModal(null);
  };

  // Helper untuk mendapatkan status warna sinyal optik RX
  const getRxPowerBadge = (rxStr?: string) => {
    if (!rxStr || rxStr === '-' || rxStr === '0' || rxStr === 'undefined') {
      return <span className="text-slate-400 font-mono text-xs">-</span>;
    }
    const num = parseFloat(rxStr);
    if (isNaN(num)) {
      return <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{rxStr}</span>;
    }

    const formatted = `${num.toFixed(2)} dBm`;
    return (
      <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
        {formatted}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* ─── Page Header: Ringkas & Bersih Tanpa KPI Berlebih ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Perangkat OLT
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {olts.length} Unit &bull; {totalPonPorts} Port PON
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manajemen dan pemantauan perangkat OLT (*Optical Line Terminal*), port PON, dan distribusi modem pelanggan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="px-3.5 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            title="Sinkronkan status semua OLT dengan data sistem"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin text-slate-900 dark:text-white' : 'text-slate-500'}`} />
            <span>Sinkronkan Semua</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah OLT</span>
          </button>
        </div>
      </div>

      {/* ─── Search & Filter Toolbar: Simetris di Mobile & Desktop ─── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama OLT, IP address, atau model..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 transition-colors shadow-xs"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {/* Filter Vendor */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 shadow-xs"
          >
            <option value="ALL">Semua Vendor</option>
            {vendorsList.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Filter PON Type (Khusus EPON) */}
          <select
            value={selectedPonType}
            onChange={(e) => setSelectedPonType(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 shadow-xs"
          >
            <option value="EPON">Khusus OLT EPON</option>
            <option value="ALL">Semua OLT</option>
          </select>
        </div>
      </div>

      {/* ─── OLT Cards / List Section ─── */}
      {filteredOlts.length === 0 ? (
        <div className="bg-white dark:bg-dark-800 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Server className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            {search || selectedVendor !== 'ALL' || selectedPonType !== 'ALL'
              ? 'Tidak Ada OLT yang Sesuai Filter'
              : 'Belum Ada Perangkat OLT Terdaftar'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Daftarkan perangkat OLT jaringan Anda untuk memantau status port PON dan alokasi modem pelanggan secara riil.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah OLT Baru</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOlts.map((olt) => {
            const cleanIp = sanitizeIp(olt.ip);
            const portsCount = olt.ponPortsCount || 4;

            // Audit Logika: Ambil modem ONT riil yang terhubung ke OLT ini
            const oltOnus = registeredOnus.filter((o) => {
              if (o.oltId && (o.oltId === olt.id || sanitizeIp(o.oltId) === cleanIp)) return true;
              if (o.oltName && o.oltName.trim().toLowerCase() === olt.name.trim().toLowerCase()) return true;
              if (!o.oltId && filteredOlts.length === 1) return true;
              return false;
            });

            // Hitung data port PON berdasarkan modem riil
            const ponList = Array.from({ length: portsCount }, (_, i) => {
              const portNum = i + 1;
              const onusOnPort = oltOnus.filter((o) => {
                const p = Number(o.ponPort);
                if (p === portNum) return true;
                if (!p && portNum === 1) return true; // Default ke port 1 bila belum dispesifikasikan
                return false;
              });

              // Jika ada data ponPorts dari OLT collector/context, gunakan sebagai baseline
              const contextPort = olt.ponPorts?.find((cp) => cp.port === portNum);
              const areaDescription = contextPort?.description || '';
              const onlineCount =
                onusOnPort.length > 0
                  ? onusOnPort.filter((o) => o.status === 'ONLINE').length
                  : contextPort?.online || 0;
              const offlineCount =
                onusOnPort.length > 0
                  ? onusOnPort.filter((o) => o.status === 'OFFLINE').length
                  : contextPort?.offline || 0;

              return {
                port: portNum,
                name: contextPort?.name || `PON ${portNum}`,
                description: areaDescription,
                online: onlineCount,
                offline: offlineCount,
                devices: onusOnPort,
              };
            });

            const activeExpandedPort = expandedPon[olt.id];
            const activePortData = activeExpandedPort
              ? ponList.find((p) => p.port === activeExpandedPort)
              : null;

            return (
              <div
                key={olt.id}
                className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all"
              >
                {/* ─── Header OLT: Nama dan Aksi ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {olt.name}
                    </h3>
                  </div>

                  {/* ─── Tombol Aksi OLT ─── */}
                  <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenOltWeb(olt)}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
                      title={cleanIp ? `Buka Web GUI OLT (${cleanIp})` : 'IP OLT belum diset'}
                    >
                      Web OLT
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSyncSingle(olt.id)}
                      disabled={syncingOltId === olt.id}
                      className="w-8 h-8 p-0 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                      title="Sinkronkan status OLT"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingOltId === olt.id ? 'animate-spin text-slate-900 dark:text-white' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccessModalOlt({ ...olt, ip: cleanIp } as any)}
                      className="w-8 h-8 p-0 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-xs transition-all active:scale-95 shrink-0"
                      title="Pengaturan OLT"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOlt(olt.id, olt.name)}
                      className="w-8 h-8 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors inline-flex items-center justify-center shrink-0"
                      title="Hapus OLT"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* ─── Port PON Overview & Expansion ─── */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Distribusi Port PON
                    </span>
                  </div>

                  {/* Grid Tombol Port PON: Bersih, Minimalis & Mudah Dibaca */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {ponList.map((pon) => {
                      const isSelected = activeExpandedPort === pon.port;
                      return (
                        <button
                          key={pon.port}
                          type="button"
                          onClick={() => togglePonExpand(olt.id, pon.port)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="text-[11px] font-bold font-mono">
                            PON {pon.port}
                          </div>

                          <div
                            className={`mt-0.5 text-[11px] truncate ${
                              isSelected
                                ? 'text-slate-300 dark:text-slate-600'
                                : pon.description
                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                            title={pon.description ? `Area: ${pon.description}` : 'Belum ada area'}
                          >
                            {pon.description || '-'}
                          </div>

                          <div className="flex items-center justify-between mt-1 text-[11px] font-mono font-semibold">
                            <span className={isSelected ? 'text-slate-200 dark:text-slate-800' : 'text-slate-900 dark:text-slate-100'}>
                              {pon.online} On
                            </span>
                            <span className={isSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'}>
                              {pon.offline} Off
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* ─── Rincian Port PON Riil ─── */}
                  {activeExpandedPort && activePortData && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 space-y-3 animate-fadeIn text-xs">
                      {/* Port Header: Ringkas Tanpa Info Ganda */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            PON {activeExpandedPort}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            Area: <strong className="text-slate-900 dark:text-white">{activePortData.description || 'Belum diatur'}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditAreaModal({
                                oltId: olt.id,
                                oltName: olt.name,
                                port: activeExpandedPort,
                                currentDesc: activePortData.description,
                              });
                              setEditingAreaText(activePortData.description);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                          >
                            Ubah
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {activePortData.devices.length} Modem
                        </div>
                      </div>

                      {/* Tabel Modem Riil Pada Port Ini */}
                      {activePortData.devices.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                <th className="py-2 px-2.5 font-semibold">Status</th>
                                <th className="py-2 px-2.5 font-semibold">Pelanggan / Akun</th>
                                <th className="py-2 px-2.5 font-semibold">Serial Number & MAC</th>
                                <th className="py-2 px-2.5 font-semibold">Model Perangkat</th>
                                <th className="py-2 px-2.5 font-semibold">Redaman RX</th>
                                <th className="py-2 px-2.5 font-semibold">IP WAN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {activePortData.devices.map((dev) => {
                                const isOnline = dev.status === 'ONLINE';
                                return (
                                  <tr key={dev.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                                    <td className="py-2 px-2.5">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            isOnline ? 'bg-slate-900 dark:bg-white' : 'bg-slate-400'
                                          }`}
                                        />
                                        {isOnline ? 'Online' : 'Offline'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-white">
                                      <div>{dev.customerName}</div>
                                      {dev.pppoeUser && (
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          User: {dev.pppoeUser}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                      <div>{dev.serial}</div>
                                      <div className="text-[10px] text-slate-400">{dev.mac}</div>
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400">
                                      {dev.model}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      {getRxPowerBadge(dev.rxPower)}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-slate-600 dark:text-slate-400">
                                      {dev.wanIp || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-dark-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          Port PON {activeExpandedPort}: Belum ada modem terhubung
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal Tambah OLT Baru ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Perangkat OLT Baru</h3>
                <p className="text-xs text-slate-500">Daftarkan OLT untuk monitoring port PON dan integrasi jaringan</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              {/* Quick Template Presets */}
              <div className="bg-slate-50 dark:bg-dark-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">⚡ Template Cepat:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        name: 'OLT-Hisfocus-2P1G',
                        vendor: 'Hisfocus',
                        model: '2P1G',
                        ip: '192.168.1.100',
                        ponType: 'EPON',
                        ponPortsCount: 2,
                        webPort: 80,
                        cliPort: 23,
                        defaultUser: 'admin',
                        defaultPass: 'admin',
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    Hisfocus 2P1G (2 PON EPON)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        name: 'OLT-Hioso-HA7302CST',
                        vendor: 'Hioso',
                        model: 'HA7302CST',
                        ip: '192.168.1.101',
                        ponType: 'EPON',
                        ponPortsCount: 2,
                        webPort: 80,
                        cliPort: 23,
                        defaultUser: 'admin',
                        defaultPass: 'admin',
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    Hioso HA7302CST (2 PON EPON)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAddForm({
                        ...addForm,
                        name: 'OLT-Hioso-HA7304',
                        vendor: 'Hioso',
                        model: 'HA7304',
                        ip: '192.168.1.102',
                        ponType: 'EPON',
                        ponPortsCount: 4,
                        webPort: 80,
                        cliPort: 23,
                        defaultUser: 'admin',
                        defaultPass: 'admin',
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    Hioso HA7304 (4 PON EPON)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nama OLT */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nama OLT</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Contoh: OLT-Central-01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* Vendor / Merek */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Merek / Vendor</label>
                  <select
                    value={addForm.vendor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'Hisfocus') {
                        setAddForm({
                          ...addForm,
                          vendor: v,
                          model: '2P1G',
                          ponPortsCount: 2,
                          ponType: 'EPON',
                        });
                      } else if (v === 'Hioso') {
                        setAddForm({
                          ...addForm,
                          vendor: v,
                          model: 'HA7302CST',
                          ponPortsCount: 2,
                          ponType: 'EPON',
                        });
                      } else {
                        setAddForm({ ...addForm, vendor: v, ponType: 'EPON' });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Hisfocus">Hisfocus (HSGQ)</option>
                    <option value="Hioso">Hioso</option>
                    <option value="ZTE">ZTE (EPON)</option>
                    <option value="Lainnya">Lainnya (EPON)</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tipe / Model OLT</label>
                  <input
                    type="text"
                    value={addForm.model}
                    onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    placeholder="Contoh: 2P1G / HA7302CST / HA7304"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                {/* IP Address */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">IP Address Manajemen</label>
                  <input
                    type="text"
                    required
                    value={addForm.ip}
                    onChange={(e) => setAddForm({ ...addForm, ip: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Tipe PON */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tipe PON</label>
                  <select
                    value={addForm.ponType}
                    onChange={(e) => setAddForm({ ...addForm, ponType: 'EPON' })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="EPON">EPON (1.25 Gbps - Standar)</option>
                  </select>
                </div>

                {/* Jumlah Port PON */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Jumlah Port PON</label>
                  <select
                    value={addForm.ponPortsCount}
                    onChange={(e) => setAddForm({ ...addForm, ponPortsCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value={2}>2 Port PON</option>
                    <option value={4}>4 Port PON</option>
                    <option value={8}>8 Port PON</option>
                    <option value={16}>16 Port PON</option>
                  </select>
                </div>

                {/* Keterangan Area per Port PON */}
                <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 dark:bg-dark-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Area per Port (Opsional):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from({ length: Number(addForm.ponPortsCount) || 2 }, (_, idx) => {
                      const pNum = idx + 1;
                      return (
                        <div key={pNum} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0 w-14">
                            PON {pNum}:
                          </span>
                          <input
                            type="text"
                            value={addFormPortAreas[pNum] || ''}
                            onChange={(e) =>
                              setAddFormPortAreas({ ...addFormPortAreas, [pNum]: e.target.value })
                            }
                            placeholder="Area"
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Web Port */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Port Web GUI</label>
                  <input
                    type="number"
                    value={addForm.webPort}
                    onChange={(e) => setAddForm({ ...addForm, webPort: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* CLI Telnet Port */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Port CLI Telnet/SSH</label>
                  <input
                    type="number"
                    value={addForm.cliPort}
                    onChange={(e) => setAddForm({ ...addForm, cliPort: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  Simpan & Daftarkan OLT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Akses / Pengaturan OLT ─── */}
      {accessModalOlt && (
        <OltAccessModal
          olt={accessModalOlt}
          onClose={() => setAccessModalOlt(null)}
          onSync={async (id) => {
            await syncOlt(id);
            setRegisteredOnus(loadAllOntDevices());
          }}
          onSave={(updated) => {
            updateOlt(updated.id, updated as any);
            setAccessModalOlt(null);
            setRegisteredOnus(loadAllOntDevices());
          }}
        />
      )}

      {/* ─── Modal Ubah Keterangan Area PON ─── */}
      {editAreaModal && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Area PON {editAreaModal.port}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{editAreaModal.oltName}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditAreaModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Area:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={editingAreaText}
                  onChange={(e) => setEditingAreaText(e.target.value)}
                  placeholder="Area"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500/50 focus:outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveArea();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setEditAreaModal(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveArea}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-xs transition-all"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
