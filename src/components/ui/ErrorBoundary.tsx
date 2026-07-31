import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (props: { error: Error; retry: () => void; goHome: () => void; componentName?: string }) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentName: string | undefined;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentName: undefined };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);

    // Try to extract component name from the stack
    const stackMatch = info.componentStack?.match(/at\s+(\w+)/);
    const componentName = stackMatch?.[1];
    this.setState({ componentName });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentName: undefined });
    // Force a re-render by reloading the current route
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, componentName: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback({
        error: this.state.error,
        retry: this.handleRetry,
        goHome: this.handleGoHome,
        componentName: this.state.componentName,
      });
    }
    return this.props.children;
  }
}

interface ReactErrorInfo {
  componentStack?: string;
}

/**
 * Default error fallback UI. Never shows a blank screen.
 */
export function ErrorFallback({
  error,
  retry,
  goHome,
  componentName,
}: {
  error: Error;
  retry: () => void;
  goHome: () => void;
  componentName?: string;
}) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-300/20 rounded-full blur-3xl" />
      </div>

      <div className="glass-card p-8 w-full max-w-lg relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Application Error</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Something went wrong while rendering this page.</p>
          </div>
        </div>

        {componentName && (
          <div className="mb-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Component</p>
            <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white mt-0.5">{componentName}</p>
          </div>
        )}

        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
          <p className="text-xs text-red-400 uppercase tracking-wide mb-1">Error Message</p>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error.message}</p>
        </div>

        {isDev && error.stack && (
          <details className="mb-4">
            <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer flex items-center gap-1.5 mb-2">
              <Bug className="w-4 h-4" /> Stack Trace (development only)
            </summary>
            <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl overflow-x-auto max-h-48 overflow-y-auto">
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex gap-3">
          <button onClick={retry} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={goHome} className="btn-ghost flex-1 flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
