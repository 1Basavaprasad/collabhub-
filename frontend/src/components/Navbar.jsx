import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Layers, 
  LogOut, 
  User, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Menu,
  X
} from 'lucide-react';

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
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left side: Logo and mobile menu */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-200">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
          </Link>
        </div>

        {/* Right side: API Health, User Info & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Real-time Health Indicator */}
          <div 
            onClick={handleHealthRefresh}
            title="Click to recheck API Health"
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-800 bg-slate-950/60 text-xs text-slate-300 hover:border-slate-700 cursor-pointer transition-all"
          >
            <span className="relative flex h-2 w-2">
              {healthInfo.isOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              )}
            </span>
            <span className="font-medium">
              {healthInfo.isOnline ? 'API Healthy' : 'API Offline'}
            </span>
            <RefreshCw className={`h-3 w-3 text-slate-400 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
          </div>

          {/* User Badge */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 font-semibold text-xs uppercase shadow-inner">
                {user.full_name ? user.full_name.charAt(0) : user.username ? user.username.charAt(0) : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user.full_name || user.username}
                </span>
                <span className="text-[11px] text-slate-400 font-mono leading-tight">
                  @{user.username}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            id="logout-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
