import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '@/i18n/config';

interface Props {
  children: React.ReactNode;
  /** Optional name for identifying which panel crashed in logs */
  panelName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Lightweight error boundary for individual panels (AI, Stats, Properties, etc.).
 * Unlike the global ErrorBoundary, this one:
 * - Shows a small inline error card instead of a full-screen takeover
 * - Allows the user to retry without reloading the entire page
 * - Keeps the rest of the application running
 */
export class PanelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PanelErrorBoundary${this.props.panelName ? `: ${this.props.panelName}` : ''}]`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            {i18n.t('errorBoundary.panelCrash', 'Ten panel napotkał błąd.')}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs text-destructive/80 bg-destructive/5 border border-destructive/20 rounded-lg p-2 overflow-auto max-h-24 w-full">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <RefreshCw size={12} />
            {i18n.t('common.tryAgain', 'Spróbuj ponownie')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
