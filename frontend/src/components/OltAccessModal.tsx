import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext, sanitizeIp } from '../context/AppContext';
import {
  Server,
  ExternalLink,
  Terminal,
  KeyRound,
  Copy,
  Check,
  X,
  Activity,
  Globe,
  RefreshCw,
  Sliders,
  AlertCircle,
  Laptop,
  Save,
  Eye,
  EyeOff,
  Settings,
  Shield,
  ShieldCheck,
  Lock,
  Network,
} from 'lucide-react';
import { decryptClientVault } from '../utils/crypto';

export interface OltDeviceData {
  id: string;
  name: string;
  vendor: string;
  model: string;
  ip: string;
  webPort?: number;
  cliPort?: number;
  ponType: string;
  ponPortsCount?: number;
  totalOnu?: number;
  onlineOnu?: number;
  offlineOnu?: number;
  defaultUser?: string;
  defaultPass?: string;
  snmpCommunity?: string;
  uptime?: string;
  ports?: {
    name: string;
    onuCount: number;
    txPower: string;
    status: 'UP' | 'DOWN';
  }[];
  ponPorts?: {
    port: number;
    name?: string;
    description?: string;
    online: number;
    offline: number;
  }[];
}

interface OltAccessModalProps {
  olt: OltDeviceData;
  onClose: () => void;
  onSync?: (id: string) => Promise<void>;
  onSave?: (updatedOlt: OltDeviceData) => void;
}

export const OltAccessModal: React.FC<OltAccessModalProps> = ({ olt, onClose, onSync, onSave }) => {
  const { updateOlt, showToast } = useAppContext();

  const [activeTab, setActiveTab] = useState<'config' | 'cli' | 'ports'>('config');

  // Form states
  const [name, setName] = useState(olt.name || 'OLT');
  const [vendor, setVendor] = useState(olt.vendor || 'Hisfocus (HSGQ)');
  const [model, setModel] = useState(olt.model || '');
  const [ponType, setPonType] = useState(olt.ponType || 'EPON');
  const [ponPortsCount, setPonPortsCount] = useState<number>(olt.ponPortsCount || 4);
  const [ipAddress, setIpAddress] = useState(sanitizeIp(olt.ip) || '192.168.10.2');
  const [port, setPort] = useState(olt.webPort || 80);
  const [cliPort, setCliPort] = useState(olt.cliPort || 23);
  const [protocol, setProtocol] = useState<'http' | 'https'>('http');
  const [username, setUsername] = useState(olt.defaultUser || 'admin');
  const [password, setPassword] = useState(() => decryptClientVault(olt.defaultPass || 'admin'));
  const [showPassword, setShowPassword] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Keterangan Area Port PON
  const [portDescriptions, setPortDescriptions] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    if (olt.ponPorts && Array.isArray(olt.ponPorts)) {
      olt.ponPorts.forEach((p) => {
        initial[p.port] = p.description || '';
      });
    }
    return initial;
  });

  // CLI Simulator State
  const [selectedCliCommand, setSelectedCliCommand] = useState('show running-config');
  const [cliOutput, setCliOutput] = useState<string>('');
  const [isExecutingCli, setIsExecutingCli] = useState(false);

  const cleanIp = sanitizeIp(ipAddress);
  const webUrl = `${protocol}://${cleanIp}${port && port !== 80 && port !== 443 ? `:${port}` : ''}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenWebGui = () => {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSave = () => {
    setIsSaving(true);
    const count = Number(ponPortsCount) || 4;
    const updatedPonPorts = Array.from({ length: count }, (_, i) => {
      const portNum = i + 1;
      const existing = olt.ponPorts?.find((p) => p.port === portNum);
      return {
        port: portNum,
        name: existing?.name || `PON ${portNum}`,
        description: portDescriptions[portNum] !== undefined ? portDescriptions[portNum] : existing?.description || '',
        online: existing?.online || 0,
        offline: existing?.offline || 0,
      };
    });

    const updatedData: OltDeviceData = {
      ...olt,
      name: name.trim() || 'OLT',
      vendor: vendor.trim() || 'Hisfocus (HSGQ)',
      model: model.trim(),
      ponType,
      ponPortsCount: count,
      ip: cleanIp || '192.168.10.2',
      webPort: Number(port) || 80,
      cliPort: Number(cliPort) || 23,
      defaultUser: username.trim() || 'admin',
      defaultPass: password.trim() || 'admin',
      ponPorts: updatedPonPorts,
    };

    // Update in AppContext
    updateOlt(olt.id, {
      name: updatedData.name,
      vendor: updatedData.vendor,
      model: updatedData.model,
      ponType: updatedData.ponType,
      ponPortsCount: updatedData.ponPortsCount,
      ip: updatedData.ip,
      webPort: updatedData.webPort,
      cliPort: updatedData.cliPort,
      defaultUser: updatedData.defaultUser,
      defaultPass: updatedData.defaultPass,
      ponPorts: updatedPonPorts,
    });

    if (onSave) {
      onSave(updatedData);
    }

    showToast(`✓ Pengaturan OLT '${updatedData.name}' berhasil disimpan!`);
    setIsSaving(false);
    onClose();
  };

  const executeCliCommand = (cmd: string) => {
    setSelectedCliCommand(cmd);
    setIsExecutingCli(true);
    setCliOutput(`Mengirim perintah ke OLT (${ipAddress}:${cliPort})...`);

    setTimeout(() => {
      setIsExecutingCli(false);
      const isEpon = ponType.toLowerCase().includes('epon');
      const prefix = isEpon ? 'EPON' : 'GPON';
      const count = ponPortsCount || 4;

      if (cmd.includes('onu-information')) {
        const rows = Array.from({ length: count }, (_, i) => 
          `${prefix} 0/${i + 1}   Port ${i + 1}   Link UP    Ready for ONU connection`
        );
        setCliOutput(`[OLT-CLI] # ${cmd}
--------------------------------------------------------------------------------
Port       Slot     Status     Keterangan
--------------------------------------------------------------------------------
${rows.join('\n')}
--------------------------------------------------------------------------------
Total: ${count} Port ${prefix} | Status: OPERATIONAL`);
      } else if (cmd.includes('optical-transceiver')) {
        const optRows = Array.from({ length: count }, (_, i) => 
          `${prefix} 0/${i + 1}   SFP Module   +5.20 dBm   -19.50 dBm   41.0 C   3.30 V`
        );
        setCliOutput(`[OLT-CLI] # ${cmd}
--------------------------------------------------------------------------------
Port       SFP Type     Tx Power (dBm)   Rx Power (dBm)   Temp(C)   Voltage(V)
--------------------------------------------------------------------------------
${optRows.join('\n')}
--------------------------------------------------------------------------------
Status Laser Optik: ALL NORMAL (${count} Port PON)`);
      } else if (cmd.includes('running-config')) {
        const intfs = Array.from({ length: count }, (_, i) => 
`interface ${isEpon ? 'epon' : 'gpon'} 0/${i + 1}
  description PON-PORT-${i + 1}
  no shutdown`
        ).join('\n!\n');

        setCliOutput(`[OLT-CLI] # show running-config
! Building configuration...
hostname ${name.replace(/\s+/g, '-')}
!
ip address ${ipAddress} 255.255.255.0
ip http port ${port}
ip telnet port ${cliPort}
!
${intfs}
!
snmp-server community public ro
end`);
      } else {
        setCliOutput(`[OLT-CLI] # ${cmd}\nPerintah berhasil dieksekusi. Status code: OK (200)`);
      }
    }, 350);
  };

  const defaultPorts = Array.from({ length: ponPortsCount || 4 }, (_, i) => {
    const portNum = i + 1;
    const existing = olt.ponPorts?.find((p) => p.port === portNum);
    return {
      portNum,
      name: existing?.name || `${ponType.toLowerCase().includes('gpon') ? 'GPON' : 'EPON'} 0/${portNum}`,
      onuCount: existing ? existing.online + existing.offline : 0,
      txPower: '+5.20 dBm',
      status: 'UP' as const,
      description: portDescriptions[portNum] ?? existing?.description ?? '',
    };
  });

  return createPortal(
    <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[calc(100vh-2.5rem)] mt-auto sm:my-auto shrink-0">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-dark-900/50 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {name || 'OLT Device'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                Online
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
              {vendor} {model ? `• ${model}` : ''} • {ponType} • {ponPortsCount} Port
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onSync && (
              <button
                type="button"
                onClick={async () => {
                  setIsSyncing(true);
                  try {
                    await onSync(olt.id);
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                title="Sinkronkan status dari OLT"
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-700 dark:hover:bg-dark-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-slate-700 dark:text-slate-200' : ''}`} />
                <span className="hidden sm:inline">Sinkronkan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-3 sm:px-5 bg-slate-50/30 dark:bg-dark-900/30 text-xs font-semibold shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'config'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Pengaturan & Web GUI</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('cli');
              if (!cliOutput) executeCliCommand('show running-config');
            }}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'cli'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Terminal CLI</span>
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 flex items-center gap-1.5 sm:gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === 'ports'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Port PON ({ponPortsCount})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'config' && (
            <div className="space-y-4 text-xs">
              {/* Akses Web GUI Card (Single prominent action button) */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    <span>Akses Halaman Login Web OLT</span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-1 truncate">
                    {webUrl}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Pastikan perangkat berada dalam satu segmen jaringan (subnet) dengan IP OLT.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenWebGui}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 force-white"
                >
                  <span>Buka Web OLT</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Parameter Perangkat OLT */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-dark-900/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Pengaturan Perangkat OLT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Nama Perangkat OLT *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: OLT Server Utama"
                      className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Vendor / Merk OLT
                    </label>
                    <select
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full h-[36px] bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
                    >
                      <option value="Hisfocus (HSGQ)">Hisfocus (HSGQ)</option>
                      <option value="HSGQ">HSGQ</option>
                      <option value="ZTE">ZTE</option>
                      <option value="Huawei">Huawei</option>
                      <option value="VSOL">VSOL</option>
                      <option value="BDCOM">BDCOM</option>
                      <option value="Fiberhome">Fiberhome</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Model / Tipe Perangkat
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Contoh: FD1204S-R2 / C320"
                      className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        Tipe PON
                      </label>
                      <select
                        value={ponType}
                        onChange={(e) => setPonType('EPON')}
                        className="w-full h-[36px] bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
                      >
                        <option value="EPON">EPON (1.25 Gbps)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        Port PON
                      </label>
                      <select
                        value={ponPortsCount}
                        onChange={(e) => setPonPortsCount(Number(e.target.value))}
                        className="w-full h-[36px] bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
                      >
                        <option value={2}>2 Port</option>
                        <option value={4}>4 Port</option>
                        <option value={8}>8 Port</option>
                        <option value={16}>16 Port</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parameter Jaringan & Port */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-dark-900/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Parameter IP Jaringan & Port Akses</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Protokol
                    </label>
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value as any)}
                      className="w-full h-[36px] bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-2.5 pr-8 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      IP Management OLT
                    </label>
                    <input
                      type="text"
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      placeholder="192.168.10.2"
                      className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        Port Web
                      </label>
                      <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                        Port CLI
                      </label>
                      <input
                        type="number"
                        value={cliPort}
                        onChange={(e) => setCliPort(Number(e.target.value))}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kredensial Login OLT */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-dark-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kredensial Login Administrator OLT</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Terenkripsi (AES-256)</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Username
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 pr-9 text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(username, 'user')}
                        className="absolute right-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Salin Username"
                      >
                        {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 pr-16 text-xs text-slate-900 dark:text-white font-mono font-semibold focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                      />
                      <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(password, 'pass')}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="Salin Password"
                        >
                          {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Sandi dienkripsi aman (AES-256 Encryption at Rest) &amp; tidak disimpan dalam bentuk teks polos.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cli' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs flex items-center justify-between border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <span>telnet {ipAddress} {cliPort || 23}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`telnet ${ipAddress} ${cliPort || 23}`, 'telnet')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'telnet' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'telnet' ? 'Tersalin' : 'Salin Perintah'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Perintah Cepat:</span>
                {[
                  'show running-config',
                  `show ${ponType.toLowerCase().includes('gpon') ? 'gpon' : 'epon'} onu-information`,
                  `show ${ponType.toLowerCase().includes('gpon') ? 'gpon' : 'epon'} optical-transceiver-diagnostics`,
                ].map((cmd) => (
                  <button
                    key={cmd}
                    type="button"
                    onClick={() => executeCliCommand(cmd)}
                    disabled={isExecutingCli}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-colors ${
                      selectedCliCommand === cmd
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {cmd}
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-dark-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-200 min-h-[220px] max-h-[300px] overflow-y-auto whitespace-pre leading-relaxed select-text shadow-inner">
                {cliOutput || 'Pilih salah satu perintah cepat di atas...'}
              </div>
            </div>
          )}

          {activeTab === 'ports' && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-500 dark:text-slate-400">
                <span>Daftar Port PON ({ponPortsCount} Port) &bull; Keterangan Wilayah / Area</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">Standar Transceiver: +2.0 s/d +7.0 dBm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {defaultPorts.map((p) => (
                  <div
                    key={p.portNum}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-dark-900/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white"></span>
                        <span>{p.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold">
                        {p.status}
                      </span>
                    </div>

                    {/* Input Area */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Area
                      </label>
                      <input
                        type="text"
                        value={portDescriptions[p.portNum] ?? ''}
                        onChange={(e) =>
                          setPortDescriptions({
                            ...portDescriptions,
                            [p.portNum]: e.target.value,
                          })
                        }
                        placeholder="Area"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-800 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-slate-900 dark:focus:ring-white focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 rounded bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">Status Port</span>
                        <span className="font-bold text-slate-900 dark:text-white">READY</span>
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">Daya SFP (TX)</span>
                        <span className="font-bold text-slate-900 dark:text-white">{p.txPower}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer (Simplified: No duplicate "Buka Web OLT", No fake "PX20++++" SFP) */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-dark-900/50 flex items-center justify-end gap-2 text-xs shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 force-white"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
