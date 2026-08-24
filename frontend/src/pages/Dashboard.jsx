import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import UserProfile from '../components/UserProfile';
import StatCard from '../components/StatCard';
import EmptyState from '../components/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Button from '../components/Button';
import {
  ShieldCheck,
  Activity,
  User,
  Sparkles,
  RefreshCw,
  Layers,
  Building2,
  Lock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

const Dashboard = () => {
  const { user, healthInfo, checkHealth } = useAuth();
  const { company, hasCompany, loading: companyLoading } = useCompany();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleHealthRefresh = async () => {
    setIsHealthRefreshing(true);
    await checkHealth();
    setTimeout(() => setIsHealthRefreshing(false), 500);
  };

  const hierarchySteps = [
    {
      step: '01',
      title: 'Company',
      desc: hasCompany
        ? `${company.name} organization workspace is ready.`
        : 'Register your company organization.',
      icon: Building2,
      ready: hasCompany,
      status: hasCompany ? 'Ready' : 'Next Step',
    },
    {
      step: '02',
      title: 'Teams',
      desc: 'Provision engineering, product, and operations teams.',
      icon: User,
      ready: false,
      status: 'Coming soon',
    },
    {
      step: '03',
      title: 'Projects',
      desc: 'Collaborative task boards and deliverables.',
      icon: Layers,
      ready: false,
      status: 'Coming soon',
    },
    {
      step: '04',
      title: 'Tasks',
      desc: 'Assignments, workflows, and team collaboration.',
      icon: ShieldCheck,
      ready: false,
      status: 'Coming soon',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top SaaS Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span>CollabHub</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-indigo-400 font-medium">Dashboard</span>
            </div>

            {/* Welcome SaaS Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-xl backdrop-blur-xl">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Workspace Platform</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                    Welcome back,{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                      {user?.full_name || user?.username || 'CollabHub User'}
                    </span>
                  </h1>

                  <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {hasCompany && company
                      ? `${company.name} is ready. Your organization workspace is active.`
                      : 'Set up your company organization to begin provisioning teams and collaborating on projects.'}
                  </p>
                </div>

                {/* Primary Quick CTA */}
                <div className="shrink-0">
                  {hasCompany ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Building2}
                      onClick={() => navigate('/company')}
                    >
                      Manage Company
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => navigate('/company')}
                    >
                      Set Up Company
                    </Button>
                  )}
                </div>
              </div>

              {/* Ambient lighting */}
              <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Account"
                value={`@${user?.username || 'user'}`}
                subtitle={user?.email || 'Active User'}
                icon={User}
              />

              <StatCard
                title="API Status"
                value={healthInfo.isOnline ? 'Online' : 'Checking'}
                subtitle="Connected to CollabHub"
                icon={Activity}
                actionButton={
                  <button
                    onClick={handleHealthRefresh}
                    title="Refresh connection status"
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isHealthRefreshing ? 'animate-spin text-indigo-400' : ''
                      }`}
                    />
                  </button>
                }
              />

              <StatCard
                title="Organization"
                value={
                  companyLoading
                    ? 'Loading...'
                    : hasCompany
                    ? company.name
                    : 'Not Created'
                }
                subtitle={
                  hasCompany
                    ? 'Active Workspace'
                    : 'Click to set up company'
                }
                icon={Building2}
              />

              <StatCard
                title="Security"
                value="Protected"
                subtitle="Encrypted Session"
                icon={Shield}
              />
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: User Profile & Workspace (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* User Profile Component */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-400" />
                      User Profile
                    </h2>
                  </div>
                  <UserProfile />
                </div>

                {/* Workspace Hierarchy Card */}
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle icon={Building2}>
                        {hasCompany ? 'Organization Workspace' : 'Company Workspace'}
                      </CardTitle>
                      <CardDescription>
                        {hasCompany
                          ? `Teams, projects, and tasks will be organized under ${company.name}.`
                          : 'Set up your organization to unlock team workspaces and collaboration boards.'}
                      </CardDescription>
                    </div>

                    <Button
                      variant={hasCompany ? 'secondary' : 'primary'}
                      size="xs"
                      onClick={() => navigate('/company')}
                    >
                      {hasCompany ? 'View Company' : 'Set Up Company'}
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Active Company Highlight */}
                    {hasCompany && company && (
                      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Logo or Avatar */}
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-700/80 shadow-md flex items-center justify-center">
                            {company.logo_url && !logoError ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                onError={() => setLogoError(true)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-md shadow-indigo-600/20">
                                {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-white truncate">
                                {company.name}
                              </h4>
                              {company.industry && (
                                <span className="text-[11px] font-medium text-slate-400 font-mono">
                                  &bull; {company.industry}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Active
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 max-w-md truncate">
                              {company.description || 'No description provided.'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{ width: `${company.profile_completeness ?? 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {company.profile_completeness ?? 0}% profile complete
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="xs"
                          icon={ChevronRight}
                          iconPosition="right"
                          onClick={() => navigate('/company')}
                          className="text-indigo-400 hover:text-indigo-300 shrink-0"
                        >
                          Manage
                        </Button>
                      </div>
                    )}

                    {/* Hierarchy Progression Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {hierarchySteps.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.step}
                            className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                              item.ready
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-slate-800/80 bg-slate-950/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-mono font-bold ${
                                item.ready ? 'text-emerald-400' : 'text-slate-500'
                              }`}>
                                {item.step}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                item.ready
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1'
                              }`}>
                                {item.ready ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                    Ready
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3 text-slate-500" />
                                    Coming soon
                                  </>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 shrink-0 ${
                                item.ready ? 'text-emerald-400' : 'text-slate-500'
                              }`} />
                              <h4 className="text-sm font-semibold text-slate-200">
                                {item.title}
                              </h4>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {!hasCompany && !companyLoading && (
                      <EmptyState
                        icon={Building2}
                        title="Your workspace will appear here once your company is set up."
                        description="Create your company organization to begin provisioning teams and collaborating on projects."
                        actionLabel="Set Up Company"
                        onAction={() => navigate('/company')}
                      />
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Right Column: Platform Overview & Session Info (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Platform Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Activity}>
                      System Overview
                    </CardTitle>
                    <CardDescription>
                      CollabHub platform and connection status
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">Platform:</span>
                      <span className="text-slate-200 font-medium">CollabHub SaaS</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">API Connection:</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Online
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">Security:</span>
                      <span className="text-indigo-300 font-medium">Encrypted Session</span>
                    </div>

                    <div className="pt-1">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={handleHealthRefresh}
                        loading={isHealthRefreshing}
                        icon={Zap}
                        className="w-full text-xs"
                      >
                        Check Connection
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Security Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={ShieldCheck}>
                      Session Activity
                    </CardTitle>
                    <CardDescription>
                      Recent activity for your current session
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3.5 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          Account Authenticated
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Signed in as @{user?.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 mt-0.5">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          {hasCompany ? 'Organization Connected' : 'Company Setup Available'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {hasCompany ? `${company?.name} active` : 'Ready to configure'}
                        </p>
                      </div>
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

export default Dashboard;
