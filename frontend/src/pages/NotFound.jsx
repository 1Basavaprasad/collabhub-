import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Layers, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center p-6 bg-mesh relative text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white">
      <div className="relative z-10 w-full max-w-md text-center space-y-6 animate-scale-in">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-xs text-white font-bold text-base group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
          </span>
        </Link>

        <div className="bg-white dark:bg-[#151F32] rounded-xl p-8 sm:p-10 shadow-xs border border-slate-200/80 dark:border-[#263449] space-y-4">
          <span className="text-5xl sm:text-6xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 block">
            404
          </span>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] leading-relaxed">
            The workspace destination or page you requested does not exist or has been relocated.
          </p>

          <div className="pt-2">
            <Link to="/dashboard" className="block w-full">
              <Button
                variant="primary"
                size="md"
                icon={ArrowLeft}
                iconPosition="left"
                className="w-full text-xs font-medium"
              >
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
