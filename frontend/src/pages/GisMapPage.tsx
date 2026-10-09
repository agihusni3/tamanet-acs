import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Layers,
  MapPin,
  Check,
  Eye,
  Navigation,
  Crosshair,
  PlusCircle,
  RefreshCw,
  Zap,
  Gauge,
  Calculator,
  BatteryCharging,
  HardDrive,
  Thermometer,
  Cpu,
  Copy,
  Users,
  Scissors,
  Split,
  FileText,
} from 'lucide-react';
import { RemoteActionModal } from '../components/RemoteActionModal';
import { useAppContext, MikrotikPppoeSession } from '../context/AppContext';
import { MikrotikPppoeSelector } from '../components/MikrotikPppoeSelector';
import { OltAccessModal, OltDeviceData } from '../components/OltAccessModal';
import { PopServerFacility, PopNetworkDevice, PopPowerSystem } from '../types/pop';
import { PopServerDetailModal } from '../components/PopServerDetailModal';

const DEFAULT_CENTER_LAT = -5.2088;
const DEFAULT_CENTER_LNG = 104.7180;

export function getStoredCenter(): [number, number] {
  try {
    const raw = localStorage.getItem('acs_gis_center');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 2 && !isNaN(parsed[0]) && !isNaN(parsed[1])) {
        return [Number(parsed[0]), Number(parsed[1])];
      }
    }
  } catch (e) { }
  return [DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG];
}

export function persistCenter(coords: [number, number]) {
  try {
    localStorage.setItem('acs_gis_center', JSON.stringify(coords));
  } catch (e) { }
}

const CENTER_LAT = DEFAULT_CENTER_LAT;
const CENTER_LNG = DEFAULT_CENTER_LNG;

export interface FiberCoreDefinition {
  coreNumber: number;
  tubeNumber: number;
  tubeName: string;
  colorName: string;
  colorHex: string;
  textColor: string;
  borderHex?: string;
}

export interface FiberCoreAllocation {
  coreNumber: number;
  tubeNumber: number;
  tubeName: string;
  colorName: string;
  colorHex: string;
  status: 'AVAILABLE' | 'USED' | 'RESERVED' | 'DAMAGED';
  assignedNodeId?: string;
  assignedNodeName?: string;
  assignedNodeType?: 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'POI' | string;
  assignedKmMarker?: number;
  notes?: string;
}

// ─── Standarisasi 12 Warna Dasar Telekomunikasi (TIA/EIA-598 / Telkom BOHCAP MHKUPT) ───
export const BASE_12_CORE_COLORS: { name: string; hex: string; textColor: string; borderHex?: string }[] = [
  { name: 'Biru', hex: '#2563EB', textColor: '#FFFFFF' },        // 1
  { name: 'Oranye', hex: '#F97316', textColor: '#FFFFFF' },      // 2
  { name: 'Hijau', hex: '#16A34A', textColor: '#FFFFFF' },       // 3
  { name: 'Cokelat', hex: '#854D0E', textColor: '#FFFFFF' },     // 4
  { name: 'Abu-abu', hex: '#64748B', textColor: '#FFFFFF' },     // 5
  { name: 'Putih', hex: '#F8FAFC', textColor: '#0F172A', borderHex: '#94A3B8' }, // 6
  { name: 'Merah', hex: '#DC2626', textColor: '#FFFFFF' },       // 7
  { name: 'Hitam', hex: '#0F172A', textColor: '#F8FAFC', borderHex: '#475569' }, // 8
  { name: 'Kuning', hex: '#EAB308', textColor: '#0F172A' },      // 9
  { name: 'Ungu', hex: '#9333EA', textColor: '#FFFFFF' },        // 10
  { name: 'Pink', hex: '#EC4899', textColor: '#FFFFFF' },        // 11
  { name: 'Toska', hex: '#06B6D4', textColor: '#0F172A' },       // 12
];

// Standarisasi Core 1 s/d 24 dalam 1 line kabel (Tube 1: Core 1-12, Tube 2: Core 13-24)
export const FIBER_CORE_STANDARDS: FiberCoreDefinition[] = Array.from({ length: 24 }, (_, i) => {
  const coreNum = i + 1;
  const tubeNum = coreNum <= 12 ? 1 : 2;
  const tubeName = tubeNum === 1 ? 'Tube 1 (Biru)' : 'Tube 2 (Oranye)';
  const baseIdx = (coreNum - 1) % 12;
  const base = BASE_12_CORE_COLORS[baseIdx];
  return {
    coreNumber: coreNum,
    tubeNumber: tubeNum,
    tubeName,
    colorName: base.name,
    colorHex: base.hex,
    textColor: base.textColor,
    borderHex: base.borderHex,
  };
});

export function generateDefaultCores(
  coreCount: number = 24,
  existingAllocations?: FiberCoreAllocation[]
): FiberCoreAllocation[] {
  const safeCount = Math.max(1, Math.min(24, coreCount));
  return Array.from({ length: safeCount }, (_, i) => {
    const std = FIBER_CORE_STANDARDS[i];
    const prev = existingAllocations?.find((c) => c.coreNumber === std.coreNumber);
    if (prev) {
      return {
        ...prev,
        tubeNumber: std.tubeNumber,
        tubeName: std.tubeName,
        colorName: std.colorName,
        colorHex: std.colorHex,
      };
    }
    return {
      coreNumber: std.coreNumber,
      tubeNumber: std.tubeNumber,
      tubeName: std.tubeName,
      colorName: std.colorName,
      colorHex: std.colorHex,
      status: 'AVAILABLE',
    };
  });
}

export interface SplitterPreset {
  ratio: string;
  label: string;
  ports: number;
  lossDb: number;
  type: 'PLC' | 'FBT' | 'DIRECT';
  description?: string;
}

export const SPLITTER_PRESETS: SplitterPreset[] = [
  { ratio: '1:2 PLC Splitter', label: '1:2 PLC Splitter (2 Port • Redaman ~3.6 dB)', ports: 2, lossDb: 3.6, type: 'PLC' },
  { ratio: '1:4 PLC Splitter', label: '1:4 PLC Splitter (4 Port • Redaman ~7.2 dB)', ports: 4, lossDb: 7.2, type: 'PLC' },
  { ratio: '1:8 PLC Splitter', label: '1:8 PLC Splitter (8 Port • Redaman ~10.5 dB)', ports: 8, lossDb: 10.5, type: 'PLC' },
  { ratio: '1:16 PLC Splitter', label: '1:16 PLC Splitter (16 Port • Redaman ~13.8 dB)', ports: 16, lossDb: 13.8, type: 'PLC' },
  { ratio: '1:24 PLC Splitter', label: '1:24 PLC Splitter (24 Port • Redaman ~15.5 dB)', ports: 24, lossDb: 15.5, type: 'PLC' },
  { ratio: '1:32 PLC Splitter', label: '1:32 PLC Splitter (32 Port • Redaman ~17.0 dB)', ports: 32, lossDb: 17.0, type: 'PLC' },
  { ratio: '1:64 PLC Splitter', label: '1:64 PLC Splitter (64 Port • Redaman ~20.5 dB)', ports: 64, lossDb: 20.5, type: 'PLC' },
  { ratio: '1:2 FBT (50:50)', label: '1:2 FBT Rasio 50:50 (2 Port • Redaman ~3.5 dB)', ports: 2, lossDb: 3.5, type: 'FBT' },
  { ratio: '1:2 FBT (70:30)', label: '1:2 FBT Rasio 70:30 (2 Port • Redaman ~5.8 dB)', ports: 2, lossDb: 5.8, type: 'FBT' },
  { ratio: '1:2 FBT (80:20)', label: '1:2 FBT Rasio 80:20 (2 Port • Redaman ~7.5 dB)', ports: 2, lossDb: 7.5, type: 'FBT' },
  { ratio: '1:2 FBT (90:10)', label: '1:2 FBT Rasio 90:10 (2 Port • Redaman ~10.6 dB)', ports: 2, lossDb: 10.6, type: 'FBT' },
  { ratio: '1:2 FBT (95:5)', label: '1:2 FBT Rasio 95:5 (2 Port • Redaman ~13.8 dB)', ports: 2, lossDb: 13.8, type: 'FBT' },
  { ratio: 'Straight Core (Tanpa Splitter)', label: 'Direct Straight / Splicing (Loss ~0.2 dB)', ports: 2, lossDb: 0.2, type: 'DIRECT' },
];

export const PORT_CAPACITY_OPTIONS = [2, 4, 8, 16, 24, 32, 64];

export const FIBER_CABLE_TYPE_OPTIONS = [
  { label: 'Drop Core 1-Core', cores: 1 },
  { label: 'Drop Core 2-Core', cores: 2 },
  { label: 'Drop Core 4-Core', cores: 4 },
  { label: 'Distribusi / ADSS 6-Core', cores: 6 },
  { label: 'Distribusi / ADSS 8-Core', cores: 8 },
  { label: 'ADSS 12-Core (1 Tube)', cores: 12 },
  { label: 'ADSS 24-Core (2 Tube)', cores: 24 },
  { label: 'ADSS 48-Core (4 Tube)', cores: 48 },
  { label: 'Feeder Duct 96-Core (8 Tube)', cores: 96 },
];

export function getCoreCountFromCableType(cableType: string): number {
  const found = FIBER_CABLE_TYPE_OPTIONS.find(
    (opt) => opt.label.toLowerCase() === cableType.toLowerCase()
  );
  if (found) return found.cores;
  const match = cableType.match(/(\d+)\s*-?\s*Core/i);
  if (match) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 4;
}

export const COUPLER_RATIOS = [
  'Tanpa Rasio',
  '1:99', '2:98', '3:97', '4:96', '5:95',
  '10:90', '15:85', '20:80', '25:75', '30:70', '35:65', '40:60', '45:55',
  '50:50',
  '55:45', '60:40', '65:35', '70:30', '75:25', '80:20', '85:15', '90:10',
  '95:5', '96:4', '97:3', '98:2', '99:1'
];

export interface FbtRatioDetail {
  dropPct: number;
  passPct: number;
  lossDrop: number;
  lossPass: number;
  label: string;
}

export const FBT_RATIO_TABLE: Record<string, FbtRatioDetail> = {
  '1:99': { dropPct: 1, passPct: 99, lossDrop: 22.0, lossPass: 0.25, label: '1:99' },
  '01:99': { dropPct: 1, passPct: 99, lossDrop: 22.0, lossPass: 0.25, label: '1:99' },
  '2:98': { dropPct: 2, passPct: 98, lossDrop: 19.0, lossPass: 0.30, label: '2:98' },
  '02:98': { dropPct: 2, passPct: 98, lossDrop: 19.0, lossPass: 0.30, label: '2:98' },
  '3:97': { dropPct: 3, passPct: 97, lossDrop: 17.6, lossPass: 0.35, label: '3:97' },
  '03:97': { dropPct: 3, passPct: 97, lossDrop: 17.6, lossPass: 0.35, label: '3:97' },
  '4:96': { dropPct: 4, passPct: 96, lossDrop: 16.2, lossPass: 0.38, label: '4:96' },
  '04:96': { dropPct: 4, passPct: 96, lossDrop: 16.2, lossPass: 0.38, label: '4:96' },
  '5:95': { dropPct: 5, passPct: 95, lossDrop: 14.8, lossPass: 0.42, label: '5:95' },
  '05:95': { dropPct: 5, passPct: 95, lossDrop: 14.8, lossPass: 0.42, label: '5:95' },
  '6:94': { dropPct: 6, passPct: 94, lossDrop: 14.14, lossPass: 0.86, label: '6:94' },
  '06:94': { dropPct: 6, passPct: 94, lossDrop: 14.14, lossPass: 0.86, label: '6:94' },
  '7:93': { dropPct: 7, passPct: 93, lossDrop: 13.48, lossPass: 0.92, label: '7:93' },
  '07:93': { dropPct: 7, passPct: 93, lossDrop: 13.48, lossPass: 0.92, label: '7:93' },
  '8:92': { dropPct: 8, passPct: 92, lossDrop: 12.82, lossPass: 0.98, label: '8:92' },
  '08:92': { dropPct: 8, passPct: 92, lossDrop: 12.82, lossPass: 0.98, label: '8:92' },
  '9:91': { dropPct: 9, passPct: 91, lossDrop: 12.16, lossPass: 1.04, label: '9:91' },
  '09:91': { dropPct: 9, passPct: 91, lossDrop: 12.16, lossPass: 1.04, label: '9:91' },
  '10:90': { dropPct: 10, passPct: 90, lossDrop: 11.5, lossPass: 1.10, label: '10:90' },
  '15:85': { dropPct: 15, passPct: 85, lossDrop: 9.75, lossPass: 1.35, label: '15:85' },
  '20:80': { dropPct: 20, passPct: 80, lossDrop: 8.0, lossPass: 1.70, label: '20:80' },
  '25:75': { dropPct: 25, passPct: 75, lossDrop: 7.0, lossPass: 1.95, label: '25:75' },
  '30:70': { dropPct: 30, passPct: 70, lossDrop: 6.4, lossPass: 2.30, label: '30:70' },
  '35:65': { dropPct: 35, passPct: 65, lossDrop: 5.35, lossPass: 2.70, label: '35:65' },
  '40:60': { dropPct: 40, passPct: 60, lossDrop: 4.7, lossPass: 3.10, label: '40:60' },
  '45:55': { dropPct: 45, passPct: 55, lossDrop: 4.05, lossPass: 3.30, label: '45:55' },
  '50:50': { dropPct: 50, passPct: 50, lossDrop: 3.4, lossPass: 3.40, label: '50:50' },
  '55:45': { dropPct: 55, passPct: 45, lossDrop: 3.30, lossPass: 4.05, label: '55:45' },
  '60:40': { dropPct: 60, passPct: 40, lossDrop: 3.10, lossPass: 4.70, label: '60:40' },
  '65:35': { dropPct: 65, passPct: 35, lossDrop: 2.70, lossPass: 5.35, label: '65:35' },
  '70:30': { dropPct: 70, passPct: 30, lossDrop: 2.30, lossPass: 6.40, label: '70:30' },
  '75:25': { dropPct: 75, passPct: 25, lossDrop: 1.95, lossPass: 7.00, label: '75:25' },
  '80:20': { dropPct: 80, passPct: 20, lossDrop: 1.70, lossPass: 8.00, label: '80:20' },
  '85:15': { dropPct: 85, passPct: 15, lossDrop: 1.35, lossPass: 9.75, label: '85:15' },
  '90:10': { dropPct: 90, passPct: 10, lossDrop: 1.10, lossPass: 11.50, label: '90:10' },
  '95:5': { dropPct: 95, passPct: 5, lossDrop: 0.42, lossPass: 14.80, label: '95:5' },
};

export const getPlcLossByPort = (capacity: number | string): number => {
  // Nilai disesuaikan dengan referensi PON Calculator (AttenuationCalculatorPage)
  const cap = Number(capacity);
  if (isNaN(cap) || cap <= 0) return 0;
  if (cap <= 2) return 0.28;
  if (cap <= 4) return 5.8;
  if (cap <= 8) return 8.8;
  if (cap <= 16) return 10.7;
  if (cap <= 32) return 15.04;
  if (cap <= 64) return 18.07;
  return 18.07;
};

export const getRatioDetail = (ratioStr: string): FbtRatioDetail | null => {
  if (!ratioStr || ratioStr === 'Tanpa Rasio') return null;
  const clean = ratioStr.trim();
  if (FBT_RATIO_TABLE[clean]) return FBT_RATIO_TABLE[clean];
  const norm = clean.replace(/^0(\d):/, '$1:');
  if (FBT_RATIO_TABLE[norm]) return FBT_RATIO_TABLE[norm];
  return null;
};

export interface NodeRatioItem {
  id: string;
  ratio: string;
  direction?: string;
  targetRouteId?: string;
  targetRouteName?: string;
  dropDirection?: string;
  directionDrop?: string;
  targetRouteIdA?: string;
  targetRouteNameA?: string;
  customDropLoss?: number;
  customPassLoss?: number;
  coreInput?: number; // Core yang masuk ke FBT (core dari kabel feeder/upstream)
  coreA?: number;    // Core untuk Kaki A (tap/drop)
  coreB?: number;    // Core untuk Kaki B (pass-through/lanjut)
}

export const COMMON_RATIO_DIRECTIONS = [
  'Jalur Utama',
  'Jalur Masuk Gang',
  'Jalur Sekunder',
  'Distribusi / Drop Pelanggan',
  'Bypass ke ODP Berikutnya',
];

// ─── Satu entri jalur splice di dalam ODP/ODC ───
export interface SpliceEntry {
  id: string;
  label?: string;             // Nama/label jalur
  targetRouteId?: string;     // ID line fiber yang digunakan jalur ini
  targetRouteName?: string;   // Nama line fiber
  inputCoreNumber?: number;   // Core Masuk
  inputCoreColor?: string;
  inputCoreHex?: string;
  outputCoreNumber?: number;  // Core Keluar (bisa berbeda)
  outputCoreColor?: string;
  outputCoreHex?: string;
}

export interface MapNode {
  id: string;
  name: string;
  type: 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'POI' | 'CLOSURE' | 'JOINT_CLOSURE';
  lat: number;
  lng: number;

  // Technical Info Server / OLT / POP Facility
  popFacility?: PopServerFacility;
  oltId?: string;
  ip?: string;
  vendor?: string;
  model?: string;
  ponType?: string;
  ponPortsCount?: number;
  webPort?: number;
  cliPort?: number;
  defaultUser?: string;
  defaultPass?: string;
  snmpCommunity?: string;
  uptime?: string;

  // Technical Info ODC & ODP
  capacity?: number;
  used?: number;
  parentName?: string;
  parentRouteId?: string;
  parentRouteName?: string;
  routeKmMarker?: number;
  poleLocation?: string;
  splitterRatio?: string;
  splitterRatios?: NodeRatioItem[];
  avgAttenuation?: string;
  inputAttenuation?: string;
  outputAttenuation?: string;

  // Fiber Core Allocation (Ketika Masuk ke Jalur Kabel)
  assignedCoreNumber?: number;
  assignedCoreColor?: string;
  assignedCoreHex?: string;
  assignedTubeNumber?: number;

  // Core Keluar (Output/Drop side - bisa berbeda warna dari Core Masuk)
  outputCoreNumber?: number;
  outputCoreColor?: string;
  outputCoreHex?: string;

  // Multi-jalur splice map (jika ODP memiliki lebih dari 1 jalur kabel)
  spliceMaps?: SpliceEntry[];

  // Technical Info ONT
  customerNo?: string;
  phone?: string;
  address?: string;
  serial?: string;
  mac?: string;
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
  vertexNodeIds?: (string | null)[];
  color?: string;
  sourceNode?: string;
  targetNode?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  status?: 'NORMAL' | 'DEGRADED' | 'CUT';
  cutCoord?: [number, number];
  cutKm?: number;
  attenuation?: string;
  notes?: string;
  cores?: FiberCoreAllocation[];
}

export function getRouteVertexNodeIds(
  route: Pick<FiberRoute, 'coords' | 'vertexNodeIds' | 'sourceNodeId' | 'targetNodeId'>,
  allNodes: MapNode[]
): (string | null)[] {
  if (!route || !route.coords || !Array.isArray(route.coords)) return [];
  if (route.vertexNodeIds && route.vertexNodeIds.length === route.coords.length) {
    return route.vertexNodeIds;
  }
  return route.coords.map((coord, idx) => {
    if (!coord || !Array.isArray(coord) || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
      return null;
    }
    if (idx === 0 && route.sourceNodeId) {
      const match = allNodes.find((n) => n.id === route.sourceNodeId);
      if (match) return match.id;
    }
    if (idx === route.coords.length - 1 && route.targetNodeId) {
      const match = allNodes.find((n) => n.id === route.targetNodeId);
      if (match) return match.id;
    }
    const match = allNodes.find((n) => {
      const dLat = Math.abs(n.lat - coord[0]);
      const dLng = Math.abs(n.lng - coord[1]);
      return dLat < 0.00035 && dLng < 0.00035;
    });
    return match ? match.id : null;
  });
}

export function ensurePopFacility(node: MapNode): PopServerFacility {
  if (node.popFacility) {
    return node.popFacility;
  }
  return {
    id: `pop-${node.id}`,
    name: node.name || 'Server',
    rackUnitsTotal: 42,
    rackUnitsUsed: 0,
    devices: [],
  };
}

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateLineDistance(coords: [number, number][]): number {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return 0;
  let totalMeters = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    if (
      coords[i] &&
      coords[i + 1] &&
      typeof coords[i][0] === 'number' &&
      typeof coords[i][1] === 'number' &&
      typeof coords[i + 1][0] === 'number' &&
      typeof coords[i + 1][1] === 'number'
    ) {
      totalMeters += haversineDistance(
        coords[i][0],
        coords[i][1],
        coords[i + 1][0],
        coords[i + 1][1]
      );
    }
  }
  return Math.round(totalMeters);
}

export function closestPointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { point: [number, number]; t: number; distMeters: number } {
  const pLat = p[0];
  const pLng = p[1];
  const aLat = a[0];
  const aLng = a[1];
  const bLat = b[0];
  const bLng = b[1];

  const meanLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const kx = 111320 * Math.cos(meanLatRad);
  const ky = 110540;

  const dx = (bLng - aLng) * kx;
  const dy = (bLat - aLat) * ky;

  const segLenSq = dx * dx + dy * dy;
  let t = 0;
  if (segLenSq > 0.0001) {
    const px = (pLng - aLng) * kx;
    const py = (pLat - aLat) * ky;
    t = (px * dx + py * dy) / segLenSq;
    t = Math.max(0, Math.min(1, t));
  }

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  const projPoint: [number, number] = [
    parseFloat(projLat.toFixed(6)),
    parseFloat(projLng.toFixed(6)),
  ];
  const dist = haversineDistance(pLat, pLng, projLat, projLng);

  return { point: projPoint, t, distMeters: dist };
}

export function formatDistanceKmOrM(meters?: number | null, withPlus: boolean = true): string {
  if (meters === undefined || meters === null || isNaN(meters)) return '-';
  const prefix = withPlus ? '+' : '';
  const absMeters = Math.abs(meters);
  if (absMeters >= 1000) {
    const km = absMeters / 1000;
    const kmStr = km.toFixed(2).replace(/\.?0+$/, '');
    return `${prefix}${kmStr} KM`;
  }
  return `${prefix}${Math.round(absMeters)} meter`;
}

// Cek apakah orientasi rute kabel perlu dibalik agar Titik Nol (KM 0) selalu berasal dari SERVER
export function isRouteInvertedFromRoot(route: FiberRoute, allNodes: MapNode[]): boolean {
  if (!route || !route.coords || !Array.isArray(route.coords) || route.coords.length < 2) return false;
  if (!route.coords[0] || !Array.isArray(route.coords[0]) || typeof route.coords[0][0] !== 'number' || typeof route.coords[0][1] !== 'number') return false;
  const lastIdx = route.coords.length - 1;
  if (!route.coords[lastIdx] || !Array.isArray(route.coords[lastIdx]) || typeof route.coords[lastIdx][0] !== 'number' || typeof route.coords[lastIdx][1] !== 'number') return false;

  // 1. Jika targetNodeId adalah SERVER, berarti kabel ditarik menuju server (terbalik)
  if (route.targetNodeId) {
    const targetNode = allNodes.find((n) => n.id === route.targetNodeId);
    if (targetNode?.type === 'SERVER') return true;
  }
  if (route.sourceNodeId) {
    const sourceNode = allNodes.find((n) => n.id === route.sourceNodeId);
    if (sourceNode?.type === 'SERVER') return false;
  }

  // 2. Cek jarak kedua ujung kabel ke Server terdekat di jaringan
  const serverNode = allNodes.find((n) => n.type === 'SERVER');
  if (serverNode) {
    const dStart = haversineDistance(route.coords[0][0], route.coords[0][1], serverNode.lat, serverNode.lng);
    const dEnd = haversineDistance(route.coords[lastIdx][0], route.coords[lastIdx][1], serverNode.lat, serverNode.lng);
    if (dEnd < dStart) return true;
  }

  return false;
}

export function snapPointToRoute(
  point: [number, number],
  routeCoords: [number, number][],
  isReversedFromRoot: boolean = false
): {
  snappedCoord: [number, number];
  insertIndex: number;
  distanceMetersFromStart: number;
  distanceKm: number;
  offsetMeters: number;
} | null {
  if (!routeCoords || !Array.isArray(routeCoords) || routeCoords.length < 2) return null;
  const validCoords = routeCoords.filter(
    (c): c is [number, number] =>
      Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
  );
  if (validCoords.length < 2) return null;

  let bestSegment = 0;
  let minOffset = Infinity;
  let bestProj: [number, number] = validCoords[0];

  for (let i = 0; i < validCoords.length - 1; i++) {
    const res = closestPointOnSegment(point, validCoords[i], validCoords[i + 1]);
    if (res.distMeters < minOffset) {
      minOffset = res.distMeters;
      bestSegment = i;
      bestProj = res.point;
    }
  }

  let cumDistance = 0;
  for (let i = 0; i < bestSegment; i++) {
    cumDistance += haversineDistance(
      validCoords[i][0],
      validCoords[i][1],
      validCoords[i + 1][0],
      validCoords[i + 1][1]
    );
  }
  cumDistance += haversineDistance(
    validCoords[bestSegment][0],
    validCoords[bestSegment][1],
    bestProj[0],
    bestProj[1]
  );

  let finalMeters = Math.round(cumDistance);
  if (isReversedFromRoot) {
    let totalM = 0;
    for (let i = 0; i < validCoords.length - 1; i++) {
      totalM += haversineDistance(
        validCoords[i][0],
        validCoords[i][1],
        validCoords[i + 1][0],
        validCoords[i + 1][1]
      );
    }
    finalMeters = Math.max(0, Math.round(totalM - cumDistance));
  }

  return {
    snappedCoord: bestProj,
    insertIndex: bestSegment + 1,
    distanceMetersFromStart: finalMeters,
    distanceKm: parseFloat((finalMeters / 1000).toFixed(2)),
    offsetMeters: Math.round(minOffset),
  };
}

export function getRouteAttachedNodes(route: FiberRoute, allNodes: MapNode[]): {
  node: MapNode;
  kmMarker: number;
}[] {
  if (!route || !route.coords || !Array.isArray(route.coords) || route.coords.length < 2) {
    return [];
  }
  const validCoords = route.coords.filter(
    (c): c is [number, number] =>
      Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
  );
  if (validCoords.length < 2) return [];

  const isReversed = isRouteInvertedFromRoot(route, allNodes);
  let totalM = 0;
  for (let i = 0; i < validCoords.length - 1; i++) {
    totalM += haversineDistance(
      validCoords[i][0],
      validCoords[i][1],
      validCoords[i + 1][0],
      validCoords[i + 1][1]
    );
  }
  const totalKm = parseFloat((totalM / 1000).toFixed(2));

  const attachedMap = new Map<string, { node: MapNode; kmMarker: number }>();
  const vertexIds = route.vertexNodeIds || [];

  allNodes.forEach((node) => {
    let rawKm: number | undefined = undefined;

    if (node.parentRouteId === route.id) {
      if (node.routeKmMarker !== undefined) {
        rawKm = node.routeKmMarker;
      } else {
        const snap = snapPointToRoute([node.lat, node.lng], validCoords);
        rawKm = snap ? snap.distanceKm : 0;
      }
    } else {
      const vIdx = vertexIds.indexOf(node.id);
      if (vIdx !== -1 && vIdx < validCoords.length) {
        let cumM = 0;
        for (let i = 0; i < vIdx; i++) {
          if (validCoords[i] && validCoords[i + 1]) {
            cumM += haversineDistance(
              validCoords[i][0],
              validCoords[i][1],
              validCoords[i + 1][0],
              validCoords[i + 1][1]
            );
          }
        }
        rawKm = parseFloat((cumM / 1000).toFixed(2));
      } else if (route.sourceNodeId === node.id) {
        rawKm = 0;
      } else if (route.targetNodeId === node.id) {
        rawKm = totalKm;
      }
    }

    if (rawKm !== undefined) {
      // Jika rute terbalik dari arah Server, balik KM agar Server selalu Titik Nol (KM 0.00)
      const finalKm = isReversed ? parseFloat(Math.max(0, totalKm - rawKm).toFixed(2)) : rawKm;
      if (!attachedMap.has(node.id) || node.parentRouteId === route.id) {
        attachedMap.set(node.id, { node, kmMarker: finalKm });
      }
    }
  });

  // Pastikan jika ada SERVER yang terhubung ke rute ini, posisikan tepat sebagai Titik Nol (KM 0)
  const serverNode = allNodes.find((n) => n.type === 'SERVER');
  if (serverNode && (route.sourceNodeId === serverNode.id || route.targetNodeId === serverNode.id)) {
    attachedMap.set(serverNode.id, { node: serverNode, kmMarker: 0 });
  }

  const attached = Array.from(attachedMap.values());
  return attached.sort((a, b) => a.kmMarker - b.kmMarker);
}

// Helper untuk menyinkronkan alokasi core fiber dengan link titik asal-tujuan (Backbone) & aset di rute
export function getSynchronizedRouteCores(
  route: FiberRoute,
  allNodes: MapNode[]
): FiberCoreAllocation[] {
  const maxCores = Math.max(1, Math.min(24, route.coreCount || 24));
  const baseCores: FiberCoreAllocation[] = (route.cores && route.cores.length === maxCores)
    ? route.cores.map((c) => ({ ...c }))
    : generateDefaultCores(maxCores, route.cores);

  const attached = getRouteAttachedNodes(route, allNodes);

  // Periksa koneksi titik awal & titik akhir (Backbone transmisi inter-POP / OLT / Feeder)
  const sourceName = route.sourceNode || allNodes.find((n) => n.id === route.sourceNodeId)?.name;
  const targetName = route.targetNode || allNodes.find((n) => n.id === route.targetNodeId)?.name;
  const hasBackboneLink = Boolean(sourceName && targetName);

  // 1. Alokasikan Core 1 untuk Link Backbone antar titik jika menghubungkan 2 lokasi
  if (hasBackboneLink && baseCores.length > 0) {
    const core1 = baseCores[0];
    if (core1.status !== 'USED' || !core1.assignedNodeName) {
      core1.status = 'USED';
      core1.assignedNodeName = `Backbone: ${sourceName} ➔ ${targetName}`;
      core1.assignedNodeType = 'SERVER';
      core1.assignedKmMarker = parseFloat((route.lengthMeter / 1000).toFixed(2));
    }
  }

  // 2. Sinkronisasikan aset yang berada di jalur kabel ini (ODP, ODC, Server sisipan)
  attached.forEach(({ node, kmMarker }) => {
    // Jangan overwrite backbone jika node adalah titik asal / tujuan
    const isSourceOrTarget = (route.sourceNodeId && node.id === route.sourceNodeId) ||
      (route.targetNodeId && node.id === route.targetNodeId) ||
      (sourceName && node.name === sourceName) ||
      (targetName && node.name === targetName);

    if (hasBackboneLink && isSourceOrTarget) {
      return;
    }

    // Cari apakah node ini sudah terpasang di salah satu core
    const existing = baseCores.find(
      (c) => c.assignedNodeId === node.id || (node.assignedCoreNumber && c.coreNumber === node.assignedCoreNumber)
    );

    if (existing) {
      existing.status = 'USED';
      existing.assignedNodeId = node.id;
      existing.assignedNodeName = node.name;
      existing.assignedNodeType = node.type;
      existing.assignedKmMarker = kmMarker;
    } else {
      // Jika belum terpasang, otomatis alokasikan ke core bebas berikutnya
      const freeCore = baseCores.find((c) => c.status === 'AVAILABLE');
      if (freeCore) {
        freeCore.status = 'USED';
        freeCore.assignedNodeId = node.id;
        freeCore.assignedNodeName = node.name;
        freeCore.assignedNodeType = node.type;
        freeCore.assignedKmMarker = kmMarker;
      }
    }
  });

  return baseCores;
}

// ─── Tidak ada data dummy. Node & Jalur masuk via tombol Tambah di peta ───
const INITIAL_NODES: MapNode[] = [];
const INITIAL_ROUTES: FiberRoute[] = [];

function loadNodes(): MapNode[] {
  try {
    const saved = localStorage.getItem('acs_gis_nodes');
    if (saved) {
      const parsed = JSON.parse(saved) as MapNode[];
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((n) => {
            const nameLower = (n.name || '').toLowerCase();
            const idLower = (n.id || '').toLowerCase();
            const isDemo =
              nameLower.includes('air naningan') ||
              nameLower.includes('dummy') ||
              nameLower.includes('demo') ||
              nameLower.includes('sample') ||
              nameLower.includes('contoh') ||
              idLower.startsWith('demo-') ||
              idLower.startsWith('dummy-');
            return !isDemo;
          })
          .map((n) => {
            if (n.type === 'SERVER') {
              const fac = n.popFacility;
              if (fac) {
                if ((!fac.devices || fac.devices.length === 0) && fac.powerSystem?.batterySocPercent === 96 && fac.powerSystem?.batteryVoltage === 53.2) {
                  fac.powerSystem = undefined;
                  fac.temperature = undefined;
                  fac.humidity = undefined;
                  fac.code = undefined;
                }
                // Hapus secara permanen semua data dummy dari daftar perangkat
                if (fac.devices && fac.devices.length > 0) {
                  fac.devices = fac.devices.filter((dev) => {
                    const nameLower = (dev.name || '').toLowerCase();
                    const isDummy =
                      nameLower.includes('dummy') ||
                      nameLower.includes('demo') ||
                      nameLower.includes('air naningan') ||
                      nameLower.includes('core router pop') ||
                      dev.id.startsWith('dev-olt-node-') ||
                      (dev.ipAddress === '192.168.10.2' && dev.vendor === 'Hisfocus (HSGQ)') ||
                      dev.ipAddress === '192.168.10.1' ||
                      dev.ipAddress === '192.168.10.3';
                    return !isDummy;
                  });
                }
              }
              if (!n.oltId && (!n.ip || n.ip === '192.168.10.2' || n.ip === '-')) {
                n.ip = undefined;
                n.vendor = undefined;
                n.model = undefined;
                n.ponType = undefined;
                n.ponPortsCount = undefined;
                n.webPort = undefined;
                n.cliPort = undefined;
              }
            }
            return n;
          });
        try {
          localStorage.setItem('acs_gis_nodes', JSON.stringify(cleaned));
        } catch { /* ignore */ }
        return cleaned;
      }
    }
  } catch { /* ignore */ }
  return INITIAL_NODES;
}

function loadRoutes(): FiberRoute[] {
  try {
    const saved = localStorage.getItem('acs_gis_routes');
    if (saved) {
      const parsed = JSON.parse(saved) as FiberRoute[];
      if (Array.isArray(parsed)) {
        const cleaned: FiberRoute[] = [];
        for (const r of parsed) {
          if (!r || typeof r !== 'object') continue;
          const nameLower = (r.name || '').toLowerCase();
          const idLower = (r.id || '').toLowerCase();
          const isDemo =
            nameLower.includes('air naningan') ||
            nameLower.includes('dummy') ||
            nameLower.includes('demo') ||
            nameLower.includes('sample') ||
            nameLower.includes('contoh') ||
            idLower.startsWith('demo-') ||
            idLower.startsWith('dummy-');
          if (isDemo) continue;

          // Validasi dan pulihkan coords
          if (!Array.isArray(r.coords)) continue;
          const validCoords: [number, number][] = r.coords.filter(
            (c): c is [number, number] =>
              Array.isArray(c) && c.length === 2 && typeof c[0] === 'number' && typeof c[1] === 'number' && !isNaN(c[0]) && !isNaN(c[1])
          );

          // Rute kabel harus memiliki minimal 2 titik koordinat
          if (validCoords.length < 2) continue;

          // Perbaiki vertexNodeIds agar panjangnya tepat sama dengan validCoords
          let validVertexIds: (string | null)[] | undefined = undefined;
          if (Array.isArray(r.vertexNodeIds)) {
            if (r.vertexNodeIds.length === validCoords.length) {
              validVertexIds = r.vertexNodeIds;
            } else {
              validVertexIds = validCoords.map((_, i) => r.vertexNodeIds?.[i] || null);
            }
          }

          cleaned.push({
            ...r,
            coords: validCoords,
            vertexNodeIds: validVertexIds,
            lengthMeter: r.lengthMeter && !isNaN(r.lengthMeter) ? r.lengthMeter : Math.round(calculateLineDistance(validCoords)),
          });
        }

        try {
          localStorage.setItem('acs_gis_routes', JSON.stringify(cleaned));
        } catch { /* ignore */ }
        return cleaned;
      }
    }
  } catch { /* ignore */ }
  return INITIAL_ROUTES;
}

function persistNodes(nodes: MapNode[]) {
  try { localStorage.setItem('acs_gis_nodes', JSON.stringify(nodes)); } catch { /* quota */ }
}

function persistRoutes(routes: FiberRoute[]) {
  try { localStorage.setItem('acs_gis_routes', JSON.stringify(routes)); } catch { /* quota */ }
}
// ─────────────────────────────────────────────────────────────────────────────


type ActiveTool = 'NONE' | 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'FIBER_LINE' | 'CLOSURE' | 'CUT_LINE';

export const GisMapPage: React.FC = () => {
  const {
    modemProfiles,
    recognizeModem,
    showToast,
    pppoeSessions,
    markPppoeAssigned,
    olts,
    addOlt,
    updateOlt,
    deleteOlt,
    syncOlt,
  } = useAppContext();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const linesRef = useRef<L.Polyline[]>([]);
  const tempDrawLineRef = useRef<L.Polyline | null>(null);

  // State dimuat dari localStorage agar kosong permanen saat belum ada data nyata
  const [nodes, setNodes] = useState<MapNode[]>(loadNodes);
  const [routes, setRoutes] = useState<FiberRoute[]>(loadRoutes);

  const [activeTool, setActiveTool] = useState<ActiveTool>('NONE');
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'settings'>('map');
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [activeAction, setActiveAction] = useState<any | null>(null);
  const [selectedOltModal, setSelectedOltModal] = useState<OltDeviceData | null>(null);
  const [activePopModal, setActivePopModal] = useState<PopServerFacility | null>(null);

  // Search Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Drawing Line State & Vertex Binding
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [drawingVertexNodeIds, setDrawingVertexNodeIds] = useState<(string | null)[]>([]);
  const [routeStartNode, setRouteStartNode] = useState<MapNode | null>(null);
  const [routeEndNode, setRouteEndNode] = useState<MapNode | null>(null);

  // Toast Notifikasi Dinamis
  const [dynamicMoveToast, setDynamicMoveToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  // Mode Sisipkan Titik ke Kabel Fiber (SERVER, ODC, ODP, CLOSURE)
  const [cableInsertMode, setCableInsertMode] = useState<{
    routeId: string;
    routeName: string;
    nodeType: 'SERVER' | 'ODP' | 'ODC' | 'CLOSURE';
  } | null>(null);

  // Mode Sambung / Perpanjang Line Fiber
  const [extendingRouteId, setExtendingRouteId] = useState<string | null>(null);
  const extendingRouteIdRef = useRef<string | null>(null);

  // Mode Cut Line Fiber
  const [pendingCutAction, setPendingCutAction] = useState<{
    route: FiberRoute;
    snappedCoord: [number, number];
    insertIndex: number;
    distanceKm: number;
    distanceMeters: number;
  } | null>(null);
  const [insertClosureOnCut, setInsertClosureOnCut] = useState(true);

  // Refs untuk sinkronisasi Leaflet Event Listeners
  const nodesRef = useRef<MapNode[]>(nodes);
  const routesRef = useRef<FiberRoute[]>(routes);
  const activeToolRef = useRef<ActiveTool>(activeTool);
  const cableInsertModeRef = useRef<typeof cableInsertMode>(cableInsertMode);
  const drawingCoordsRef = useRef<[number, number][]>(drawingCoords);
  const drawingVertexNodeIdsRef = useRef<(string | null)[]>(drawingVertexNodeIds);
  const routeLayersMapRef = useRef<Map<string, { glow: L.Polyline; core: L.Polyline; flowPulse?: L.Polyline; route: FiberRoute }>>(new Map());
  const [adjustingRoute, setAdjustingRoute] = useState<FiberRoute | null>(null);
  const [adjustingCoords, setAdjustingCoords] = useState<[number, number][]>([]);
  const adjustingRouteRef = useRef<FiberRoute | null>(null);
  const adjustingCoordsRef = useRef<[number, number][]>([]);
  const adjustingMarkersRef = useRef<L.Marker[]>([]);
  const tempMarkersRef = useRef<L.Marker[]>([]);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    nodesRef.current = nodes;
    persistNodes(nodes); // ← auto-save ke localStorage
  }, [nodes]);

  // Pembersihan otomatis data dummy saat modal server aktif
  useEffect(() => {
    if (activePopModal && activePopModal.devices && activePopModal.devices.length > 0) {
      const filtered = activePopModal.devices.filter((dev) => {
        const nameLower = (dev.name || '').toLowerCase();
        const isDummy =
          nameLower.includes('dummy') ||
          nameLower.includes('air naningan') ||
          nameLower.includes('core router pop') ||
          dev.id.startsWith('dev-olt-node-') ||
          (dev.ipAddress === '192.168.10.2' && dev.vendor === 'Hisfocus (HSGQ)') ||
          dev.ipAddress === '192.168.10.1' ||
          dev.ipAddress === '192.168.10.3';
        return !isDummy;
      });
      if (filtered.length !== activePopModal.devices.length) {
        const nextPop = { ...activePopModal, devices: filtered };
        setActivePopModal(nextPop);
        handleUpdatePopFacility(nextPop);
      }
    }
  }, [activePopModal]);

  useEffect(() => {
    routesRef.current = routes;
    persistRoutes(routes); // ← auto-save ke localStorage
  }, [routes]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    cableInsertModeRef.current = cableInsertMode;
  }, [cableInsertMode]);

  useEffect(() => {
    drawingCoordsRef.current = drawingCoords;
  }, [drawingCoords]);

  useEffect(() => {
    drawingVertexNodeIdsRef.current = drawingVertexNodeIds;
  }, [drawingVertexNodeIds]);

  // Create Modal State (Saat klik peta)
  const [pendingNode, setPendingNode] = useState<{
    type: 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'CLOSURE' | 'JOINT_CLOSURE';
    lat: number;
    lng: number;
    parentRouteId?: string;
    parentRouteName?: string;
    routeKmMarker?: number;
    insertIndex?: number;
  } | null>(null);

  // Edit Node Modal State (Update)
  const [editingNode, setEditingNode] = useState<MapNode | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formOltVendor, setFormOltVendor] = useState('Hisfocus (HSGQ)');
  const [formOltModel, setFormOltModel] = useState('');
  const [formOltPonType, setFormOltPonType] = useState('EPON (1.25 Gbps)');
  const [formOltPortsCount, setFormOltPortsCount] = useState(4);
  const [formOltWebPort, setFormOltWebPort] = useState(80);
  const [formOltCliPort, setFormOltCliPort] = useState(23);
  const [formOltUser, setFormOltUser] = useState('admin');
  const [formOltPass, setFormOltPass] = useState('admin');
  const [formCapacity, setFormCapacity] = useState('8');
  const [formParent, setFormParent] = useState('');
  const [formRouteId, setFormRouteId] = useState('');
  const [formKmMarker, setFormKmMarker] = useState<number | null>(null);
  const [formAssignedCore, setFormAssignedCore] = useState<number | null>(1);
  const [formOutputCore, setFormOutputCore] = useState<number | null>(null); // Core Keluar (opsional, jika berbeda dari Core Masuk)
  const [formSpliceMaps, setFormSpliceMaps] = useState<SpliceEntry[]>([]); // Multi-jalur splice
  const [formClosureMode, setFormClosureMode] = useState<'DIRECT' | 'RATIO'>('DIRECT'); // Mode sambungan JC: Sambungan Lurus vs Bagi Redaman
  const [formSplitter, setFormSplitter] = useState('50:50');
  const [formRatios, setFormRatios] = useState<NodeRatioItem[]>([
    { id: 'ratio-1', ratio: '80:20', direction: 'Line Fiber Utama (Lanjutan Feeder)' },
  ]);

  const handleAddRatioItem = () => {
    const newId = `ratio-${Date.now()}`;
    const defaultDir =
      formRatios.length === 0
        ? 'Line Fiber Utama (Lanjutan Feeder)'
        : formRatios.length === 1
          ? 'Line Fiber Masuk Gang'
          : 'Line Fiber Sekunder / Distribusi';
    const defaultRatio = formRatios.length === 0 ? '80:20' : '70:30';
    setFormRatios((prev) => [
      ...prev,
      { id: newId, ratio: defaultRatio, direction: defaultDir },
    ]);
  };

  const handleUpdateRatioItem = (id: string, field: string, value: any) => {
    setFormRatios((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'direction' && typeof value === 'string') {
          const cleanVal = value.replace(/^Line Fiber:\s*/i, '').trim();
          const matched = routes.find(
            (r) =>
              r.name.toLowerCase() === cleanVal.toLowerCase() ||
              r.name.toLowerCase() === value.trim().toLowerCase()
          );
          return {
            ...item,
            direction: value,
            targetRouteId: matched ? matched.id : undefined,
            targetRouteName: matched ? matched.name : undefined,
          };
        }
        if ((field === 'directionDrop' || field === 'dropDirection') && typeof value === 'string') {
          const cleanVal = value.replace(/^Line Fiber:\s*/i, '').trim();
          const matched = routes.find(
            (r) =>
              r.name.toLowerCase() === cleanVal.toLowerCase() ||
              r.name.toLowerCase() === value.trim().toLowerCase()
          );
          return {
            ...item,
            directionDrop: value,
            dropDirection: value,
            targetRouteIdA: matched ? matched.id : undefined,
            targetRouteNameA: matched ? matched.name : undefined,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveRatioItem = (id: string) => {
    if (formRatios.length <= 1) return;
    setFormRatios((prev) => prev.filter((item) => item.id !== id));
  };
  const [formLocation, setFormLocation] = useState('');
  const [formCustomerNo, setFormCustomerNo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formPackage, setFormPackage] = useState('');
  const [formPppoeUser, setFormPppoeUser] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formWanIp, setFormWanIp] = useState('');
  const [formRxPower, setFormRxPower] = useState('');
  const [formInputLoss, setFormInputLoss] = useState('');
  const [formOutputLoss, setFormOutputLoss] = useState('');

  // State kalkulasi dinamis posisi titik lokasi (KM / meter) dan redaman optik antar-node (ODP - JB - ODP)
  const [dynamicLocationCalc, setDynamicLocationCalc] = useState<{
    route: FiberRoute;
    km: number;
    kmStr: string;
    prevNodeName?: string;
    prevDistanceMeters?: number;
    cableLoss?: number;
    prevOutputLoss?: number;
    estimatedInputLoss?: number;
    nextNodeName?: string;
    nextDistanceMeters?: number;
    dynamicLocDesc: string;
  } | null>(null);

  // Helper kalkulator dinamis titik lokasi dan estimasi redaman berantai
  const computeDynamicLocationAndLoss = (
    route: FiberRoute,
    km: number,
    targetType: 'SERVER' | 'ODC' | 'ODP' | 'CLOSURE' | 'JOINT_CLOSURE',
    excludeNodeId?: string
  ) => {
    const kmStr = km.toFixed(2);
    const attachedNodes = getRouteAttachedNodes(route, nodesRef.current)
      .filter((a) => !excludeNodeId || a.node.id !== excludeNodeId);
    const upstream = attachedNodes.filter((a) => a.kmMarker < km).slice(-1)[0];
    const downstream = attachedNodes.filter((a) => a.kmMarker > km)[0];
    const deltaKm = upstream ? parseFloat((km - upstream.kmMarker).toFixed(3)) : km;
    const deltaMeters = Math.round(deltaKm * 1000);
    const rate = parseFloat((route.attenuation || '0.35').replace(/[^\d.]/g, '')) || 0.35;
    const cableLoss = parseFloat(((deltaMeters / 1000) * rate).toFixed(2));

    let upstreamOutVal: number | null = null;
    let upstreamLabel = '';

    if (upstream) {
      upstreamLabel = upstream.node.name;
      const pNode = upstream.node;
      if (pNode.outputAttenuation) {
        const v = parseFloat(pNode.outputAttenuation.replace(/[^\d.-]/g, ''));
        if (!isNaN(v)) upstreamOutVal = v;
      } else if (pNode.avgAttenuation && pNode.avgAttenuation.includes('dB')) {
        const v = parseFloat(pNode.avgAttenuation.replace(/[^\d.-]/g, ''));
        if (!isNaN(v)) upstreamOutVal = v;
      } else if (pNode.inputAttenuation) {
        const v = parseFloat(pNode.inputAttenuation.replace(/[^\d.-]/g, ''));
        if (!isNaN(v)) {
          const r0 = pNode.splitterRatios?.[0]?.ratio || (pNode.splitterRatio?.match(/\d+:\d+/)?.[0]);
          const det = r0 ? getRatioDetail(r0) : null;
          const lossPass = det ? det.lossPass : (pNode.type === 'CLOSURE' || pNode.type === 'JOINT_CLOSURE' ? 0.05 : 1.5);
          upstreamOutVal = parseFloat((v - lossPass).toFixed(2));
        }
      } else if (pNode.type === 'SERVER') {
        upstreamOutVal = 5.0; // OLT +5 dBm
      } else if (pNode.type === 'ODC') {
        upstreamOutVal = -2.5; // ODC -2.5 dBm
      }
    } else {
      const srcNode = nodesRef.current.find((n) => n.id === route.sourceNodeId);
      if (srcNode) {
        upstreamLabel = srcNode.name;
        if (srcNode.type === 'SERVER') upstreamOutVal = 5.0;
        else if (srcNode.type === 'ODC') upstreamOutVal = -2.5;
        else if (srcNode.outputAttenuation) {
          const v = parseFloat(srcNode.outputAttenuation.replace(/[^\d.-]/g, ''));
          if (!isNaN(v)) upstreamOutVal = v;
        }
      }
    }

    const spliceLoss = targetType === 'CLOSURE' || targetType === 'JOINT_CLOSURE' ? 0.05 : 0.1;
    const estimatedInput = upstreamOutVal !== null ? parseFloat((upstreamOutVal - cableLoss - spliceLoss).toFixed(2)) : undefined;

    // Jika belum ada node sebelumnya, titik nol adalah Server
    const serverNode = nodesRef.current.find((n) => n.type === 'SERVER');
    if (!upstream) {
      upstreamLabel = serverNode ? `${serverNode.name} (Titik Nol)` : 'Server / POP (Titik Nol)';
      if (upstreamOutVal === null) upstreamOutVal = 5.0;
    }

    const distText = formatDistanceKmOrM(deltaMeters, false);
    const dynamicLocDesc = upstream && deltaMeters > 0
      ? `KM ${kmStr} (${distText} dari ${upstreamLabel})`
      : `KM ${kmStr} (${upstreamLabel || route.name})`;

    return {
      route,
      km,
      kmStr,
      prevNodeName: upstreamLabel,
      prevDistanceMeters: deltaMeters,
      cableLoss,
      prevOutputLoss: upstreamOutVal ?? undefined,
      estimatedInputLoss: estimatedInput,
      nextNodeName: downstream?.node.name,
      nextDistanceMeters: downstream ? Math.round((downstream.kmMarker - km) * 1000) : undefined,
      dynamicLocDesc,
    };
  };

  // State bantuan untuk teknisi lapangan di drawer ODP
  const [isCopiedOdp, setIsCopiedOdp] = useState(false);
  const [isCopiedClosure, setIsCopiedClosure] = useState(false);
  const [showOdpClients, setShowOdpClients] = useState(false);

  // Helper teknisi: format teks arah/tujuan agar tidak menampilkan enum mentah seperti __next_splitter__
  const formatTechnicianDirection = (dir?: string, targetRouteName?: string) => {
    if (!dir || dir.trim() === '') return targetRouteName ? `Line Fiber: ${targetRouteName}` : 'Jalur Utama';
    if (dir === '__next_splitter__') return '⛓ Sambung ke Rasio Berikutnya';
    if (dir === '__pelanggan__') return 'Menuju Spliter';
    return dir;
  };

  // Helper teknisi: render dot & nomor core fiber secara minimalis (tanpa kotak border/background)
  const renderTechnicianCoreBadge = (coreNum?: number) => {
    if (!coreNum || coreNum <= 0) return null;
    const cc = BASE_12_CORE_COLORS[(coreNum - 1) % 12];
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-200 shrink-0 font-medium">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
          style={{
            backgroundColor: cc?.hex,
            border: cc?.borderHex ? `1px solid ${cc.borderHex}` : '1px solid rgba(148, 163, 184, 0.4)',
          }}
        />
        <span>#{coreNum} {cc?.name}</span>
      </span>
    );
  };

  // Helper teknisi: format teks angka & satuan dBm optik (sesuai input pengguna)
  const formatTechnicianDbm = (val?: string) => {
    if (!val || val === '-' || val.trim() === '') return '-';
    const trimmed = val.trim();
    if (trimmed.toLowerCase().endsWith('dbm')) return trimmed;
    return `${trimmed} dBm`;
  };

  const getTechnicianDbmParts = (val?: string) => {
    if (!val || val === '-' || val.trim() === '') return { num: '—', unit: '' };
    const cleaned = val.replace(/dbm/gi, '').trim();
    return {
      num: cleaned || '—',
      unit: cleaned ? 'dBm' : '',
    };
  };

  // Helper teknisi: evaluasi kualitas redaman OPM (teks polos netral tanpa border/bg)
  const getAttenuationQuality = (val?: string, isInput = false) => {
    if (!val || val === '-' || val.trim() === '') return null;
    const num = parseFloat(val.replace(/[^\d.-]/g, ''));
    if (isNaN(num)) return null;
    const dbm = num > 0 ? -num : num;

    if (isInput) {
      if (dbm >= -18 && dbm <= -8) return { label: 'Optimal', color: 'text-slate-400' };
      if (dbm > -22 && dbm < -18) return { label: 'Normal', color: 'text-slate-400' };
      return { label: 'Kurang Baik', color: 'text-slate-400' };
    } else {
      if (dbm >= -23 && dbm <= -15) return { label: 'Optimal', color: 'text-slate-400' };
      if (dbm >= -26 && dbm < -23) return { label: 'Waspada', color: 'text-slate-400' };
      if (dbm < -26) return { label: 'Redup', color: 'text-slate-400' };
      return { label: 'Normal', color: 'text-slate-400' };
    }
  };

  // Helper teknisi: salin ringkasan data ODP untuk laporan cepat WhatsApp
  const handleCopyTechnicianOdpData = (node: MapNode) => {
    const ratiosText = node.splitterRatios && node.splitterRatios.length > 0
      ? node.splitterRatios.map((r, i) => {
        const [dA, dB] = r.ratio.includes(':') ? r.ratio.split(':') : ['—', '—'];
        const rawDirA = (r as any).directionDrop || (r as any).dropDirection || '__pelanggan__';
        const friendlyA = rawDirA === '__pelanggan__' ? 'Ke Port Pelanggan' : rawDirA;
        const friendlyB = r.direction === '__next_splitter__' ? `Sambung ke Rasio #${i + 2}` : (r.direction || 'Jalur Utama');
        const cInText = (r as any).coreInput ? ` [Masuk: Core #${(r as any).coreInput}]` : '';
        const cAText = (r as any).coreA ? ` [Core #${(r as any).coreA}]` : '';
        const cBText = (r as any).coreB ? ` [Core #${(r as any).coreB}]` : '';
        return `  • Rasio #${i + 1} (${r.ratio})${cInText}:\n    - Rasio ${dA}%: ${friendlyA}${cAText}\n    - Rasio ${dB}%: ${friendlyB}${cBText}`;
      }).join('\n')
      : `  • Splitter: ${node.splitterRatio || '-'}`;

    const summary = `📡 *DATA ODP: ${node.name}*
📍 Koordinat: ${node.lat.toFixed(5)}, ${node.lng.toFixed(5)}
🗺 Google Maps: https://www.google.com/maps?q=${node.lat},${node.lng}
${node.parentName ? `🏢 Asal Kabel: ${node.parentName}\n` : ''}${node.assignedCoreNumber ? `🎨 Core Masuk: Core #${node.assignedCoreNumber} (${node.assignedCoreColor || ''})\n` : ''}
🔀 *Pembagian Splitter Rasio:*
${ratiosText}

📊 *Redaman Optik:*
• Redaman Masuk: ${formatTechnicianDbm(node.inputAttenuation)}
• Redaman Keluar: ${formatTechnicianDbm(node.outputAttenuation || node.avgAttenuation)}

🔌 *Kapasitas Port:*
• ${node.used || 0} / ${node.capacity || 16} Terpakai (${Math.max(0, (node.capacity || 16) - (node.used || 0))} Bebas)`;

    navigator.clipboard.writeText(summary);
    setIsCopiedOdp(true);
    setTimeout(() => setIsCopiedOdp(false), 2000);
    showToast(`✓ Data ${node.name} berhasil disalin! Siap dikirim ke WhatsApp.`);
  };

  // Helper teknisi: salin ringkasan data Joint Closure (JC) untuk laporan WhatsApp
  const handleCopyTechnicianClosureData = (node: MapNode) => {
    const hasRatios = Boolean(
      (node.splitterRatios && node.splitterRatios.length > 0) ||
      (node.splitterRatio && node.splitterRatio !== 'Tanpa Rasio' && node.splitterRatio.includes(':'))
    );

    let ratioText = '';
    if (hasRatios && node.splitterRatios && node.splitterRatios.length > 0) {
      ratioText = `\n📊 *Pembagian Splitter Rasio (Bagi Redaman):*\n` +
        node.splitterRatios.map((r, i) => {
          const [pctA, pctB] = r.ratio.includes(':') ? r.ratio.split(':') : ['50', '50'];
          const coreIn = (r as any).coreInput ? `Core Masuk: #${(r as any).coreInput}` : '';
          const dirA = formatTechnicianDirection((r as any).directionDrop || '', r.targetRouteName);
          const dirB = r.direction === '__next_splitter__' ? `Sambung ke Rasio #${i + 2}` : formatTechnicianDirection(r.direction || '', r.targetRouteName);
          const coreA = (r as any).coreA ? ` [Core #${(r as any).coreA}]` : '';
          const coreB = (r as any).coreB ? ` [Core #${(r as any).coreB}]` : '';
          return `  • Rasio #${i + 1} (${r.ratio}) ${coreIn ? `(${coreIn})` : ''}\n    - Kaki ${pctA}%: ${dirA}${coreA}\n    - Kaki ${pctB}%: ${dirB}${coreB}`;
        }).join('\n') + '\n';
    }

    const splicesText = node.spliceMaps && node.spliceMaps.length > 0
      ? node.spliceMaps.map((sm, i) => {
        const inTxt = sm.inputCoreNumber ? `Core #${sm.inputCoreNumber}` : 'Core -';
        const outTxt = sm.outputCoreNumber ? `Core #${sm.outputCoreNumber}` : 'Core -';
        const routeTxt = sm.targetRouteName || sm.label || 'Kabel Lanjutan';
        return `  • Sambungan #${i + 1}: ${inTxt} ➔ ${routeTxt} [${outTxt}]`;
      }).join('\n')
      : hasRatios ? '' : `  • Sambungan: ${node.assignedCoreNumber ? `Core #${node.assignedCoreNumber} (${node.assignedCoreColor || ''})` : 'Direct Splice'}`;

    const summary = `📦 *DATA JOINT CLOSURE: ${node.name}*
📍 Koordinat: ${node.lat.toFixed(5)}, ${node.lng.toFixed(5)}
🗺 Google Maps: https://www.google.com/maps?q=${node.lat},${node.lng}
${node.parentName || node.parentRouteName ? `🏢 Asal Jalur: ${node.parentName || node.parentRouteName}\n` : ''}${node.assignedCoreNumber ? `🎨 Core Masuk: Core #${node.assignedCoreNumber} (${node.assignedCoreColor || ''})\n` : ''}${ratioText}${splicesText ? `🔗 *Daftar Sambungan Core (Splicing):*\n${splicesText}\n` : ''}
🔌 *Kapasitas Sambungan:*
• ${node.used || 0} / ${node.capacity || 2} Core Tersambung (${Math.max(0, (node.capacity || 2) - (node.used || 0))} Cadangan/Bebas)
${node.model ? `🏷 Model Fisik: ${node.model}\n` : ''}${node.poleLocation ? `📌 Lokasi: ${node.poleLocation}\n` : ''}${node.inputAttenuation ? `⚡ Redaman Input (OPM): ${node.inputAttenuation}\n` : ''}${node.outputAttenuation ? `⚡ Redaman Output: ${node.outputAttenuation}\n` : (node.avgAttenuation ? `⚡ Redaman: ${node.avgAttenuation}\n` : '')}`;

    navigator.clipboard.writeText(summary);
    setIsCopiedClosure(true);
    setTimeout(() => setIsCopiedClosure(false), 2000);
    showToast(`✓ Data ${node.name} berhasil disalin! Siap dikirim ke WhatsApp.`);
  };

  const handleSelectPppoeSession = (session: MikrotikPppoeSession) => {
    setFormPppoeUser(session.username);
    setFormName(session.customerName);
    setFormCustomerNo(session.customerNo);
    setFormPhone(session.phone);
    setFormAddress(session.address);
    setFormModel(`${session.manufacturer} ${session.model}`);
    setFormSerial(session.serialNumber);
    setFormMac(session.callerIdMac);
    setFormWanIp(session.ipAddress);
    setFormRxPower(session.rxPower);
    setFormPackage(session.profile);
    showToast(`✓ Sesi PPPoE ${session.username} dari MikroTik berhasil dikaitkan ke ONT!`);
  };

  // List username PPPoE yang sudah terpasang sebagai ONT di peta (akan hilang dari daftar pilihan)
  const installedOntUsernames = useMemo(() => {
    const list: string[] = [];
    nodes.forEach((n) => {
      if (n.type === 'ONT') {
        if (n.pppoeUser) {
          list.push(n.pppoeUser);
        } else {
          // Cocokkan juga via customerNo atau serial jika ada
          const matched = pppoeSessions.find(
            (s) =>
              (n.customerNo && s.customerNo === n.customerNo) ||
              (n.serial && s.serialNumber && s.serialNumber.toUpperCase() === n.serial.toUpperCase())
          );
          if (matched) list.push(matched.username);
        }
      }
    });
    return list;
  }, [nodes, pppoeSessions]);

  // Selected Route & Fiber Line CRUD State
  const [selectedRoute, setSelectedRoute] = useState<FiberRoute | null>(null);
  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FiberRoute | null>(null);

  // Form Fields for Fiber Line
  const [routeFormName, setRouteFormName] = useState('');
  const [routeFormCableType, setRouteFormCableType] = useState('Drop Core 2-Core');
  const [routeFormCoreCount, setRouteFormCoreCount] = useState(2);
  const [routeFormLength, setRouteFormLength] = useState(0);
  const [routeFormColor, setRouteFormColor] = useState('#3B82F6');
  const [routeFormStatus, setRouteFormStatus] = useState<'NORMAL' | 'DEGRADED' | 'CUT'>('NORMAL');
  const [routeFormAttenuation, setRouteFormAttenuation] = useState('0.35 dB/km');
  const [routeFormSourceNode, setRouteFormSourceNode] = useState('');
  const [routeFormTargetNode, setRouteFormTargetNode] = useState('');
  const [routeFormNotes, setRouteFormNotes] = useState('');

  // Tile Layer Ref & Provider State
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapTileLayer, setMapTileLayer] = useState<'google-hybrid' | 'google-roadmap' | 'osm' | 'carto-dark'>('google-hybrid');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [settingsDefaultCapacity, setSettingsDefaultCapacity] = useState('16');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [listFilterType, setListFilterType] = useState<'ALL' | 'SERVER' | 'ODC' | 'ODP' | 'ONT' | 'ROUTE' | 'CLOSURE'>('ALL');
  const [listSearch, setListSearch] = useState('');
  const [selectedTableNodeIds, setSelectedTableNodeIds] = useState<string[]>([]);
  const [selectedTableRouteIds, setSelectedTableRouteIds] = useState<string[]>([]);

  // Center Map & Your Location State
  const [mapCenter, setMapCenter] = useState<[number, number]>(getStoredCenter);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  // Inisialisasi Map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const initialCenter = getStoredCenter();
    const map = L.map(mapContainer.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false, // Relokasi tombol zoom ke kiri-bawah agar tidak menutupi toolbar atas di HP
      scrollWheelZoom: true, // Pastikan zoom scroll wheel mouse aktif 100%
      wheelPxPerZoomLevel: 90, // Respon scroll yang mantap, tidak terlalu liar dan halus
      wheelDebounceTime: 40,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    // Pasang tombol Zoom di kiri-bawah agar header atas bebas dan luas
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Tile Layer Satelit Google Hybrid (Citra Satelit Resolusi Tinggi + Label Jalan)
    const tile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps Hybrid',
      keepBuffer: 4,
    }).addTo(map);

    tileLayerRef.current = tile;
    mapInstance.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Tile Layer saat mapTileLayer berubah
  const applyTileLayer = (provider: 'google-hybrid' | 'google-roadmap' | 'osm' | 'carto-dark') => {
    setMapTileLayer(provider);
    const map = mapInstance.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    let url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let maxZoom = 20;
    let attr = '&copy; Google Maps Hybrid';

    if (provider === 'google-roadmap') {
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
      attr = '&copy; Google Maps Roadmap';
    } else if (provider === 'osm') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
      attr = '&copy; OpenStreetMap contributors';
    } else if (provider === 'carto-dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      maxZoom = 19;
      attr = '&copy; CARTO';
    }

    tileLayerRef.current = L.tileLayer(url, {
      maxZoom,
      attribution: attr,
      keepBuffer: 4,
    }).addTo(map);
  };

  // Invalidate Map Size saat kembali ke tampilan Map
  useEffect(() => {
    if (viewMode === 'map') {
      setTimeout(() => {
        mapInstance.current?.invalidateSize();
      }, 100);
    }
  }, [viewMode]);

  // Helper untuk deteksi GPS Lokasi Pengguna (Your Location)
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setDynamicMoveToast('⚠️ Browser Anda tidak mendukung fitur Geolocation GPS.');
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 4000);
      return;
    }

    setIsLocatingUser(true);
    setDynamicMoveToast('🛰️ Mencari sinyal GPS lokasi Anda...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedLat = parseFloat(latitude.toFixed(6));
        const roundedLng = parseFloat(longitude.toFixed(6));
        setUserLocation([roundedLat, roundedLng]);

        const map = mapInstance.current;
        if (map) {
          if (viewMode !== 'map') setViewMode('map');
          map.flyTo([roundedLat, roundedLng], 17, { animate: true });

          // Buat atau perbarui marker lokasi pengguna
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }

          const pulseIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
              <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 30px; height: 30px; background-color: #38BDF8; opacity: 0.5; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="width: 14px; height: 14px; background-color: #0284C7; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 14px rgba(2,132,199,0.9); z-index: 2;"></div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const marker = L.marker([roundedLat, roundedLng], { icon: pulseIcon })
            .addTo(map)
            .bindTooltip(
              `<div style="font-weight:bold; color:#0284c7;">📍 Lokasi Anda Saat Ini</div><div style="font-size:10px; color:#64748B;">Akurasi: &plusmn;${Math.round(accuracy)} meter<br/>Koordinat: ${roundedLat}, ${roundedLng}</div>`,
              { permanent: false, direction: 'top', offset: [0, -15] }
            );

          userLocationMarkerRef.current = marker;
        }

        setDynamicMoveToast(`✓ Lokasi Anda ditemukan (${roundedLat}, ${roundedLng}) &bull; Akurasi ±${Math.round(accuracy)}m`);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 4000);
      },
      (err) => {
        setIsLocatingUser(false);
        let errMsg = 'Gagal mengakses sensor GPS.';
        if (err.code === 1) errMsg = 'Izin lokasi ditolak oleh browser. Buka izin lokasi di browser Anda.';
        else if (err.code === 2) errMsg = 'Posisi sinyal GPS tidak tersedia saat ini.';
        else if (err.code === 3) errMsg = 'Waktu pencarian lokasi GPS habis (timeout).';
        setDynamicMoveToast(`⚠️ ${errMsg}`);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Helper untuk Memusatkan Peta (Center Map & Jangkauan Seluruh Jaringan)
  const handleCenterMap = () => {
    const map = mapInstance.current;
    if (!map) return;

    if (viewMode !== 'map') setViewMode('map');

    // Kumpulkan semua titik koordinat yang ada di peta (nodes + routes)
    const allPoints: [number, number][] = [];
    nodes.forEach((n) => allPoints.push([n.lat, n.lng]));
    routes.forEach((r) => r.coords.forEach((c) => allPoints.push(c)));

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true });
      setDynamicMoveToast(`✓ Peta dipusatkan ke seluruh jaringan (${nodes.length} node, ${routes.length} jalur kabel)`);
    } else {
      map.flyTo(mapCenter, 15, { animate: true });
      setDynamicMoveToast(`✓ Peta dipusatkan ke titik pusat (${mapCenter[0].toFixed(4)}, ${mapCenter[1].toFixed(4)})`);
    }

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  // Helper untuk menyisipkan SERVER / ODC / ODP / CLOSURE langsung ke dalam bentangan kabel fiber (mid-span access)
  const handleInsertNodeToRoute = (
    route: FiberRoute,
    latlng: { lat: number; lng: number },
    targetType: 'SERVER' | 'ODC' | 'ODP' | 'CLOSURE' = 'ODP'
  ) => {
    const isReversed = isRouteInvertedFromRoot(route, nodesRef.current);
    const snap = snapPointToRoute([latlng.lat, latlng.lng], route.coords, isReversed);
    if (!snap) return;

    const km = snap.distanceKm;
    const kmStr = km.toFixed(2);
    const cleanRouteName = route.name.replace(/^Jalur\s+/i, '');
    const defName =
      targetType === 'SERVER'
        ? `Server-POP-${cleanRouteName.slice(0, 8)}-KM${kmStr}`
        : targetType === 'CLOSURE'
          ? `JC-${cleanRouteName.slice(0, 10)}-KM${kmStr}`
          : `${targetType}-${cleanRouteName.slice(0, 10)}-KM${kmStr}`;

    setPendingNode({
      type: targetType,
      lat: snap.snappedCoord[0],
      lng: snap.snappedCoord[1],
      parentRouteId: route.id,
      parentRouteName: route.name,
      routeKmMarker: km,
      insertIndex: snap.insertIndex,
    });

    const dyn = computeDynamicLocationAndLoss(route, km, targetType);
    setDynamicLocationCalc(dyn);

    setFormName(defName);
    setFormRouteId(route.id);
    setFormKmMarker(km);
    setFormParent(route.name);
    setFormLocation(dyn.dynamicLocDesc);
    const defSplitter =
      targetType === 'SERVER' ? '1:64' : targetType === 'ODC' ? '1:4' : targetType === 'CLOSURE' ? 'Tanpa Rasio' : '1:8';
    setFormCapacity(targetType === 'SERVER' ? '64' : targetType === 'ODC' ? '4' : targetType === 'CLOSURE' ? '2' : '8');
    setFormSplitter(defSplitter);
    setFormRatios([
      { id: `ratio-${Date.now()}`, ratio: '80:20', direction: 'Jalur Utama' },
    ]);
    if (dyn.estimatedInputLoss !== undefined) {
      setFormInputLoss(String(dyn.estimatedInputLoss.toFixed(2)));
    } else {
      setFormInputLoss(targetType === 'CLOSURE' ? '0.02' : '-14.00');
    }
    setFormOutputLoss('');
    setFormModel('Inline / Horizontal');

    // Auto-select core pertama yang masih AVAILABLE pada rute kabel ini
    const routeCores = route.cores || generateDefaultCores(route.coreCount);
    const availableCore = routeCores.find((c) => c.status === 'AVAILABLE') || routeCores[0];
    const initialCoreNum = availableCore ? availableCore.coreNumber : 1;
    setFormAssignedCore(initialCoreNum);
    setFormOutputCore(initialCoreNum);
    setFormSpliceMaps([
      {
        id: `splice-${Date.now()}`,
        label: 'Sambungan 1',
        targetRouteId: route.id,
        targetRouteName: route.name,
        inputCoreNumber: initialCoreNum,
        outputCoreNumber: initialCoreNum,
      },
    ]);

    setActiveTool('NONE');
    setCableInsertMode(null);
  };

  // Inisiasi Cut Line saat user mengklik jalur kabel
  const handleInitiateCutLine = (route: FiberRoute, latlng: { lat: number; lng: number }) => {
    const isReversed = isRouteInvertedFromRoot(route, nodesRef.current);
    const snap = snapPointToRoute([latlng.lat, latlng.lng], route.coords, isReversed);
    if (!snap) return;

    setPendingCutAction({
      route,
      snappedCoord: snap.snappedCoord,
      insertIndex: snap.insertIndex,
      distanceKm: snap.distanceKm,
      distanceMeters: snap.distanceMetersFromStart,
    });
    setActiveTool('NONE');
  };

  // 1. Eksekusi Pemotongan Kabel Menjadi 2 Segmen Rute
  const handleSplitRoute = (
    route: FiberRoute,
    snappedCoord: [number, number],
    insertIndex: number,
    insertJointClosure: boolean
  ) => {
    // Segmen 1: coords dari 0 sampai (insertIndex - 1) + snappedCoord
    const segment1Coords: [number, number][] = [
      ...route.coords.slice(0, insertIndex),
      snappedCoord,
    ];

    // Segmen 2: snappedCoord + coords dari insertIndex sampai akhir
    const segment2Coords: [number, number][] = [
      snappedCoord,
      ...route.coords.slice(insertIndex),
    ];

    if (segment1Coords.length < 2 || segment2Coords.length < 2) {
      showToast('⚠️ Titik potong terlalu dekat dengan ujung kabel.');
      setPendingCutAction(null);
      return;
    }

    const len1 = Math.round(calculateLineDistance(segment1Coords));
    const len2 = Math.round(calculateLineDistance(segment2Coords));

    const baseName = route.name.replace(/\s*-\s*Segmen\s*[A-Z0-9]+$/i, '');
    const id1 = `route-${Date.now()}-A`;
    const id2 = `route-${Date.now()}-B`;

    let newClosureNode: MapNode | null = null;
    if (insertJointClosure) {
      const kmStr = (len1 / 1000).toFixed(2);
      newClosureNode = {
        id: `node-${Date.now()}-jc`,
        name: `JC-${baseName.replace(/^Jalur\s+/i, '').slice(0, 10)}-KM${kmStr}`,
        type: 'CLOSURE',
        lat: snappedCoord[0],
        lng: snappedCoord[1],
        capacity: 2,
        used: 2,
        status: 'ONLINE',
        parentRouteId: id1,
        parentRouteName: `${baseName} - Segmen A`,
        routeKmMarker: len1 / 1000,
        model: 'Inline / Horizontal',
        splitterRatio: 'Tanpa Rasio',
      };
    }

    const currentVertexIds = route.vertexNodeIds || getRouteVertexNodeIds(route, nodesRef.current);
    const jcNodeId = newClosureNode ? newClosureNode.id : null;

    const segment1VertexIds: (string | null)[] = [
      ...currentVertexIds.slice(0, insertIndex),
      jcNodeId,
    ];

    const segment2VertexIds: (string | null)[] = [
      jcNodeId,
      ...currentVertexIds.slice(insertIndex),
    ];

    const route1: FiberRoute = {
      ...route,
      id: id1,
      name: `${baseName} - Segmen A`,
      lengthMeter: len1,
      coords: segment1Coords,
      vertexNodeIds: segment1VertexIds,
      sourceNodeId: route.sourceNodeId,
      sourceNode: route.sourceNode,
      targetNodeId: newClosureNode?.id,
      targetNode: newClosureNode?.name || `${baseName} (Titik Potong)`,
      status: 'NORMAL',
      cores: generateDefaultCores(route.coreCount),
      cutCoord: undefined,
      cutKm: undefined,
    };

    const route2: FiberRoute = {
      ...route,
      id: id2,
      name: `${baseName} - Segmen B`,
      lengthMeter: len2,
      coords: segment2Coords,
      vertexNodeIds: segment2VertexIds,
      sourceNodeId: newClosureNode?.id,
      sourceNode: newClosureNode?.name || `${baseName} (Titik Potong)`,
      targetNodeId: route.targetNodeId,
      targetNode: route.targetNode,
      status: 'NORMAL',
      cores: generateDefaultCores(route.coreCount),
      cutCoord: undefined,
      cutKm: undefined,
    };

    // Reassign parentRouteId untuk node-node yang sebelumnya berada di rute ini
    setNodes((prevNodes) => {
      let nextNodes = prevNodes.map((n) => {
        if (n.parentRouteId === route.id) {
          const isRev1 = isRouteInvertedFromRoot(route1, prevNodes);
          const snap1 = snapPointToRoute([n.lat, n.lng], route1.coords, isRev1);
          const isRev2 = isRouteInvertedFromRoot(route2, prevNodes);
          const snap2 = snapPointToRoute([n.lat, n.lng], route2.coords, isRev2);

          const d1 = snap1 ? Math.hypot(n.lat - snap1.snappedCoord[0], n.lng - snap1.snappedCoord[1]) : Infinity;
          const d2 = snap2 ? Math.hypot(n.lat - snap2.snappedCoord[0], n.lng - snap2.snappedCoord[1]) : Infinity;

          if (d1 <= d2 && snap1) {
            return {
              ...n,
              parentRouteId: id1,
              parentRouteName: route1.name,
              routeKmMarker: snap1.distanceKm,
            };
          } else if (snap2) {
            return {
              ...n,
              parentRouteId: id2,
              parentRouteName: route2.name,
              routeKmMarker: snap2.distanceKm,
            };
          }
        }
        return n;
      });

      if (newClosureNode) {
        nextNodes = [...nextNodes, newClosureNode];
      }
      persistNodes(nextNodes);
      return nextNodes;
    });

    // Perbarui state routes
    setRoutes((prevRoutes) => {
      const nextRoutes = prevRoutes
        .filter((r) => r.id !== route.id)
        .concat([route1, route2]);
      persistRoutes(nextRoutes);
      return nextRoutes;
    });

    setPendingCutAction(null);
    setSelectedRoute(route1);
    showToast(`✓ Kabel '${route.name}' berhasil dipotong menjadi Segmen A (${len1}m) & Segmen B (${len2}m)!`);
  };

  // 2. Eksekusi Menandai Kabel Putus (Fiber Cut Incident)
  const handleMarkRouteCut = (
    route: FiberRoute,
    snappedCoord: [number, number],
    distanceKm: number
  ) => {
    setRoutes((prevRoutes) => {
      const nextRoutes = prevRoutes.map((r) => {
        if (r.id === route.id) {
          return {
            ...r,
            status: 'CUT' as const,
            cutCoord: snappedCoord,
            cutKm: distanceKm,
          };
        }
        return r;
      });
      persistRoutes(nextRoutes);
      return nextRoutes;
    });

    setSelectedRoute((prev) =>
      prev && prev.id === route.id
        ? { ...prev, status: 'CUT', cutCoord: snappedCoord, cutKm: distanceKm }
        : prev
    );

    setPendingCutAction(null);
    showToast(`⚠️ Insiden Fiber Cut ditandai pada '${route.name}' di KM ${distanceKm.toFixed(3)}!`);
  };

  // 3. Eksekusi Memulihkan Kabel yang Putus (Restore to Normal)
  const handleRestoreRoute = (route: FiberRoute) => {
    setRoutes((prevRoutes) => {
      const nextRoutes = prevRoutes.map((r) => {
        if (r.id === route.id) {
          return {
            ...r,
            status: 'NORMAL' as const,
            cutCoord: undefined,
            cutKm: undefined,
          };
        }
        return r;
      });
      persistRoutes(nextRoutes);
      return nextRoutes;
    });

    setSelectedRoute((prev) =>
      prev && prev.id === route.id
        ? { ...prev, status: 'NORMAL', cutCoord: undefined, cutKm: undefined }
        : prev
    );

    showToast(`✓ Sambungan kabel '${route.name}' berhasil dipulihkan (Normal)!`);
  };

  // Helper untuk menyambung / memperpanjang bentangan line fiber yang sudah ada (Extend Line)
  const handleStartExtendRoute = (route: FiberRoute) => {
    setExtendingRouteId(route.id);
    extendingRouteIdRef.current = route.id;

    setDrawingCoords([...route.coords]);
    drawingCoordsRef.current = [...route.coords];

    const vIds = route.vertexNodeIds || getRouteVertexNodeIds(route, nodesRef.current);
    setDrawingVertexNodeIds([...vIds]);
    drawingVertexNodeIdsRef.current = [...vIds];

    const startNode = route.sourceNodeId ? nodesRef.current.find((n) => n.id === route.sourceNodeId) : null;
    setRouteStartNode(startNode || null);
    setRouteFormSourceNode(route.sourceNode || startNode?.name || 'Awal Bentangan');

    const endNode = route.targetNodeId ? nodesRef.current.find((n) => n.id === route.targetNodeId) : null;
    setRouteEndNode(endNode || null);
    setRouteFormTargetNode(route.targetNode || endNode?.name || 'Ujung Bentangan');

    syncTempDrawingVisuals(route.coords, vIds);

    setActiveTool('FIBER_LINE');
    setSelectedRoute(null);

    setDynamicMoveToast(`🔗 Mode Sambung Kabel: Silakan klik belokan jalan atau titik perangkat untuk memperpanjang '${route.name}'`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 4500);
  };

  // Sinkronisasi visual polyline sementara dan titik-titik waypoint yang bisa di-drag untuk menyesuaikan kontur jalan
  const syncTempDrawingVisuals = (coords: [number, number][], vertexNodeIds: (string | null)[]) => {
    const map = mapInstance.current;
    if (!map) return;

    // Bersihkan marker sementara lama
    tempMarkersRef.current.forEach((m) => m.remove());
    tempMarkersRef.current = [];

    // Jika tidak ada koordinat tersisa
    if (coords.length === 0) {
      if (tempDrawLineRef.current) {
        tempDrawLineRef.current.remove();
        tempDrawLineRef.current = null;
      }
      return;
    }

    // Update atau buat garis polyline sementara
    if (!tempDrawLineRef.current) {
      tempDrawLineRef.current = L.polyline(coords, {
        color: '#38BDF8',
        weight: 4.2,
        dashArray: '5, 5',
        opacity: 0.95,
      }).addTo(map);
    } else {
      tempDrawLineRef.current.setLatLngs(coords);
    }

    // Render setiap titik sebagai Draggable Waypoint Marker untuk penyesuaian kontur jalan
    coords.forEach((coord, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === coords.length - 1 && coords.length > 1;
      const vertexId = vertexNodeIds[idx];
      const boundNode = vertexId ? nodesRef.current.find((n) => n.id === vertexId) : null;

      const bgColor = boundNode ? '#10B981' : isStart ? '#10B981' : isEnd ? '#0284C7' : '#38BDF8';
      const size = boundNode ? 14 : isStart || isEnd ? 13 : 11;
      const half = size / 2;

      const waypointIcon = L.divIcon({
        className: 'route-waypoint-icon',
        html: `
          <div title="Geser (drag) titik untuk menyesuaikan kontur belokan jalan" style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${bgColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            cursor: grab;
            transition: transform 0.1s ease;
          "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [half, half],
      });

      const marker = L.marker(coord, {
        icon: waypointIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Tooltip keterangan titik
      if (boundNode) {
        marker.bindTooltip(`📍 ${boundNode.name}`, {
          direction: 'top',
          offset: [0, -8],
        });
      } else if (isStart) {
        marker.bindTooltip('🟢 Titik Awal Kabel (Geser untuk ubah posisi)', {
          direction: 'top',
          offset: [0, -8],
        });
      } else if (isEnd) {
        marker.bindTooltip('🎯 Titik Ujung Kabel (Geser untuk ubah posisi)', {
          direction: 'top',
          offset: [0, -8],
        });
      }

      // Drag listener untuk penyesuaian kontur jalan secara real-time
      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('drag', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        const lat = parseFloat(newPos.lat.toFixed(6));
        const lng = parseFloat(newPos.lng.toFixed(6));

        const updated = [...drawingCoordsRef.current];
        if (idx >= 0 && idx < updated.length) {
          updated[idx] = [lat, lng];
          drawingCoordsRef.current = updated;
          if (tempDrawLineRef.current) {
            tempDrawLineRef.current.setLatLngs(updated);
          }
        }
      });

      marker.on('dragend', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        const lat = parseFloat(newPos.lat.toFixed(6));
        const lng = parseFloat(newPos.lng.toFixed(6));

        setDrawingCoords((prev) => {
          const updated = [...prev];
          if (idx >= 0 && idx < updated.length) {
            updated[idx] = [lat, lng];
            drawingCoordsRef.current = updated;
          }
          return updated;
        });

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      tempMarkersRef.current.push(marker);
    });
  };

  // Helper untuk menambah titik garis fiber (bisa dari klik node atau klik peta)
  const handlePointAdd = (lat: number, lng: number, node?: MapNode | null) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    const targetCoord: [number, number] = node ? [node.lat, node.lng] : [roundedLat, roundedLng];
    const targetNodeId: string | null = node ? node.id : null;

    const nextCoords: [number, number][] = [...drawingCoordsRef.current, targetCoord];
    const nextVertex: (string | null)[] = [...drawingVertexNodeIdsRef.current, targetNodeId];
    drawingCoordsRef.current = nextCoords;
    drawingVertexNodeIdsRef.current = nextVertex;

    if (nextCoords.length === 1) {
      if (node) {
        setRouteStartNode(node);
        setRouteFormSourceNode(node.name);
      }
    } else {
      if (node) {
        setRouteEndNode(node);
        setRouteFormTargetNode(node.name);
      }
    }

    setDrawingCoords(nextCoords);
    setDrawingVertexNodeIds(nextVertex);
    syncTempDrawingVisuals(nextCoords, nextVertex);
  };

  // Fitur UNDO: Batalkan/hapus titik terakhir saat menarik kabel fiber
  const handleUndoPoint = () => {
    if (drawingCoordsRef.current.length === 0) return;

    const nextCoords = drawingCoordsRef.current.slice(0, -1);
    const nextVertex = drawingVertexNodeIdsRef.current.slice(0, -1);

    drawingCoordsRef.current = nextCoords;
    drawingVertexNodeIdsRef.current = nextVertex;
    setDrawingCoords(nextCoords);
    setDrawingVertexNodeIds(nextVertex);

    if (nextCoords.length === 0) {
      setRouteStartNode(null);
      setRouteEndNode(null);
      setRouteFormSourceNode('');
      setRouteFormTargetNode('');
    } else {
      const lastVertexId = nextVertex[nextVertex.length - 1];
      const lastNode = lastVertexId ? nodesRef.current.find((n) => n.id === lastVertexId) : null;
      setRouteEndNode(lastNode || null);
      if (lastNode) {
        setRouteFormTargetNode(lastNode.name);
      } else {
        setRouteFormTargetNode('Ujung Bentangan');
      }
    }

    syncTempDrawingVisuals(nextCoords, nextVertex);
  };

  // Fitur Menyesuaikan Belokan Jalan pada Rute yang Sudah Tersimpan (Adjust Saved Route)
  const syncAdjustingMarkers = (coords: [number, number][], route: FiberRoute) => {
    const map = mapInstance.current;
    if (!map) return;

    adjustingMarkersRef.current.forEach((m) => m.remove());
    adjustingMarkersRef.current = [];

    const routeLayers = routeLayersMapRef.current.get(route.id);

    // 1. Render Titik-Titik Node / Vertex Kabel
    coords.forEach((coord, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === coords.length - 1 && coords.length > 1;
      const size = isStart || isEnd ? 14 : 11;
      const half = size / 2;
      const bgColor = isStart ? '#10B981' : isEnd ? '#EC4899' : '#0284C7';

      const icon = L.divIcon({
        className: 'route-adjust-marker',
        html: `
          <div title="${isStart ? 'Titik Awal Bentangan' : isEnd ? 'Titik Akhir Bentangan' : `Node Belokan #${idx} (Geser untuk ubah kontur, klik kanan untuk hapus)`}" style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${bgColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            cursor: grab;
            transition: transform 0.15s ease;
          "></div>
        `,
        iconSize: [size, size],
        iconAnchor: [half, half],
      });

      const marker = L.marker(coord, {
        icon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      // Tooltip panduan teknisi
      marker.bindTooltip(
        isStart
          ? '<b>Titik Awal</b> (Geser untuk atur)'
          : isEnd
          ? '<b>Titik Akhir</b> (Geser untuk atur)'
          : `<b>Node Belokan #${idx}</b><br/><span style="font-size:10px;color:#64748B;">Geser posisi &bull; Klik kanan untuk hapus</span>`,
        { direction: 'top', offset: [0, -half - 2] }
      );

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('drag', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        const lat = parseFloat(newPos.lat.toFixed(6));
        const lng = parseFloat(newPos.lng.toFixed(6));

        const updated = [...adjustingCoordsRef.current];
        if (idx >= 0 && idx < updated.length) {
          updated[idx] = [lat, lng];
          adjustingCoordsRef.current = updated;

          if (routeLayers) {
            routeLayers.glow.setLatLngs(updated);
            routeLayers.core.setLatLngs(updated);
            routeLayers.flowPulse?.setLatLngs(updated);
          }
        }
      });

      marker.on('dragend', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        const lat = parseFloat(newPos.lat.toFixed(6));
        const lng = parseFloat(newPos.lng.toFixed(6));

        const updated = [...adjustingCoordsRef.current];
        if (idx >= 0 && idx < updated.length) {
          updated[idx] = [lat, lng];
          adjustingCoordsRef.current = updated;
          setAdjustingCoords(updated);
        }

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      // Fitur Hapus Titik Belokan dengan Klik Kanan (Context Menu)
      if (!isStart && !isEnd) {
        marker.on('contextmenu', (e: L.LeafletMouseEvent) => {
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
            e.originalEvent.preventDefault();
          }
          if (adjustingCoordsRef.current.length <= 2) {
            alert('Kabel minimal harus memiliki 2 titik (Awal dan Akhir bentangan).');
            return;
          }
          const nextCoords = adjustingCoordsRef.current.filter((_, pIdx) => pIdx !== idx);
          adjustingCoordsRef.current = nextCoords;
          setAdjustingCoords(nextCoords);

          if (routeLayers) {
            routeLayers.glow.setLatLngs(nextCoords);
            routeLayers.core.setLatLngs(nextCoords);
            routeLayers.flowPulse?.setLatLngs(nextCoords);
          }
          syncAdjustingMarkers(nextCoords, route);

          setDynamicMoveToast('✓ Titik node belokan berhasil dihapus.');
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 2500);
        });
      }

      adjustingMarkersRef.current.push(marker);
    });

    // 2. Render Virtual Midpoint Marker (+) di Setiap Segmen untuk Sisip Node Belokan
    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;

      const plusIcon = L.divIcon({
        className: 'route-midpoint-node-marker',
        html: `
          <div title="Klik untuk menambah titik node belokan baru di sini" style="
            width: 18px;
            height: 18px;
            background-color: #0284C7;
            color: #FFFFFF;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 900;
            line-height: 1;
            cursor: pointer;
            transition: transform 0.15s ease, background-color 0.15s ease;
          " onmouseover="this.style.transform='scale(1.25)';this.style.backgroundColor='#0369A1'" onmouseout="this.style.transform='scale(1)';this.style.backgroundColor='#0284C7'">+</div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const midMarker = L.marker([midLat, midLng], {
        icon: plusIcon,
        interactive: true,
      }).addTo(map);

      const insertIndex = i + 1;
      midMarker.on('click', (e) => {
        if (e.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent);
          e.originalEvent.stopPropagation();
        }
        const nextCoords = [...adjustingCoordsRef.current];
        nextCoords.splice(insertIndex, 0, [parseFloat(midLat.toFixed(6)), parseFloat(midLng.toFixed(6))]);
        adjustingCoordsRef.current = nextCoords;
        setAdjustingCoords(nextCoords);

        if (routeLayers) {
          routeLayers.glow.setLatLngs(nextCoords);
          routeLayers.core.setLatLngs(nextCoords);
          routeLayers.flowPulse?.setLatLngs(nextCoords);
        }
        syncAdjustingMarkers(nextCoords, route);

        setDynamicMoveToast('✓ Node belokan baru berhasil disisipkan! Geser titik pin untuk menyesuaikan kontur.');
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3000);
      });

      adjustingMarkersRef.current.push(midMarker);
    }
  };

  const handleInsertBendPointAtLatLng = (latlng: L.LatLng) => {
    if (!adjustingRouteRef.current) return;
    const snap = snapPointToRoute([latlng.lat, latlng.lng], adjustingCoordsRef.current);
    const insertIdx = snap ? snap.insertIndex : 1;
    const newPoint: [number, number] = [
      parseFloat(latlng.lat.toFixed(6)),
      parseFloat(latlng.lng.toFixed(6)),
    ];
    const nextCoords = [...adjustingCoordsRef.current];
    nextCoords.splice(insertIdx, 0, newPoint);
    adjustingCoordsRef.current = nextCoords;
    setAdjustingCoords(nextCoords);

    const layers = routeLayersMapRef.current.get(adjustingRouteRef.current.id);
    if (layers) {
      layers.glow.setLatLngs(nextCoords);
      layers.core.setLatLngs(nextCoords);
      layers.flowPulse?.setLatLngs(nextCoords);
    }
    syncAdjustingMarkers(nextCoords, adjustingRouteRef.current);

    setDynamicMoveToast('✓ Node belokan baru disisipkan pada garis kabel! Geser titik untuk mengatur jalur.');
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleStartAdjustRoute = (route: FiberRoute) => {
    setAdjustingRoute(route);
    adjustingRouteRef.current = route;
    const initialCoords = [...route.coords];
    setAdjustingCoords(initialCoords);
    adjustingCoordsRef.current = initialCoords;
    syncAdjustingMarkers(initialCoords, route);

    setDynamicMoveToast(`📍 Mode Atur Node & Belokan: Geser pin titik, klik '+' atau klik garis untuk menambah node rute '${route.name}'.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 4500);
  };

  const handleSaveAdjustRoute = () => {
    if (!adjustingRouteRef.current) return;
    const targetRoute = adjustingRouteRef.current;
    const updatedCoords = adjustingCoordsRef.current;
    const newLength = calculateLineDistance(updatedCoords);

    setRoutes((prev) =>
      prev.map((r) =>
        r.id === targetRoute.id
          ? { ...r, coords: updatedCoords, lengthMeter: newLength }
          : r
      )
    );

    if (selectedRoute?.id === targetRoute.id) {
      setSelectedRoute((prev) =>
        prev ? { ...prev, coords: updatedCoords, lengthMeter: newLength } : null
      );
    }

    adjustingMarkersRef.current.forEach((m) => m.remove());
    adjustingMarkersRef.current = [];
    setAdjustingRoute(null);
    adjustingRouteRef.current = null;

    setDynamicMoveToast(`Kontur jalan jalur '${targetRoute.name}' berhasil disesuaikan & disimpan!`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleCancelAdjustRoute = () => {
    if (adjustingRouteRef.current) {
      const layers = routeLayersMapRef.current.get(adjustingRouteRef.current.id);
      if (layers) {
        layers.glow.setLatLngs(adjustingRouteRef.current.coords);
        layers.core.setLatLngs(adjustingRouteRef.current.coords);
        layers.flowPulse?.setLatLngs(adjustingRouteRef.current.coords);
      }
    }
    adjustingMarkersRef.current.forEach((m) => m.remove());
    adjustingMarkersRef.current = [];
    setAdjustingRoute(null);
    adjustingRouteRef.current = null;
  };

  // Update Markers & Lines pada Peta
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    linesRef.current.forEach((l) => l.remove());
    linesRef.current = [];
    routeLayersMapRef.current.clear();

    // Render Garis Fiber
    if (showRoutes) {
      routes.forEach((route) => {
        const isCut = route.status === 'CUT';
        const isDegraded = route.status === 'DEGRADED';
        const baseColor = route.color || (isCut ? '#EF4444' : isDegraded ? '#F59E0B' : '#3B82F6');
        const isSelected = selectedRoute?.id === route.id;

        const glow = L.polyline(route.coords, {
          color: baseColor,
          weight: isSelected ? 7.2 : 4.2,
          opacity: isSelected ? 0.45 : 0.22,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(map);

        const core = L.polyline(route.coords, {
          color: isCut ? '#FCA5A5' : isDegraded ? '#FDE68A' : '#93C5FD',
          weight: isSelected ? 3.0 : 1.8,
          dashArray: isCut ? '3, 5' : undefined,
          opacity: 0.95,
        }).addTo(map);

        // Garis Alur Sinyal Fiber Optik (Visual Alur Input -> Output mengalir dinamis)
        const flowPulse = L.polyline(route.coords, {
          color: isCut ? '#F87171' : isDegraded ? '#FBBF24' : '#FFFFFF',
          weight: isSelected ? 2.6 : 1.6,
          dashArray: '4, 14',
          opacity: isSelected ? 0.95 : 0.65,
          className: isCut ? undefined : 'fiber-flow-pulse-anim',
          interactive: false,
        }).addTo(map);

        linesRef.current.push(glow, core, flowPulse);
        routeLayersMapRef.current.set(route.id, { glow, core, flowPulse, route });

        // Tampilkan Indikator Visual Marker Titik Insiden jika kabel berstatus CUT
        if (isCut && route.cutCoord) {
          const cutIcon = L.divIcon({
            className: 'custom-cut-marker',
            html: `
              <div style="background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px #EF4444; border: 2px solid #ffffff; cursor: pointer;">
                <svg style="width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
                </svg>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          const cutMarker = L.marker(route.cutCoord, { icon: cutIcon }).addTo(map);
          cutMarker.bindTooltip(
            `<b>⚠️ FIBER CUT (KABEL PUTUS)</b><br/>${route.name}${route.cutKm !== undefined ? `<br/>Titik: KM ${route.cutKm.toFixed(3)}` : ''}`,
            { direction: 'top' }
          );
          cutMarker.on('click', (e) => {
            if (e.originalEvent) {
              L.DomEvent.stopPropagation(e.originalEvent);
              e.originalEvent.stopPropagation();
            }
            setSelectedRoute(route);
          });
          markersRef.current.push(cutMarker);
        }

        if (showLabels) {
          core.bindTooltip(
            `<b>${route.name}</b><br/>${route.cableType} &bull; ${route.lengthMeter}m ${isCut ? '<b style="color:#EF4444">(PUTUS)</b>' : isDegraded ? '<b style="color:#F59E0B">(HIGH LOSS)</b>' : ''
            }`,
            { direction: 'top', className: 'custom-fiber-tooltip' }
          );
        }

        const handlePolylineClick = (e: L.LeafletMouseEvent) => {
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent);
            e.originalEvent.stopPropagation();
            try {
              (e.originalEvent.target as any)?.blur?.();
            } catch {
              /* ignore */
            }
          }

          // 1. Jika sedang dalam mode penyesuaian belokan / node kabel
          if (adjustingRouteRef.current && adjustingRouteRef.current.id === route.id) {
            handleInsertBendPointAtLatLng(e.latlng);
            return;
          }

          // 2. Jika sedang dalam mode sisipkan ODP/ODC/JC untuk kabel ini
          if (cableInsertModeRef.current) {
            handleInsertNodeToRoute(route, e.latlng, cableInsertModeRef.current.nodeType);
            setCableInsertMode(null);
            return;
          }

          // 2. Jika user mengaktifkan tool ODP, ODC, atau CLOSURE dari toolbar
          if (activeToolRef.current === 'ODP' || activeToolRef.current === 'ODC' || activeToolRef.current === 'CLOSURE') {
            handleInsertNodeToRoute(route, e.latlng, activeToolRef.current as 'ODP' | 'ODC' | 'CLOSURE');
            return;
          }

          // 3. Jika user mengaktifkan tool CUT_LINE (Potong / Putus Kabel)
          if (activeToolRef.current === 'CUT_LINE') {
            handleInitiateCutLine(route, e.latlng);
            return;
          }

          // 4. Klik normal: pilih rute kabel
          setSelectedRoute(route);
          setSelectedNode(null);
        };

        core.on('click', handlePolylineClick);
      });
    }

    // Render Markers (Dengan fitur Draggable & Dinamis Jalur Kabel)
    nodes.forEach((node) => {
      let iconHtml = '';
      let iconSize: [number, number] = [20, 20];
      let iconAnchor: [number, number] = [10, 10];

      if (node.type === 'SERVER') {
        iconSize = [24, 24];
        iconAnchor = [12, 12];
        iconHtml = `
          <div style="background-color: #9333EA; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.5); border: 2px solid #ffffff; cursor: grab;">
            <svg style="width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          </div>
        `;
      } else if (node.type === 'ODC') {
        iconSize = [20, 20];
        iconAnchor = [10, 10];
        iconHtml = `
          <div style="background-color: #2563EB; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.45); border: 1.5px solid #ffffff; cursor: grab;">
            <span style="color: white; font-size: 7.5px; font-weight: 900; font-family: monospace; letter-spacing: -0.2px;">ODC</span>
          </div>
        `;
      } else if (node.type === 'ODP') {
        iconSize = [18, 18];
        iconAnchor = [9, 9];
        iconHtml = `
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.45); border: 1.5px solid #ffffff; cursor: grab;">
            <span style="color: #ffffff; font-size: 6.5px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -0.2px; line-height: 1;">ODP</span>
          </div>
        `;
      } else if (node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE') {
        iconSize = [18, 18];
        iconAnchor = [9, 9];
        iconHtml = `
          <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.45); border: 1.5px solid #ffffff; cursor: grab;">
            <span style="color: #ffffff; font-size: 6.5px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: -0.2px; line-height: 1;">JC</span>
          </div>
        `;
      } else if (node.type === 'ONT') {
        iconSize = [16, 16];
        iconAnchor = [8, 8];
        const isOffline = node.status === 'OFFLINE';
        const isWarn = node.status === 'ONLINE' && parseFloat(node.rxPower || '-20') < -24.0;
        const bgCol = isOffline ? '#DC2626' : isWarn ? '#D97706' : '#10B981';

        iconHtml = `
          <div style="background-color: ${bgCol}; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.4); border: 1.5px solid #ffffff; cursor: grab;">
            <svg style="width: 9px; height: 9px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-map-icon',
        html: iconHtml,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
      });

      const marker = L.marker([node.lat, node.lng], {
        icon: customIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      let tooltipText = `<b>${node.name}</b>`;
      if (node.type === 'SERVER') {
        tooltipText += `<br/>IP: ${node.ip || '-'} &bull; ${node.used}/${node.capacity} ONU`;
      } else if (node.type === 'ODC' || node.type === 'ODP') {
        tooltipText += `<br/>Kapasitas: ${node.used || 0}/${node.capacity || 16} Port`;
        if (node.assignedCoreNumber) {
          tooltipText += `<br/><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${node.assignedCoreHex || '#38BDF8'}; margin-right:4px; vertical-align:middle; border:1px solid #ffffff;"></span><span style="color:#F8FAFC; font-weight:bold; font-size:10.5px;">Core ${node.assignedCoreNumber} (${node.assignedCoreColor}${node.assignedTubeNumber ? ` - Tube ${node.assignedTubeNumber}` : ''})</span>`;
        }
      } else if (node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE') {
        tooltipText += `<br/>Kapasitas Sambungan: ${node.used || 0}/${node.capacity || 2} Core`;
        if (node.assignedCoreNumber) {
          tooltipText += `<br/><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${node.assignedCoreHex || '#f59e0b'}; margin-right:4px; vertical-align:middle; border:1px solid #ffffff;"></span><span style="color:#F8FAFC; font-weight:bold; font-size:10.5px;">Core ${node.assignedCoreNumber} (${node.assignedCoreColor || ''})</span>`;
        }
      } else if (node.type === 'ONT') {
        tooltipText += `<br/>Sinyal: ${node.rxPower} dBm (${node.status})`;
      }

      if (showLabels) {
        marker.bindTooltip(tooltipText, {
          direction: 'top',
          offset: [0, -10],
        });
      }

      // Drag Listener: Real-time dynamic updates for connected fiber routes
      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('drag', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        routeLayersMapRef.current.forEach(({ glow, core, flowPulse, route }) => {
          const vertexIds = route.vertexNodeIds || getRouteVertexNodeIds(route, nodesRef.current);
          if (vertexIds.includes(node.id)) {
            const updatedCoords: [number, number][] = route.coords.map((c, i) => {
              return vertexIds[i] === node.id ? [newPos.lat, newPos.lng] : c;
            });
            glow.setLatLngs(updatedCoords);
            core.setLatLngs(updatedCoords);
            flowPulse?.setLatLngs(updatedCoords);
          }
        });
      });

      marker.on('dragend', (e: L.LeafletEvent) => {
        const newPos = (e.target as L.Marker).getLatLng();
        const roundedLat = parseFloat(newPos.lat.toFixed(6));
        const roundedLng = parseFloat(newPos.lng.toFixed(6));

        let updatedKm: number | undefined = node.routeKmMarker;
        let updatedLocation: string | undefined = node.poleLocation;

        if (node.parentRouteId) {
          const parentRoute = routesRef.current.find((r) => r.id === node.parentRouteId);
          if (parentRoute) {
            const isReversed = isRouteInvertedFromRoot(parentRoute, nodesRef.current);
            const snap = snapPointToRoute([roundedLat, roundedLng], parentRoute.coords, isReversed);
            if (snap) {
              updatedKm = snap.distanceKm;
              const dyn = computeDynamicLocationAndLoss(parentRoute, snap.distanceKm, node.type as any, node.id);
              updatedLocation = dyn.dynamicLocDesc;
            }
          }
        }

        // 1. Update nodes state
        setNodes((prevNodes) =>
          prevNodes.map((n) =>
            n.id === node.id
              ? {
                ...n,
                lat: roundedLat,
                lng: roundedLng,
                routeKmMarker: updatedKm,
                poleLocation: updatedLocation || n.poleLocation,
              }
              : n
          )
        );

        // 2. Update routes state with recalculated length
        setRoutes((prevRoutes) =>
          prevRoutes.map((r) => {
            const vertexIds = r.vertexNodeIds || getRouteVertexNodeIds(r, nodesRef.current);
            if (!vertexIds.includes(node.id)) return r;
            const updatedCoords: [number, number][] = r.coords.map((c, i) => {
              return vertexIds[i] === node.id ? [roundedLat, roundedLng] : c;
            });
            return {
              ...r,
              coords: updatedCoords,
              vertexNodeIds: vertexIds,
              lengthMeter: calculateLineDistance(updatedCoords),
            };
          })
        );

        // 3. Update selectedNode if this node is currently open in drawer
        setSelectedNode((prev) =>
          prev?.id === node.id
            ? {
              ...prev,
              lat: roundedLat,
              lng: roundedLng,
              routeKmMarker: updatedKm,
              poleLocation: updatedLocation || prev.poleLocation,
            }
            : prev
        );

        // 4. Toast notification
        setDynamicMoveToast(
          updatedLocation
            ? `Titik '${node.name}' digeser ke ${updatedLocation}. Jarak & redaman otomatis dinamis!`
            : `Titik '${node.name}' digeser. Jalur kabel fiber otomatis dinamis mengikuti!`
        );
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);

        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      // Click Marker: Connect to fiber line if drawing, otherwise select node
      marker.on('click', (e: L.LeafletMouseEvent) => {
        if (e.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent);
          e.originalEvent.stopPropagation();
        }
        if (isDraggingRef.current) return;

        if (activeToolRef.current === 'FIBER_LINE') {
          handlePointAdd(node.lat, node.lng, node);
        } else if (activeToolRef.current === 'CUT_LINE') {
          let targetRoute: FiberRoute | null = null;
          let bestSnap: ReturnType<typeof snapPointToRoute> = null;
          for (const r of routesRef.current) {
            const snap = snapPointToRoute([node.lat, node.lng], r.coords);
            if (snap && snap.offsetMeters < 50) {
              if (!bestSnap || snap.offsetMeters < bestSnap.offsetMeters) {
                bestSnap = snap;
                targetRoute = r;
              }
            }
          }
          if (targetRoute && bestSnap) {
            handleInitiateCutLine(targetRoute, { lat: bestSnap.snappedCoord[0], lng: bestSnap.snappedCoord[1] });
          } else {
            showToast('✂️ Silakan klik tepat pada garis jalur kabel untuk memotong.');
          }
        } else {
          setSelectedNode(node);
          setSelectedRoute(null);
        }
      });

      markersRef.current.push(marker);
    });
  }, [nodes, routes, showRoutes, showLabels, selectedRoute]);

  // Klik Peta Handler
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      // 1. Jika sedang dalam mode sisipkan ke kabel tertentu
      if (cableInsertModeRef.current) {
        const route = routesRef.current.find((r) => r.id === cableInsertModeRef.current?.routeId);
        if (route) {
          handleInsertNodeToRoute(route, { lat, lng }, cableInsertModeRef.current.nodeType);
          return;
        }
      }

      if (activeToolRef.current === 'CUT_LINE') {
        let autoRoute: FiberRoute | null = null;
        let bestSnap: ReturnType<typeof snapPointToRoute> = null;

        for (const r of routesRef.current) {
          const s = snapPointToRoute([lat, lng], r.coords);
          if (s && s.offsetMeters < 45) {
            if (!bestSnap || s.offsetMeters < bestSnap.offsetMeters) {
              bestSnap = s;
              autoRoute = r;
            }
          }
        }

        if (autoRoute && bestSnap) {
          handleInitiateCutLine(autoRoute, { lat: bestSnap.snappedCoord[0], lng: bestSnap.snappedCoord[1] });
        } else {
          showToast('✂️ Silakan klik tepat pada garis jalur kabel untuk memotong.');
        }
        return;
      }

      if (['SERVER', 'ODC', 'ODP', 'ONT', 'CLOSURE'].includes(activeToolRef.current)) {
        // Cek apakah klik dekat dengan salah satu jalur kabel (radius 35 meter)
        let autoRoute: FiberRoute | null = null;
        let bestSnap: ReturnType<typeof snapPointToRoute> = null;

        for (const r of routesRef.current) {
          const s = snapPointToRoute([lat, lng], r.coords);
          if (s && s.offsetMeters < 35) {
            if (!bestSnap || s.offsetMeters < bestSnap.offsetMeters) {
              bestSnap = s;
              autoRoute = r;
            }
          }
        }

        if (activeToolRef.current === 'ODC' || activeToolRef.current === 'ODP') {
          if (autoRoute && bestSnap) {
            handleInsertNodeToRoute(
              autoRoute,
              { lat: bestSnap.snappedCoord[0], lng: bestSnap.snappedCoord[1] },
              activeToolRef.current as any
            );
          } else {
            showToast('⚠️ ODC dan ODP hanya dapat dipasang pada jalur kabel fiber yang sudah terpasang.');
          }
          return;
        } else if (activeToolRef.current === 'CLOSURE') {
          if (autoRoute && bestSnap) {
            handleInsertNodeToRoute(
              autoRoute,
              { lat: bestSnap.snappedCoord[0], lng: bestSnap.snappedCoord[1] },
              'CLOSURE'
            );
          } else {
            const jcCount = nodesRef.current.filter((n) => n.type === 'CLOSURE' || n.type === 'JOINT_CLOSURE').length + 1;
            setPendingNode({
              type: 'CLOSURE',
              lat,
              lng,
            });
            setFormRouteId('');
            setFormKmMarker(null);
            setFormAssignedCore(1);
            setFormOutputCore(1);
            setFormName(`JC-${String(jcCount).padStart(2, '0')}`);
            setFormCapacity('2');
            setFormModel('Inline / Horizontal');
            setFormParent('');
            setFormLocation('Tiang Udara');
            setFormInputLoss('0.02');
            setFormSpliceMaps([]);
          }
          return;
        } else {
          setPendingNode({
            type: activeToolRef.current as any,
            lat,
            lng,
          });
          setFormRouteId('');
          setFormKmMarker(null);
          setFormAssignedCore(1);
          setFormName('');
          setFormParent('');
          setFormLocation('');
        }

        setFormIp('');
        setFormCapacity(activeToolRef.current === 'SERVER' ? '0' : '1');
        setFormRatios([
          { id: `ratio-${Date.now()}`, ratio: '80:20', direction: 'Jalur Utama' },
        ]);
        setFormCustomerNo('');
        setFormPhone('');
        setFormAddress('');
        setFormSerial('');
        if (activeToolRef.current === 'ONT') {
          setFormPppoeUser('');
          setFormMac('');
          setFormWanIp('');
          setFormRxPower('');
        }
      } else if (activeToolRef.current === 'FIBER_LINE') {
        handlePointAdd(lat, lng, null);
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [activeTool]);

  // Keyboard Shortcut: Undo Titik Garis Fiber (Ctrl+Z / Cmd+Z) & Batal (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (activeToolRef.current === 'FIBER_LINE') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          handleUndoPoint();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleCancelFiberLine();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // CREATE Node Baru
  const handleSaveCreateNode = () => {
    if (!pendingNode) return;

    const targetRouteId = formRouteId || pendingNode.parentRouteId;
    const targetRoute = routes.find((r) => r.id === targetRouteId);
    const isClosure = pendingNode.type === 'CLOSURE' || pendingNode.type === 'JOINT_CLOSURE';
    const isClosureRatio = isClosure && formClosureMode === 'RATIO';

    const selectedCoreStd =
      targetRouteId && (pendingNode.type === 'ODP' || pendingNode.type === 'ODC' || pendingNode.type === 'SERVER' || isClosure) && formAssignedCore
        ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === formAssignedCore)
        : undefined;

    const ratioSummary = formRatios
      .map((r) => `${r.ratio}${r.direction ? ` (${r.direction})` : ''}`)
      .join(', ');

    let createdPopFacility: PopServerFacility | undefined = undefined;
    if (pendingNode.type === 'SERVER') {
      const facilityId = `pop-${Date.now()}`;
      createdPopFacility = {
        id: facilityId,
        name: formName || 'Server',
        rackUnitsTotal: 42,
        rackUnitsUsed: 0,
        devices: [],
      };
    }

    const newNode: MapNode = {
      id: `node-${Date.now()}`,
      popFacility: createdPopFacility,
      name: formName || (pendingNode.type === 'ODP' ? 'ODP Baru' : pendingNode.type === 'ODC' ? 'ODC Baru' : isClosure ? 'JC Baru' : pendingNode.type === 'SERVER' ? 'Server Baru' : 'Aset Baru'),
      type: pendingNode.type,
      lat: pendingNode.lat,
      lng: pendingNode.lng,
      parentRouteId: targetRouteId || undefined,
      parentRouteName: targetRoute ? targetRoute.name : pendingNode.parentRouteName,
      routeKmMarker: formKmMarker ?? pendingNode.routeKmMarker,
      capacity: pendingNode.type === 'SERVER' ? 0 : isClosure ? (parseInt(formCapacity, 10) || 2) : (formCapacity === '0' ? 0 : (parseInt(formCapacity, 10) || 8)),
      used: isClosure
        ? isClosureRatio
          ? Math.max(formRatios.length * 2, formSpliceMaps.length)
          : (formSpliceMaps.length > 0 ? formSpliceMaps.length : formAssignedCore ? 1 : 0)
        : 0,
      model: isClosure ? (formModel || 'Inline / Horizontal') : undefined,
      parentName: formParent,
      splitterRatio: (isClosure ? (isClosureRatio ? ratioSummary : undefined) : ratioSummary) || formSplitter,
      splitterRatios: isClosure ? (isClosureRatio ? formRatios : []) : formRatios,
      inputAttenuation: formInputLoss ? `${formInputLoss} dBm` : undefined,
      outputAttenuation: formOutputLoss ? `${formOutputLoss} dBm` : undefined,
      avgAttenuation: isClosure && !isClosureRatio ? (formInputLoss || '0.02') : (formOutputLoss ? `${formOutputLoss} dBm` : (formInputLoss ? `${formInputLoss} dBm` : undefined)),
      poleLocation: formLocation,
      assignedCoreNumber: selectedCoreStd?.coreNumber,
      assignedCoreColor: selectedCoreStd?.colorName,
      assignedCoreHex: selectedCoreStd?.colorHex,
      assignedTubeNumber: selectedCoreStd?.tubeNumber,
      spliceMaps: formSpliceMaps.map((sm) => ({
        ...sm,
        inputCoreColor: sm.inputCoreNumber ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === sm.inputCoreNumber)?.colorName : undefined,
        inputCoreHex: sm.inputCoreNumber ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === sm.inputCoreNumber)?.colorHex : undefined,
        outputCoreColor: sm.outputCoreNumber ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === sm.outputCoreNumber)?.colorName : undefined,
        outputCoreHex: sm.outputCoreNumber ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === sm.outputCoreNumber)?.colorHex : undefined,
      })),
      customerNo: pendingNode.type === 'ONT' ? (formCustomerNo || undefined) : undefined,
      phone: pendingNode.type === 'ONT' ? (formPhone || undefined) : undefined,
      address: pendingNode.type === 'ONT' ? (formAddress || undefined) : undefined,
      packagePlan: pendingNode.type === 'ONT' ? (formPackage || undefined) : undefined,
      serial: pendingNode.type === 'ONT' ? (formSerial || undefined) : undefined,
      mac: pendingNode.type === 'ONT' ? (formMac || undefined) : undefined,
      status: pendingNode.type === 'ONT' ? 'ONLINE' : 'ONLINE',
      rxPower: pendingNode.type === 'ONT' ? (formRxPower || undefined) : undefined,
      txPower: undefined,
      wanIp: pendingNode.type === 'ONT' ? (formWanIp || undefined) : undefined,
      pppoeUser: pendingNode.type === 'ONT' ? (formPppoeUser || undefined) : undefined,
      uptime: undefined,
    };

    if (formPppoeUser) {
      const match = pppoeSessions.find((s) => s.username === formPppoeUser);
      if (match) markPppoeAssigned(match.id, true);
    }

    // Jika disisipkan ke kabel fiber: perbarui coords, vertexNodeIds, dan tabel alokasi core
    if (targetRouteId) {
      setRoutes((prevRoutes) =>
        prevRoutes.map((r) => {
          if (r.id === targetRouteId) {
            const snap = snapPointToRoute([newNode.lat, newNode.lng], r.coords);
            const insertIdx = snap ? snap.insertIndex : (pendingNode.insertIndex ?? r.coords.length - 1);
            const nextCoords = [...r.coords];
            const currentVertexIds = r.vertexNodeIds || getRouteVertexNodeIds(r, nodesRef.current);
            const nextVertexIds = [...currentVertexIds];

            nextCoords.splice(insertIdx, 0, [newNode.lat, newNode.lng]);
            nextVertexIds.splice(insertIdx, 0, newNode.id);

            const newLength = calculateLineDistance(nextCoords);
            const currentCores = r.cores || generateDefaultCores(r.coreCount);
            const nextCores = currentCores.map((c) => {
              if (selectedCoreStd && c.coreNumber === selectedCoreStd.coreNumber) {
                return {
                  ...c,
                  status: 'USED' as const,
                  assignedNodeId: newNode.id,
                  assignedNodeName: newNode.name,
                  assignedNodeType: newNode.type,
                  assignedKmMarker: newNode.routeKmMarker,
                };
              }
              return c;
            });

            const updatedRoute = {
              ...r,
              coords: nextCoords,
              vertexNodeIds: nextVertexIds,
              lengthMeter: newLength,
              cores: nextCores,
            };
            if (selectedRoute?.id === r.id) setSelectedRoute(updatedRoute);
            return updatedRoute;
          }
          return r;
        })
      );

      const coreMsg = selectedCoreStd ? ` pada Core ${selectedCoreStd.coreNumber} (${selectedCoreStd.colorName})` : '';
      setDynamicMoveToast(
        `✓ ${newNode.type} '${newNode.name}' berhasil disisipkan ke kabel '${targetRoute?.name || 'Fiber'}'${coreMsg}!`
      );
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 4000);
    }

    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    setPendingNode(null);
    setDynamicLocationCalc(null);
    setActiveTool('NONE');
    setCableInsertMode(null);
  };

  const handleUpdatePopFacility = (updatedPop: PopServerFacility) => {
    setActivePopModal(updatedPop);
    setNodes((prev) => {
      const next = prev.map((n) => {
        if (n.id === selectedNode?.id || n.popFacility?.id === updatedPop.id) {
          return {
            ...n,
            name: updatedPop.name || n.name,
            popFacility: updatedPop,
          };
        }
        return n;
      });
      persistNodes(next);
      return next;
    });
    if (selectedNode) {
      setSelectedNode((prev) =>
        prev ? { ...prev, name: updatedPop.name || prev.name, popFacility: updatedPop } : null
      );
    }
    showToast('✓ Fasilitas POP Server & Kelistrikan berhasil diperbarui!');
  };

  // UPDATE Node yang sedang diedit
  const handleOpenEdit = (node: MapNode) => {
    setEditingNode(node);
    setFormName(node.name);
    setFormIp(node.ip || '');
    setFormCapacity(String(node.capacity || 16));
    setFormParent(node.parentName || '');
    setFormRouteId(node.parentRouteId || '');
    setFormKmMarker(node.routeKmMarker ?? null);

    if (node.parentRouteId) {
      const parentRoute = routes.find((r) => r.id === node.parentRouteId);
      if (parentRoute) {
        let nodeKm = node.routeKmMarker;
        if (nodeKm === undefined) {
          const isReversed = isRouteInvertedFromRoot(parentRoute, nodes);
          const snap = snapPointToRoute([node.lat, node.lng], parentRoute.coords, isReversed);
          nodeKm = snap ? snap.distanceKm : 0;
        }
        const dyn = computeDynamicLocationAndLoss(parentRoute, nodeKm, node.type as any, node.id);
        setDynamicLocationCalc(dyn);
      } else {
        setDynamicLocationCalc(null);
      }
    } else {
      setDynamicLocationCalc(null);
    }
    setFormAssignedCore(node.assignedCoreNumber ?? 1);
    setFormOutputCore(node.outputCoreNumber ?? null);
    // Load spliceMaps atau buat dari single core jika belum ada
    if (node.spliceMaps && node.spliceMaps.length > 0) {
      setFormSpliceMaps(node.spliceMaps);
    } else if (node.assignedCoreNumber) {
      setFormSpliceMaps([{
        id: `splice-${Date.now()}`,
        label: 'Jalur 1',
        inputCoreNumber: node.assignedCoreNumber,
        inputCoreColor: node.assignedCoreColor,
        inputCoreHex: node.assignedCoreHex,
        outputCoreNumber: node.outputCoreNumber,
        outputCoreColor: node.outputCoreColor,
        outputCoreHex: node.outputCoreHex,
      }]);
    } else {
      setFormSpliceMaps([]);
    }
    setFormLocation(node.poleLocation || '');
    setFormCustomerNo(node.customerNo || '');
    setFormPhone(node.phone || '');
    setFormAddress(node.address || '');
    setFormSerial(node.serial || '');
    setFormModel(node.model || '');
    setFormPackage(node.packagePlan || '');
    setFormPppoeUser(node.pppoeUser || '');
    setFormMac(node.mac || '');
    setFormWanIp(node.wanIp || '');
    setFormRxPower(node.rxPower || '');

    if (node.type === 'SERVER') {
      const matchedOlt = olts.find(
        (o) => o.id === node.oltId || o.ip === node.ip || o.name.toLowerCase() === node.name.toLowerCase()
      );
      setFormOltVendor(matchedOlt?.vendor || node.vendor || 'Hisfocus (HSGQ)');
      setFormOltModel(matchedOlt?.model || node.model || '');
      setFormOltPonType(matchedOlt?.ponType || node.ponType || 'EPON (1.25 Gbps)');
      setFormOltPortsCount(matchedOlt?.ponPortsCount || node.ponPortsCount || 4);
      setFormOltWebPort(matchedOlt?.webPort || node.webPort || 80);
      setFormOltCliPort(matchedOlt?.cliPort || node.cliPort || 23);
      setFormOltUser(matchedOlt?.defaultUser || node.defaultUser || 'admin');
      setFormOltPass(matchedOlt?.defaultPass || node.defaultPass || 'admin');
    }

    if (node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE') {
      setFormCapacity(String(node.capacity || 2));
      setFormModel(node.model || 'Inline / Horizontal');
      setFormLocation(node.poleLocation || 'Tiang Udara');
      const isRatioJc = Boolean(
        (node.splitterRatios && node.splitterRatios.length > 0) ||
        (node.splitterRatio && node.splitterRatio !== 'Tanpa Rasio' && node.splitterRatio.includes(':'))
      );
      setFormClosureMode(isRatioJc ? 'RATIO' : 'DIRECT');
      if (isRatioJc) {
        setFormInputLoss(node.inputAttenuation ? node.inputAttenuation.replace(/\s*dBm?/i, '') : '-14.00');
        setFormOutputLoss(node.outputAttenuation ? node.outputAttenuation.replace(/\s*dBm?/i, '') : '');
      } else {
        setFormInputLoss(node.avgAttenuation ? node.avgAttenuation.replace(/\s*dBm?/i, '') : '0.02');
      }
    }

    if (node.splitterRatios && node.splitterRatios.length > 0) {
      setFormRatios(
        node.splitterRatios.map((item, idx) => {
          let dir = item.direction || '';
          if (dir === 'Jalur Masuk Gang' || dir.toLowerCase().includes('masuk gang')) {
            dir = 'Line Fiber Masuk Gang';
          } else if (dir === 'Jalur Utama' || dir.toLowerCase().includes('utama')) {
            dir = 'Line Fiber Utama (Lanjutan Feeder)';
          } else if (dir === 'Jalur Sekunder') {
            dir = 'Line Fiber Sekunder / Distribusi';
          }
          return { ...item, direction: dir };
        })
      );
      setFormSplitter(node.splitterRatios[0].ratio);
    } else if (node.splitterRatio) {
      const parts = node.splitterRatio.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        setFormRatios(
          parts.map((p, idx) => {
            const matchDir = p.match(/\((.*?)\)/);
            const ratioVal = p.replace(/\(.*?\)/, '').trim();
            let dir = matchDir ? matchDir[1] : (idx === 0 ? 'Line Fiber Utama (Lanjutan Feeder)' : 'Line Fiber Masuk Gang');
            if (dir === 'Jalur Masuk Gang' || dir.toLowerCase().includes('masuk gang')) {
              dir = 'Line Fiber Masuk Gang';
            } else if (dir === 'Jalur Utama' || dir.toLowerCase().includes('utama')) {
              dir = 'Line Fiber Utama (Lanjutan Feeder)';
            }
            return {
              id: `ratio-${idx}-${Date.now()}`,
              ratio: ratioVal || '50:50',
              direction: dir,
            };
          })
        );
        const firstRatio = parts[0].replace(/\(.*?\)/, '').trim();
        setFormSplitter(firstRatio || '50:50');
      } else {
        const matchRatio = node.splitterRatio.match(/(1:\d+|\d+:\d+|Tanpa Rasio)/i);
        const ratioVal = matchRatio ? matchRatio[0] : node.splitterRatio;
        setFormSplitter(ratioVal);
        setFormRatios([
          {
            id: 'ratio-1',
            ratio: ratioVal,
            direction: 'Line Fiber Utama (Lanjutan Feeder)',
          },
        ]);
      }
    } else {
      const rawSplitter =
        node.capacity === 2
          ? '1:2'
          : node.capacity === 4
            ? '1:4'
            : node.capacity === 16
              ? '1:16'
              : node.capacity === 32
                ? '1:32'
                : '1:8';
      setFormSplitter(rawSplitter);
      setFormRatios([
        {
          id: 'ratio-1',
          ratio: '80:20',
          direction: 'Line Fiber Utama (Lanjutan Feeder)',
        },
      ]);
    }

    const rawIn = (node.inputAttenuation || '').replace(/[^\d.-]/g, '');
    setFormInputLoss(rawIn);

    const rawOut = (node.outputAttenuation || node.avgAttenuation || '').replace(/[^\d.-]/g, '');
    setFormOutputLoss(rawOut);
  };

  const handleSaveUpdateNode = () => {
    if (!editingNode) return;
    const targetRouteId = formRouteId || undefined;
    const targetRoute = targetRouteId ? routes.find((r) => r.id === targetRouteId) : undefined;
    const isClosure = editingNode.type === 'CLOSURE' || editingNode.type === 'JOINT_CLOSURE';
    const isClosureRatio = isClosure && formClosureMode === 'RATIO';

    const selectedCoreStd =
      (editingNode.type === 'ODP' || editingNode.type === 'ODC' || editingNode.type === 'SERVER' || isClosure) && formAssignedCore
        ? FIBER_CORE_STANDARDS.find((c) => c.coreNumber === formAssignedCore)
        : undefined;

    const ratioSummary = formRatios
      .map((r) => `${r.ratio}${r.direction ? ` (${r.direction})` : ''}`)
      .join(', ');

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === editingNode.id) {
          const updated: MapNode = {
            ...n,
            name: formName,
            ip: n.type === 'SERVER' ? (formIp || n.ip) : n.ip,
            vendor: n.type === 'SERVER' ? formOltVendor : n.vendor,
            model: isClosure ? (formModel || 'Inline / Horizontal') : (n.type === 'SERVER' ? (formOltModel || n.model) : (formModel || n.model)),
            ponType: n.type === 'SERVER' ? formOltPonType : n.ponType,
            ponPortsCount: n.type === 'SERVER' ? formOltPortsCount : n.ponPortsCount,
            webPort: n.type === 'SERVER' ? formOltWebPort : n.webPort,
            cliPort: n.type === 'SERVER' ? formOltCliPort : n.cliPort,
            defaultUser: n.type === 'SERVER' ? formOltUser : n.defaultUser,
            defaultPass: n.type === 'SERVER' ? formOltPass : n.defaultPass,
            capacity: n.type === 'SERVER' ? (formOltPortsCount * 64) : isClosure ? (parseInt(formCapacity, 10) || 2) : (formCapacity === '0' ? 0 : (parseInt(formCapacity, 10) || n.capacity || 0)),
            used: isClosure
              ? isClosureRatio
                ? Math.max(formRatios.length * 2, formSpliceMaps.length)
                : (formSpliceMaps.length > 0 ? formSpliceMaps.length : formAssignedCore ? 1 : 0)
              : n.used,
            splitterRatio: (isClosure ? (isClosureRatio ? ratioSummary : undefined) : ratioSummary) || formSplitter,
            splitterRatios: isClosure ? (isClosureRatio ? formRatios : []) : formRatios,
            inputAttenuation: isClosure && !isClosureRatio ? undefined : (formInputLoss ? `${formInputLoss} dBm` : undefined),
            outputAttenuation: isClosure && !isClosureRatio ? undefined : (formOutputLoss ? `${formOutputLoss} dBm` : undefined),
            avgAttenuation: isClosure && !isClosureRatio ? (formInputLoss || '0.02') : (formOutputLoss ? `${formOutputLoss} dBm` : (formInputLoss ? `${formInputLoss} dBm` : undefined)),
            parentName: formParent,
            parentRouteId: targetRouteId,
            parentRouteName: targetRoute ? targetRoute.name : undefined,
            routeKmMarker: formKmMarker ?? undefined,
            assignedCoreNumber: selectedCoreStd?.coreNumber,
            assignedCoreColor: selectedCoreStd?.colorName,
            assignedCoreHex: selectedCoreStd?.colorHex,
            assignedTubeNumber: selectedCoreStd?.tubeNumber,
            outputCoreNumber: formOutputCore ?? undefined,
            outputCoreColor: formOutputCore ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === formOutputCore)?.colorName : undefined,
            outputCoreHex: formOutputCore ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === formOutputCore)?.colorHex : undefined,
            spliceMaps: formSpliceMaps.map(sm => ({
              ...sm,
              inputCoreColor: sm.inputCoreNumber ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === sm.inputCoreNumber)?.colorName : undefined,
              inputCoreHex: sm.inputCoreNumber ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === sm.inputCoreNumber)?.colorHex : undefined,
              outputCoreColor: sm.outputCoreNumber ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === sm.outputCoreNumber)?.colorName : undefined,
              outputCoreHex: sm.outputCoreNumber ? FIBER_CORE_STANDARDS.find(c => c.coreNumber === sm.outputCoreNumber)?.colorHex : undefined,
            })),
            poleLocation: formLocation,
            customerNo: formCustomerNo,
            phone: formPhone,
            address: formAddress,
            serial: formSerial,
            mac: formMac,
            packagePlan: formPackage,
            wanIp: formWanIp,
            rxPower: formRxPower,
            pppoeUser: formPppoeUser || undefined,
          };
          setSelectedNode(updated);
          return updated;
        }
        return n;
      })
    );

    // Sinkronisasi alokasi core pada tabel FiberRoute
    setRoutes((prevRoutes) =>
      prevRoutes.map((r) => {
        let rCores = r.cores || generateDefaultCores(r.coreCount);
        let changed = false;

        // Jika rute ini rute lama & rute berganti atau core berganti: bebaskan core lama
        if (
          r.id === editingNode.parentRouteId &&
          (r.id !== targetRouteId || formAssignedCore !== editingNode.assignedCoreNumber)
        ) {
          rCores = rCores.map((c) => {
            if (c.assignedNodeId === editingNode.id) {
              changed = true;
              return {
                ...c,
                status: 'AVAILABLE' as const,
                assignedNodeId: undefined,
                assignedNodeName: undefined,
                assignedNodeType: undefined,
                assignedKmMarker: undefined,
              };
            }
            return c;
          });
        }

        // Jika rute ini adalah targetRoute baru: alokasikan core baru
        if (r.id === targetRouteId && selectedCoreStd) {
          rCores = rCores.map((c) => {
            if (c.coreNumber === selectedCoreStd.coreNumber) {
              changed = true;
              return {
                ...c,
                status: 'USED' as const,
                assignedNodeId: editingNode.id,
                assignedNodeName: formName,
                assignedNodeType: editingNode.type,
                assignedKmMarker: formKmMarker ?? editingNode.routeKmMarker,
              };
            }
            if (c.assignedNodeId === editingNode.id && c.coreNumber !== selectedCoreStd.coreNumber) {
              changed = true;
              return {
                ...c,
                status: 'AVAILABLE' as const,
                assignedNodeId: undefined,
                assignedNodeName: undefined,
                assignedNodeType: undefined,
                assignedKmMarker: undefined,
              };
            }
            return c;
          });
        }

        if (changed) {
          const updatedRoute = { ...r, cores: rCores };
          if (selectedRoute?.id === r.id) setSelectedRoute(updatedRoute);
          return updatedRoute;
        }
        return r;
      })
    );

    if (editingNode?.pppoeUser && editingNode.pppoeUser !== formPppoeUser) {
      const oldMatch = pppoeSessions.find((s) => s.username === editingNode.pppoeUser);
      if (oldMatch) markPppoeAssigned(oldMatch.id, false);
    }

    if (formPppoeUser) {
      const match = pppoeSessions.find((s) => s.username === formPppoeUser);
      if (match) markPppoeAssigned(match.id, true);
    }

    if (editingNode.type === 'SERVER') {
      const matchedOlt = olts.find(
        (o) => o.id === editingNode.oltId || o.ip === editingNode.ip || o.name.toLowerCase() === editingNode.name.toLowerCase()
      );
      if (matchedOlt) {
        updateOlt(matchedOlt.id, {
          name: formName || matchedOlt.name,
          ip: formIp || matchedOlt.ip,
          vendor: formOltVendor,
          model: formOltModel || `${formOltVendor} Standalone`,
          ponType: formOltPonType,
          ponPortsCount: formOltPortsCount,
          webPort: formOltWebPort,
          cliPort: formOltCliPort,
          defaultUser: formOltUser,
          defaultPass: formOltPass,
        });
      }
    }

    setEditingNode(null);
    setDynamicLocationCalc(null);
  };

  // DELETE Node
  const handleDeleteNode = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus '${name}' dari peta?`)) {
      const target = nodes.find((n) => n.id === id);
      if (target?.type === 'SERVER') {
        const matchedOlt = olts.find(
          (o) => o.id === target.oltId || o.ip === target.ip || o.name.toLowerCase() === target.name.toLowerCase()
        );
        if (matchedOlt) {
          deleteOlt(matchedOlt.id);
        }
      }
      if (target?.pppoeUser) {
        const match = pppoeSessions.find((s) => s.username === target.pppoeUser);
        if (match) markPppoeAssigned(match.id, false);
      }
      // Lepas node dari vertex kabel & bebaskan core tanpa merusak geometri bentangan kabel
      setRoutes((prevRoutes) =>
        prevRoutes.map((r) => {
          let rCores = r.cores || generateDefaultCores(r.coreCount);
          const hasAssigned = rCores.some((c) => c.assignedNodeId === id);
          if (hasAssigned) {
            rCores = rCores.map((c) =>
              c.assignedNodeId === id
                ? {
                  ...c,
                  status: 'AVAILABLE' as const,
                  assignedNodeId: undefined,
                  assignedNodeName: undefined,
                  assignedNodeType: undefined,
                  assignedKmMarker: undefined,
                }
                : c
            );
          }
          const hasVertex = r.vertexNodeIds && r.vertexNodeIds.includes(id);
          const nextVertexIds = hasVertex
            ? r.vertexNodeIds!.map((vId) => (vId === id ? null : vId))
            : r.vertexNodeIds;

          if (hasAssigned || hasVertex) {
            const updatedR = { ...r, cores: rCores, vertexNodeIds: nextVertexIds };
            if (selectedRoute?.id === r.id) setSelectedRoute(updatedR);
            return updatedR;
          }
          return r;
        })
      );
      setNodes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNode?.id === id) {
        setSelectedNode(null);
      }
    }
  };

  // Simpan Garis Kabel (Buka Modal Create atau Simpan Sambungan/Perpanjangan Jalur Kabel)
  const handleSaveFiberLine = () => {
    if (drawingCoords.length < 2) {
      alert('Minimal klik 2 titik pada peta untuk membuat rute garis kabel fiber.');
      return;
    }

    // Jika sedang dalam mode sambung / perpanjang kabel yang sudah ada:
    if (extendingRouteIdRef.current) {
      const extId = extendingRouteIdRef.current;
      const targetRoute = routes.find((r) => r.id === extId);
      const newLength = calculateLineDistance(drawingCoords);

      const finalVertexIds =
        drawingVertexNodeIds.length === drawingCoords.length
          ? drawingVertexNodeIds
          : getRouteVertexNodeIds(
            {
              coords: drawingCoords,
              sourceNodeId: routeStartNode?.id || targetRoute?.sourceNodeId,
              targetNodeId: routeEndNode?.id || targetRoute?.targetNodeId,
            },
            nodes
          );

      const updatedRoute: FiberRoute = {
        ...(targetRoute || {}),
        id: extId,
        name: targetRoute?.name || 'Jalur Kabel',
        cableType: targetRoute?.cableType || 'Drop Core',
        coreCount: targetRoute?.coreCount || 2,
        lengthMeter: newLength,
        coords: drawingCoords,
        vertexNodeIds: finalVertexIds,
        color: targetRoute?.color || '#3B82F6',
        status: targetRoute?.status || 'NORMAL',
        attenuation: targetRoute?.attenuation || '0.35 dB/km',
        sourceNode: targetRoute?.sourceNode || routeFormSourceNode,
        targetNode: routeEndNode ? routeEndNode.name : targetRoute?.targetNode || 'Ujung Bentangan',
        sourceNodeId: targetRoute?.sourceNodeId || routeStartNode?.id,
        targetNodeId: routeEndNode?.id || targetRoute?.targetNodeId,
        cores: targetRoute?.cores || generateDefaultCores(targetRoute?.coreCount || 2),
      };

      setRoutes((prev) => prev.map((r) => (r.id === extId ? updatedRoute : r)));

      if (tempDrawLineRef.current) {
        tempDrawLineRef.current.remove();
        tempDrawLineRef.current = null;
      }
      tempMarkersRef.current.forEach((m) => m.remove());
      tempMarkersRef.current = [];
      setDrawingCoords([]);
      setDrawingVertexNodeIds([]);
      setRouteStartNode(null);
      setRouteEndNode(null);
      setActiveTool('NONE');
      setSelectedRoute(updatedRoute);
      setExtendingRouteId(null);
      extendingRouteIdRef.current = null;

      setDynamicMoveToast(`✓ Bentangan kabel '${updatedRoute.name}' berhasil disambung & diperpanjang (${newLength}m)!`);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
      return;
    }

    const dist = calculateLineDistance(drawingCoords);
    const distKm = (dist / 1000).toFixed(1);
    const srcName = routeStartNode?.name || 'Awal Bentangan';
    const tgtName = routeEndNode?.name || 'Ujung Bentangan';
    setRouteFormName(
      routeStartNode && routeEndNode
        ? `Jalur ${srcName} ke ${tgtName}`
        : `Jalur Kabel Fiber ${distKm} KM`
    );
    const defaultCableType = dist >= 5000 ? 'ADSS 24-Core (2 Tube)' : dist >= 1000 ? 'ADSS 12-Core (1 Tube)' : 'Drop Core 4-Core';
    setRouteFormCableType(defaultCableType);
    setRouteFormCoreCount(getCoreCountFromCableType(defaultCableType));
    setRouteFormLength(dist);
    setRouteFormColor('#3B82F6');
    setRouteFormStatus('NORMAL');
    setRouteFormAttenuation('0.35 dB/km');
    setRouteFormSourceNode(srcName);
    setRouteFormTargetNode(tgtName);
    setRouteFormNotes('');
    setIsCreateRouteModalOpen(true);
  };

  const handleConfirmCreateRoute = () => {
    const finalVertexIds =
      drawingVertexNodeIds.length === drawingCoords.length
        ? drawingVertexNodeIds
        : getRouteVertexNodeIds(
          {
            coords: drawingCoords,
            sourceNodeId: routeStartNode?.id,
            targetNodeId: routeEndNode?.id,
          },
          nodes
        );

    const initialCoreCount = Number(routeFormCoreCount) || 2;
    const initialCores = generateDefaultCores(initialCoreCount);
    const sName = routeFormSourceNode || routeStartNode?.name;
    const tName = routeFormTargetNode || routeEndNode?.name;
    if (sName && tName && initialCores.length > 0) {
      initialCores[0] = {
        ...initialCores[0],
        status: 'USED',
        assignedNodeName: `Backbone: ${sName} ➔ ${tName}`,
        assignedNodeType: 'SERVER',
        assignedKmMarker: parseFloat(((Number(routeFormLength) || calculateLineDistance(drawingCoords)) / 1000).toFixed(2)),
      };
    }

    const newRoute: FiberRoute = {
      id: `route-${Date.now()}`,
      name: routeFormName.trim() || `Jalur Kabel #${routes.length + 1}`,
      cableType: routeFormCableType,
      coreCount: initialCoreCount,
      lengthMeter: Number(routeFormLength) || calculateLineDistance(drawingCoords),
      coords: drawingCoords,
      vertexNodeIds: finalVertexIds,
      color: routeFormColor,
      status: routeFormStatus,
      attenuation: routeFormAttenuation,
      sourceNode: routeFormSourceNode,
      targetNode: routeFormTargetNode,
      sourceNodeId: routeStartNode?.id,
      targetNodeId: routeEndNode?.id,
      notes: routeFormNotes.trim() || undefined,
      cores: initialCores,
    };

    setRoutes((prev) => [...prev, newRoute]);
    if (tempDrawLineRef.current) {
      tempDrawLineRef.current.remove();
      tempDrawLineRef.current = null;
    }
    tempMarkersRef.current.forEach((m) => m.remove());
    tempMarkersRef.current = [];
    setDrawingCoords([]);
    setDrawingVertexNodeIds([]);
    setRouteStartNode(null);
    setRouteEndNode(null);
    setExtendingRouteId(null);
    extendingRouteIdRef.current = null;
    setActiveTool('NONE');
    setIsCreateRouteModalOpen(false);
    setSelectedRoute(newRoute);

    setDynamicMoveToast(`Jalur kabel '${newRoute.name}' (${newRoute.coreCount} Core) berhasil disimpan dan terhubung dinamis!`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleCancelFiberLine = () => {
    if (tempDrawLineRef.current) {
      tempDrawLineRef.current.remove();
      tempDrawLineRef.current = null;
    }
    tempMarkersRef.current.forEach((m) => m.remove());
    tempMarkersRef.current = [];
    setDrawingCoords([]);
    setDrawingVertexNodeIds([]);
    setRouteStartNode(null);
    setRouteEndNode(null);
    setExtendingRouteId(null);
    extendingRouteIdRef.current = null;
    setActiveTool('NONE');
    setIsCreateRouteModalOpen(false);
  };

  const handleOpenEditRoute = (route: FiberRoute) => {
    setEditingRoute(route);
    setRouteFormName(route.name);
    setRouteFormCableType(route.cableType);
    setRouteFormCoreCount(route.coreCount);
    setRouteFormLength(route.lengthMeter);
    setRouteFormColor(route.color || '#3B82F6');
    setRouteFormStatus(route.status || 'NORMAL');
    setRouteFormAttenuation(route.attenuation || '0.35 dB/km');
    setRouteFormSourceNode(route.sourceNode || '');
    setRouteFormTargetNode(route.targetNode || '');
    setRouteFormNotes(route.notes || '');
  };

  const handleSaveUpdateRoute = () => {
    if (!editingRoute) return;
    const cleanRouteName = routeFormName.trim() || editingRoute.name;
    const cleanSource = (routeFormSourceNode || '').replace(/\s*\([^)]*\)$/, '').trim();
    const cleanTarget = (routeFormTargetNode || '').replace(/\s*\([^)]*\)$/, '').trim();

    const sourceNode = nodes.find(
      (n) => n.name === routeFormSourceNode || n.name === cleanSource || `${n.name} (${n.type})` === routeFormSourceNode
    );
    const targetNode = nodes.find(
      (n) => n.name === routeFormTargetNode || n.name === cleanTarget || `${n.name} (${n.type})` === routeFormTargetNode
    );

    const nextCoreCount = Number(routeFormCoreCount) || editingRoute.coreCount;
    const nextCores = generateDefaultCores(nextCoreCount, editingRoute.cores);
    const updatedRoute: FiberRoute = {
      ...editingRoute,
      name: cleanRouteName,
      cableType: routeFormCableType,
      coreCount: nextCoreCount,
      lengthMeter: Number(routeFormLength) || editingRoute.lengthMeter,
      color: routeFormColor,
      status: routeFormStatus,
      attenuation: routeFormAttenuation,
      sourceNode: routeFormSourceNode,
      targetNode: routeFormTargetNode,
      sourceNodeId: sourceNode?.id,
      targetNodeId: targetNode?.id,
      notes: routeFormNotes.trim() || undefined,
      cores: nextCores,
    };

    // 1. Update Rute Kabel
    setRoutes((prev) =>
      prev.map((r) => (r.id === editingRoute.id ? updatedRoute : r))
    );
    if (selectedRoute?.id === editingRoute.id) {
      setSelectedRoute(updatedRoute);
    }

    // 2. SINKRONKAN KE PENGATURAN ODP (ASAL & TUJUAN)
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        // A. ODP ASAL (misal ODP Depan Rumah): kabel ini adalah line keluar (masuk gang / sekunder)
        if (sourceNode && n.id === sourceNode.id) {
          let updatedRatios = n.splitterRatios ? [...n.splitterRatios] : [];
          if (updatedRatios.length === 0) {
            updatedRatios = [
              { id: 'ratio-1', ratio: '80:20', direction: 'Line Fiber Utama (Lanjutan Feeder)' },
              {
                id: 'ratio-2',
                ratio: '70:30',
                direction: `Line Fiber: ${cleanRouteName}`,
                targetRouteId: editingRoute.id,
                targetRouteName: cleanRouteName,
              },
            ];
          } else {
            const alreadyHasRoute = updatedRatios.some(
              (r) =>
                r.targetRouteId === editingRoute.id ||
                r.direction === `Line Fiber: ${cleanRouteName}`
            );
            if (!alreadyHasRoute) {
              const genericIdx = updatedRatios.findIndex(
                (r) =>
                  !r.targetRouteId &&
                  (r.direction === 'Line Fiber Masuk Gang' ||
                    r.direction === 'Jalur Masuk Gang' ||
                    r.direction === 'Line Fiber Sekunder / Distribusi')
              );
              if (genericIdx !== -1) {
                updatedRatios[genericIdx] = {
                  ...updatedRatios[genericIdx],
                  direction: `Line Fiber: ${cleanRouteName}`,
                  targetRouteId: editingRoute.id,
                  targetRouteName: cleanRouteName,
                };
              } else {
                updatedRatios.push({
                  id: `ratio-${Date.now()}`,
                  ratio: '70:30',
                  direction: `Line Fiber: ${cleanRouteName}`,
                  targetRouteId: editingRoute.id,
                  targetRouteName: cleanRouteName,
                });
              }
            } else {
              updatedRatios = updatedRatios.map((r) =>
                r.targetRouteId === editingRoute.id
                  ? { ...r, direction: `Line Fiber: ${cleanRouteName}`, targetRouteName: cleanRouteName }
                  : r
              );
            }
          }

          const ratioSummary = updatedRatios
            .map((r) => `${r.ratio}${r.direction ? ` (${r.direction})` : ''}`)
            .join(', ');

          const updatedNode: MapNode = {
            ...n,
            splitterRatios: updatedRatios,
            splitterRatio: ratioSummary,
          };
          if (selectedNode?.id === n.id) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }

        // B. ODP TUJUAN (misal ODP BMT): kabel ini adalah sumber feeder masuk!
        if (targetNode && n.id === targetNode.id) {
          const firstCore = updatedRoute.cores?.[0];
          const updatedNode: MapNode = {
            ...n,
            parentName: sourceNode ? sourceNode.name : cleanRouteName,
            parentRouteId: editingRoute.id,
            parentRouteName: cleanRouteName,
            assignedCoreNumber: n.assignedCoreNumber || firstCore?.coreNumber || 1,
            assignedCoreColor: n.assignedCoreColor || firstCore?.colorName || 'Biru',
            assignedCoreHex: n.assignedCoreHex || firstCore?.colorHex || '#2563EB',
            assignedTubeNumber: n.assignedTubeNumber || firstCore?.tubeNumber || 1,
          };
          if (selectedNode?.id === n.id) {
            setSelectedNode(updatedNode);
          }
          return updatedNode;
        }

        return n;
      })
    );

    setEditingRoute(null);
    const syncDetails: string[] = [];
    if (sourceNode) syncDetails.push(`ODP Asal '${sourceNode.name}'`);
    if (targetNode) syncDetails.push(`ODP Tujuan '${targetNode.name}'`);
    const syncMsg = syncDetails.join(' & ');

    showToast(
      `✓ Jalur '${cleanRouteName}' berhasil disimpan & disinkronkan ke pengaturan ${syncMsg || 'ODP'}!`
    );
  };

  const handleDeleteRoute = (id: string, name: string) => {
    if (window.confirm(`Hapus jalur kabel fiber '${name}'?`)) {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      if (selectedRoute?.id === id) {
        setSelectedRoute(null);
      }
    }
  };

  const handleBulkDeleteNodes = () => {
    if (selectedTableNodeIds.length === 0) return;
    const count = selectedTableNodeIds.length;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${count} titik jaringan yang dipilih dari peta?`)) {
      return;
    }

    const selectedSet = new Set(selectedTableNodeIds);

    // Hapus OLT jika ada server yang dipilih
    nodes.forEach((n) => {
      if (selectedSet.has(n.id) && n.type === 'SERVER') {
        const matchedOlt = olts.find(
          (o) => o.id === n.oltId || o.ip === n.ip || o.name.toLowerCase() === n.name.toLowerCase()
        );
        if (matchedOlt) {
          deleteOlt(matchedOlt.id);
        }
      }
      if (selectedSet.has(n.id) && n.pppoeUser) {
        const match = pppoeSessions.find((s) => s.username === n.pppoeUser);
        if (match) markPppoeAssigned(match.id, false);
      }
    });

    // Lepas node terpilih dari vertex kabel & bebaskan core
    setRoutes((prevRoutes) =>
      prevRoutes.map((r) => {
        let rCores = r.cores || generateDefaultCores(r.coreCount);
        const hasAssigned = rCores.some((c) => c.assignedNodeId && selectedSet.has(c.assignedNodeId));
        if (hasAssigned) {
          rCores = rCores.map((c) =>
            c.assignedNodeId && selectedSet.has(c.assignedNodeId)
              ? {
                ...c,
                status: 'AVAILABLE' as const,
                assignedNodeId: undefined,
                assignedNodeName: undefined,
                assignedNodeType: undefined,
                assignedKmMarker: undefined,
              }
              : c
          );
        }
        const hasVertex = r.vertexNodeIds && r.vertexNodeIds.some((vId) => vId && selectedSet.has(vId));
        const nextVertexIds = hasVertex
          ? r.vertexNodeIds!.map((vId) => (vId && selectedSet.has(vId) ? null : vId))
          : r.vertexNodeIds;

        if (hasAssigned || hasVertex) {
          const updatedR = { ...r, cores: rCores, vertexNodeIds: nextVertexIds };
          if (selectedRoute && selectedRoute.id === r.id) setSelectedRoute(updatedR);
          return updatedR;
        }
        return r;
      })
    );

    setNodes((prev) => prev.filter((n) => !selectedSet.has(n.id)));
    if (selectedNode && selectedSet.has(selectedNode.id)) {
      setSelectedNode(null);
    }
    setSelectedTableNodeIds([]);
    setDynamicMoveToast(`✓ ${count} titik jaringan berhasil dihapus.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleBulkDeleteRoutes = () => {
    if (selectedTableRouteIds.length === 0) return;
    const count = selectedTableRouteIds.length;
    if (!window.confirm(`Hapus ${count} jalur kabel fiber yang dipilih?`)) {
      return;
    }

    const selectedSet = new Set(selectedTableRouteIds);
    setRoutes((prev) => prev.filter((r) => !selectedSet.has(r.id)));
    if (selectedRoute && selectedSet.has(selectedRoute.id)) {
      setSelectedRoute(null);
    }
    setSelectedTableRouteIds([]);
    setDynamicMoveToast(`✓ ${count} jalur kabel fiber berhasil dihapus.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleLocateRoute = (route: FiberRoute) => {
    setViewMode('map');
    setSelectedRoute(route);
    setSelectedNode(null);
    if (route.coords.length > 0) {
      const mid = route.coords[Math.floor(route.coords.length / 2)];
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
          mapInstance.current.flyTo(mid, 17, { animate: true });
        }
      }, 150);
    }
  };

  const handleSyncRouteCores = (routeToSync: FiberRoute) => {
    const syncedCores = getSynchronizedRouteCores(routeToSync, nodes);
    const updated: FiberRoute = {
      ...routeToSync,
      cores: syncedCores,
    };
    setRoutes((prev) => prev.map((r) => (r.id === routeToSync.id ? updated : r)));
    setSelectedRoute(updated);
    setDynamicMoveToast(`✓ Core kabel '${routeToSync.name}' berhasil disinkronkan dengan titik POP Server & aset!`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
  };

  const handleReleaseCore = (routeId: string, coreNumber: number) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const currentCores = r.cores || generateDefaultCores(r.coreCount);
        const nextCores = currentCores.map((c) =>
          c.coreNumber === coreNumber
            ? {
              coreNumber: c.coreNumber,
              tubeNumber: c.tubeNumber,
              tubeName: c.tubeName,
              colorName: c.colorName,
              colorHex: c.colorHex,
              status: 'AVAILABLE' as const,
              assignedNodeId: undefined,
              assignedNodeName: undefined,
              assignedNodeType: undefined,
              assignedKmMarker: undefined,
            }
            : c
        );
        const updated = { ...r, cores: nextCores };
        return updated;
      })
    );

    setSelectedRoute((prev) => {
      if (!prev || prev.id !== routeId) return prev;
      const currentCores = prev.cores || generateDefaultCores(prev.coreCount);
      const nextCores = currentCores.map((c) =>
        c.coreNumber === coreNumber
          ? {
            coreNumber: c.coreNumber,
            tubeNumber: c.tubeNumber,
            tubeName: c.tubeName,
            colorName: c.colorName,
            colorHex: c.colorHex,
            status: 'AVAILABLE' as const,
            assignedNodeId: undefined,
            assignedNodeName: undefined,
            assignedNodeType: undefined,
            assignedKmMarker: undefined,
          }
          : c
      );
      return { ...prev, cores: nextCores };
    });

    setNodes((prev) =>
      prev.map((n) =>
        n.parentRouteId === routeId && n.assignedCoreNumber === coreNumber
          ? {
            ...n,
            assignedCoreNumber: undefined,
            assignedCoreColor: undefined,
            assignedCoreHex: undefined,
            assignedTubeNumber: undefined,
          }
          : n
      )
    );

    setDynamicMoveToast(`✓ Core ${coreNumber} berhasil dikosongkan (Bebas).`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3000);
  };

  // FlyTo saat Search
  const handleFlyTo = (node: MapNode) => {
    if (mapInstance.current) {
      setViewMode('map');
      mapInstance.current.flyTo([node.lat, node.lng], 17, { animate: true });
      setSelectedNode(node);
      setIsSearchOpen(false);
    }
  };

  const handleLocateNode = (node: MapNode) => {
    setViewMode('map');
    setSelectedNode(node);
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
        mapInstance.current.flyTo([node.lat, node.lng], 18, { animate: true });
      }
    }, 150);
  };


  const filteredNodes = nodes.filter((n) => {
    const matchesType = listFilterType === 'ALL' || (listFilterType === 'CLOSURE' ? (n.type === 'CLOSURE' || n.type === 'JOINT_CLOSURE') : n.type === listFilterType);
    if (!matchesType) return false;
    if (!listSearch.trim()) return true;
    const query = listSearch.toLowerCase();
    return (
      n.name.toLowerCase().includes(query) ||
      (n.customerNo && n.customerNo.toLowerCase().includes(query)) ||
      (n.ip && n.ip.toLowerCase().includes(query)) ||
      (n.serial && n.serial.toLowerCase().includes(query)) ||
      (n.phone && n.phone.toLowerCase().includes(query)) ||
      (n.parentName && n.parentName.toLowerCase().includes(query)) ||
      (n.poleLocation && n.poleLocation.toLowerCase().includes(query)) ||
      (n.address && n.address.toLowerCase().includes(query))
    );
  });

  const filteredRoutes = routes.filter((r) => {
    if (listFilterType !== 'ALL' && listFilterType !== 'ROUTE') return false;
    if (!listSearch.trim()) return true;
    const query = listSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(query) ||
      r.cableType.toLowerCase().includes(query)
    );
  });

  const renderSplitterAndAttenuationForm = () => {
    const inputVal = parseFloat(formInputLoss ? formInputLoss.replace(',', '.') : '-14.00') || -14.0;
    const plcLoss = getPlcLossByPort(formCapacity);

    // Ambil rute / line yang sudah dipakai di baris rasio lain pada ODP ini
    const usedInOtherRatios = formRatios.map((other) => (other.direction || '').trim().toLowerCase());

    // Kumpulkan rute yang sudah dipakai oleh ODP/ODC lain di peta
    const usedByOtherNodes = new Set<string>();
    nodes.forEach((n) => {
      if (editingNode && n.id === editingNode.id) return;
      if (n.splitterRatios) {
        n.splitterRatios.forEach((sr) => {
          if (sr.targetRouteId) usedByOtherNodes.add(sr.targetRouteId);
          if (sr.direction) {
            const clean = sr.direction.replace(/^line fiber:\s*/i, '').trim().toLowerCase();
            usedByOtherNodes.add(clean);
            usedByOtherNodes.add(sr.direction.trim().toLowerCase());
          }
        });
      }
    });

    const isUtamaUsedElsewhere = usedInOtherRatios.includes('line fiber utama (lanjutan feeder)');
    const isDropUsedElsewhere = usedInOtherRatios.includes('distribusi port drop pelanggan');

    // Estimasi drop output dari rasio pertama (untuk rekomendasi)
    const firstRatio = formRatios[0];
    const firstDetail = firstRatio ? getRatioDetail(firstRatio.ratio) : null;
    const firstEstimatedDrop = firstDetail
      ? (inputVal - (firstDetail.lossDrop + plcLoss)).toFixed(2)
      : (inputVal - plcLoss).toFixed(2);

    return (
      <div className="space-y-3">
        {/* KOTAK KALKULASI DINAMIS TITIK LOKASI & REDAMAN ODP */}
        {dynamicLocationCalc && (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-800/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                Kalkulasi Dinamis Titik Lokasi
              </span>
              <span className="font-mono text-[10px] text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 font-semibold">
                {dynamicLocationCalc.prevDistanceMeters !== undefined && dynamicLocationCalc.prevDistanceMeters > 0
                  ? `+${formatDistanceKmOrM(dynamicLocationCalc.prevDistanceMeters, false)} dari ${dynamicLocationCalc.prevNodeName || 'Titik Hulu'}`
                  : `KM ${dynamicLocationCalc.kmStr}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
              <div className="truncate text-[11px]">
                {dynamicLocationCalc.prevOutputLoss !== undefined ? (
                  <span>
                    Sumber: <span className="font-semibold text-slate-100">{dynamicLocationCalc.prevNodeName}</span> ({dynamicLocationCalc.prevOutputLoss} dBm)
                    <span className="text-slate-500 mx-1">➔</span>
                    Loss Kabel ({formatDistanceKmOrM(dynamicLocationCalc.prevDistanceMeters, false)}): <span className="font-mono text-amber-400">-{dynamicLocationCalc.cableLoss} dB</span>
                  </span>
                ) : (
                  <span>Jalur Kabel: <span className="font-semibold text-slate-100">{dynamicLocationCalc.route.name}</span> (KM {dynamicLocationCalc.kmStr})</span>
                )}
              </div>
              {dynamicLocationCalc.estimatedInputLoss !== undefined && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    Est: {dynamicLocationCalc.estimatedInputLoss.toFixed(2)} dBm
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormInputLoss(String(dynamicLocationCalc.estimatedInputLoss?.toFixed(2)))}
                    className="text-[10px] bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 px-2 py-0.5 rounded border border-sky-500/40 transition-colors font-medium"
                  >
                    Terapkan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOKASI TITIK / TIANG ODP */}
        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-bold text-xs">
              Lokasi Titik / Tiang *
            </label>
            {formKmMarker !== null && formKmMarker !== undefined && (
              <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50 font-semibold">
                KM {formKmMarker.toFixed(2)}
              </span>
            )}
          </div>
          <input
            type="text"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            placeholder="Contoh: KM 0.55 (Tiang Udara / Masuk Gang)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 font-medium text-xs"
          />
        </div>

        {/* BARIS ATAS: Kapasitas Splitter ODP & Redaman Input Laser OPM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* 1. Kapasitas Splitter ODP */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold text-xs">
                Kapasitas Splitter ODP
              </label>
            </div>
            <select
              value={formCapacity}
              onChange={(e) => setFormCapacity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-slate-500 font-mono text-xs font-semibold"
            >
              <option value="0">Tanpa Splitter</option>
              {[2, 4, 8, 16, 24, 32, 64].map((cap) => (
                <option key={cap} value={String(cap)}>
                  {cap} Port Pelanggan
                </option>
              ))}
            </select>
          </div>

          {/* 2. Redaman Input Laser (Hasil Ukur OPM Lapangan) */}
          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold text-xs">
                Redaman Input (OPM) *
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formInputLoss}
                onChange={(e) => setFormInputLoss(e.target.value)}
                placeholder="-14.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 pr-12 focus:outline-none focus:border-slate-500 font-mono text-xs font-bold"
              />
              <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-mono font-semibold">
                dBm
              </span>
            </div>
          </div>
        </div>

        {/* SECTION: DIAGRAM PEMBAGIAN RASIO & LINE TUJUAN */}
        <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <label className="block text-white font-bold text-xs">
                Diagram Alur Rasio FBT & Jalur Tujuan
              </label>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Memetakan pembagian 2 kaki per rasio: Drop (ke pelanggan) & Lanjut (ke kabel berikutnya).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRatioItem}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-2.5 py-1 rounded-lg border border-brand-500/30 transition-colors shrink-0"
            >
              + Tambah Rasio
            </button>
          </div>

          <div className="space-y-3">
            {formRatios.map((item, index) => {
              const matchedRoute = routes.find(
                (r) =>
                  r.id === item.targetRouteId ||
                  r.name.toLowerCase() === (item.direction || '').trim().toLowerCase() ||
                  `line fiber: ${r.name.toLowerCase()}` === (item.direction || '').trim().toLowerCase()
              );

              const availableRoutes = routes.filter((r) => {
                const rVal = `line fiber: ${r.name.toLowerCase()}`;
                const isCurrent =
                  (item.targetRouteId && item.targetRouteId === r.id) ||
                  (item.direction &&
                    (item.direction.toLowerCase() === rVal ||
                      item.direction.toLowerCase() === r.name.toLowerCase()));
                if (isCurrent) return true;
                const isUsedHere = usedInOtherRatios.some((d) => d === rVal || d === r.name.toLowerCase());
                const isUsedElsewhere =
                  usedByOtherNodes.has(r.id) ||
                  usedByOtherNodes.has(r.name.toLowerCase()) ||
                  usedByOtherNodes.has(rVal);
                return !isUsedHere && !isUsedElsewhere;
              });

              // === CASCADE INPUT ===
              // Hitung input sinyal untuk rasio ini secara rekursif.
              // Jika kaki B rasio sebelumnya → cascade (__next_splitter__),
              // maka input rasio ini = output kaki B rasio sebelumnya.
              // Ini dihitung mundur secara rekursif agar multi-level cascade benar.
              const computeCascadeInput = (idx: number): number => {
                if (idx <= 0) return inputVal;
                const prev = formRatios[idx - 1];
                if ((prev.direction || '').trim() !== '__next_splitter__') {
                  // Rasio ini tidak menerima cascade — gunakan inputVal langsung
                  return inputVal;
                }
                // Input rasio sebelumnya (rekursif)
                const prevInput = computeCascadeInput(idx - 1);
                const prevDetail = getRatioDetail(prev.ratio);
                const prevLossPass = prevDetail ? prevDetail.lossPass : 0;
                // Output kaki B rasio sebelumnya = prevInput - lossPass_prev
                return prevInput - prevLossPass;
              };
              const splitterInputVal = computeCascadeInput(index);

              const isDirect = !item.ratio || item.ratio === 'Tanpa Rasio';
              const detail = getRatioDetail(item.ratio);
              const dropPct = detail ? detail.dropPct : 100;
              const passPct = detail ? detail.passPct : 0;
              const lossDrop = detail ? detail.lossDrop : 0;
              const lossPass = detail ? detail.lossPass : 0;

              const isChainedToNext = (item.direction || '').trim() === '__next_splitter__';
              const hasNextSplitter = index < formRatios.length - 1;
              const receivesFromPrev = index > 0 && (formRatios[index - 1].direction || '').trim() === '__next_splitter__';

              // Dropdown tujuan kaki A dan B — harus diketahui SEBELUM menghitung output
              const dirA = (item as any).directionDrop || '__pelanggan__';
              const dirB = item.direction || (index === 0 ? 'Line Fiber Utama (Lanjutan Feeder)' : 'Line Fiber Masuk Gang');

              // === KALKULASI OUTPUT ===
              // PLC loss HANYA berlaku jika kaki mengarah ke Port Pelanggan.
              // Jika ke kabel (gang, feeder, dll.), sinyal tidak melewati PLC splitter.
              const calcKakiA = isDirect
                ? (splitterInputVal - plcLoss).toFixed(2)
                : dirA === '__pelanggan__'
                  ? (splitterInputVal - (lossDrop + plcLoss)).toFixed(2)
                  : (splitterInputVal - lossDrop).toFixed(2);

              const calcKakiB = isDirect ? null
                : dirB === '__pelanggan__'
                  ? (splitterInputVal - (lossPass + plcLoss)).toFixed(2)
                  : (splitterInputVal - lossPass).toFixed(2);

              const DEST_OPTIONS = (isNextCascade?: boolean) => (
                <>
                  <option value="__pelanggan__">⬤ Port Pelanggan</option>
                  <option value="Line Fiber Masuk Gang">Masuk Gang</option>
                  {(!isUtamaUsedElsewhere || dirB === 'Line Fiber Utama (Lanjutan Feeder)') && (
                    <option value="Line Fiber Utama (Lanjutan Feeder)">Feeder Utama</option>
                  )}
                  <option value="Line Fiber Sekunder / Distribusi">Distribusi</option>
                  {availableRoutes.length > 0 && (
                    <optgroup label="Line di Peta">
                      {availableRoutes.map((r) => (
                        <option key={r.id} value={`Line Fiber: ${r.name}`}>{r.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {isNextCascade && hasNextSplitter && (
                    <option value="__next_splitter__">⛓ → Rasio #{index + 2} (Cascade)</option>
                  )}
                </>
              );

              return (
                <div key={item.id}>
                  {receivesFromPrev && (
                    <div className="flex items-center gap-2 py-1.5 mb-0.5">
                      <div className="flex-1 h-px bg-violet-500/30" />
                      <span className="text-[9px] text-violet-300 font-mono px-2 py-0.5 rounded-full bg-violet-950/50 border border-violet-500/30">
                        ⛓ {splitterInputVal.toFixed(2)} dBm
                      </span>
                      <div className="flex-1 h-px bg-violet-500/30" />
                    </div>
                  )}

                  <div className={`rounded-xl border p-2.5 space-y-2 ${receivesFromPrev ? 'bg-violet-950/10 border-violet-800/50' : 'bg-slate-950/80 border-slate-800'}`}>
                    {/* Header: Nomor + Pilih Rasio + Hapus */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                        #{index + 1}
                      </span>
                      <select
                        value={item.ratio}
                        onChange={(e) => handleUpdateRatioItem(item.id, 'ratio', e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-brand-400 font-mono font-bold focus:outline-none focus:border-brand-500"
                      >
                        {!COUPLER_RATIOS.includes(item.ratio) && item.ratio && (
                          <option value={item.ratio}>{item.ratio}</option>
                        )}
                        {COUPLER_RATIOS.map((ratio) => (
                          <option key={ratio} value={ratio}>{ratio}</option>
                        ))}
                      </select>
                      {formRatios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRatioItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 text-base font-bold leading-none p-0.5 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* CORE INPUT — core yang membawa sinyal masuk ke FBT ini */}
                    {!isDirect && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60">
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider shrink-0">Core Masuk</span>
                        <div className="flex items-center gap-0.5 flex-1">
                          {BASE_12_CORE_COLORS.map((c, ci) => {
                            const cn = ci + 1;
                            const sel = (item as any).coreInput === cn;
                            return (
                              <button
                                key={cn}
                                type="button"
                                onClick={() => handleUpdateRatioItem(item.id, 'coreInput' as any, sel ? undefined : cn)}
                                title={`Core ${cn} — ${c.name}`}
                                className={`flex flex-col items-center p-0.5 rounded border transition-all ${sel
                                  ? 'border-amber-400 bg-amber-950/50 ring-1 ring-amber-400 scale-110'
                                  : 'border-slate-700/30 hover:border-amber-500/50'
                                  }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full block"
                                  style={{ backgroundColor: c.hex, border: c.borderHex ? `1px solid ${c.borderHex}` : '1px solid rgba(255,255,255,0.15)' }}
                                />
                                <span className="text-[5px] font-mono text-slate-600 leading-none mt-0.5">{cn}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2 Kaki simetris */}
                    {isDirect ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-700/60">
                        <span className="text-xs font-bold text-slate-200">
                          {Number(formCapacity) > 0 ? `${formCapacity} Port Pelanggan` : 'Tanpa Splitter'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-mono text-slate-200">{calcKakiA} <span className="text-[10px] font-normal text-slate-400">dBm</span></span>
                          <button type="button" onClick={() => setFormOutputLoss(calcKakiA)} className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-md transition-all">Set</button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* KAKI A */}
                        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-slate-300 font-mono">Rasio · {dropPct}%</span>
                            {/* Mini core color dot — Kaki A */}
                            {(item as any).coreA && (() => {
                              const cc = BASE_12_CORE_COLORS[((item as any).coreA - 1) % 12];
                              return (
                                <span className="flex items-center gap-0.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cc?.hex, border: `1px solid ${cc?.borderHex || 'rgba(255,255,255,0.2)'}` }} />
                                  <span className="text-[7px] font-mono text-slate-400">#{(item as any).coreA}</span>
                                </span>
                              );
                            })()}
                          </div>
                          <select
                            value={dirA}
                            onChange={(e) => handleUpdateRatioItem(item.id, 'directionDrop' as any, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-1 text-[10px] text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
                          >
                            {DEST_OPTIONS(false)}
                          </select>
                          {/* Core Picker Kaki A — selalu tampil (core fisik tidak bergantung tujuan) */}
                          <div className="border-t border-slate-700/40 pt-1">
                            <div className="text-[7px] text-slate-500 uppercase tracking-wider mb-0.5">Core Kabel</div>
                            <div className="grid grid-cols-6 gap-0.5">
                              {BASE_12_CORE_COLORS.map((c, ci) => {
                                const cn = ci + 1;
                                const sel = (item as any).coreA === cn;
                                return (
                                  <button key={cn} type="button"
                                    onClick={() => handleUpdateRatioItem(item.id, 'coreA' as any, sel ? undefined : cn)}
                                    title={`Core ${cn} — ${c.name}`}
                                    className={`flex flex-col items-center gap-0.5 p-0.5 rounded border transition-all ${sel ? 'border-sky-400 bg-sky-950/50 ring-1 ring-sky-400' : 'border-slate-700/30 hover:border-sky-600/40'}`}
                                  >
                                    <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: c.hex, border: c.borderHex ? `1px solid ${c.borderHex}` : '1px solid rgba(255,255,255,0.15)' }} />
                                    <span className="text-[6px] font-mono text-slate-600">{cn}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-700/50 pt-1">
                            <span className="text-xs font-black font-mono text-emerald-400">{calcKakiA} <span className="text-[9px] font-normal text-slate-400">dBm</span></span>
                            {dirA === '__pelanggan__' && (
                              <button type="button" onClick={() => setFormOutputLoss(calcKakiA)} className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded transition-all">Set</button>
                            )}
                          </div>
                        </div>

                        {/* KAKI B */}
                        <div className={`p-2 rounded-lg border flex flex-col gap-1.5 ${isChainedToNext ? 'bg-violet-950/20 border-violet-700/60' : 'bg-slate-900/60 border-slate-700/60'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase font-mono ${isChainedToNext ? 'text-violet-300' : 'text-slate-300'}`}>Rasio · {passPct}%</span>
                            <div className="flex items-center gap-1">
                              {/* Mini core color dot — Kaki B */}
                              {(item as any).coreB && (() => {
                                const cc = BASE_12_CORE_COLORS[((item as any).coreB - 1) % 12];
                                return (
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cc?.hex, border: `1px solid ${cc?.borderHex || 'rgba(255,255,255,0.2)'}` }} />
                                    <span className="text-[7px] font-mono text-slate-400">#{(item as any).coreB}</span>
                                  </span>
                                );
                              })()}
                              {isChainedToNext && <span className="text-[8px] text-violet-400 font-bold">CASC</span>}
                            </div>
                          </div>
                          <select
                            value={dirB}
                            onChange={(e) => handleUpdateRatioItem(item.id, 'direction', e.target.value)}
                            className={`w-full bg-slate-950 border rounded-md p-1 text-[10px] focus:outline-none font-medium ${isChainedToNext ? 'border-violet-700 text-violet-200 focus:border-violet-500' : 'border-slate-700 text-slate-200 focus:border-brand-500'}`}
                          >
                            {DEST_OPTIONS(true)}
                            {dirB && !['__pelanggan__', '__next_splitter__', 'Line Fiber Masuk Gang', 'Line Fiber Utama (Lanjutan Feeder)', 'Line Fiber Sekunder / Distribusi', ...availableRoutes.map((r) => `Line Fiber: ${r.name}`)].includes(dirB) && (
                              <option value={dirB}>{dirB}</option>
                            )}
                          </select>
                          {/* Core Picker Kaki B — selalu tampil */}
                          <div className="border-t border-slate-700/40 pt-1">
                            <div className="text-[7px] text-slate-500 uppercase tracking-wider mb-0.5">Core Kabel</div>
                            <div className="grid grid-cols-6 gap-0.5">
                              {BASE_12_CORE_COLORS.map((c, ci) => {
                                const cn = ci + 1;
                                const sel = (item as any).coreB === cn;
                                return (
                                  <button key={cn} type="button"
                                    onClick={() => handleUpdateRatioItem(item.id, 'coreB' as any, sel ? undefined : cn)}
                                    title={`Core ${cn} — ${c.name}`}
                                    className={`flex flex-col items-center gap-0.5 p-0.5 rounded border transition-all ${sel ? 'border-emerald-400 bg-emerald-950/50 ring-1 ring-emerald-400' : 'border-slate-700/30 hover:border-emerald-600/40'}`}
                                  >
                                    <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: c.hex, border: c.borderHex ? `1px solid ${c.borderHex}` : '1px solid rgba(255,255,255,0.15)' }} />
                                    <span className="text-[6px] font-mono text-slate-600">{cn}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-700/50 pt-1">
                            <span className={`text-xs font-black font-mono ${isChainedToNext ? 'text-violet-400' : 'text-sky-400'}`}>{calcKakiB} <span className="text-[9px] font-normal text-slate-400">dBm</span></span>
                            {dirB === '__pelanggan__' && (
                              <button type="button" onClick={() => setFormOutputLoss(calcKakiB!)} className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold rounded transition-all">Set</button>
                            )}
                            {isChainedToNext && <span className="text-[8px] text-violet-300 font-mono">→ #{index + 2}</span>}
                            {!isChainedToNext && matchedRoute && <span className="text-[8px] text-emerald-400">● Peta</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FLOW DIAGRAM VISUAL — alur core sesuai diagram lapangan */}
          {formRatios.length > 0 && formRatios.some((r) => (r as any).coreA || (r as any).coreB) && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/50">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Alur Core Fiber</div>
              <div className="space-y-1">
                {formRatios.map((r, ri) => {
                  const dA = (r as any).directionDrop || '__pelanggan__';
                  const dB = r.direction || '';
                  const cIn = (r as any).coreInput;
                  const cA = (r as any).coreA;
                  const cB = (r as any).coreB;
                  const ccIn = cIn ? BASE_12_CORE_COLORS[(cIn - 1) % 12] : null;
                  const ccA = cA ? BASE_12_CORE_COLORS[(cA - 1) % 12] : null;
                  const ccB = cB ? BASE_12_CORE_COLORS[(cB - 1) % 12] : null;
                  const detail = getRatioDetail(r.ratio);
                  const dropPctLocal = detail ? detail.dropPct : 50;
                  const passPctLocal = detail ? detail.passPct : 50;
                  const isCasc = (dB || '').trim() === '__next_splitter__';
                  return (
                    <div key={r.id} className="flex items-stretch gap-1.5">
                      <div className="flex flex-col items-center">
                        <div className="w-px flex-1 bg-slate-600" />
                        <span className="text-[7px] font-bold text-slate-500 font-mono py-0.5">#{ri + 1}</span>
                        <div className="w-px flex-1 bg-slate-600" />
                      </div>
                      <div className="flex-1 bg-slate-900/50 rounded-lg p-1.5 border border-slate-800">
                        {/* Baris: Core Input → FBT */}
                        <div className="flex items-center gap-1 mb-1.5">
                          {ccIn ? (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ccIn.hex, border: `1px solid ${ccIn.borderHex || 'rgba(255,255,255,0.15)'}` }} />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-amber-700/50" />
                          )}
                          <span className="text-[7px] text-amber-500/80 font-mono">IN</span>
                          <span className="text-[7px] text-slate-600">→</span>
                          <span className="text-[8px] font-bold text-brand-400 font-mono">{r.ratio || '—'}</span>
                          <span className="text-[7px] text-slate-600">→</span>
                        </div>
                        <div className="space-y-0.5 pl-3 border-l border-slate-700/50">
                          {/* Kaki A */}
                          <div className="flex items-center gap-1">
                            {ccA ? (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ccA.hex, border: `1px solid ${ccA.borderHex || 'rgba(255,255,255,0.15)'}` }} />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-slate-600" />
                            )}
                            <span className="text-[7px] font-mono text-slate-500">{dropPctLocal}%</span>
                            <span className="text-[7px] text-slate-600">→</span>
                            <span className="text-[7px] text-slate-300 truncate">
                              {dA === '__pelanggan__' ? '🔵 ODP Pelanggan' : dA}
                            </span>
                          </div>
                          {/* Kaki B */}
                          <div className="flex items-center gap-1">
                            {ccB ? (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ccB.hex, border: `1px solid ${ccB.borderHex || 'rgba(255,255,255,0.15)'}` }} />
                            ) : (
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-slate-600" />
                            )}
                            <span className="text-[7px] font-mono text-slate-500">{passPctLocal}%</span>
                            <span className="text-[7px] text-slate-600">→</span>
                            <span className={`text-[7px] truncate ${isCasc ? 'text-violet-400' : 'text-slate-300'}`}>
                              {isCasc ? `⛓ Rasio #${ri + 2}` : (dB || '—')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* HASIL AKHIR: REDAMAN OUTPUT ODP (HASIL UKUR OPM DI PORT DROP) */}
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-300 font-bold text-xs">
              Redaman Output ODP (Hasil Ukur Port Pelanggan)
            </label>
            {firstEstimatedDrop && (
              <button
                type="button"
                onClick={() => setFormOutputLoss(firstEstimatedDrop)}
                className="text-[10px] font-bold text-brand-400 hover:text-brand-300 underline"
              >
                Gunakan Estimasi ({firstEstimatedDrop} dBm)
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={formOutputLoss}
              onChange={(e) => setFormOutputLoss(e.target.value)}
              placeholder="-24.50"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-emerald-400 pr-12 focus:outline-none focus:border-brand-500 font-mono text-sm font-bold"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono font-semibold">
              dBm
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // FORMULIR PENGATURAN JOINT CLOSURE (JC) — TAMPILAN BERSIH & STANDAR ODP
  // ─────────────────────────────────────────────────────────────────────────────
  const renderClosureForm = () => {
    const jcCap = parseInt(formCapacity, 10) || 2;
    const currentInputCore = formAssignedCore || 1;
    const currentOutputCore = formOutputCore || currentInputCore;
    const inputVal = parseFloat(formInputLoss ? formInputLoss.replace(',', '.') : '-14.00') || -14.0;

    const handleAddSplice = () => {
      const nextIdx = formSpliceMaps.length + 1;
      setFormSpliceMaps((prev) => [
        ...prev,
        {
          id: `splice-${Date.now()}-${nextIdx}`,
          label: `Sambungan #${nextIdx}`,
          targetRouteId: formRouteId,
          targetRouteName: formParent,
          inputCoreNumber: Math.min(jcCap, nextIdx),
          outputCoreNumber: Math.min(jcCap, nextIdx),
        },
      ]);
    };

    const handleRemoveSplice = (idx: number) => {
      setFormSpliceMaps((prev) => prev.filter((_, i) => i !== idx));
    };

    const computeCascadeInput = (idx: number): number => {
      if (idx <= 0) return inputVal;
      const prev = formRatios[idx - 1];
      if ((prev.direction || '').trim() !== '__next_splitter__') {
        return inputVal;
      }
      const prevInput = computeCascadeInput(idx - 1);
      const prevDetail = getRatioDetail(prev.ratio);
      const prevLossPass = prevDetail ? prevDetail.lossPass : 0;
      return prevInput - prevLossPass;
    };

    const DEST_OPTIONS = (isNextCascade?: boolean, hasNextSplitter?: boolean, currentIdx?: number) => (
      <>
        {routes.length > 0 && (
          <optgroup label="Line Kabel di Peta">
            {routes.map((r) => (
              <option key={r.id} value={`Line Fiber: ${r.name}`}>
                {r.name} ({r.coreCount} Core)
              </option>
            ))}
          </optgroup>
        )}
        <option value="Line Fiber Utama (Lanjutan Feeder)">Feeder Utama</option>
        <option value="Line Fiber Masuk Gang">Masuk Gang</option>
        <option value="Line Fiber Sekunder / Distribusi">Distribusi</option>
        {isNextCascade && hasNextSplitter && currentIdx !== undefined && (
          <option value="__next_splitter__">⛓ → Rasio #{currentIdx + 2} (Cascade)</option>
        )}
      </>
    );

    return (
      <div className="space-y-3">
        {/* PILIHAN MODE SAMBUNGAN: LURUS VS BAGI REDAMAN */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-700/80 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setFormClosureMode('DIRECT');
              if (formInputLoss === '-14.00' || formInputLoss === '-14') {
                setFormInputLoss('0.02');
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-all ${formClosureMode === 'DIRECT'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Sambungan Lurus
          </button>
          <button
            type="button"
            onClick={() => {
              setFormClosureMode('RATIO');
              if (!formInputLoss || formInputLoss === '0.02') {
                setFormInputLoss('-14.00');
              }
              if (formRatios.length === 0) {
                setFormRatios([
                  { id: `ratio-${Date.now()}`, ratio: '80:20', direction: 'Line Fiber Utama (Lanjutan Feeder)' },
                ]);
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap text-center transition-all ${formClosureMode === 'RATIO'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-600/70'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Bagi Redaman (Rasio)
          </button>
        </div>

        {/* KOTAK KALKULASI DINAMIS TITIK LOKASI & REDAMAN JOINT CLOSURE */}
        {dynamicLocationCalc && (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-sky-800/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                Kalkulasi Dinamis Titik Lokasi
              </span>
              <span className="font-mono text-[10px] text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60 font-semibold">
                {dynamicLocationCalc.prevDistanceMeters !== undefined && dynamicLocationCalc.prevDistanceMeters > 0
                  ? `+${formatDistanceKmOrM(dynamicLocationCalc.prevDistanceMeters, false)} dari ${dynamicLocationCalc.prevNodeName || 'Titik Hulu'}`
                  : `KM ${dynamicLocationCalc.kmStr}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
              <div className="truncate text-[11px]">
                {dynamicLocationCalc.prevOutputLoss !== undefined ? (
                  <span>
                    Sumber: <span className="font-semibold text-slate-100">{dynamicLocationCalc.prevNodeName}</span> ({dynamicLocationCalc.prevOutputLoss} dBm)
                    <span className="text-slate-500 mx-1">➔</span>
                    Loss Kabel ({formatDistanceKmOrM(dynamicLocationCalc.prevDistanceMeters, false)}): <span className="font-mono text-amber-400">-{dynamicLocationCalc.cableLoss} dB</span>
                  </span>
                ) : (
                  <span>Jalur Kabel: <span className="font-semibold text-slate-100">{dynamicLocationCalc.route.name}</span> (KM {dynamicLocationCalc.kmStr})</span>
                )}
              </div>
              {dynamicLocationCalc.estimatedInputLoss !== undefined && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    Est: {dynamicLocationCalc.estimatedInputLoss.toFixed(2)} dBm
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormClosureMode('RATIO');
                      setFormInputLoss(String(dynamicLocationCalc.estimatedInputLoss?.toFixed(2)));
                    }}
                    className="text-[10px] bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 px-2 py-0.5 rounded border border-sky-500/40 transition-colors font-medium"
                  >
                    Terapkan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MODE 1: BAGI REDAMAN (SPLITTER RASIO FBT) ─── */}
        {formClosureMode === 'RATIO' ? (
          <div className="space-y-3">
            {/* KAPASITAS CORE & REDAMAN INPUT (OPM) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Kapasitas Joint Closure *
                </label>
                <select
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-xs font-semibold"
                >
                  {[2, 4, 6, 8, 12, 24, 48, 96, 144].map((c) => (
                    <option key={c} value={String(c)}>
                      {c} Core
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Redaman Input (OPM) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formInputLoss}
                    onChange={(e) => setFormInputLoss(e.target.value)}
                    placeholder="-14.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 pr-12 focus:outline-none focus:border-brand-500 font-mono text-xs font-bold"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-mono font-semibold">
                    dBm
                  </span>
                </div>
              </div>
            </div>

            {/* MODEL FISIK & LOKASI TITIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Model Fisik JC
                </label>
                <select
                  value={formModel || 'Inline / Horizontal'}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="Inline / Horizontal">Inline / Horizontal</option>
                  <option value="Dome (Kubah)">Dome (Kubah)</option>
                </select>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Lokasi Titik
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Contoh: Tiang Udara / Handhole"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>
            </div>

            {/* SECTION: PEMBAGIAN RASIO FBT */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-white font-semibold text-xs">
                  Pembagian Rasio FBT
                </label>
                <button
                  type="button"
                  onClick={handleAddRatioItem}
                  className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  + Tambah Rasio
                </button>
              </div>

              <div className="space-y-3">
                {formRatios.map((item, index) => {
                  const splitterInputVal = computeCascadeInput(index);
                  const detail = getRatioDetail(item.ratio);
                  const dropPct = detail ? detail.dropPct : 50;
                  const passPct = detail ? detail.passPct : 50;
                  const lossDrop = detail ? detail.lossDrop : 0;
                  const lossPass = detail ? detail.lossPass : 0;

                  const hasNextSplitter = index < formRatios.length - 1;
                  const receivesFromPrev = index > 0 && (formRatios[index - 1].direction || '').trim() === '__next_splitter__';

                  const dirA = (item as any).directionDrop || 'Line Fiber Masuk Gang';
                  const dirB = item.direction || (index === 0 ? 'Line Fiber Utama (Lanjutan Feeder)' : 'Line Fiber Masuk Gang');

                  const calcKakiA = (splitterInputVal - lossDrop).toFixed(2);
                  const calcKakiB = (splitterInputVal - lossPass).toFixed(2);

                  return (
                    <div key={item.id} className="bg-slate-900/90 p-3 rounded-xl border border-slate-700/80 space-y-2.5">
                      {receivesFromPrev && (
                        <div className="flex items-center gap-2 py-0.5 mb-1">
                          <div className="flex-1 h-px bg-slate-700" />
                          <span className="text-[10px] text-slate-300 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            Terusan dari Rasio #{index}: {splitterInputVal.toFixed(2)} dBm
                          </span>
                          <div className="flex-1 h-px bg-slate-700" />
                        </div>
                      )}

                      {/* Header Rasio & Pilihan Rasio */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-slate-400 shrink-0">
                          #{index + 1}
                        </span>
                        <select
                          value={item.ratio}
                          onChange={(e) => handleUpdateRatioItem(item.id, 'ratio', e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-brand-500"
                        >
                          {!COUPLER_RATIOS.includes(item.ratio) && item.ratio && (
                            <option value={item.ratio}>{item.ratio}</option>
                          )}
                          {COUPLER_RATIOS.map((ratio) => (
                            <option key={ratio} value={ratio}>{ratio}</option>
                          ))}
                        </select>
                        {formRatios.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRatioItem(item.id)}
                            className="text-xs text-slate-500 hover:text-rose-400 font-medium px-1.5 py-1 transition-colors"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      {/* Baris Core Masuk */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">Core Masuk:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {BASE_12_CORE_COLORS.slice(0, Math.min(12, jcCap)).map((c, ci) => {
                            const cn = ci + 1;
                            const sel = (item as any).coreInput === cn;
                            return (
                              <button
                                key={cn}
                                type="button"
                                onClick={() => handleUpdateRatioItem(item.id, 'coreInput', sel ? undefined : cn)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition-all ${sel
                                  ? 'border-brand-500 bg-brand-500/20 text-white font-semibold shadow-sm'
                                  : 'border-slate-700/80 bg-slate-950 text-slate-300 hover:border-slate-600'
                                  }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                                <span>#{cn}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2 Kolom Pembagian Rasio */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {/* RASIO DROP / CABANG */}
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-200">Rasio · {dropPct}%</span>
                            {(item as any).coreA && (() => {
                              const cc = BASE_12_CORE_COLORS[((item as any).coreA - 1) % 12];
                              return (
                                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cc?.hex }} />
                                  Core #{(item as any).coreA}
                                </span>
                              );
                            })()}
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Tujuan Jalur / Kabel:</span>
                            <select
                              value={dirA}
                              onChange={(e) => handleUpdateRatioItem(item.id, 'directionDrop', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 truncate"
                            >
                              {DEST_OPTIONS(false, false, index)}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Sambung ke Core Keluar:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {BASE_12_CORE_COLORS.slice(0, Math.min(12, jcCap)).map((c, ci) => {
                                const cn = ci + 1;
                                const sel = (item as any).coreA === cn;
                                return (
                                  <button
                                    key={cn}
                                    type="button"
                                    onClick={() => handleUpdateRatioItem(item.id, 'coreA', sel ? undefined : cn)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono transition-all ${sel
                                      ? 'border-brand-500 bg-brand-500/20 text-white font-semibold'
                                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                                      }`}
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hex }} />
                                    <span>#{cn}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-xs font-mono font-semibold text-slate-200">
                              Output: <span className="text-emerald-400 font-bold">{calcKakiA} dBm</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormOutputLoss(calcKakiA)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-medium rounded transition-colors"
                            >
                              Set
                            </button>
                          </div>
                        </div>

                        {/* RASIO LANJUT / PASS-THROUGH */}
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-200">Rasio · {passPct}%</span>
                            {(item as any).coreB && (() => {
                              const cc = BASE_12_CORE_COLORS[((item as any).coreB - 1) % 12];
                              return (
                                <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cc?.hex }} />
                                  Core #{(item as any).coreB}
                                </span>
                              );
                            })()}
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-0.5">Tujuan Jalur / Kabel:</span>
                            <select
                              value={dirB}
                              onChange={(e) => handleUpdateRatioItem(item.id, 'direction', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500 truncate"
                            >
                              {DEST_OPTIONS(true, hasNextSplitter, index)}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Sambung ke Core Keluar:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {BASE_12_CORE_COLORS.slice(0, Math.min(12, jcCap)).map((c, ci) => {
                                const cn = ci + 1;
                                const sel = (item as any).coreB === cn;
                                return (
                                  <button
                                    key={cn}
                                    type="button"
                                    onClick={() => handleUpdateRatioItem(item.id, 'coreB', sel ? undefined : cn)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono transition-all ${sel
                                      ? 'border-brand-500 bg-brand-500/20 text-white font-semibold'
                                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                                      }`}
                                  >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.hex }} />
                                    <span>#{cn}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-xs font-mono font-semibold text-slate-200">
                              Output: <span className="text-emerald-400 font-bold">{calcKakiB} dBm</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setFormOutputLoss(calcKakiB)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-[10px] font-medium rounded transition-colors"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ─── MODE 2: SAMBUNGAN LURUS (DIRECT SPLICE 1:1) ─── */
          <div className="space-y-3">
            {/* KAPASITAS CORE & MODEL FISIK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Kapasitas Joint Closure *
                </label>
                <select
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-xs font-semibold"
                >
                  {[2, 4, 6, 8, 12, 24, 48, 96, 144].map((c) => (
                    <option key={c} value={String(c)}>
                      {c} Core
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Model Fisik JC
                </label>
                <select
                  value={formModel || 'Inline / Horizontal'}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                >
                  <option value="Inline / Horizontal">Inline / Horizontal</option>
                  <option value="Dome (Kubah)">Dome (Kubah)</option>
                </select>
              </div>
            </div>

            {/* LOKASI PEMASANGAN & ESTIMASI LOSS SPLICING */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Lokasi Titik
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Contoh: Tiang Udara / Handhole"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
                />
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                <label className="text-slate-300 font-semibold text-xs block">
                  Redaman Sambung (Loss)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formInputLoss}
                    onChange={(e) => setFormInputLoss(e.target.value)}
                    placeholder="0.02"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 pr-10 focus:outline-none focus:border-brand-500 font-mono text-xs"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-400 font-mono">
                    dB
                  </span>
                </div>
              </div>
            </div>

            {/* PEMETAAN SAMBUNGAN CORE (SPLICING) */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold text-xs">
                  Jalur & Sambungan Core
                </span>
                <button
                  type="button"
                  onClick={handleAddSplice}
                  className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  + Tambah Sambungan
                </button>
              </div>

              {/* Sambungan Utama */}
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Kabel Sumber Masuk:</span>
                    <select
                      value={formRouteId}
                      onChange={(e) => {
                        const rid = e.target.value;
                        setFormRouteId(rid);
                        const matched = routes.find((r) => r.id === rid);
                        if (matched) setFormParent(matched.name);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs truncate"
                    >
                      <option value="">-- Pilih Kabel Masuk --</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.coreCount} Core)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Core Masuk:</span>
                    <select
                      value={currentInputCore}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setFormAssignedCore(num);
                        if (formSpliceMaps.length === 0) {
                          setFormSpliceMaps([{
                            id: `splice-${Date.now()}`,
                            label: 'Sambungan 1',
                            targetRouteId: formRouteId,
                            targetRouteName: formParent,
                            inputCoreNumber: num,
                            outputCoreNumber: formOutputCore || num,
                          }]);
                        } else {
                          const updated = [...formSpliceMaps];
                          updated[0] = { ...updated[0], inputCoreNumber: num };
                          setFormSpliceMaps(updated);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-mono"
                    >
                      {FIBER_CORE_STANDARDS.slice(0, Math.max(jcCap, 12)).map((c) => (
                        <option key={c.coreNumber} value={c.coreNumber}>
                          Core {c.coreNumber} - {c.colorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Kabel Lanjutan / Cabang:</span>
                    <select
                      value={formSpliceMaps[0]?.targetRouteId || formRouteId || ''}
                      onChange={(e) => {
                        const tid = e.target.value;
                        const matched = routes.find((r) => r.id === tid);
                        const updated = [...formSpliceMaps];
                        if (updated.length === 0) {
                          updated.push({
                            id: `splice-${Date.now()}`,
                            label: 'Sambungan 1',
                            targetRouteId: tid,
                            targetRouteName: matched?.name || '',
                            inputCoreNumber: currentInputCore,
                            outputCoreNumber: currentOutputCore,
                          });
                        } else {
                          updated[0] = {
                            ...updated[0],
                            targetRouteId: tid,
                            targetRouteName: matched?.name || '',
                          };
                        }
                        setFormSpliceMaps(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs truncate"
                    >
                      <option value="">-- Pilih Kabel Keluar --</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.coreCount} Core)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Sambung ke Core Keluar:</span>
                    <select
                      value={currentOutputCore}
                      onChange={(e) => {
                        const outNum = Number(e.target.value);
                        setFormOutputCore(outNum);
                        const updated = [...formSpliceMaps];
                        if (updated.length === 0) {
                          updated.push({
                            id: `splice-${Date.now()}`,
                            label: 'Sambungan 1',
                            targetRouteId: formRouteId,
                            targetRouteName: formParent,
                            inputCoreNumber: currentInputCore,
                            outputCoreNumber: outNum,
                          });
                        } else {
                          updated[0] = { ...updated[0], outputCoreNumber: outNum };
                        }
                        setFormSpliceMaps(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-slate-200 text-xs font-mono"
                    >
                      {FIBER_CORE_STANDARDS.slice(0, Math.max(jcCap, 12)).map((c) => (
                        <option key={c.coreNumber} value={c.coreNumber}>
                          Core {c.coreNumber} - {c.colorName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Baris Sambungan Tambahan jika ada lebih dari 1 */}
              {formSpliceMaps.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {formSpliceMaps.slice(1).map((sm, idx) => {
                    const actualIdx = idx + 1;
                    return (
                      <div key={sm.id || actualIdx} className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-300 font-medium">Sambungan #{actualIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSplice(actualIdx)}
                            className="text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400 block mb-0.5">Core Masuk:</span>
                            <select
                              value={sm.inputCoreNumber || 1}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...formSpliceMaps];
                                updated[actualIdx] = { ...updated[actualIdx], inputCoreNumber: val };
                                setFormSpliceMaps(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-slate-200 font-mono text-xs"
                            >
                              {FIBER_CORE_STANDARDS.slice(0, Math.max(jcCap, 12)).map((c) => (
                                <option key={c.coreNumber} value={c.coreNumber}>
                                  Core {c.coreNumber} - {c.colorName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Core Keluar:</span>
                            <select
                              value={sm.outputCoreNumber || 1}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                const updated = [...formSpliceMaps];
                                updated[actualIdx] = { ...updated[actualIdx], outputCoreNumber: val };
                                setFormSpliceMaps(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-slate-200 font-mono text-xs"
                            >
                              {FIBER_CORE_STANDARDS.slice(0, Math.max(jcCap, 12)).map((c) => (
                                <option key={c.coreNumber} value={c.coreNumber}>
                                  Core {c.coreNumber} - {c.colorName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCoreSelector = (
    selectedCore: number | null,
    onSelectCore: (coreNum: number) => void,
    targetRoute?: FiberRoute,
    excludeNodeId?: string
  ) => {
    if (!targetRoute) return null;
    const maxCore = Math.max(1, Math.min(24, targetRoute.coreCount || 24));
    const routeCores = targetRoute.cores || generateDefaultCores(maxCore);

    const tube1Cores = FIBER_CORE_STANDARDS.slice(0, Math.min(12, maxCore));
    const tube2Cores = maxCore > 12 ? FIBER_CORE_STANDARDS.slice(12, maxCore) : [];

    const selectedStd = FIBER_CORE_STANDARDS.find((c) => c.coreNumber === selectedCore);

    const renderTubeSection = (
      tubeTitle: string,
      cores: typeof FIBER_CORE_STANDARDS,
      tubeNum: number
    ) => (
      <div className="space-y-1.5">
        {maxCore > 12 && (
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tubeNum === 1 ? '#2563EB' : '#F97316' }}
              />
              {tubeTitle}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Core {cores[0]?.coreNumber} &ndash; {cores[cores.length - 1]?.coreNumber}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {cores.map((std) => {
            const alloc = routeCores.find((c) => c.coreNumber === std.coreNumber);
            const isUsed =
              alloc?.status === 'USED' &&
              alloc.assignedNodeId &&
              alloc.assignedNodeId !== excludeNodeId;
            const isSelected = selectedCore === std.coreNumber;

            return (
              <button
                key={std.coreNumber}
                type="button"
                onClick={() => onSelectCore(std.coreNumber)}
                className={`p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${isSelected
                  ? 'border-brand-500 bg-brand-950/60 ring-2 ring-brand-500/50 shadow-md'
                  : isUsed
                    ? 'border-slate-800 bg-dark-900/60 opacity-70 hover:opacity-100 hover:border-slate-700'
                    : 'border-slate-700/80 bg-dark-900 hover:border-slate-600'
                  }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{
                        backgroundColor: std.colorHex,
                        border: std.borderHex
                          ? `1.5px solid ${std.borderHex}`
                          : '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      #{std.coreNumber}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  )}
                </div>

                <div className="mt-1 w-full truncate">
                  <div className="text-[11px] font-semibold text-slate-300 truncate">
                    {std.colorName}
                  </div>
                  <div className="text-[9px] font-mono truncate">
                    {isUsed ? (
                      <span className="text-amber-400 font-semibold truncate block" title={alloc?.assignedNodeName}>
                        • {alloc?.assignedNodeName || 'Terpakai'}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">• Tersedia</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="bg-dark-900/80 p-2.5 rounded-xl border border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-slate-300 font-semibold text-xs">
            Pilih Core Fiber ({maxCore} Core)
          </label>
          {selectedStd && (
            <span className="text-[10px] font-mono font-bold text-slate-200 bg-dark-850 px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1.5 shadow-sm">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: selectedStd.colorHex,
                  border: selectedStd.borderHex ? `1px solid ${selectedStd.borderHex}` : 'none',
                }}
              />
              Core {selectedStd.coreNumber} &bull; {selectedStd.colorName}
            </span>
          )}
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {renderTubeSection(`Tube 1 (Biru • Core 1–${Math.min(12, maxCore)})`, tube1Cores, 1)}
          {tube2Cores.length > 0 &&
            renderTubeSection(`Tube 2 (Oranye • Core 13–${maxCore})`, tube2Cores, 2)}
        </div>
      </div>
    );
  };


  return (
    <div className="relative w-full h-full bg-dark-900 overflow-hidden select-none overscroll-none">
      {/* Container Peta Leaflet */}
      <div ref={mapContainer} className="w-full h-full z-0" />

      {/* Top Header Controls (Sleek Executive GIS Toolbar) */}
      <div className="absolute top-2.5 sm:top-3 left-2 sm:left-4 right-2 sm:right-4 z-[1000] flex flex-row items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        {/* Left Action Buttons: Executive Monochromatic Toolbar */}
        <div className="flex items-center gap-0.5 sm:gap-1 pointer-events-auto bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-lg dark:shadow-2xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shrink-0 active:scale-95"
            title="Cari Aset Jaringan"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="hidden sm:inline font-medium">Cari Aset</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Asset buttons with subtle design */}
          <button
            onClick={() => {
              if (viewMode !== 'map') setViewMode('map');
              setActiveTool(activeTool === 'SERVER' ? 'NONE' : 'SERVER');
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95 ${activeTool === 'SERVER'
              ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-500/30'
              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            title="Tambah Node Server / OLT"
          >
            <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400 shrink-0" />
            <span>Server</span>
          </button>

          <button
            onClick={() => {
              if (viewMode !== 'map') setViewMode('map');
              setActiveTool(activeTool === 'ONT' ? 'NONE' : 'ONT');
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95 ${activeTool === 'ONT'
              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/30'
              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            title="Tambah Node Pelanggan ONT"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
            <span>ONT</span>
          </button>

          <button
            onClick={() => {
              if (viewMode !== 'map') setViewMode('map');
              if (activeTool === 'FIBER_LINE') {
                handleCancelFiberLine();
              } else {
                handleCancelFiberLine();
                setActiveTool('FIBER_LINE');
              }
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95 ${activeTool === 'FIBER_LINE'
              ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-500/30'
              : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
            title="Gambar Jalur Kabel Fiber Optik"
          >
            <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0" />
            <span>Fiber</span>
          </button>

          <button
            onClick={() => {
              if (viewMode !== 'map') setViewMode('map');
              if (activeTool === 'CUT_LINE') {
                setActiveTool('NONE');
              } else {
                handleCancelFiberLine();
                setSelectedRoute(null);
                setSelectedNode(null);
                setActiveTool('CUT_LINE');
                showToast('✂️ Mode Cut Line: Klik pada jalur kabel di peta');
              }
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 active:scale-95 ${activeTool === 'CUT_LINE'
              ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-500/30'
              : 'text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            title="Potong / Putus Kabel Fiber (Cut Line Tool)"
          >
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span>Cut Line</span>
          </button>
        </div>

        {/* Switcher Map | List | Settings (Clean Segmented Surface) */}
        <div className="flex items-center gap-0.5 pointer-events-auto bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl p-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-lg dark:shadow-2xl shrink-0">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${viewMode === 'map'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            title="Tampilan Peta"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Peta</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${viewMode === 'list'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            title="Tampilan Daftar / Tabel"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daftar</span>
          </button>

          <button
            onClick={() => setViewMode('settings')}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${viewMode === 'settings'
              ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            title="Pengaturan Layer & Tampilan Peta"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Layers</span>
          </button>
        </div>
      </div>

      {/* Mode Indicator Banner: Sisipkan Titik ke Jalur Kabel (Pojok Kanan Atas) */}
      {viewMode === 'map' && cableInsertMode && (
        <div className="absolute top-16 right-2 sm:right-4 z-[1200] bg-slate-900/95 dark:bg-dark-900/95 border border-sky-500/80 text-sky-100 text-xs px-3 py-2 rounded-xl shadow-2xl flex items-center justify-between gap-2.5 backdrop-blur-xl max-w-[280px] sm:max-w-xs animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
            <div className="truncate text-xs font-medium">
              Sisipkan <span className="font-bold text-white">{cableInsertMode.nodeType}</span>
            </div>
          </div>
          <button
            onClick={() => setCableInsertMode(null)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold shrink-0 transition-colors border border-slate-700"
          >
            Batal
          </button>
        </div>
      )}

      {/* Mode Indicator Banner: Penyesuaian Kontur & Node Rute (Pojok Kanan Atas) */}
      {viewMode === 'map' && adjustingRoute && (
        <div className="absolute top-16 right-2 sm:right-4 z-[1200] bg-slate-900/95 dark:bg-dark-900/95 border border-sky-500/70 text-slate-200 text-xs px-3 py-2 rounded-xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl max-w-[340px] animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-sky-300 text-xs truncate">
                Atur Node Belokan
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {adjustingCoords.length} Node &bull; {calculateLineDistance(adjustingCoords)} m
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveAdjustRoute}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-all active:scale-95 shadow-sm flex items-center gap-1"
              title="Simpan perubahan belokan & node"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              onClick={handleCancelAdjustRoute}
              className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs rounded-lg hover:bg-slate-800 transition-colors"
              title="Batal"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Mode Indicator / Fiber Drawing Toolbar: Sederhana & Pojok Kanan Atas */}
      {viewMode === 'map' && activeTool !== 'NONE' && (
        <div className="absolute top-16 right-2 sm:right-4 z-[1200] bg-white/95 dark:bg-dark-900/95 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs p-2.5 rounded-xl shadow-2xl backdrop-blur-xl max-w-[280px] sm:max-w-xs animate-fadeIn">
          {activeTool === 'FIBER_LINE' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {extendingRouteId
                      ? `Sambung: ${drawingCoords.length} titik`
                      : drawingCoords.length === 0
                        ? 'Pilih Titik Awal'
                        : `Tersambung: ${drawingCoords.length} titik`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelFiberLine}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 rounded transition-colors shrink-0"
                  title="Batal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleUndoPoint}
                  disabled={drawingCoords.length === 0}
                  title="Batalkan Titik (Ctrl+Z)"
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 rounded-lg font-semibold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1 text-[11px] active:scale-95 shadow-xs shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveFiberLine}
                  disabled={drawingCoords.length === 0}
                  className="flex-1 px-3 py-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-lg font-semibold border border-brand-500 shadow-xs transition-all active:scale-95 text-xs text-center"
                >
                  Selesai
                </button>

                <button
                  type="button"
                  onClick={handleCancelFiberLine}
                  className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 text-xs shrink-0"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : activeTool === 'CUT_LINE' ? (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div>
                  <div className="font-bold text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Mode Cut Line Fiber</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Klik pada jalur kabel di peta untuk memotong
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTool('NONE')}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                  Klik peta: <span className="text-emerald-600 dark:text-emerald-400">{activeTool}</span>
                </span>
              </div>
              <button
                onClick={() => setActiveTool('NONE')}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Dynamic Move Toast Notification - Pojok Kanan Atas */}
      {dynamicMoveToast && (
        <div className="absolute top-16 right-2 sm:right-4 z-[1500] bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fadeIn max-w-[280px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate">{dynamicMoveToast}</span>
        </div>
      )}

      {/* Floating Quick Action Widget (Your Location & Center Map) */}
      {viewMode === 'map' && (
        <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-5 z-[998] flex flex-col items-center gap-2 pointer-events-auto">
          {/* Tombol Lokasi Saya (GPS) */}
          <button
            type="button"
            onClick={handleGetMyLocation}
            disabled={isLocatingUser}
            title="Deteksi Lokasi GPS Saya Saat Ini"
            className={`w-10 h-10 rounded-xl bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border shadow-lg flex items-center justify-center transition-all ${isLocatingUser
              ? 'text-sky-600 dark:text-sky-400 border-sky-500 ring-2 ring-sky-500/50 animate-pulse'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 active:scale-95'
              }`}
          >
            <Navigation className={`w-4 h-4 ${isLocatingUser ? 'animate-spin text-sky-500' : 'text-sky-500'}`} />
          </button>

          {/* Tombol Pusatkan Peta (Center Map / Fit Network) */}
          <button
            type="button"
            onClick={handleCenterMap}
            title="Pusatkan Peta (Center Map & Jangkauan Seluruh Jaringan)"
            className="w-10 h-10 rounded-xl bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Crosshair className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      )}

      {/* SLIDE-OVER DRAWER DETAIL & INFORMASI LENGKAP DENGAN AKSI CRUD */}
      {viewMode === 'map' && selectedNode && activeTool !== 'CUT_LINE' && activeTool !== 'FIBER_LINE' && (
        <div className="absolute top-16 sm:top-20 right-2 sm:right-4 left-2 sm:left-auto w-auto sm:w-[420px] max-w-full sm:max-w-[420px] max-h-[calc(100vh-9rem)] sm:max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 z-[1001] animate-slideIn text-slate-800 dark:text-slate-100">
          {/* Header Drawer */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${selectedNode.status === 'OFFLINE'
                    ? 'bg-rose-500 animate-ping'
                    : 'bg-emerald-400'
                    }`}
                />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{selectedNode.name}</h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {selectedNode.lat.toFixed(4)}, {selectedNode.lng.toFixed(4)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEdit(selectedNode)}
                title="Edit Data (Update)"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteNode(selectedNode.id, selectedNode.name)}
                title="Hapus Node (Delete)"
                className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* INFORMASI SPESIFIK TIPE NODE */}

          {/* 1. INFORMASI LENGKAP SERVER / FASILITAS POP */}
          {selectedNode.type === 'SERVER' && (() => {
            const popFac = ensurePopFacility(selectedNode);
            const pwr = popFac.powerSystem;
            const isBlackout = pwr?.plnStatus === 'BLACKOUT';
            const backupHours = pwr ? Math.floor(pwr.backupEstimatedMinutes / 60) : 0;
            const backupMins = pwr ? pwr.backupEstimatedMinutes % 60 : 0;

            const oltDevice =
              popFac.devices.find((d) => d.category === 'OLT') ||
              olts.find((o) => o.id === selectedNode.oltId || (o.ip && o.ip === selectedNode.ip));

            return (
              <div className="space-y-3.5 text-xs">
                {/* POP SERVER HERO CARD */}
                <div className="bg-slate-100/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-dark-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-xs shrink-0">
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">
                          Sentral FTTH / POP Server
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm truncate" title={popFac.name}>
                          {popFac.name}
                        </div>
                        {popFac.address && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[210px]" title={popFac.address}>
                            {popFac.address}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif
                    </span>
                  </div>

                  {/* TELEMETRY STATS GRID */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <Layers className="w-3.5 h-3.5 text-brand-500" />
                        <span>Perangkat</span>
                      </span>
                      <div className="mt-1 text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                        {popFac.devices.length} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 font-sans">Terpasang</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Power Supply</span>
                      </span>
                      <div className={`mt-1 text-xs font-bold font-mono ${isBlackout ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isBlackout ? 'Genset/UPS' : 'PLN Normal'}
                      </div>
                    </div>
                  </div>

                  {/* TOMBOL BUKA MODAL DETAIL PERANGKAT */}
                  <button
                    type="button"
                    onClick={() => {
                      setActivePopModal(popFac);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm shadow-brand-500/25 transition-all active:scale-[0.98]"
                  >
                    <Server className="w-3.5 h-3.5 text-white/90" />
                    <span>Kelola Perangkat Server (OLT & Jaringan)</span>
                  </button>
                </div>

                {/* DEVICE OLT DETAIL & STATUS - HANYA TAMPIL JIKA SUDAH DIPASANG DI RAK */}
                {oltDevice ? (() => {
                  const devIp = (oltDevice as any).ipAddress || (oltDevice as any).ip || '-';
                  const devModel = oltDevice.model || (oltDevice as any).ponType || '-';
                  const devWebPort = (oltDevice as any).webPort || 80;
                  const devCliPort = (oltDevice as any).cliPort || 23;
                  const devPortsCount = (oltDevice as any).portsTotal || (oltDevice as any).ponPortsCount || 4;
                  return (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>OLT Utama di POP</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{oltDevice.vendor}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">IP Address OLT</span>
                          <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">{devIp}</div>
                        </div>
                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Model / Tipe</span>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{devModel}</div>
                        </div>
                      </div>

                      <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-[11px] shadow-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Port Akses:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-200">
                          Web GUI: <strong className="text-slate-900 dark:text-slate-100">{devWebPort}</strong> &bull; CLI: <strong className="text-slate-900 dark:text-slate-100">{devCliPort}</strong>
                        </span>
                      </div>

                      {/* Tombol Akses & Buka Web GUI OLT */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOltModal({
                              id: oltDevice.id,
                              name: oltDevice.name,
                              vendor: oltDevice.vendor,
                              model: oltDevice.model,
                              ip: devIp !== '-' ? devIp : '',
                              webPort: devWebPort,
                              cliPort: devCliPort,
                              ponType: (oltDevice as any).ponType || 'EPON',
                              ponPortsCount: devPortsCount,
                              totalOnu: (oltDevice as any).totalOnu || 0,
                              onlineOnu: (oltDevice as any).onlineOnu || 0,
                              offlineOnu: (oltDevice as any).offlineOnu || 0,
                              defaultUser: (oltDevice as any).defaultUser || 'admin',
                              defaultPass: (oltDevice as any).defaultPass || 'admin',
                            })
                          }
                          className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-500/20 transition-all active:scale-95"
                        >
                          <Server className="w-3.5 h-3.5" />
                          <span>Buka Akses OLT</span>
                        </button>
                        {devIp !== '-' && (
                          <a
                            href={`http://${devIp}:${devWebPort}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Buka Web GUI OLT di Tab Baru"
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/30 text-center space-y-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 mx-auto border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Belum Ada Perangkat OLT di Server Ini</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[230px] mx-auto leading-relaxed">
                        Kelola dan pasang perangkat jaringan melalui panel server.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePopModal(popFac);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-650 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                      <span>Tambah Perangkat ke Server</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 2. INFORMASI LENGKAP ODC */}
          {selectedNode.type === 'ODC' && (
            <div className="space-y-2.5 text-xs">
              {!selectedNode.parentRouteId && selectedNode.parentName && (
                <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Sumber Feeder Induk</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedNode.parentName}</div>
                </div>
              )}

              {selectedNode.assignedCoreNumber && (
                <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs ring-2 ring-slate-200 dark:ring-slate-800"
                      style={{
                        backgroundColor: selectedNode.assignedCoreHex || '#2563EB',
                        border: selectedNode.assignedCoreHex === '#F8FAFC' ? '1.5px solid #94A3B8' : selectedNode.assignedCoreHex === '#0F172A' ? '1.5px solid #64748B' : '1px solid rgba(255,255,255,0.3)',
                      }}
                    />
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        Alokasi Core Fiber
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                        <span>Core {selectedNode.assignedCoreNumber} &bull; {selectedNode.assignedCoreColor}</span>
                        {selectedNode.assignedTubeNumber && selectedNode.assignedTubeNumber > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            Tube {selectedNode.assignedTubeNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    TERKONEKSI
                  </span>
                </div>
              )}

              {/* Blok Multi-Rasio & Line Tujuan ODC */}
              <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                  Rasio Splitter & Line Tujuan
                </span>
                {selectedNode.splitterRatios && selectedNode.splitterRatios.length > 0 ? (
                  <div className="space-y-1">
                    {selectedNode.splitterRatios.map((rItem, rIdx) => {
                      const matchedRoute = routes.find(
                        (r) =>
                          r.id === rItem.targetRouteId ||
                          r.name.toLowerCase() === (rItem.direction || '').trim().toLowerCase()
                      );
                      const displayDir = formatTechnicianDirection(rItem.direction, rItem.targetRouteName);
                      return (
                        <div
                          key={rItem.id || rIdx}
                          className="flex items-center justify-between bg-slate-100/70 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-700/60"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">{rItem.ratio}</span>
                          </div>
                          <div className="flex items-center gap-2 max-w-[65%] truncate">
                            <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate" title={displayDir}>
                              {displayDir}
                            </span>
                            {matchedRoute && (
                              <button
                                type="button"
                                onClick={() => handleLocateRoute(matchedRoute)}
                                title={`Lihat line kabel '${matchedRoute.name}' di peta`}
                                className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/60 dark:hover:bg-blue-800/80 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-700/60 rounded text-[9px] font-semibold shrink-0 transition-colors"
                              >
                                Lihat Line
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedNode.splitterRatio || '1:4'}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Redaman Input</span>
                  <div className="font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{selectedNode.inputAttenuation || '-'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Redaman Output</span>
                  <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{selectedNode.outputAttenuation || selectedNode.avgAttenuation || '-'}</div>
                </div>
              </div>

              {/* Kapasitas Port Splitter */}
              {(() => {
                const cap = Number(selectedNode.capacity) || 16;
                const used = Math.min(cap, Number(selectedNode.used) || 0);
                const free = Math.max(0, cap - used);
                const percent = Math.min(100, Math.round((used / cap) * 100));
                return (
                  <div className="bg-slate-50 dark:bg-dark-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                        Kapasitas Port ({cap} Port)
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold text-xs">
                        {used} / {cap} Terpakai ({free} Bebas)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 3. INFORMASI LENGKAP ODP — Tampilan Minimalis & Tipografi Halus */}
          {selectedNode.type === 'ODP' && (() => {
            const cap = Number(selectedNode.capacity) || 16;
            const used = Math.min(cap, Number(selectedNode.used) || 0);
            const free = Math.max(0, cap - used);
            const percent = Math.min(100, Math.round((used / cap) * 100));

            // Cari ONT pelanggan yang terhubung ke ODP ini
            const odpClients = nodes.filter(
              (n) =>
                n.type === 'ONT' &&
                (n.parentName === selectedNode.name ||
                  (n as any).parentNodeId === selectedNode.id ||
                  (selectedNode.name && (n.address || '').toLowerCase().includes(selectedNode.name.toLowerCase())))
            );

            // Indikator kualitas redaman OPM & bagian angka terpisah
            const inParts = getTechnicianDbmParts(selectedNode.inputAttenuation);
            const outParts = getTechnicianDbmParts(selectedNode.outputAttenuation || selectedNode.avgAttenuation);
            const inQuality = getAttenuationQuality(selectedNode.inputAttenuation, true);
            const outQuality = getAttenuationQuality(selectedNode.outputAttenuation || selectedNode.avgAttenuation, false);

            return (
              <div className="space-y-3 text-xs">
                {/* 1. AKSI CEPAT (Navigasi Google Maps & Salin Laporan WA) */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedNode.lat},${selectedNode.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-center transition-colors active:scale-[0.98]"
                  >
                    Rute Google Maps
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyTechnicianOdpData(selectedNode)}
                    className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-center transition-colors active:scale-[0.98]"
                  >
                    {isCopiedOdp ? 'Tersalin!' : 'Salin Data (WA)'}
                  </button>
                </div>

                {/* 2. KABEL SUMBER MASUK */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                      Kabel Sumber Masuk
                    </span>
                    {selectedNode.parentName && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Asal: <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedNode.parentName}</span>
                      </span>
                    )}
                  </div>

                  {/* Detail kabel & core masuk */}
                  {selectedNode.spliceMaps && selectedNode.spliceMaps.length > 0 ? (
                    <div className="space-y-1.5 pt-0.5">
                      {selectedNode.spliceMaps.map((sm, i) => {
                        const linkedRoute = sm.targetRouteId
                          ? routes.find((r) => r.id === sm.targetRouteId)
                          : undefined;
                        const displayName = sm.targetRouteName || sm.label || `Jalur ${i + 1}`;
                        return (
                          <div key={sm.id || i} className="flex items-center justify-between gap-2 py-1">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{displayName}</span>
                                {linkedRoute && (
                                  <button
                                    type="button"
                                    onClick={() => handleLocateRoute(linkedRoute)}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                  >
                                    Lihat di Peta
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Core Masuk:</span>
                                {sm.inputCoreNumber ? (
                                  renderTechnicianCoreBadge(sm.inputCoreNumber)
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Belum diatur</span>
                                )}
                                {sm.outputCoreNumber && sm.outputCoreNumber !== sm.inputCoreNumber && (
                                  <>
                                    <span className="text-slate-400 text-[11px]">ke</span>
                                    {renderTechnicianCoreBadge(sm.outputCoreNumber)}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : selectedNode.assignedCoreNumber ? (
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Core Masuk:</span>
                        {renderTechnicianCoreBadge(selectedNode.assignedCoreNumber)}
                        {selectedNode.assignedTubeNumber && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            (Tube {selectedNode.assignedTubeNumber})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Tersambung</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pt-0.5">
                      Belum ada data kabel masuk yang dicatat.
                    </div>
                  )}
                </div>

                {/* RANTAI JALUR FIBER (ODP - JB - ODP) */}
                {selectedNode.parentRouteId && (() => {
                  const pRoute = routes.find((r) => r.id === selectedNode.parentRouteId);
                  if (!pRoute) return null;
                  const attached = getRouteAttachedNodes(pRoute, nodes);
                  const isReversed = isRouteInvertedFromRoot(pRoute, nodes);
                  let nodeKm = selectedNode.routeKmMarker;
                  if (nodeKm === undefined) {
                    const snap = snapPointToRoute([selectedNode.lat, selectedNode.lng], pRoute.coords, isReversed);
                    nodeKm = snap ? snap.distanceKm : 0;
                  }
                  const upstream = attached.filter((a) => a.kmMarker < nodeKm && a.node.id !== selectedNode.id).slice(-1)[0];
                  const downstream = attached.filter((a) => a.kmMarker > nodeKm && a.node.id !== selectedNode.id)[0];
                  const deltaUp = upstream ? Math.round((nodeKm - upstream.kmMarker) * 1000) : null;
                  const deltaDown = downstream ? Math.round((downstream.kmMarker - nodeKm) * 1000) : null;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          Rantai Jalur Fiber
                        </span>
                        <span className="text-[10px] font-mono text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800/50">
                          KM {nodeKm.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Titik Hulu (Sebelumnya):</span>
                          {upstream ? (
                            <>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                                <span className="truncate">{upstream.node.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">KM {upstream.kmMarker.toFixed(2)}</span>
                              </div>
                              <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono font-medium">{formatDistanceKmOrM(deltaUp)}</div>
                            </>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">Server / POP (Titik Nol)</div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">KM 0.00 (Pusat Jaringan)</div>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Titik Hilir (Berikutnya):</span>
                          {downstream ? (
                            <>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                                <span className="truncate">{downstream.node.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">KM {downstream.kmMarker.toFixed(2)}</span>
                              </div>
                              <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono font-medium">{formatDistanceKmOrM(deltaDown)}</div>
                            </>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-500 dark:text-slate-400 truncate">Ujung Bentangan Kabel</div>
                              <div className="text-[10px] text-slate-400 italic">Tidak ada titik lanjutan</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. PEMBAGIAN SPLITTER RASIO */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-3">
                  <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                    Pembagian Splitter Rasio
                  </div>

                  {selectedNode.splitterRatios && selectedNode.splitterRatios.length > 0 ? (
                    <div className="space-y-3">
                      {selectedNode.splitterRatios.map((rItem, rIdx) => {
                        const [dropPct, passPct] = rItem.ratio.includes(':')
                          ? rItem.ratio.split(':').map((s) => s.trim())
                          : ['—', '—'];

                        const rawDirA = (rItem as any).directionDrop || (rItem as any).dropDirection || '__pelanggan__';
                        const rawDirB = rItem.direction || '';

                        const friendlyDirA = formatTechnicianDirection(rawDirA, rItem.targetRouteName);
                        const isCascadeB = rawDirB === '__next_splitter__';
                        const friendlyDirB = isCascadeB
                          ? `Sambung ke Rasio #${rIdx + 2}`
                          : formatTechnicianDirection(rawDirB, rItem.targetRouteName);

                        const matchedRouteA = routes.find(
                          (r) =>
                            r.id === rItem.targetRouteId ||
                            r.name.toLowerCase() === rawDirA.replace(/^Line Fiber:\s*/i, '').trim().toLowerCase()
                        );
                        const matchedRouteB = routes.find(
                          (r) =>
                            r.id === rItem.targetRouteId ||
                            r.name.toLowerCase() === rawDirB.replace(/^Line Fiber:\s*/i, '').trim().toLowerCase()
                        );

                        const isChainedFromPrev =
                          rIdx > 0 &&
                          selectedNode.splitterRatios &&
                          selectedNode.splitterRatios[rIdx - 1]?.direction === '__next_splitter__';

                        return (
                          <div
                            key={rItem.id || rIdx}
                            className="space-y-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0 last:pb-0"
                          >
                            {/* Baris Header Rasio */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                  Rasio #{rIdx + 1}
                                </span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                  {rItem.ratio}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  ({dropPct}% / {passPct}%)
                                </span>
                              </div>

                              {/* Core Masuk */}
                              {(rItem as any).coreInput ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Core Masuk:</span>
                                  {renderTechnicianCoreBadge((rItem as any).coreInput)}
                                </div>
                              ) : isChainedFromPrev ? (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Dari Rasio #{rIdx}
                                </span>
                              ) : null}
                            </div>

                            {/* Rasio A (Cabang / Ke Pelanggan) */}
                            <div className="space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-800 dark:text-slate-200 font-medium">
                                  Rasio {dropPct}% · Ke Pelanggan
                                </span>
                                {(rItem as any).coreA && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Core:</span>
                                    {renderTechnicianCoreBadge((rItem as any).coreA)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                  {friendlyDirA}
                                </span>
                                {matchedRouteA && (
                                  <button
                                    type="button"
                                    onClick={() => handleLocateRoute(matchedRouteA)}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                  >
                                    Lihat di Peta
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Rasio B (Lanjut / Terusan) */}
                            <div className="space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-800 dark:text-slate-200 font-medium">
                                  Rasio {passPct}% · {isCascadeB ? `Sambung ke Rasio #${rIdx + 2}` : 'Jalur Lanjut'}
                                </span>
                                {(rItem as any).coreB && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Core:</span>
                                    {renderTechnicianCoreBadge((rItem as any).coreB)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-600 dark:text-slate-300">
                                  {friendlyDirB}
                                </span>
                                {matchedRouteB && (
                                  <button
                                    type="button"
                                    onClick={() => handleLocateRoute(matchedRouteB)}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                  >
                                    Lihat di Peta
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {selectedNode.splitterRatio || (selectedNode.capacity ? `${selectedNode.capacity} Port Pelanggan` : 'Tanpa Splitter')}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Pembagian rata ke seluruh port pelanggan
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. REDAMAN MASUK & REDAMAN KELUAR */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Redaman Masuk
                      </span>
                      {inQuality && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {inQuality.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                        {inParts.num}
                      </span>
                      {inParts.unit && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {inParts.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Sinyal kabel utama</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Redaman Keluar
                      </span>
                      {outQuality && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {outQuality.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                        {outParts.num}
                      </span>
                      {outParts.unit && (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {outParts.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Sinyal port pelanggan</div>
                  </div>
                </div>

                {/* 5. KAPASITAS PORT & DAFTAR PELANGGAN */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Kapasitas Port
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                      <strong className="text-slate-900 dark:text-white font-bold">{used}</strong> / {cap} Terpakai{' '}
                      <span className="text-slate-500 dark:text-slate-400 font-sans">({free} bebas)</span>
                    </div>
                  </div>

                  {/* Progress Bar Dinamis Minimalis Netral */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-600 dark:bg-slate-300 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Daftar Pelanggan Aktif yang Tersambung */}
                  {odpClients.length > 0 ? (
                    <div className="border-t border-slate-200 dark:border-slate-800/60 pt-2 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setShowOdpClients(!showOdpClients)}
                        className="w-full flex items-center justify-between text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                      >
                        <span>Daftar Pelanggan ({odpClients.length} Terpasang)</span>
                        <span>{showOdpClients ? '▲ Tutup' : '▼ Lihat'}</span>
                      </button>

                      {showOdpClients && (
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin pt-1">
                          {odpClients.map((client) => (
                            <div
                              key={client.id}
                              className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-800/40 last:border-b-0 text-[11px]"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${client.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-500'
                                      }`}
                                  />
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{client.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate pl-3">
                                  {client.pppoeUser || client.customerNo || '-'}
                                  {client.packagePlan ? ` • ${client.packagePlan}` : ''}
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-2">
                                {client.rxPower && (
                                  <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 block">
                                    {client.rxPower} dBm
                                  </span>
                                )}
                                {client.phone && (
                                  <a
                                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:underline block"
                                  >
                                    WA
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pt-0.5">
                      Belum ada pelanggan terpasang di ODP ini.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 4. INFORMASI LENGKAP JOINT CLOSURE (JC) — Tampilan Minimalis & Standarisasi ODP */}
          {(selectedNode.type === 'CLOSURE' || selectedNode.type === 'JOINT_CLOSURE') && (() => {
            const hasRatios = Boolean(
              (selectedNode.splitterRatios && selectedNode.splitterRatios.length > 0) ||
              (selectedNode.splitterRatio && selectedNode.splitterRatio !== 'Tanpa Rasio' && selectedNode.splitterRatio.includes(':'))
            );
            const inParts = getTechnicianDbmParts(selectedNode.inputAttenuation);
            const outParts = getTechnicianDbmParts(selectedNode.outputAttenuation || selectedNode.avgAttenuation);
            const inQuality = getAttenuationQuality(selectedNode.inputAttenuation, true);
            const outQuality = getAttenuationQuality(selectedNode.outputAttenuation || selectedNode.avgAttenuation, false);

            const cap = Number(selectedNode.capacity) || 2;
            const used = Math.min(
              cap,
              Number(selectedNode.used) ||
              (selectedNode.spliceMaps && selectedNode.spliceMaps.length > 0
                ? selectedNode.spliceMaps.length
                : hasRatios && selectedNode.splitterRatios
                  ? selectedNode.splitterRatios.length * 2
                  : selectedNode.assignedCoreNumber
                    ? 1
                    : 0)
            );
            const free = Math.max(0, cap - used);
            const percent = Math.min(100, Math.round((used / cap) * 100));

            return (
              <div className="space-y-3 text-xs">
                {/* 1. AKSI CEPAT (Navigasi Google Maps & Salin Laporan WA) */}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedNode.lat},${selectedNode.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-center transition-colors active:scale-[0.98]"
                  >
                    Rute Google Maps
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyTechnicianClosureData(selectedNode)}
                    className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-center transition-colors active:scale-[0.98]"
                  >
                    {isCopiedClosure ? 'Tersalin!' : 'Salin Data (WA)'}
                  </button>
                </div>

                {/* 2. KABEL SUMBER MASUK */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                      Kabel Sumber Masuk
                    </span>
                    {(selectedNode.parentName || selectedNode.parentRouteName) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Asal: <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedNode.parentName || selectedNode.parentRouteName}</span>
                      </span>
                    )}
                  </div>

                  {selectedNode.assignedCoreNumber ? (
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Core Masuk:</span>
                        {renderTechnicianCoreBadge(selectedNode.assignedCoreNumber)}
                        {selectedNode.assignedTubeNumber && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            (Tube {selectedNode.assignedTubeNumber})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Tersambung</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic pt-0.5">
                      Belum ada data kabel masuk yang dicatat.
                    </div>
                  )}
                </div>

                {/* RANTAI JALUR FIBER (ODP - JB - ODP) */}
                {selectedNode.parentRouteId && (() => {
                  const pRoute = routes.find((r) => r.id === selectedNode.parentRouteId);
                  if (!pRoute) return null;
                  const attached = getRouteAttachedNodes(pRoute, nodes);
                  const isReversed = isRouteInvertedFromRoot(pRoute, nodes);
                  let nodeKm = selectedNode.routeKmMarker;
                  if (nodeKm === undefined) {
                    const snap = snapPointToRoute([selectedNode.lat, selectedNode.lng], pRoute.coords, isReversed);
                    nodeKm = snap ? snap.distanceKm : 0;
                  }
                  const upstream = attached.filter((a) => a.kmMarker < nodeKm && a.node.id !== selectedNode.id).slice(-1)[0];
                  const downstream = attached.filter((a) => a.kmMarker > nodeKm && a.node.id !== selectedNode.id)[0];
                  const deltaUp = upstream ? Math.round((nodeKm - upstream.kmMarker) * 1000) : null;
                  const deltaDown = downstream ? Math.round((downstream.kmMarker - nodeKm) * 1000) : null;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          Rantai Jalur Fiber
                        </span>
                        <span className="text-[10px] font-mono text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800/50">
                          KM {nodeKm.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Titik Hulu (Sebelumnya):</span>
                          {upstream ? (
                            <>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                                <span className="truncate">{upstream.node.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">KM {upstream.kmMarker.toFixed(2)}</span>
                              </div>
                              <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono font-medium">{formatDistanceKmOrM(deltaUp)}</div>
                            </>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">Server / POP (Titik Nol)</div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">KM 0.00 (Pusat Jaringan)</div>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-100/70 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 space-y-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Titik Hilir (Berikutnya):</span>
                          {downstream ? (
                            <>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center justify-between">
                                <span className="truncate">{downstream.node.name}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">KM {downstream.kmMarker.toFixed(2)}</span>
                              </div>
                              <div className="text-[10px] text-sky-700 dark:text-sky-300 font-mono font-medium">{formatDistanceKmOrM(deltaDown)}</div>
                            </>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-500 dark:text-slate-400 truncate">Ujung Bentangan Kabel</div>
                              <div className="text-[10px] text-slate-400 italic">Tidak ada titik lanjutan</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. JIKA JC MEMBAGI REDAMAN (FBT SPLITTER RATIO) */}
                {hasRatios && (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-3">
                      <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                        Pembagian Splitter Rasio
                      </div>

                      {selectedNode.splitterRatios && selectedNode.splitterRatios.length > 0 ? (
                        <div className="space-y-3">
                          {selectedNode.splitterRatios.map((rItem, rIdx) => {
                            const [dropPct, passPct] = rItem.ratio.includes(':')
                              ? rItem.ratio.split(':').map((s) => s.trim())
                              : ['50', '50'];

                            const rawDirA = (rItem as any).directionDrop || (rItem as any).dropDirection || 'Jalur Cabang';
                            const rawDirB = rItem.direction || 'Jalur Lanjut';

                            const friendlyDirA = formatTechnicianDirection(rawDirA, rItem.targetRouteName);
                            const isCascadeB = rawDirB === '__next_splitter__';
                            const friendlyDirB = isCascadeB
                              ? `Sambung ke Rasio #${rIdx + 2}`
                              : formatTechnicianDirection(rawDirB, rItem.targetRouteName);

                            const matchedRouteA = routes.find(
                              (r) =>
                                r.id === (rItem as any).targetRouteIdA ||
                                r.id === rItem.targetRouteId ||
                                r.name.toLowerCase() === rawDirA.replace(/^Line Fiber:\s*/i, '').trim().toLowerCase()
                            );
                            const matchedRouteB = routes.find(
                              (r) =>
                                r.id === rItem.targetRouteId ||
                                r.name.toLowerCase() === rawDirB.replace(/^Line Fiber:\s*/i, '').trim().toLowerCase()
                            );

                            return (
                              <div
                                key={rItem.id || rIdx}
                                className="space-y-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0 last:pb-0"
                              >
                                {/* Header Rasio */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-600 dark:text-slate-300 text-xs font-semibold">
                                      Rasio #{rIdx + 1}
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                      {rItem.ratio}
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                      ({dropPct}% / {passPct}%)
                                    </span>
                                  </div>

                                  {(rItem as any).coreInput && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Core Masuk:</span>
                                      {renderTechnicianCoreBadge((rItem as any).coreInput)}
                                    </div>
                                  )}
                                </div>

                                {/* Rasio A (Cabang) */}
                                <div className="space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                                      Rasio {dropPct}% · Jalur Cabang
                                    </span>
                                    {(rItem as any).coreA && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Core:</span>
                                        {renderTechnicianCoreBadge((rItem as any).coreA)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                      {friendlyDirA}
                                    </span>
                                    {matchedRouteA && (
                                      <button
                                        type="button"
                                        onClick={() => handleLocateRoute(matchedRouteA)}
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                      >
                                        Lihat di Peta
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Rasio B (Lanjut) */}
                                <div className="space-y-0.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                                      Rasio {passPct}% · {isCascadeB ? `Sambung ke Rasio #${rIdx + 2}` : 'Jalur Lanjut'}
                                    </span>
                                    {(rItem as any).coreB && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">Core:</span>
                                        {renderTechnicianCoreBadge((rItem as any).coreB)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                      {friendlyDirB}
                                    </span>
                                    {matchedRouteB && (
                                      <button
                                        type="button"
                                        onClick={() => handleLocateRoute(matchedRouteB)}
                                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                      >
                                        Lihat di Peta
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {selectedNode.splitterRatio}
                        </div>
                      )}
                    </div>

                    {/* REDAMAN MASUK & REDAMAN KELUAR */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Redaman Masuk
                          </span>
                          {inQuality && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {inQuality.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                            {inParts.num}
                          </span>
                          {inParts.unit && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {inParts.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Sinyal sebelum splitter</div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Redaman Keluar
                          </span>
                          {outQuality && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {outQuality.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 my-1">
                          <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                            {outParts.num}
                          </span>
                          {outParts.unit && (
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {outParts.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">Sinyal setelah splitter</div>
                      </div>
                    </div>
                  </>
                )}

                {/* 4. JALUR SAMBUNGAN LANGSUNG (SPLICING 1:1) */}
                {(!hasRatios || (selectedNode.spliceMaps && selectedNode.spliceMaps.length > 0)) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2.5">
                    <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                      Jalur Sambungan Core
                    </div>

                    {selectedNode.spliceMaps && selectedNode.spliceMaps.length > 0 ? (
                      <div className="space-y-2">
                        {selectedNode.spliceMaps.map((sm, i) => {
                          const linkedRoute = sm.targetRouteId
                            ? routes.find((r) => r.id === sm.targetRouteId)
                            : undefined;
                          const routeName = sm.targetRouteName || sm.label || `Jalur ${i + 1}`;
                          return (
                            <div key={sm.id || i} className="space-y-1.5 pb-2 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0 last:pb-0">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">
                                  Sambungan #{i + 1}
                                </span>
                                {linkedRoute && (
                                  <button
                                    type="button"
                                    onClick={() => handleLocateRoute(linkedRoute)}
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] underline underline-offset-2 shrink-0 transition-colors"
                                  >
                                    Lihat di Peta
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400">Masuk:</span>
                                  {sm.inputCoreNumber ? (
                                    renderTechnicianCoreBadge(sm.inputCoreNumber)
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                                <span className="text-slate-400 font-mono">➔</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{routeName}:</span>
                                  {sm.outputCoreNumber ? (
                                    renderTechnicianCoreBadge(sm.outputCoreNumber)
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedNode.outputCoreNumber ? (
                      <div className="flex items-center justify-between pl-2 border-l border-slate-200 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Core Masuk:</span>
                          {renderTechnicianCoreBadge(selectedNode.assignedCoreNumber || 1)}
                        </div>
                        <span className="text-slate-400 font-mono">➔</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 dark:text-slate-400">Core Keluar:</span>
                          {renderTechnicianCoreBadge(selectedNode.outputCoreNumber)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sambungan direct splice lurus (1:1 per core).
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ESTIMASI LOSS SPLICING (Hanya jika sambungan lurus murni) */}
                {!hasRatios && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
                        Redaman Sambung (Loss)
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                          {selectedNode.avgAttenuation || '0.02'}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">dB</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">
                      Kualitas Sambungan Bagus
                    </span>
                  </div>
                )}

                {/* 6. KAPASITAS SAMBUNGAN */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800/70 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Kapasitas Sambungan
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                      <strong className="text-slate-900 dark:text-white font-bold">{used}</strong> / {cap} Core{' '}
                      <span className="text-slate-500 dark:text-slate-400 font-sans">({free} bebas)</span>
                    </div>
                  </div>

                  {/* Progress Bar Dinamis Minimalis Netral */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-600 dark:bg-slate-300 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* 7. INFORMASI TEKNIS FISIK */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/70">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Model Fisik</span>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {selectedNode.model || 'Inline / Horizontal'}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/70">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Lokasi Titik</span>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                      {selectedNode.poleLocation || 'Tiang Udara'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 5. INFORMASI LENGKAP ONT PELANGGAN */}
          {selectedNode.type === 'ONT' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">ID / No. Pelanggan</span>
                  <div className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{selectedNode.customerNo || '-'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">No. WhatsApp / HP</span>
                  <div className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-1">{selectedNode.phone || '-'}</div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Alamat Domisili</span>
                <div className="text-slate-700 dark:text-slate-300">{selectedNode.address || '-'}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">RX Power Optik</span>
                  <div className="text-base font-extrabold font-mono mt-0.5 text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    {selectedNode.rxPower ? `${selectedNode.rxPower} dBm` : '-'}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Paket Internet</span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{selectedNode.packagePlan || '-'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">IP WAN PPPoE</span>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 truncate">{selectedNode.wanIp || '-'}</div>
                </div>
                <div className="bg-slate-50 dark:bg-dark-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Model Modem</span>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 truncate">{selectedNode.model || '-'}</div>
                </div>
              </div>

              {/* Aksi Remote TR-069 */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Aksi Remote Cepat TR-069
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setActiveAction('reboot')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 hover:text-amber-600 dark:text-slate-200 dark:hover:text-amber-400 border border-slate-200 hover:border-amber-300 dark:border-slate-700 dark:hover:border-amber-700/60 rounded-xl text-xs font-semibold transition-colors"
                    title="Reboot Modem TR-069"
                  >
                    <Power className="w-3.5 h-3.5 text-amber-500" />
                    <span>Reboot</span>
                  </button>

                  <button
                    onClick={() => setActiveAction('wifi')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    title="Ubah Nama & Password Wi-Fi"
                  >
                    <Wifi className="w-3.5 h-3.5 text-sky-500" />
                    <span>Wi-Fi</span>
                  </button>

                  <button
                    onClick={() => setActiveAction('refresh')}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors"
                    title="Refresh Inform TR-069"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SLIDE-OVER DRAWER DETAIL JALUR FIBER */}
      {viewMode === 'map' && selectedRoute && !cableInsertMode && !adjustingRoute && activeTool !== 'CUT_LINE' && activeTool !== 'FIBER_LINE' && (
        <div className="absolute top-16 sm:top-20 right-2 sm:right-4 left-2 sm:left-auto w-auto sm:w-[440px] max-h-[calc(100vh-9.5rem)] sm:max-h-[calc(100vh-5.5rem)] flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl z-[1001] animate-slideIn overflow-hidden text-slate-800 dark:text-slate-100">
          {/* Header Drawer (Sticky / Non-scrolling Opaque Solid) */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-start justify-between bg-slate-50 dark:bg-dark-900 relative z-20 shrink-0 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                  style={{
                    backgroundColor:
                      selectedRoute.color ||
                      (selectedRoute.status === 'CUT'
                        ? '#EF4444'
                        : selectedRoute.status === 'DEGRADED'
                          ? '#F59E0B'
                          : '#3B82F6'),
                  }}
                />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedRoute.name}</h3>
                {selectedRoute.status === 'CUT' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    PUTUS
                  </span>
                )}
                {selectedRoute.status === 'DEGRADED' && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    HIGH LOSS
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {selectedRoute.lengthMeter} m ({(selectedRoute.lengthMeter / 1000).toFixed(2)} km) &bull; {selectedRoute.coreCount || 1} Core &bull; {selectedRoute.cableType}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleOpenEditRoute(selectedRoute)}
                title="Edit Data Rute Kabel"
                className="text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteRoute(selectedRoute.id, selectedRoute.name)}
                title="Hapus Rute Kabel"
                className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedRoute(null)}
                title="Tutup"
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
            {/* Status Kabel Terputus Alert Banner */}
            {selectedRoute.status === 'CUT' && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 space-y-2 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Kabel Mengalami Insiden Putus</div>
                    <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 mt-0.5 font-mono">
                      {selectedRoute.cutKm !== undefined ? `Titik Putus: KM ${selectedRoute.cutKm.toFixed(3)}` : 'Jalur dalam status PUTUS'}
                      {selectedRoute.cutCoord && ` (${selectedRoute.cutCoord[0].toFixed(5)}, ${selectedRoute.cutCoord[1].toFixed(5)})`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestoreRoute(selectedRoute)}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Pulihkan & Sambung Kembali Kabel</span>
                </button>
              </div>
            )}

            {/* Tombol Aksi Rute: Atur Node Belokan & Sambung Line & Cut Line */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleStartAdjustRoute(selectedRoute)}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-dark-900 dark:hover:bg-slate-800 text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white border border-sky-200 dark:border-sky-800/60 hover:border-sky-400 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                title="Atur Node & Belokan Kabel (Tambah, Geser, atau Hapus Node)"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">Node & Belokan</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartExtendRoute(selectedRoute)}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/80 text-sky-700 dark:text-sky-200 hover:text-sky-900 dark:hover:text-white border border-sky-300 dark:border-sky-600/70 hover:border-sky-400 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                title="Sambung dan Perpanjang Bentangan Kabel"
              >
                <PlusCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300 shrink-0" />
                <span className="truncate">Sambung</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetName = selectedRoute.name;
                  setSelectedRoute(null);
                  setActiveTool('CUT_LINE');
                  showToast(`✂️ Klik pada jalur '${targetName}' di peta untuk memotong atau menandai titik putus`);
                }}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-white border border-rose-300 dark:border-rose-800/70 hover:border-rose-400 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                title="Potong Kabel Menjadi 2 Segmen atau Tandai Insiden Putus"
              >
                <Scissors className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate">Cut Line</span>
              </button>
            </div>

            {/* Kartu Catatan / Notes Jalur Kabel (Info Fleksibel Teknisi) */}
            <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Catatan Jalur (Notes)</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenEditRoute(selectedRoute)}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  <span>{selectedRoute.notes ? 'Edit Note' : '+ Tambah Note'}</span>
                </button>
              </div>
              {selectedRoute.notes ? (
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/50 whitespace-pre-wrap leading-relaxed font-sans">
                  {selectedRoute.notes}
                </p>
              ) : (
                <div
                  onClick={() => handleOpenEditRoute(selectedRoute)}
                  className="text-xs text-slate-400 dark:text-slate-500 italic bg-white/60 dark:bg-slate-800/40 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700/60 cursor-pointer hover:border-brand-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Belum ada catatan jalur. Klik untuk menambah info lapangan...</span>
                </div>
              )}
            </div>

            {/* Aset & Sambungan Kabel (ODC / ODP) */}
            <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Aset di Jalur ({getRouteAttachedNodes(selectedRoute, nodes).length})
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {(selectedRoute.lengthMeter / 1000).toFixed(2)} km
                </span>
              </div>

              {/* Quick action buttons to insert ODP, ODC, JC, or Server */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const r = selectedRoute;
                    setSelectedRoute(null);
                    setCableInsertMode({
                      routeId: r.id,
                      routeName: r.name,
                      nodeType: 'ODP',
                    });
                    setDynamicMoveToast(`📍 Klik titik di garis kabel '${r.name}' untuk meletakkan ODP`);
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                  }}
                  className="py-1.5 px-1.5 bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/70 dark:hover:bg-sky-900/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>ODP</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedRoute;
                    setSelectedRoute(null);
                    setCableInsertMode({
                      routeId: r.id,
                      routeName: r.name,
                      nodeType: 'CLOSURE',
                    });
                    setDynamicMoveToast(`📍 Klik titik di garis kabel '${r.name}' untuk meletakkan Joint Closure (JC)`);
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                  }}
                  className="py-1.5 px-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>JC</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedRoute;
                    setSelectedRoute(null);
                    setCableInsertMode({
                      routeId: r.id,
                      routeName: r.name,
                      nodeType: 'ODC',
                    });
                    setDynamicMoveToast(`📍 Klik titik di garis kabel '${r.name}' untuk meletakkan ODC`);
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                  }}
                  className="py-1.5 px-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>ODC</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedRoute;
                    setSelectedRoute(null);
                    setCableInsertMode({
                      routeId: r.id,
                      routeName: r.name,
                      nodeType: 'SERVER',
                    });
                    setDynamicMoveToast(`📍 Klik titik di garis kabel '${r.name}' untuk menyisipkan Server`);
                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                  }}
                  className="py-1.5 px-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Server</span>
                </button>
              </div>

              {/* List of nodes along the cable */}
              {(() => {
                const attachedNodes = getRouteAttachedNodes(selectedRoute, nodes);
                if (attachedNodes.length === 0) {
                  return (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-dark-800/80 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                      <p className="text-[11px] text-slate-400">
                        Belum ada perangkat yang disisipkan ke kabel ini.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {attachedNodes.map(({ node, kmMarker }) => (
                      <div
                        key={node.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono shrink-0 ${node.type === 'ODC'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                              : node.type === 'ODP'
                                ? 'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-700'
                                : node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE'
                                  ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700'
                                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700'
                              }`}
                          >
                            {node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE' ? 'JC' : node.type}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 dark:text-slate-200 truncate">{node.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              KM {kmMarker.toFixed(2)} &bull; {node.used || 0}/{node.capacity || (node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE' ? 2 : 16)} {node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE' ? 'Core' : 'Port'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleFlyTo(node)}
                            title="Pusatkan di Peta"
                            className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(node)}
                            title="Edit Node"
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Manajemen Core Kabel Fiber */}
            {(() => {
              const maxCores = Math.max(1, Math.min(24, selectedRoute.coreCount || 24));
              const routeCores = selectedRoute.cores || generateDefaultCores(maxCores);
              const usedCount = routeCores.filter((c) => c.status === 'USED').length;

              const tube1List = routeCores.filter((c) => c.tubeNumber === 1);
              const tube2List = routeCores.filter((c) => c.tubeNumber === 2);
              const isCompactGrid = maxCores > 2;

              return (
                <div className="bg-slate-50 dark:bg-dark-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  {/* Header Ringkas */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Core Fiber ({maxCores} Core)
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncRouteCores(selectedRoute)}
                        className="px-2 py-0.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/70 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white border border-sky-300 dark:border-sky-700/60 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                        title="Sinkronkan alokasi core kabel dengan aset di jalur"
                      >
                        <RefreshCw className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                        <span>Auto-Sync</span>
                      </button>
                      <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                        {usedCount}/{maxCores} Terpakai
                      </span>
                    </div>
                  </div>

                  {/* Tube 1 */}
                  <div className="space-y-1.5">
                    {maxCores > 12 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-0.5">
                        <span>Tube 1 (Biru &bull; Core 1–12)</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {tube1List.filter((c) => c.status === 'USED').length}/{tube1List.length} Terpakai
                        </span>
                      </div>
                    )}

                    <div className={`grid ${isCompactGrid ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2`}>
                      {tube1List.map((c) => {
                        const isUsed = c.status === 'USED';
                        const displayName = c.assignedNodeName || 'Aset Terpasang';
                        const nodeType = c.assignedNodeType || (c.coreNumber === 1 ? 'BACKBONE' : 'ODP');
                        const attachedNode = nodes.find(
                          (n) => n.id === c.assignedNodeId || (n.parentRouteId === selectedRoute.id && n.assignedCoreNumber === c.coreNumber)
                        );

                        return (
                          <div
                            key={`tube1-${c.coreNumber}`}
                            className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${isUsed
                              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 shadow-xs'
                              : 'bg-white dark:bg-dark-800/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-300 dark:ring-white/20"
                                style={{
                                  backgroundColor: c.colorHex,
                                  border: c.colorHex === '#F8FAFC' ? '1.5px solid #94A3B8' : c.colorHex === '#0F172A' ? '1.5px solid #64748B' : '1px solid rgba(148, 163, 184, 0.4)',
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">Core {c.coreNumber}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">({c.colorName})</span>
                                  {isUsed && (
                                    <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/90 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/70 shrink-0">
                                      {nodeType}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] truncate mt-0.5">
                                  {isUsed ? (
                                    <span className="text-sky-700 dark:text-sky-300 font-semibold truncate block" title={displayName}>
                                      {displayName}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tersedia</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              {isUsed ? (
                                <>
                                  {attachedNode && (
                                    <button
                                      type="button"
                                      onClick={() => handleFlyTo(attachedNode)}
                                      title={`Lihat ${displayName} di Peta`}
                                      className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleReleaseCore(selectedRoute.id, c.coreNumber)}
                                    title={`Kosongkan Core ${c.coreNumber}`}
                                    className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const r = selectedRoute;
                                    setSelectedRoute(null);
                                    setCableInsertMode({
                                      routeId: r.id,
                                      routeName: r.name,
                                      nodeType: 'ODP',
                                    });
                                    setFormAssignedCore(c.coreNumber);
                                    setDynamicMoveToast(`📍 Core ${c.coreNumber} (${c.colorName}) dipilih! Klik garis kabel '${r.name}' di peta.`);
                                    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                                    toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                                  }}
                                  title={`Sisipkan ODP ke Core ${c.coreNumber}`}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-600/20 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-600/50 hover:border-sky-400 transition-all flex items-center gap-1 shadow-xs"
                                >
                                  <Plus className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                  <span>ODP</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tube 2 (Core 13-24 jika kabel > 12 core) */}
                  {tube2List.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-0.5">
                        <span>Tube 2 (Oranye &bull; Core 13–{maxCores})</span>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {tube2List.filter((c) => c.status === 'USED').length}/{tube2List.length} Terpakai
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {tube2List.map((c) => {
                          const isUsed = c.status === 'USED';
                          const displayName = c.assignedNodeName || 'Aset Terpasang';
                          const nodeType = c.assignedNodeType || 'ODP';
                          const attachedNode = nodes.find(
                            (n) => n.id === c.assignedNodeId || (n.parentRouteId === selectedRoute.id && n.assignedCoreNumber === c.coreNumber)
                          );

                          return (
                            <div
                              key={`tube2-${c.coreNumber}`}
                              className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all ${isUsed
                                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 shadow-xs'
                                : 'bg-white dark:bg-dark-800/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0 shadow-xs ring-1 ring-slate-300 dark:ring-white/20"
                                  style={{
                                    backgroundColor: c.colorHex,
                                    border: c.colorHex === '#F8FAFC' ? '1.5px solid #94A3B8' : c.colorHex === '#0F172A' ? '1.5px solid #64748B' : '1px solid rgba(148, 163, 184, 0.4)',
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">Core {c.coreNumber}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">({c.colorName})</span>
                                    {isUsed && (
                                      <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-purple-100 dark:bg-purple-950/90 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/70 shrink-0">
                                        {nodeType}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] truncate mt-0.5">
                                    {isUsed ? (
                                      <span className="text-sky-700 dark:text-sky-300 font-semibold truncate block" title={displayName}>
                                        {displayName}
                                      </span>
                                    ) : (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tersedia</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1">
                                {isUsed ? (
                                  <>
                                    {attachedNode && (
                                      <button
                                        type="button"
                                        onClick={() => handleFlyTo(attachedNode)}
                                        title={`Lihat ${displayName} di Peta`}
                                        className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleReleaseCore(selectedRoute.id, c.coreNumber)}
                                      title={`Kosongkan Core ${c.coreNumber}`}
                                      className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const r = selectedRoute;
                                      setSelectedRoute(null);
                                      setCableInsertMode({
                                        routeId: r.id,
                                        routeName: r.name,
                                        nodeType: 'ODP',
                                      });
                                      setFormAssignedCore(c.coreNumber);
                                      setDynamicMoveToast(`📍 Core ${c.coreNumber} (${c.colorName} - Tube 2) dipilih! Klik garis kabel '${r.name}' di peta.`);
                                      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                                      toastTimeoutRef.current = setTimeout(() => setDynamicMoveToast(null), 3500);
                                    }}
                                    title={`Sisipkan ODP ke Core ${c.coreNumber}`}
                                    className="px-2 py-1 text-[10px] font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-600/20 dark:hover:bg-sky-600/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-600/50 hover:border-sky-400 transition-all flex items-center gap-1 shadow-xs"
                                  >
                                    <Plus className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                                    <span>ODP</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== LIST VIEW OVERLAY ===================== */}
      {viewMode === 'list' && (
        <div className="absolute inset-0 z-[990] bg-dark-900/98 backdrop-blur-md pt-16 sm:pt-20 px-3 sm:px-6 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
            {/* Header List */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <List className="w-4 h-4 sm:w-5 sm:h-5 text-brand-400 shrink-0" />
                  <span className="truncate">Infrastruktur & Jaringan GIS</span>
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate hidden sm:block">
                  Kelola inventaris Server OLT, ODC, ODP, ONT Pelanggan, dan Jalur Kabel Fiber.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setViewMode('map')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all active:scale-95"
                  title="Kembali ke Tampilan Peta"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Peta GIS</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors shrink-0 active:scale-95"
                  title="Tutup Daftar & Kembali ke Peta"
                  aria-label="Tutup Daftar GIS"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setListFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'ALL'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  Semua ({nodes.length + routes.length})
                </button>
                <button
                  onClick={() => setListFilterType('SERVER')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'SERVER'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  Server OLT ({nodes.filter((n) => n.type === 'SERVER').length})
                </button>
                <button
                  onClick={() => setListFilterType('ODC')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'ODC'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  ODC ({nodes.filter((n) => n.type === 'ODC').length})
                </button>
                <button
                  onClick={() => setListFilterType('ODP')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'ODP'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  ODP ({nodes.filter((n) => n.type === 'ODP').length})
                </button>
                <button
                  onClick={() => setListFilterType('CLOSURE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'CLOSURE'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  Joint Closure ({nodes.filter((n) => n.type === 'CLOSURE' || n.type === 'JOINT_CLOSURE').length})
                </button>
                <button
                  onClick={() => setListFilterType('ONT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'ONT'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  ONT Pelanggan ({nodes.filter((n) => n.type === 'ONT').length})
                </button>
                <button
                  onClick={() => setListFilterType('ROUTE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${listFilterType === 'ROUTE'
                    ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                    : 'bg-dark-800 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                >
                  Jalur Fiber ({routes.length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-auto md:min-w-[280px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, IP, SN, pelanggan..."
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full bg-dark-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 sm:py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                {listSearch && (
                  <button
                    onClick={() => setListSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Helper calculation for selection & formatting */}
            {(() => {
              const isAllNodesSelected = filteredNodes.length > 0 && filteredNodes.every((n) => selectedTableNodeIds.includes(n.id));
              const isSomeNodesSelected = filteredNodes.some((n) => selectedTableNodeIds.includes(n.id)) && !isAllNodesSelected;

              const toggleSelectAllNodes = () => {
                if (isAllNodesSelected) {
                  const filteredIds = new Set(filteredNodes.map((n) => n.id));
                  setSelectedTableNodeIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                } else {
                  const filteredIds = filteredNodes.map((n) => n.id);
                  setSelectedTableNodeIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                }
              };

              const toggleSelectNode = (id: string) => {
                setSelectedTableNodeIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                );
              };

              const isAllRoutesSelected = filteredRoutes.length > 0 && filteredRoutes.every((r) => selectedTableRouteIds.includes(r.id));
              const isSomeRoutesSelected = filteredRoutes.some((r) => selectedTableRouteIds.includes(r.id)) && !isAllRoutesSelected;

              const toggleSelectAllRoutes = () => {
                if (isAllRoutesSelected) {
                  const filteredIds = new Set(filteredRoutes.map((r) => r.id));
                  setSelectedTableRouteIds((prev) => prev.filter((id) => !filteredIds.has(id)));
                } else {
                  const filteredIds = filteredRoutes.map((r) => r.id);
                  setSelectedTableRouteIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                }
              };

              const toggleSelectRoute = (id: string) => {
                setSelectedTableRouteIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                );
              };

              const formatPole = (pole?: string) => {
                if (!pole) return null;
                const cleaned = pole.replace(/\(.*?\)/g, '').trim();
                if (!cleaned) return null;
                return cleaned.startsWith('Tiang') ? cleaned : `Tiang: ${cleaned}`;
              };

              return (
                <>
                  {/* Nodes Table & Mobile Cards */}
                  {listFilterType !== 'ROUTE' && (
                    <div className="space-y-3">
                      {/* Bulk Action Bar for Nodes */}
                      {selectedTableNodeIds.length > 0 && (
                        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-lg">
                          <div className="flex items-center gap-2 text-xs font-semibold text-rose-200 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                            <span className="truncate">{selectedTableNodeIds.length} titik dipilih</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedTableNodeIds([])}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={handleBulkDeleteNodes}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus ({selectedTableNodeIds.length}) Titik Terpilih</span>
                              <span className="sm:hidden">Hapus ({selectedTableNodeIds.length})</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mobile Select All Bar */}
                      <div className="md:hidden flex items-center justify-between px-1 text-xs text-slate-400">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isAllNodesSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeNodesSelected;
                            }}
                            onChange={toggleSelectAllNodes}
                            className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-600 focus:ring-0 cursor-pointer accent-brand-500"
                          />
                          <span>Pilih Semua Titik ({filteredNodes.length})</span>
                        </label>
                      </div>

                      {/* Mobile Cards for Nodes */}
                      <div className="md:hidden space-y-2.5">
                        {filteredNodes.length === 0 ? (
                          <div className="bg-dark-800/80 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                            Tidak ada data node yang cocok dengan pencarian / filter.
                          </div>
                        ) : (
                          filteredNodes.map((node) => {
                            const isOnt = node.type === 'ONT';
                            const isServer = node.type === 'SERVER';
                            const isOdc = node.type === 'ODC';
                            const isOdp = node.type === 'ODP';
                            const isClosure = node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE';
                            const isSelected = selectedTableNodeIds.includes(node.id);
                            const poleText = formatPole(node.poleLocation);

                            return (
                              <div
                                key={node.id}
                                className={`bg-dark-800/90 border rounded-2xl p-3 space-y-2.5 shadow-sm transition-all ${isSelected
                                  ? 'border-brand-500 bg-brand-500/10'
                                  : 'border-slate-800 hover:border-slate-700'
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-2 border-b border-slate-700/60 pb-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      aria-label={`Pilih ${node.name}`}
                                      checked={isSelected}
                                      onChange={() => toggleSelectNode(node.id)}
                                      className="w-4 h-4 rounded border-slate-700 bg-dark-900 text-brand-600 focus:ring-0 cursor-pointer accent-brand-500 shrink-0"
                                    />
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${isServer
                                        ? 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                                        : isOdc
                                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                          : isOdp
                                            ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                                            : isClosure
                                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                              : 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                                        }`}
                                    >
                                      {isServer ? 'SERVER' : isClosure ? 'JC' : node.type}
                                    </span>
                                    <span className="font-semibold text-slate-100 text-xs sm:text-sm truncate">{node.name}</span>
                                  </div>

                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-dark-950 text-slate-200 border border-slate-700 shrink-0">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${node.status === 'ONLINE'
                                        ? 'bg-emerald-500'
                                        : node.status === 'OFFLINE'
                                          ? 'bg-rose-500'
                                          : 'bg-slate-400'
                                        }`}
                                    ></span>
                                    {node.status || 'NORMAL'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-dark-900/60 border border-slate-800/60 rounded-xl p-2">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Induk / Feeder</div>
                                    <div className="text-slate-200 font-medium truncate mt-0.5">
                                      {node.parentName || node.parentRouteName || '-'}
                                    </div>
                                  </div>

                                  <div className="bg-dark-900/60 border border-slate-800/60 rounded-xl p-2">
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Kapasitas / Port</div>
                                    <div className="text-slate-200 font-medium truncate mt-0.5">
                                      {isServer && (
                                        <span className="font-mono">
                                          {node.used || 0}/{node.capacity || 0} ONU
                                        </span>
                                      )}
                                      {(isOdc || isOdp) && (
                                        <span className="font-mono">
                                          {node.used || 0} / {node.capacity || 16} P
                                        </span>
                                      )}
                                      {isClosure && (
                                        <span className="font-mono">
                                          {node.used || 0} / {node.capacity || 2} C
                                        </span>
                                      )}
                                      {isOnt && (
                                        <span className="truncate">{node.packagePlan || '-'}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {(node.customerNo || poleText || (isServer && node.ip) || (isOnt && (node.rxPower || node.serial)) || node.splitterRatio) && (
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 bg-dark-900/40 rounded-xl px-2.5 py-1.5 border border-slate-800/40">
                                    {isServer && node.ip && (
                                      <span className="font-mono text-slate-300">IP: {node.ip}</span>
                                    )}
                                    {node.customerNo && (
                                      <span className="font-mono text-slate-300">ID: {node.customerNo}</span>
                                    )}
                                    {isOnt && node.rxPower && (
                                      <span className="font-mono text-slate-300 flex items-center gap-1">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${parseFloat(node.rxPower || '-20') < -25
                                            ? 'bg-rose-500'
                                            : parseFloat(node.rxPower || '-20') < -23
                                              ? 'bg-amber-500'
                                              : 'bg-emerald-500'
                                            }`}
                                        ></span>
                                        Rx: {node.rxPower} dBm
                                      </span>
                                    )}
                                    {isOnt && node.serial && (
                                      <span className="font-mono text-slate-400">SN: {node.serial}</span>
                                    )}
                                    {poleText && (
                                      <span>📍 {poleText}</span>
                                    )}
                                  </div>
                                )}

                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => handleLocateNode(node)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-all active:scale-95"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Lihat di Peta</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(node)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNode(node.id, node.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/40 transition-all active:scale-95"
                                    title="Hapus Node"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block bg-white dark:bg-dark-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto scrollbar-thin">
                          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[760px]">
                            <thead className="bg-slate-50 dark:bg-dark-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="w-10 py-3 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    aria-label="Pilih Semua Titik"
                                    checked={isAllNodesSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = isSomeNodesSelected;
                                    }}
                                    onChange={toggleSelectAllNodes}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-brand-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-brand-500"
                                  />
                                </th>
                                <th className="py-3 px-4">Nama Perangkat / Node</th>
                                <th className="py-3 px-4">Induk / Feeder</th>
                                <th className="py-3 px-4">Kapasitas / Port</th>
                                <th className="py-3 px-4">Info Teknis</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {filteredNodes.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-8 text-slate-500">
                                    Tidak ada data node yang cocok dengan pencarian / filter.
                                  </td>
                                </tr>
                              ) : (
                                filteredNodes.map((node) => {
                                  const isOnt = node.type === 'ONT';
                                  const isServer = node.type === 'SERVER';
                                  const isOdc = node.type === 'ODC';
                                  const isOdp = node.type === 'ODP';
                                  const isClosure = node.type === 'CLOSURE' || node.type === 'JOINT_CLOSURE';
                                  const isSelected = selectedTableNodeIds.includes(node.id);
                                  const poleText = formatPole(node.poleLocation);

                                  return (
                                    <tr
                                      key={node.id}
                                      className={`transition-colors ${isSelected ? 'bg-brand-500/10 hover:bg-brand-500/15' : 'hover:bg-slate-800/40'}`}
                                    >
                                      <td className="w-10 py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Pilih ${node.name}`}
                                          checked={isSelected}
                                          onChange={() => toggleSelectNode(node.id)}
                                          className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-brand-500"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${isServer
                                              ? 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                                              : isOdc
                                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                                : isOdp
                                                  ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                                                  : isClosure
                                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                                    : 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                                              }`}
                                          >
                                            {isServer ? 'SERVER' : isClosure ? 'JC' : node.type}
                                          </span>
                                          <span className="font-semibold text-slate-100">{node.name}</span>
                                        </div>
                                        {(node.customerNo || poleText || (isServer && node.ip)) && (
                                          <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                            {isServer && node.ip && (
                                              <span className="font-mono text-slate-300">IP: {node.ip}</span>
                                            )}
                                            {node.customerNo && (
                                              <span className="font-mono text-slate-300">ID: {node.customerNo}</span>
                                            )}
                                            {poleText && (
                                              <span>📍 {poleText}</span>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-slate-400">
                                        {node.parentName || node.parentRouteName || '-'}
                                      </td>
                                      <td className="py-3 px-4">
                                        {isServer && (
                                          <span className="font-mono text-slate-200 font-semibold">
                                            {node.used || 0}/{node.capacity || 0} ONU
                                            {node.ponPortsCount ? ` • ${node.ponPortsCount} PON` : ''}
                                          </span>
                                        )}
                                        {(isOdc || isOdp) && (
                                          <div>
                                            <div className="font-mono text-slate-200 font-semibold">
                                              {node.used || 0} / {node.capacity || 16} Port
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                              <div
                                                className="h-full bg-slate-300 dark:bg-slate-200 rounded-full"
                                                style={{
                                                  width: `${Math.min(
                                                    100,
                                                    Math.round(((node.used || 0) / (node.capacity || 16)) * 100)
                                                  )}%`,
                                                }}
                                              ></div>
                                            </div>
                                            {node.splitterRatio && (
                                              <div className="text-[10px] text-slate-400 mt-0.5">
                                                {node.splitterRatio}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {isClosure && (
                                          <div>
                                            <div className="font-mono text-slate-200 font-semibold">
                                              {node.used || 0} / {node.capacity || 2} Core
                                            </div>
                                            <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                                              <div
                                                className="h-full bg-slate-300 dark:bg-slate-200 rounded-full"
                                                style={{
                                                  width: `${Math.min(
                                                    100,
                                                    Math.round(((node.used || 0) / (node.capacity || 2)) * 100)
                                                  )}%`,
                                                }}
                                              ></div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                              {node.model || 'Inline'}
                                            </div>
                                          </div>
                                        )}
                                        {isOnt && (
                                          <span className="text-slate-300">{node.packagePlan || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-[11px]">
                                        {isServer && (
                                          <span className="text-slate-300">{node.ip || '-'}</span>
                                        )}
                                        {isOnt && (
                                          <div>
                                            <div className="font-bold text-slate-200 font-mono flex items-center gap-1.5">
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${parseFloat(node.rxPower || '-20') < -25
                                                  ? 'bg-rose-500'
                                                  : parseFloat(node.rxPower || '-20') < -23
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                                  }`}
                                              ></span>
                                              Rx: {node.rxPower || '-'} dBm
                                            </div>
                                            {node.serial && (
                                              <div className="text-[10px] text-slate-500">
                                                SN: {node.serial}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {(isOdc || isOdp) && (
                                          <span className="text-slate-300 font-mono">
                                            {node.avgAttenuation ? `${node.avgAttenuation} dBm` : '-'}
                                          </span>
                                        )}
                                        {isClosure && (
                                          <div>
                                            <div className="text-slate-200 text-xs">
                                              {node.assignedCoreNumber ? `Core #${node.assignedCoreNumber}` : 'Direct Splice'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                              Loss: {node.avgAttenuation || '0.02 dB'}
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${node.status === 'ONLINE'
                                              ? 'bg-emerald-500'
                                              : node.status === 'OFFLINE'
                                                ? 'bg-rose-500'
                                                : 'bg-slate-400'
                                              }`}
                                          ></span>
                                          {node.status || 'NORMAL'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => handleLocateNode(node)}
                                            title="Lihat di Peta"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all"
                                          >
                                            <MapPin className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenEdit(node)}
                                            title="Edit Data"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteNode(node.id, node.name)}
                                            title="Hapus Node"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800/40 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Routes Table & Mobile Cards */}
                  {(listFilterType === 'ALL' || listFilterType === 'ROUTE') && (
                    <div className="space-y-3 mt-6">
                      {/* Bulk Action Bar for Routes */}
                      {selectedTableRouteIds.length > 0 && (
                        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shadow-lg">
                          <div className="flex items-center gap-2 text-xs font-semibold text-rose-200 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                            <span className="truncate">{selectedTableRouteIds.length} jalur dipilih</span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <button
                              onClick={() => setSelectedTableRouteIds([])}
                              className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              onClick={handleBulkDeleteRoutes}
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus ({selectedTableRouteIds.length}) Rute Terpilih</span>
                              <span className="sm:hidden">Hapus ({selectedTableRouteIds.length})</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-white dark:bg-dark-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-dark-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Cable className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                              Jalur Kabel Fiber Optik ({filteredRoutes.length})
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setViewMode('map');
                              setActiveTool('FIBER_LINE');
                              setDrawingCoords([]);
                            }}
                            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white force-white shadow-sm transition-all shrink-0 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tarik Kabel Baru di Peta</span>
                            <span className="sm:hidden">Tarik Kabel</span>
                          </button>
                        </div>

                        {/* Mobile Select All Bar for Routes */}
                        <div className="md:hidden flex items-center justify-between px-3 pt-2 text-xs text-slate-400">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAllRoutesSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isSomeRoutesSelected;
                              }}
                              onChange={toggleSelectAllRoutes}
                              className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-600 focus:ring-0 cursor-pointer accent-brand-500"
                            />
                            <span>Pilih Semua Rute ({filteredRoutes.length})</span>
                          </label>
                        </div>

                        {/* Mobile Cards for Routes */}
                        <div className="md:hidden space-y-2.5 p-3">
                          {filteredRoutes.length === 0 ? (
                            <div className="text-center py-6 text-xs text-slate-400">
                              Tidak ada rute kabel fiber ditemukan.
                            </div>
                          ) : (
                            filteredRoutes.map((route) => {
                              const isSelected = selectedTableRouteIds.includes(route.id);
                              return (
                                <div
                                  key={route.id}
                                  className={`bg-dark-900/80 border rounded-2xl p-3 space-y-2.5 shadow-sm transition-all ${isSelected
                                    ? 'border-brand-500 bg-brand-500/10'
                                    : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <input
                                        type="checkbox"
                                        aria-label={`Pilih ${route.name}`}
                                        checked={isSelected}
                                        onChange={() => toggleSelectRoute(route.id)}
                                        className="w-4 h-4 rounded border-slate-700 bg-dark-900 text-brand-600 focus:ring-0 cursor-pointer accent-brand-500 shrink-0"
                                      />
                                      <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{
                                          backgroundColor:
                                            route.color ||
                                            (route.status === 'CUT'
                                              ? '#EF4444'
                                              : route.status === 'DEGRADED'
                                                ? '#F59E0B'
                                                : '#3B82F6'),
                                        }}
                                      ></span>
                                      <span className="font-semibold text-slate-100 text-xs sm:text-sm truncate">{route.name}</span>
                                    </div>

                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-dark-950 text-slate-200 border border-slate-700 shrink-0">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${route.status === 'CUT'
                                          ? 'bg-rose-500'
                                          : route.status === 'DEGRADED'
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                          }`}
                                      ></span>
                                      {route.status === 'CUT'
                                        ? 'PUTUS'
                                        : route.status === 'DEGRADED'
                                          ? 'HIGH LOSS'
                                          : 'NORMAL'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-dark-950/60 border border-slate-800/60 rounded-xl p-2">
                                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Tipe Kabel</div>
                                      <div className="text-slate-200 font-medium truncate mt-0.5">
                                        {route.cableType.toLowerCase().includes('core')
                                          ? route.cableType
                                          : `${route.cableType} (${route.coreCount}C)`}
                                      </div>
                                    </div>
                                    <div className="bg-dark-950/60 border border-slate-800/60 rounded-xl p-2">
                                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Panjang / Loss</div>
                                      <div className="text-slate-200 font-mono font-semibold truncate mt-0.5">
                                        {route.lengthMeter >= 1000
                                          ? `${(route.lengthMeter / 1000).toFixed(2)} km`
                                          : `${Math.round(route.lengthMeter)} m`}
                                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                                          • {route.attenuation || '0.35dB'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-[11px] font-mono text-slate-400 bg-dark-950/40 rounded-xl px-2.5 py-1 border border-slate-800/40 truncate">
                                    {route.sourceNode || '-'} &rarr; {route.targetNode || '-'}
                                  </div>

                                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => handleLocateRoute(route)}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 transition-all active:scale-95"
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                      <span>Peta</span>
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditRoute(route)}
                                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRoute(route.id, route.name)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/40 transition-all active:scale-95"
                                      title="Hapus Jalur"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto scrollbar-thin">
                          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[760px]">
                            <thead className="bg-slate-50 dark:bg-dark-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                              <tr>
                                <th className="w-10 py-3 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    aria-label="Pilih Semua Jalur"
                                    checked={isAllRoutesSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = isSomeRoutesSelected;
                                    }}
                                    onChange={toggleSelectAllRoutes}
                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-brand-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-brand-500"
                                  />
                                </th>
                                <th className="py-3 px-4">Nama Rute</th>
                                <th className="py-3 px-4">Tipe Kabel</th>
                                <th className="py-3 px-4">Asal &rarr; Tujuan</th>
                                <th className="py-3 px-4">Panjang</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Redaman</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {filteredRoutes.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="text-center py-6 text-slate-500">
                                    Tidak ada rute kabel fiber ditemukan.
                                  </td>
                                </tr>
                              ) : (
                                filteredRoutes.map((route) => {
                                  const isSelected = selectedTableRouteIds.includes(route.id);
                                  return (
                                    <tr
                                      key={route.id}
                                      className={`transition-colors ${isSelected ? 'bg-brand-500/10 hover:bg-brand-500/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                                    >
                                      <td className="w-10 py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          aria-label={`Pilih ${route.name}`}
                                          checked={isSelected}
                                          onChange={() => toggleSelectRoute(route.id)}
                                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-brand-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-brand-500"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{
                                              backgroundColor:
                                                route.color ||
                                                (route.status === 'CUT'
                                                  ? '#EF4444'
                                                  : route.status === 'DEGRADED'
                                                    ? '#F59E0B'
                                                    : '#3B82F6'),
                                            }}
                                          ></span>
                                          <span className="font-semibold text-slate-800 dark:text-slate-200">{route.name}</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="text-slate-700 dark:text-slate-200 font-medium">
                                          {route.cableType.toLowerCase().includes('core')
                                            ? route.cableType
                                            : `${route.cableType} (${route.coreCount} Core)`}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                        {route.sourceNode || '-'} &rarr; {route.targetNode || '-'}
                                      </td>
                                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                                        {route.lengthMeter >= 1000
                                          ? `${(route.lengthMeter / 1000).toFixed(2)} km`
                                          : `${Math.round(route.lengthMeter)} m`}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${route.status === 'CUT'
                                              ? 'bg-rose-500'
                                              : route.status === 'DEGRADED'
                                                ? 'bg-amber-500'
                                                : 'bg-emerald-500'
                                              }`}
                                          ></span>
                                          {route.status === 'CUT'
                                            ? 'PUTUS'
                                            : route.status === 'DEGRADED'
                                              ? 'HIGH LOSS'
                                              : 'NORMAL'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                                        {route.attenuation || '0.35 dB/km'}
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => handleLocateRoute(route)}
                                            title="Lihat Rute di Peta"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all"
                                          >
                                            <MapPin className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenEditRoute(route)}
                                            title="Edit Data Rute"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRoute(route.id, route.name)}
                                            title="Hapus Jalur"
                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800/40 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== SETTINGS VIEW OVERLAY ===================== */}
      {viewMode === 'settings' && (
        <div className="absolute inset-0 z-[990] bg-dark-900/98 backdrop-blur-md pt-16 sm:pt-20 px-3 sm:px-6 pb-20 md:pb-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
            {/* Header Settings */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-brand-400 shrink-0" />
                  <span>Pengaturan Peta & GIS Mapping</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  Atur jenis peta dasar (tile layer), lapisan tampilan, nilai default form perangkat, dan pusat peta.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {settingsSavedToast && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 text-xs font-semibold shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Pengaturan Berhasil Disimpan!</span>
                  </div>
                )}
                <button
                  onClick={() => setViewMode('map')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md shadow-brand-500/20 transition-all active:scale-95"
                  title="Kembali ke Tampilan Peta"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Peta GIS</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors shrink-0 active:scale-95"
                  title="Tutup Pengaturan GIS"
                  aria-label="Tutup Pengaturan GIS"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Card 1: Peta Dasar (Tile Layer) */}
              <div className="bg-dark-800/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-bold text-white">Jenis Peta Dasar (Base Layer)</h2>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    {
                      id: 'google-hybrid',
                      name: 'Google Maps Hybrid (Satelit + Jalan)',
                      desc: 'Citra satelit resolusi tinggi asli Google dengan nama jalan dan POI.',
                    },
                    {
                      id: 'google-roadmap',
                      name: 'Google Maps Roadmap',
                      desc: 'Tampilan peta jalan standar Google dengan kontras bersih.',
                    },
                    {
                      id: 'osm',
                      name: 'OpenStreetMap (OSM)',
                      desc: 'Peta jalan open-source global standar komunitas.',
                    },
                    {
                      id: 'carto-dark',
                      name: 'Carto Dark Mode',
                      desc: 'Peta gelap minimalis untuk menonjolkan kabel dan titik fiber.',
                    },
                  ].map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => applyTileLayer(layer.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${mapTileLayer === layer.id
                        ? 'bg-slate-800 border-slate-600 text-white ring-1 ring-slate-600'
                        : 'bg-dark-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200">{layer.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{layer.desc}</div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${mapTileLayer === layer.id
                          ? 'border-slate-400 bg-slate-200 text-slate-900'
                          : 'border-slate-600'
                          }`}
                      >
                        {mapTileLayer === layer.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 2: Lapisan Tampilan (Layer Visibility) */}
              <div className="bg-dark-800/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Eye className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-bold text-white">Visibilitas & Lapisan GIS</h2>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-dark-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Tampilkan Garis Jalur Kabel Fiber
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Render polyline kabel drop core dan feeder di atas peta.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showRoutes}
                      onChange={(e) => setShowRoutes(e.target.checked)}
                      className="w-4 h-4 rounded accent-slate-400 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-dark-900/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        Tampilkan Tooltip & Label Nama Node
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Munculkan nama dan status saat kursor diarahkan ke marker.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showLabels}
                      onChange={(e) => setShowLabels(e.target.checked)}
                      className="w-4 h-4 rounded accent-slate-400 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Default Form Port Capacity */}
                <div className="border-t border-slate-800 pt-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kapasitas Port Default ODC / ODP Baru (Maks 32)
                  </label>
                  <select
                    value={settingsDefaultCapacity}
                    onChange={(e) => setSettingsDefaultCapacity(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500 font-mono"
                  >
                    <option value="2">2 Port (Splitter 1:2 / Coupler)</option>
                    <option value="4">4 Port (Splitter 1:4)</option>
                    <option value="8">8 Port (Splitter 1:8)</option>
                    <option value="16">16 Port (Splitter 1:16)</option>
                    <option value="24">24 Port</option>
                    <option value="32">32 Port (Splitter 1:32)</option>
                  </select>
                </div>
              </div>

              {/* Card 3: Pusat Peta (Center Point Navigation) */}
              <div className="bg-dark-800/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Navigasi Titik Pusat Peta</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert('Browser Anda tidak mendukung Geolocation GPS.');
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = parseFloat(pos.coords.latitude.toFixed(6));
                          const lng = parseFloat(pos.coords.longitude.toFixed(6));
                          setMapCenter([lat, lng]);
                          persistCenter([lat, lng]);
                          setSettingsSavedToast(true);
                          setTimeout(() => setSettingsSavedToast(false), 3000);
                        },
                        () => alert('Gagal mendeteksi GPS. Pastikan izin lokasi aktif.')
                      );
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-700/60 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <Navigation className="w-3 h-3 text-sky-400" />
                    <span>Gunakan GPS Saya</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Center Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={mapCenter[0]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setMapCenter([val, mapCenter[1]]);
                      }}
                      className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2 font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Center Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={mapCenter[1]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setMapCenter([mapCenter[0], val]);
                      }}
                      className="w-full bg-dark-900 border border-slate-700 rounded-xl p-2 font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      persistCenter(mapCenter);
                      setSettingsSavedToast(true);
                      setTimeout(() => setSettingsSavedToast(false), 3000);
                    }}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-400" />
                    <span>Simpan Pusat Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCenterMap();
                    }}
                    className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Pusatkan Peta Sekarang</span>
                  </button>
                </div>
              </div>

              {/* Card 4: Statistik Inventaris GIS */}
              <div className="bg-dark-800/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-bold text-white">Ringkasan Inventaris Jaringan</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-center">
                  <div className="bg-dark-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {nodes.filter((n) => n.type === 'SERVER').length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">OLT Server</div>
                  </div>
                  <div className="bg-dark-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {nodes.filter((n) => n.type === 'ODC').length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">ODC</div>
                  </div>
                  <div className="bg-dark-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {nodes.filter((n) => n.type === 'ODP').length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">ODP</div>
                  </div>
                  <div className="bg-dark-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {nodes.filter((n) => n.type === 'ONT').length}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">ONT Pelanggan</div>
                  </div>
                  <div className="bg-dark-900/60 p-2.5 rounded-xl border border-slate-800 col-span-2">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {routes.reduce((acc, r) => acc + r.lengthMeter, 0)} meter
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Total {routes.length} Jalur Kabel
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simpan Pengaturan Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSettingsSavedToast(true);
                  setTimeout(() => setSettingsSavedToast(false), 3000);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-900 hover:bg-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan GIS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA NODE (UPDATE) */}
      {editingNode && (
        <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] flex flex-col bg-dark-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden mt-auto sm:my-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Edit Data {editingNode.type === 'CLOSURE' || editingNode.type === 'JOINT_CLOSURE' ? 'Joint Closure (JC)' : editingNode.type}
                </h3>
              </div>
              <button onClick={() => { setEditingNode(null); setDynamicLocationCalc(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs flex-1 overflow-y-auto pr-1 scrollbar-thin">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {editingNode.type === 'ONT' ? 'Nama Pelanggan *' : editingNode.type === 'SERVER' ? 'Nama POP / Server *' : (editingNode.type === 'CLOSURE' || editingNode.type === 'JOINT_CLOSURE') ? 'Nama Joint Closure *' : 'Nama Perangkat *'}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              {(editingNode.type === 'ODC' || editingNode.type === 'ODP') &&
                renderSplitterAndAttenuationForm()}

              {(editingNode.type === 'CLOSURE' || editingNode.type === 'JOINT_CLOSURE') &&
                renderClosureForm()}

              {editingNode.type === 'ONT' && (
                <>
                  <MikrotikPppoeSelector
                    selectedUsername={formPppoeUser}
                    onSelect={handleSelectPppoeSession}
                    onClear={() => setFormPppoeUser('')}
                    installedUsernames={installedOntUsernames}
                  />

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nomor WhatsApp / HP</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Model Modem</label>
                      <select
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono text-xs"
                      >
                        {modemProfiles.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={`${p.manufacturer} ${p.model}`}>
                            {p.manufacturer} {p.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Serial Number (SN)</label>
                      <input
                        type="text"
                        value={formSerial}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSerial(val);
                          const rec = recognizeModem(val);
                          if (rec.profile) {
                            setFormModel(`${rec.profile.manufacturer} ${rec.profile.model}`);
                          }
                        }}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-500 font-mono text-center pt-1">
                Koordinat: {editingNode.lat.toFixed(5)}, {editingNode.lng.toFixed(5)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => { setEditingNode(null); setDynamicLocationCalc(null); }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveUpdateNode}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BUAT JALUR KABEL FIBER BARU (CREATE) */}
      {isCreateRouteModalOpen && (
        <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] flex flex-col bg-dark-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden mt-auto sm:my-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Cable className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Simpan Jalur Kabel Fiber
                </h3>
              </div>
              <button
                onClick={() => setIsCreateRouteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs flex-1 overflow-y-auto pr-1 scrollbar-thin">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Jalur Kabel</label>
                <input
                  type="text"
                  value={routeFormName}
                  onChange={(e) => setRouteFormName(e.target.value)}
                  placeholder="Contoh: Feeder OLT ke ODC-01"
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipe Kabel Fiber</label>
                  <select
                    value={routeFormCableType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setRouteFormCableType(newType);
                      setRouteFormCoreCount(getCoreCountFromCableType(newType));
                    }}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  >
                    {FIBER_CABLE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label} ({opt.cores} Core)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Kapasitas Core (Otomatis)
                  </label>
                  <div className="w-full bg-dark-900 border border-slate-700/80 rounded-lg p-2.5 text-slate-200 font-mono text-xs flex items-center justify-between shadow-inner">
                    <span className="text-slate-400 font-sans text-xs">Total Kapasitas:</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {routeFormCoreCount} Core
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Titik Asal (Source)</label>
                  <select
                    value={routeFormSourceNode}
                    onChange={(e) => setRouteFormSourceNode(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Pilih Titik Asal --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.name}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Titik Tujuan (Target)</label>
                  <select
                    value={routeFormTargetNode}
                    onChange={(e) => setRouteFormTargetNode(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Pilih Titik Tujuan --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.name}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Panjang Kabel (Meter)</label>
                  <input
                    type="number"
                    value={routeFormLength}
                    onChange={(e) => setRouteFormLength(Number(e.target.value))}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Warna Garis</label>
                  <select
                    value={routeFormColor}
                    onChange={(e) => setRouteFormColor(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="#3B82F6">Biru (#3B82F6)</option>
                    <option value="#10B981">Hijau (#10B981)</option>
                    <option value="#8B5CF6">Ungu (#8B5CF6)</option>
                    <option value="#06B6D4">Cyan (#06B6D4)</option>
                    <option value="#F59E0B">Amber (#F59E0B)</option>
                    <option value="#EF4444">Merah (#EF4444)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status Kabel</label>
                  <select
                    value={routeFormStatus}
                    onChange={(e) => setRouteFormStatus(e.target.value as any)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="NORMAL">Normal / Baik</option>
                    <option value="DEGRADED">High Loss / Redaman Tinggi</option>
                    <option value="CUT">Fiber Cut / Putus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Redaman Standar</label>
                  <input
                    type="text"
                    value={routeFormAttenuation}
                    onChange={(e) => setRouteFormAttenuation(e.target.value)}
                    placeholder="Contoh: 0.35 dB/km"
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Catatan Jalur (Notes / Keterangan Lapangan)
                </label>
                <textarea
                  rows={2}
                  value={routeFormNotes}
                  onChange={(e) => setRouteFormNotes(e.target.value)}
                  placeholder="Contoh: Melewati tiang PLN Jl. Mawar, cadangan slack 15m di ODP-02..."
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-sans text-xs"
                />
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-dark-900 p-2.5 rounded-lg border border-slate-800">
                Terdiri dari {drawingCoords.length} titik koordinat belokan yang digambar di peta.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateRouteModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateRoute}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20"
              >
                Simpan Jalur Kabel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT JALUR KABEL FIBER (UPDATE) */}
      {editingRoute && (
        <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] flex flex-col bg-dark-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden mt-auto sm:my-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Edit Data Jalur Kabel Fiber
                </h3>
              </div>
              <button
                onClick={() => setEditingRoute(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs flex-1 overflow-y-auto pr-1 scrollbar-thin">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nama Jalur Kabel</label>
                <input
                  type="text"
                  value={routeFormName}
                  onChange={(e) => setRouteFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipe Kabel Fiber</label>
                  <select
                    value={routeFormCableType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setRouteFormCableType(newType);
                      setRouteFormCoreCount(getCoreCountFromCableType(newType));
                    }}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 text-xs"
                  >
                    {FIBER_CABLE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.label}>
                        {opt.label} ({opt.cores} Core)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Kapasitas Core (Otomatis)
                  </label>
                  <div className="w-full bg-dark-900 border border-slate-700/80 rounded-lg p-2.5 text-slate-200 font-mono text-xs flex items-center justify-between shadow-inner">
                    <span className="text-slate-400 font-sans text-xs">Total Kapasitas:</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 text-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      {routeFormCoreCount} Core
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Titik Asal (Source)</label>
                  <select
                    value={routeFormSourceNode}
                    onChange={(e) => setRouteFormSourceNode(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Pilih Titik Asal --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.name}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Titik Tujuan (Target)</label>
                  <select
                    value={routeFormTargetNode}
                    onChange={(e) => setRouteFormTargetNode(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Pilih Titik Tujuan --</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.name}>
                        {n.name} ({n.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Panjang Kabel (Meter)</label>
                  <input
                    type="number"
                    value={routeFormLength}
                    onChange={(e) => setRouteFormLength(Number(e.target.value))}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Warna Garis</label>
                  <select
                    value={routeFormColor}
                    onChange={(e) => setRouteFormColor(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="#3B82F6">Biru (#3B82F6)</option>
                    <option value="#10B981">Hijau (#10B981)</option>
                    <option value="#8B5CF6">Ungu (#8B5CF6)</option>
                    <option value="#06B6D4">Cyan (#06B6D4)</option>
                    <option value="#F59E0B">Amber (#F59E0B)</option>
                    <option value="#EF4444">Merah (#EF4444)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Status Kabel</label>
                  <select
                    value={routeFormStatus}
                    onChange={(e) => setRouteFormStatus(e.target.value as any)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="NORMAL">Normal / Baik</option>
                    <option value="DEGRADED">High Loss / Redaman Tinggi</option>
                    <option value="CUT">Fiber Cut / Putus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Redaman Standar</label>
                  <input
                    type="text"
                    value={routeFormAttenuation}
                    onChange={(e) => setRouteFormAttenuation(e.target.value)}
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Catatan Jalur (Notes / Keterangan Lapangan)
                </label>
                <textarea
                  rows={2}
                  value={routeFormNotes}
                  onChange={(e) => setRouteFormNotes(e.target.value)}
                  placeholder="Contoh: Melewati tiang PLN Jl. Mawar, cadangan slack 15m di ODP-02..."
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-sans text-xs"
                />
              </div>

              {/* Box Info Sinkronisasi Otomatis ke Pengaturan ODP */}
              <div className="bg-sky-950/40 p-2.5 rounded-xl border border-sky-800/40 text-[11px] text-sky-200 space-y-1">
                <div className="font-semibold flex items-center justify-between text-sky-300">
                  <div className="flex items-center gap-1.5">
                    <Cable className="w-3.5 h-3.5 text-sky-400" />
                    <span>Sinkronisasi Otomatis ke Pengaturan ODP</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    ✓ AKTIF
                  </span>
                </div>
                <div className="text-slate-300">
                  • <strong>ODP Asal:</strong> {routeFormSourceNode || 'Belum dipilih'} (tersambung ke rasio output Line Fiber)
                </div>
                <div className="text-slate-300">
                  • <strong>ODP Tujuan:</strong> {routeFormTargetNode || 'Belum dipilih'} (menggunakan kabel ini sebagai sumber feeder induk)
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono bg-dark-900 p-2.5 rounded-lg border border-slate-800">
                Memiliki {editingRoute.coords.length} titik koordinat rute kabel.
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleDeleteRoute(editingRoute.id, editingRoute.name);
                  setEditingRoute(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-800/40 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Jalur</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpdateRoute}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREATE NODE BARU (SAAT PETA DIKLIK) */}
      {pendingNode && (
        <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full sm:max-w-lg max-h-[90dvh] sm:max-h-[90vh] flex flex-col bg-dark-800 border-t sm:border border-slate-700 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden mt-auto sm:my-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Tambah {pendingNode.type === 'CLOSURE' || pendingNode.type === 'JOINT_CLOSURE' ? 'Joint Closure (JC)' : pendingNode.type} Baru
              </h3>
              <button onClick={() => { setPendingNode(null); setDynamicLocationCalc(null); }} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs flex-1 overflow-y-auto pr-1 scrollbar-thin">
              {pendingNode.type === 'ONT' && (
                <MikrotikPppoeSelector
                  selectedUsername={formPppoeUser}
                  onSelect={handleSelectPppoeSession}
                  onClear={() => setFormPppoeUser('')}
                  installedUsernames={installedOntUsernames}
                />
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {pendingNode.type === 'ONT' ? 'Nama Pelanggan *' : pendingNode.type === 'SERVER' ? 'Nama POP / Server *' : (pendingNode.type === 'CLOSURE' || pendingNode.type === 'JOINT_CLOSURE') ? 'Nama Joint Closure *' : 'Nama Perangkat *'}
                </label>
                <input
                  type="text"
                  value={formName}
                  placeholder={pendingNode.type === 'SERVER' ? 'Contoh: POP Server 01' : (pendingNode.type === 'CLOSURE' || pendingNode.type === 'JOINT_CLOSURE') ? 'Contoh: JC-01' : ''}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
                />
              </div>

              {(pendingNode.type === 'ODC' || pendingNode.type === 'ODP') &&
                renderSplitterAndAttenuationForm()}

              {(pendingNode.type === 'CLOSURE' || pendingNode.type === 'JOINT_CLOSURE') &&
                renderClosureForm()}



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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Model Modem</label>
                      <select
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono text-xs"
                      >
                        {modemProfiles.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={`${p.manufacturer} ${p.model}`}>
                            {p.manufacturer} {p.model}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Serial Number (SN)</label>
                      <input
                        type="text"
                        placeholder="Contoh: 48575443..., 5A5445..."
                        value={formSerial}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSerial(val);
                          const rec = recognizeModem(val);
                          if (rec.profile) {
                            setFormModel(`${rec.profile.manufacturer} ${rec.profile.model}`);
                          }
                        }}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="text-[11px] text-slate-500 font-mono text-center pt-1">
                Koordinat: {pendingNode.lat.toFixed(5)}, {pendingNode.lng.toFixed(5)}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => { setPendingNode(null); setDynamicLocationCalc(null); }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCreateNode}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition-colors"
              >
                Simpan Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[3100] flex items-start justify-center pt-16 sm:pt-20 p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
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

            <div className="max-h-[60vh] sm:max-h-72 overflow-y-auto p-2 space-y-1 scrollbar-thin">
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

      {/* POP SERVER FACILITY & POWER BACKUP DETAIL MODAL */}
      {activePopModal && (
        <PopServerDetailModal
          pop={activePopModal}
          onClose={() => setActivePopModal(null)}
          onUpdatePop={handleUpdatePopFacility}
          onOpenOltAccess={(olt) => {
            setSelectedOltModal(olt);
          }}
        />
      )}

      {/* OLT ACCESS & CONFIG MODAL */}
      {selectedOltModal && (
        <OltAccessModal
          olt={selectedOltModal}
          onClose={() => setSelectedOltModal(null)}
          onSave={(updated) => {
            // Sinkronkan ke state nodes (jika node server terhubung ke OLT ini)
            setNodes((prev) =>
              prev.map((n) => {
                if (n.oltId === updated.id || n.ip === updated.ip || n.name === selectedOltModal.name) {
                  return {
                    ...n,
                    name: n.type === 'SERVER' ? n.name : updated.name,
                    vendor: updated.vendor,
                    model: updated.model,
                    ip: updated.ip,
                    webPort: updated.webPort,
                    cliPort: updated.cliPort,
                    ponType: updated.ponType,
                    ponPortsCount: updated.ponPortsCount,
                    defaultUser: updated.defaultUser,
                    defaultPass: updated.defaultPass,
                  };
                }
                return n;
              })
            );
            // Sinkronkan ke modal POP aktif jika sedang terbuka
            if (activePopModal) {
              setActivePopModal((prev) => {
                if (!prev) return null;
                const nextDevs = prev.devices?.map((d) => {
                  if (d.id === updated.id || d.name === selectedOltModal.name) {
                    return {
                      ...d,
                      name: updated.name,
                      vendor: updated.vendor,
                      model: updated.model,
                      ipAddress: updated.ip,
                      webPort: updated.webPort,
                      cliPort: updated.cliPort,
                      defaultUser: updated.defaultUser,
                      defaultPass: updated.defaultPass,
                    };
                  }
                  return d;
                });
                const nextPop = { ...prev, devices: nextDevs };
                handleUpdatePopFacility(nextPop);
                return nextPop;
              });
            }
          }}
        />
      )}
      {/* CUT LINE FIBER CONFIRMATION MODAL */}
      {pendingCutAction && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-scaleUp">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cut Line Fiber</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih tindakan pemotongan rute kabel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingCutAction(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Lokasi Potong */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Jalur Kabel:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{pendingCutAction.route.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Titik Potong:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  KM {pendingCutAction.distanceKm.toFixed(3)} ({Math.round(pendingCutAction.distanceMeters)} m dari hulu)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Sisa Bentangan:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {Math.round(pendingCutAction.route.lengthMeter - pendingCutAction.distanceMeters)} m ke ujung
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/40">
                <span className="text-slate-400">Koordinat:</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {pendingCutAction.snappedCoord[0].toFixed(5)}, {pendingCutAction.snappedCoord[1].toFixed(5)}
                </span>
              </div>
            </div>

            {/* Opsi Tindakan */}
            <div className="space-y-2.5">
              {/* Opsi 1: Potong Menjadi 2 Segmen */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Split className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Potong Menjadi 2 Segmen Rute</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Membelah rute menjadi Segmen A ({Math.round(pendingCutAction.distanceMeters)}m) & Segmen B ({Math.round(pendingCutAction.route.lengthMeter - pendingCutAction.distanceMeters)}m).
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={insertClosureOnCut}
                    onChange={(e) => setInsertClosureOnCut(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 border-slate-300 dark:border-slate-700 accent-brand-600"
                  />
                  <span>Sisipkan Joint Closure (JC) di titik potong</span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    handleSplitRoute(
                      pendingCutAction.route,
                      pendingCutAction.snappedCoord,
                      pendingCutAction.insertIndex,
                      insertClosureOnCut
                    )
                  }
                  className="w-full py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98]"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Potong Kabel Menjadi 2 Segmen</span>
                </button>
              </div>

              {/* Opsi 2: Tandai Insiden Kabel Putus (Fiber Cut Incident) */}
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Tandai Insiden Kabel Putus (Fiber Cut)</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Menandai status kabel sebagai PUTUS (merah berkedip) di lokasi KM {pendingCutAction.distanceKm.toFixed(3)} untuk pelacakan gangguan lapangan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleMarkRouteCut(
                      pendingCutAction.route,
                      pendingCutAction.snappedCoord,
                      pendingCutAction.distanceKm
                    )
                  }
                  className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/20 transition-all active:scale-[0.98]"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Tandai Status Kabel PUTUS</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPendingCutAction(null)}
              className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
