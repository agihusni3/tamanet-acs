import React, { useState, useMemo } from 'react';
import { Network, RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useAppContext, MikrotikPppoeSession } from '../context/AppContext';

interface MikrotikPppoeSelectorProps {
  selectedUsername?: string;
  onSelect: (session: MikrotikPppoeSession) => void;
  onClear?: () => void;
  excludeAssigned?: boolean;
  installedUsernames?: string[];
}

export const MikrotikPppoeSelector: React.FC<MikrotikPppoeSelectorProps> = ({
  selectedUsername,
  onSelect,
  onClear,
  excludeAssigned = true,
  installedUsernames,
}) => {
  const { pppoeSessions, refreshPppoeSessions } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedSession = pppoeSessions.find((s) => s.username === selectedUsername);

  // Filter keluar sesi PPPoE yang sudah terpasang/terdaftar sebagai ONT
  const availableSessions = useMemo(() => {
    return pppoeSessions.filter((s) => {
      // Sesi yang sedang aktif dipilih tetap ditampilkan
      if (selectedUsername && s.username === selectedUsername) {
        return true;
      }
      // Hilangkan jika username sudah terpasang di peta/perangkat
      if (installedUsernames && installedUsernames.includes(s.username)) {
        return false;
      }
      // Hilangkan jika sudah ditandai terpasang (assigned)
      if (excludeAssigned && s.isAssigned) {
        return false;
      }
      return true;
    });
  }, [pppoeSessions, selectedUsername, installedUsernames, excludeAssigned]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPppoeSessions();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5 text-slate-400" />
          <span>Akun PPPoE MikroTik (TR-069)</span>
          <span className="text-[10px] text-slate-400 font-normal">
            ({availableSessions.length} belum terpasang)
          </span>
        </label>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
          title="Sinkronkan dengan MikroTik BRAS"
        >
          <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-slate-300' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync MikroTik'}</span>
        </button>
      </div>

      <select
        value={selectedUsername || ''}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) {
            if (onClear) onClear();
          } else {
            const found = pppoeSessions.find((s) => s.username === val);
            if (found) onSelect(found);
          }
        }}
        className="w-full h-[38px] bg-dark-900 border border-slate-700 rounded-xl pl-3 pr-9 text-slate-200 focus:outline-none focus:border-slate-400 font-mono text-xs shadow-sm"
      >
        <option value="">
          {availableSessions.length === 0
            ? '-- Tidak ada sesi PPPoE yang belum terpasang --'
            : '-- Pilih Akun PPPoE (Auto-Fill) --'}
        </option>
        {availableSessions.map((s) => (
          <option key={s.id} value={s.username}>
            {s.username} — {s.customerName} ({s.manufacturer} {s.model})
          </option>
        ))}
      </select>

      {selectedSession && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-200">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              IP: <strong className="font-mono text-white">{selectedSession.ipAddress}</strong> &bull; Paket:{' '}
              <strong className="text-white">{selectedSession.profile}</strong>
            </span>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-slate-400 hover:text-white ml-2 p-0.5 rounded transition-colors shrink-0"
              title="Reset pilihan PPPoE"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
