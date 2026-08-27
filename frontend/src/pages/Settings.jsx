import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Button from '../components/Button';
import Alert from '../components/Alert';
import {
  Shield,
  Bell,
  Palette,
  KeyRound,
  Mail,
  ChevronRight,
  User,
  Check,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';

const Settings = () => {
  const { user, forgotPassword } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('security'); // 'security' | 'notifications' | 'account' | 'appearance'
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setResetSuccess(false);
    try {
      await forgotPassword(user.email);
      setResetSuccess(true);
      addToast('Password reset email dispatched to your inbox', 'success');
    } catch {
      addToast('Failed to dispatch password reset email', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const categories = [
    { id: 'security', label: 'Security & Password', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account Preferences', icon: User },
    { id: 'appearance', label: 'Appearance & Display', icon: Palette },
  ];

  const themeOptions = [
    {
      id: 'light',
      title: 'Light',
      desc: 'Clean white and slate interface with indigo accents',
      icon: Sun,
      iconColor: 'text-amber-500',
    },
    {
      id: 'dark',
      title: 'Dark',
      desc: 'Deep slate interface designed for low-light focus',
      icon: Moon,
      iconColor: 'text-indigo-400',
    },
    {
      id: 'system',
      title: 'System',
      desc: 'Automatically synchronizes with your device preference',
      icon: Laptop,
      iconColor: 'text-slate-400',
    },
  ];

  return (
    <div className="h-screen bg-[#F4F6FA] dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh min-h-0">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
              <span>TeamX</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span>Account</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Settings</span>
            </div>

            {/* Header */}
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                Workspace & Account Settings
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
                Manage your credentials, security preferences, and workspace configuration
              </p>
            </div>

            {/* Settings Layout: Category Tabs + Content */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Category Navigation (4 Cols) */}
              <div className="md:col-span-4 bg-white dark:bg-[#151F32] rounded-xl border border-slate-200/80 dark:border-[#263449] p-1.5 shadow-xs space-y-1">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs border-l-2 border-indigo-600 dark:border-indigo-500'
                          : 'text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43]'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-[#94A3B8]'}`} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Panels (8 Cols) */}
              <div className="md:col-span-8 space-y-6">
                
                {/* 1. SECURITY & PASSWORD */}
                {activeCategory === 'security' && (
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle icon={Shield}>Security & Password</CardTitle>
                      <CardDescription>Manage your account password and authentication credentials</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      {resetSuccess && (
                        <Alert variant="success" title="Password Reset Email Dispatched">
                          We sent a secure password reset link to <strong className="font-mono">{user?.email}</strong>. Check your inbox to update your password.
                        </Alert>
                      )}

                      <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Update Account Password</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                            Request a secure email verification token to change your existing password.
                          </p>
                        </div>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSendResetEmail}
                          loading={resetLoading}
                          icon={Mail}
                          className="shrink-0"
                        >
                          {resetLoading ? 'Sending link...' : 'Send Reset Link'}
                        </Button>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-[#263449] space-y-2">
                        <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                          Active Security Standards
                        </span>
                        <div className="p-3 rounded-lg bg-slate-50/60 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449] flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">Password Hashing</span>
                          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">Bcrypt (Salted)</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50/60 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449] flex items-center justify-between">
                          <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">Token Expiration</span>
                          <span className="font-mono text-slate-700 dark:text-[#CBD5E1] text-[11px]">24 Hours</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 2. NOTIFICATIONS */}
                {activeCategory === 'notifications' && (
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle icon={Bell}>Notification Preferences</CardTitle>
                      <CardDescription>Configure your workspace communication channels</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Email Invitations</p>
                          <p className="text-slate-500 dark:text-[#94A3B8] text-[11px]">Receive an email when you are invited to a new workspace.</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                          Active
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Security Alerts</p>
                          <p className="text-slate-500 dark:text-[#94A3B8] text-[11px]">Notifications regarding password resets and account activity.</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                          Active
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A]/50 flex items-center justify-between opacity-75">
                        <div>
                          <p className="font-medium text-slate-700 dark:text-[#CBD5E1]">Team & Task Mentions</p>
                          <p className="text-slate-400 dark:text-[#64748B] text-[11px]">Activity alerts for team discussions and task assignments.</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 dark:bg-[#1B263A] text-slate-500 dark:text-[#64748B] border border-slate-200 dark:border-[#263449] font-mono">
                          Coming soon
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 3. ACCOUNT PREFERENCES */}
                {activeCategory === 'account' && (
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle icon={User}>Account Preferences</CardTitle>
                      <CardDescription>Regional and localization configuration</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Language</p>
                          <p className="text-slate-500 dark:text-[#94A3B8] text-[11px]">Default interface language for your session.</p>
                        </div>
                        <span className="font-mono text-slate-700 dark:text-[#CBD5E1] font-medium">English (US)</span>
                      </div>

                      <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Timezone</p>
                          <p className="text-slate-500 dark:text-[#94A3B8] text-[11px]">Automatically synchronized with your browser.</p>
                        </div>
                        <span className="font-mono text-slate-700 dark:text-[#CBD5E1] font-medium">Auto-detected</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 4. APPEARANCE & DISPLAY (THEME SELECTOR) */}
                {activeCategory === 'appearance' && (
                  <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle icon={Palette}>Appearance & Display</CardTitle>
                      <CardDescription>Choose how TeamX looks across all workspaces</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 text-xs">
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                          Interface Theme
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {themeOptions.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = theme === opt.id;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setTheme(opt.id);
                                  addToast(`Theme set to ${opt.title}`, 'info');
                                }}
                                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                                    : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c]'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${opt.iconColor}`} />
                                    <span className="font-semibold text-sm text-slate-900 dark:text-[#F8FAFC]">
                                      {opt.title}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-snug">
                                  {opt.desc}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50/60 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449] flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Active Mode</p>
                          <p className="text-slate-500 dark:text-[#94A3B8] text-[11px]">
                            Currently rendering {resolvedTheme === 'dark' ? 'Dark' : 'Light'} palette
                          </p>
                        </div>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase text-[11px]">
                          {resolvedTheme}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
