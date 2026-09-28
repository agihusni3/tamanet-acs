import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Plus,
  Power,
  Wifi,
  RotateCcw,
  Sliders,
  X,
  Map as MapIcon,
  List,
  Settings as SettingsIcon,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

// Koordinat Presisi Air Naningan, Tanggamus, Lampung sesuai gambar user
const CENTER_LAT = -5.2088;
const CENTER_LNG = 104.7180;

// Data Titik Node Jaringan (ODC, ODP, ONT, POI)
const NETWORK_NODES = [
  // Server Pusat
  { id: 'srv-1', name: 'NOC / OLT Hioso Pusat', type: 'SERVER', lat: -5.2045, lng: 104.7135 },

  // ODC Nodes
  { id: 'odc-1', name: 'ODC 01 Simpang Pasar', type: 'ODC', capacity: 48, used: 28, lat: -5.2065, lng: 104.7160 },
  { id: 'odc-2', name: 'ODC 02 Sukajadi', type: 'ODC', capacity: 48, used: 22, lat: -5.2095, lng: 104.7205 },

  // ODP Nodes (Cyan)
  { id: 'odp-1', name: 'ODP-AN-01 (Masjid Syafiul Anam)', type: 'ODP', capacity: 16, used: 12, lat: -5.2052, lng: 104.7145 },
  { id: 'odp-2', name: 'ODP-AN-02 (Lapangan Sepak Bola)', type: 'ODP', capacity: 16, used: 14, lat: -5.2072, lng: 104.7158 },
  { id: 'odp-3', name: 'ODP-AN-03 (Rumah Baca Pada Suka)', type: 'ODP', capacity: 16, used: 8, lat: -5.2060, lng: 104.7175 },
  { id: 'odp-4', name: 'ODP-AN-04 (Pasar Baru Sukajadi)', type: 'ODP', capacity: 16, used: 15, lat: -5.2085, lng: 104.7200 },
  { id: 'odp-5', name: 'ODP-AN-05 (SMPN 1 Air Naningan)', type: 'ODP', capacity: 16, used: 10, lat: -5.2105, lng: 104.7225 },
  { id: 'odp-6', name: 'ODP-AN-06 (SDN 3 Air Kubang)', type: 'ODP', capacity: 8, used: 7, lat: -5.2120, lng: 104.7245 },
  { id: 'odp-7', name: 'ODP-AN-07 (Bumi Perkemahan)', type: 'ODP', capacity: 8, used: 6, lat: -5.2140, lng: 104.7260 },
  { id: 'odp-8', name: 'ODP-AN-08 (SDN 1 Air Kubang)', type: 'ODP', capacity: 16, used: 13, lat: -5.2165, lng: 104.7280 },
  { id: 'odp-9', name: 'ODP-AN-09 (Talang 20)', type: 'ODP', capacity: 8, used: 5, lat: -5.2040, lng: 104.7215 },
  { id: 'odp-10', name: 'ODP-AN-10 (Margomulyo)', type: 'ODP', capacity: 16, used: 11, lat: -5.2090, lng: 104.7130 },

  // POI Pins Landmark (Sesuai Screenshot User)
  { id: 'poi-1', name: 'Talang 20, Air Naningan', type: 'POI', color: '#F97316', lat: -5.2038, lng: 104.7210 },
  { id: 'poi-2', name: 'Air Terjun Keramat Sari', type: 'POI', color: '#A855F7', lat: -5.2065, lng: 104.7275 },
  { id: 'poi-3', name: 'Spot Mancing', type: 'POI', color: '#EC4899', lat: -5.2075, lng: 104.7330 },

  // ONT Pelanggan (Hijau Online, Kuning Warning, Merah Offline)
  {
    id: 'ont-1',
    name: 'Rumah Nanang',
    type: 'ONT',
    serial: '4857544312345678',
    model: 'Huawei EchoLife HG8245H5',
    status: 'ONLINE',
    rxPower: '-19.45',
    wanIp: '10.10.20.101',
    uptime: '14h 22m',
    lat: -5.2035,
    lng: 104.7240,
  },
  {
    id: 'ont-2',
    name: 'Teguh Brothers Farm',
    type: 'ONT',
    serial: '4857544387654321',
    model: 'Huawei OptiXstar EG8145V5',
    status: 'ONLINE',
    rxPower: '-21.30',
    wanIp: '10.10.20.102',
    uptime: '3d 10h',
    lat: -5.2050,
    lng: 104.7255,
  },
  {
    id: 'ont-3',
    name: 'Warung Dewa',
    type: 'ONT',
    serial: '5A494D4C00010203',
    model: 'Zimlink ZM-G100',
    status: 'ONLINE',
    rxPower: '-24.60', // Warning (Kuning)
    wanIp: '10.10.20.103',
    uptime: '1d 04h',
    lat: -5.2078,
    lng: 104.7150,
  },
  {
    id: 'ont-4',
    name: 'Lapak Rudy Sayur',
    type: 'ONT',
    serial: '4857544399887766',
    model: 'Huawei HG8546M',
    status: 'OFFLINE', // Merah
    rxPower: 'LOS',
    wanIp: '10.10.20.104',
    uptime: 'Offline',
    lat: -5.2150,
    lng: 104.7275,
  },
  {
    id: 'ont-5',
    name: 'Kluwus Outdoor Equipment',
    type: 'ONT',
    serial: '4857544311223344',
    model: 'Huawei HG8245H',
    status: 'ONLINE',
    rxPower: '-18.80',
    wanIp: '10.10.20.105',
    uptime: '5d 12h',
    lat: -5.2115,
    lng: 104.7235,
  },
  {
    id: 'ont-6',
    name: 'Rumah Linda',
    type: 'ONT',
    serial: '4857544355667788',
    model: 'Huawei HG8546M5',
    status: 'ONLINE',
    rxPower: '-20.10',
    wanIp: '10.10.20.106',
    uptime: '2d 08h',
    lat: -5.2180,
    lng: 104.7290,
  },
];

// Jalur Kabel Optik (Lines)
const FIBER_ROUTES: [number, number][][] = [
  // Jalur Utama dari OLT ke ODC 01 & Sukajadi
  [
    [-5.2045, 104.7135],
    [-5.2052, 104.7145],
    [-5.2065, 104.7160],
    [-5.2075, 104.7175],
    [-5.2095, 104.7205],
  ],
  // Cabang Talang 20 ke arah Timur
  [
    [-5.2065, 104.7160],
    [-5.2050, 104.7185],
    [-5.2040, 104.7215],
    [-5.2035, 104.7240],
    [-5.2050, 104.7255],
    [-5.2065, 104.7275],
  ],
  // Cabang Selatan ke arah Air Kubang
  [
    [-5.2095, 104.7205],
    [-5.2105, 104.7225],
    [-5.2120, 104.7245],
    [-5.2140, 104.7260],
    [-5.2150, 104.7275],
    [-5.2165, 104.7280],
    [-5.2180, 104.7290],
  ],
  // Cabang Barat Margomulyo
  [
    [-5.2065, 104.7160],
    [-5.2078, 104.7150],
    [-5.2090, 104.7130],
  ],
];

export const GisMapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list' | 'settings'>('map');
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Bersihkan map instance lama jika sudah ada
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Inisialisasi Leaflet Map dengan Zoom Control Default (Sama persis seperti gambar user)
    const map = L.map(mapContainer.current, {
      center: [CENTER_LAT, CENTER_LNG],
      zoom: 15,
      zoomControl: true,
    });

    // Layer Satelit Google Hybrid (Citra Satelit + Nama Jalan & Tempat Resmi)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Hybrid',
    }).addTo(map);

    // 1. Gambar Garis Jalur Kabel Fiber Optik (Fiber Lines)
    FIBER_ROUTES.forEach((route) => {
      // Garis Glow luar
      L.polyline(route, {
        color: '#3B82F6',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Garis Inti Putus-putus
      L.polyline(route, {
        color: '#93C5FD',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.95,
      }).addTo(map);
    });

    // 2. Render Marker Aset & Perangkat
    NETWORK_NODES.forEach((node) => {
      let iconHtml = '';

      if (node.type === 'SERVER') {
        iconHtml = `
          <div style="background-color: #A855F7; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2px solid #ffffff;">
            <svg style="width: 16px; height: 16px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          </div>
        `;
      } else if (node.type === 'ODC') {
        iconHtml = `
          <div style="background-color: #2563EB; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border: 2px solid #ffffff;">
            <span style="color: white; font-size: 8px; font-weight: 900; font-family: monospace;">ODC</span>
          </div>
        `;
      } else if (node.type === 'ODP') {
        iconHtml = `
          <div style="background-color: #06B6D4; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border: 2px solid #ffffff;">
            <svg style="width: 12px; height: 12px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        `;
      } else if (node.type === 'POI') {
        iconHtml = `
          <div style="background-color: ${node.color || '#F97316'}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border: 2px solid #ffffff;">
            <svg style="width: 12px; height: 12px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `;
      } else if (node.type === 'ONT') {
        const isOffline = node.status === 'OFFLINE';
        const isWarn = node.status === 'ONLINE' && parseFloat(node.rxPower) < -24.0;
        const bgCol = isOffline ? '#DC2626' : isWarn ? '#D97706' : '#10B981';

        iconHtml = `
          <div style="background-color: ${bgCol}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2px solid #ffffff;">
            <svg style="width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(map);

      // Label tooltip saat hover
      marker.bindTooltip(`<b>${node.name}</b>`, {
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip',
      });

      if (node.type === 'ONT') {
        marker.on('click', () => {
          setSelectedDevice(node);
        });
      }
    });

    // Invalidate size agar tidak ada visual glitch
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-dark-900 overflow-hidden select-none">
      {/* Container Peta Leaflet */}
      <div ref={mapContainer} className="w-full h-full z-0" />

      {/* Top Header Buttons (Sama Persis TAMA NETWORK) */}
      <div className="absolute top-3 left-16 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Tombol Quick Action */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-dark-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Server</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ODC</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ODP</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ONT</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Fiber Line</span>
          </button>
        </div>

        {/* Switcher Map | List | Settings */}
        <div className="flex items-center pointer-events-auto bg-dark-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-2xl">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'map' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            onClick={() => setViewMode('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'settings' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Slide-over Device Detail Panel (Drawer Saat Titik Diklik) */}
      {selectedDevice && (
        <div className="absolute top-20 right-4 w-96 bg-dark-800/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-5 shadow-2xl space-y-4 z-[1001] animate-slideIn">
          <div className="flex items-start justify-between border-b border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedDevice.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'
                  }`}
                ></span>
                <h3 className="text-sm font-bold text-slate-100">{selectedDevice.name}</h3>
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
