import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import {
  Building2,
  ChevronRight,
  Fingerprint,
  User,
  Calendar,
  CheckCircle2,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  X,
  Lock,
  ArrowRight,
  Shield,
  Globe,
  MapPin,
  Briefcase,
  Users,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const INDUSTRY_OPTIONS = [
  'Technology',
  'Software',
  'Artificial Intelligence',
  'Fintech',
  'Healthcare',
  'E-commerce',
  'Education',
  'Manufacturing',
  'Consulting',
  'Other',
];

const COMPANY_SIZE_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
];

const Company = () => {
  const { user } = useAuth();
  const { company, hasCompany, loading, error, fetchCompany, createCompany, updateCompany } = useCompany();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    industry: '',
    company_size: '',
    country: '',
    city: '',
    website: '',
    logo_url: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    industry: '',
    company_size: '',
    country: '',
    city: '',
    website: '',
    logo_url: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  const copyCompanyId = () => {
    if (!company?.id) return;
    navigator.clipboard.writeText(company.id);
    setCopiedUuid(true);
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSuccessMessage(null);
    setFormError(null);
    try {
      await fetchCompany();
      setLogoLoadError(false);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (!company) return;
    setEditForm({
      name: company.name || '',
      description: company.description || '',
      industry: company.industry || '',
      company_size: company.company_size || '',
      country: company.country || '',
      city: company.city || '',
      website: company.website || '',
      logo_url: company.logo_url || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setFormError(null);
  };

  // Handle Update Company
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (editLoading) return;

    setFormError(null);
    setSuccessMessage(null);

    if (!editForm.name.trim()) {
      setFormError('Company name cannot be empty.');
      return;
    }

    setEditLoading(true);
    try {
      await updateCompany(editForm);
      setLogoLoadError(false);
      setIsEditModalOpen(false);
      setSuccessMessage('Company updated successfully.');
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Create Company
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createLoading) return;

    setFormError(null);
    setSuccessMessage(null);

    if (!createForm.name.trim()) {
      setFormError('Company name is required.');
      return;
    }

    setCreateLoading(true);
    try {
      await createCompany(createForm);
      setLogoLoadError(false);
      setSuccessMessage('Company created successfully.');
      setCreateForm({
        name: '',
        description: '',
        industry: '',
        company_size: '',
        country: '',
        city: '',
        website: '',
        logo_url: '',
      });
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const completeness = company?.profile_completeness ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Page Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                  <span>CollabHub</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-indigo-400 font-medium">Company</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Company
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Manage your organization and company information.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  icon={RefreshCw}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Notification Messages */}
            {successMessage && (
              <Alert variant="success" onClose={() => setSuccessMessage(null)}>
                {successMessage}
              </Alert>
            )}

            {formError && !isEditModalOpen && (
              <Alert variant="error" title="Unable to proceed" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            {error && !formError && (
              <Alert variant="error" title="Unable to load company">
                We couldn't connect to the CollabHub API. Please check your connection.
              </Alert>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-6 animate-pulse">
                {/* Hero Skeleton */}
                <div className="h-44 rounded-3xl bg-slate-900/60 border border-slate-800/80 p-6 flex items-center gap-6">
                  <div className="h-20 w-20 rounded-2xl bg-slate-800 shrink-0" />
                  <div className="space-y-3 flex-1">
                    <div className="h-7 w-52 bg-slate-800 rounded-lg" />
                    <div className="h-4 w-80 bg-slate-800/70 rounded-md" />
                  </div>
                </div>

                {/* Completeness Bar Skeleton */}
                <div className="h-20 rounded-2xl bg-slate-900/50 border border-slate-800/80" />

                {/* Details Grid Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800/80" />
                  <div className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800/80" />
                  <div className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800/80" />
                  <div className="h-24 rounded-2xl bg-slate-900/50 border border-slate-800/80" />
                </div>
              </div>
            ) : hasCompany && company ? (

              /* =======================================================
                 ACTIVE COMPANY VIEW
                 ======================================================= */
              <div className="space-y-6">
                
                {/* 1. Hero Card: Logo/Avatar & Name */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-5">
                      {/* Company Logo or Avatar */}
                      <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/80 shadow-lg flex items-center justify-center">
                        {company.logo_url && !logoLoadError ? (
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            onError={() => setLogoLoadError(true)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-black text-2xl sm:text-3xl">
                            {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                        )}
                      </div>

                      {/* Name & Description */}
                      <div className="space-y-1 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                          Company
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                          {company.name}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                          {company.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Edit Action */}
                    <div className="shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit3}
                        onClick={openEditModal}
                      >
                        Edit Company
                      </Button>
                    </div>
                  </div>

                  {/* Ambient Glow */}
                  <div className="absolute right-0 top-0 -mt-8 -mr-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* 2. Company Profile Completeness Bar */}
                <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-semibold text-white">
                        Company Profile Completeness
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono text-indigo-300">
                      {completeness}%
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-400">
                    {completeness === 100
                      ? 'Your company profile is complete.'
                      : `Your company profile is ${completeness}% complete. Complete your profile to help your organization stand out.`}
                  </p>
                </div>

                {/* 3. Enhanced Company Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Industry */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-400" />
                      Industry
                    </span>
                    <p className="text-sm font-semibold text-slate-200">
                      {company.industry || <span className="text-slate-500 font-normal">Not added</span>}
                    </p>
                  </div>

                  {/* Company Size */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      Company Size
                    </span>
                    <p className="text-sm font-semibold text-slate-200">
                      {company.company_size ? (
                        `${company.company_size} employees`
                      ) : (
                        <span className="text-slate-500 font-normal">Not added</span>
                      )}
                    </p>
                  </div>

                  {/* Location (City, Country) */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      Location
                    </span>
                    <p className="text-sm font-semibold text-slate-200 truncate">
                      {company.city || company.country ? (
                        [company.city, company.country].filter(Boolean).join(', ')
                      ) : (
                        <span className="text-slate-500 font-normal">Not added</span>
                      )}
                    </p>
                  </div>

                  {/* Website */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-indigo-400" />
                      Website
                    </span>
                    {company.website ? (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-slate-500">Not added</p>
                    )}
                  </div>

                  {/* Owner */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-indigo-400" />
                      Owner
                    </span>
                    <p className="text-sm font-semibold text-slate-200">
                      {user?.full_name || user?.username || 'Owner'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      @{user?.username}
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      Created
                    </span>
                    <p className="text-sm font-semibold text-slate-200">
                      {formatDate(company.created_at)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm space-y-1 sm:col-span-2 lg:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-emerald-400" />
                      Status
                    </span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      <span className="text-sm font-bold text-emerald-300">
                        Active Workspace
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Workspace Roadmap & Status */}
                <Card>
                  <CardHeader>
                    <CardTitle icon={Building2}>Workspace</CardTitle>
                    <CardDescription>
                      Your company is ready. Teams, projects, and tasks will be organized under this company.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-950/40">
                      {/* Company */}
                      <div className="flex items-center justify-between p-4 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block text-sm">
                              Company
                            </span>
                            <span className="text-slate-400">
                              {company.name} organization workspace is configured
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      </div>

                      {/* Teams */}
                      <div className="flex items-center justify-between p-4 text-xs opacity-75">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-500">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-300 block text-sm">
                              Teams
                            </span>
                            <span className="text-slate-500">
                              Team workspaces and membership management
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
                          <Lock className="h-3 w-3" />
                          Coming soon
                        </span>
                      </div>

                      {/* Projects */}
                      <div className="flex items-center justify-between p-4 text-xs opacity-75">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-500">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-300 block text-sm">
                              Projects
                            </span>
                            <span className="text-slate-500">
                              Collaborative deliverables and boards
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
                          <Lock className="h-3 w-3" />
                          Coming soon
                        </span>
                      </div>

                      {/* Tasks */}
                      <div className="flex items-center justify-between p-4 text-xs opacity-75">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-500">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-300 block text-sm">
                              Tasks
                            </span>
                            <span className="text-slate-500">
                              Task tracking, assignments, and activity feed
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 text-slate-400 border border-slate-800">
                          <Lock className="h-3 w-3" />
                          Coming soon
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Secondary Technical Metadata (UUID with Copy Action) */}
                <div className="p-4 rounded-2xl border border-slate-800/60 bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-400 font-mono">
                    <Fingerprint className="h-4 w-4 text-slate-500 shrink-0" />
                    <span>Company ID:</span>
                    <span className="text-slate-300 truncate max-w-xs sm:max-w-md" title={company.id}>
                      {company.id}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={copyCompanyId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer w-fit text-xs font-medium"
                  >
                    {copiedUuid ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            ) : (

              /* =======================================================
                 CREATE COMPANY VIEW (No Company Yet)
                 ======================================================= */
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2 py-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-md">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Create your company
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                    Set up your organization to start collaborating with teams and organizing projects.
                  </p>
                </div>

                <Card className="border-slate-800">
                  <CardHeader>
                    <CardTitle icon={Building2}>Organization Setup</CardTitle>
                    <CardDescription>
                      Enter your company details below. You will be assigned as the organization owner.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                      <Input
                        label="Company Name"
                        name="name"
                        id="create-company-name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="e.g. Acme Corp, Stark Labs, DevStudio"
                        required
                        icon={Building2}
                      />

                      <div className="space-y-1.5">
                        <label
                          htmlFor="create-company-desc"
                          className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                        >
                          Description <span className="text-slate-500 font-normal">(Optional)</span>
                        </label>
                        <textarea
                          id="create-company-desc"
                          name="description"
                          rows={3}
                          value={createForm.description}
                          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                          placeholder="Brief description of your organization..."
                          className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Industry */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Industry <span className="text-slate-500 font-normal">(Optional)</span>
                          </label>
                          <select
                            value={createForm.industry}
                            onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                            className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                          >
                            <option value="">Select Industry</option>
                            {INDUSTRY_OPTIONS.map((ind) => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>

                        {/* Company Size */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Company Size <span className="text-slate-500 font-normal">(Optional)</span>
                          </label>
                          <select
                            value={createForm.company_size}
                            onChange={(e) => setCreateForm({ ...createForm, company_size: e.target.value })}
                            className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                          >
                            <option value="">Select Company Size</option>
                            {COMPANY_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={size}>{size} employees</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          variant="primary"
                          size="md"
                          loading={createLoading}
                          icon={ArrowRight}
                          iconPosition="right"
                          className="w-full"
                        >
                          Create Company
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* =======================================================
          EDIT COMPANY MODAL (TWO SECTIONS)
          ======================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div
            onClick={closeEditModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-xl my-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl space-y-5 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-indigo-400" />
                  Edit Company Profile
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your organization details and online presence.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <Alert variant="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              {/* SECTION 1: GENERAL INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    General Information
                  </span>
                </div>

                <Input
                  label="Company Name"
                  name="name"
                  id="edit-company-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Acme Corp"
                  required
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="edit-company-desc"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Description <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="edit-company-desc"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="What does your company do?"
                    className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Industry */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Industry
                    </label>
                    <select
                      value={editForm.industry}
                      onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    >
                      <option value="">Select Industry</option>
                      {INDUSTRY_OPTIONS.map((ind) => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>

                  {/* Company Size */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Company Size
                    </label>
                    <select
                      value={editForm.company_size}
                      onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                      className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                    >
                      <option value="">Select Company Size</option>
                      {COMPANY_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>{size} employees</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: LOCATION & ONLINE PRESENCE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60">
                  <Globe className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                    Location & Online Presence
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Country"
                    name="country"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    placeholder="e.g. United States"
                  />

                  <Input
                    label="City"
                    name="city"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g. San Francisco"
                  />
                </div>

                <Input
                  label="Website URL"
                  name="website"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://example.com"
                />

                <Input
                  label="Logo URL"
                  name="logo_url"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  helperText="Direct image URL for your company logo"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeEditModal}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={editLoading}
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Company;
