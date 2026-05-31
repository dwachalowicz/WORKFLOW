import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import i18n from '@/i18n/config';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    // Future: send to Sentry / error tracking service
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">
                {i18n.t('errorBoundary.title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {i18n.t('errorBoundary.desc')}
              </p>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs text-destructive/80 bg-destructive/5 border border-destructive/20 rounded-xl p-3 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-xl hover:bg-secondary/80 transition-colors"
              >
                {i18n.t('common.tryAgain', 'Spróbuj ponownie')}
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-background bg-brand-gold rounded-xl hover:bg-brand-gold/90 transition-colors"
              >
                <RefreshCw size={14} />
                {i18n.t('errorBoundary.refresh')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
