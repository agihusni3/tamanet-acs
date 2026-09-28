import React, { useState } from 'react';
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
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

const SAMPLE_DEVICES = [
  {
    id: 'd1',
    serial: '4857544312345678',
    mac: '00:25:9E:AA:11:01',
    customerName: 'Rumah Nanang',
    customerNo: 'CUST-001',
    manufacturer: 'Huawei',
    model: 'HG8245H5',
    status: 'ONLINE',
    rxPowerAcs: '-19.45',
    wanIp: '10.10.20.101',
    uptime: '14h 22m',
  },
  {
    id: 'd2',
    serial: '4857544387654321',
    mac: '00:25:9E:AA:11:02',
    customerName: 'Teguh Brothers Farm',
    customerNo: 'CUST-002',
    manufacturer: 'Huawei',
    model: 'EG8145V5 Dual-Band',
    status: 'ONLINE',
    rxPowerAcs: '-21.30',
    wanIp: '10.10.20.102',
    uptime: '3d 10h',
  },
  {
    id: 'd3',
    serial: '5A494D4C00010203',
    mac: '00:25:9E:AA:11:03',
    customerName: 'Warung Dewa',
    customerNo: 'CUST-003',
    manufacturer: 'Zimlink',
    model: 'ZM-G100',
    status: 'ONLINE',
    rxPowerAcs: '-24.60',
    wanIp: '10.10.20.103',
    uptime: '1d 04h',
  },
  {
    id: 'd4',
    serial: '4857544399887766',
    mac: '00:25:9E:AA:11:04',
    customerName: 'Lapak Rudy Sayur',
    customerNo: 'CUST-004',
    manufacturer: 'Huawei',
    model: 'HG8546M',
    status: 'OFFLINE',
    rxPowerAcs: 'LOS',
    wanIp: '10.10.20.104',
    uptime: 'Offline',
  },
  {
    id: 'd5',
    serial: '4857544344556677',
    mac: '00:25:9E:AA:11:05',
    customerName: 'Bumi Perkemahan Air Kubang',
    customerNo: 'CUST-005',
    manufacturer: 'Huawei',
    model: 'HG8245H',
    status: 'ONLINE',
    rxPowerAcs: '-20.15',
    wanIp: '10.10.20.105',
    uptime: '6d 18h',
  },
];

export const DevicesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [activeModal, setActiveModal] = useState<{
    device: any;
    actionType: 'reboot' | 'factoryReset' | 'wifi' | 'pppoe' | 'refresh';
  } | null>(null);

  const filteredDevices = SAMPLE_DEVICES.filter((d) => {
    const matchSearch =
      d.serial.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.wanIp.includes(search);
    const matchVendor = selectedVendor === 'ALL' || d.manufacturer.toUpperCase() === selectedVendor;
    const matchStatus = selectedStatus === 'ALL' || d.status === selectedStatus;
    return matchSearch && matchVendor && matchStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Manajemen Modem ONT (TR-069)</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Kelola konfigurasi Wi-Fi, akun PPPoE, dan remote reboot seluruh modem pelanggan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 bg-dark-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan NBI</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-dark-800 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari SN, Nama Pelanggan, atau IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Merek:</span>
          </div>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="bg-dark-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Semua Merek</option>
            <option value="HUAWEI">Huawei</option>
            <option value="ZIMLINK">Zimlink</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-dark-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-dark-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-900/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Serial Number / MAC</th>
                <th className="py-3.5 px-4">Model Modem</th>
                <th className="py-3.5 px-4">Status & Uptime</th>
                <th className="py-3.5 px-4">Sinyal RX (dBm)</th>
                <th className="py-3.5 px-4">IP WAN</th>
                <th className="py-3.5 px-4 text-right">Aksi Remote</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDevices.map((dev) => {
                let rxNum = parseFloat(dev.rxPowerAcs);
                return (
                  <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">{dev.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{dev.customerNo}</div>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="text-slate-200 font-semibold">{dev.serial}</div>
                      <div className="text-[10px] text-slate-400">{dev.mac}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {dev.model}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {dev.status === 'ONLINE' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span className="text-emerald-400 font-medium">Online</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span className="text-rose-400 font-medium">Offline</span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{dev.uptime}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {dev.rxPowerAcs === 'LOS' ? (
                        <span className="text-rose-400">LOS</span>
                      ) : rxNum < -24.0 ? (
                        <span className="text-amber-400">{dev.rxPowerAcs} dBm</span>
                      ) : (
                        <span className="text-emerald-400">{dev.rxPowerAcs} dBm</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">{dev.wanIp}</td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveModal({ device: dev, actionType: 'reboot' })}
                          title="Reboot Modem"
                          className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-colors"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActiveModal({ device: dev, actionType: 'wifi' })}
                          title="Ganti Wi-Fi"
                          className="p-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-lg transition-colors"
                        >
                          <Wifi className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActiveModal({ device: dev, actionType: 'refresh' })}
                          title="Refresh TR-069"
                          className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActiveModal({ device: dev, actionType: 'factoryReset' })}
                          title="Reset Pabrik"
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                        >
                          <Sliders className="w-3.5 h-3.5" />
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

      {/* Modal Dialog */}
      {activeModal && (
        <RemoteActionModal
          device={activeModal.device}
          actionType={activeModal.actionType}
          onClose={() => setActiveModal(null)}
          onSuccess={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
