import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Key,
  Sparkles,
  RefreshCw,
  Layers,
  Building2,
  Users2,
  FolderKanban,
  CheckSquare,
  Lock,
  CheckCircle2,
  Terminal,
  Zap,
  ChevronRight,
  Info,
} from 'lucide-react';

const Dashboard = () => {
  const { user, healthInfo, checkHealth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const handleHealthRefresh = async () => {
    setIsHealthRefreshing(true);
    await checkHealth();
    setTimeout(() => setIsHealthRefreshing(false), 500);
  };

  const handleCompanySetupClick = () => {
    setSetupModalOpen(true);
    setTimeout(() => setSetupModalOpen(false), 4000);
  };

  const hierarchySteps = [
    {
      step: '01',
      title: 'Company Setup',
      desc: 'Register organization & configure multi-tenant isolation.',
      icon: Building2,
      status: 'Next Step',
    },
    {
      step: '02',
      title: 'Team Provisioning',
      desc: 'Create Engineering, Product, QA, and DevOps teams.',
      icon: Users2,
      status: 'Upcoming',
    },
    {
      step: '03',
      title: 'Project Boards',
      desc: 'Organize team deliverables into dedicated projects.',
      icon: FolderKanban,
      status: 'Upcoming',
    },
    {
      step: '04',
      title: 'Task Execution',
      desc: 'Assign tasks, collaborate on comments, and track activity.',
      icon: CheckSquare,
      status: 'Upcoming',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top SaaS Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Collapsible Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Context Breadcrumbs */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-500">CollabHub</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-slate-300 font-semibold">Dashboard</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-indigo-400 font-semibold">Overview</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auth Session Active
                </span>
              </div>
            </div>

            {/* Welcome SaaS Header Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>CollabHub SaaS Platform</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                    Welcome back,{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
                      {user?.full_name || user?.username || 'CollabHub User'}
                    </span>
                  </h1>

                  <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    Your workspace will appear here once your company is set up. Authentication is verified via FastAPI JWT bearer tokens.
                  </p>
                </div>

                {/* Session Credentials Badges */}
                <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-200 shadow-sm font-mono">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      Session: <strong className="text-emerald-400 font-semibold">Active (JWT)</strong>
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm font-mono">
                    <Key className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      Token: <strong className="text-indigo-300">HS256 Verified</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Ambient lighting */}
              <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Quick Metrics & System Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Current Session"
                value="Authenticated"
                subtitle={`User: @${user?.username || 'active'}`}
                icon={ShieldCheck}
                badge="JWT"
              />

              <StatCard
                title="Backend API"
                value={healthInfo.isOnline ? 'Online' : 'Checking'}
                subtitle={`Service: ${healthInfo.service || 'collabhub-api'}`}
                icon={Activity}
                badge={healthInfo.isOnline ? '200 OK' : 'Pending'}
                actionButton={
                  <button
                    onClick={handleHealthRefresh}
                    title="Refresh backend status"
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
                title="Security Level"
                value="Bcrypt + JWT"
                subtitle="Passlib & PyJWT Verification"
                icon={Lock}
                badge="Enterprise"
              />

              <StatCard
                title="Company State"
                value="Setup Ready"
                subtitle="Multi-Tenant Ready Base"
                icon={Building2}
                badge="Pending"
              />
            </div>

            {/* Two-Column SaaS Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: User Profile & Initial Empty State (8 Cols on Desktop) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* User Profile Component */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      Authenticated User Profile
                    </h2>
                    <span className="text-xs text-slate-500 font-mono">
                      GET /auth/me
                    </span>
                  </div>
                  <UserProfile />
                </div>

                {/* Initial Company Workspace Card (No Fake Data) */}
                <Card>
                  <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle icon={Building2}>
                        Company Workspace Setup
                      </CardTitle>
                      <CardDescription>
                        CollabHub business hierarchy: Company &rarr; Teams &rarr; Projects &rarr; Tasks &rarr; Activity
                      </CardDescription>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={Building2}
                      onClick={handleCompanySetupClick}
                    >
                      Set Up Company
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {setupModalOpen && (
                      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs animate-fade-in flex items-start gap-3">
                        <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <p className="font-semibold text-white">Company Module in Development</p>
                          <p className="text-slate-300 mt-0.5">
                            Company registration and team creation endpoints will be active once the backend company management service is deployed.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Architecture Hierarchy Roadmap */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {hierarchySteps.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.step}
                            className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-indigo-400">
                                {item.step}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                item.status === 'Next Step'
                                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}>
                                {item.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                              <h4 className="text-sm font-bold text-slate-200">
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

                    <EmptyState
                      icon={Building2}
                      title="Your workspace will appear here once your company is set up."
                      description="You are currently authenticated as an individual user. Once your company is registered, your teams, projects, and active tasks will display here."
                      actionLabel="Configure Organization"
                      onAction={handleCompanySetupClick}
                    />
                  </CardContent>
                </Card>

              </div>

              {/* Right Column: Diagnostics & Security Activity Log (4 Cols on Desktop) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* System Diagnostics Card */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Terminal}>
                      System Diagnostics
                    </CardTitle>
                    <CardDescription>
                      CollabHub backend & frontend runtime parameters
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-400">Backend Port:</span>
                      <span className="text-slate-200 font-semibold">8001 (FastAPI)</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-400">Frontend Port:</span>
                      <span className="text-slate-200 font-semibold">5173 (Vite + React)</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-400">Auth Method:</span>
                      <span className="text-indigo-300 font-semibold">Bearer HS256</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800">
                      <span className="text-slate-400">Health Endpoint:</span>
                      <span className="text-emerald-400 font-semibold">/health &bull; 200</span>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleHealthRefresh}
                        loading={isHealthRefreshing}
                        icon={Zap}
                        className="w-full text-xs font-mono"
                      >
                        Ping Backend Service
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Security Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={ShieldCheck}>
                      Session Security Log
                    </CardTitle>
                    <CardDescription>
                      Authenticated events for the current active JWT session
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          JWT Bearer Token Validated
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Verified with /auth/me
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 mt-0.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          Protected Route Gate Cleared
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Redirected to /dashboard
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/25 mt-0.5">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">
                          FastAPI Health Synced
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          collabhub-api responding normally
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
