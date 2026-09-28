import React from 'react';
import { AlertTriangle, Zap, CheckCircle2, ShieldAlert } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const alerts = [
    {
      id: 'a1',
      type: 'MASS_OUTAGE',
      severity: 'CRITICAL',
      message: 'Gangguan Massal (Kabel Feeder Putus): OLT Hioso Port EPON0/1 kehilangan 8 modem secara bersamaan.',
      time: '10 menit yang lalu',
      status: 'ACTIVE',
    },
    {
      id: 'a2',
      type: 'DYING_GASP',
      severity: 'WARNING',
      message: 'Pemadaman Listrik Pelanggan: Warung Dewa & 2 pelanggan terdekat mengalami Dying-Gasp.',
      time: '25 menit yang lalu',
      status: 'ACTIVE',
    },
    {
      id: 'a3',
      type: 'OPTICAL_LOW',
      severity: 'WARNING',
      message: 'Redaman Optik Kritis (-27.4 dBm) pada modem Lapak Rudy Sayur. Risiko koneksi terputus.',
      time: '1 jam yang lalu',
      status: 'RESOLVED',
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Gangguan & Alarm Jaringan</h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Deteksi otomatis kabel optik putus, pemadaman listrik (Dying Gasp), dan sinyal optik drop
        </p>
      </div>

      <div className="space-y-3">
        {alerts.map((al) => (
          <div
            key={al.id}
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              al.severity === 'CRITICAL'
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                : al.status === 'RESOLVED'
                ? 'bg-dark-800 border-slate-800 text-slate-400'
                : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  al.severity === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {al.type === 'DYING_GASP' ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider">{al.type}</span>
                  <span className="text-[10px] text-slate-400 font-mono">&bull; {al.time}</span>
                </div>
                <p className="text-xs mt-1 text-slate-200 leading-relaxed">{al.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {al.status === 'ACTIVE' ? (
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors">
                  Acknowledge
                </button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
