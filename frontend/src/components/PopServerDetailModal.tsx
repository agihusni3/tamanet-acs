import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  HardDrive,
  Router,
  Layers,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  X,
  Settings,
  Globe,
} from 'lucide-react';
import { PopServerFacility, PopNetworkDevice } from '../types/pop';
import { OltDeviceData } from './OltAccessModal';
import { useAppContext, sanitizeIp } from '../context/AppContext';

interface PopServerDetailModalProps {
  pop: PopServerFacility;
  onClose: () => void;
  onUpdatePop: (updated: PopServerFacility) => void;
  onOpenOltAccess: (olt: OltDeviceData) => void;
}

export const PopServerDetailModal: React.FC<PopServerDetailModalProps> = ({
  pop,
  onClose,
  onUpdatePop,
  onOpenOltAccess,
}) => {
  const { olts } = useAppContext();
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'OLT' | 'ROUTER' | 'SWITCH' | 'SERVER'>('ALL');

  // Modal Tambah / Edit Perangkat
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);

  const [formCategory, setFormCategory] = useState<'OLT' | 'ROUTER' | 'SWITCH' | 'SERVER'>('OLT');
  const [formName, setFormName] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formWebPort, setFormWebPort] = useState(80);
  const [formCliPort, setFormCliPort] = useState(23);
  const [formPonType, setFormPonType] = useState('EPON');
  const [formPonPorts, setFormPonPorts] = useState(4);

  // Filtered devices
  const devices = pop.devices || [];
  const filteredDevices = devices.filter((d) => {
    if (deviceFilter === 'ALL') return true;
    return d.category === deviceFilter;
  });

  const oltCount = devices.filter((d) => d.category === 'OLT').length;
  const routerCount = devices.filter((d) => d.category === 'ROUTER').length;
  const switchCount = devices.filter((d) => d.category === 'SWITCH').length;

  // Buka Form Tambah Baru
  const handleOpenAdd = (category: 'OLT' | 'ROUTER' | 'SWITCH' | 'SERVER' = 'OLT') => {
    setEditingDeviceId(null);
    setFormCategory(category);
    setFormName('');
    setFormVendor(category === 'OLT' ? 'Hioso' : category === 'ROUTER' ? 'MikroTik' : category === 'SWITCH' ? 'Cisco' : '');
    setFormModel('');
    setFormIp('');
    setFormWebPort(80);
    setFormCliPort(category === 'ROUTER' ? 8291 : category === 'OLT' ? 23 : 22);
    setFormPonType('EPON');
    setFormPonPorts(4);
    setIsFormOpen(true);
  };

  // Buka Form Edit Perangkat
  const handleOpenEdit = (dev: PopNetworkDevice) => {
    setEditingDeviceId(dev.id);
    setFormCategory((dev.category as any) || 'OLT');
    setFormName(dev.name);
    setFormVendor(dev.vendor || '');
    setFormModel(dev.model || '');
    setFormIp(dev.ipAddress ? sanitizeIp(dev.ipAddress) : '');
    setFormWebPort(dev.webPort || 80);
    setFormCliPort(dev.cliPort || 23);
    setFormPonType(dev.details?.ponType || 'EPON');
    setFormPonPorts(dev.portsTotal || 4);
    setIsFormOpen(true);
  };

  // Simpan Form (Tambah / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const cleanIp = formIp.trim() ? sanitizeIp(formIp) : undefined;

    if (editingDeviceId) {
      // Mode Edit
      const updatedDevices = devices.map((d) => {
        if (d.id === editingDeviceId) {
          return {
            ...d,
            name: formName.trim(),
            category: formCategory,
            vendor: formVendor.trim() || 'Generic',
            model: formModel.trim() || '',
            ipAddress: cleanIp,
            webPort: formWebPort,
            cliPort: formCliPort,
            portsTotal: formCategory === 'OLT' ? formPonPorts : d.portsTotal || 8,
            details: {
              ...d.details,
              ponType: formPonType,
            },
          };
        }
        return d;
      });

      onUpdatePop({
        ...pop,
        devices: updatedDevices,
      });
    } else {
      // Mode Tambah Baru
      const newDev: PopNetworkDevice = {
        id: `dev-${Date.now()}`,
        name: formName.trim(),
        category: formCategory,
        vendor: formVendor.trim() || 'Generic',
        model: formModel.trim() || '',
        ipAddress: cleanIp,
        webPort: formWebPort,
        cliPort: formCliPort,
        rackUnitPosition: 'U10',
        status: 'ONLINE',
        portsTotal: formCategory === 'OLT' ? formPonPorts : formCategory === 'SWITCH' ? 24 : 8,
        portsUsed: 0,
        details: {
          ponType: formPonType,
        },
      };

      onUpdatePop({
        ...pop,
        devices: [...devices, newDev],
      });
    }

    setIsFormOpen(false);
  };

  // Hapus Satu Perangkat
  const handleDeleteDevice = (deviceId: string, deviceName: string) => {
    if (window.confirm(`Hapus perangkat '${deviceName}' dari Server ${pop.name}?`)) {
      const updatedDevices = devices.filter((d) => d.id !== deviceId);
      onUpdatePop({
        ...pop,
        devices: updatedDevices,
      });
    }
  };

  // Hapus Semua Perangkat (Permanen)
  const handleClearAllDevices = () => {
    if (window.confirm(`Hapus semua perangkat (${devices.length}) dari Server ${pop.name} secara permanen?`)) {
      onUpdatePop({
        ...pop,
        devices: [],
      });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="w-full sm:max-w-3xl max-h-[90dvh] sm:max-h-[calc(100vh-2.5rem)] mt-auto sm:my-auto flex flex-col bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden shrink-0">
        {/* HEADER: Bersih, Rapi, Sederhana & Proporsional di HP */}
        <div className="p-3.5 sm:p-5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  {pop.name}
                </h2>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold uppercase flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1.5">
                <span>Sentral POP</span>
                {pop.address && (
                  <>
                    <span>&bull;</span>
                    <span className="truncate">{pop.address}</span>
                  </>
                )}
                <span>&bull;</span>
                <span className="font-semibold shrink-0">{devices.length} Perangkat</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {devices.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllDevices}
                className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-red-400 border border-slate-200 hover:border-rose-200 dark:border-slate-700 dark:hover:border-red-900/50 rounded-xl text-xs font-medium transition-colors items-center gap-1.5"
                title="Hapus semua perangkat dari server ini"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenAdd('OLT')}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-all active:scale-95 shrink-0 force-white"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white dark:text-slate-900" />
              <span className="hidden sm:inline">Tambah Perangkat</span>
              <span className="sm:hidden">Tambah</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOOLBAR FILTER KATEGORI: Scrollable & Bersih di HP */}
        <div className="px-3.5 sm:px-6 py-2 bg-slate-50/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 w-full">
            <button
              type="button"
              onClick={() => setDeviceFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all shrink-0 ${
                deviceFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Semua ({devices.length})
            </button>
            <button
              type="button"
              onClick={() => setDeviceFilter('OLT')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                deviceFilter === 'OLT'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Server className="w-3 h-3" />
              <span>OLT ({oltCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFilter('ROUTER')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                deviceFilter === 'ROUTER'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Router className="w-3 h-3" />
              <span>Router ({routerCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceFilter('SWITCH')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                deviceFilter === 'SWITCH'
                  ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Switch ({switchCount})</span>
            </button>
          </div>
        </div>

        {/* DAFTAR PERANGKAT JARINGAN */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-2.5 sm:space-y-3 scrollbar-thin">
          {filteredDevices.length === 0 ? (
            /* EMPTY STATE: Netral & Rapi */
            <div className="text-center py-8 sm:py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 space-y-3 sm:space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                <Server className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {deviceFilter === 'ALL'
                    ? `Belum Ada Perangkat di Server '${pop.name}'`
                    : `Tidak Ada Perangkat Kategori '${deviceFilter}'`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tambahkan perangkat OLT, Router, atau Switch untuk server ini.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenAdd(deviceFilter === 'ALL' ? 'OLT' : deviceFilter)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-sm force-white"
                >
                  <Plus className="w-4 h-4 text-white dark:text-slate-900" />
                  <span>Tambah Perangkat</span>
                </button>
              </div>
            </div>
          ) : (
            /* DAFTAR KARTU PERANGKAT: Monokromatik & Bersih */
            filteredDevices.map((dev) => {
              const isOlt = dev.category === 'OLT';
              const ponPorts = dev.portsTotal || 4;
              const ponType = dev.details?.ponType || 'EPON';

              return (
                <div
                  key={dev.id}
                  className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                      {isOlt && <Server className="w-5 h-5" />}
                      {dev.category === 'ROUTER' && <Router className="w-5 h-5" />}
                      {dev.category === 'SWITCH' && <Layers className="w-5 h-5" />}
                      {dev.category === 'SERVER' && <HardDrive className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white break-words">
                          {dev.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {dev.category}
                        </span>
                        {isOlt && (
                          <>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {ponPorts} PORT PON ({ponType})
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                              Master OLT
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{dev.vendor || '-'}</span>
                        {dev.model && (
                          <>
                            <span>&bull;</span>
                            <span className="text-slate-700 dark:text-slate-300">{dev.model}</span>
                          </>
                        )}
                        {dev.ipAddress && (
                          <>
                            <span>&bull;</span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">IP: {sanitizeIp(dev.ipAddress)}</span>
                            <span className="text-slate-400 dark:text-slate-500">(Web:{dev.webPort || 80} / CLI:{dev.cliPort || 23})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* AKSI PERANGKAT */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 justify-end">
                    {isOlt && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const cleanIp = sanitizeIp(dev.ipAddress);
                            if (cleanIp && cleanIp !== '-') {
                              const port = dev.webPort && dev.webPort !== 80 && dev.webPort !== 443 ? `:${dev.webPort}` : '';
                              window.open(`http://${cleanIp}${port}`, '_blank', 'noopener,noreferrer');
                            } else {
                              onOpenOltAccess({
                                id: dev.id,
                                name: dev.name,
                                vendor: dev.vendor || '',
                                model: dev.model || '',
                                ip: dev.ipAddress || '',
                                webPort: dev.webPort || 80,
                                cliPort: dev.cliPort || 23,
                                ponType: ponType,
                                ponPortsCount: ponPorts,
                                snmpCommunity: 'public',
                                totalOnu: 0,
                                onlineOnu: 0,
                                offlineOnu: 0,
                                defaultUser: 'admin',
                                defaultPass: 'admin',
                                uptime: 'Online',
                              });
                            }
                          }}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                          title={dev.ipAddress ? `Buka Web Management OLT (http://${dev.ipAddress}${dev.webPort && dev.webPort !== 80 ? `:${dev.webPort}` : ''})` : 'Atur IP OLT'}
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                          <span>Buka Web OLT</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenOltAccess({
                              id: dev.id,
                              name: dev.name,
                              vendor: dev.vendor || '',
                              model: dev.model || '',
                              ip: dev.ipAddress || '',
                              webPort: dev.webPort || 80,
                              cliPort: dev.cliPort || 23,
                              ponType: ponType,
                              ponPortsCount: ponPorts,
                              snmpCommunity: 'public',
                              totalOnu: 0,
                              onlineOnu: 0,
                              offlineOnu: 0,
                              defaultUser: 'admin',
                              defaultPass: 'admin',
                              uptime: 'Online',
                            })
                          }
                          title="Detail Port PON & Pengaturan OLT"
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dev)}
                      title="Edit Perangkat"
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDevice(dev.id, dev.name)}
                      title="Hapus Perangkat"
                      className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-red-400 border border-slate-200 hover:border-rose-200 dark:border-slate-700 dark:hover:border-red-900/50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FORM TAMBAH / EDIT PERANGKAT */}
        {isFormOpen && (
          <div className="fixed inset-0 z-[3200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full sm:max-w-md max-h-[90dvh] sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl overflow-y-auto space-y-4 mt-auto sm:my-auto">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {editingDeviceId ? 'Edit Perangkat' : 'Pasang Perangkat Baru'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                    Kategori Perangkat
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setFormCategory(cat);
                    }}
                    className="w-full h-[38px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
                  >
                    <option value="OLT">OLT (Optical Line Terminal)</option>
                    <option value="ROUTER">Core Router / MikroTik PPPoE</option>
                    <option value="SWITCH">Distribution / Aggregation Switch</option>
                    <option value="SERVER">Server Host (RADIUS / ACS)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                    Nama Perangkat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: OLT HSGQ 4-Port"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                  />
                </div>

                {formCategory === 'OLT' && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        Tautkan dari Master Perangkat OLT:
                      </label>
                      <span className="text-[10px] text-slate-400">Sinkronisasi Master Hub</span>
                    </div>
                    {olts.length > 0 ? (
                      <select
                        onChange={(e) => {
                          const selected = olts.find((o) => o.id === e.target.value);
                          if (selected) {
                            setFormName(selected.name);
                            setFormVendor(selected.vendor || 'Hioso');
                            setFormModel(selected.model || '');
                            setFormIp(sanitizeIp(selected.ip));
                            setFormWebPort(selected.webPort || 80);
                            setFormCliPort(selected.cliPort || 23);
                            setFormPonType(selected.ponType || 'EPON');
                            setFormPonPorts(selected.ponPortsCount || 4);
                          }
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        <option value="">-- Pilih OLT yang sudah terdaftar --</option>
                        {olts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({sanitizeIp(o.ip)} &bull; {o.vendor} {o.ponPortsCount} PON)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[10px] text-slate-500">
                        Belum ada Master OLT terdaftar. Anda dapat memasukkan data secara manual atau mendaftarkannya di menu Perangkat OLT.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                      Merek / Vendor
                    </label>
                    <input
                      type="text"
                      value={formVendor}
                      onChange={(e) => setFormVendor(e.target.value)}
                      placeholder="Hioso / HSGQ / ZTE"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                      Model / Tipe
                    </label>
                    <input
                      type="text"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder="HA7302CST / HA7304 / 2P1G"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                    />
                  </div>
                </div>

                {formCategory === 'OLT' && (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                        Tipe PON
                      </label>
                      <select
                        value={formPonType}
                        onChange={(e) => setFormPonType('EPON')}
                        className="w-full h-[36px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 outline-none shadow-sm"
                      >
                        <option value="EPON">EPON (1.25 Gbps)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                        Jumlah Port PON
                      </label>
                      <select
                        value={formPonPorts}
                        onChange={(e) => setFormPonPorts(Number(e.target.value))}
                        className="w-full h-[36px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-slate-600 outline-none shadow-sm"
                      >
                        <option value={2}>2 Port PON</option>
                        <option value={4}>4 Port PON</option>
                        <option value={8}>8 Port PON</option>
                        <option value={16}>16 Port PON</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 sm:col-span-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      placeholder="192.168.1.1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                      Web Port
                    </label>
                    <input
                      type="number"
                      value={formWebPort}
                      onChange={(e) => setFormWebPort(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block mb-1">
                      CLI Port
                    </label>
                    <input
                      type="number"
                      value={formCliPort}
                      onChange={(e) => setFormCliPort(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-slate-400 dark:focus:border-slate-600 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 force-white"
                  >
                    {editingDeviceId ? 'Simpan Perubahan' : 'Pasang Perangkat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
