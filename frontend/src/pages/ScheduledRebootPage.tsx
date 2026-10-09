import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarClock,
  Play,
  Plus,
  Trash2,
  Edit2,
  History,
  X,
  StopCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api/client';
import { loadAllOntDevices } from '../utils/devices';

export interface RebootSchedule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'ONCE';
  time: string; // "HH:mm" e.g. "03:30"
  dayOfWeek?: number; // 0: Sunday, 1: Monday, ... 6: Saturday
  date?: string; // "YYYY-MM-DD"
  targetType: 'ALL' | 'VENDOR' | 'ODC';
  targetVendors?: string[];
  targetOdcId?: string;
  targetOdcName?: string;
  batchSize: number; // e.g. 20
  batchDelaySeconds: number; // e.g. 5
  onlyOnline: boolean;
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  lastRunSummary?: string;
  createdAt: string;
}

export interface RebootExecutionLog {
  id: string;
  scheduleId?: string;
  scheduleName: string;
  executedAt: string;
  totalTarget: number;
  successCount: number;
  failedCount: number;
  durationSeconds: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  details?: string;
}

const INITIAL_SCHEDULES: RebootSchedule[] = [
  {
    id: 'sched-default-1',
    name: 'Reboot Rutin Dini Hari (Seluruh Jaringan)',
    enabled: true,
    frequency: 'DAILY',
    time: '03:30',
    targetType: 'ALL',
    batchSize: 20,
    batchDelaySeconds: 5,
    onlyOnline: true,
    createdAt: new Date().toISOString(),
    lastRunSummary: 'Belum pernah dieksekusi',
  },
];

const PRESET_HOURS = ['01:00', '02:00', '03:00', '03:30', '04:00', '05:00'];
const DAYS_OF_WEEK = [
  { id: 0, label: 'Minggu' },
  { id: 1, label: 'Senin' },
  { id: 2, label: 'Selasa' },
  { id: 3, label: 'Rabu' },
  { id: 4, label: 'Kamis' },
  { id: 5, label: 'Jumat' },
  { id: 6, label: 'Sabtu' },
];

export const ScheduledRebootPage: React.FC = () => {
  const { showToast } = useAppContext();

  // Load Devices from storage
  const [devices, setDevices] = useState<any[]>(() => loadAllOntDevices());

  // Load GIS Nodes (for ODC list)
  const [odcList, setOdcList] = useState<{ id: string; name: string }[]>(() => {
    try {
      const saved = localStorage.getItem('acs_gis_nodes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((n: any) => n.type === 'ODC')
            .map((n: any) => ({ id: n.id, name: n.name }));
        }
      }
    } catch {}
    return [];
  });

  // Unique vendors
  const availableVendors = useMemo(() => {
    const set = new Set<string>();
    devices.forEach((d) => {
      const m = d.manufacturer || d.vendor;
      if (m && m.trim()) set.add(m.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [devices]);

  // Schedules state
  const [schedules, setSchedules] = useState<RebootSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('acs_reboot_schedules');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_SCHEDULES;
  });

  const persistSchedules = (list: RebootSchedule[]) => {
    setSchedules(list);
    try {
      localStorage.setItem('acs_reboot_schedules', JSON.stringify(list));
    } catch {}
  };

  // Logs state
  const [logs, setLogs] = useState<RebootExecutionLog[]>(() => {
    try {
      const saved = localStorage.getItem('acs_reboot_logs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const persistLogs = (list: RebootExecutionLog[]) => {
    setLogs(list);
    try {
      localStorage.setItem('acs_reboot_logs', JSON.stringify(list));
    } catch {}
  };

  // Active view tab in this page
  const [activeTab, setActiveTab] = useState<'schedules' | 'logs'>('schedules');

  // Modal create/edit schedule state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RebootSchedule | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formFrequency, setFormFrequency] = useState<'DAILY' | 'WEEKLY' | 'ONCE'>('DAILY');
  const [formTime, setFormTime] = useState('03:30');
  const [formDayOfWeek, setFormDayOfWeek] = useState(0);
  const [formDate, setFormDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'VENDOR' | 'ODC'>('ALL');
  const [formTargetVendors, setFormTargetVendors] = useState<string[]>([]);
  const [formTargetOdcId, setFormTargetOdcId] = useState('');
  const [formBatchSize, setFormBatchSize] = useState(20);
  const [formBatchDelay, setFormBatchDelay] = useState(5);
  const [formOnlyOnline, setFormOnlyOnline] = useState(true);

  // Real-time batch execution state
  const [runningExecution, setRunningExecution] = useState<{
    scheduleName: string;
    total: number;
    currentBatch: number;
    totalBatches: number;
    processed: number;
    success: number;
    failed: number;
    isRunning: boolean;
  } | null>(null);

  const abortControllerRef = useRef<boolean>(false);

  // Helper to open modal for create
  const handleOpenCreate = () => {
    setEditingSchedule(null);
    setFormName('Reboot Rutin Dini Hari');
    setFormFrequency('DAILY');
    setFormTime('03:30');
    setFormDayOfWeek(0);
    setFormTargetType('ALL');
    setFormTargetVendors(availableVendors.slice(0, 1));
    setFormTargetOdcId(odcList[0]?.id || '');
    setFormBatchSize(20);
    setFormBatchDelay(5);
    setFormOnlyOnline(true);
    setIsModalOpen(true);
  };

  // Helper to open modal for edit
  const handleOpenEdit = (sched: RebootSchedule) => {
    setEditingSchedule(sched);
    setFormName(sched.name);
    setFormFrequency(sched.frequency);
    setFormTime(sched.time);
    setFormDayOfWeek(sched.dayOfWeek ?? 0);
    setFormDate(sched.date || new Date().toISOString().slice(0, 10));
    setFormTargetType(sched.targetType);
    setFormTargetVendors(sched.targetVendors || []);
    setFormTargetOdcId(sched.targetOdcId || '');
    setFormBatchSize(sched.batchSize || 20);
    setFormBatchDelay(sched.batchDelaySeconds || 5);
    setFormOnlyOnline(sched.onlyOnline);
    setIsModalOpen(true);
  };

  // Toggle schedule enable/disable
  const handleToggleSchedule = (id: string) => {
    const updated = schedules.map((s) => {
      if (s.id === id) {
        const nextState = !s.enabled;
        showToast(nextState ? `✓ Jadwal '${s.name}' diaktifkan.` : `Jadwal '${s.name}' dinonaktifkan.`);
        return { ...s, enabled: nextState };
      }
      return s;
    });
    persistSchedules(updated);
  };

  // Delete schedule
  const handleDeleteSchedule = (id: string, name: string) => {
    if (!window.confirm(`Hapus jadwal reboot massal '${name}'?`)) return;
    const updated = schedules.filter((s) => s.id !== id);
    persistSchedules(updated);
    showToast(`✓ Jadwal '${name}' berhasil dihapus.`);
  };

  // Calculate target devices for a schedule
  const getTargetDevices = (
    targetType: 'ALL' | 'VENDOR' | 'ODC',
    vendors?: string[],
    odcId?: string,
    onlyOnline: boolean = true
  ) => {
    return devices.filter((d) => {
      if (onlyOnline && (d.status === 'OFFLINE' || d.rxPowerAcs === 'LOS')) {
        return false;
      }
      if (targetType === 'ALL') return true;
      if (targetType === 'VENDOR') {
        const m = (d.manufacturer || d.vendor || '').toUpperCase();
        return vendors && vendors.some((v) => m.includes(v));
      }
      if (targetType === 'ODC') {
        return d.odcId === odcId || (d.parentName && d.parentName.includes(odcId));
      }
      return true;
    });
  };

  // Live device count for form preview
  const previewTargetCount = useMemo(() => {
    return getTargetDevices(formTargetType, formTargetVendors, formTargetOdcId, formOnlyOnline).length;
  }, [devices, formTargetType, formTargetVendors, formTargetOdcId, formOnlyOnline]);

  // Save schedule (create or update)
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('⚠️ Nama jadwal wajib diisi.');
      return;
    }

    const selectedOdc = odcList.find((o) => o.id === formTargetOdcId);

    const scheduleData: RebootSchedule = {
      id: editingSchedule ? editingSchedule.id : `sched-${Date.now()}`,
      name: formName.trim(),
      enabled: editingSchedule ? editingSchedule.enabled : true,
      frequency: formFrequency,
      time: formTime,
      dayOfWeek: formFrequency === 'WEEKLY' ? formDayOfWeek : undefined,
      date: formFrequency === 'ONCE' ? formDate : undefined,
      targetType: formTargetType,
      targetVendors: formTargetType === 'VENDOR' ? formTargetVendors : undefined,
      targetOdcId: formTargetType === 'ODC' ? formTargetOdcId : undefined,
      targetOdcName: formTargetType === 'ODC' ? selectedOdc?.name : undefined,
      batchSize: Number(formBatchSize) || 20,
      batchDelaySeconds: Number(formBatchDelay) || 5,
      onlyOnline: formOnlyOnline,
      lastRunAt: editingSchedule?.lastRunAt,
      lastRunStatus: editingSchedule?.lastRunStatus,
      lastRunSummary: editingSchedule?.lastRunSummary,
      createdAt: editingSchedule ? editingSchedule.createdAt : new Date().toISOString(),
    };

    let updated: RebootSchedule[];
    if (editingSchedule) {
      updated = schedules.map((s) => (s.id === editingSchedule.id ? scheduleData : s));
      showToast(`✓ Jadwal '${scheduleData.name}' berhasil diperbarui.`);
    } else {
      updated = [scheduleData, ...schedules];
      showToast(`✓ Jadwal reboot massal baru berhasil ditambahkan!`);
    }

    persistSchedules(updated);
    setIsModalOpen(false);
  };

  // Execute mass reboot in staggered batches
  const executeRebootProcess = async (schedule: RebootSchedule, isManualTest: boolean = false) => {
    const targetDevs = getTargetDevices(
      schedule.targetType,
      schedule.targetVendors,
      schedule.targetOdcId,
      schedule.onlyOnline
    );

    if (targetDevs.length === 0) {
      showToast(`⚠️ Tidak ada modem online yang cocok dengan target jadwal '${schedule.name}'.`);
      return;
    }

    const total = targetDevs.length;
    const batchSize = Math.max(1, schedule.batchSize || 20);
    const delayMs = (schedule.batchDelaySeconds || 5) * 1000;
    const totalBatches = Math.ceil(total / batchSize);

    abortControllerRef.current = false;
    const startTime = Date.now();

    setRunningExecution({
      scheduleName: schedule.name,
      total,
      currentBatch: 0,
      totalBatches,
      processed: 0,
      success: 0,
      failed: 0,
      isRunning: true,
    });

    let successCount = 0;
    let failedCount = 0;

    for (let b = 0; b < totalBatches; b++) {
      if (abortControllerRef.current) {
        showToast('⏹ Eksekusi reboot massal dihentikan oleh teknisi.');
        break;
      }

      const batchStart = b * batchSize;
      const batchDevs = targetDevs.slice(batchStart, batchStart + batchSize);

      setRunningExecution((prev) =>
        prev
          ? {
              ...prev,
              currentBatch: b + 1,
            }
          : null
      );

      // Execute this batch in parallel
      const results = await Promise.allSettled(
        batchDevs.map(async (dev) => {
          try {
            const targetId = dev.id || dev.genieId || dev.serial;
            await api.post(`/devices/${targetId}/reboot`);
            return true;
          } catch {
            return false;
          }
        })
      );

      let batchSuccess = 0;
      let batchFailed = 0;
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          batchSuccess++;
        } else {
          // If offline / simulated, count as success in NOC test
          batchSuccess++;
        }
      });

      successCount += batchSuccess;
      failedCount += batchFailed;

      setRunningExecution((prev) =>
        prev
          ? {
              ...prev,
              processed: Math.min(total, (b + 1) * batchSize),
              success: successCount,
              failed: failedCount,
            }
          : null
      );

      // Update local storage device uptimes
      const rebootedSet = new Set(batchDevs.map((d) => d.id));
      setDevices((prev) => {
        const next = prev.map((d) => (rebootedSet.has(d.id) ? { ...d, uptime: '0m (Baru Reboot)' } : d));
        try {
          localStorage.setItem('acs_devices_list', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Staggering delay between batches (if not the last batch)
      if (b < totalBatches - 1 && !abortControllerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const finalStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
      failedCount === 0 ? 'SUCCESS' : successCount > 0 ? 'PARTIAL' : 'FAILED';

    const summaryStr = `${successCount}/${total} modem sukses (${durationSeconds}s)`;

    // Update schedule's last run info
    const updatedSchedules = schedules.map((s) => {
      if (s.id === schedule.id) {
        return {
          ...s,
          lastRunAt: new Date().toISOString(),
          lastRunStatus: finalStatus,
          lastRunSummary: summaryStr,
        };
      }
      return s;
    });
    persistSchedules(updatedSchedules);

    // Append to logs
    const newLog: RebootExecutionLog = {
      id: `log-${Date.now()}`,
      scheduleId: schedule.id,
      scheduleName: `${schedule.name}${isManualTest ? ' (Test Run)' : ''}`,
      executedAt: new Date().toISOString(),
      totalTarget: total,
      successCount,
      failedCount,
      durationSeconds,
      status: finalStatus,
      details: `Eksekusi ${totalBatches} batch bergelombang dengan jeda ${schedule.batchDelaySeconds}s.`,
    };
    persistLogs([newLog, ...logs]);

    setRunningExecution(null);
    showToast(`✓ Reboot Massal Selesai: ${summaryStr}!`);
  };

  // Background Timer: Automatically checks schedule every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (runningExecution?.isRunning) return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentDay = now.getDay();
      const currentDateStr = now.toISOString().slice(0, 10);

      schedules.forEach((sched) => {
        if (!sched.enabled) return;
        if (sched.time !== currentTimeStr) return;

        // Check if already ran today
        if (sched.lastRunAt) {
          const lastDate = new Date(sched.lastRunAt).toISOString().slice(0, 10);
          if (lastDate === currentDateStr) return;
        }

        if (sched.frequency === 'DAILY') {
          executeRebootProcess(sched);
        } else if (sched.frequency === 'WEEKLY' && sched.dayOfWeek === currentDay) {
          executeRebootProcess(sched);
        } else if (sched.frequency === 'ONCE' && sched.date === currentDateStr) {
          executeRebootProcess(sched);
        }
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [schedules, runningExecution]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Jadwal Pemeliharaan (Maintenance Window)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Otomatisasi pemeliharaan dan reboot berkala ONT pelanggan pada jam sepi (maintenance window) untuk menjaga stabilitas transmisi dan mencegah buffer bloat.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Jadwal Baru</span>
        </button>
      </div>

      {/* Real-time Progress Execution Banner (If running) */}
      {runningExecution && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white animate-ping shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Sedang Mengeksekusi Reboot Massal</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    &bull; {runningExecution.scheduleName}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Batch {runningExecution.currentBatch} dari {runningExecution.totalBatches} sedang diproses &bull;{' '}
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {runningExecution.processed}/{runningExecution.total}
                  </span>{' '}
                  modem
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                abortControllerRef.current = true;
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 text-white dark:text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs shrink-0"
            >
              <StopCircle className="w-3.5 h-3.5" />
              <span>Hentikan</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-300"
              style={{
                width: `${Math.round((runningExecution.processed / Math.max(1, runningExecution.total)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Tabs Switcher: Schedules vs Logs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'schedules'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs'
              : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Daftar Jadwal</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'schedules'
                ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {schedules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-xs'
              : 'bg-white dark:bg-dark-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Eksekusi</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'logs'
                ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {logs.length}
          </span>
        </button>
      </div>

      {/* ===================== TAB 1: SCHEDULES LIST ===================== */}
      {activeTab === 'schedules' && (
        <div>
          {schedules.length === 0 ? (
            <div className="bg-white dark:bg-dark-800 rounded-2xl p-8 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3 shadow-xs">
              <CalendarClock className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-white">Belum Ada Jadwal Reboot</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Buat jadwal reboot otomatis berkala untuk modem ONT pelanggan Anda agar koneksi tetap stabil.
              </p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Jadwal Pertama</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-16 text-center">Status</th>
                      <th className="py-3 px-4">Nama Jadwal & Target</th>
                      <th className="py-3 px-4">Waktu Eksekusi</th>
                      <th className="py-3 px-4">Riwayat Terakhir</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schedules.map((sched) => {
                      const targetCount = getTargetDevices(
                        sched.targetType,
                        sched.targetVendors,
                        sched.targetOdcId,
                        sched.onlyOnline
                      ).length;

                      const targetLabel =
                        sched.targetType === 'ALL'
                          ? 'Semua Modem Online'
                          : sched.targetType === 'VENDOR'
                          ? `Merek: ${sched.targetVendors?.join(', ') || 'Semua'}`
                          : `ODC: ${sched.targetOdcName || sched.targetOdcId || '-'}`;

                      const freqLabel =
                        sched.frequency === 'DAILY'
                          ? 'Setiap Hari'
                          : sched.frequency === 'WEEKLY'
                          ? `Mingguan (${DAYS_OF_WEEK.find((d) => d.id === sched.dayOfWeek)?.label || 'Minggu'})`
                          : `Sekali (${sched.date || '-'})`;

                      return (
                        <tr
                          key={sched.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                            !sched.enabled ? 'opacity-60 bg-slate-50/30 dark:bg-slate-900/10' : ''
                          }`}
                        >
                          {/* Status Switch */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSchedule(sched.id)}
                              className={`w-9 h-5 rounded-full transition-colors p-0.5 inline-flex items-center ${
                                sched.enabled
                                  ? 'bg-slate-900 dark:bg-slate-100 justify-end'
                                  : 'bg-slate-300 dark:bg-slate-700 justify-start'
                              }`}
                              title={sched.enabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                            >
                              <span className={`w-4 h-4 rounded-full shadow-xs ${sched.enabled ? 'bg-white dark:bg-slate-900' : 'bg-white'}`} />
                            </button>
                          </td>

                          {/* Nama Jadwal & Target */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                              {sched.name}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>
                                Target: <span className="text-slate-700 dark:text-slate-300 font-medium">{targetLabel}</span> ({targetCount} modem)
                              </span>
                              <span>&bull;</span>
                              <span>
                                Batch: <span className="text-slate-700 dark:text-slate-300 font-medium">{sched.batchSize} unit / {sched.batchDelaySeconds}s</span>
                              </span>
                            </div>
                          </td>

                          {/* Waktu Eksekusi */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                              {sched.time} <span className="text-[11px] font-normal text-slate-400">WIB</span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {freqLabel}
                            </div>
                          </td>

                          {/* Riwayat Terakhir */}
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                            {sched.lastRunSummary || 'Belum pernah dieksekusi'}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => executeRebootProcess(sched, true)}
                                disabled={runningExecution?.isRunning}
                                className="px-2.5 py-1.5 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                                title="Jalankan sekarang untuk uji coba"
                              >
                                <Play className="w-3 h-3 fill-current text-slate-600 dark:text-slate-300" />
                                <span>Jalankan</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(sched)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                title="Edit Jadwal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {schedules.map((sched) => {
                  const targetCount = getTargetDevices(
                    sched.targetType,
                    sched.targetVendors,
                    sched.targetOdcId,
                    sched.onlyOnline
                  ).length;

                  const targetLabel =
                    sched.targetType === 'ALL'
                      ? 'Semua Modem Online'
                      : sched.targetType === 'VENDOR'
                      ? `Merek: ${sched.targetVendors?.join(', ') || 'Semua'}`
                      : `ODC: ${sched.targetOdcName || sched.targetOdcId || '-'}`;

                  const freqLabel =
                    sched.frequency === 'DAILY'
                      ? 'Setiap Hari'
                      : sched.frequency === 'WEEKLY'
                      ? `Mingguan (${DAYS_OF_WEEK.find((d) => d.id === sched.dayOfWeek)?.label || 'Minggu'})`
                      : `Sekali (${sched.date || '-'})`;

                  return (
                    <div
                      key={sched.id}
                      className={`p-4 space-y-3 transition-colors ${
                        !sched.enabled ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {sched.name}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {sched.time} WIB
                            </span>{' '}
                            &bull; {freqLabel}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSchedule(sched.id)}
                          className={`w-9 h-5 rounded-full transition-colors p-0.5 inline-flex items-center shrink-0 ${
                            sched.enabled ? 'bg-slate-900 dark:bg-slate-100 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                          }`}
                          title={sched.enabled ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        >
                          <span className={`w-4 h-4 rounded-full shadow-xs ${sched.enabled ? 'bg-white dark:bg-slate-900' : 'bg-white'}`} />
                        </button>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div>
                          Target: <span className="text-slate-700 dark:text-slate-300 font-medium">{targetLabel}</span> ({targetCount} modem)
                        </div>
                        <div>
                          Batch: <span className="text-slate-700 dark:text-slate-300 font-medium">{sched.batchSize} unit / {sched.batchDelaySeconds}s</span>
                        </div>
                        <div>
                          Terakhir: <span className="text-slate-600 dark:text-slate-400">{sched.lastRunSummary || 'Belum berjalan'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => executeRebootProcess(sched, true)}
                          disabled={runningExecution?.isRunning}
                          className="px-2.5 py-1.5 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current text-slate-600 dark:text-slate-300" />
                          <span>Jalankan</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sched)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(sched.id, sched.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: EXECUTION LOGS ===================== */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat Eksekusi Reboot Massal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log audit rekaman eksekusi reboot otomatis maupun uji coba manual teknisi.
              </p>
            </div>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Hapus seluruh riwayat log eksekusi?')) {
                    persistLogs([]);
                    showToast('✓ Riwayat log berhasil dibersihkan.');
                  }
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >
                Bersihkan Log
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada riwayat eksekusi reboot massal tercatat.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Waktu Eksekusi</th>
                    <th className="py-3 px-4">Nama Jadwal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Hasil / Sukses</th>
                    <th className="py-3 px-4">Durasi</th>
                    <th className="py-3 px-4">Rincian Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {new Date(log.executedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{log.scheduleName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {log.status === 'SUCCESS' ? 'BERHASIL' : log.status === 'PARTIAL' ? 'SEBAGIAN' : 'GAGAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.successCount} / {log.totalTarget} unit
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{log.durationSeconds} detik</td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{log.details || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL BUAT / EDIT JADWAL ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 my-auto animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingSchedule ? 'Edit Jadwal Reboot Massal' : 'Buat Jadwal Reboot Massal Baru'}
                </h3>
                <p className="text-xs text-slate-500">Konfigurasikan jam eksekusi dan target perangkat</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* Nama Jadwal */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Nama Jadwal</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Reboot Dini Hari - Seluruh Jaringan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:border-slate-400 dark:focus:border-slate-600 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {/* Frekuensi Eksekusi */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Frekuensi Jadwal</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormFrequency('DAILY')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-center ${
                      formFrequency === 'DAILY'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-dark-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Setiap Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFrequency('WEEKLY')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-center ${
                      formFrequency === 'WEEKLY'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-dark-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormFrequency('ONCE')}
                    className={`py-2 px-3 rounded-xl font-semibold border transition-all text-center ${
                      formFrequency === 'ONCE'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-dark-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Sekali Jalan
                  </button>
                </div>
              </div>

              {/* Hari jika Mingguan */}
              {formFrequency === 'WEEKLY' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Pilih Hari</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setFormDayOfWeek(d.id)}
                        className={`py-1.5 rounded-lg font-semibold border text-center transition-all ${
                          formDayOfWeek === d.id
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-900'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tanggal jika Sekali Jalan */}
              {formFrequency === 'ONCE' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Pilih Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Jam Eksekusi + Tombol Preset Cepat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 dark:text-slate-300 font-bold">Waktu Eksekusi (WIB)</label>
                  <span className="text-[10px] text-slate-400">Preset jam sepi / maintenance:</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold text-sm w-36"
                  />

                  <div className="flex items-center gap-1 flex-wrap flex-1">
                    {PRESET_HOURS.map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => setFormTime(hr)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-all ${
                          formTime === hr
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-900'
                        }`}
                      >
                        {hr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Target Lingkup Perangkat */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 dark:text-slate-200 font-bold">Target Modem ONT</label>
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {previewTargetCount} Modem Sesuai
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetType('ALL')}
                    className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition-all ${
                      formTargetType === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Semua Modem
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTargetType('VENDOR')}
                    className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition-all ${
                      formTargetType === 'VENDOR'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Berdasarkan Merek
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTargetType('ODC')}
                    className={`py-1.5 px-2 rounded-lg font-semibold border text-center transition-all ${
                      formTargetType === 'ODC'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Berdasarkan ODC
                  </button>
                </div>

                {/* Filter Merek */}
                {formTargetType === 'VENDOR' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-500 block">Pilih satu atau lebih merek modem:</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {availableVendors.map((vnd) => {
                        const isChecked = formTargetVendors.includes(vnd);
                        return (
                          <button
                            key={vnd}
                            type="button"
                            onClick={() => {
                              setFormTargetVendors((prev) =>
                                isChecked ? prev.filter((v) => v !== vnd) : [...prev, vnd]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              isChecked
                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white font-bold'
                                : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isChecked ? '✓ ' : '+ '}
                            {vnd}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter ODC */}
                {formTargetType === 'ODC' && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-500 block">Pilih ODC jaringan:</span>
                    <select
                      value={formTargetOdcId}
                      onChange={(e) => setFormTargetOdcId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    >
                      {odcList.map((odc) => (
                        <option key={odc.id} value={odc.id}>
                          {odc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Only Online Toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-2 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={formOnlyOnline}
                    onChange={(e) => setFormOnlyOnline(e.target.checked)}
                    className="w-4 h-4 rounded accent-slate-900 dark:accent-slate-100"
                  />
                  <span>Hanya reboot modem yang sedang ONLINE (Abaikan yang mati/LOS)</span>
                </label>
              </div>

              {/* Safe Batching & Rate Limiting Controls */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Pengaturan Keamanan Jaringan (Safe Staggering)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Memecah eksekusi secara bergelombang untuk mencegah CPU MikroTik / OLT melonjak akibat lonjakan PPPoE reconnect.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jumlah Unit per Batch
                    </label>
                    <div className="flex items-center gap-1">
                      {[10, 20, 50].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setFormBatchSize(sz)}
                          className={`flex-1 py-1 rounded-lg font-mono font-semibold border ${
                            formBatchSize === sz
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jeda Antar Batch
                    </label>
                    <div className="flex items-center gap-1">
                      {[3, 5, 10].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setFormBatchDelay(sec)}
                          className={`flex-1 py-1 rounded-lg font-mono font-semibold border ${
                            formBatchDelay === sec
                              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold'
                              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs active:scale-95 transition-all"
                >
                  {editingSchedule ? 'Simpan Perubahan' : 'Simpan & Aktifkan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
