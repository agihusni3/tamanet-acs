import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Check, Upload, RefreshCw, Globe, Link, CheckCircle2 } from 'lucide-react';
import { useAppContext, BrandSettings } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

interface BrandingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingEditModal: React.FC<BrandingEditModalProps> = ({ isOpen, onClose }) => {
  const { branding, updateBranding, showToast } = useAppContext();

  const [appName, setAppName] = useState(branding.appName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [logoType, setLogoType] = useState<'icon' | 'image'>(branding.logoType);
  const [logoIcon, setLogoIcon] = useState(branding.logoIcon);
  const [logoImageUrl, setLogoImageUrl] = useState(branding.logoImageUrl);
  const [logoColor, setLogoColor] = useState(branding.logoColor || '#2563EB');

  if (!isOpen) return null;

  const iconOptions = [
    { id: 'activity', label: 'Activity' },
    { id: 'wifi', label: 'Wi-Fi' },
    { id: 'globe', label: 'Network' },
    { id: 'shield', label: 'Security' },
    { id: 'server', label: 'Server' },
    { id: 'zap', label: 'Speed' },
    { id: 'radio', label: 'Tower' },
  ];

  const colorPresets = [
    { color: '#2563EB', name: 'Royal Blue' },
    { color: '#7C3AED', name: 'Purple' },
    { color: '#059669', name: 'Emerald' },
    { color: '#0891B2', name: 'Cyan' },
    { color: '#DC2626', name: 'Crimson' },
    { color: '#D97706', name: 'Amber' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran file maksimal 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoImageUrl(event.target.result);
        setLogoType('image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    setAppName('PROJECT ACS');
    setTagline('TR-069 & GIS FTTH');
    setLogoType('icon');
    setLogoIcon('activity');
    setLogoImageUrl('');
    setLogoColor('#2563EB');
  };

  const handleSave = () => {
    const trimmedName = appName.trim() || 'PROJECT ACS';
    const trimmedTagline = tagline.trim() || 'TR-069 & GIS FTTH';

    updateBranding({
      appName: trimmedName,
      tagline: trimmedTagline,
      logoType,
      logoIcon,
      logoImageUrl,
      logoColor,
    });

    showToast(`Identitas sistem '${trimmedName}' berhasil diperbarui!`);
    onClose();
  };

  // Preview object
  const previewBranding: BrandSettings = {
    appName: appName || 'PROJECT ACS',
    tagline: tagline || 'TR-069 & GIS FTTH',
    logoType,
    logoIcon,
    logoImageUrl,
    logoColor,
  };

  return (
    <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700/90 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin mt-auto sm:my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">Ubah Logo & Nama Sistem</h3>
              <p className="text-[11px] text-slate-400">Kustomisasi identitas aplikasi & logo brand ISP Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="bg-dark-900 border border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo branding={previewBranding} size="md" />
            <div>
              <div className="font-extrabold text-sm tracking-wider text-white">
                {previewBranding.appName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-wider">
                {previewBranding.tagline}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Live Preview
          </span>
        </div>



        {/* Form Fields */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nama Sistem / Brand ISP</label>
            <input
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Contoh: TAMA NETWORK / MY-ACS"
              className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-slate-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tagline / Deskripsi Singkat</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: TR-069 & FTTH GIS Platform"
              className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Logo Type Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Tipe Logo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLogoType('icon')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-semibold transition-all ${
                  logoType === 'icon'
                    ? 'bg-slate-800 border-slate-400 text-white shadow-sm'
                    : 'bg-dark-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pilih Ikon Vektor</span>
              </button>

              <button
                type="button"
                onClick={() => setLogoType('image')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-semibold transition-all ${
                  logoType === 'image'
                    ? 'bg-slate-800 border-slate-400 text-white shadow-sm'
                    : 'bg-dark-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload / URL Gambar</span>
              </button>
            </div>
          </div>

          {/* Icon Chooser */}
          {logoType === 'icon' && (
            <div className="space-y-3 p-3 bg-dark-900/60 border border-slate-800 rounded-xl">
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Pilihan Ikon</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {iconOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLogoIcon(opt.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                        logoIcon === opt.id
                          ? 'border-slate-300 bg-slate-800 text-white font-bold'
                          : 'border-slate-700/80 bg-dark-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BrandLogo
                        branding={{ ...previewBranding, logoIcon: opt.id }}
                        size="sm"
                        className="mb-1"
                      />
                      <span className="text-[10px]">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Warna Logo</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setLogoColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                        logoColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900' : ''
                      }`}
                      title={c.name}
                    >
                      {logoColor === c.color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={logoColor}
                    onChange={(e) => setLogoColor(e.target.value)}
                    className="w-7 h-7 rounded-full cursor-pointer bg-transparent border-0"
                    title="Pilih warna kustom"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Custom Image Upload / URL */}
          {logoType === 'image' && (
            <div className="space-y-3 p-3 bg-dark-900/60 border border-slate-800 rounded-xl">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Upload File Logo (PNG / SVG / JPG)</label>
                <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-700 hover:border-slate-400 rounded-xl cursor-pointer bg-dark-900/80 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-slate-300 font-semibold text-xs">Pilih Gambar dari Komputer</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Maks. 2MB (Rekomendasi rasio 1:1)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Atau Masukkan URL Gambar Logo</label>
                <input
                  type="text"
                  value={logoImageUrl}
                  onChange={(e) => setLogoImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-slate-400 font-mono text-[11px]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-700/80 pt-3">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Bawaan</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-sm rounded-xl transition-all active:scale-95 force-white"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
