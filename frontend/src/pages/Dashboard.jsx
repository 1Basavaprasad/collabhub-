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
  RefreshCw,
  Layers,
  Building2,
  Lock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Shield,
  Zap,
  Users,
} from 'lucide-react';

const Dashboard = () => {
  const { user, healthInfo, checkHealth } = useAuth();
  const { company, members, hasCompany, loading: companyLoading } = useCompany();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleHealthRefresh = async () => {
    setIsHealthRefreshing(true);
    await checkHealth();
    setTimeout(() => setIsHealthRefreshing(false), 500);
  };

  // Personalized Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const hierarchySteps = [
    {
      step: '01',
      title: 'Company Workspace',
      desc: hasCompany && company?.name
        ? `${company.name} workspace and multi-user membership active.`
        : 'Register your company organization.',
      icon: Building2,
      ready: hasCompany && Boolean(company),
      status: hasCompany ? 'Active' : 'Next Step',
    },
    {
      step: '02',
      title: 'Teams',
      desc: 'Provision engineering, product, and operations teams.',
      icon: Users,
      ready: false,
      status: 'Coming soon',
    },
    {
      step: '03',
      title: 'Projects',
      desc: 'Collaborative deliverables and project boards.',
      icon: Layers,
      ready: false,
      status: 'Coming soon',
    },
    {
      step: '04',
      title: 'Tasks',
      desc: 'Task tracking, assignments, and activity feed.',
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
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Breadcrumb Header */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <span>CollabHub</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-indigo-400 font-medium">Dashboard</span>
            </div>

            {/* Welcoming Header Banner */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-7 backdrop-blur-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username || 'Teammate'} 👋
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {hasCompany && company
                    ? `Here's what's happening in your ${company.name} workspace today.`
                    : "Here's what's happening in your workspace today. Set up your company to get started."}
                </p>
              </div>

              <div className="shrink-0">
                {hasCompany ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Building2}
                    onClick={() => navigate('/company')}
                    className="text-xs"
                  >
                    View Company
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => navigate('/company')}
                    className="text-xs"
                  >
                    Set Up Company
                  </Button>
                )}
              </div>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Workspace"
                value={
                  companyLoading
                    ? 'Loading...'
                    : hasCompany
                    ? company.name
                    : 'No Company'
                }
                subtitle={
                  hasCompany
                    ? `${company.industry || 'Active Organization'}`
                    : 'Click to configure workspace'
                }
                icon={Building2}
              />

              <StatCard
                title="Team Members"
                value={hasCompany ? members.length.toString() : '0'}
                subtitle={
                  hasCompany
                    ? `${members.length} ${members.length === 1 ? 'member' : 'members'} active`
                    : 'No members yet'
                }
                icon={Users}
              />

              <StatCard
                title="API Connection"
                value={healthInfo.isOnline ? 'Online' : 'Checking'}
                subtitle="CollabHub API (8001)"
                icon={Activity}
                actionButton={
                  <button
                    onClick={handleHealthRefresh}
                    title="Refresh connection status"
                    className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        isHealthRefreshing ? 'animate-spin text-indigo-400' : ''
                      }`}
                    />
                  </button>
                }
              />

              <StatCard
                title="Account Status"
                value="Active"
                subtitle={`@${user?.username || 'user'}`}
                icon={User}
              />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Organization & Modules (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Workspace Hierarchy Card */}
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle icon={Building2}>
                        {hasCompany ? 'Organization Workspace' : 'Company Setup'}
                      </CardTitle>
                      <CardDescription>
                        {hasCompany
                          ? `Teams, projects, and collaborative tasks are organized under ${company.name}.`
                          : 'Set up your organization to unlock team workspaces and collaboration boards.'}
                      </CardDescription>
                    </div>

                    <Button
                      variant={hasCompany ? 'secondary' : 'primary'}
                      size="xs"
                      onClick={() => navigate('/company')}
                    >
                      {hasCompany ? 'Manage Workspace' : 'Set Up Company'}
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Active Company Highlight */}
                    {hasCompany && company && (
                      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Logo or Avatar */}
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-700/80 shadow-sm flex items-center justify-center">
                            {company.logo_url && !logoError ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                onError={() => setLogoError(true)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white font-bold text-base">
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
                                <span className="text-xs text-slate-400 font-mono">
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
                          className="text-indigo-400 hover:text-indigo-300 shrink-0 text-xs"
                        >
                          Manage
                        </Button>
                      </div>
                    )}

                    {/* Hierarchy Progression Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {hierarchySteps.map((item) => {
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.step}
                            className={`p-3.5 rounded-xl border space-y-2 ${
                              item.ready
                                ? 'border-emerald-500/25 bg-emerald-500/5'
                                : 'border-slate-800/80 bg-slate-950/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-mono font-semibold ${
                                item.ready ? 'text-emerald-400' : 'text-slate-500'
                              }`}>
                                {item.step}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                item.ready
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1'
                              }`}>
                                {item.ready ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-2.5 w-2.5 text-slate-500" />
                                    Coming soon
                                  </>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 shrink-0 ${
                                item.ready ? 'text-emerald-400' : 'text-slate-500'
                              }`} />
                              <h4 className="text-xs font-semibold text-slate-200">
                                {item.title}
                              </h4>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {!hasCompany && !companyLoading && (
                      <EmptyState
                        icon={Building2}
                        title="No company workspace configured"
                        description="Create your company organization to begin provisioning teams and inviting members."
                        actionLabel="Set Up Company"
                        onAction={() => navigate('/company')}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* User Profile Component */}
                <UserProfile />

              </div>

              {/* Right Column: Platform Overview & Security (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Platform Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Activity}>
                      System Status
                    </CardTitle>
                    <CardDescription>
                      CollabHub platform and connection health
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">Platform</span>
                      <span className="text-slate-200 font-medium">CollabHub SaaS</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">API Status</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Connected
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800">
                      <span className="text-slate-400">Environment</span>
                      <span className="text-indigo-300 font-mono">Production</span>
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
                        Verify Connection
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
                      Current authenticated session details
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          Account Authenticated
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Signed in as @{user?.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                        <Building2 className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">
                          {hasCompany ? 'Organization Workspace' : 'Company Setup Pending'}
                        </p>
                        <p className="text-[10px] text-slate-400">
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
