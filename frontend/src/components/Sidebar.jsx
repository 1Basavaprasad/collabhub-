import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Avatar from './Avatar';
import {
  LayoutDashboard,
  Building2,
  Users2,
  FolderKanban,
  CheckSquare,
  User,
  Settings as SettingsIcon,
  LogOut,
  Layers,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const workspaceNav = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
      disabled: false,
    },
    {
      name: 'Company',
      to: '/company?tab=overview',
      icon: Building2,
      disabled: false,
      exactMatch: true,
    },
    {
      name: 'Members',
      to: '/company?tab=members',
      icon: Users2,
      disabled: false,
      matchTab: 'members',
    },
    {
      name: 'Invitations',
      to: '/company?tab=invitations',
      icon: Mail,
      disabled: false,
      matchTab: 'invitations',
    },
  ];

  const collaborationNav = [
    {
      name: 'Teams',
      to: '/teams',
      icon: Users2,
      disabled: false,
    },
    {
      name: 'Projects',
      icon: FolderKanban,
      disabled: true,
      tooltip: 'Projects module coming soon',
    },
    {
      name: 'Tasks',
      icon: CheckSquare,
      disabled: true,
      tooltip: 'Tasks module coming soon',
    },
  ];

  const accountNav = [
    {
      name: 'User Profile',
      to: '/profile',
      icon: User,
      disabled: false,
    },
    {
      name: 'Settings',
      to: '/settings',
      icon: SettingsIcon,
      disabled: false,
    },
  ];

  const isItemActive = (item) => {
    if (!item.to) return false;
    if (item.exactMatch) {
      return location.pathname === '/company' && (!location.search || location.search.includes('tab=overview'));
    }
    if (item.matchTab) {
      return location.pathname === '/company' && location.search.includes(`tab=${item.matchTab}`);
    }
    return location.pathname.startsWith(item.to);
  };

  const renderNavSection = (items) => {
    return items.map((item) => {
      const Icon = item.icon;
      const active = isItemActive(item);

      if (item.disabled) {
        return (
          <div
            key={item.name}
            className={`flex items-center ${
              isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-1.5'
            } rounded-lg text-xs font-medium text-slate-400 dark:text-[#64748B] cursor-not-allowed select-none group relative`}
            title={item.tooltip}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-slate-400 dark:text-[#64748B] shrink-0" />
              {!isCollapsed && <span>{item.name}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-[#151F32] text-slate-400 dark:text-[#64748B] px-1.5 py-0.5 rounded font-medium border border-slate-200/60 dark:border-[#263449]">
                Soon
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 dark:bg-[#1B263A] text-white text-[11px] font-medium rounded-md shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700 dark:border-[#263449]">
                {item.name} (Coming soon)
              </div>
            )}
          </div>
        );
      }

      return (
        <NavLink
          key={item.name}
          to={item.to}
          onClick={onClose}
          className={`flex items-center ${
            isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-1.5'
          } rounded-lg text-xs font-medium transition-all group relative ${
            active
              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium shadow-2xs border-l-2 border-indigo-600 dark:border-indigo-500'
              : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#202D43]'
          }`}
          title={isCollapsed ? item.name : undefined}
        >
          <div className="flex items-center gap-2.5">
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-[#94A3B8] group-hover:text-slate-600 dark:group-hover:text-slate-200'
              }`}
            />
            {!isCollapsed && <span>{item.name}</span>}
          </div>

          {/* Collapsed Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 dark:bg-[#1B263A] text-white text-[11px] font-medium rounded-md shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-slate-700 dark:border-[#263449]">
              {item.name}
            </div>
          )}
        </NavLink>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 dark:bg-slate-950/75 backdrop-blur-[2px] lg:hidden transition-opacity animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 ${
          isCollapsed ? 'lg:w-16' : 'lg:w-60'
        } w-60 border-r border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0D1526] flex flex-col justify-between transition-all duration-150 ease-in-out lg:static lg:translate-x-0 h-full shrink-0 ${
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        {/* Top Section */}
        <div className="flex-1 overflow-y-auto py-3">
          
          {/* Brand Header in Sidebar */}
          <div className="flex items-center justify-between px-3.5 mb-3 pb-3 border-b border-slate-100 dark:border-[#263449]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                <Layers className="h-3.5 w-3.5" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <span className="font-semibold text-xs tracking-tight text-slate-900 dark:text-[#F8FAFC] truncate block">
                    Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
                  </span>
                  {company ? (
                    <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] truncate block font-normal">
                      {company.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-[#64748B] font-mono block">
                      Workspace
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center h-6 w-6 rounded-md text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202D43] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* SECTION 1: WORKSPACE */}
          <div className="px-2.5 space-y-0.5">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                Workspace
              </div>
            )}
            {renderNavSection(workspaceNav)}
          </div>

          {/* SECTION 2: COLLABORATION */}
          <div className="px-2.5 pt-3 mt-3 space-y-0.5 border-t border-slate-100 dark:border-[#263449]">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                Collaboration
              </div>
            )}
            {renderNavSection(collaborationNav)}
          </div>

          {/* SECTION 3: ACCOUNT */}
          <div className="px-2.5 pt-3 mt-3 space-y-0.5 border-t border-slate-100 dark:border-[#263449]">
            {!isCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                Account
              </div>
            )}
            {renderNavSection(accountNav)}
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="p-2.5 border-t border-slate-100 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0B1120]/50 space-y-1.5">
          {user && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2 px-1.5'}`}>
              <Avatar user={user} size="xs" variant="indigo-solid" />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">
                    {user.full_name || user.username}
                  </p>
                  <p className="truncate text-[10px] text-slate-500 dark:text-[#94A3B8] font-mono">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-1' : 'gap-2 px-2'
            } py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-[#CBD5E1] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer`}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
