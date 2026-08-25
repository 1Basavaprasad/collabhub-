import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTeam } from '../context/TeamContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Avatar, { getDisplayName } from '../components/Avatar';
import {
  Building2,
  ChevronRight,
  ArrowRight,
  Users,
  Users2,
  Mail,
  UserPlus,
  FolderKanban,
  CheckSquare,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const {
    company,
    companies = [],
    members = [],
    invitations = [],
    hasCompany,
    loading: companyLoading,
    canInviteMembers,
    canManageCompany,
  } = useCompany();
  const { teams = [] } = useTeam();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Personalized Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const pendingInvitations = Array.isArray(invitations)
    ? invitations.filter((inv) => inv && (inv.status || '').toUpperCase() === 'PENDING')
    : [];

  const pendingInvitationsCount = pendingInvitations.length;

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
      link: '/company',
    },
    {
      step: '02',
      title: 'Teams',
      desc: teams.length > 0
        ? `${teams.length} ${teams.length === 1 ? 'team' : 'teams'} organized in workspace.`
        : 'Create and organize teams for collaboration.',
      icon: Users2,
      ready: true,
      status: teams.length > 0 ? 'Active' : 'Available',
      link: '/teams',
    },
    {
      step: '03',
      title: 'Projects',
      desc: 'Collaborative deliverables and project boards.',
      icon: FolderKanban,
      ready: false,
      status: 'Coming soon',
    },
    {
      step: '04',
      title: 'Tasks',
      desc: 'Task tracking, assignments, and activity feed.',
      icon: CheckSquare,
      ready: false,
      status: 'Coming soon',
    },
  ];

  return (
    <div className="h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top SaaS Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh min-h-0">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Breadcrumb Header */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
              <span>TeamX</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span>Workspace</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Dashboard</span>
            </div>

            {/* Welcoming Header Banner */}
            <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                  {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username || 'Teammate'} 👋
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
                  {hasCompany && company
                    ? `Here's what's happening in your ${company.name} workspace.`
                    : "Here's what's happening in your workspace. Set up your company to get started."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasCompany ? (
                  <>
                    {canInviteMembers && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={UserPlus}
                        onClick={() => navigate('/company?tab=invitations')}
                      >
                        Invite Member
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Building2}
                      onClick={() => navigate('/company')}
                    >
                      View Company
                    </Button>
                  </>
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

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Companies"
                value={
                  companyLoading
                    ? '...'
                    : companies.length > 0
                    ? companies.length.toString()
                    : hasCompany
                    ? '1'
                    : '0'
                }
                subtitle={
                  hasCompany && company
                    ? company.name
                    : 'No workspace yet'
                }
                icon={Building2}
              />

              <StatCard
                title="Members"
                value={hasCompany ? members.length.toString() : '0'}
                subtitle={
                  hasCompany
                    ? `${members.length} active in workspace`
                    : 'Configure workspace'
                }
                icon={Users}
              />

              <StatCard
                title="Pending Invites"
                value={
                  hasCompany && canManageCompany
                    ? pendingInvitationsCount.toString()
                    : '0'
                }
                subtitle={
                  hasCompany && canManageCompany
                    ? `${pendingInvitationsCount} awaiting response`
                    : 'Workspace invitations'
                }
                icon={Mail}
              />

              <StatCard
                title="Teams"
                value={teams.length.toString()}
                subtitle={
                  teams.length > 0
                    ? `${teams.length} collaboration groups`
                    : 'No teams created'
                }
                icon={Users2}
              />
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Organization & Modules & Recent Activity (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* When User has NO Company */}
                {!hasCompany && !companyLoading ? (
                  <Card className="border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-[#151F32] shadow-xs">
                    <CardContent className="p-6 text-center space-y-3.5">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 shadow-2xs mx-auto">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                          Create your first workspace
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                          Set up your company workspace to invite teammates, manage members, and collaborate across teams.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={ArrowRight}
                          iconPosition="right"
                          onClick={() => navigate('/company')}
                        >
                          Create Workspace
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* Organization Workspace Overview Card */
                  <Card>
                    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle icon={Building2}>Organization Workspace</CardTitle>
                        <CardDescription>
                          Teams, members, and collaborative tasks organized under {company?.name}.
                        </CardDescription>
                      </div>

                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => navigate('/company')}
                      >
                        Manage Workspace
                      </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Active Company Highlight */}
                      {hasCompany && company && (
                        <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#1B263A]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] shadow-2xs flex items-center justify-center">
                              {company.logo_url && !logoError ? (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  onError={() => setLogoError(true)}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-indigo-600 text-white font-semibold text-base">
                                  {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                  {company.name}
                                </h3>
                                <Badge variant="indigo" size="xs">
                                  {company.industry || 'Workspace'}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                                {company.description || 'Enterprise collaboration workspace'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => navigate('/company?tab=members')}
                            >
                              {members.length} {members.length === 1 ? 'Member' : 'Members'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Workspace Architecture Flow */}
                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] block">
                          Workspace Capabilities
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {hierarchySteps.map((step) => {
                            const Icon = step.icon;
                            return (
                              <div
                                key={step.title}
                                onClick={() => step.link && navigate(step.link)}
                                className={`p-3 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] transition-all ${
                                  step.link ? 'hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-2xs cursor-pointer' : 'opacity-70'
                                } flex items-start gap-3`}
                              >
                                <div
                                  className={`p-2 rounded-lg ${
                                    step.ready
                                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                      : 'bg-slate-100 dark:bg-[#1B263A] text-slate-400 dark:text-[#64748B]'
                                  }`}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                      {step.title}
                                    </span>
                                    <span
                                      className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded ${
                                        step.status === 'Active'
                                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20'
                                          : 'bg-slate-100 dark:bg-[#1B263A] text-slate-500 dark:text-[#94A3B8] border border-slate-200/60 dark:border-[#263449]'
                                      }`}
                                    >
                                      {step.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5 leading-tight line-clamp-2">
                                    {step.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>

              {/* Right Column: Quick Info & Pending Invites (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Pending Invitations Quick Card */}
                {hasCompany && canManageCompany && (
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle icon={Mail}>Invitations</CardTitle>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate('/company?tab=invitations')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        View all
                      </Button>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {pendingInvitations.length === 0 ? (
                        <div className="text-center py-5 space-y-1.5">
                          <Mail className="h-6 w-6 text-slate-300 dark:text-[#64748B] mx-auto" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">No pending invitations</p>
                          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]">All sent invitations have been processed.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-[#263449]">
                          {pendingInvitations.slice(0, 3).map((inv) => (
                            <div key={inv.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate font-mono text-[11px]">
                                  {inv.email}
                                </p>
                                <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                                  Role: {inv.role}
                                </span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20 shrink-0">
                                PENDING
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Workspace Members Quick List */}
                {hasCompany && (
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <CardTitle icon={Users}>Workspace Members</CardTitle>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate('/company?tab=members')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        View all
                      </Button>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="divide-y divide-slate-100 dark:divide-[#263449]">
                        {members.slice(0, 4).map((m) => {
                          const memberUser = m.user || m;
                          return (
                            <div key={m.user_id || m.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar user={memberUser} size="xs" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                    {getDisplayName(memberUser)}
                                  </p>
                                  <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono truncate block">
                                    {memberUser.email}
                                  </span>
                                </div>
                              </div>
                              <Badge variant={m.role === 'OWNER' ? 'indigo' : 'neutral'} size="xs">
                                {m.role}
                              </Badge>
                            </div>
                          );
                        })}
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

export default Dashboard;
