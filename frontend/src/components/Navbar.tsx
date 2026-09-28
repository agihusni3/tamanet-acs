import React from 'react';
import { Search, Bell, Sun, User, Plus } from 'lucide-react';

interface NavbarProps {
  onQuickAction?: (action: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onQuickAction }) => {
  return (
    <header className="h-16 bg-dark-800/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Search Input Bar with Shortcut ⌘K */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search or type /view, /devices, /ont... (⌘ K)"
            className="w-full bg-dark-900 border border-slate-700/80 rounded-xl pl-10 pr-12 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 text-slate-400 rounded px-1.5 py-0.5 text-[10px] font-mono">
            ⌘ K
          </kbd>
        </div>
      </div>

      {/* Quick Action Buttons (Matching User Reference Image) */}
      <div className="flex items-center gap-2 mx-4 hidden lg:flex">
        <button
          onClick={() => onQuickAction?.('server')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Server / OLT</span>
        </button>

        <button
          onClick={() => onQuickAction?.('odc')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ODC</span>
        </button>

        <button
          onClick={() => onQuickAction?.('odp')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ODP</span>
        </button>

        <button
          onClick={() => onQuickAction?.('ont')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>ONT</span>
        </button>

        <button
          onClick={() => onQuickAction?.('cable')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Fiber Line</span>
        </button>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-dark-900 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <Sun className="w-4 h-4" />
        </button>

        <button className="w-9 h-9 rounded-xl bg-dark-900 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-slate-200 relative transition-colors">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2"></span>
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-brand-500/30">
            A
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200">Admin NOC</div>
            <div className="text-[10px] text-brand-400 font-mono">SUPERADMIN</div>
          </div>
        </div>
      </div>
    </header>
  );
};
