import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  Radio,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../api/client';

export const LoginPage: React.FC = () => {
  const { branding, login, showToast } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Harap masukkan username dan password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Coba autentikasi via Backend API NestJS
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });

      if (response.data && response.data.accessToken) {
        if (response.data.refreshToken && rememberMe) {
          try {
            localStorage.setItem('acs_refresh_token', response.data.refreshToken);
          } catch {}
        }
        login(response.data.accessToken, {
          name: response.data.user?.username || username,
          role: response.data.user?.role || 'SUPERADMIN',
        });
        showToast('Login berhasil. Selamat datang di ACS Console!');
        return;
      }
    } catch (err: any) {
      console.warn('Backend login error or offline, checking fallback...', err);

      const isOffline =
        !err.response ||
        err.response?.status === 503 ||
        err.response?.status === 502 ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED';

      // 2. Fallback Mode: Jika backend belum aktif (misal port 4000 offline), izinkan akun default NOC
      if (isOffline) {
        if (
          (username.trim().toLowerCase() === 'admin' && password.trim() === 'admin123') ||
          (username.trim().toLowerCase() === 'admin' && password.trim() === 'admin')
        ) {
          const mockToken = `acs_offline_jwt_${Date.now()}`;
          login(mockToken, {
            name: 'Administrator NOC',
            role: 'SUPERADMIN',
          });
          showToast('Login berhasil (Sesi Offline NOC Aktif)');
          return;
        } else {
          setErrorMessage('Username atau password salah. Akun default: admin / admin123');
          setIsLoading(false);
          return;
        }
      }

      // Jika backend online tetapi kredensial ditolak (401)
      if (err.response?.status === 401) {
        setErrorMessage('Username atau password tidak valid');
      } else {
        setErrorMessage(err.response?.data?.message || 'Gagal login, periksa koneksi server Anda');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page relative min-h-screen w-screen flex items-center justify-center bg-slate-950 overflow-hidden px-4 font-sans select-none">
      {/* Background Subtle Tech Grid */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-7 sm:p-9 shadow-2xl flex flex-col">
        {/* Brand & System Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-md">
              {branding.logoImageUrl ? (
                <img
                  src={branding.logoImageUrl}
                  alt={branding.appName}
                  className="w-9 h-9 object-contain rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Radio className="w-7 h-7 text-slate-200" />
              )}
            </div>
          </div>

          <h1 className="login-title text-xl font-bold text-white tracking-tight">
            <span>{branding.appName || 'ACS Platform'}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            {branding.tagline || 'Enterprise CWMP TR-069 & GPON OLT Management Console'}
          </p>
        </div>

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-start gap-3 text-slate-200 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="login-input w-full pl-10 pr-4 py-2.5 bg-dark-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 transition-all font-mono"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="login-input w-full pl-10 pr-11 py-2.5 bg-dark-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 transition-all font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-dark-900 border-slate-700 accent-slate-200"
              />
              <span>Ingat sesi</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-white hover:bg-slate-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
