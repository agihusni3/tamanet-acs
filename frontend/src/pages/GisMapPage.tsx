import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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
  Search,
  Server,
  Cable,
  Settings as SettingsIcon,
  List,
  Map as MapIcon,
  Radio,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

// Koordinat Asli Air Naningan, Tanggamus, Lampung sesuai gambar user
const CENTER_LNG = 104.7180;
const CENTER_LAT = -5.2088;

// Data Titik Jaringan FTTH sesuai landmark pada tangkapan layar user
const NETWORK_NODES = [
  // Server & ODC
  { id: 'srv-1', name: 'NOC / OLT Pusat Air Naningan', type: 'SERVER', lng: 104.7135, lat: -5.2045, color: '#A855F7' },
  { id: 'odc-1', name: 'ODC 01 Simpang Pasar', type: 'ODC', capacity: 48, used: 28, lng: 104.7160, lat: -5.2065, color: '#2563EB' },
  { id: 'odc-2', name: 'ODC 02 Sukajadi', type: 'ODC', capacity: 48, used: 22, lng: 104.7205, lat: -5.2095, color: '#2563EB' },

  // ODP Nodes (Cyan Lock/Distribution Points)
  { id: 'odp-1', name: 'ODP-AN-01 (Masjid Syafiul Anam)', type: 'ODP', capacity: 16, used: 12, lng: 104.7145, lat: -5.2052, color: '#06B6D4' },
  { id: 'odp-2', name: 'ODP-AN-02 (Lapangan Sepak Bola)', type: 'ODP', capacity: 16, used: 14, lng: 104.7158, lat: -5.2072, color: '#06B6D4' },
  { id: 'odp-3', name: 'ODP-AN-03 (Rumah Baca Pada Suka)', type: 'ODP', capacity: 16, used: 8, lng: 104.7175, lat: -5.2060, color: '#06B6D4' },
  { id: 'odp-4', name: 'ODP-AN-04 (Pasar Baru Sukajadi)', type: 'ODP', capacity: 16, used: 15, lng: 104.7200, lat: -5.2085, color: '#06B6D4' },
  { id: 'odp-5', name: 'ODP-AN-05 (SMPN 1 Air Naningan)', type: 'ODP', capacity: 16, used: 10, lng: 104.7225, lat: -5.2105, color: '#06B6D4' },
  { id: 'odp-6', name: 'ODP-AN-06 (SDN 3 Air Kubang)', type: 'ODP', capacity: 8, used: 7, lng: 104.7245, lat: -5.2120, color: '#06B6D4' },
  { id: 'odp-7', name: 'ODP-AN-07 (Bumi Perkemahan)', type: 'ODP', capacity: 8, used: 6, lng: 104.7260, lat: -5.2140, color: '#06B6D4' },
  { id: 'odp-8', name: 'ODP-AN-08 (SDN 1 Air Kubang)', type: 'ODP', capacity: 16, used: 13, lng: 104.7280, lat: -5.2165, color: '#06B6D4' },
  { id: 'odp-9', name: 'ODP-AN-09 (Talang 20)', type: 'ODP', capacity: 8, used: 5, lng: 104.7215, lat: -5.2040, color: '#06B6D4' },

  // ONT Pelanggan (Hijau Normal, Kuning Redaman Buruk, Merah Offline)
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
    lng: 104.7240,
    lat: -5.2035,
    color: '#10B981',
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
    lng: 104.7255,
    lat: -5.2050,
    color: '#10B981',
  },
  {
    id: 'ont-3',
    name: 'Warung Dewa',
    type: 'ONT',
    serial: '5A494D4C00010203',
    model: 'Zimlink ZM-G100',
    status: 'ONLINE',
    rxPower: '-24.60', // Kuning (Warning)
    wanIp: '10.10.20.103',
    uptime: '1d 04h',
    lng: 104.7150,
    lat: -5.2078,
    color: '#F59E0B',
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
    lng: 104.7275,
    lat: -5.2150,
    color: '#EF4444',
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
    lng: 104.7235,
    lat: -5.2115,
    color: '#10B981',
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
    lng: 104.7290,
    lat: -5.2180,
    color: '#10B981',
  },
];

// Jalur Kabel Fiber Optik (GeoJSON LineString menghubungkan antar aset)
const FIBER_LINES_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Feeder OLT to ODC 01', color: '#3B82F6' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.7135, -5.2045],
          [104.7145, -5.2052],
          [104.7160, -5.2065],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Distribution ODC 01 to ODC 02', color: '#8B5CF6' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.7160, -5.2065],
          [104.7175, -5.2075],
          [104.7205, -5.2095],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Branch to Talang 20', color: '#06B6D4' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.7160, -5.2065],
          [104.7185, -5.2050],
          [104.7215, -5.2040],
          [104.7240, -5.2035],
          [104.7255, -5.2050],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Distribution South (Air Kubang)', color: '#3B82F6' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [104.7205, -5.2095],
          [104.7225, -5.2105],
          [104.7245, -5.2120],
          [104.7260, -5.2140],
          [104.7275, -5.2150],
          [104.7280, -5.2165],
          [104.7290, -5.2180],
        ],
      },
    },
  ],
};

export const GisMapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list' | 'settings'>('map');
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Layer filter state
  const [showServer, setShowServer] = useState(true);
  const [showOdc, setShowOdc] = useState(true);
  const [showOdp, setShowOdp] = useState(true);
  const [showOnt, setShowOnt] = useState(true);
  const [showLines, setShowLines] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Bersihkan map instance lama jika ada
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    // Inisialisasi Peta MapLibre GL dengan Google Hybrid Satellite Tiles (Satelit + Label Jalan seperti di foto)
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'google-hybrid': {
            type: 'raster',
            tiles: [
              'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'google-hybrid-layer',
            type: 'raster',
            source: 'google-hybrid',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [CENTER_LNG, CENTER_LAT], // Posisi pas di Air Naningan, Tanggamus
      zoom: 15.2,
      pitch: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');

    map.on('load', () => {
      setMapLoaded(true);
      map.resize();

      // 1. Tambahkan GeoJSON Layer Garis Fiber Optik (Polyline)
      map.addSource('fiber-lines', {
        type: 'geojson',
        data: FIBER_LINES_GEOJSON,
      });

      // Garis Glow / Outline Kabel
      map.addLayer({
        id: 'fiber-lines-glow',
        type: 'line',
        source: 'fiber-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#60A5FA',
          'line-width': 6,
          'line-opacity': 0.4,
        },
      });

      // Garis Inti Kabel (Dashed / Solid)
      map.addLayer({
        id: 'fiber-lines-core',
        type: 'line',
        source: 'fiber-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#93C5FD',
          'line-width': 2.5,
          'line-dasharray': [2, 1], // Efek garis putus-putus seperti di foto
        },
      });

      // 2. Render Markers Aset & Perangkat di Atas Peta
      NETWORK_NODES.forEach((node) => {
        const el = document.createElement('div');
        el.className = 'network-marker group relative cursor-pointer flex items-center justify-center transition-transform hover:scale-125';

        if (node.type === 'SERVER') {
          el.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xl ring-2 ring-white">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded bg-dark-900/90 text-[10px] text-white font-bold border border-slate-700 shadow-md">
              ${node.name}
            </div>
          `;
        } else if (node.type === 'ODC') {
          el.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl ring-2 ring-white">
              <span class="text-[9px] font-extrabold font-mono">ODC</span>
            </div>
          `;
        } else if (node.type === 'ODP') {
          el.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
          `;
        } else if (node.type === 'ONT') {
          const isOffline = node.status === 'OFFLINE';
          const isWarn = node.status === 'ONLINE' && parseFloat(node.rxPower) < -24.0;
          const bgCol = isOffline ? 'bg-rose-600' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';
          const pulseCol = isOffline ? 'animate-ping' : '';

          el.innerHTML = `
            <div class="w-6 h-6 rounded-full ${bgCol} text-white flex items-center justify-center shadow-xl ring-2 ring-white ${pulseCol}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            </div>
            <div class="absolute -top-5 whitespace-nowrap px-1.5 py-0.5 rounded bg-dark-900/90 text-[10px] text-slate-100 font-semibold border border-slate-700 shadow-md">
              ${node.name}
            </div>
          `;

          el.addEventListener('click', () => {
            setSelectedDevice(node);
          });
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([node.lng, node.lat])
          .addTo(map);
      });
    });

    // Panggil map.resize() secara berkala pada awal render untuk mencegah blank canvas
    const timer = setTimeout(() => {
      map.resize();
    }, 250);

    mapInstance.current = map;

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-dark-900 overflow-hidden select-none">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Controls Bar (Matching TAMA NETWORK Screenshot Exactly) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto bg-dark-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Server</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ODC</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ODP</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>ONT</span>
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Fiber Line</span>
          </button>
        </div>

        {/* Right View Mode Switcher (Map, List, Settings) */}
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

      {/* Slide-over Device Detail Panel (Muncul Saat Marker ONT Diklik) */}
      {selectedDevice && (
        <div className="absolute top-20 right-4 w-96 bg-dark-800/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-5 shadow-2xl space-y-4 z-30 animate-slideIn">
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
