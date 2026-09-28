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
  Check,
  MapPin,
  Trash2,
  Navigation,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

// Koordinat Presisi Air Naningan, Tanggamus, Lampung
const CENTER_LAT = -5.2088;
const CENTER_LNG = 104.7180;

interface MapNode {
  id: string;
  name: string;
  type: 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'POI';
  lat: number;
  lng: number;
  capacity?: number;
  used?: number;
  serial?: string;
  model?: string;
  status?: string;
  rxPower?: string;
  wanIp?: string;
  uptime?: string;
  color?: string;
}

interface FiberRoute {
  id: string;
  name: string;
  coords: [number, number][];
}

const INITIAL_NODES: MapNode[] = [
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

  // POI Pins Landmark
  { id: 'poi-1', name: 'Talang 20, Air Naningan', type: 'POI', color: '#F97316', lat: -5.2038, lng: 104.7210 },
  { id: 'poi-2', name: 'Air Terjun Keramat Sari', type: 'POI', color: '#A855F7', lat: -5.2065, lng: 104.7275 },
  { id: 'poi-3', name: 'Spot Mancing', type: 'POI', color: '#EC4899', lat: -5.2075, lng: 104.7330 },

  // ONT Pelanggan
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
    rxPower: '-24.60',
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
    status: 'OFFLINE',
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

const INITIAL_ROUTES: FiberRoute[] = [
  {
    id: 'route-1',
    name: 'Feeder OLT ke ODC 01 & Sukajadi',
    coords: [
      [-5.2045, 104.7135],
      [-5.2052, 104.7145],
      [-5.2065, 104.7160],
      [-5.2075, 104.7175],
      [-5.2095, 104.7205],
    ],
  },
  {
    id: 'route-2',
    name: 'Distribusi Talang 20',
    coords: [
      [-5.2065, 104.7160],
      [-5.2050, 104.7185],
      [-5.2040, 104.7215],
      [-5.2035, 104.7240],
      [-5.2050, 104.7255],
      [-5.2065, 104.7275],
    ],
  },
  {
    id: 'route-3',
    name: 'Distribusi Air Kubang',
    coords: [
      [-5.2095, 104.7205],
      [-5.2105, 104.7225],
      [-5.2120, 104.7245],
      [-5.2140, 104.7260],
      [-5.2150, 104.7275],
      [-5.2165, 104.7280],
      [-5.2180, 104.7290],
    ],
  },
  {
    id: 'route-4',
    name: 'Distribusi Margomulyo',
    coords: [
      [-5.2065, 104.7160],
      [-5.2078, 104.7150],
      [-5.2090, 104.7130],
    ],
  },
];

type ActiveTool = 'NONE' | 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'FIBER_LINE' | 'SEARCH';

export const GisMapPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const linesRef = useRef<L.Polyline[]>([]);
  const tempDrawLineRef = useRef<L.Polyline | null>(null);

  const [nodes, setNodes] = useState<MapNode[]>(INITIAL_NODES);
  const [routes, setRoutes] = useState<FiberRoute[]>(INITIAL_ROUTES);

  const [activeTool, setActiveTool] = useState<ActiveTool>('NONE');
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'settings'>('map');
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);

  // Search Dialog State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Drawing Line State
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);

  // Add Node Modal Form State
  const [pendingNode, setPendingNode] = useState<{
    type: 'SERVER' | 'ODC' | 'ODP' | 'ONT';
    lat: number;
    lng: number;
  } | null>(null);

  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('16');
  const [formSerial, setFormSerial] = useState('');
  const [formModel, setFormModel] = useState('Huawei EchoLife HG8245H5');

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapContainer.current, {
      center: [CENTER_LAT, CENTER_LNG],
      zoom: 15,
      zoomControl: true,
    });

    // Tile Layer Satelit Google Hybrid (High Definition + Label Jalan)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Hybrid',
    }).addTo(map);

    mapInstance.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Markers & Lines saat data berubah
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Bersihkan marker lama
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Bersihkan lines lama
    linesRef.current.forEach((l) => l.remove());
    linesRef.current = [];

    // Gambar Garis Kabel Fiber Optik
    routes.forEach((route) => {
      // Glow
      const glow = L.polyline(route.coords, {
        color: '#3B82F6',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Core line
      const core = L.polyline(route.coords, {
        color: '#93C5FD',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.95,
      }).addTo(map);

      core.bindTooltip(`<b>${route.name}</b>`, { direction: 'top' });

      linesRef.current.push(glow, core);
    });

    // Render Markers
    nodes.forEach((node) => {
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
        const isWarn = node.status === 'ONLINE' && parseFloat(node.rxPower || '-20') < -24.0;
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

      let tooltipText = `<b>${node.name}</b>`;
      if (node.type === 'ODC' || node.type === 'ODP') {
        tooltipText += `<br/>Kapasitas: ${node.used || 0}/${node.capacity || 16} Port`;
      } else if (node.type === 'ONT') {
        tooltipText += `<br/>Sinyal: ${node.rxPower} dBm (${node.status})`;
      }

      marker.bindTooltip(tooltipText, {
        direction: 'top',
        offset: [0, -10],
      });

      marker.on('click', () => {
        setSelectedDevice(node);
      });

      markersRef.current.push(marker);
    });
  }, [nodes, routes]);

  // Handle Klik Peta untuk Mode Tambah Aset & Tarik Garis
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (['SERVER', 'ODC', 'ODP', 'ONT'].includes(activeTool)) {
        // Buka form dialog tambah titik baru
        setPendingNode({
          type: activeTool as any,
          lat,
          lng,
        });
        setFormName(
          activeTool === 'SERVER'
            ? 'OLT Baru'
            : activeTool === 'ODC'
            ? `ODC-${nodes.filter((n) => n.type === 'ODC').length + 1}`
            : activeTool === 'ODP'
            ? `ODP-AN-${String(nodes.filter((n) => n.type === 'ODP').length + 1).padStart(2, '0')}`
            : 'Pelanggan Baru'
        );
      } else if (activeTool === 'FIBER_LINE') {
        // Mode Tarik Garis Kabel
        setDrawingCoords((prev) => {
          const next = [...prev, [lat, lng] as [number, number]];

          if (!tempDrawLineRef.current) {
            tempDrawLineRef.current = L.polyline(next, {
              color: '#38BDF8',
              weight: 3,
              dashArray: '5, 5',
            }).addTo(map);
          } else {
            tempDrawLineRef.current.setLatLngs(next);
          }

          return next;
        });
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [activeTool, nodes]);

  // Simpan Node Baru
  const handleSaveNode = () => {
    if (!pendingNode) return;

    const newNode: MapNode = {
      id: `node-${Date.now()}`,
      name: formName || 'Aset Baru',
      type: pendingNode.type,
      lat: pendingNode.lat,
      lng: pendingNode.lng,
      capacity: parseInt(formCapacity, 10) || 16,
      used: 0,
      serial: pendingNode.type === 'ONT' ? formSerial || `48575443${Math.floor(Math.random() * 100000000)}` : undefined,
      model: pendingNode.type === 'ONT' ? formModel : undefined,
      status: pendingNode.type === 'ONT' ? 'ONLINE' : undefined,
      rxPower: pendingNode.type === 'ONT' ? '-20.50' : undefined,
      wanIp: pendingNode.type === 'ONT' ? '10.10.20.150' : undefined,
      uptime: '1h 00m',
    };

    setNodes((prev) => [...prev, newNode]);
    setPendingNode(null);
    setActiveTool('NONE');
  };

  // Simpan Garis Kabel Fiber Baru
  const handleSaveFiberLine = () => {
    if (drawingCoords.length < 2) {
      alert('Minimal klik 2 titik pada peta untuk membuat garis rute kabel.');
      return;
    }

    const newRoute: FiberRoute = {
      id: `route-${Date.now()}`,
      name: `Jalur Kabel Baru #${routes.length + 1}`,
      coords: drawingCoords,
    };

    setRoutes((prev) => [...prev, newRoute]);
    if (tempDrawLineRef.current) {
      tempDrawLineRef.current.remove();
      tempDrawLineRef.current = null;
    }
    setDrawingCoords([]);
    setActiveTool('NONE');
  };

  const handleCancelFiberLine = () => {
    if (tempDrawLineRef.current) {
      tempDrawLineRef.current.remove();
      tempDrawLineRef.current = null;
    }
    setDrawingCoords([]);
    setActiveTool('NONE');
  };

  // Search Results
  const searchResults = nodes.filter((n) =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.serial && n.serial.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleFlyTo = (node: MapNode) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([node.lat, node.lng], 17, { animate: true });
      setSelectedDevice(node);
      setIsSearchOpen(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-dark-900 overflow-hidden select-none">
      {/* Container Peta Leaflet */}
      <div ref={mapContainer} className="w-full h-full z-0" />

      {/* Top Header Buttons (Sama Persis TAMA NETWORK & Berfungsi 100%) */}
      <div className="absolute top-3 left-16 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Tombol Quick Action Aktif */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-dark-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          {/* Tombol Search */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

          {/* Tombol + Server */}
          <button
            onClick={() => setActiveTool(activeTool === 'SERVER' ? 'NONE' : 'SERVER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTool === 'SERVER'
                ? 'bg-purple-500 ring-2 ring-purple-300 text-white shadow-lg'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Server</span>
          </button>

          {/* Tombol + ODC */}
          <button
            onClick={() => setActiveTool(activeTool === 'ODC' ? 'NONE' : 'ODC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTool === 'ODC'
                ? 'bg-blue-500 ring-2 ring-blue-300 text-white shadow-lg'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ODC</span>
          </button>

          {/* Tombol + ODP */}
          <button
            onClick={() => setActiveTool(activeTool === 'ODP' ? 'NONE' : 'ODP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTool === 'ODP'
                ? 'bg-cyan-500 ring-2 ring-cyan-200 text-white shadow-lg'
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ODP</span>
          </button>

          {/* Tombol + ONT */}
          <button
            onClick={() => setActiveTool(activeTool === 'ONT' ? 'NONE' : 'ONT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTool === 'ONT'
                ? 'bg-emerald-500 ring-2 ring-emerald-200 text-white shadow-lg'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ONT</span>
          </button>

          {/* Tombol + Fiber Line */}
          <button
            onClick={() => {
              if (activeTool === 'FIBER_LINE') {
                handleCancelFiberLine();
              } else {
                setActiveTool('FIBER_LINE');
                setDrawingCoords([]);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
              activeTool === 'FIBER_LINE'
                ? 'bg-indigo-500 ring-2 ring-indigo-300 text-white shadow-lg animate-pulse'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Fiber Line</span>
          </button>
        </div>

        {/* Switcher Map | List | Settings */}
        <div className="flex items-center pointer-events-auto bg-dark-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-2xl">
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

      {/* Mode Indicator Banner Saat Tombol Tambah Sedang Aktif */}
      {activeTool !== 'NONE' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-dark-900/95 border border-brand-500 text-brand-300 text-xs px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-bounce">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
          <span>
            {activeTool === 'FIBER_LINE'
              ? `Mode Tarik Kabel Aktif (${drawingCoords.length} titik diklik). Klik peta untuk titik berikutnya.`
              : `Mode Tambah ${activeTool}: Klik sembarang lokasi di peta untuk meletakkan titik.`}
          </span>

          {activeTool === 'FIBER_LINE' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
              <button
                onClick={handleSaveFiberLine}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                Selesai
              </button>
              <button
                onClick={handleCancelFiberLine}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg"
              >
                Batal
              </button>
            </div>
          )}

          {activeTool !== 'FIBER_LINE' && (
            <button
              onClick={() => setActiveTool('NONE')}
              className="text-slate-400 hover:text-white ml-1 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Modal Dialog Form Tambah Titik Baru (Saat Peta Diklik) */}
      {pendingNode && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-dark-800 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Tambah {pendingNode.type} Baru
              </h3>
              <button onClick={() => setPendingNode(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Perangkat / Node</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {(pendingNode.type === 'ODC' || pendingNode.type === 'ODP') && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Kapasitas Port</label>
                  <select
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="8">8 Port</option>
                    <option value="16">16 Port</option>
                    <option value="24">24 Port</option>
                    <option value="48">48 Port</option>
                  </select>
                </div>
              )}

              {pendingNode.type === 'ONT' && (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tipe / Model Modem</label>
                    <select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="Huawei EchoLife HG8245H5">Huawei EchoLife HG8245H5</option>
                      <option value="Huawei OptiXstar EG8145V5">Huawei OptiXstar EG8145V5 (Dual Band)</option>
                      <option value="Huawei EchoLife HG8546M">Huawei EchoLife HG8546M</option>
                      <option value="Zimlink XPON ZM-G100">Zimlink XPON ZM-G100</option>
                      <option value="Zimlink Dual Band ZM-G200">Zimlink Dual Band ZM-G200</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Serial Number (GPON SN)</label>
                    <input
                      type="text"
                      placeholder="Contoh: 48575443..."
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-400 font-mono bg-dark-900 p-2 rounded-lg border border-slate-800">
                Koordinat: {pendingNode.lat.toFixed(5)}, {pendingNode.lng.toFixed(5)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setPendingNode(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNode}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20"
              >
                Simpan Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden space-y-2">
            <div className="p-3 border-b border-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Cari nama ODP, pelanggan, atau SN modem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {searchResults.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 text-center">Tidak ada node yang cocok</div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleFlyTo(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-700/60 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.type} &bull; {item.serial || `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-dark-900 border border-slate-700 text-slate-300">
                      Zoom
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Device Detail Panel (Drawer Saat Node Diklik) */}
      {selectedDevice && (
        <div className="absolute top-20 right-4 w-96 bg-dark-800/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-5 shadow-2xl space-y-4 z-[1001] animate-slideIn">
          <div className="flex items-start justify-between border-b border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedDevice.status === 'OFFLINE'
                      ? 'bg-rose-500 animate-ping'
                      : selectedDevice.type === 'ONT'
                      ? 'bg-emerald-400'
                      : 'bg-cyan-400'
                  }`}
                ></span>
                <h3 className="text-sm font-bold text-slate-100">{selectedDevice.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {selectedDevice.type} &bull; {selectedDevice.serial || `Koordinat: ${selectedDevice.lat.toFixed(4)}, ${selectedDevice.lng.toFixed(4)}`}
              </p>
            </div>
            <button
              onClick={() => setSelectedDevice(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDevice.type === 'ONT' ? (
            <>
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
            </>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Kapasitas Port</span>
                <div className="text-base font-extrabold font-mono text-cyan-400 mt-1">
                  {selectedDevice.used || 0} / {selectedDevice.capacity || 16} Port Terpakai
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{
                      width: `${((selectedDevice.used || 0) / (selectedDevice.capacity || 16)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Port Tersedia</span>
                <div className="text-sm font-bold text-emerald-400 mt-1">
                  {(selectedDevice.capacity || 16) - (selectedDevice.used || 0)} Port Bebas untuk Pasang Baru
                </div>
              </div>
            </div>
          )}
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
