import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAppContext, NotificationItem } from '../context/AppContext';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
  } = useAppContext();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'FAULTS'>('ALL');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'UNREAD') return !item.read;
    if (activeFilter === 'FAULTS') return item.type === 'FAULT' || item.type === 'WARNING';
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'FAULT':
        return <AlertTriangle className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-slate-700 dark:text-slate-300" />;
    }
  };

  const getBgColor = (_type: NotificationItem['type']) => {
    return 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700';
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markNotificationAsRead(item.id);
    }
    if (item.targetTab && onNavigateTab) {
      onNavigateTab(item.targetTab);
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="fixed sm:absolute top-16 sm:top-12 left-3 right-3 sm:left-auto sm:right-0 sm:w-[380px] max-h-[82vh] bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl z-[2500] flex flex-col overflow-hidden animate-slideIn backdrop-blur-xl"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between bg-slate-50/80 dark:bg-dark-900/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Notifikasi Sistem</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-[10px] font-bold border border-slate-300 dark:border-slate-600">
                  {unreadNotificationsCount} Baru
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Peringatan real-time TR-069 & OLT</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadNotificationsCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              title="Tandai semua sudah dibaca"
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-xs flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              title="Hapus semua riwayat"
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-dark-900/40 text-[11px] font-semibold">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            activeFilter === 'ALL'
              ? 'btn-dark bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm force-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          Semua ({notifications.length})
        </button>

        <button
          onClick={() => setActiveFilter('UNREAD')}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            activeFilter === 'UNREAD'
              ? 'btn-dark bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm force-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          Belum Dibaca ({unreadNotificationsCount})
        </button>

        <button
          onClick={() => setActiveFilter('FAULTS')}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            activeFilter === 'FAULTS'
              ? 'btn-dark bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm force-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          Alert
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-400 dark:text-slate-600" />
            <span className="text-xs">Tidak ada notifikasi saat ini</span>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3 sm:p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${
                !item.read ? 'bg-slate-50/80 dark:bg-slate-800/60' : 'bg-transparent'
              }`}
            >
              <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${getBgColor(item.type)}`}>
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span
                    className={`text-xs font-bold truncate ${
                      !item.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.title}
                  </span>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white shrink-0"></span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>

                <div className="flex items-center justify-between mt-1.5 pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>{item.time}</span>
                  {item.targetTab && (
                    <span className="text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-medium flex items-center gap-0.5">
                      Lihat Detail <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-dark-900/60 text-center">
        <button
          onClick={() => {
            onNavigateTab?.('faults');
            onClose();
          }}
          className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold inline-flex items-center gap-1"
        >
          Buka Halaman Faults & Alerts <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
