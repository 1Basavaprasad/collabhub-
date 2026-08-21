import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users2,
  FolderKanban,
  CheckSquare,
  Activity,
  User,
  Settings,
  LogOut,
  Layers,
  ShieldCheck,
  Server,
  Key,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, healthInfo } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const businessNavItems = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      active: true,
    },
    {
      name: 'Company',
      to: '#company',
      icon: Building2,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      name: 'Teams',
      to: '#teams',
      icon: Users2,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      name: 'Projects',
      to: '#projects',
      icon: FolderKanban,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      name: 'Tasks',
      to: '#tasks',
      icon: CheckSquare,
      badge: 'Coming Soon',
      disabled: true,
    },
    {
      name: 'Activity',
      to: '#activity',
      icon: Activity,
      badge: 'Coming Soon',
      disabled: true,
    },
  ];

  const systemNavItems = [
    {
      name: 'Profile',
      to: '#profile',
      icon: User,
      badge: 'Active',
      disabled: false,
    },
    {
      name: 'Settings',
      to: '#settings',
      icon: Settings,
      badge: 'Coming Soon',
      disabled: true,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800/80 bg-slate-950/95 lg:bg-slate-900/40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 backdrop-blur-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div className="flex-1 overflow-y-auto">
          {/* Header Brand */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-white">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
            <span className="text-[10px] font-semibold font-mono uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              SaaS v1.0
            </span>
          </div>

          {/* Business Hierarchy Navigation */}
          <div className="p-4 space-y-1">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Company Workspace
            </div>

            {businessNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed opacity-75 select-none"
                    title={`${item.name} module will activate when company backend is connected.`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Platform Preferences & Profile */}
          <div className="px-4 pt-2 space-y-1 border-t border-slate-800/60">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Account & System
            </div>

            {systemNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed opacity-75 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.name}
                  href="#profile"
                  onClick={onClose}
                  className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </a>
              );
            })}
          </div>

          {/* System Auth Security Status */}
          <div className="mx-4 mt-4 p-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                Auth Status
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Valid
              </span>
            </div>

            <div className="pt-1 border-t border-slate-800/80 text-[11px] space-y-1 text-slate-400 font-mono">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Key className="h-3 w-3 text-slate-500" /> Token:
                </span>
                <span className="text-slate-300">Bearer HS256</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Server className="h-3 w-3 text-slate-500" /> API:
                </span>
                <span className={healthInfo.isOnline ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {healthInfo.isOnline ? 'collabhub-api' : 'connecting...'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom User Profile Area */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          {user && (
            <div className="mb-3 px-1 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20">
                {user.full_name
                  ? user.full_name.charAt(0)
                  : user.username
                  ? user.username.charAt(0)
                  : 'U'}
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/70 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 border border-slate-700/60 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
