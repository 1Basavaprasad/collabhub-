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
  Lock,
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
      disabled: false,
    },
    {
      name: 'Company',
      to: '/company',
      icon: Building2,
      disabled: false,
    },
    {
      name: 'Teams',
      to: '#teams',
      icon: Users2,
      disabled: true,
      tooltip: 'Teams module coming soon',
    },
    {
      name: 'Projects',
      to: '#projects',
      icon: FolderKanban,
      disabled: true,
      tooltip: 'Projects module coming soon',
    },
    {
      name: 'Tasks',
      to: '#tasks',
      icon: CheckSquare,
      disabled: true,
      tooltip: 'Tasks module coming soon',
    },
    {
      name: 'Activity',
      to: '#activity',
      icon: Activity,
      disabled: true,
      tooltip: 'Activity feed coming soon',
    },
  ];

  const systemNavItems = [
    {
      name: 'Profile',
      to: '#profile',
      icon: User,
      disabled: false,
    },
    {
      name: 'Settings',
      to: '#settings',
      icon: Settings,
      disabled: true,
      tooltip: 'Settings coming soon',
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
          <div className="flex h-16 items-center px-6 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-base tracking-tight text-white">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
          </div>

          {/* Business Hierarchy Navigation */}
          <div className="p-4 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 font-mono">
              Workspace
            </div>

            {businessNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed select-none transition-colors hover:bg-slate-900/30"
                    title={item.tooltip}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <span>{item.name}</span>
                    </div>
                    <Lock className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-500 transition-colors" />
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
            <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 font-mono">
              Account
            </div>

            {systemNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed select-none hover:bg-slate-900/30"
                    title={item.tooltip}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <span>{item.name}</span>
                    </div>
                    <Lock className="h-3.5 w-3.5 text-slate-600" />
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
                </a>
              );
            })}
          </div>
        </div>

        {/* Bottom User Profile Area */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          {/* Subtle System Status Pill */}
          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  healthInfo.isOnline
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-300">
                {healthInfo.isOnline ? 'API Connected' : 'Connecting...'}
              </span>
            </span>
            <span className="text-[10px] text-slate-500">v1.0</span>
          </div>

          {user && (
            <div className="px-1 flex items-center gap-3 pt-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.username
                  ? user.username.charAt(0).toUpperCase()
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/70 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/30 border border-slate-700/60 transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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
