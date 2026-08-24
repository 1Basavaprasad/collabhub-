import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, LogOut, RefreshCw, Menu } from 'lucide-react';
import Button from './Button';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, healthInfo, checkHealth } = useAuth();
  const navigate = useNavigate();
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleHealthRefresh = async () => {
    setIsRefreshingHealth(true);
    await checkHealth();
    setTimeout(() => setIsRefreshingHealth(false), 500);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right: Connection Status & Profile Quick Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Subtle API Health Pill */}
          <button
            type="button"
            onClick={handleHealthRefresh}
            title="Click to refresh connection status"
            className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/60 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                healthInfo.isOnline
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline font-mono text-[11px] text-slate-300">
              {healthInfo.isOnline ? 'Online' : 'Offline'}
            </span>
            <RefreshCw
              className={`h-3 w-3 text-slate-500 ${
                isRefreshingHealth ? 'animate-spin text-indigo-400' : ''
              }`}
            />
          </button>

          {/* User Account Info */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold text-xs uppercase">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.username
                  ? user.username.charAt(0).toUpperCase()
                  : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-200 leading-tight">
                  {user.full_name || user.username}
                </span>
                <span className="text-[11px] text-slate-400 font-mono leading-tight">
                  @{user.username}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleLogout}
            id="logout-btn"
            icon={LogOut}
            iconPosition="left"
            className="text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"
          >
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
