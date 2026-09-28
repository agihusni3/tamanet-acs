import React from 'react';
import { Settings, Shield, Bell, Database, Radio } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Pengaturan Sistem ACS & OLT</h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Kelola profil modem Huawei / Zimlink, kredensial OLT Hioso & Hisfocus, dan notifikasi Telegram
        </p>
      </div>

      <div className="space-y-6">
        {/* OLT Configuration */}
        <div className="bg-dark-800 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-700/80 pb-3">
            <Radio className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Konfigurasi OLT</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Merek OLT 1</label>
              <input
                type="text"
                disabled
                value="Hioso EPON 4-Port (192.168.10.2)"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Merek OLT 2</label>
              <input
                type="text"
                disabled
                value="Hisfocus / HSGQ EPON 8-Port (192.168.10.3)"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Telegram Notifications */}
        <div className="bg-dark-800 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-700/80 pb-3">
            <Bell className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Notifikasi Bot Telegram</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Telegram Bot Token</label>
              <input
                type="text"
                placeholder="123456789:AAFg..."
                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Chat ID Group NOC</label>
              <input
                type="text"
                placeholder="-100123456789"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
