import { Link } from 'react-router-dom';
import Button from '../components/Button';
import { Layers, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-mesh relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-600/25 border border-indigo-400/30 group-hover:scale-105 transition-transform">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Collab<span className="text-indigo-400">Hub</span>
          </span>
        </Link>

        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-slate-800/80 space-y-4">
          <span className="text-6xl font-extrabold font-mono text-indigo-400 block">
            404
          </span>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            The workspace destination or page you requested does not exist or has been relocated.
          </p>

          <div className="pt-2">
            <Link to="/dashboard" className="block w-full">
              <Button
                variant="primary"
                size="md"
                icon={ArrowLeft}
                iconPosition="left"
                className="w-full"
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
