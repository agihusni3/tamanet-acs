import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import {
  Sparkles,
  User,
  Bell,
  Upload,
  Save,
  Router,
  Plus,
  Trash2,
  Edit2,
  Search,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Link,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Shield,
  ShieldCheck,
  Check,
  Ban,
} from 'lucide-react';
import { useAppContext, ModemProfile, ROLE_DEFINITIONS, UserRole } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';

export const SettingsPage: React.FC = () => {
  const {
    branding,
    updateBranding,
    user,
    updateUser,
    showToast,
    modemProfiles,
    addModemProfile,
    updateModemProfile,
    deleteModemProfile,
    autoProvision,
    updateAutoProvision,
  } = useAppContext();

  // Branding Form State
  const [appName, setAppName] = useState(branding.appName);
  const [tagline, setTagline] = useState(branding.tagline);
  const [logoImageUrl, setLogoImageUrl] = useState<string>(branding.logoImageUrl || '');

  // User Profile Form State
  const [userName, setUserName] = useState(user.name);
  const [userEmail, setUserEmail] = useState(user.email);
  const [userPhone, setUserPhone] = useState(user.phone || '');
  const [userRole, setUserRole] = useState<UserRole>((user.role as UserRole) || 'SUPERADMIN');

  // Auto-Provisioning & Credential Hardening Form State
  const [apEnabled, setApEnabled] = useState(autoProvision.enabled);
  const [apWebAdminUser, setApWebAdminUser] = useState(autoProvision.webAdminUser);
  const [apWebAdminPass, setApWebAdminPass] = useState(autoProvision.webAdminPass);
  const [apAutoGenerate, setApAutoGenerate] = useState(autoProvision.autoGeneratePerSerial);
  const [apSerialPattern, setApSerialPattern] = useState(autoProvision.serialPattern);
  const [showApPass, setShowApPass] = useState(false);

  // Telegram state
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  // Dynamic Modem Profiles State
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('Huawei');
  const [searchProfileQuery, setSearchProfileQuery] = useState('');
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Form State for Profile Modal
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formProductClass, setFormProductClass] = useState('');
  const [formOui, setFormOui] = useState('');
  const [formSerialPrefix, setFormSerialPrefix] = useState('');
  const [formWifiType, setFormWifiType] = useState<'SINGLE_BAND' | 'DUAL_BAND' | 'BRIDGE_NO_WIFI'>('DUAL_BAND');
  const [formPonType, setFormPonType] = useState<'GPON' | 'EPON' | 'XPON'>('GPON');
  const [formRootModel, setFormRootModel] = useState<'TR098' | 'TR181'>('TR098');
  const [formDescription, setFormDescription] = useState('');

  const allVendors = Array.from(new Set(modemProfiles.map((p) => p.manufacturer)));

  const filteredProfiles = modemProfiles.filter((p) => {
    const matchVendor = selectedVendorFilter === 'ALL' || p.manufacturer === selectedVendorFilter;
    const matchSearch =
      searchProfileQuery === '' ||
      p.model.toLowerCase().includes(searchProfileQuery.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchProfileQuery.toLowerCase()) ||
      p.serialPrefix.toLowerCase().includes(searchProfileQuery.toLowerCase()) ||
      p.oui.toLowerCase().includes(searchProfileQuery.toLowerCase());
    return matchVendor && matchSearch;
  });

  // Bulk Selection for Profiles
  const isAllProfilesSelected = filteredProfiles.length > 0 && filteredProfiles.every((p) => selectedProfileIds.includes(p.id));
  const isSomeProfilesSelected = filteredProfiles.some((p) => selectedProfileIds.includes(p.id)) && !isAllProfilesSelected;

  const toggleSelectAllProfiles = () => {
    if (isAllProfilesSelected) {
      const filteredIds = new Set(filteredProfiles.map((p) => p.id));
      setSelectedProfileIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredProfiles.map((p) => p.id);
      setSelectedProfileIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectProfile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteProfiles = () => {
    if (selectedProfileIds.length === 0) return;
    const count = selectedProfileIds.length;
    if (!window.confirm(`Hapus ${count} profil modem yang dipilih?`)) return;
    selectedProfileIds.forEach((id) => deleteModemProfile(id));
    setSelectedProfileIds([]);
    showToast(`✓ ${count} profil modem berhasil dihapus.`);
  };

  const handleOpenAddModal = () => {
    setEditingProfileId(null);
    setFormManufacturer(selectedVendorFilter !== 'ALL' ? selectedVendorFilter : 'Huawei');
    setFormModel('');
    setFormProductClass('');
    setFormOui('');
    setFormSerialPrefix('');
    setFormWifiType('DUAL_BAND');
    setFormPonType('GPON');
    setFormRootModel('TR098');
    setFormDescription('');
    setIsProfileModalOpen(true);
  };

  const handleOpenEditModal = (prof: ModemProfile) => {
    setEditingProfileId(prof.id);
    setFormManufacturer(prof.manufacturer);
    setFormModel(prof.model);
    setFormProductClass(prof.productClass || '');
    setFormOui(prof.oui);
    setFormSerialPrefix(prof.serialPrefix);
    setFormWifiType(prof.wifiType);
    setFormPonType(prof.ponType);
    setFormRootModel(prof.rootModel);
    setFormDescription(prof.description || '');
    setIsProfileModalOpen(true);
  };

  const handleSaveProfileModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formManufacturer.trim() || !formModel.trim() || !formSerialPrefix.trim()) {
      alert('Merek, Tipe Model, dan Serial Prefix wajib diisi!');
      return;
    }

    if (editingProfileId) {
      updateModemProfile(editingProfileId, {
        manufacturer: formManufacturer.trim(),
        model: formModel.trim(),
        productClass: formProductClass.trim() || formModel.trim(),
        oui: formOui.trim(),
        serialPrefix: formSerialPrefix.trim().toUpperCase(),
        wifiType: formWifiType,
        ponType: formPonType,
        rootModel: formRootModel,
        description: formDescription.trim(),
      });
      showToast(`✓ Profil ${formModel} berhasil diperbarui.`);
    } else {
      addModemProfile({
        manufacturer: formManufacturer.trim(),
        model: formModel.trim(),
        productClass: formProductClass.trim() || formModel.trim(),
        oui: formOui.trim(),
        serialPrefix: formSerialPrefix.trim().toUpperCase(),
        wifiType: formWifiType,
        ponType: formPonType,
        rootModel: formRootModel,
        description: formDescription.trim(),
        isActive: true,
      });
      showToast(`✓ Profil ${formModel} berhasil ditambahkan.`);
    }
    setIsProfileModalOpen(false);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBranding({
      appName: appName.trim() || 'PROJECT ACS',
      tagline: tagline.trim() || 'TR-069 & GIS FTTH',
      logoType: logoImageUrl ? 'image' : 'icon',
      logoIcon: branding.logoIcon,
      logoImageUrl,
      logoColor: branding.logoColor || '#2563EB',
    });
    showToast('✓ Identitas sistem berhasil disimpan!');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: userName.trim() || 'Admin NOC',
      email: userEmail.trim() || 'admin@acs.noc.id',
      phone: userPhone.trim(),
      role: userRole,
    });
    showToast(`✓ Profil akun & Level Role (${ROLE_DEFINITIONS[userRole]?.badgeLabel || userRole}) berhasil disimpan!`);
  };

  const handleQuickSwitchRole = (newRole: UserRole) => {
    setUserRole(newRole);
    updateUser({ role: newRole });
    showToast(`✓ Role beralih ke: Level ${ROLE_DEFINITIONS[newRole].level} - ${ROLE_DEFINITIONS[newRole].title}`);
  };

  const handleSaveAutoProvision = (e: React.FormEvent) => {
    e.preventDefault();
    updateAutoProvision({
      enabled: apEnabled,
      webAdminUser: apWebAdminUser.trim() || 'admin',
      webAdminPass: apWebAdminPass.trim() || 'AdminNoc@2026',
      autoGeneratePerSerial: apAutoGenerate,
      serialPattern: apSerialPattern.trim() || 'ISP@{SN_LAST_4}',
    });
    showToast('✓ Kebijakan Auto-Hardening Kredensial ONT berhasil disimpan!');
  };

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
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Konfigurasi identitas sistem, akun administrator, dan profil modem TR-069
        </p>
      </div>

      <div className="space-y-4">
        {/* 1. BRANDING & IDENTITAS SISTEM */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Identitas Brand &amp; Logo
            </h2>
          </div>

          <form onSubmit={handleSaveBranding} className="text-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-3.5">
              {/* Logo Preview & Upload */}
              <div className="shrink-0">
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Logo Brand
                </label>
                <div className="flex items-center gap-2.5 h-[38px]">
                  <BrandLogo
                    branding={{
                      appName: appName || 'PROJECT ACS',
                      tagline: tagline || '',
                      logoType: logoImageUrl ? 'image' : 'icon',
                      logoIcon: branding.logoIcon,
                      logoImageUrl,
                      logoColor: branding.logoColor,
                    }}
                    className="!w-[38px] !h-[38px] !rounded-xl shrink-0"
                  />
                  <label className="h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors font-semibold text-xs border border-slate-300 dark:border-slate-700 shadow-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                    <span>Ganti Logo</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Form Inputs (Nama & Slogan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                    Nama Sistem / ISP
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Contoh: TAMA.NET"
                    className="w-full h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-semibold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                    Tagline / Slogan
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Contoh: Connecting For You"
                    className="w-full h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 text-xs"
                  />
                </div>
              </div>

              {/* Tombol Simpan Sejajar */}
              <div className="w-full lg:w-auto shrink-0">
                <button
                  type="submit"
                  className="w-full lg:w-auto h-[38px] flex items-center justify-center gap-1.5 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs transition-all text-xs active:scale-95 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Identitas</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 2. PROFIL ADMIN & LEVELING ROLE PENGGUNA */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Profil Akun &amp; Leveling Role Pengguna (NOC RBAC)
              </h2>
            </div>
            {ROLE_DEFINITIONS[userRole] && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit ${ROLE_DEFINITIONS[userRole].bgClass} ${ROLE_DEFINITIONS[userRole].colorClass} ${ROLE_DEFINITIONS[userRole].borderClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DEFINITIONS[userRole].dotClass}`} />
                LEVEL {ROLE_DEFINITIONS[userRole].level} &bull; {ROLE_DEFINITIONS[userRole].badgeLabel}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Level Role Hak Akses
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-bold"
                >
                  {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((r) => (
                    <option key={r} value={r}>
                      L{ROLE_DEFINITIONS[r].level}: {ROLE_DEFINITIONS[r].title} ({ROLE_DEFINITIONS[r].badgeLabel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih peran untuk mengatur batasan visibilitas menu sidebar &amp; eksekusi TR-069 secara dinamis.
              </p>
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl shadow-xs transition-all text-xs active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Profil &amp; Role</span>
              </button>
            </div>
          </form>

          {/* MATRIKS LEVELING ROLE & KAPABILITAS AKSES */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                Matriks Hak Akses &amp; Batasan Role (NOC Standards)
              </span>
              <span className="text-[10px] text-slate-500">Klik salah satu kartu untuk beralih langsung</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {(Object.keys(ROLE_DEFINITIONS) as UserRole[]).map((rKey) => {
                const roleItem = ROLE_DEFINITIONS[rKey];
                const isActive = user.role === rKey;

                return (
                  <div
                    key={rKey}
                    className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                      isActive
                        ? `${roleItem.bgClass} ${roleItem.borderClass} ring-1 ring-slate-900/40 dark:ring-white/40 shadow-sm`
                        : 'bg-slate-50/70 dark:bg-dark-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${roleItem.bgClass} ${roleItem.colorClass} border ${roleItem.borderClass}`}>
                          Level {roleItem.level}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                            Aktif
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          {roleItem.title}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                          {roleItem.category}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/80 pt-2">
                        {roleItem.description}
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                          Dapat Dilakukan ({roleItem.capabilities.length}):
                        </span>
                        <ul className="space-y-1 text-[10px] text-slate-700 dark:text-slate-300">
                          {roleItem.capabilities.slice(0, 4).map((cap, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="w-3 h-3 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                              <span className="leading-tight">{cap}</span>
                            </li>
                          ))}
                          {roleItem.capabilities.length > 4 && (
                            <li className="text-[9px] text-slate-500 dark:text-slate-400 italic pl-4">
                              +{roleItem.capabilities.length - 4} kapabilitas lainnya...
                            </li>
                          )}
                        </ul>
                      </div>

                      <div className="space-y-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Batasan Akses:
                        </span>
                        <ul className="space-y-1 text-[10px] text-slate-600 dark:text-slate-400">
                          {roleItem.restrictions.map((res, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Ban className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                              <span className="leading-tight">{res}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleQuickSwitchRole(rKey)}
                        disabled={isActive}
                        className={`w-full py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                          isActive
                            ? 'bg-slate-200 dark:bg-dark-800 text-slate-500 dark:text-slate-400 cursor-default'
                            : 'bg-white dark:bg-dark-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                            <span>Role Aktif Saat Ini</span>
                          </>
                        ) : (
                          <span>Uji Coba / Pakai Role Ini</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. MANAJEMEN MEREK & TIPE MODEM TR-069 */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <Router className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Katalog Merek &amp; Profil Modem TR-069
              </h2>
            </div>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0 self-start sm:self-auto active:scale-95 force-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tipe Modem</span>
            </button>
          </div>

          {/* TAB MEREK TUNGGAL & PENCARIAN */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {allVendors.map((v) => {
                const count = modemProfiles.filter((p) => p.manufacturer === v).length;
                const isSelected = selectedVendorFilter === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setSelectedVendorFilter(v);
                      setSelectedProfileIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                      isSelected
                        ? 'btn-dark bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm force-white'
                        : 'bg-slate-100 text-slate-600 dark:bg-dark-900 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span>{v}</span>
                    <span className="text-[10px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Cari tipe ${selectedVendorFilter}...`}
                value={searchProfileQuery}
                onChange={(e) => setSearchProfileQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-medium"
              />
            </div>
          </div>

          {/* Bulk Action Toolbar for Profiles */}
          {selectedProfileIds.length > 0 && (
            <div className="bg-slate-100 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />
                <span>{selectedProfileIds.length} tipe modem dipilih</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProfileIds([])}
                  className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteProfiles}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-lg transition-colors shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih</span>
                </button>
              </div>
            </div>
          )}

          {/* MOBILE CARDS FOR PROFILES */}
          <div className="md:hidden space-y-2.5">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((prof) => {
                const isSelected = selectedProfileIds.includes(prof.id);
                return (
                  <div
                    key={prof.id}
                    className={`bg-white dark:bg-dark-800 border rounded-2xl p-3 space-y-2 shadow-sm transition-all ${
                      isSelected
                        ? 'border-slate-400 bg-slate-100/70 dark:border-slate-600 dark:bg-slate-800/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProfile(prof.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 cursor-pointer accent-slate-900 dark:accent-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-mono truncate">
                            {prof.model}
                          </div>
                          {prof.description && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans truncate">
                              {prof.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(prof)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-dark-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus tipe '${prof.model}'?`)) {
                              deleteModemProfile(prof.id);
                              setSelectedProfileIds((prev) => prev.filter((id) => id !== prof.id));
                              showToast(`Profil ${prof.model} dihapus.`);
                            }
                          }}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-dark-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 dark:bg-dark-900/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Prefix / OUI</div>
                        <div className="font-mono text-slate-700 dark:text-slate-300 truncate mt-0.5">
                          {prof.serialPrefix || '-'} / {prof.oui || '-'}
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-dark-900/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800/60">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">PON / Wi-Fi</div>
                        <div className="text-slate-700 dark:text-slate-300 truncate mt-0.5">
                          <span className="font-mono font-semibold">{prof.ponType}</span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            {prof.wifiType === 'DUAL_BAND' ? 'Dual' : prof.wifiType === 'SINGLE_BAND' ? '2.4G' : 'Bridge'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-800">
                Tidak ada tipe modem untuk merek {selectedVendorFilter}.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE MODEM */}
          <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-900/80 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={isAllProfilesSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeProfilesSelected;
                      }}
                      onChange={toggleSelectAllProfiles}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 cursor-pointer accent-slate-900 dark:accent-slate-100"
                    />
                  </th>
                  <th className="py-2.5 px-3">Tipe / Model</th>
                  <th className="py-2.5 px-3">Serial Prefix / OUI</th>
                  <th className="py-2.5 px-3">Tipe PON</th>
                  <th className="py-2.5 px-3">Data Model</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((prof) => {
                    const isSelected = selectedProfileIds.includes(prof.id);
                    return (
                      <tr
                        key={prof.id}
                        className={`transition-colors ${
                          isSelected ? 'bg-slate-100 dark:bg-slate-800/60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProfile(prof.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 cursor-pointer accent-slate-900 dark:accent-slate-100"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-slate-100 font-semibold">
                          <div>{prof.model}</div>
                          {prof.description && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans truncate max-w-xs font-normal">
                              {prof.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <span>Prefix: <strong>{prof.serialPrefix || '-'}</strong></span>
                          <span className="text-slate-400 dark:text-slate-400 ml-2">OUI: {prof.oui || '-'}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-dark-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mr-1.5">
                            {prof.ponType}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {prof.wifiType === 'DUAL_BAND' ? 'Dual-Band' : prof.wifiType === 'SINGLE_BAND' ? '2.4GHz' : 'Bridge'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                          {prof.rootModel}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(prof)}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus tipe '${prof.model}'?`)) {
                                  deleteModemProfile(prof.id);
                                  setSelectedProfileIds((prev) => prev.filter((id) => id !== prof.id));
                                  showToast(`Profil ${prof.model} dihapus.`);
                                }
                              }}
                              title="Hapus"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500">
                      Tidak ada tipe modem untuk merek {selectedVendorFilter}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. NOTIFIKASI BOT TELEGRAM */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
            <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Alert Bot Telegram
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                Telegram Bot Token
              </label>
              <input
                type="text"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:AAFg..."
                className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                Chat ID Group NOC
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-100123456789"
                className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => showToast('✓ Konfigurasi Telegram Bot berhasil disimpan!')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl shadow-sm transition-all text-xs active:scale-95 force-white"
            >
              <Save className="w-3.5 h-3.5 text-white dark:text-slate-900" />
              <span>Simpan Bot</span>
            </button>
          </div>
        </div>

        {/* 5. KEBIJAKAN AUTO-HARDENING & PROVISIONING KREDENSIAL ONT */}
        <div className="bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Kredensial ONT — Auto-Hardening
              </h2>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none self-start sm:self-auto bg-slate-100 dark:bg-dark-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={apEnabled}
                onChange={(e) => setApEnabled(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-slate-900 dark:accent-slate-100"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {apEnabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </label>
          </div>

          <form onSubmit={handleSaveAutoProvision} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Username Web Admin Baru
                </label>
                <input
                  type="text"
                  required
                  value={apWebAdminUser}
                  onChange={(e) => setApWebAdminUser(e.target.value)}
                  placeholder="admin / noc-admin"
                  className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Akan menggantikan default user bawaan pabrik
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                  Password Web Admin Baru
                </label>
                <div className="relative">
                  <input
                    type={showApPass ? 'text' : 'password'}
                    required
                    value={apWebAdminPass}
                    onChange={(e) => setApWebAdminPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 pr-10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApPass(!showApPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showApPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Password aman yang diterapkan seragam ke seluruh modem
                </span>
              </div>
            </div>

            {/* Opsi Pola Dinamis Serial Number */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 select-none font-medium">
                <input
                  type="checkbox"
                  checked={apAutoGenerate}
                  onChange={(e) => setApAutoGenerate(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-slate-900 dark:accent-slate-100"
                />
                <span>Gunakan Pola Password Unik Berdasarkan Serial Number (SN) Modem</span>
              </label>

              {apAutoGenerate && (
                <div className="pl-6 pt-1 max-w-sm">
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Format Pola (Gunakan <code className="font-mono text-slate-900 dark:text-white font-bold">{'{SN_LAST_4}'}</code> untuk 4 digit terakhir SN)
                  </label>
                  <input
                    type="text"
                    value={apSerialPattern}
                    onChange={(e) => setApSerialPattern(e.target.value)}
                    placeholder="ISP@{SN_LAST_4}"
                    className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl shadow-sm transition-all text-xs active:scale-95 force-white"
              >
                <Save className="w-3.5 h-3.5 text-white dark:text-slate-900" />
                <span>Simpan Kebijakan</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT PROFIL MODEM (createPortal) */}
      {isProfileModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
            <div className="w-full sm:max-w-lg mx-auto bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] sm:max-h-[calc(100vh-2.5rem)] overflow-y-auto mt-auto sm:my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Router className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingProfileId ? 'Edit Profil Modem' : 'Tambah Tipe Modem Baru'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfileModal} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Merek Pabrikan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Huawei, ZTE, Zimlink, dll"
                      value={formManufacturer}
                      onChange={(e) => setFormManufacturer(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Nama Tipe / Model *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: EchoLife HG8245H5"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Serial Prefix (Hex Code) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 48575443 (HWTC)"
                      value={formSerialPrefix}
                      onChange={(e) => setFormSerialPrefix(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      MAC OUI (6 Hex Awal)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 00259E"
                      value={formOui}
                      onChange={(e) => setFormOui(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Tipe PON
                    </label>
                    <select
                      value={formPonType}
                      onChange={(e) => setFormPonType(e.target.value as any)}
                      className="w-full h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-9 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    >
                      <option value="GPON">GPON</option>
                      <option value="EPON">EPON</option>
                      <option value="XPON">XPON (Dual)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Tipe Wi-Fi
                    </label>
                    <select
                      value={formWifiType}
                      onChange={(e) => setFormWifiType(e.target.value as any)}
                      className="w-full h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-9 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    >
                      <option value="DUAL_BAND">Dual-Band 2.4/5G</option>
                      <option value="SINGLE_BAND">Single-Band 2.4GHz</option>
                      <option value="BRIDGE_NO_WIFI">Bridge (Tanpa Wi-Fi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                      Data Model TR-069
                    </label>
                    <select
                      value={formRootModel}
                      onChange={(e) => setFormRootModel(e.target.value as any)}
                      className="w-full h-[38px] bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-9 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                    >
                      <option value="TR098">TR-098 (IGD)</option>
                      <option value="TR181">TR-181 (Device:2)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-400 font-semibold mb-1">
                    Deskripsi / Spesifikasi Port
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 4 GE + 2 POTS + Wi-Fi AC1200"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 force-white"
                  >
                    {editingProfileId ? 'Simpan Perubahan' : 'Daftarkan Profil'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
