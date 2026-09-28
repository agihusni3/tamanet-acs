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
  Edit2,
  Trash2,
  Server,
  Cable,
  Phone,
  User,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Save,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';

const CENTER_LAT = -5.2088;
const CENTER_LNG = 104.7180;

export interface MapNode {
  id: string;
  name: string;
  type: 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'POI';
  lat: number;
  lng: number;

  // Technical Info Server / OLT
  ip?: string;
  vendor?: string;
  ponType?: string;
  ponPortsCount?: number;
  snmpCommunity?: string;
  uptime?: string;

  // Technical Info ODC & ODP
  capacity?: number;
  used?: number;
  parentName?: string;
  poleLocation?: string;
  splitterRatio?: string;
  avgAttenuation?: string;

  // Technical Info ONT
  customerNo?: string;
  phone?: string;
  address?: string;
  serial?: string;
  mac?: string;
  model?: string;
  status?: string;
  rxPower?: string;
  txPower?: string;
  wanIp?: string;
  pppoeUser?: string;
  packagePlan?: string;

  color?: string;
}

export interface FiberRoute {
  id: string;
  name: string;
  cableType: string;
  coreCount: number;
  lengthMeter: number;
  coords: [number, number][];
}

const INITIAL_NODES: MapNode[] = [
  // 1. Server / OLT Pusat
  {
    id: 'srv-1',
    name: 'NOC / OLT Hioso Pusat',
    type: 'SERVER',
    lat: -5.2045,
    lng: 104.7135,
    ip: '192.168.10.2',
    vendor: 'Hioso EPON V2.0',
    ponType: 'EPON (1.25 Gbps)',
    ponPortsCount: 4,
    snmpCommunity: 'public',
    capacity: 256,
    used: 184,
    uptime: '42 Hari 14 Jam',
    status: 'ONLINE',
  },

  // 2. ODC Nodes
  {
    id: 'odc-1',
    name: 'ODC 01 Simpang Pasar',
    type: 'ODC',
    lat: -5.2065,
    lng: 104.7160,
    parentName: 'NOC / OLT Hioso Pusat (Port EPON0/1)',
    splitterRatio: '1:4 PLC Splitter (Input 4 Core)',
    capacity: 48,
    used: 28,
    avgAttenuation: '-15.80 dBm',
    poleLocation: 'Tiang Besi Pertigaan Pasar Air Naningan',
  },
  {
    id: 'odc-2',
    name: 'ODC 02 Sukajadi',
    type: 'ODC',
    lat: -5.2095,
    lng: 104.7205,
    parentName: 'NOC / OLT Hioso Pusat (Port EPON0/2)',
    splitterRatio: '1:4 PLC Splitter (Input 4 Core)',
    capacity: 48,
    used: 22,
    avgAttenuation: '-16.20 dBm',
    poleLocation: 'Tiang Beton Depan Balai Desa Sukajadi',
  },

  // 3. ODP Nodes
  {
    id: 'odp-1',
    name: 'ODP-AN-01 (Masjid Syafiul Anam)',
    type: 'ODP',
    lat: -5.2052,
    lng: 104.7145,
    parentName: 'ODC 01 Simpang Pasar',
    splitterRatio: '1:16 PLC Splitter',
    capacity: 16,
    used: 12,
    avgAttenuation: '-19.40 dBm',
    poleLocation: 'Tiang PLN Depan Gapura Masjid Syafiul Anam',
  },
  {
    id: 'odp-2',
    name: 'ODP-AN-02 (Lapangan Sepak Bola)',
    type: 'ODP',
    lat: -5.2072,
    lng: 104.7158,
    parentName: 'ODC 01 Simpang Pasar',
    splitterRatio: '1:16 PLC Splitter',
    capacity: 16,
    used: 14,
    avgAttenuation: '-19.80 dBm',
    poleLocation: 'Tiang Barat Lapangan Sepak Bola',
  },
  {
    id: 'odp-3',
    name: 'ODP-AN-03 (Rumah Baca Pada Suka)',
    type: 'ODP',
    lat: -5.2060,
    lng: 104.7175,
    parentName: 'ODC 01 Simpang Pasar',
    splitterRatio: '1:8 PLC Splitter',
    capacity: 8,
    used: 6,
    avgAttenuation: '-20.10 dBm',
    poleLocation: 'Tiang Depan Rumah Baca Pintar',
  },
  {
    id: 'odp-4',
    name: 'ODP-AN-04 (Pasar Baru Sukajadi)',
    type: 'ODP',
    lat: -5.2085,
    lng: 104.7200,
    parentName: 'ODC 02 Sukajadi',
    splitterRatio: '1:16 PLC Splitter',
    capacity: 16,
    used: 15,
    avgAttenuation: '-19.60 dBm',
    poleLocation: 'Tiang Utama Pertokoan Pasar Baru',
  },
  {
    id: 'odp-5',
    name: 'ODP-AN-05 (SMPN 1 Air Naningan)',
    type: 'ODP',
    lat: -5.2105,
    lng: 104.7225,
    parentName: 'ODC 02 Sukajadi',
    splitterRatio: '1:16 PLC Splitter',
    capacity: 16,
    used: 10,
    avgAttenuation: '-20.50 dBm',
    poleLocation: 'Tiang Telepon Seberang Gerbang SMPN 1',
  },
  {
    id: 'odp-6',
    name: 'ODP-AN-06 (SDN 3 Air Kubang)',
    type: 'ODP',
    lat: -5.2120,
    lng: 104.7245,
    parentName: 'ODC 02 Sukajadi',
    splitterRatio: '1:8 PLC Splitter',
    capacity: 8,
    used: 7,
    avgAttenuation: '-21.20 dBm',
    poleLocation: 'Tiang Depan SDN 3 Air Kubang',
  },
  {
    id: 'odp-7',
    name: 'ODP-AN-07 (Bumi Perkemahan)',
    type: 'ODP',
    lat: -5.2140,
    lng: 104.7260,
    parentName: 'ODC 02 Sukajadi',
    splitterRatio: '1:8 PLC Splitter',
    capacity: 8,
    used: 6,
    avgAttenuation: '-21.80 dBm',
    poleLocation: 'Tiang Pintu Masuk Perkemahan',
  },
  {
    id: 'odp-11',
    name: 'ODP-AN-11 Mini (Simpang Keramat)',
    type: 'ODP',
    lat: -5.2070,
    lng: 104.7265,
    parentName: 'ODC 01 Simpang Pasar',
    splitterRatio: '1:2 PLC Splitter (2 Port)',
    capacity: 2,
    used: 1,
    avgAttenuation: '-18.20 dBm',
    poleLocation: 'Tiang Mini Sambungan Drop',
  },

  // 4. ONT Pelanggan
  {
    id: 'ont-1',
    name: 'Rumah Nanang',
    type: 'ONT',
    customerNo: 'CUST-001',
    phone: '0812-3456-7890',
    address: 'Talang 20 RT 03, Air Naningan',
    packagePlan: 'Home Family 30 Mbps',
    parentName: 'ODP-AN-03 (Rumah Baca Pada Suka)',
    serial: '4857544312345678',
    mac: '00:25:9E:AA:11:01',
    model: 'Huawei EchoLife HG8245H5',
    status: 'ONLINE',
    rxPower: '-19.45',
    txPower: '2.15',
    wanIp: '10.10.20.101',
    pppoeUser: 'nanang@isp.net',
    uptime: '14h 22m',
    lat: -5.2035,
    lng: 104.7240,
  },
  {
    id: 'ont-2',
    name: 'Teguh Brothers Farm',
    type: 'ONT',
    customerNo: 'CUST-002',
    phone: '0813-9876-5432',
    address: 'Jalan Raya Peternakan Sukajadi',
    packagePlan: 'Business SOHO 50 Mbps',
    parentName: 'ODP-AN-04 (Pasar Baru Sukajadi)',
    serial: '4857544387654321',
    mac: '00:25:9E:AA:11:02',
    model: 'Huawei OptiXstar EG8145V5 Dual-Band',
    status: 'ONLINE',
    rxPower: '-21.30',
    txPower: '2.00',
    wanIp: '10.10.20.102',
    pppoeUser: 'teguhfarm@isp.net',
    uptime: '3d 10h',
    lat: -5.2050,
    lng: 104.7255,
  },
  {
    id: 'ont-3',
    name: 'Warung Dewa',
    type: 'ONT',
    customerNo: 'CUST-003',
    phone: '0852-1122-3344',
    address: 'Dusun Margomulyo RT 01',
    packagePlan: 'Home Regular 20 Mbps',
    parentName: 'ODP-AN-02 (Lapangan Sepak Bola)',
    serial: '5A494D4C00010203',
    mac: '00:25:9E:AA:11:03',
    model: 'Zimlink XPON ZM-G100',
    status: 'ONLINE',
    rxPower: '-24.60', // Kuning (Warning)
    txPower: '1.85',
    wanIp: '10.10.20.103',
    pppoeUser: 'warungdewa@isp.net',
    uptime: '1d 04h',
    lat: -5.2078,
    lng: 104.7150,
  },
  {
    id: 'ont-4',
    name: 'Lapak Rudy Sayur',
    type: 'ONT',
    customerNo: 'CUST-004',
    phone: '0821-5566-7788',
    address: 'Pasar Baru Air Naningan Kios No. 12',
    packagePlan: 'Home Regular 20 Mbps',
    parentName: 'ODP-AN-07 (Bumi Perkemahan)',
    serial: '4857544399887766',
    mac: '00:25:9E:AA:11:04',
    model: 'Huawei EchoLife HG8546M',
    status: 'OFFLINE',
    rxPower: 'LOS',
    txPower: '0.00',
    wanIp: '10.10.20.104',
    pppoeUser: 'rudysayur@isp.net',
    uptime: 'Offline',
    lat: -5.2150,
    lng: 104.7275,
  },
];

const INITIAL_ROUTES: FiberRoute[] = [
  {
    id: 'route-1',
    name: 'Feeder OLT ke ODC 01 Pasar',
    cableType: 'ADSS 24-Core',
    coreCount: 24,
    lengthMeter: 380,
    coords: [
      [-5.2045, 104.7135],
      [-5.2052, 104.7145],
      [-5.2065, 104.7160],
    ],
  },
  {
    id: 'route-2',
    name: 'Distribusi ODC 01 ke ODC 02 Sukajadi',
    cableType: 'ADSS 12-Core',
    coreCount: 12,
    lengthMeter: 620,
    coords: [
      [-5.2065, 104.7160],
      [-5.2075, 104.7175],
      [-5.2095, 104.7205],
    ],
  },
  {
    id: 'route-3',
    name: 'Distribusi Cabang Timur (Talang 20)',
    cableType: 'Drop Core 4-Core',
    coreCount: 4,
    lengthMeter: 840,
    coords: [
      [-5.2065, 104.7160],
      [-5.2050, 104.7185],
      [-5.2040, 104.7215],
      [-5.2035, 104.7240],
      [-5.2050, 104.7255],
    ],
  },
];

type ActiveTool = 'NONE' | 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'FIBER_LINE';

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
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);

  // Search Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Drawing Line State
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);

  // Create Modal State (Saat klik peta)
  const [pendingNode, setPendingNode] = useState<{
    type: 'SERVER' | 'ODC' | 'ODP' | 'ONT';
    lat: number;
    lng: number;
  } | null>(null);

  // Edit Node Modal State (Update)
  const [editingNode, setEditingNode] = useState<MapNode | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formCapacity, setFormCapacity] = useState('16');
  const [formParent, setFormParent] = useState('');
  const [formSplitter, setFormSplitter] = useState('1:16 PLC Splitter');
  const [formLocation, setFormLocation] = useState('');
  const [formCustomerNo, setFormCustomerNo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formModel, setFormModel] = useState('Huawei EchoLife HG8245H5');
  const [formPackage, setFormPackage] = useState('Home Family 30 Mbps');

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

    // Tile Layer Satelit Google Hybrid (Citra Satelit Resolusi Tinggi + Label Jalan)
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

  // Update Markers & Lines pada Peta
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    linesRef.current.forEach((l) => l.remove());
    linesRef.current = [];

    // Render Garis Fiber
    routes.forEach((route) => {
      const glow = L.polyline(route.coords, {
        color: '#3B82F6',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const core = L.polyline(route.coords, {
        color: '#93C5FD',
        weight: 2.5,
        dashArray: '6, 6',
        opacity: 0.95,
      }).addTo(map);

      core.bindTooltip(`<b>${route.name}</b><br/>${route.cableType} &bull; ${route.lengthMeter}m`, {
        direction: 'top',
      });

      linesRef.current.push(glow, core);
    });

    // Render Markers
    nodes.forEach((node) => {
      let iconHtml = '';

      if (node.type === 'SERVER') {
        iconHtml = `
          <div style="background-color: #A855F7; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6); border: 2.5px solid #ffffff;">
            <svg style="width: 17px; height: 17px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          </div>
        `;
      } else if (node.type === 'ODC') {
        iconHtml = `
          <div style="background-color: #2563EB; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.5); border: 2px solid #ffffff;">
            <span style="color: white; font-size: 9px; font-weight: 900; font-family: monospace;">ODC</span>
          </div>
        `;
      } else if (node.type === 'ODP') {
        iconHtml = `
          <div style="background-color: #06B6D4; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.5); border: 2px solid #ffffff;">
            <svg style="width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
        `;
      } else if (node.type === 'ONT') {
        const isOffline = node.status === 'OFFLINE';
        const isWarn = node.status === 'ONLINE' && parseFloat(node.rxPower || '-20') < -24.0;
        const bgCol = isOffline ? '#DC2626' : isWarn ? '#D97706' : '#10B981';

        iconHtml = `
          <div style="background-color: ${bgCol}; width: 25px; height: 25px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); border: 2px solid #ffffff;">
            <svg style="width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: iconHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon }).addTo(map);

      let tooltipText = `<b>${node.name}</b>`;
      if (node.type === 'SERVER') {
        tooltipText += `<br/>IP: ${node.ip || '-'} &bull; ${node.used}/${node.capacity} ONU`;
      } else if (node.type === 'ODC' || node.type === 'ODP') {
        tooltipText += `<br/>Kapasitas: ${node.used || 0}/${node.capacity || 16} Port`;
      } else if (node.type === 'ONT') {
        tooltipText += `<br/>Sinyal: ${node.rxPower} dBm (${node.status})`;
      }

      marker.bindTooltip(tooltipText, {
        direction: 'top',
        offset: [0, -10],
      });

      marker.on('click', () => {
        setSelectedNode(node);
      });

      markersRef.current.push(marker);
    });
  }, [nodes, routes]);

  // Klik Peta Handler
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (['SERVER', 'ODC', 'ODP', 'ONT'].includes(activeTool)) {
        setPendingNode({
          type: activeTool as any,
          lat,
          lng,
        });
        setFormName(
          activeTool === 'SERVER'
            ? 'NOC / OLT Baru'
            : activeTool === 'ODC'
            ? `ODC-${nodes.filter((n) => n.type === 'ODC').length + 1}`
            : activeTool === 'ODP'
            ? `ODP-AN-${String(nodes.filter((n) => n.type === 'ODP').length + 1).padStart(2, '0')}`
            : 'Rumah Pelanggan Baru'
        );
        setFormIp('192.168.10.10');
        setFormCapacity('16');
        setFormParent(activeTool === 'ODP' ? 'ODC 01 Simpang Pasar' : 'NOC / OLT Hioso Pusat');
        setFormLocation('Tiang Listrik');
        setFormCustomerNo(`CUST-${String(nodes.filter((n) => n.type === 'ONT').length + 1).padStart(3, '0')}`);
        setFormPhone('0812-');
        setFormAddress('Air Naningan, Tanggamus');
        setFormSerial(`48575443${Math.floor(10000000 + Math.random() * 90000000)}`);
      } else if (activeTool === 'FIBER_LINE') {
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

  // CREATE Node Baru
  const handleSaveCreateNode = () => {
    if (!pendingNode) return;

    const newNode: MapNode = {
      id: `node-${Date.now()}`,
      name: formName || 'Aset Baru',
      type: pendingNode.type,
      lat: pendingNode.lat,
      lng: pendingNode.lng,
      ip: pendingNode.type === 'SERVER' ? formIp : undefined,
      vendor: pendingNode.type === 'SERVER' ? 'Hioso EPON V2.0' : undefined,
      ponType: pendingNode.type === 'SERVER' ? 'EPON (1.25 Gbps)' : undefined,
      ponPortsCount: pendingNode.type === 'SERVER' ? 4 : undefined,
      capacity: parseInt(formCapacity, 10) || 16,
      used: 0,
      parentName: formParent,
      splitterRatio: formSplitter,
      poleLocation: formLocation,
      customerNo: pendingNode.type === 'ONT' ? formCustomerNo : undefined,
      phone: pendingNode.type === 'ONT' ? formPhone : undefined,
      address: pendingNode.type === 'ONT' ? formAddress : undefined,
      packagePlan: pendingNode.type === 'ONT' ? formPackage : undefined,
      serial: pendingNode.type === 'ONT' ? formSerial : undefined,
      mac: pendingNode.type === 'ONT' ? '00:25:9E:AA:88:99' : undefined,
      model: pendingNode.type === 'ONT' ? formModel : undefined,
      status: pendingNode.type === 'ONT' ? 'ONLINE' : 'ONLINE',
      rxPower: pendingNode.type === 'ONT' ? '-20.15' : undefined,
      txPower: pendingNode.type === 'ONT' ? '2.10' : undefined,
      wanIp: pendingNode.type === 'ONT' ? '10.10.20.120' : undefined,
      uptime: '1h 00m',
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setPendingNode(null);
    setActiveTool('NONE');
  };

  // UPDATE Node yang sedang diedit
  const handleOpenEdit = (node: MapNode) => {
    setEditingNode(node);
    setFormName(node.name);
    setFormIp(node.ip || '');
    setFormCapacity(String(node.capacity || 16));
    setFormParent(node.parentName || '');
    setFormLocation(node.poleLocation || '');
    setFormCustomerNo(node.customerNo || '');
    setFormPhone(node.phone || '');
    setFormAddress(node.address || '');
    setFormSerial(node.serial || '');
    setFormModel(node.model || 'Huawei EchoLife HG8245H5');
    setFormPackage(node.packagePlan || 'Home Family 30 Mbps');
  };

  const handleSaveUpdateNode = () => {
    if (!editingNode) return;

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === editingNode.id) {
          const updated: MapNode = {
            ...n,
            name: formName,
            ip: n.type === 'SERVER' ? formIp : n.ip,
            capacity: parseInt(formCapacity, 10) || n.capacity,
            parentName: formParent,
            poleLocation: formLocation,
            customerNo: formCustomerNo,
            phone: formPhone,
            address: formAddress,
            serial: formSerial,
            model: formModel,
            packagePlan: formPackage,
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );

    setEditingNode(null);
  };

  // DELETE Node
  const handleDeleteNode = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus '${name}' dari peta?`)) {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNode?.id === id) {
        setSelectedNode(null);
      }
    }
  };

  // Simpan Garis Kabel
  const handleSaveFiberLine = () => {
    if (drawingCoords.length < 2) {
      alert('Minimal klik 2 titik pada peta untuk membuat garis rute kabel.');
      return;
    }

    const newRoute: FiberRoute = {
      id: `route-${Date.now()}`,
      name: `Jalur Kabel Baru #${routes.length + 1}`,
      cableType: 'Drop Core 2-Core',
      coreCount: 2,
      lengthMeter: Math.round(drawingCoords.length * 95),
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

  // FlyTo saat Search
  const handleFlyTo = (node: MapNode) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([node.lat, node.lng], 17, { animate: true });
      setSelectedNode(node);
      setIsSearchOpen(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-dark-900 overflow-hidden select-none">
      {/* Container Peta Leaflet */}
      <div ref={mapContainer} className="w-full h-full z-0" />

      {/* Top Header Buttons (Sama Persis TAMA NETWORK) */}
      <div className="absolute top-3 left-16 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto bg-dark-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>

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

      {/* Mode Indicator Banner */}
      {activeTool !== 'NONE' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-dark-900/95 border border-brand-500 text-brand-300 text-xs px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
          <span>
            {activeTool === 'FIBER_LINE'
              ? `Mode Tarik Kabel: Klik titik demi titik di peta. (${drawingCoords.length} titik diklik)`
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

      {/* SLIDE-OVER DRAWER DETAIL & INFORMASI LENGKAP DENGAN AKSI CRUD */}
      {selectedNode && (
        <div className="absolute top-20 right-4 w-[420px] max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-dark-800/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-5 shadow-2xl space-y-4 z-[1001] animate-slideIn">
          {/* Header Drawer */}
          <div className="flex items-start justify-between border-b border-slate-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    selectedNode.status === 'OFFLINE'
                      ? 'bg-rose-500 animate-ping'
                      : selectedNode.type === 'SERVER'
                      ? 'bg-purple-400'
                      : selectedNode.type === 'ODC'
                      ? 'bg-blue-400'
                      : selectedNode.type === 'ODP'
                      ? 'bg-cyan-400'
                      : 'bg-emerald-400'
                  }`}
                ></span>
                <h3 className="text-sm font-bold text-slate-100">{selectedNode.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {selectedNode.type} &bull; Koordinat: {selectedNode.lat.toFixed(4)}, {selectedNode.lng.toFixed(4)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEdit(selectedNode)}
                title="Edit Data (Update)"
                className="text-slate-400 hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNode.id, selectedNode.name)}
                title="Hapus Node (Delete)"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* INFORMASI SPESIFIK TIPE NODE */}

          {/* 1. INFORMASI LENGKAP SERVER / OLT */}
          {selectedNode.type === 'SERVER' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">IP Address OLT</span>
                  <div className="text-xs font-bold font-mono text-purple-300 mt-1">{selectedNode.ip || '192.168.10.2'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tipe PON</span>
                  <div className="text-xs font-bold text-slate-200 mt-1">{selectedNode.ponType || 'EPON 1.25G'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Vendor & Model</span>
                  <div className="text-xs font-semibold text-slate-200 mt-1">{selectedNode.vendor || 'Hioso EPON'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Uptime Sistem</span>
                  <div className="text-xs font-semibold font-mono text-slate-300 mt-1">{selectedNode.uptime || '42d 14h'}</div>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Kapasitas ONU Terdaftar</span>
                  <span className="font-mono text-purple-400 font-bold">{selectedNode.used || 184} / {selectedNode.capacity || 256} ONU</span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${((selectedNode.used || 184) / (selectedNode.capacity || 256)) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                  <span className="text-emerald-400 font-semibold">&bull; 178 Online</span>
                  <span className="text-rose-400 font-semibold">&bull; 6 Offline</span>
                  <span>72 Port Bebas</span>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Daftar Port PON Aktif</span>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="p-2 bg-slate-800/60 rounded-lg flex justify-between font-mono text-[11px]">
                    <span>EPON 0/1</span>
                    <span className="text-emerald-400">58 ONU</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg flex justify-between font-mono text-[11px]">
                    <span>EPON 0/2</span>
                    <span className="text-emerald-400">62 ONU</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg flex justify-between font-mono text-[11px]">
                    <span>EPON 0/3</span>
                    <span className="text-emerald-400">44 ONU</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg flex justify-between font-mono text-[11px]">
                    <span>EPON 0/4</span>
                    <span className="text-emerald-400">20 ONU</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. INFORMASI LENGKAP ODC */}
          {selectedNode.type === 'ODC' && (
            <div className="space-y-3 text-xs">
              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Sumber Feeder Induk</span>
                <div className="font-semibold text-blue-300">{selectedNode.parentName || 'NOC OLT Hioso Pusat'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Rasio Splitter</span>
                  <div className="font-semibold text-slate-200 mt-1">{selectedNode.splitterRatio || '1:4 PLC Splitter'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Redaman Input Rata-rata</span>
                  <div className="font-bold font-mono text-emerald-400 mt-1">{selectedNode.avgAttenuation || '-16.00 dBm'}</div>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Kapasitas Core ODC</span>
                  <span className="font-mono text-blue-400 font-bold">{selectedNode.used || 28} / {selectedNode.capacity || 48} Port</span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${((selectedNode.used || 28) / (selectedNode.capacity || 48)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                  {(selectedNode.capacity || 48) - (selectedNode.used || 28)} Port Bebas untuk Distribusi ODP
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Lokasi Tiang</span>
                <div className="text-slate-300">{selectedNode.poleLocation || 'Tiang Distribusi Pasar'}</div>
              </div>
            </div>
          )}

          {/* 3. INFORMASI LENGKAP ODP */}
          {selectedNode.type === 'ODP' && (
            <div className="space-y-3 text-xs">
              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">ODC Induk</span>
                <div className="font-semibold text-cyan-300">{selectedNode.parentName || 'ODC 01 Simpang Pasar'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Rasio Splitter</span>
                  <div className="font-semibold text-slate-200 mt-1">{selectedNode.splitterRatio || '1:16 PLC Splitter'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Estimasi Redaman</span>
                  <div className="font-bold font-mono text-emerald-400 mt-1">{selectedNode.avgAttenuation || '-19.50 dBm'}</div>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Kapasitas Port Pelanggan</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedNode.used || 12} / {selectedNode.capacity || 16} Port</span>
                </div>
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${((selectedNode.used || 12) / (selectedNode.capacity || 16)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold mt-2">
                  {(selectedNode.capacity || 16) - (selectedNode.used || 12)} Port Bebas untuk Pasang Baru
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Titik Tiang Pasang</span>
                <div className="text-slate-300">{selectedNode.poleLocation || 'Tiang Depan Jalan'}</div>
              </div>
            </div>
          )}

          {/* 4. INFORMASI LENGKAP ONT PELANGGAN */}
          {selectedNode.type === 'ONT' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">ID / No. Pelanggan</span>
                  <div className="text-xs font-bold font-mono text-brand-300 mt-1">{selectedNode.customerNo || 'CUST-001'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">No. WhatsApp / HP</span>
                  <div className="text-xs font-semibold font-mono text-slate-200 mt-1">{selectedNode.phone || '-'}</div>
                </div>
              </div>

              <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Alamat Domisili</span>
                <div className="text-slate-300">{selectedNode.address || 'Air Naningan, Tanggamus'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">RX Power Optik</span>
                  <div className="text-base font-extrabold font-mono mt-0.5 text-emerald-400 flex items-center gap-1">
                    {selectedNode.rxPower} <span className="text-[10px] text-slate-400">dBm</span>
                  </div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Paket Internet</span>
                  <div className="text-xs font-bold text-slate-200 mt-1">{selectedNode.packagePlan || '30 Mbps'}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">IP WAN PPPoE</span>
                  <div className="text-xs font-mono text-slate-200 mt-1 truncate">{selectedNode.wanIp}</div>
                </div>
                <div className="bg-dark-900/80 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Model Modem</span>
                  <div className="text-xs font-semibold text-slate-300 mt-1 truncate">{selectedNode.model}</div>
                </div>
              </div>

              {/* Aksi Remote TR-069 */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Aksi Remote Cepat TR-069
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
        </div>
      )}

      {/* MODAL EDIT DATA NODE (UPDATE) */}
      {editingNode && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Edit Data {editingNode.type}
                </h3>
              </div>
              <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Perangkat / Node</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {editingNode.type === 'SERVER' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">IP Address OLT</label>
                  <input
                    type="text"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              )}

              {(editingNode.type === 'SERVER' || editingNode.type === 'ODC' || editingNode.type === 'ODP') && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Kapasitas Port (Mulai dari 2 Port)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formCapacity}
                      onChange={(e) => {
                        setFormCapacity(e.target.value);
                        if (e.target.value === '2') setFormSplitter('1:2 PLC Splitter');
                        else if (e.target.value === '4') setFormSplitter('1:4 PLC Splitter');
                        else if (e.target.value === '8') setFormSplitter('1:8 PLC Splitter');
                        else if (e.target.value === '16') setFormSplitter('1:16 PLC Splitter');
                        else if (e.target.value === '32') setFormSplitter('1:32 PLC Splitter');
                      }}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    >
                      <option value="2">2 Port (Splitter 1:2)</option>
                      <option value="4">4 Port (Splitter 1:4)</option>
                      <option value="8">8 Port (Splitter 1:8)</option>
                      <option value="16">16 Port (Splitter 1:16)</option>
                      <option value="24">24 Port</option>
                      <option value="32">32 Port (Splitter 1:32)</option>
                      <option value="48">48 Port (ODC 48 Core)</option>
                      <option value="64">64 Port (Splitter 1:64)</option>
                      <option value="96">96 Port (ODC 96 Core)</option>
                      <option value="144">144 Port (ODC 144 Core)</option>
                      <option value="288">288 Port (ODC 288 Core)</option>
                    </select>

                    <input
                      type="number"
                      min="2"
                      placeholder="Custom port..."
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {(editingNode.type === 'ODC' || editingNode.type === 'ODP') && (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tipe Splitter / Rasio</label>
                    <select
                      value={formSplitter}
                      onChange={(e) => setFormSplitter(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="1:2 PLC Splitter">1:2 PLC Splitter (2 Port)</option>
                      <option value="1:2 FBT Coupler (50:50 / 70:30 / 80:20)">1:2 FBT Coupler (50:50, 70:30, 80:20)</option>
                      <option value="1:4 PLC Splitter">1:4 PLC Splitter (4 Port)</option>
                      <option value="1:8 PLC Splitter">1:8 PLC Splitter (8 Port)</option>
                      <option value="1:16 PLC Splitter">1:16 PLC Splitter (16 Port)</option>
                      <option value="1:24 PLC Splitter">1:24 PLC Splitter (24 Port)</option>
                      <option value="1:32 PLC Splitter">1:32 PLC Splitter (32 Port)</option>
                      <option value="1:64 PLC Splitter">1:64 PLC Splitter (64 Port)</option>
                      <option value="Straight Core (Tanpa Splitter)">Straight Core (Direct Through)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Induk / Sumber Feeder</label>
                    <input
                      type="text"
                      value={formParent}
                      onChange={(e) => setFormParent(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Lokasi Tiang</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </>
              )}

              {editingNode.type === 'ONT' && (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">No. Pelanggan</label>
                    <input
                      type="text"
                      value={formCustomerNo}
                      onChange={(e) => setFormCustomerNo(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nomor WhatsApp / HP</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Alamat Domisili</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Paket Berlangganan</label>
                    <input
                      type="text"
                      value={formPackage}
                      onChange={(e) => setFormPackage(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Model Modem</label>
                    <select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="Huawei EchoLife HG8245H5">Huawei EchoLife HG8245H5</option>
                      <option value="Huawei OptiXstar EG8145V5 Dual-Band">Huawei OptiXstar EG8145V5 Dual-Band</option>
                      <option value="Huawei EchoLife HG8546M">Huawei EchoLife HG8546M</option>
                      <option value="Huawei EchoLife HG8546M5">Huawei EchoLife HG8546M5</option>
                      <option value="Zimlink XPON ZM-G100">Zimlink XPON ZM-G100</option>
                      <option value="Zimlink Dual Band ZM-G200">Zimlink Dual Band ZM-G200</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Serial Number (GPON SN)</label>
                    <input
                      type="text"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUpdateNode}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE NODE BARU (SAAT PETA DIKLIK) */}
      {pendingNode && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-800 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Tambah {pendingNode.type} Baru
              </h3>
              <button onClick={() => setPendingNode(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Perangkat / Node</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              {pendingNode.type === 'SERVER' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">IP Address OLT</label>
                  <input
                    type="text"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              )}

              {(pendingNode.type === 'ODC' || pendingNode.type === 'ODP') && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Kapasitas Port (Mulai dari 2 Port)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formCapacity}
                      onChange={(e) => {
                        setFormCapacity(e.target.value);
                        if (e.target.value === '2') setFormSplitter('1:2 PLC Splitter');
                        else if (e.target.value === '4') setFormSplitter('1:4 PLC Splitter');
                        else if (e.target.value === '8') setFormSplitter('1:8 PLC Splitter');
                        else if (e.target.value === '16') setFormSplitter('1:16 PLC Splitter');
                        else if (e.target.value === '32') setFormSplitter('1:32 PLC Splitter');
                      }}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    >
                      <option value="2">2 Port (Splitter 1:2 / Coupler)</option>
                      <option value="4">4 Port (Splitter 1:4)</option>
                      <option value="8">8 Port (Splitter 1:8)</option>
                      <option value="16">16 Port (Splitter 1:16)</option>
                      <option value="24">24 Port</option>
                      <option value="32">32 Port (Splitter 1:32)</option>
                      <option value="48">48 Port (ODC 48 Core)</option>
                      <option value="64">64 Port (Splitter 1:64)</option>
                      <option value="96">96 Port (ODC 96 Core)</option>
                      <option value="144">144 Port (ODC 144 Core)</option>
                      <option value="288">288 Port (ODC 288 Core)</option>
                    </select>

                    <input
                      type="number"
                      min="2"
                      placeholder="Custom..."
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {pendingNode.type === 'ONT' && (
                <>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">No. WhatsApp Pelanggan</label>
                    <input
                      type="text"
                      placeholder="0812-..."
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Model Modem</label>
                    <select
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="Huawei EchoLife HG8245H5">Huawei EchoLife HG8245H5</option>
                      <option value="Huawei OptiXstar EG8145V5 Dual-Band">Huawei OptiXstar EG8145V5 (Dual Band)</option>
                      <option value="Huawei EchoLife HG8546M">Huawei EchoLife HG8546M</option>
                      <option value="Zimlink XPON ZM-G100">Zimlink XPON ZM-G100</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Serial Number (GPON SN)</label>
                    <input
                      type="text"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-400 font-mono bg-dark-900 p-2.5 rounded-lg border border-slate-800">
                Koordinat: {pendingNode.lat.toFixed(5)}, {pendingNode.lng.toFixed(5)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setPendingNode(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCreateNode}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              >
                Simpan Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden space-y-2">
            <div className="p-3 border-b border-slate-700 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Cari ODP, ONT, pelanggan, atau SN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {nodes
                .filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || (n.serial && n.serial.includes(searchQuery)))
                .map((item) => (
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
                ))}
            </div>
          </div>
        </div>
      )}

      {/* REMOTE ACTION MODAL */}
      {activeAction && selectedNode && (
        <RemoteActionModal
          device={selectedNode}
          actionType={activeAction}
          onClose={() => setActiveAction(null)}
          onSuccess={() => setActiveAction(null)}
        />
      )}
    </div>
  );
};
