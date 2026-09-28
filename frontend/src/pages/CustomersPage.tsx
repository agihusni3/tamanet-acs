import React, { useState } from 'react';
import { Users, Search, Plus, MapPin, Phone, Upload, Check } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const customers = [
    {
      id: 'c1',
      customerNo: 'CUST-001',
      name: 'Rumah Nanang',
      phone: '0812-3456-7890',
      address: 'Talang 20, Air Naningan, Tanggamus',
      odpName: 'ODP-AN-01 (Kluwus)',
      hasCoords: true,
    },
    {
      id: 'c2',
      customerNo: 'CUST-002',
      name: 'Teguh Brothers Farm',
      phone: '0813-9876-5432',
      address: 'Jalan Raya Air Naningan Sukajadi',
      odpName: 'ODP-AN-01 (Kluwus)',
      hasCoords: true,
    },
    {
      id: 'c3',
      customerNo: 'CUST-003',
      name: 'Warung Dewa',
      phone: '0852-1122-3344',
      address: 'Dsn. Margomulyo RT 02',
      odpName: 'ODP-AN-02 (Margomulyo)',
      hasCoords: true,
    },
    {
      id: 'c4',
      customerNo: 'CUST-004',
      name: 'Lapak Rudy Sayur',
      phone: '0821-5566-7788',
      address: 'Pasar Baru Air Naningan',
      odpName: 'ODP-AN-03 (Air Kubang)',
      hasCoords: true,
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Data Pelanggan & Lokasi GIS</h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Kelola identitas pelanggan, relasi ODP, dan koordinat GPS untuk peta
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 bg-dark-800 border border-slate-700 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      <div className="bg-dark-800 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark-900/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">No. Pelanggan</th>
              <th className="py-3.5 px-4">Nama Pelanggan</th>
              <th className="py-3.5 px-4">Kontak Telepon</th>
              <th className="py-3.5 px-4">Alamat Domisili</th>
              <th className="py-3.5 px-4">ODP Terhubung</th>
              <th className="py-3.5 px-4 text-center">Status GPS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-200">{c.customerNo}</td>
                <td className="py-3 px-4 font-semibold text-slate-100">{c.name}</td>
                <td className="py-3 px-4 font-mono text-slate-300">{c.phone}</td>
                <td className="py-3 px-4 text-slate-300">{c.address}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {c.odpName}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span>Terpetakan</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
