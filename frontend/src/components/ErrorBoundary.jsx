import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('CollabHub ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.toString() || 'Unknown runtime error';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 bg-mesh text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
          <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-lg shadow-rose-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Something went wrong
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  We encountered an unexpected error while rendering this page.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rose-400">
                  Runtime Error
                </span>
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 font-mono transition-colors cursor-pointer"
                >
                  <span>{this.state.showDetails ? 'Hide Stack' : 'View Stack'}</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              </div>
              <p className="text-xs font-mono text-rose-200 break-words">
                {errorMessage}
              </p>

              {this.state.showDetails && componentStack && (
                <div className="pt-2 border-t border-rose-500/20 max-h-48 overflow-y-auto">
                  <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {componentStack}
                  </pre>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={this.handleReload}
                className="w-full sm:w-auto text-xs"
              >
                Reload application
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Home}
                onClick={this.handleReset}
                className="w-full sm:w-auto text-xs"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
