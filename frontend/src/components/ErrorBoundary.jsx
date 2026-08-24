import { Component } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error internally for diagnostics without exposing stack traces to the user
    console.error('TeamX ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 bg-mesh text-slate-800 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl text-center space-y-5 animate-scale-in">
            {/* Error Icon */}
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 mx-auto shadow-2xs">
              <AlertTriangle className="h-7 w-7" />
            </div>

            {/* Error Message */}
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Please refresh the page or try again.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                icon={RefreshCw}
                iconPosition="left"
                onClick={this.handleReload}
                className="w-full sm:w-auto text-xs font-semibold"
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={LayoutDashboard}
                iconPosition="left"
                onClick={this.handleReset}
                className="w-full sm:w-auto text-xs font-semibold"
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
