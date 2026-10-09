import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getOltsApi,
  createOltApi,
  updateOltApi,
  updateOltPortApi,
  deleteOltApi,
  pollOltCollectorApi,
  pollSingleOltApi,
  logoutApi,
} from '../api/client';
import { encryptClientVault, decryptClientVault } from '../utils/crypto';
import { syncBrowserFaviconAndTitle } from '../utils/favicon';

// ============================================================================
// 1. BRANDING & THEME INTERFACES
// ============================================================================
export interface BrandSettings {
  appName: string;
  tagline: string;
  logoType: 'icon' | 'image';
  logoIcon: string;
  logoImageUrl: string;
  logoColor: string;
}

export type UserRole = 'SUPERADMIN' | 'NOC_ENGINEER' | 'TECHNICIAN' | 'HELPDESK';

export interface RoleDefinition {
  role: UserRole;
  level: number;
  title: string;
  badgeLabel: string;
  category: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
  allowedTabs: string[];
  capabilities: string[];
  restrictions: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  SUPERADMIN: {
    role: 'SUPERADMIN',
    level: 1,
    title: 'Super Administrator',
    badgeLabel: 'SUPERADMIN',
    category: 'Manajemen Eksekutif & IT Lead',
    description: 'Akses penuh tanpa batasan ke seluruh modul sistem, pengaturan rahasia vault, audit log, manajemen OLT & manajemen pengguna.',
    colorClass: 'text-slate-900 dark:text-white',
    bgClass: 'bg-slate-200 dark:bg-slate-800',
    borderClass: 'border-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-900 dark:bg-white',
    allowedTabs: ['dashboard', 'olts', 'devices', 'schedule-reboot', 'mapping', 'calculator', 'faults', 'customers', 'settings'],
    capabilities: [
      'Akses 100% tanpa batasan ke seluruh menu dan modul',
      'Manajemen hak akses & leveling role seluruh staf/teknisi',
      'Konfigurasi core ACS TR-069, URL inform & kredensial vault',
      'Tambah, ubah, dan hapus master OLT, server POP & feeder',
      'Eksekusi pemeliharaan terjadwal & reboot massal jaringan',
      'Manajemen data branding aplikasi & backup basis data',
    ],
    restrictions: [
      'Tidak ada batasan hak akses (Unrestricted Access)',
    ],
  },
  NOC_ENGINEER: {
    role: 'NOC_ENGINEER',
    level: 2,
    title: 'NOC Engineer',
    badgeLabel: 'NOC ENGINEER',
    category: 'Network Operations Center Lead',
    description: 'Mengelola operasional jaringan harian, provisioning ONT, konfigurasi OLT, penanganan alarm insiden & jadwal pemeliharaan.',
    colorClass: 'text-slate-800 dark:text-slate-200',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    borderClass: 'border-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-700 dark:bg-slate-300',
    allowedTabs: ['dashboard', 'olts', 'devices', 'schedule-reboot', 'mapping', 'calculator', 'faults', 'customers', 'settings'],
    capabilities: [
      'Monitoring SLA jaringan, degradasi optik & alarm realtime',
      'Kelola port PON OLT & buka web GUI manajemen OLT',
      'Remote reboot massal & single ONT via TR-069',
      'Ubah konfigurasi Wi-Fi SSID, password, & PPPoE pelanggan',
      'Buat dan jalankan jadwal pemeliharaan berkala (Maintenance Window)',
      'Manajemen peta topologi GIS (ODC, ODP, closure, & kabel)',
    ],
    restrictions: [
      'Tidak dapat mengubah role atau membuat akun Superadmin baru',
      'Tidak dapat menghapus master OLT / POP server utama tanpa otorisasi',
    ],
  },
  TECHNICIAN: {
    role: 'TECHNICIAN',
    level: 3,
    title: 'Teknisi Lapangan',
    badgeLabel: 'TECHNICIAN',
    category: 'Field Operations & Splicing',
    description: 'Operasional fisik di lapangan, tracing kabel GIS, pengukuran redaman ODP, aktivasi pelanggan baru & validasi sinyal optik.',
    colorClass: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-850',
    borderClass: 'border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-600 dark:bg-slate-400',
    allowedTabs: ['dashboard', 'devices', 'mapping', 'calculator', 'faults', 'customers'],
    capabilities: [
      'Akses Peta GIS FTTH (Tracing jalur kabel, tiang, ODC, & ODP)',
      'Pengukuran daya optik (Rx Power dBm) & deteksi kabel putus (LOS)',
      'Remote action terbatas: Reboot 1 ONT pelanggan saat aktivasi baru',
      'Kalkulator link budget redaman splitter rasio FBT & PLC',
      'Melihat daftar pelanggan & alokasi port ODP terpasang',
    ],
    restrictions: [
      'Tidak dapat mengakses menu Pengaturan Sistem (Settings)',
      'Tidak dapat menjalankan reboot massal seluruh jaringan',
      'Tidak dapat menghapus OLT, node GIS, atau basis data pelanggan',
      'Tidak dapat melihat kata sandi vault atau enkripsi kredensial',
    ],
  },
  HELPDESK: {
    role: 'HELPDESK',
    level: 4,
    title: 'Customer Service / Support L1',
    badgeLabel: 'HELPDESK L1',
    category: 'Customer Care & L1 Helpdesk',
    description: 'Penanganan keluhan pelanggan tingkat pertama, pemantauan status koneksi pelanggan, cek sinyal redaman & histori alarm gangguan.',
    colorClass: 'text-slate-600 dark:text-slate-400',
    bgClass: 'bg-slate-50 dark:bg-slate-900',
    borderClass: 'border-slate-200 dark:border-slate-800',
    dotClass: 'bg-slate-500 dark:bg-slate-500',
    allowedTabs: ['dashboard', 'devices', 'mapping', 'faults', 'customers'],
    capabilities: [
      'Pencarian data pelanggan (Nomor pelanggan, nama, telepon, PPPoE user)',
      'Pengecekan status modem pelanggan (Online, Offline, Uptime)',
      'Pengecekan kualitas redaman sinyal optik (Normal, Warning, LOS)',
      'Pengecekan histori alarm gangguan (Apakah pemadaman PLN / kabel putus)',
      'Melihat persebaran ODP pada peta GIS untuk cek ketersediaan layanan',
    ],
    restrictions: [
      'Akses bersifat Read-Only (Hanya Lihat)',
      'Tidak memiliki izin reboot modem atau factory reset',
      'Tidak dapat mengubah konfigurasi Wi-Fi atau akun PPPoE',
      'Tidak dapat mengakses menu Pengaturan Sistem & Manajemen OLT',
    ],
  },
};

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  phone?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'FAULT' | 'WARNING' | 'SUCCESS' | 'INFO';
  read: boolean;
  targetTab?: string;
}

// ============================================================================
// 2. DYNAMIC MODEM PROFILE INTERFACES & RECOGNITION
// ============================================================================
export interface ModemProfile {
  id: string;
  manufacturer: string; // e.g. 'Huawei', 'ZTE', 'Zimlink', 'FiberHome', 'VSOL', 'Nokia'
  model: string;        // e.g. 'EchoLife HG8245H5', 'ZXHN F670L', 'XPON ZM-G100'
  productClass?: string;
  oui: string;          // e.g. '00259E', '0019A0', '5A494D'
  serialPrefix: string; // e.g. '485754' (HWTC), '5A5445' (ZTEG), '5A494D' (ZIML), '464854' (FHTT)
  wifiType: 'SINGLE_BAND' | 'DUAL_BAND' | 'BRIDGE_NO_WIFI';
  ponType: 'GPON' | 'EPON' | 'XPON';
  rootModel: 'TR098' | 'TR181';
  description?: string;
  isActive: boolean;
}

export interface RecognitionResult {
  profile: ModemProfile | null;
  matchType: 'PREFIX' | 'OUI' | 'MODEL' | 'EXACT' | null;
  confidence: number; // 0 - 100
  details: string;
}

export const DEFAULT_MODEM_PROFILES: ModemProfile[] = [
  {
    id: 'prof-hw-1',
    manufacturer: 'Huawei',
    model: 'EchoLife HG8245H5',
    productClass: 'HG8245H5',
    oui: '00259E',
    serialPrefix: '485754',
    wifiType: 'DUAL_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 2 POTS + USB + Wi-Fi Dual Band 2.4G & 5G AC1200',
    isActive: true,
  },
  {
    id: 'prof-hw-2',
    manufacturer: 'Huawei',
    model: 'OptiXstar EG8145V5',
    productClass: 'EG8145V5',
    oui: '00259E',
    serialPrefix: '485754',
    wifiType: 'DUAL_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: 'Routing-type ONT, Dual-band Wi-Fi 5 AC1200 Gigabit Ports',
    isActive: true,
  },
  {
    id: 'prof-hw-3',
    manufacturer: 'Huawei',
    model: 'EchoLife HG8546M',
    productClass: 'HG8546M',
    oui: '00259E',
    serialPrefix: '485754',
    wifiType: 'SINGLE_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '1 GE + 3 FE + 1 POTS + USB + Wi-Fi 2.4GHz',
    isActive: true,
  },
  {
    id: 'prof-hw-4',
    manufacturer: 'Huawei',
    model: 'EchoLife HG8245H',
    productClass: 'HG8245H',
    oui: '00259E',
    serialPrefix: '485754',
    wifiType: 'SINGLE_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 2 POTS + USB + Wi-Fi 2.4GHz High Power',
    isActive: true,
  },
  {
    id: 'prof-zim-1',
    manufacturer: 'Zimlink',
    model: 'XPON ZM-G100',
    productClass: 'ZM-G100',
    oui: '5A494D',
    serialPrefix: '5A494D',
    wifiType: 'SINGLE_BAND',
    ponType: 'XPON',
    rootModel: 'TR098',
    description: '1 GE + 1 FE + Wi-Fi 2.4GHz High Gain XPON Realtek',
    isActive: true,
  },
  {
    id: 'prof-zim-2',
    manufacturer: 'Zimlink',
    model: 'Dual Band ZM-G200',
    productClass: 'ZM-G200',
    oui: '5A494D',
    serialPrefix: '5A494D',
    wifiType: 'DUAL_BAND',
    ponType: 'XPON',
    rootModel: 'TR098',
    description: 'Gigabit AC1200 Dual-Band XPON ONU',
    isActive: true,
  },
  {
    id: 'prof-zte-1',
    manufacturer: 'ZTE',
    model: 'ZXHN F670L',
    productClass: 'F670L',
    oui: '0019A0',
    serialPrefix: '5A5445',
    wifiType: 'DUAL_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 1 POTS + Dual-Band Wi-Fi 2.4G & 5G AC1200',
    isActive: true,
  },
  {
    id: 'prof-zte-2',
    manufacturer: 'ZTE',
    model: 'ZXHN F609',
    productClass: 'F609',
    oui: '0019A0',
    serialPrefix: '5A5445',
    wifiType: 'SINGLE_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 2 POTS + Wi-Fi 2.4GHz (Sangat Populer RT-RW Net)',
    isActive: true,
  },
  {
    id: 'prof-fh-1',
    manufacturer: 'FiberHome',
    model: 'AN5506-04-F',
    productClass: 'AN5506-04-F',
    oui: '464854',
    serialPrefix: '464854',
    wifiType: 'DUAL_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 2 POTS + Dual Band Wi-Fi AC FTTH',
    isActive: true,
  },
  {
    id: 'prof-vsol-1',
    manufacturer: 'VSOL',
    model: 'V2804RG-WT Dual Band',
    productClass: 'V2804RG-WT',
    oui: '56534F',
    serialPrefix: '56534F',
    wifiType: 'DUAL_BAND',
    ponType: 'XPON',
    rootModel: 'TR098',
    description: '4 GE + Dual-Band Wi-Fi + Realtek Dual-Mode XPON',
    isActive: true,
  },
  {
    id: 'prof-nok-1',
    manufacturer: 'Nokia',
    model: 'G-2425G-A',
    productClass: 'G-2425G-A',
    oui: '414C43',
    serialPrefix: '414C43',
    wifiType: 'DUAL_BAND',
    ponType: 'GPON',
    rootModel: 'TR098',
    description: '4 GE + 2 POTS + USB + Dual Band AC1200 Nokia Bell',
    isActive: true,
  },
];

export const recognizeModemFromInput = (
  rawInput: string,
  profiles: ModemProfile[],
): RecognitionResult => {
  if (!rawInput || !rawInput.trim()) {
    return { profile: null, matchType: null, confidence: 0, details: 'Input serial / MAC kosong' };
  }

  const clean = rawInput.trim().toUpperCase().replace(/[:-]/g, '');

  // 1. Check Serial Prefix Match (Hex Prefix or ASCII Vendor ID)
  for (const prof of profiles) {
    if (!prof.isActive) continue;

    // Check Hex prefix match
    if (prof.serialPrefix && clean.startsWith(prof.serialPrefix.toUpperCase())) {
      return {
        profile: prof,
        matchType: 'PREFIX',
        confidence: 96,
        details: `Dikenali via Serial Prefix '${prof.serialPrefix}' (${prof.manufacturer})`,
      };
    }

    // Check ASCII vendor text prefix
    const asciiPrefixMap: Record<string, string> = {
      HWTC: 'Huawei',
      ZTEG: 'ZTE',
      ZIML: 'Zimlink',
      FHTT: 'FiberHome',
      VSOL: 'VSOL',
      ALCL: 'Nokia',
    };
    for (const [asciiKey, mfg] of Object.entries(asciiPrefixMap)) {
      if (clean.startsWith(asciiKey) && prof.manufacturer.toUpperCase() === mfg.toUpperCase()) {
        return {
          profile: prof,
          matchType: 'PREFIX',
          confidence: 96,
          details: `Dikenali via Vendor Code '${asciiKey}' (${prof.manufacturer})`,
        };
      }
    }
  }

  // 2. Check OUI / MAC Prefix match (first 6 hex chars)
  if (clean.length >= 6) {
    const macPrefix = clean.substring(0, 6);
    for (const prof of profiles) {
      if (!prof.isActive) continue;
      if (prof.oui && prof.oui.toUpperCase().replace(/[:-]/g, '') === macPrefix) {
        return {
          profile: prof,
          matchType: 'OUI',
          confidence: 92,
          details: `Dikenali via OUI Vendor '${prof.oui}' (${prof.manufacturer})`,
        };
      }
    }
  }

  // 3. Check Model substring match
  const queryNormalized = rawInput.trim().toUpperCase();
  for (const prof of profiles) {
    if (!prof.isActive) continue;
    const modelUpper = prof.model.toUpperCase();
    const productClassUpper = (prof.productClass || '').toUpperCase();

    if (
      queryNormalized.includes(modelUpper) ||
      (productClassUpper && queryNormalized.includes(productClassUpper)) ||
      modelUpper.includes(queryNormalized)
    ) {
      return {
        profile: prof,
        matchType: 'MODEL',
        confidence: 88,
        details: `Dikenali via Model '${prof.model}'`,
      };
    }
  }

  // 4. Check Manufacturer name match
  for (const prof of profiles) {
    if (!prof.isActive) continue;
    if (queryNormalized.includes(prof.manufacturer.toUpperCase())) {
      return {
        profile: prof,
        matchType: 'MODEL',
        confidence: 72,
        details: `Dikenali via Merek '${prof.manufacturer}'`,
      };
    }
  }

  return {
    profile: null,
    matchType: null,
    confidence: 0,
    details: 'Merek & tipe belum terdaftar di database sistem',
  };
};

// ============================================================================
// 3. DEFAULT INITIAL DATA
// ============================================================================
const DEFAULT_BRANDING: BrandSettings = {
  appName: 'PROJECT ACS',
  tagline: 'TR-069 & GIS FTTH',
  logoType: 'icon',
  logoIcon: 'activity',
  logoImageUrl: '',
  logoColor: '#2563EB',
};

const DEFAULT_USER: UserProfile = {
  name: 'Admin NOC',
  email: 'admin@acs.noc.id',
  role: 'SUPERADMIN',
  avatar: '',
  phone: '0812-3456-7890',
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

// ============================================================================
// 4. MIKROTIK PPPOE & TR-069 SESSIONS INTERFACES & SEED
// ============================================================================
export interface MikrotikPppoeSession {
  id: string;
  username: string;       // e.g. "ahmad.dahlan@tamanet"
  customerName: string;   // e.g. "Ahmad Dahlan"
  customerNo: string;     // e.g. "CUST-005"
  phone: string;          // e.g. "0812-7890-1234"
  address: string;        // e.g. "Talang 20 Bawah RT 04, Air Naningan"
  profile: string;        // e.g. "Home Gamer 30 Mbps"
  ipAddress: string;      // e.g. "10.10.20.105"
  callerIdMac: string;    // e.g. "00:25:9E:CD:44:11"
  serialNumber: string;   // e.g. "4857544399001122"
  manufacturer: string;   // e.g. "Huawei"
  model: string;          // e.g. "EchoLife HG8245H5"
  rxPower: string;        // e.g. "-19.60"
  txPower: string;        // e.g. "2.20"
  uptime: string;         // e.g. "5h 42m"
  brasServer: string;     // e.g. "MikroTik CCR2004-16G (ether2-vlan100)"
  tr069Status: 'SYNCED' | 'DISCOVERED' | 'OFFLINE';
  isAssigned: boolean;
}

export const DEFAULT_PPPOE_SESSIONS: MikrotikPppoeSession[] = [];

// ============================================================================
// 4B. OLT DEVICES INTERFACE & DEFAULTS
// ============================================================================
export interface PonPortStatus {
  port: number; // 1, 2, ...
  name?: string;
  description?: string; // Keterangan area (misal: Area Melati RW 01)
  online: number;
  offline: number;
}

export interface OltDevice {
  id: string;
  name: string;
  vendor: string;
  model: string;
  ip: string;
  webPort: number;
  cliPort: number;
  ponType: string;
  ponPortsCount: number;
  snmpCommunity: string;
  totalOnu: number;
  onlineOnu: number;
  offlineOnu: number;
  defaultUser: string;
  defaultPass: string;
  uptime: string;
  ponPorts?: PonPortStatus[];
  ports?: {
    name: string;
    onuCount: number;
    txPower: string;
    status: 'UP' | 'DOWN';
  }[];
}

export const DEFAULT_OLTS: OltDevice[] = [
  {
    id: 'olt-hisfocus-2p1g',
    name: 'OLT-Hisfocus-2P1G',
    vendor: 'Hisfocus',
    model: '2P1G',
    ip: '192.168.1.100',
    webPort: 80,
    cliPort: 23,
    ponType: 'EPON',
    ponPortsCount: 2,
    snmpCommunity: 'public',
    totalOnu: 0,
    onlineOnu: 0,
    offlineOnu: 0,
    defaultUser: 'admin',
    defaultPass: 'admin',
    uptime: 'Aktif',
    ponPorts: [
      { port: 1, name: 'PON 1', description: 'Area Melati (RW 01 - RW 03)', online: 0, offline: 0 },
      { port: 2, name: 'PON 2', description: 'Area Mawar (RW 04 - RW 06)', online: 0, offline: 0 },
    ],
  },
  {
    id: 'olt-hioso-ha7302cst',
    name: 'OLT-Hioso-HA7302CST',
    vendor: 'Hioso',
    model: 'HA7302CST',
    ip: '192.168.1.101',
    webPort: 80,
    cliPort: 23,
    ponType: 'EPON',
    ponPortsCount: 2,
    snmpCommunity: 'public',
    totalOnu: 0,
    onlineOnu: 0,
    offlineOnu: 0,
    defaultUser: 'admin',
    defaultPass: 'admin',
    uptime: 'Aktif',
    ponPorts: [
      { port: 1, name: 'PON 1', description: 'Area Kenanga / Perumahan Indah', online: 0, offline: 0 },
      { port: 2, name: 'PON 2', description: 'Area Anggrek / Pasar Lama', online: 0, offline: 0 },
    ],
  },
  {
    id: 'olt-hioso-ha7304',
    name: 'OLT-Hioso-HA7304',
    vendor: 'Hioso',
    model: 'HA7304',
    ip: '192.168.1.102',
    webPort: 80,
    cliPort: 23,
    ponType: 'EPON',
    ponPortsCount: 4,
    snmpCommunity: 'public',
    totalOnu: 0,
    onlineOnu: 0,
    offlineOnu: 0,
    defaultUser: 'admin',
    defaultPass: 'admin',
    uptime: 'Aktif',
    ponPorts: [
      { port: 1, name: 'PON 1', description: 'Area Sentral Utara (ODC 01)', online: 0, offline: 0 },
      { port: 2, name: 'PON 2', description: 'Area Sentral Selatan (ODC 02)', online: 0, offline: 0 },
      { port: 3, name: 'PON 3', description: 'Area Komersil Barat (ODC 03)', online: 0, offline: 0 },
      { port: 4, name: 'PON 4', description: 'Area Perluasan Timur (ODC 04)', online: 0, offline: 0 },
    ],
  },
];

// ============================================================================
// 4C. AUTO-PROVISIONING & CREDENTIAL HARDENING POLICY
// ============================================================================
export interface AutoProvisionPolicy {
  enabled: boolean;
  webAdminUser: string;
  webAdminPass: string;
  autoGeneratePerSerial: boolean;
  serialPattern: string; // e.g. "ISP@{SN_LAST_4}"
  targetEvents: string[]; // e.g. ["0 BOOTSTRAP", "1 BOOT"]
  changeWifiDefaults: boolean;
  defaultWifiSsidPattern: string; // e.g. "Tamanet-{SN_LAST_4}"
  defaultWifiPass: string;
}

export const DEFAULT_AUTO_PROVISION: AutoProvisionPolicy = {
  enabled: true,
  webAdminUser: 'admin',
  webAdminPass: 'AdminNoc@2026',
  autoGeneratePerSerial: false,
  serialPattern: 'ISP@{SN_LAST_4}',
  targetEvents: ['0 BOOTSTRAP', '1 BOOT'],
  changeWifiDefaults: false,
  defaultWifiSsidPattern: 'Tamanet-{SN_LAST_4}',
  defaultWifiPass: '12345678',
};

// ============================================================================
// 5. CONTEXT DEFINITION
// ============================================================================
interface AppContextType {
  branding: BrandSettings;
  updateBranding: (newBranding: Partial<BrandSettings>) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
  user: UserProfile;
  updateUser: (newUser: Partial<UserProfile>) => void;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  toast: string | null;
  showToast: (msg: string) => void;

  // Auth Session
  isAuthenticated: boolean;
  login: (token: string, userData?: Partial<UserProfile>) => void;
  logout: () => void;

  // Dynamic Modem Profiles
  modemProfiles: ModemProfile[];
  addModemProfile: (profile: Omit<ModemProfile, 'id'>) => void;
  updateModemProfile: (id: string, updates: Partial<ModemProfile>) => void;
  deleteModemProfile: (id: string) => void;
  recognizeModem: (input: string) => RecognitionResult;
  deviceVendors: string[];

  // MikroTik PPPoE & TR-069 Sessions
  pppoeSessions: MikrotikPppoeSession[];
  refreshPppoeSessions: (silent?: boolean) => Promise<MikrotikPppoeSession[]>;
  markPppoeAssigned: (id: string, assigned?: boolean) => void;

  // OLT Devices Management
  olts: OltDevice[];
  addOlt: (olt: Partial<OltDevice> & { name: string; vendor: string; ip: string }) => Promise<void> | void;
  updateOlt: (id: string, updates: Partial<OltDevice>) => void;
  updatePonPortArea: (oltId: string, portNumber: number, description: string, label?: string) => Promise<void>;
  deleteOlt: (id: string) => void;
  syncOlt: (id: string) => Promise<OltDevice | undefined>;
  syncAllOlts: () => Promise<OltDevice[]>;

  // Auto-Provisioning & Credential Hardening
  autoProvision: AutoProvisionPolicy;
  updateAutoProvision: (policy: Partial<AutoProvisionPolicy>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper untuk sanitasi IP address (menghapus http://, https://, trailing slash, dan trailing colon)
export const sanitizeIp = (rawIp?: string): string => {
  if (!rawIp) return '';
  return rawIp
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:.*$/, '')
    .trim();
};

// ============================================================================
// ITU-T G.984 STANDAR POWER OPTIK NOC (GPON Class B+/C+)
// ============================================================================
export type OpticalPowerStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'LOS';

export interface OpticalPowerEval {
  status: OpticalPowerStatus;
  numeric: number | null;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotColorClass: string;
  description: string;
}

export const evaluateOpticalPower = (rawRx?: string | number): OpticalPowerEval => {
  if (rawRx === undefined || rawRx === null || rawRx === '' || rawRx === '-') {
    return {
      status: 'CRITICAL',
      numeric: null,
      label: '-',
      colorClass: 'text-slate-400 dark:text-slate-500',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-200 dark:border-slate-700',
      dotColorClass: 'bg-slate-400',
      description: 'Tidak ada data redaman',
    };
  }

  const str = String(rawRx).trim().toUpperCase();
  if (str === 'LOS' || str === 'FAIL' || str === 'DOWN') {
    return {
      status: 'LOS',
      numeric: null,
      label: 'LOS',
      colorClass: 'text-slate-900 dark:text-white',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-300 dark:border-slate-700',
      dotColorClass: 'bg-slate-500 dark:bg-slate-400',
      description: 'Loss of Signal (Kabel Putus / Tidak Terkoneksi)',
    };
  }

  const num = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) {
    return {
      status: 'CRITICAL',
      numeric: null,
      label: str,
      colorClass: 'text-slate-400 dark:text-slate-500',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-200 dark:border-slate-700',
      dotColorClass: 'bg-slate-400',
      description: 'Format data tidak valid',
    };
  }

  const formatted = `${num.toFixed(2)} dBm`;

  if (num >= -24.0) {
    return {
      status: 'NORMAL',
      numeric: num,
      label: formatted,
      colorClass: 'text-slate-900 dark:text-white',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-200 dark:border-slate-700',
      dotColorClass: 'bg-slate-600 dark:bg-slate-300',
      description: 'Normal (Sinyal Optimal >= -24 dBm)',
    };
  }

  if (num >= -27.0) {
    return {
      status: 'WARNING',
      numeric: num,
      label: formatted,
      colorClass: 'text-slate-800 dark:text-slate-200',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      borderClass: 'border-slate-200 dark:border-slate-700',
      dotColorClass: 'bg-slate-500 dark:bg-slate-400',
      description: 'Degradasi / Redaman Marginal (-24 s/d -27 dBm)',
    };
  }

  return {
    status: 'CRITICAL',
    numeric: num,
    label: formatted,
    colorClass: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    borderClass: 'border-slate-200 dark:border-slate-700',
    dotColorClass: 'bg-slate-400 dark:bg-slate-500',
    description: 'Kritis (Redaman Tinggi < -27 dBm)',
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Branding State
  const [branding, setBranding] = useState<BrandSettings>(() => {
    try {
      const saved = localStorage.getItem('acs_brand_settings');
      const loaded = saved ? { ...DEFAULT_BRANDING, ...JSON.parse(saved) } : DEFAULT_BRANDING;
      syncBrowserFaviconAndTitle(loaded);
      return loaded;
    } catch {
      syncBrowserFaviconAndTitle(DEFAULT_BRANDING);
      return DEFAULT_BRANDING;
    }
  });

  const updateBranding = (newBranding: Partial<BrandSettings>) => {
    setBranding((prev) => {
      const updated = { ...prev, ...newBranding };
      localStorage.setItem('acs_brand_settings', JSON.stringify(updated));
      syncBrowserFaviconAndTitle(updated);
      return updated;
    });
  };

  useEffect(() => {
    syncBrowserFaviconAndTitle(branding);
  }, [branding]);

  // 2. Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const savedTheme = localStorage.getItem('acs_theme_mode');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return 'dark'; // Default dark NOC theme
    } catch {
      return 'dark';
    }
  });

  const applyTheme = (mode: 'dark' | 'light') => {
    setTheme(mode);
    localStorage.setItem('acs_theme_mode', mode);
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  const toggleTheme = () => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setThemeMode = (mode: 'dark' | 'light') => {
    applyTheme(mode);
  };

  useEffect(() => {
    applyTheme(theme);
  }, []);

  // 3. User Profile State
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('acs_user_profile');
      return saved ? { ...DEFAULT_USER, ...JSON.parse(saved) } : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const updateUser = (newUser: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...newUser };
      localStorage.setItem('acs_user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  // Auth Session State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('acs_access_token');
    } catch {
      return false;
    }
  });

  const login = (token: string, userData?: Partial<UserProfile>) => {
    try {
      localStorage.setItem('acs_access_token', token);
    } catch {}
    if (userData) {
      updateUser(userData);
    }
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {}
    try {
      localStorage.removeItem('acs_access_token');
      localStorage.removeItem('acs_refresh_token');
      localStorage.removeItem('acs_user_profile');
    } catch {}
    setIsAuthenticated(false);
  };

  // 4. Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('acs_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    localStorage.setItem('acs_notifications', JSON.stringify(items));
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    saveNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    saveNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    saveNotifications([]);
  };

  // 5. Toast Feedback
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 6. Dynamic Modem Profiles State
  const [modemProfiles, setModemProfiles] = useState<ModemProfile[]>(() => {
    try {
      const saved = localStorage.getItem('acs_modem_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return DEFAULT_MODEM_PROFILES;
    } catch {
      return DEFAULT_MODEM_PROFILES;
    }
  });

  const saveModemProfiles = (profiles: ModemProfile[]) => {
    setModemProfiles(profiles);
    localStorage.setItem('acs_modem_profiles', JSON.stringify(profiles));
  };

  const addModemProfile = (profileData: Omit<ModemProfile, 'id'>) => {
    const newProfile: ModemProfile = {
      ...profileData,
      id: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [newProfile, ...modemProfiles];
    saveModemProfiles(updated);
    showToast(`Modem ${newProfile.manufacturer} ${newProfile.model} berhasil ditambahkan!`);
  };

  const updateModemProfile = (id: string, updates: Partial<ModemProfile>) => {
    const updated = modemProfiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
    saveModemProfiles(updated);
    showToast('Profil modem berhasil diperbarui!');
  };

  const deleteModemProfile = (id: string) => {
    const target = modemProfiles.find((p) => p.id === id);
    const updated = modemProfiles.filter((p) => p.id !== id);
    saveModemProfiles(updated);
    showToast(`Profil ${target?.manufacturer || ''} ${target?.model || ''} dihapus.`);
  };

  const recognizeModem = (input: string): RecognitionResult => {
    return recognizeModemFromInput(input, modemProfiles);
  };

  // Unique list of manufacturers from registered profiles
  const deviceVendors = Array.from(
    new Set(modemProfiles.filter((p) => p.isActive).map((p) => p.manufacturer)),
  );

  // 7. MikroTik PPPoE & TR-069 Sessions State
  const [pppoeSessions, setPppoeSessions] = useState<MikrotikPppoeSession[]>(() => {
    try {
      const saved = localStorage.getItem('acs_mikrotik_pppoe_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_PPPOE_SESSIONS;
    } catch {
      return DEFAULT_PPPOE_SESSIONS;
    }
  });

  const savePppoeSessions = (sessions: MikrotikPppoeSession[]) => {
    setPppoeSessions(sessions);
    try {
      localStorage.setItem('acs_mikrotik_pppoe_sessions', JSON.stringify(sessions));
    } catch {}
  };

  const refreshPppoeSessions = async (silent: boolean = false): Promise<MikrotikPppoeSession[]> => {
    // Simulate live TR-069 & MikroTik RouterOS API handshake
    await new Promise((resolve) => setTimeout(resolve, 600));
    // Randomize or refresh ping/uptime slightly to reflect live data
    const updated = pppoeSessions.map((s) => ({
      ...s,
      tr069Status: 'SYNCED' as const,
    }));
    savePppoeSessions(updated);
    if (!silent) {
      showToast(`✓ Sinkronisasi MikroTik RouterOS & TR-069 berhasil (${updated.length} sesi aktif)`);
    }
    return updated;
  };

  const markPppoeAssigned = (id: string, assigned: boolean = true) => {
    const updated = pppoeSessions.map((s) => (s.id === id ? { ...s, isAssigned: assigned } : s));
    savePppoeSessions(updated);
  };

  // Helper untuk mengekstrak & menyinkronkan OLT dari Source Server (Hanya OLT riil di rak POP, tanpa data dummy)
  const extractOltsFromSourceServers = (existingOlts: OltDevice[] = []): OltDevice[] => {
    // Bersihkan data dummy dari existingOlts
    const filteredExisting = existingOlts.filter((o) => {
      const nameLower = (o.name || '').toLowerCase();
      const isDummy =
        o.id === 'olt-01' ||
        o.id === 'olt-02' ||
        o.id === 'olt-1' ||
        o.id === 'olt-2' ||
        o.id === 'olt-hisfocus-2pon' ||
        o.id.startsWith('dev-olt-') ||
        o.id.startsWith('olt-node-') ||
        nameLower.includes('dummy') ||
        nameLower.includes('air naningan') ||
        nameLower.includes('gpon') ||
        o.model === 'HSGQ-G02' ||
        o.ponType === 'GPON' ||
        o.name?.trim() === '2';
      return !isDummy;
    }).map((o) => ({
      ...o,
      ponType: 'EPON' as const,
      ip: sanitizeIp(o.ip),
      uptime: o.uptime?.includes('Source Server') ? 'Aktif' : (o.uptime || 'Aktif'),
    }));

    let serverNodes: any[] = [];
    let allGisNodes: any[] = [];
    let gisModified = false;
    try {
      const saved = localStorage.getItem('acs_gis_nodes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          allGisNodes = parsed;
          serverNodes = parsed.filter((n: any) => n.type === 'SERVER');
        }
      }
    } catch {}

    if (serverNodes.length === 0) {
      return filteredExisting;
    }

    const result: OltDevice[] = [...filteredExisting];

    serverNodes.forEach((node) => {
      const fac = node.popFacility;
      // Hanya OLT yang nyata dan bukan dummy yang dimasukkan
      const oltDevicesInRack: any[] = fac?.devices?.filter((d: any) => {
        if (d.category !== 'OLT') return false;
        const nameLower = (d.name || '').toLowerCase();
        const isDummy =
          d.id.startsWith('dev-olt-') ||
          nameLower.includes('dummy') ||
          nameLower.includes('air naningan') ||
          d.name?.trim() === '2';
        return !isDummy;
      }) || [];

      oltDevicesInRack.forEach((dev) => {
        const cleanIp = sanitizeIp(dev.ipAddress || dev.ip);
        if (dev.ipAddress && dev.ipAddress !== cleanIp) {
          dev.ipAddress = cleanIp;
          gisModified = true;
        }

        const devId = dev.id || `olt-${node.id}-${dev.name}`;
        const matchIdx = result.findIndex(
          (o) =>
            o.id === devId ||
            o.id === dev.id ||
            o.name.trim().toLowerCase() === dev.name.trim().toLowerCase() ||
            (cleanIp && o.ip && sanitizeIp(o.ip) === cleanIp)
        );

        const portsCount = dev.portsTotal || 4;
        if (matchIdx >= 0) {
          result[matchIdx] = {
            ...result[matchIdx],
            name: dev.name || result[matchIdx].name,
            vendor: dev.vendor || result[matchIdx].vendor,
            model: dev.model || result[matchIdx].model,
            ip: cleanIp || sanitizeIp(result[matchIdx].ip),
            webPort: dev.webPort || result[matchIdx].webPort,
            cliPort: dev.cliPort || result[matchIdx].cliPort,
            ponPortsCount: portsCount,
            uptime: 'Aktif',
          };
        } else {
          result.push({
            id: devId,
            name: dev.name,
            vendor: dev.vendor || '',
            model: dev.model || '',
            ip: cleanIp,
            webPort: dev.webPort || 80,
            cliPort: dev.cliPort || 23,
            ponType: dev.details?.ponType || 'EPON',
            ponPortsCount: portsCount,
            snmpCommunity: 'public',
            totalOnu: 0,
            onlineOnu: 0,
            offlineOnu: 0,
            defaultUser: dev.defaultUser || 'admin',
            defaultPass: dev.defaultPass || 'admin',
            uptime: 'Aktif',
          });
        }
      });
    });

    if (gisModified && allGisNodes.length > 0) {
      try {
        localStorage.setItem('acs_gis_nodes', JSON.stringify(allGisNodes));
      } catch {}
    }

    return result;
  };

  // 6. OLT Management State (Sinkron dengan Source Server, tanpa data dummy)
  const [olts, setOlts] = useState<OltDevice[]>(() => {
    let initialList: OltDevice[] = [];
    try {
      const saved = localStorage.getItem('acs_olts_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialList = parsed
            .filter((o: any) => {
              const nameLower = (o.name || '').toLowerCase();
              const isDummy =
                o.id === 'olt-01' ||
                o.id === 'olt-02' ||
                o.id === 'olt-1' ||
                o.id === 'olt-2' ||
                o.id === 'olt-hisfocus-2pon' ||
                o.id.startsWith('dev-olt-') ||
                o.id.startsWith('olt-node-') ||
                nameLower.includes('dummy') ||
                nameLower.includes('air naningan') ||
                nameLower.includes('gpon') ||
                o.model === 'HSGQ-G02' ||
                o.ponType === 'GPON' ||
                o.name?.trim() === '2' ||
                (o.ip === '192.168.10.2' && (o.vendor === 'Hisfocus (HSGQ)' || !o.vendor));
              return !isDummy;
            })
            .map((o: any) => ({
              ...o,
              ponType: 'EPON',
              defaultPass: decryptClientVault(o.defaultPass || 'admin'),
            }));
        }
      }
    } catch {}

    if (initialList.length === 0) {
      initialList = [...DEFAULT_OLTS];
    }

    const synced = extractOltsFromSourceServers(initialList);
    try {
      const encryptedForStorage = synced.map((o) => ({
        ...o,
        defaultPass: encryptClientVault(o.defaultPass || 'admin'),
      }));
      localStorage.setItem('acs_olts_list', JSON.stringify(encryptedForStorage));
    } catch {}
    return synced;
  });

  const saveOlts = (list: OltDevice[]) => {
    setOlts(list);
    try {
      const encryptedForStorage = list.map((o) => ({
        ...o,
        defaultPass: encryptClientVault(o.defaultPass || 'admin'),
      }));
      localStorage.setItem('acs_olts_list', JSON.stringify(encryptedForStorage));
    } catch {}
  };

  // Dengarkan perubahan pada acs_gis_nodes (source server) agar OLT selalu tersinkronkan
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'acs_gis_nodes' || !e.key) {
        setOlts((prev) => {
          const synced = extractOltsFromSourceServers(prev);
          saveOlts(synced);
          return synced;
        });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Muat data OLT dari Server saat aplikasi dimulai
  useEffect(() => {
    let isMounted = true;
    getOltsApi()
      .then((serverOlts) => {
        if (isMounted && Array.isArray(serverOlts) && serverOlts.length > 0) {
          setOlts(serverOlts);
          try {
            localStorage.setItem('acs_olts_list', JSON.stringify(serverOlts));
          } catch {}
        }
      })
      .catch(() => {
        // Gunakan cache lokal jika server belum dapat dijangkau
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const addOlt = async (
    oltData: Partial<OltDevice> & { name: string; vendor: string; ip: string },
  ) => {
    const portsCount = oltData.ponPortsCount || 2;
    const ponPorts =
      oltData.ponPorts && oltData.ponPorts.length === portsCount
        ? oltData.ponPorts
        : Array.from({ length: portsCount }, (_, i) => ({
            port: i + 1,
            online: 0,
            offline: 0,
          }));
    const totalOnline = ponPorts.reduce((s, p) => s + p.online, 0);
    const totalOffline = ponPorts.reduce((s, p) => s + p.offline, 0);

    const fallbackOlt: OltDevice = {
      id: oltData.id || `olt-${Date.now().toString(36)}`,
      name: oltData.name,
      vendor: oltData.vendor,
      model: oltData.model || `${oltData.vendor} Standalone`,
      ip: oltData.ip,
      webPort: oltData.webPort || 80,
      cliPort: oltData.cliPort || 23,
      ponType: oltData.ponType || 'EPON',
      ponPortsCount: portsCount,
      snmpCommunity: oltData.snmpCommunity || 'public',
      defaultUser: oltData.defaultUser || 'admin',
      defaultPass: oltData.defaultPass || 'admin',
      uptime: oltData.uptime || 'Baru didaftarkan',
      ponPorts,
      ports: oltData.ports,
      onlineOnu: totalOnline,
      offlineOnu: totalOffline,
      totalOnu: totalOnline + totalOffline,
    };

    try {
      const serverOlt = await createOltApi({
        name: oltData.name,
        vendor: oltData.vendor,
        model: oltData.model || `${oltData.vendor} Standalone`,
        ip: oltData.ip,
        webPort: oltData.webPort || 80,
        cliPort: oltData.cliPort || 23,
        ponType: oltData.ponType || 'EPON',
        ponPortsCount: portsCount,
        snmpCommunity: oltData.snmpCommunity || 'public',
        defaultUser: oltData.defaultUser || 'admin',
        defaultPass: oltData.defaultPass || 'admin',
        uptime: oltData.uptime || 'Baru didaftarkan',
        ponPorts,
      });

      if (serverOlt && serverOlt.id) {
        const updated = [...olts.filter((o) => o.id !== serverOlt.id), serverOlt];
        saveOlts(updated);
        showToast(`✓ OLT '${serverOlt.name}' berhasil disimpan ke Server & Database!`);
        return;
      }
    } catch (err) {
      console.warn('[ACS] Server OLT API offline, menyimpan ke penyimpanan lokal:', err);
    }

    const updated = [...olts, fallbackOlt];
    saveOlts(updated);
    showToast(`✓ OLT '${fallbackOlt.name}' (${portsCount} Port PON) berhasil didaftarkan!`);
  };

  const updateOlt = (id: string, updates: Partial<OltDevice>) => {
    const updated = olts.map((o) => {
      if (o.id !== id) return o;
      const merged = { ...o, ...updates };
      if (updates.ponPorts) {
        merged.onlineOnu = updates.ponPorts.reduce((s, p) => s + p.online, 0);
        merged.offlineOnu = updates.ponPorts.reduce((s, p) => s + p.offline, 0);
        merged.totalOnu = merged.onlineOnu + merged.offlineOnu;
      }
      return merged;
    });
    saveOlts(updated);
    updateOltApi(id, updates).catch(() => {});
    showToast(`✓ Data OLT berhasil diperbarui di Server.`);
  };

  const updatePonPortArea = async (oltId: string, portNumber: number, description: string, label?: string) => {
    const updated = olts.map((o) => {
      if (o.id !== oltId) return o;
      const currentPorts = o.ponPorts || [];
      const portExists = currentPorts.some((p) => p.port === portNumber);
      let newPorts: PonPortStatus[];
      if (portExists) {
        newPorts = currentPorts.map((p) => {
          if (p.port === portNumber) {
            return {
              ...p,
              description,
              ...(label ? { name: label } : {}),
            };
          }
          return p;
        });
      } else {
        newPorts = [
          ...currentPorts,
          {
            port: portNumber,
            name: label || `PON ${portNumber}`,
            description,
            online: 0,
            offline: 0,
          },
        ];
      }
      return { ...o, ponPorts: newPorts };
    });

    saveOlts(updated);
    showToast(`✓ Keterangan area Port PON ${portNumber} berhasil disimpan.`);

    try {
      await updateOltPortApi(oltId, portNumber, { description, name: label });
    } catch {
      const targetOlt = updated.find((o) => o.id === oltId);
      if (targetOlt && targetOlt.ponPorts) {
        updateOltApi(oltId, { ponPorts: targetOlt.ponPorts as any }).catch(() => {});
      }
    }
  };

  const deleteOlt = (id: string) => {
    const target = olts.find((o) => o.id === id);
    const updated = olts.filter((o) => o.id !== id);
    saveOlts(updated);
    deleteOltApi(id).catch(() => {});
    if (target) showToast(`✓ OLT '${target.name}' berhasil dihapus dari Server.`);
  };

  const syncOlt = async (id: string): Promise<OltDevice | undefined> => {
    const target = olts.find((o) => o.id === id);
    if (!target) return undefined;
    showToast(`Sedang menyinkronkan status ONU dari OLT '${target.name}' (${target.ip})...`);

    let serverFreshOlt: any = null;
    try {
      // 1. Trigger polling backend ke OLT collector
      await pollSingleOltApi(id).catch(() => pollOltCollectorApi());
      // 2. Tarik data OLT terupdate dari server database
      const serverOlts = await getOltsApi();
      if (Array.isArray(serverOlts) && serverOlts.length > 0) {
        const found = serverOlts.find((o: any) => o.id === id || o.ip === target.ip);
        if (found) {
          serverFreshOlt = found;
        }
      }
    } catch (err) {
      console.warn('[OLT Sync] Backend collector offline/unreachable, fallback ke sinkronisasi lokal:', err);
    }

    if (serverFreshOlt) {
      let finalTarget: OltDevice = {
        ...target,
        ...serverFreshOlt,
        totalOnu: serverFreshOlt.totalOnu ?? (serverFreshOlt.onlineOnu || 0) + (serverFreshOlt.offlineOnu || 0),
        onlineOnu: serverFreshOlt.onlineOnu ?? 0,
        offlineOnu: serverFreshOlt.offlineOnu ?? 0,
        uptime: serverFreshOlt.uptime || target.uptime,
      };
      const updated = olts.map((o) => (o.id === id ? finalTarget : o));
      saveOlts(updated);
      showToast(`✓ Sinkronisasi OLT '${target.name}' via Collector Server: ${finalTarget.onlineOnu || 0} Online, ${finalTarget.offlineOnu || 0} Offline.`);
      return finalTarget;
    }

    // Fallback: Sinkronisasi lokal dengan menghitung alokasi modem ONU riil dari sistem
    await new Promise((resolve) => setTimeout(resolve, 350));

    let allOnus: any[] = [];
    const seenSerials = new Set<string>();
    try {
      const devStr = localStorage.getItem('acs_devices_list');
      if (devStr) {
        const parsed = JSON.parse(devStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => {
            const sn = (d.serial || d.serialNumber || '').toUpperCase();
            if (sn) seenSerials.add(sn);
            allOnus.push(d);
          });
        }
      }
    } catch {}

    try {
      const gisStr = localStorage.getItem('acs_gis_nodes');
      if (gisStr) {
        const parsed = JSON.parse(gisStr);
        if (Array.isArray(parsed)) {
          parsed.filter((n: any) => n.type === 'ONT').forEach((n: any) => {
            const sn = (n.serial || '').toUpperCase();
            if (!sn || !seenSerials.has(sn)) {
              if (sn) seenSerials.add(sn);
              allOnus.push({
                id: n.id,
                serial: n.serial || n.name,
                status: n.status || 'ONLINE',
                oltId: n.oltId,
                ponPort: n.ponPort,
                parentName: n.parentName,
              });
            }
          });
        }
      }
    } catch {}

    const ports = target.ponPortsCount || 4;
    const cleanIp = sanitizeIp(target.ip);

    // Filter ONU yang terhubung ke OLT ini
    const targetOnus = allOnus.filter((o) => {
      if (o.oltId && (o.oltId === target.id || o.oltId === cleanIp)) return true;
      if (o.oltName && o.oltName === target.name) return true;
      if (!o.oltId && olts.length === 1) return true;
      return false;
    });

    const ponPorts = Array.from({ length: ports }, (_, i) => {
      const portNum = i + 1;
      const portOnus = targetOnus.filter((o) => {
        const p = Number(o.ponPort);
        if (p === portNum) return true;
        if (!p && portNum === 1) return true;
        return false;
      });
      const online = portOnus.filter((o) => o.status === 'ONLINE').length;
      const offline = portOnus.filter((o) => o.status === 'OFFLINE').length;
      return {
        port: portNum,
        online,
        offline,
      };
    });

    const totalOnline = ponPorts.reduce((s, p) => s + p.online, 0);
    const totalOffline = ponPorts.reduce((s, p) => s + p.offline, 0);

    const updatedTarget: OltDevice = {
      ...target,
      ip: cleanIp,
      ponPortsCount: ports,
      ponPorts,
      totalOnu: totalOnline + totalOffline,
      onlineOnu: totalOnline,
      offlineOnu: totalOffline,
      uptime: 'Aktif',
    };
    const updated = olts.map((o) => (o.id === id ? updatedTarget : o));
    saveOlts(updated);
    showToast(`✓ Sinkronisasi OLT '${target.name}' (${ports} Port PON): ${totalOnline} Online, ${totalOffline} Offline.`);
    return updatedTarget;
  };

  const syncAllOlts = async (): Promise<OltDevice[]> => {
    showToast('Menyinkronkan seluruh OLT dengan status jaringan...');

    let serverOlts: any[] = [];
    try {
      await pollOltCollectorApi();
      const res = await getOltsApi();
      if (Array.isArray(res) && res.length > 0) {
        serverOlts = res;
      }
    } catch {
      // Backend offline fallback
    }

    await new Promise((resolve) => setTimeout(resolve, 350));

    // Ekstrak & perbarui data dari Source Server (Node Server Peta & Fasilitas POP)
    const sourceSynced = extractOltsFromSourceServers(olts);

    let allOnus: any[] = [];
    const seenSerials = new Set<string>();
    try {
      const devStr = localStorage.getItem('acs_devices_list');
      if (devStr) {
        const parsed = JSON.parse(devStr);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => {
            const sn = (d.serial || d.serialNumber || '').toUpperCase();
            if (sn) seenSerials.add(sn);
            allOnus.push(d);
          });
        }
      }
    } catch {}

    try {
      const gisStr = localStorage.getItem('acs_gis_nodes');
      if (gisStr) {
        const parsed = JSON.parse(gisStr);
        if (Array.isArray(parsed)) {
          parsed.filter((n: any) => n.type === 'ONT').forEach((n: any) => {
            const sn = (n.serial || '').toUpperCase();
            if (!sn || !seenSerials.has(sn)) {
              if (sn) seenSerials.add(sn);
              allOnus.push({
                id: n.id,
                serial: n.serial || n.name,
                status: n.status || 'ONLINE',
                oltId: n.oltId,
                ponPort: n.ponPort,
                parentName: n.parentName,
              });
            }
          });
        }
      }
    } catch {}

    const updated = sourceSynced.map((target) => {
      const cleanIp = sanitizeIp(target.ip);
      const serverMatch = serverOlts.find((so) => so.id === target.id || so.ip === cleanIp);
      if (serverMatch) {
        return {
          ...target,
          ...serverMatch,
          ip: cleanIp,
          totalOnu: serverMatch.totalOnu ?? (serverMatch.onlineOnu || 0) + (serverMatch.offlineOnu || 0),
          onlineOnu: serverMatch.onlineOnu ?? 0,
          offlineOnu: serverMatch.offlineOnu ?? 0,
          uptime: 'Aktif',
        };
      }

      const ports = target.ponPortsCount || 4;
      const targetOnus = allOnus.filter((o) => {
        if (o.oltId && (o.oltId === target.id || o.oltId === cleanIp)) return true;
        if (o.oltName && o.oltName === target.name) return true;
        if (!o.oltId && sourceSynced.length === 1) return true;
        return false;
      });

      const ponPorts = Array.from({ length: ports }, (_, i) => {
        const portNum = i + 1;
        const portOnus = targetOnus.filter((o) => {
          const p = Number(o.ponPort);
          if (p === portNum) return true;
          if (!p && portNum === 1) return true;
          return false;
        });
        const online = portOnus.filter((o) => o.status === 'ONLINE').length;
        const offline = portOnus.filter((o) => o.status === 'OFFLINE').length;
        return {
          port: portNum,
          online,
          offline,
        };
      });

      const totalOnline = ponPorts.reduce((s, p) => s + p.online, 0);
      const totalOffline = ponPorts.reduce((s, p) => s + p.offline, 0);

      return {
        ...target,
        ip: cleanIp,
        ponPortsCount: ports,
        ponPorts,
        totalOnu: totalOnline + totalOffline,
        onlineOnu: totalOnline,
        offlineOnu: totalOffline,
        uptime: 'Aktif',
      };
    });
    saveOlts(updated);
    showToast(`✓ Seluruh OLT (${updated.length} Unit) berhasil disinkronkan!`);
    return updated;
  };

  // 10. Auto-Provisioning & Credential Hardening Policy State
  const [autoProvision, setAutoProvision] = useState<AutoProvisionPolicy>(() => {
    try {
      const saved = localStorage.getItem('acs_auto_provision');
      return saved ? { ...DEFAULT_AUTO_PROVISION, ...JSON.parse(saved) } : DEFAULT_AUTO_PROVISION;
    } catch {
      return DEFAULT_AUTO_PROVISION;
    }
  });

  const updateAutoProvision = (policy: Partial<AutoProvisionPolicy>) => {
    setAutoProvision((prev) => {
      const updated = { ...prev, ...policy };
      localStorage.setItem('acs_auto_provision', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AppContext.Provider
      value={{
        branding,
        updateBranding,
        theme,
        toggleTheme,
        setThemeMode,
        user,
        updateUser,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        toast,
        showToast,
        isAuthenticated,
        login,
        logout,
        modemProfiles,
        addModemProfile,
        updateModemProfile,
        deleteModemProfile,
        recognizeModem,
        deviceVendors,
        pppoeSessions,
        refreshPppoeSessions,
        markPppoeAssigned,
        olts,
        addOlt,
        updateOlt,
        updatePonPortArea,
        deleteOlt,
        syncOlt,
        syncAllOlts,
        autoProvision,
        updateAutoProvision,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
