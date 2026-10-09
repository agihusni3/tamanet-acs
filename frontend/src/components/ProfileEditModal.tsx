import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, Shield, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const { user, updateUser, showToast } = useAppContext();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      alert('Konfirmasi password tidak cocok.');
      return;
    }

    updateUser({
      name: name.trim() || 'Admin NOC',
      email: email.trim() || 'admin@acs.noc.id',
      phone: phone.trim(),
    });

    showToast('Profil akun administrator berhasil diperbarui!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full sm:max-w-md bg-white dark:bg-dark-800 border-t sm:border border-slate-200 dark:border-slate-700/90 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin mt-auto sm:my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold border border-slate-300 dark:border-slate-700 shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100">Profil Administrator</h3>
              <p className="text-[11px] text-slate-400">Kelola info akun & kredensial login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nama Lengkap</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Administrator"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@isp.net"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 font-mono text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Nomor Telepon / WhatsApp</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/80">
            <span className="block text-slate-400 font-bold mb-2 uppercase text-[10px] tracking-wider">
              Ubah Password (Opsional)
            </span>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password Baru"
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                />
              </div>

              {newPassword && (
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi Password Baru"
                    className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-700/80 pt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Role: {user.role}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white shadow-sm rounded-xl transition-all active:scale-95 force-white"
              >
                Simpan Profil
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
