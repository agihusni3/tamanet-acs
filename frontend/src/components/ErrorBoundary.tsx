import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-dark-900 text-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mb-4 border border-slate-700 shadow-md">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Terjadi Kendala Memuat Komponen</h2>
          <p className="text-xs text-slate-400 max-w-md font-mono bg-dark-800 p-3 rounded-xl border border-slate-700 mb-6 text-left overflow-auto">
            {this.state.error?.message || 'Unknown error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all force-white"
          >
            <RefreshCw className="w-4 h-4 text-white dark:text-slate-900" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
