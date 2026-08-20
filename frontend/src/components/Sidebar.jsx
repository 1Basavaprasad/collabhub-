import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Activity, 
  ShieldCheck, 
  LogOut, 
  Layers,
  ChevronRight,
  Server
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, healthInfo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
    },
  ];

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-slate-900/95 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div>
          {/* Brand header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-white">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/90 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              v1.0
            </span>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Core Platform
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Security & System Info Box */}
          <div className="mx-4 mt-2 p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Auth Status</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">State:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Authenticated
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1">
                <Server className="h-3 w-3 text-slate-400" /> Backend:
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                {healthInfo.isOnline ? 'collabhub-api' : 'connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom User info & logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
          {user && (
            <div className="mb-3 px-2 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20">
                {user.full_name ? user.full_name.charAt(0) : user.username.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-200">
                  {user.full_name || user.username}
                </p>
                <p className="truncate text-[11px] text-slate-400 font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700/50 transition-all duration-150"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
