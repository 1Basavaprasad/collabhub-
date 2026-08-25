import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import {
  Layers,
  LogOut,
  RefreshCw,
  Menu,
  Building,
  ChevronDown,
  Check,
  Search,
  User as UserIcon,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import Avatar from './Avatar';
import GlobalSearch from './GlobalSearch';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, healthInfo, checkHealth } = useAuth();
  const { company, companies, selectCompany, currentUserRole } = useCompany();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const companyMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const themeMenuRef = useRef(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target)) {
        setIsCompanyMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleHealthRefresh = async () => {
    setIsRefreshingHealth(true);
    await checkHealth();
    setTimeout(() => setIsRefreshingHealth(false), 500);
  };

  // Compute current breadcrumb elements
  const getBreadcrumbElements = () => {
    if (location.pathname.startsWith('/company')) {
      if (location.search.includes('tab=members')) {
        return (
          <>
            <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
            <span className="text-slate-300 dark:text-[#263449]">/</span>
            <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Members</span>
          </>
        );
      }
      if (location.search.includes('tab=invitations')) {
        return (
          <>
            <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
            <span className="text-slate-300 dark:text-[#263449]">/</span>
            <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Invitations</span>
          </>
        );
      }
      return (
        <>
          <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
          <span className="text-slate-300 dark:text-[#263449]">/</span>
          <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Company</span>
        </>
      );
    }
    if (location.pathname.startsWith('/dashboard')) {
      return (
        <>
          <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
          <span className="text-slate-300 dark:text-[#263449]">/</span>
          <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Dashboard</span>
        </>
      );
    }
    if (location.pathname.startsWith('/teams')) {
      return (
        <>
          <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
          <span className="text-slate-300 dark:text-[#263449]">/</span>
          <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Teams</span>
        </>
      );
    }
    if (location.pathname.startsWith('/profile')) {
      return (
        <>
          <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
          <span className="text-slate-300 dark:text-[#263449]">/</span>
          <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">User Profile</span>
        </>
      );
    }
    if (location.pathname.startsWith('/settings')) {
      return (
        <>
          <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
          <span className="text-slate-300 dark:text-[#263449]">/</span>
          <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Settings</span>
        </>
      );
    }
    return (
      <>
        <span className="text-slate-400 dark:text-[#94A3B8]">Workspace</span>
        <span className="text-slate-300 dark:text-[#263449]">/</span>
        <span className="text-slate-700 dark:text-[#F8FAFC] font-medium">Overview</span>
      </>
    );
  };

  return (
    <>
      <header className="shrink-0 sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-[#263449] bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Left: Hamburger + Brand + Breadcrumbs */}
          <div className="flex items-center gap-3 sm:gap-4">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="rounded-lg p-1.5 text-slate-500 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-[#F8FAFC] lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/dashboard" className="flex items-center gap-2.5 group shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-xs text-white font-bold text-sm">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
              </span>
            </Link>

            {/* Breadcrumb separator */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-[#263449] text-xs text-slate-500 dark:text-[#94A3B8]">
              {getBreadcrumbElements()}
            </div>

            {/* Quick Workspace Switcher in Header */}
            {company && companies.length > 1 && (
              <div className="relative hidden lg:block ml-2" ref={companyMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] text-xs font-medium text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-[#33435c] transition-colors cursor-pointer"
                >
                  <Building className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="max-w-[120px] truncate font-medium">{company.name}</span>
                  <ChevronDown className="h-3 w-3 text-slate-400 dark:text-[#94A3B8]" />
                </button>

                {isCompanyMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-[#1B263A] border border-slate-200/80 dark:border-[#263449] shadow-lg py-1 z-40 divide-y divide-slate-100 dark:divide-[#263449] animate-scale-in">
                    <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                      Switch Workspace
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
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            c.id === company.id
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                              : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {c.id === company.id && (
                            <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle: Command Center Global Search Trigger */}
          <div className="hidden sm:flex items-center max-w-xs w-full mx-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between pl-3 pr-2 py-1.5 text-xs bg-slate-100/70 dark:bg-[#151F32] hover:bg-slate-100 dark:hover:bg-[#1B263A] border border-slate-200/80 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c] rounded-lg text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#CBD5E1] transition-all shadow-xs cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                <span>Search in workspace...</span>
              </div>
              <kbd className="inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-[#94A3B8] bg-white dark:bg-[#1B263A] border border-slate-200 dark:border-[#263449] rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Theme Toggle, Connection Health + User Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#202D43] transition-colors cursor-pointer"
              title="Search workspace (Ctrl+K)"
              aria-label="Search workspace"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Quick Theme Selector Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="p-2 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-slate-100/70 dark:bg-[#151F32] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#33435c] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title={`Current theme: ${theme} (${resolvedTheme})`}
                aria-label="Change theme"
              >
                {theme === 'system' ? (
                  <Laptop className="h-3.5 w-3.5 text-slate-500 dark:text-[#94A3B8]" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                ) : (
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                )}
              </button>

              {isThemeMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-white dark:bg-[#1B263A] border border-slate-200/80 dark:border-[#263449] shadow-xl py-1 z-40 animate-scale-in text-xs">
                  <div className="px-3 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]">
                    Theme
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('light');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                      theme === 'light'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Light</span>
                    </div>
                    {theme === 'light' && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('dark');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </div>
                    {theme === 'dark' && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('system');
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                      theme === 'system'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Laptop className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                      <span>System</span>
                    </div>
                    {theme === 'system' && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Connection Health Indicator */}
            <button
              type="button"
              onClick={handleHealthRefresh}
              title="TeamX API Status (Click to refresh)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-slate-100/70 dark:bg-[#151F32] text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#33435c] hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthInfo.isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className="hidden md:inline font-mono">
                {healthInfo.isOnline ? 'Connected' : 'Offline'}
              </span>
              <RefreshCw
                className={`h-2.5 w-2.5 text-slate-400 dark:text-[#94A3B8] ${
                  isRefreshingHealth ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </button>

            {/* User Profile Dropdown Menu */}
            {user && (
              <div className="relative pl-1" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202D43] transition-colors cursor-pointer focus:outline-none"
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="true"
                >
                  <Avatar user={user} size="sm" variant="indigo-solid" />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] leading-tight">
                      {user.full_name || user.username}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-mono leading-tight">
                      {currentUserRole || 'MEMBER'}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-slate-400 dark:text-[#94A3B8] hidden sm:block" />
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-[#1B263A] border border-slate-200/80 dark:border-[#263449] shadow-xl py-1 z-40 divide-y divide-slate-100 dark:divide-[#263449] animate-scale-in">
                    <div className="px-3.5 py-2.5">
                      <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate">
                        {user.email}
                      </p>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-mono">
                          {currentUserRole || 'MEMBER'}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate('/profile');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                        <span>Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <SettingsIcon className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                        <span>Settings</span>
                      </button>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5 text-rose-500" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Navbar;
