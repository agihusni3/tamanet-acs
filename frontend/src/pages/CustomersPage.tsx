import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Search, Plus, MapPin, Phone, Upload, X, Check,
  AlertCircle, Wifi, Key, Navigation2, Eye, EyeOff, Trash2, Edit3,
  Network, Globe
} from 'lucide-react';


// ============================================================
// Types
// ============================================================
interface Customer {
  id: string;
  customerNo: string;
  name: string;
  phone: string;
  address: string;
  odpName: string;
  lat?: string;
  lng?: string;
  pppoeUser?: string;
  pppoePass?: string;
}

const emptyForm = (): Omit<Customer, 'id'> => ({
  customerNo: '',
  name: '',
  phone: '',
  address: '',
  odpName: '',
  lat: '',
  lng: '',
  pppoeUser: '',
  pppoePass: '',
});

// ============================================================
// CSV parser helper
// ============================================================
function parseCsvCustomers(text: string): Customer[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });

    return {
      id: `csv-${Date.now()}-${idx}`,
      customerNo: row['no_pelanggan'] || row['customer_no'] || row['id'] || `PLG-${Date.now()}-${idx}`,
      name: row['nama'] || row['nama_pelanggan'] || row['name'] || '-',
      phone: row['telepon'] || row['phone'] || row['no_hp'] || '',
      address: row['alamat'] || row['address'] || '',
      odpName: row['odp'] || row['odp_name'] || row['nama_odp'] || '',
      lat: row['lat'] || row['latitude'] || '',
      lng: row['lng'] || row['long'] || row['longitude'] || '',
      pppoeUser: row['pppoe_user'] || row['pppoe_username'] || row['username_pppoe'] || '',
      pppoePass: row['pppoe_pass'] || row['pppoe_password'] || row['password_pppoe'] || '',
    };
  });
}

// ============================================================
// Component
// ============================================================
export const CustomersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('acs_customers_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((c: any) => {
            const name = c.name || '';
            const no = c.customerNo || '';
            const id = c.id || '';
            return !(
              ['c1', 'c2', 'c3', 'c4'].includes(id) ||
              id.startsWith('cust-sample') ||
              no.startsWith('PLG-100') ||
              ['Ahmad Fauzi', 'Siti Rahma', 'Budi Santoso'].includes(name) ||
              name.toLowerCase().includes('demo') ||
              name.toLowerCase().includes('dummy')
            );
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // ---- Modal: Tambah Pelanggan ----
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // ---- Detail & Edit Modal ----
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [showDetailPass, setShowDetailPass] = useState(false);

  // ---- Import CSV ----
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvStatus, setCsvStatus] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  const persist = (list: Customer[]) => {
    try { localStorage.setItem('acs_customers_list', JSON.stringify(list)); } catch { /* quota */ }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customerNo?.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase()) ||
      c.odpName?.toLowerCase().includes(search.toLowerCase()) ||
      c.pppoeUser?.toLowerCase().includes(search.toLowerCase()),
  );

  const openMaps = (lat: string, lng: string) => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  // -------------------------------------------------------
  // Bulk Selection & Delete
  // -------------------------------------------------------
  const isAllSelected = filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedCustomerIds.includes(c.id));
  const isSomeSelected = filteredCustomers.some((c) => selectedCustomerIds.includes(c.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredCustomers.map((c) => c.id));
      setSelectedCustomerIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredCustomers.map((c) => c.id);
      setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectCustomer = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedCustomerIds.length === 0) return;
    const count = selectedCustomerIds.length;
    if (!window.confirm(`Hapus ${count} pelanggan yang dipilih?`)) return;
    const updated = customers.filter((c) => !selectedCustomerIds.includes(c.id));
    setCustomers(updated);
    persist(updated);
    setSelectedCustomerIds([]);
    if (detailCustomer && selectedCustomerIds.includes(detailCustomer.id)) {
      setDetailCustomer(null);
    }
  };


  // -------------------------------------------------------
  // Tambah Pelanggan submit
  // -------------------------------------------------------
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) { setFormError('Nama pelanggan wajib diisi.'); return; }
    if (!form.customerNo.trim()) { setFormError('No. Pelanggan wajib diisi.'); return; }
    if (customers.some((c) => c.customerNo.trim().toLowerCase() === form.customerNo.trim().toLowerCase())) {
      setFormError('No. Pelanggan sudah terdaftar.'); return;
    }

    const newCustomer: Customer = { ...form, id: `cust-${Date.now()}` };
    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    persist(updated);
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setShowAddModal(false);
      setForm(emptyForm());
      setShowPass(false);
    }, 1200);
  };

  // -------------------------------------------------------
  // Edit & Hapus Pelanggan
  // -------------------------------------------------------
  const handleStartEdit = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditForm({ ...c });
    setIsEditing(true);
    setDetailCustomer(c);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editForm.name.trim()) {
      alert('Nama pelanggan wajib diisi!');
      return;
    }

    const updated = customers.map((c) => (c.id === editForm.id ? editForm : c));
    setCustomers(updated);
    persist(updated);
    setDetailCustomer(editForm);
    setIsEditing(false);
  };

  const handleDeleteCustomer = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Yakin ingin menghapus data pelanggan "${name}"?`)) return;
    const updated = customers.filter((c) => c.id !== id);
    setCustomers(updated);
    persist(updated);
    setSelectedCustomerIds((prev) => prev.filter((item) => item !== id));
    if (detailCustomer?.id === id) {
      setDetailCustomer(null);
      setIsEditing(false);
    }
  };

  // -------------------------------------------------------
  // Import CSV
  // -------------------------------------------------------
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setCsvStatus({ type: 'error', msg: 'File harus berformat .csv' });
      setTimeout(() => setCsvStatus(null), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = parseCsvCustomers(text);
      if (imported.length === 0) {
        setCsvStatus({ type: 'error', msg: 'File CSV kosong atau format kolom tidak dikenali.' });
        setTimeout(() => setCsvStatus(null), 4000);
        return;
      }

      const existing = new Set(customers.map((c) => c.customerNo.toLowerCase()));
      const seenBatch = new Set<string>();
      const newOnes: Customer[] = [];
      let duplicateCount = 0;

      for (const item of imported) {
        const key = item.customerNo.toLowerCase();
        if (!key || existing.has(key) || seenBatch.has(key)) {
          duplicateCount++;
          continue;
        }
        seenBatch.add(key);
        newOnes.push(item);
      }

      const updated = [...newOnes, ...customers];
      setCustomers(updated);
      persist(updated);
      setCsvStatus({
        type: 'ok',
        msg: `${newOnes.length} pelanggan berhasil diimpor (${duplicateCount} duplikat dilewati).`,
      });
      setTimeout(() => setCsvStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  // Metrik KPI ringkas tanpa teks duplikat
  const totalCount = customers.length;
  const withGpsCount = customers.filter((c) => c.lat && c.lng).length;
  const withPppoeCount = customers.filter((c) => c.pppoeUser).length;
  const withOdpCount = customers.filter((c) => c.odpName).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Data Pelanggan &amp; GIS
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono">
              {totalCount} Pelanggan
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <span><strong className="text-slate-700 dark:text-slate-200 font-mono">{withOdpCount}</strong> Terpetakan ODP</span>
            <span>&bull;</span>
            <span><strong className="text-slate-700 dark:text-slate-200 font-mono">{withPppoeCount}</strong> Akun PPPoE</span>
            <span>&bull;</span>
            <span><strong className="text-slate-700 dark:text-slate-200 font-mono">{withGpsCount}</strong> Koordinat GPS</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-white dark:bg-dark-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setForm(emptyForm());
              setFormError('');
              setFormSuccess(false);
              setShowPass(false);
            }}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* CSV Status Message */}
      {csvStatus && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-medium border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
        >
          {csvStatus.type === 'ok' ? (
            <Check className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-slate-700 dark:text-slate-300" />
          )}
          {csvStatus.msg}
        </div>
      )}

      {/* Search & Bulk Action Bar */}
      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, ID, ODP, atau akun PPPoE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 shadow-sm"
          />
        </div>

        {/* Bulk Action Toolbar */}
        {selectedCustomerIds.length > 0 && (
          <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{selectedCustomerIds.length} pelanggan dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCustomerIds([])}
                className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Data Content */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-dark-800/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Belum Ada Data Pelanggan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tambahkan pelanggan baru atau import berkas CSV untuk memulai.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setShowAddModal(true);
                setForm(emptyForm());
                setFormError('');
                setFormSuccess(false);
                setShowPass(false);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pelanggan</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((c) => {
              const isSelected = selectedCustomerIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`bg-white dark:bg-dark-800 border rounded-2xl p-4 space-y-3 shadow-sm transition-colors ${
                    isSelected ? 'border-slate-900 bg-slate-100/80 dark:border-slate-200 dark:bg-slate-800/80' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => { setDetailCustomer(c); setShowDetailPass(false); }}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCustomer(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{c.name}</h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-semibold">{c.customerNo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleStartEdit(c, e)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCustomer(c.id, c.name, e)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-700 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{c.phone || '-'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{c.address || '-'}</span>
                    </div>
                    {c.pppoeUser && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="text-[11px] text-slate-500">PPPoE:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{c.pppoeUser}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">ODP:</span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-dark-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold">
                        {c.odpName || '-'}
                      </span>
                    </div>
                    {c.lat && c.lng && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openMaps(c.lat!, c.lng!); }}
                        className="text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline flex items-center gap-1 font-mono font-medium"
                      >
                        <Navigation2 className="w-3 h-3 text-slate-500" />
                        <span>Peta</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table - Ringkas, kolom status ganda dihapus, aksi langsung */}
          <div className="hidden md:block bg-white dark:bg-dark-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 dark:bg-dark-900/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Pelanggan</th>
                    <th className="py-3.5 px-4">Kontak / Telepon</th>
                    <th className="py-3.5 px-4">ODP</th>
                    <th className="py-3.5 px-4">PPPoE User</th>
                    <th className="py-3.5 px-4">Koordinat GPS</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {filteredCustomers.map((c) => {
                    const isSelected = selectedCustomerIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/90 dark:hover:bg-slate-700/80'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                        onClick={() => { setDetailCustomer(c); setShowDetailPass(false); }}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCustomer(c.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-900 accent-slate-900 dark:accent-slate-100 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{c.customerNo}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{c.phone || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-dark-900 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
                            {c.odpName || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {c.pppoeUser ? (
                            <span className="font-mono text-slate-800 dark:text-slate-200">
                              {c.pppoeUser}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {c.lat && c.lng ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); openMaps(c.lat!, c.lng!); }}
                              className="font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] flex items-center gap-1 hover:underline transition-colors"
                              title="Buka Google Maps"
                            >
                              <Navigation2 className="w-3 h-3 text-slate-500" />
                              {parseFloat(c.lat).toFixed(4)}, {parseFloat(c.lng).toFixed(4)}
                            </button>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleStartEdit(c, e)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-700 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                              title="Edit Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCustomer(c.id, c.name, e)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-dark-700 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors"
                              title="Hapus Pelanggan"
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
          </div>
        </>

      )}

      {/* ============================================================
          MODAL: Tambah Pelanggan (createPortal)
          ============================================================ */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90dvh] sm:max-h-[calc(100vh-2.5rem)] flex flex-col mt-auto sm:my-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-white dark:bg-dark-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tambah Pelanggan Baru</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </div>
                )}

                {/* Section: Identitas */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
                    Identitas Pelanggan
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">No. Pelanggan *</label>
                      <input
                        type="text"
                        placeholder="PLG-0001"
                        value={form.customerNo}
                        onChange={(e) => setForm({ ...form, customerNo: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">ODP Terhubung</label>
                      <input
                        type="text"
                        placeholder="ODP-A-001"
                        value={form.odpName}
                        onChange={(e) => setForm({ ...form, odpName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Nama Pelanggan *</label>
                  <input
                    type="text"
                    placeholder="Budi Santoso"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">No. Telepon</label>
                    <input
                      type="tel"
                      placeholder="08123456789"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Alamat</label>
                    <input
                      type="text"
                      placeholder="Jl. Merdeka No. 10"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>
                </div>

                {/* Section: Koordinat GPS */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Navigation2 className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    Titik Koordinat GPS
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Latitude</label>
                      <input
                        type="text"
                        placeholder="-6.200000"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Longitude</label>
                      <input
                        type="text"
                        placeholder="106.816666"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1.5">Opsional · Digunakan untuk pin lokasi di peta GIS</p>
                </div>

                {/* Section: PPPoE */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Wifi className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    Akun PPPoE
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Username PPPoE</label>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="user@isp"
                          value={form.pppoeUser}
                          onChange={(e) => setForm({ ...form, pppoeUser: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Password PPPoE</label>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={form.pppoePass}
                          onChange={(e) => setForm({ ...form, pppoePass: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-dark-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSuccess}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 disabled:opacity-70 text-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
                  >
                    {formSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Tersimpan!
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Simpan Pelanggan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ============================================================
          MODAL: Detail & Edit Pelanggan (createPortal)
          ============================================================ */}
      {detailCustomer &&
        createPortal(
          <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl max-h-[90dvh] sm:max-h-[calc(100vh-2.5rem)] flex flex-col mt-auto sm:my-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-white dark:bg-dark-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isEditing ? 'Edit Data Pelanggan' : detailCustomer.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{detailCustomer.customerNo}</p>
                </div>
                <button
                  onClick={() => {
                    setDetailCustomer(null);
                    setIsEditing(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isEditing && editForm ? (
                <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Nama Pelanggan *</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Telepon</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">ODP</label>
                      <input
                        type="text"
                        value={editForm.odpName}
                        onChange={(e) => setEditForm({ ...editForm, odpName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Alamat</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Latitude</label>
                      <input
                        type="text"
                        value={editForm.lat || ''}
                        onChange={(e) => setEditForm({ ...editForm, lat: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">Longitude</label>
                      <input
                        type="text"
                        value={editForm.lng || ''}
                        onChange={(e) => setEditForm({ ...editForm, lng: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">PPPoE User</label>
                      <input
                        type="text"
                        value={editForm.pppoeUser || ''}
                        onChange={(e) => setEditForm({ ...editForm, pppoeUser: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-400">PPPoE Password</label>
                      <input
                        type="text"
                        value={editForm.pppoePass || ''}
                        onChange={(e) => setEditForm({ ...editForm, pppoePass: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-dark-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-all shadow-xs active:scale-95"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="p-5 space-y-4 overflow-y-auto">
                    {/* Info dasar */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Telepon</p>
                        <p className="text-slate-800 dark:text-slate-200 font-mono">{detailCustomer.phone || '-'}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">ODP</p>
                        <p className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{detailCustomer.odpName || '-'}</p>
                      </div>
                      <div className="col-span-2 space-y-0.5">
                        <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wide">Alamat</p>
                        <p className="text-slate-800 dark:text-slate-200">{detailCustomer.address || '-'}</p>
                      </div>
                    </div>

                    {/* Koordinat GPS */}
                    <div className="bg-slate-50 dark:bg-dark-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Navigation2 className="w-3 h-3 text-slate-500" /> Titik Koordinat GPS
                      </p>
                      {detailCustomer.lat && detailCustomer.lng ? (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-200">
                            {parseFloat(detailCustomer.lat).toFixed(6)}, {parseFloat(detailCustomer.lng).toFixed(6)}
                          </span>
                          <button
                            onClick={() => openMaps(detailCustomer.lat!, detailCustomer.lng!)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <MapPin className="w-3 h-3 text-slate-500" /> Buka Maps
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-600">Koordinat belum diisi</p>
                      )}
                    </div>

                    {/* PPPoE */}
                    <div className="bg-slate-50 dark:bg-dark-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-slate-500" /> Akun PPPoE
                      </p>
                      {detailCustomer.pppoeUser ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Username</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">{detailCustomer.pppoeUser}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Password</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-800 dark:text-slate-300">
                                {showDetailPass ? detailCustomer.pppoePass || '-' : '••••••••'}
                              </span>
                              <button
                                onClick={() => setShowDetailPass(!showDetailPass)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              >
                                {showDetailPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-600">Akun PPPoE belum dikonfigurasi</p>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-4 space-y-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(detailCustomer)}
                        className="btn-dark flex-1 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-colors force-white"
                      >
                        Edit Data
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(detailCustomer.id, detailCustomer.name)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                    <button
                      onClick={() => setDetailCustomer(null)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-900 border border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-medium transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
