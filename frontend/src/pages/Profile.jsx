import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Avatar from '../components/Avatar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import {
  User,
  Fingerprint,
  Building2,
  Copy,
  Check,
  RefreshCw,
  ChevronRight,
  Shield,
  ChevronDown,
} from 'lucide-react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const { company, currentUserRole } = useCompany();
  const { addToast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const copyToClipboard = (text, fieldKey, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    addToast(`${label} copied to clipboard`, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
      addToast('Profile data refreshed', 'success');
    } catch {
      addToast('Failed to refresh profile', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
              <span>TeamX</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span>Account</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">User Profile</span>
            </div>

            {/* Profile Hero Card */}
            <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar user={user} size="xl" className="ring-2 ring-indigo-50 dark:ring-[#1B263A] shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] truncate">
                      {user?.full_name || user?.username || 'TeamX User'}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
                    @{user?.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  icon={RefreshCw}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Personal Information & Advanced */}
              <div className="space-y-6">
                
                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={User}>Personal Information</CardTitle>
                    <CardDescription>Your account credentials and contact info</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-[#94A3B8] uppercase font-mono text-[10px] block mb-0.5">
                        Full Name
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                        {user?.full_name || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 dark:text-[#94A3B8] uppercase font-mono text-[10px] block mb-0.5">
                        Username
                      </span>
                      <p className="text-sm font-mono font-medium text-slate-800 dark:text-[#CBD5E1]">
                        @{user?.username}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-slate-400 dark:text-[#94A3B8] uppercase font-mono text-[10px] mb-0.5">
                        <span>Work Email</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(user?.email, 'email', 'Email address')}
                          className="flex items-center gap-1 text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 font-sans transition-colors cursor-pointer text-[11px]"
                        >
                          {copiedField === 'email' ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-sm font-mono font-semibold text-slate-900 dark:text-[#F8FAFC] break-all">
                        {user?.email}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Collapsible Advanced Account Details */}
                <Card>
                  <div
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-slate-400 dark:text-[#94A3B8]" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">Advanced Account Details</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 dark:text-[#94A3B8] transition-transform ${
                        showAdvanced ? 'rotate-180' : ''
                      }`}
                    />
                  </div>

                  {showAdvanced && (
                    <CardContent className="space-y-3 pt-3 text-xs border-t border-slate-100 dark:border-[#263449] mt-3">
                      <div>
                        <span className="text-slate-400 dark:text-[#94A3B8] uppercase font-mono text-[10px] block mb-1">
                          Account Identifier
                        </span>
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] font-mono text-[11px] text-slate-600 dark:text-[#CBD5E1] break-all select-all">
                          {user?.id || '—'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449]">
                        <span className="text-slate-500 dark:text-[#94A3B8] font-normal">Session Isolation</span>
                        <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Tab Scoped
                        </span>
                      </div>
                    </CardContent>
                  )}
                </Card>

              </div>

              {/* Right Column: Organization Membership & Security */}
              <div className="space-y-6">
                
                {/* Organization Membership */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Building2}>Workspace Assignment</CardTitle>
                    <CardDescription>Your role and access in the active company</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs">
                    {company ? (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                              {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">{company.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate">
                                {company.industry || 'Workspace'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="indigo" size="xs">
                            {currentUserRole}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-slate-600 dark:text-[#94A3B8]">
                            <span>Assigned Role</span>
                            <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{currentUserRole}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-[#94A3B8]">
                            <span>Organization</span>
                            <span className="font-medium text-slate-800 dark:text-[#CBD5E1]">{company.name}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-[#94A3B8]">
                            <span>Access Level</span>
                            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">Active Member</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 text-center rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] text-slate-500 dark:text-[#94A3B8]">
                        No active company workspace assigned.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Account Security */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Shield}>Account Security</CardTitle>
                    <CardDescription>Authentication and session configuration</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449]">
                      <span className="text-slate-600 dark:text-[#94A3B8]">Authentication</span>
                      <span className="font-mono text-slate-800 dark:text-[#CBD5E1] font-medium">JWT Bearer Token</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449]">
                      <span className="text-slate-600 dark:text-[#94A3B8]">Tab Storage</span>
                      <span className="font-mono text-slate-800 dark:text-[#CBD5E1] font-medium">sessionStorage</span>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
