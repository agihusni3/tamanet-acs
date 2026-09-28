import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  Layers,
  MapPin,
  Wifi,
  Activity,
  Power,
  RotateCcw,
  Sliders,
  X,
  Plus,
  Radio,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

// Mock Geo Data disesuaikan dengan area Air Naningan, Tanggamus, Lampung sesuai gambar user
const MOCK_MAP_ASSETS = [
  { id: 'server-1', name: 'NOC / OLT Hioso Pusat', type: 'SERVER', lng: 104.6225, lat: -5.3520 },
  { id: 'odc-1', name: 'ODC 01 Simpang Pasar', type: 'ODC', capacity: 48, used: 24, lng: 104.6250, lat: -5.3540 },
  { id: 'odp-1', name: 'ODP-AN-01 (Kluwus)', type: 'ODP', capacity: 16, used: 12, lng: 104.6280, lat: -5.3560 },
  { id: 'odp-2', name: 'ODP-AN-02 (Margomulyo)', type: 'ODP', capacity: 16, used: 15, lng: 104.6210, lat: -5.3580 },
  { id: 'odp-3', name: 'ODP-AN-03 (Air Kubang)', type: 'ODP', capacity: 8, used: 7, lng: 104.6320, lat: -5.3620 },
];

const MOCK_MAP_DEVICES = [
  {
    id: 'dev-1',
    serial: '4857544312345678',
    customerName: 'Rumah Nanang',
    model: 'Huawei HG8245H5',
    status: 'ONLINE',
    rxPower: '-19.45',
    wanIp: '10.10.20.101',
    uptime: '14h 22m',
    lng: 104.6285,
    lat: -5.3565,
  },
  {
    id: 'dev-2',
    serial: '4857544387654321',
    customerName: 'Teguh Brothers Farm',
    model: 'Huawei EG8145V5',
    status: 'ONLINE',
    rxPower: '-21.30',
    wanIp: '10.10.20.102',
    uptime: '3d 10h',
    lng: 104.6295,
    lat: -5.3570,
  },
  {
    id: 'dev-3',
    serial: '5A494D4C00010203',
    customerName: 'Warung Dewa',
    model: 'Zimlink ZM-G100',
    status: 'ONLINE',
    rxPower: '-24.60', // Kuning (warning)
    wanIp: '10.10.20.103',
    uptime: '1d 04h',
    lng: 104.6205,
    lat: -5.3578,
  },
  {
    id: 'dev-4',
    serial: '4857544399887766',
    customerName: 'Lapak Rudy Sayur',
    model: 'Huawei HG8546M',
    status: 'OFFLINE', // Merah
    rxPower: 'LOS',
    wanIp: '10.10.20.104',
    uptime: 'Offline',
    lng: 104.6325,
    lat: -5.3625,
  },
];

export const GisMapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);

  // Layer Toggles
  const [showServer, setShowServer] = useState(true);
  const [showOdc, setShowOdc] = useState(true);
  const [showOdp, setShowOdp] = useState(true);
  const [showOnt, setShowOnt] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Inisialisasi Peta Satelit MapLibre GL (Esri Satellite Layer)
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [104.6265, -5.3570], // Koordinat Air Naningan, Tanggamus
      zoom: 14.5,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    map.on('load', () => {
      // 1. Tambah Marker Aset Jaringan (Server, ODC, ODP)
      MOCK_MAP_ASSETS.forEach((asset) => {
        const el = document.createElement('div');
        el.className = 'w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-125';

        if (asset.type === 'SERVER') {
          el.className += ' bg-purple-600 text-white ring-2 ring-purple-300';
          el.innerHTML = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>';
        } else if (asset.type === 'ODC') {
          el.className += ' bg-blue-600 text-white ring-2 ring-blue-300';
          el.innerHTML = '<span class="text-[9px] font-extrabold font-mono">ODC</span>';
        } else {
          el.className += ' bg-cyan-500 text-white ring-2 ring-cyan-200';
          el.innerHTML = '<span class="text-[9px] font-extrabold font-mono">ODP</span>';
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([asset.lng, asset.lat])
          .addTo(map);
      });

      // 2. Tambah Marker ONT / Pelanggan (Warna Sinyal Hijau, Kuning, Merah)
      MOCK_MAP_DEVICES.forEach((dev) => {
        const el = document.createElement('div');
        el.className = 'w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-xl transition-transform hover:scale-125 ring-2 ring-white/80';

        let rxNum = parseFloat(dev.rxPower);
        if (dev.status === 'OFFLINE') {
          el.className += ' bg-rose-600 text-white animate-pulse'; // Merah offline
        } else if (rxNum < -24.0) {
          el.className += ' bg-amber-500 text-white'; // Kuning redaman tinggi
        } else {
          el.className += ' bg-emerald-500 text-white'; // Hijau normal
        }

        el.innerHTML = '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>';

        el.addEventListener('click', () => {
          setSelectedDevice(dev);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([dev.lng, dev.lat])
          .addTo(map);
      });
    });

    mapInstance.current = map;

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-dark-900 overflow-hidden select-none">
      {/* Peta Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Floating Controls (Layer Filters) */}
      <div className="absolute top-4 left-16 bg-dark-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <button
          onClick={() => setShowServer(!showServer)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            showServer ? 'bg-purple-600 text-white' : 'bg-dark-900 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-300"></span>
          <span>Server / OLT</span>
        </button>

        <button
          onClick={() => setShowOdc(!showOdc)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            showOdc ? 'bg-blue-600 text-white' : 'bg-dark-900 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-300"></span>
          <span>ODC</span>
        </button>

        <button
          onClick={() => setShowOdp(!showOdp)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            showOdp ? 'bg-cyan-600 text-white' : 'bg-dark-900 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-300"></span>
          <span>ODP</span>
        </button>

        <button
          onClick={() => setShowOnt(!showOnt)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            showOnt ? 'bg-emerald-600 text-white' : 'bg-dark-900 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
          <span>ONT Pelanggan</span>
        </button>
      </div>

      {/* Slide-over Device Detail Panel (Drawer Saat Marker ONT Diklik) */}
      {selectedDevice && (
        <div className="absolute top-4 right-4 w-96 bg-dark-800/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-5 shadow-2xl space-y-4 animate-slideIn">
          {/* Header Panel */}
          <div className="flex items-start justify-between border-b border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedDevice.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                  }`}
                ></span>
                <h3 className="text-sm font-bold text-slate-100">{selectedDevice.customerName}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedDevice.serial}</p>
            </div>
            <button
              onClick={() => setSelectedDevice(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sinyal Optik & Info Card */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">RX Power Optik</span>
              <div className="text-base font-extrabold font-mono mt-0.5 text-emerald-400 flex items-center gap-1">
                {selectedDevice.rxPower} <span className="text-[10px] text-slate-400">dBm</span>
              </div>
            </div>

            <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">IP WAN PPPoE</span>
              <div className="text-xs font-bold font-mono mt-1 text-slate-200 truncate">
                {selectedDevice.wanIp}
              </div>
            </div>

            <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipe Perangkat</span>
              <div className="text-xs font-semibold text-slate-300 mt-1 truncate">
                {selectedDevice.model}
              </div>
            </div>

            <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Device Uptime</span>
              <div className="text-xs font-semibold font-mono text-slate-300 mt-1">
                {selectedDevice.uptime}
              </div>
            </div>
          </div>

          {/* Quick Remote Action Buttons Langsung dari Peta */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Aksi Remote Cepat
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveAction('reboot')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-600/15 border border-amber-500/30 hover:bg-amber-600/25 text-amber-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Reboot</span>
              </button>

              <button
                onClick={() => setActiveAction('wifi')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-brand-600/15 border border-brand-500/30 hover:bg-brand-600/25 text-brand-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Ganti Wi-Fi</span>
              </button>

              <button
                onClick={() => setActiveAction('refresh')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-cyan-600/15 border border-cyan-500/30 hover:bg-cyan-600/25 text-cyan-300 rounded-xl text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh Inform</span>
              </button>

              <button
                onClick={() => setActiveAction('factoryReset')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/25 text-rose-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Reset Modem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog Eksekusi Aksi Remote */}
      {activeAction && selectedDevice && (
        <RemoteActionModal
          device={selectedDevice}
          actionType={activeAction}
          onClose={() => setActiveAction(null)}
          onSuccess={() => setActiveAction(null)}
        />
      )}
    </div>
  );
};
