import React, { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';

const SPLITTER_RATIO_OPTIONS = [
  { value: '0_0', label: 'Tanpa Rasio' },
  { value: '21_0.25', label: '01:99' },
  { value: '18_0.3', label: '02:98' },
  { value: '16.5_0.35', label: '03:97' },
  { value: '15.5_0.38', label: '04:96' },
  { value: '14.5_0.42', label: '05:95' },
  { value: '13.8_0.86', label: '06:94' },
  { value: '13.0_0.92', label: '07:93' },
  { value: '12.5_0.98', label: '08:92' },
  { value: '12.0_1.04', label: '09:91' },
  { value: '11.0_1.1', label: '10:90' },
  { value: '9.5_1.35', label: '15:85' },
  { value: '8.0_1.5', label: '20:80' },
  { value: '7.0_1.95', label: '25:75' },
  { value: '6.4_2.3', label: '30:70' },
  { value: '5.35_2.7', label: '35:65' },
  { value: '4.7_3.1', label: '40:60' },
  { value: '4.05_3.3', label: '45:55' },
  { value: '3.4_3.4', label: '50:50' },
];

const SPLITTER_PLC_OPTIONS = [
  { value: '0', label: 'Tanpa Splitter' },
  { value: '3.6', label: '1:2' },
  { value: '7.2', label: '1:4' },
  { value: '10.5', label: '1:8' },
  { value: '13.8', label: '1:16' },
  { value: '17.0', label: '1:32' },
  { value: '20.5', label: '1:64' },
];

interface OpticalStatus {
  label: string;
  badgeClass: string;
  dotColor: string;
}

const getOpticalStatus = (val: number): OpticalStatus => {
  if (val >= -24) {
    return {
      label: 'Optimal (>= -24 dBm)',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700',
      dotColor: 'bg-slate-700 dark:bg-slate-300',
    };
  }
  if (val >= -27) {
    return {
      label: 'Waspada (-24 ~ -27 dBm)',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
      dotColor: 'bg-slate-500 dark:bg-slate-400',
    };
  }
  return {
    label: 'Kritis / LOS (< -27 dBm)',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    dotColor: 'bg-slate-400 dark:bg-slate-500',
  };
};

export const AttenuationCalculatorPage: React.FC = () => {
  const [inputLaser, setInputLaser] = useState<string>('');
  const [splitterRatio, setSplitterRatio] = useState<string>('0_0');
  const [splitterPlc, setSplitterPlc] = useState<string>('0');

  const calculation = useMemo(() => {
    const raw = inputLaser.trim().replace(',', '.');
    if (!raw) return null;
    const inputVal = parseFloat(raw);
    if (isNaN(inputVal)) return null;

    const sRatio = splitterRatio.split('_');
    const lossRatioPlc = parseFloat(sRatio[0]) || 0;
    const lossRatio = parseFloat(sRatio[1]) || 0;
    const plc = parseFloat(splitterPlc) || 0;

    const outputVal = inputVal - (lossRatioPlc + plc);
    const nextOdpVal = inputVal - lossRatio;
    const totalDropLoss = lossRatioPlc + plc;

    return {
      inputVal: inputVal.toFixed(2),
      outputLaser: outputVal.toFixed(2),
      nextOdp: nextOdpVal.toFixed(2),
      lossRatioNext: lossRatio.toFixed(2),
      totalDropLoss: totalDropLoss.toFixed(2),
      status: getOpticalStatus(outputVal),
    };
  }, [inputLaser, splitterRatio, splitterPlc]);

  const handleReset = () => {
    setInputLaser('');
    setSplitterRatio('0_0');
    setSplitterPlc('0');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Kalkulator Redaman PON
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Hitung otomatis estimasi redaman Splitter Rasio dan Splitter PLC
          </p>
        </div>
        {inputLaser && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column: Form Input Parameter */}
        <div className="md:col-span-6 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
            Parameter Optik
          </h3>

          {/* Input Laser */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Input Laser (dBm)
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputLaser}
                onChange={(e) => setInputLaser(e.target.value)}
                placeholder="Contoh: +5.00 atau -14.00"
                className="w-full h-[40px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono pr-14"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500">
                dBm
              </span>
            </div>
          </div>

          {/* Splitter Ratio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Splitter Rasio
            </label>
            <select
              value={splitterRatio}
              onChange={(e) => setSplitterRatio(e.target.value)}
              className="w-full h-[40px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-9 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono shadow-sm"
            >
              {SPLITTER_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Splitter PLC */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Splitter PLC
            </label>
            <select
              value={splitterPlc}
              onChange={(e) => setSplitterPlc(e.target.value)}
              className="w-full h-[40px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-9 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono shadow-sm"
            >
              {SPLITTER_PLC_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Hasil Kalkulasi Realtime */}
        <div className="md:col-span-6 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700/80 pb-2.5">
              Hasil Estimasi Redaman
            </h3>

            {calculation ? (
              <div className="space-y-3.5 pt-3">
                {/* Output Laser Card (Port ODP) */}
                <div className="bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Output Laser (Port ODP)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${calculation.status.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${calculation.status.dotColor}`}></span>
                      {calculation.status.label}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-900 dark:text-white">
                    {calculation.outputLaser} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">dBm</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
                    Total Drop Loss: -{calculation.totalDropLoss} dB
                  </div>
                </div>

                {/* Next ODP Card (Jalur Lanjutan) */}
                <div className="bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      Next ODP (Jalur Lanjutan)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Loss: -{calculation.lossRatioNext} dB
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-extrabold text-slate-800 dark:text-slate-200">
                    {calculation.nextOdp} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">dBm</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
                    Daya diteruskan ke ODP berikutnya
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 space-y-1 text-slate-500 dark:text-slate-400">
                <p className="text-xs font-semibold">Masukkan nilai Input Laser di samping.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Hasil redaman optik akan dihitung otomatis secara real-time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
