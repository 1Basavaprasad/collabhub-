import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Layers, LogOut, RefreshCw, Menu, Building, ChevronDown, Check } from 'lucide-react';
import Button from './Button';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, healthInfo, checkHealth } = useAuth();
  const { company, companies, selectCompany } = useCompany();
  const navigate = useNavigate();
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-500/20 text-white font-bold text-sm">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
              Collab<span className="text-indigo-400">Hub</span>
            </span>
          </Link>

          {/* Quick Workspace Switcher in Header (if multi-company) */}
          {company && companies.length > 1 && (
            <div className="relative hidden sm:block ml-4 pl-4 border-l border-slate-800">
              <button
                type="button"
                onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              >
                <Building className="h-3.5 w-3.5 text-indigo-400" />
                <span className="max-w-[130px] truncate">{company.name}</span>
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>

              {isCompanyMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsCompanyMenuOpen(false)}
                  />
                  <div className="absolute left-4 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 divide-y divide-slate-800/60">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                      Workspaces
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            selectCompany(c);
                            setIsCompanyMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                            c.id === company.id
                              ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {c.id === company.id && (
                            <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Status & User Info */}
        <div className="flex items-center gap-3">
          {/* Subtle API Health Status */}
          <button
            type="button"
            onClick={handleHealthRefresh}
            title="Click to refresh connection status"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800/80 bg-slate-900/50 text-[11px] text-slate-400 hover:border-slate-700 hover:text-slate-300 cursor-pointer transition-colors"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                healthInfo.isOnline
                  ? 'bg-emerald-400'
                  : 'bg-rose-500'
              }`}
            />
            <span className="hidden md:inline font-mono">
              {healthInfo.isOnline ? 'Connected' : 'Offline'}
            </span>
            <RefreshCw
              className={`h-2.5 w-2.5 text-slate-500 ${
                isRefreshingHealth ? 'animate-spin text-indigo-400' : ''
              }`}
            />
          </button>

          {/* User Account Info */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300 font-semibold text-xs uppercase">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.username
                  ? user.username.charAt(0).toUpperCase()
                  : 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-200">
                {user.full_name || user.username}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="xs"
            onClick={handleLogout}
            id="logout-btn"
            icon={LogOut}
            className="text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
          >
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
