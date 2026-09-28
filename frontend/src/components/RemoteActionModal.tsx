import React, { useState } from 'react';
import { X, RefreshCw, Power, AlertTriangle, Wifi, Key, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface RemoteActionModalProps {
  device: any;
  actionType: 'reboot' | 'factoryReset' | 'wifi' | 'pppoe' | 'refresh';
  onClose: () => void;
  onSuccess?: () => void;
}

export const RemoteActionModal: React.FC<RemoteActionModalProps> = ({
  device,
  actionType,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [band, setBand] = useState<'2.4' | '5'>('2.4');
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [pppoeUser, setPppoeUser] = useState('');
  const [pppoePassword, setPppoePassword] = useState('');

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let res;
      if (actionType === 'reboot') {
        res = await api.post(`/devices/${device.id}/reboot`);
      } else if (actionType === 'factoryReset') {
        res = await api.post(`/devices/${device.id}/factory-reset`);
      } else if (actionType === 'wifi') {
        res = await api.post(`/devices/${device.id}/wifi`, {
          band,
          ssid: ssid || undefined,
          password: wifiPassword || undefined,
        });
      } else if (actionType === 'pppoe') {
        res = await api.post(`/devices/${device.id}/pppoe`, {
          username: pppoeUser || undefined,
          password: pppoePassword || undefined,
        });
      } else if (actionType === 'refresh') {
        res = await api.post(`/devices/${device.id}/refresh`);
      }

      setSuccessMsg(res?.data?.message || 'Perintah berhasil dikirim ke perangkat');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Gagal mengeksekusi aksi remote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-dark-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            {actionType === 'reboot' && <Power className="w-5 h-5 text-amber-400" />}
            {actionType === 'factoryReset' && <AlertTriangle className="w-5 h-5 text-rose-500" />}
            {actionType === 'wifi' && <Wifi className="w-5 h-5 text-brand-400" />}
            {actionType === 'pppoe' && <Key className="w-5 h-5 text-purple-400" />}
            {actionType === 'refresh' && <RefreshCw className="w-5 h-5 text-cyan-400" />}
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                {actionType === 'reboot' && 'Remote Reboot Modem'}
                {actionType === 'factoryReset' && 'Factory Reset (Setelan Pabrik)'}
                {actionType === 'wifi' && 'Ubah Konfigurasi Wi-Fi'}
                {actionType === 'pppoe' && 'Ubah Akun PPPoE'}
                {actionType === 'refresh' && 'Refresh Parameter TR-069'}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {device?.serial} &bull; {device?.model || 'Huawei/Zimlink'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {actionType === 'reboot' && (
          <div className="text-xs text-slate-300 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl leading-relaxed">
            Apakah Anda yakin ingin me-reboot modem pelanggan ini? Koneksi internet akan terputus sementara selama kurang lebih 1-2 menit.
          </div>
        )}

        {actionType === 'factoryReset' && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl leading-relaxed">
            <strong className="block text-rose-400 font-semibold mb-1">PERINGATAN KRITIS:</strong>
            Factory reset akan menghapus seluruh konfigurasi modem (SSID, password, VLAN, akun PPPoE) dan mengembalikan perangkat ke setelan pabrik awal.
          </div>
        )}

        {actionType === 'wifi' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Frekuensi Wi-Fi</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBand('2.4')}
                  className={`py-2 rounded-lg font-medium border text-center ${
                    band === '2.4'
                      ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                      : 'bg-dark-900 border-slate-700 text-slate-400'
                  }`}
                >
                  2.4 GHz (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setBand('5')}
                  className={`py-2 rounded-lg font-medium border text-center ${
                    band === '5'
                      ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                      : 'bg-dark-900 border-slate-700 text-slate-400'
                  }`}
                >
                  5 GHz (Dual Band)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Nama Wi-Fi (SSID)</label>
              <input
                type="text"
                placeholder="Contoh: INTERNET_RUMAH"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password Baru (Minimal 8 karakter)</label>
              <input
                type="text"
                placeholder="Kata sandi baru..."
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {actionType === 'pppoe' && (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Username PPPoE</label>
              <input
                type="text"
                placeholder="user01@isp"
                value={pppoeUser}
                onChange={(e) => setPppoeUser(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password PPPoE</label>
              <input
                type="password"
                placeholder="Password PPPoE..."
                value={pppoePassword}
                onChange={(e) => setPppoePassword(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg transition-all ${
              actionType === 'factoryReset'
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/30'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Mengirim...' : 'Eksekusi Sekarang'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
