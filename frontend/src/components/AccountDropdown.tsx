import React, { useRef, useEffect } from 'react';
import {
  User,
  Shield,
  Settings,
  LogOut,
  Sparkles,
  Key,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface AccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditProfile: () => void;
  onOpenBranding: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  isOpen,
  onClose,
  onOpenEditProfile,
  onOpenBranding,
  onNavigateTab,
}) => {
  const { user, showToast, logout } = useAppContext();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin logout dari sesi administrator?')) {
      logout();
      showToast('Sesi administrator telah diakhiri.');
      onClose();
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-14 sm:top-12 right-0 w-[280px] sm:w-[320px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl z-[2500] flex flex-col overflow-hidden animate-slideIn backdrop-blur-xl"
    >
      {/* User Info Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 bg-gradient-to-b from-slate-50 dark:from-slate-800/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-lg font-extrabold border border-slate-300 dark:border-slate-700 shadow-sm shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</span>
              <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white shrink-0" title="Online"></span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{user.email}</p>
            <div className="mt-1 flex items-center gap-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider bg-slate-100 dark:bg-dark-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {user.role}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">&bull; ACS Full Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="p-2 space-y-1 text-xs">
        <button
          onClick={() => {
            onOpenEditProfile();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left group"
        >
          <User className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
          <div className="flex-1">
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Edit Profil Akun</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Ubah nama, email & password</div>
          </div>
        </button>

        <button
          onClick={() => {
            onOpenBranding();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left group"
        >
          <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
          <div className="flex-1">
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Ganti Logo & Nama ISP</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Kustomisasi identitas aplikasi</div>
          </div>
        </button>

        <button
          onClick={() => {
            onNavigateTab?.('settings');
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left group"
        >
          <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors" />
          <div className="flex-1">
            <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">Pengaturan Sistem</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">OLT, TR-069 & Bot Telegram</div>
          </div>
        </button>
      </div>

      {/* Footer / Logout */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-dark-900/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors font-semibold text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar dari Sesi</span>
        </button>
      </div>
    </div>
  );
};
