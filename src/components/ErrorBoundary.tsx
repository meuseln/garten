import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  details: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', details: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedMessage = error.message || 'Unbekannter Anwendungsfehler';
    let details: string | null = null;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.operationType) {
        parsedMessage = `Datenbank-Zugriffsfehler (${parsed.operationType} auf ${parsed.path || 'unbekannt'})`;
        details = parsed.error || null;
      }
    } catch {
      // Standard Error
    }
    return {
      hasError: true,
      message: parsedMessage,
      details,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] dark:bg-[#0F1412] p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#CF6432]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Unerwarteter Fehler in Hof & Garten
              </h2>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{this.state.message}</p>
            {this.state.details && (
              <pre className="text-xs bg-neutral-100 dark:bg-neutral-900 p-3 rounded-lg overflow-auto text-neutral-700 dark:text-neutral-300 font-mono">
                {this.state.details}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#233A29] text-white text-sm font-medium hover:opacity-90 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Anwendung neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
