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
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 border-r border-slate-800/80 bg-slate-950/95 lg:bg-slate-950/60 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 backdrop-blur-md ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Header Brand for mobile */}
          <div className="flex lg:hidden h-10 items-center px-5 mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                Collab<span className="text-indigo-400">Hub</span>
              </span>
            </div>
          </div>

          {/* Business Hierarchy Navigation */}
          <div className="px-3 space-y-0.5">
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Workspace
            </div>

            {businessNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none transition-colors"
                    title={item.tooltip}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <span>{item.name}</span>
                    </div>
                    <Lock className="h-3 w-3 text-slate-600" />
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 font-semibold border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Platform Preferences & Profile */}
          <div className="px-3 pt-4 mt-4 space-y-0.5 border-t border-slate-800/60">
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Account
            </div>

            {systemNavItems.map((item) => {
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none"
                    title={item.tooltip}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-slate-600" />
                      <span>{item.name}</span>
                    </div>
                    <Lock className="h-3 w-3 text-slate-600" />
                  </div>
                );
              }

              return (
                <a
                  key={item.name}
                  href="#profile"
                  onClick={onClose}
                  className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Bottom User Area */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-2">
          {user && (
            <div className="px-2 flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs">
                {user.full_name
                  ? user.full_name.charAt(0).toUpperCase()
                  : user.username
                  ? user.username.charAt(0).toUpperCase()
                  : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">
                  {user.full_name || user.username}
                </p>
                <p className="truncate text-[10px] text-slate-400 font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
