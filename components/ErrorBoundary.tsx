import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#2D2424] border border-red-500/30 rounded-2xl p-6 m-4 shadow-2xl text-white space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 text-red-400 border-b border-[#3A2E2E] pb-3">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-bold">
              {this.props.fallbackTitle || 'Section Error'}
            </h3>
          </div>
          <p className="text-xs text-gray-300">
            An unexpected error occurred in this view. Your other data remains intact and safely persisted.
          </p>
          {this.state.error && (
            <pre className="p-3 bg-[#1A1515] rounded-xl border border-[#3A2E2E] text-[11px] font-mono text-red-300 overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-field-gold text-black rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-field-goldHover transition-colors"
          >
            <RefreshCw size={14} /> Try Reloading View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
