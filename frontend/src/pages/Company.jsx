import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Edit3,
  Copy,
  Check,
  RefreshCw,
  X,
  ArrowRight,
  Globe,
  MapPin,
  Briefcase,
  Users,
  ExternalLink,
  UserPlus,
  Mail,
  Crown,
  ShieldCheck,
  Building,
  UserCheck,
  ChevronDown,
  Search,
  Filter,
  Trash2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Eye,
  Send,
  History,
  ShieldAlert,
  CheckCircle2,
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

const ROLE_OPTIONS = [
  { value: 'MEMBER', label: 'Member', desc: 'Can access workspaces, view team members, and collaborate' },
  { value: 'ADMIN', label: 'Admin', desc: 'Can manage company profile, invite members, and update memberships' },
  { value: 'OWNER', label: 'Owner', desc: 'Full organization ownership, role assignment, and management' },
];

const VALID_TABS = ['overview', 'members', 'invitations'];

const Company = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    company,
    companies = [],
    members = [],
    invitations = [],
    currentUserRole = 'MEMBER',
    isOwner = false,
    isAdmin = false,
    canManageCompany = false,
    canInviteMembers = false,
    hasCompany = false,
    loading = false,
    membersLoading = false,
    invitationsLoading = false,
    invitationsError = null,
    error = null,
    fetchCompany,
    createCompany,
    updateCompany,
    sendCompanyInvitation,
    revokeInvitation,
    loadCompanyInvitations,
    updateCompanyMember,
    selectCompany,
  } = useCompany();

  // Tab State safely parsed from URL
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam && VALID_TABS.includes(tabParam.toLowerCase())) {
      return tabParam.toLowerCase();
    }
    return 'overview';
  });

  // Synchronize activeTab whenever searchParams changes (e.g. browser back/forward or direct URL change)
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam.toLowerCase())) {
      setActiveTab(tabParam.toLowerCase());
    } else if (!tabParam) {
      setActiveTab('overview');
    }
  }, [tabParam]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Member Search & Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Invitation Search & Filtering state
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'

  // Notification states
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Multi-Company Dropdown Switcher state
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Create Company Form State
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

  // Edit Company Profile Modal State
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

  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER',
    designation: '',
    department: '',
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  // Edit Member Modal State
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({
    role: 'MEMBER',
    designation: '',
    department: '',
  });
  const [editMemberLoading, setEditMemberLoading] = useState(false);
  const [editMemberError, setEditMemberError] = useState(null);

  // Revoke Confirmation Modal State
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokingInvitation, setRevokingInvitation] = useState(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Invitation Details Modal State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  // Handler to switch tabs and update URL query cleanly
  const handleTabChange = (newTab) => {
    const safeTab = VALID_TABS.includes(newTab) ? newTab : 'overview';
    setActiveTab(safeTab);

    if (safeTab === 'invitations' && company?.id && canManageCompany && typeof loadCompanyInvitations === 'function') {
      loadCompanyInvitations(company.id);
    }

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (safeTab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', safeTab);
      }
      return next;
    }, { replace: true });
  };

  // If page loads directly on tab=invitations, fetch invitations once company is ready
  useEffect(() => {
    if (tabParam === 'invitations' && company?.id && canManageCompany && typeof loadCompanyInvitations === 'function') {
      loadCompanyInvitations(company.id);
    }
  }, [tabParam, company?.id, canManageCompany, loadCompanyInvitations]);

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
      if (typeof fetchCompany === 'function') {
        await fetchCompany();
      }
      setLogoLoadError(false);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Open Edit Company Modal
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

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setFormError(null);
  };

  // Open/Close Invite Modal
  const openInviteModal = (prefillData = null) => {
    setInviteForm({
      email: prefillData?.email || '',
      role: prefillData?.role || 'MEMBER',
      designation: prefillData?.designation || '',
      department: prefillData?.department || '',
    });
    setInviteError(null);
    setIsInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteError(null);
  };

  // Open/Close Edit Member Modal
  const openEditMemberModal = (member) => {
    if (!member) return;
    setEditingMember(member);
    setEditMemberForm({
      role: member.role || 'MEMBER',
      designation: member.designation || '',
      department: member.department || '',
    });
    setEditMemberError(null);
    setIsEditMemberModalOpen(true);
  };

  const closeEditMemberModal = () => {
    setIsEditMemberModalOpen(false);
    setEditingMember(null);
    setEditMemberError(null);
  };

  // Open/Close Revoke Modal
  const openRevokeModal = (invitation) => {
    if (!invitation) return;
    setRevokingInvitation(invitation);
    setIsRevokeModalOpen(true);
  };

  const closeRevokeModal = () => {
    setIsRevokeModalOpen(false);
    setRevokingInvitation(null);
  };

  // Open/Close Details Modal
  const openDetailsModal = (invitation) => {
    if (!invitation) return;
    setSelectedInvitation(invitation);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedInvitation(null);
  };

  // Handle Update Company Profile
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
      setSuccessMessage('Company profile updated successfully.');
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
      setSuccessMessage('Company workspace created successfully.');
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

  // Handle Send Invitation via Email
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (inviteLoading) return;

    setInviteError(null);

    if (!inviteForm.email.trim()) {
      setInviteError('Please enter a valid work email address.');
      return;
    }

    setInviteLoading(true);
    try {
      await sendCompanyInvitation({
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        designation: inviteForm.designation.trim() || undefined,
        department: inviteForm.department.trim() || undefined,
      });
      setIsInviteModalOpen(false);
      setSuccessMessage(`Invitation sent successfully to ${inviteForm.email.trim()}.`);
      setInviteForm({ email: '', role: 'MEMBER', designation: '', department: '' });
    } catch (err) {
      setInviteError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to deliver invitation email. Please verify SMTP settings and try again.'
      );
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Revoke Invitation
  const handleConfirmRevoke = async () => {
    if (!revokingInvitation || revokeLoading) return;

    setRevokeLoading(true);
    try {
      await revokeInvitation(revokingInvitation.id);
      setIsRevokeModalOpen(false);
      setRevokingInvitation(null);
      setSuccessMessage(`Invitation for ${revokingInvitation.email} revoked successfully.`);
    } catch (err) {
      setFormError(err.message || 'Failed to revoke invitation.');
      setIsRevokeModalOpen(false);
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Edit Member Submit
  const handleEditMemberSubmit = async (e) => {
    e.preventDefault();
    if (editMemberLoading || !editingMember) return;

    setEditMemberError(null);
    setEditMemberLoading(true);

    try {
      await updateCompanyMember(editingMember.user_id, {
        role: editMemberForm.role,
        designation: editMemberForm.designation,
        department: editMemberForm.department,
      });
      setIsEditMemberModalOpen(false);
      setSuccessMessage(
        `Member ${editingMember.user?.full_name || editingMember.user?.username || 'member'} updated successfully.`
      );
    } catch (err) {
      setEditMemberError(
        err.response?.data?.detail ||
        err.message ||
        'Failed to update member. Please try again.'
      );
    } finally {
      setEditMemberLoading(false);
    }
  };

  // Format date helper with safe parsing
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const completeness = company?.profile_completeness ?? 0;

  // Extract unique departments for member filtering
  const availableDepartments = useMemo(() => {
    if (!Array.isArray(members)) return [];
    const deps = new Set();
    members.forEach((m) => {
      if (m?.department && m.department.trim()) {
        deps.add(m.department.trim());
      }
    });
    return Array.from(deps).sort();
  }, [members]);

  // Filtered members list based on search term, role, and department
  const filteredMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    return members.filter((m) => {
      if (!m) return false;
      if (roleFilter !== 'ALL' && m.role !== roleFilter) {
        return false;
      }
      if (departmentFilter !== 'ALL') {
        if (!m.department || m.department.trim().toLowerCase() !== departmentFilter.toLowerCase()) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const nameMatch = m.user?.full_name?.toLowerCase().includes(term) || false;
        const userMatch = m.user?.username?.toLowerCase().includes(term) || false;
        const emailMatch = m.user?.email?.toLowerCase().includes(term) || false;
        const desigMatch = m.designation?.toLowerCase().includes(term) || false;
        const deptMatch = m.department?.toLowerCase().includes(term) || false;

        if (!nameMatch && !userMatch && !emailMatch && !desigMatch && !deptMatch) {
          return false;
        }
      }
      return true;
    });
  }, [members, searchTerm, roleFilter, departmentFilter]);

  // Compute effective invitation status (handles automatic client-side expiration)
  const getEffectiveStatus = (inv) => {
    if (!inv) return 'PENDING';
    if (inv.status === 'PENDING' && inv.expires_at) {
      try {
        if (new Date(inv.expires_at).getTime() <= Date.now()) {
          return 'EXPIRED';
        }
      } catch {
        // Ignore date parse errors
      }
    }
    return inv.status || 'PENDING';
  };

  // Filtered invitations list based on search term and status filter
  const filteredInvitations = useMemo(() => {
    if (!Array.isArray(invitations)) return [];
    return invitations.filter((inv) => {
      if (!inv) return false;
      const effectiveStatus = getEffectiveStatus(inv);

      if (invStatusFilter !== 'ALL' && effectiveStatus !== invStatusFilter) {
        return false;
      }

      if (invSearchTerm.trim()) {
        const term = invSearchTerm.trim().toLowerCase();
        const emailMatch = inv.email ? inv.email.toLowerCase().includes(term) : false;
        const desigMatch = inv.designation ? inv.designation.toLowerCase().includes(term) : false;
        const deptMatch = inv.department ? inv.department.toLowerCase().includes(term) : false;

        if (!emailMatch && !desigMatch && !deptMatch) {
          return false;
        }
      }

      return true;
    });
  }, [invitations, invSearchTerm, invStatusFilter]);

  // Render role badge with appropriate styling
  const renderRoleBadge = (role) => {
    const normalized = (role || '').toUpperCase();
    switch (normalized) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono shrink-0">
            <Crown className="h-3 w-3 text-amber-400" />
            OWNER
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono shrink-0">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'MEMBER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono shrink-0">
            <UserCheck className="h-3 w-3 text-indigo-400" />
            MEMBER
          </span>
        );
    }
  };

  // Render status badge for invitations
  const renderStatusBadge = (status) => {
    const normalized = (status || '').toUpperCase();
    switch (normalized) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 font-mono">
            <Clock className="h-2.5 w-2.5 text-amber-400" />
            Pending
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            Accepted
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25 font-mono">
            <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
            Expired
          </span>
        );
      case 'REVOKED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            <X className="h-2.5 w-2.5 text-slate-500" />
            Revoked
          </span>
        );
    }
  };

  // Determine if the current user can edit a specific target member
  const canEditMember = (targetMember) => {
    if (!targetMember) return false;
    if (isOwner) return true;
    if (isAdmin && targetMember.role !== 'OWNER') return true;
    return false;
  };

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
            
            {/* Page Header & Workspace Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                  <span>CollabHub</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-indigo-400 font-medium">Company</span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Company Workspace
                  </h1>

                  {/* Multi-Company Dropdown Switcher */}
                  {Array.isArray(companies) && companies.length > 1 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                        aria-label="Switch organization"
                      >
                        <Building className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="max-w-[120px] truncate">{company?.name || 'Workspace'}</span>
                        <ChevronDown className="h-3 w-3 text-slate-500" />
                      </button>

                      {isCompanyDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsCompanyDropdownOpen(false)}
                          />
                          <div className="absolute left-0 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 divide-y divide-slate-800/60">
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
                              <span>Organizations</span>
                              <span className="text-indigo-400 font-bold">
                                {companies.length}
                              </span>
                            </div>
                            <div className="py-1 max-h-52 overflow-y-auto">
                              {companies.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    if (typeof selectCompany === 'function') {
                                      selectCompany(c);
                                    }
                                    setIsCompanyDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                                    c.id === company?.id
                                      ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className="truncate block font-medium">{c.name}</span>
                                    {c.industry && (
                                      <span className="text-[10px] text-slate-500 truncate block">
                                        {c.industry}
                                      </span>
                                    )}
                                  </div>
                                  {c.id === company?.id && (
                                    <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasCompany && canInviteMembers && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openInviteModal()}
                    icon={UserPlus}
                    className="text-xs"
                  >
                    Invite member
                  </Button>
                )}
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

            {formError && !isEditModalOpen && !isRevokeModalOpen && (
              <Alert variant="error" title="Unable to proceed" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            {error && !formError && (
              <Alert variant="error" title="Unable to load company">
                {error}
              </Alert>
            )}

            {/* Navigation Tabs (Overview | Members | Invitations) */}
            {hasCompany && company && (
              <div className="flex items-center gap-1 border-b border-slate-800">
                <button
                  type="button"
                  id="tab-company-overview"
                  onClick={() => handleTabChange('overview')}
                  className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview
                </button>

                <button
                  type="button"
                  id="tab-company-members"
                  onClick={() => handleTabChange('members')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                    activeTab === 'members'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Members</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                    {Array.isArray(members) ? members.length : 0}
                  </span>
                </button>

                <button
                  type="button"
                  id="tab-company-invitations"
                  onClick={() => handleTabChange('invitations')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                    activeTab === 'invitations'
                      ? 'border-indigo-500 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Invitations</span>
                  {Array.isArray(invitations) && invitations.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {invitations.length}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-36 rounded-2xl bg-slate-900/50 border border-slate-800/80 p-6 flex items-center gap-5">
                  <div className="h-16 w-16 rounded-xl bg-slate-800 shrink-0" />
                  <div className="space-y-2.5 flex-1">
                    <div className="h-5 w-44 bg-slate-800 rounded" />
                    <div className="h-4 w-72 bg-slate-800/70 rounded" />
                  </div>
                </div>
                <div className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800/80" />
                <div className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800/80" />
              </div>
            ) : hasCompany && company ? (

              /* =======================================================
                 ACTIVE COMPANY VIEW
                 ======================================================= */
              <div className="space-y-6">
                
                {/* ===================================================
                    TAB 1: OVERVIEW
                    =================================================== */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Header Card */}
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex items-start sm:items-center gap-4 min-w-0">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-700/80 shadow-sm flex items-center justify-center">
                            {company.logo_url && !logoLoadError ? (
                              <img
                                src={company.logo_url}
                                alt={company.name || 'Company'}
                                onError={() => setLogoLoadError(true)}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white font-bold text-xl">
                                {company.name ? company.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                                {company.name}
                              </h2>
                              {renderRoleBadge(currentUserRole)}
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap font-sans">
                              {company.industry && <span>{company.industry}</span>}
                              {company.industry && (company.city || company.country) && <span>&bull;</span>}
                              {(company.city || company.country) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-500" />
                                  {[company.city, company.country].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </p>
                            
                            {company.description && (
                              <p className="text-xs text-slate-300 leading-relaxed pt-0.5 max-w-xl">
                                {company.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {canManageCompany && (
                          <div className="shrink-0 pt-2 sm:pt-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Edit3}
                              onClick={openEditModal}
                              className="text-xs"
                            >
                              Edit profile
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Company Overview & Completeness */}
                    <Card>
                      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle icon={Building2}>Company Overview</CardTitle>
                          <CardDescription>
                            Organization metadata and online profile presence
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">Completeness:</span>
                          <span className="text-xs font-bold font-mono text-indigo-300">
                            {completeness}%
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                              style={{ width: `${completeness}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {completeness === 100
                              ? 'Profile is 100% complete.'
                              : 'Complete all company fields to finish your workspace profile.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-indigo-400" />
                              Industry
                            </span>
                            <p className="text-xs font-medium text-slate-200">
                              {company.industry || <span className="text-slate-500">Not set</span>}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-indigo-400" />
                              Company Size
                            </span>
                            <p className="text-xs font-medium text-slate-200">
                              {company.company_size ? `${company.company_size} employees` : <span className="text-slate-500">Not set</span>}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-indigo-400" />
                              Location
                            </span>
                            <p className="text-xs font-medium text-slate-200 truncate">
                              {company.city || company.country ? (
                                [company.city, company.country].filter(Boolean).join(', ')
                              ) : (
                                <span className="text-slate-500">Not set</span>
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
                              <Globe className="h-3 w-3 text-indigo-400" />
                              Website
                            </span>
                            {company.website ? (
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </a>
                            ) : (
                              <p className="text-xs text-slate-500">Not set</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Secondary Technical Metadata */}
                    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-400 font-mono">
                        <Fingerprint className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>Company ID:</span>
                        <span className="text-slate-300 truncate max-w-xs sm:max-w-md font-mono" title={company.id}>
                          {company.id}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={copyCompanyId}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer w-fit text-xs"
                      >
                        {copiedUuid ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-300 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy ID</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ===================================================
                    TAB 2: MEMBERS
                    =================================================== */}
                {activeTab === 'members' && (
                  <Card className="animate-fade-in">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle icon={Users}>Members</CardTitle>
                          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {Array.isArray(members) ? members.length : 0} {members.length === 1 ? 'person' : 'people'}
                          </span>
                        </div>
                        <CardDescription>
                          Manage roles, job designations, and departments for all workspace members.
                        </CardDescription>
                      </div>

                      {canInviteMembers && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={UserPlus}
                          onClick={() => openInviteModal()}
                          className="shrink-0 text-xs"
                        >
                          Invite member
                        </Button>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Search & Filter Toolbar */}
                      {Array.isArray(members) && members.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Search members by name, email, designation, or department..."
                              className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                            {searchTerm && (
                              <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <Filter className="h-3 w-3 text-slate-400" />
                              <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                              >
                                <option value="ALL">All Roles</option>
                                <option value="OWNER">Owner</option>
                                <option value="ADMIN">Admin</option>
                                <option value="MEMBER">Member</option>
                              </select>
                            </div>

                            {availableDepartments.length > 0 && (
                              <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="px-2 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[130px] truncate"
                              >
                                <option value="ALL">All Departments</option>
                                {availableDepartments.map((dept) => (
                                  <option key={dept} value={dept}>
                                    {dept}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Members Presentation */}
                      {membersLoading ? (
                        <div className="p-8 text-center text-slate-400 space-y-2 animate-pulse">
                          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400 mx-auto" />
                          <p className="text-xs font-mono">Loading members...</p>
                        </div>
                      ) : filteredMembers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 rounded-xl border border-slate-800 bg-slate-950/40">
                          <Users className="h-7 w-7 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-300">
                            {members.length === 0 ? 'No members yet' : 'No matching members found'}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {members.length === 0
                              ? 'Invite your teammates to begin collaborating in this workspace.'
                              : 'Try adjusting your search query or filters.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Desktop Table */}
                          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                            <table className="w-full text-left text-xs">
                              <thead className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                                <tr>
                                  <th className="py-3 px-4">Member</th>
                                  <th className="py-3 px-4">Role</th>
                                  <th className="py-3 px-4">Designation</th>
                                  <th className="py-3 px-4">Department</th>
                                  <th className="py-3 px-4">Joined</th>
                                  <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {filteredMembers.map((member) => {
                                  const isSelf = member?.user_id === user?.id;
                                  const displayName = member?.user?.full_name || member?.user?.username || 'Member';
                                  const displayEmail = member?.user?.email || '—';
                                  const initial = displayName.charAt(0).toUpperCase();

                                  return (
                                    <tr key={member.id} className="hover:bg-slate-900/30 transition-colors">
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs">
                                            {initial}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-semibold text-slate-200">
                                                {displayName}
                                              </span>
                                              {isSelf && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                                  You
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[11px] text-slate-400 font-mono truncate block">
                                              {displayEmail}
                                            </span>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="py-3 px-4">
                                        {renderRoleBadge(member.role)}
                                      </td>

                                      <td className="py-3 px-4 text-slate-300 font-medium">
                                        {member.designation || <span className="text-slate-500 font-normal">—</span>}
                                      </td>

                                      <td className="py-3 px-4 text-slate-300 font-medium">
                                        {member.department || <span className="text-slate-500 font-normal">—</span>}
                                      </td>

                                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                        {formatDate(member.joined_at)}
                                      </td>

                                      <td className="py-3 px-4 text-right">
                                        {canEditMember(member) && (
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            icon={Edit3}
                                            onClick={() => openEditMemberModal(member)}
                                            className="text-xs h-7 px-2 text-slate-400 hover:text-slate-200"
                                          >
                                            Edit
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Cards */}
                          <div className="md:hidden space-y-3">
                            {filteredMembers.map((member) => {
                              const isSelf = member?.user_id === user?.id;
                              const displayName = member?.user?.full_name || member?.user?.username || 'Member';
                              const displayEmail = member?.user?.email || '—';
                              const initial = displayName.charAt(0).toUpperCase();

                              return (
                                <div
                                  key={member.id}
                                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-3 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs">
                                        {initial}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-semibold text-slate-200 truncate">
                                            {displayName}
                                          </span>
                                          {isSelf && (
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                                              You
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-mono truncate block">
                                          {displayEmail}
                                        </span>
                                      </div>
                                    </div>

                                    <div>{renderRoleBadge(member.role)}</div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                                    <div>
                                      <span className="text-slate-500 block">Designation</span>
                                      <span className="text-slate-300 font-medium">
                                        {member.designation || '—'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Department</span>
                                      <span className="text-slate-300 font-medium">
                                        {member.department || '—'}
                                      </span>
                                    </div>
                                  </div>

                                  {canEditMember(member) && (
                                    <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                                      <Button
                                        variant="secondary"
                                        size="xs"
                                        icon={Edit3}
                                        onClick={() => openEditMemberModal(member)}
                                        className="text-xs"
                                      >
                                        Edit member
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* ===================================================
                    TAB 3: INVITATIONS (OWNER & ADMIN ONLY)
                    =================================================== */}
                {activeTab === 'invitations' && (
                  <Card className="animate-fade-in">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle icon={Send}>Invitations</CardTitle>
                          <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {Array.isArray(invitations) ? invitations.length : 0} total
                          </span>
                        </div>
                        <CardDescription>
                          Manage workspace invitations, monitor delivery statuses, and revoke pending access.
                        </CardDescription>
                      </div>

                      {canManageCompany && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={UserPlus}
                          onClick={() => openInviteModal()}
                          className="shrink-0 text-xs"
                        >
                          Invite member
                        </Button>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Permission Gate Fallback */}
                      {membersLoading ? (
                        <div className="p-8 text-center text-slate-400 space-y-2 animate-pulse">
                          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400 mx-auto" />
                          <p className="text-xs font-mono">Checking workspace permissions...</p>
                        </div>
                      ) : !canManageCompany ? (
                        <div className="p-8 text-center text-slate-400 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                          <ShieldAlert className="h-8 w-8 text-amber-400 mx-auto" />
                          <h3 className="text-sm font-bold text-slate-200">Access Restricted</h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Only company Owners and Admins have permission to view and manage workspace invitations.
                          </p>
                          <div className="pt-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => handleTabChange('overview')}
                            >
                              Return to Overview
                            </Button>
                          </div>
                        </div>
                      ) : invitationsError ? (
                        /* Error State */
                        <div className="p-8 text-center rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
                          <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
                          <h3 className="text-sm font-bold text-rose-200">Unable to load invitations</h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            {invitationsError}
                          </p>
                          <div className="pt-2">
                            <Button
                              variant="secondary"
                              size="xs"
                              icon={RefreshCw}
                              onClick={() => {
                                if (company?.id && typeof loadCompanyInvitations === 'function') {
                                  loadCompanyInvitations(company.id);
                                }
                              }}
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Invitations Content */
                        <>
                          {/* Search & Status Filter Toolbar */}
                          {Array.isArray(invitations) && invitations.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="text"
                                  value={invSearchTerm}
                                  onChange={(e) => setInvSearchTerm(e.target.value)}
                                  placeholder="Search invitations by email, designation, or department..."
                                  className="w-full pl-8 pr-4 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                {invSearchTerm && (
                                  <button
                                    type="button"
                                    onClick={() => setInvSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <Filter className="h-3 w-3 text-slate-400" />
                                  <select
                                    value={invStatusFilter}
                                    onChange={(e) => setInvStatusFilter(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="ALL">All Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="EXPIRED">Expired</option>
                                    <option value="REVOKED">Revoked</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Invitations Presentation */}
                          {invitationsLoading ? (
                            <div className="p-8 text-center text-slate-400 space-y-2 animate-pulse">
                              <RefreshCw className="h-5 w-5 animate-spin text-indigo-400 mx-auto" />
                              <p className="text-xs font-mono">Loading invitations...</p>
                            </div>
                          ) : filteredInvitations.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 rounded-xl border border-slate-800 bg-slate-950/40">
                              <Mail className="h-7 w-7 text-slate-600 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-slate-300">
                                {invitations.length === 0 ? 'No invitations yet' : 'No matching invitations found'}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {invitations.length === 0
                                  ? 'Invite teammates to start building your workspace.'
                                  : 'Try adjusting your search query or status filter.'}
                              </p>
                              {invitations.length === 0 && canManageCompany && (
                                <div className="pt-3">
                                  <Button
                                    variant="primary"
                                    size="xs"
                                    icon={UserPlus}
                                    onClick={() => openInviteModal()}
                                  >
                                    Invite member
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {/* Desktop Table */}
                              <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                                <table className="w-full text-left text-xs">
                                  <thead className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                                    <tr>
                                      <th className="py-3 px-4">Recipient</th>
                                      <th className="py-3 px-4">Role</th>
                                      <th className="py-3 px-4">Designation</th>
                                      <th className="py-3 px-4">Department</th>
                                      <th className="py-3 px-4">Status</th>
                                      <th className="py-3 px-4">Expires</th>
                                      <th className="py-3 px-4">Sent</th>
                                      <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {filteredInvitations.map((inv, index) => {
                                      if (!inv) return null;
                                      const effectiveStatus = getEffectiveStatus(inv);

                                      return (
                                        <tr key={inv.id || index} className="hover:bg-slate-900/30 transition-colors">
                                          <td className="py-3 px-4 font-mono font-medium text-slate-200">
                                            <button
                                              type="button"
                                              onClick={() => openDetailsModal(inv)}
                                              className="text-indigo-400 hover:underline cursor-pointer text-left"
                                            >
                                              {inv.email || '—'}
                                            </button>
                                          </td>

                                          <td className="py-3 px-4">
                                            {renderRoleBadge(inv.role)}
                                          </td>

                                          <td className="py-3 px-4 text-slate-300 font-medium">
                                            {inv.designation || <span className="text-slate-500 font-normal">—</span>}
                                          </td>

                                          <td className="py-3 px-4 text-slate-300 font-medium">
                                            {inv.department || <span className="text-slate-500 font-normal">—</span>}
                                          </td>

                                          <td className="py-3 px-4">
                                            {renderStatusBadge(effectiveStatus)}
                                          </td>

                                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                            {formatDate(inv.expires_at)}
                                          </td>

                                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                            {formatDate(inv.created_at)}
                                          </td>

                                          <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <Button
                                                variant="ghost"
                                                size="xs"
                                                icon={Eye}
                                                onClick={() => openDetailsModal(inv)}
                                                className="text-xs h-7 px-2 text-slate-400 hover:text-slate-200"
                                                title="View details"
                                              >
                                                Details
                                              </Button>

                                              {effectiveStatus === 'PENDING' && (
                                                <Button
                                                  variant="danger"
                                                  size="xs"
                                                  onClick={() => openRevokeModal(inv)}
                                                  className="text-xs h-7 px-2"
                                                >
                                                  Revoke
                                                </Button>
                                              )}

                                              {(effectiveStatus === 'EXPIRED' || effectiveStatus === 'REVOKED') && (
                                                <Button
                                                  variant="secondary"
                                                  size="xs"
                                                  icon={RotateCcw}
                                                  onClick={() => openInviteModal(inv)}
                                                  className="text-xs h-7 px-2"
                                                >
                                                  Invite again
                                                </Button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              {/* Mobile Cards */}
                              <div className="md:hidden space-y-3">
                                {filteredInvitations.map((inv, index) => {
                                  if (!inv) return null;
                                  const effectiveStatus = getEffectiveStatus(inv);

                                  return (
                                    <div
                                      key={inv.id || index}
                                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2.5 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <span className="font-mono font-medium text-slate-200 truncate block">
                                            {inv.email || '—'}
                                          </span>
                                          <div className="flex items-center gap-1.5 pt-1">
                                            {renderRoleBadge(inv.role)}
                                            {renderStatusBadge(effectiveStatus)}
                                          </div>
                                        </div>

                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          icon={Eye}
                                          onClick={() => openDetailsModal(inv)}
                                          className="text-slate-400 hover:text-slate-200"
                                        >
                                          Details
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                                        <div>
                                          <span className="text-slate-500 block">Designation</span>
                                          <span className="text-slate-300 font-medium">
                                            {inv.designation || '—'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-slate-500 block">Department</span>
                                          <span className="text-slate-300 font-medium">
                                            {inv.department || '—'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                                        <span>Expires {formatDate(inv.expires_at)}</span>

                                        <div className="flex items-center gap-1.5">
                                          {effectiveStatus === 'PENDING' && (
                                            <Button
                                              variant="danger"
                                              size="xs"
                                              onClick={() => openRevokeModal(inv)}
                                            >
                                              Revoke
                                            </Button>
                                          )}

                                          {(effectiveStatus === 'EXPIRED' || effectiveStatus === 'REVOKED') && (
                                            <Button
                                              variant="secondary"
                                              size="xs"
                                              icon={RotateCcw}
                                              onClick={() => openInviteModal(inv)}
                                            >
                                              Invite again
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

              </div>
            ) : (

              /* =======================================================
                 CREATE COMPANY VIEW (No Company Yet)
                 ======================================================= */
              <div className="max-w-xl mx-auto space-y-5">
                <div className="text-center space-y-1.5 py-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shadow-sm">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Create your company workspace
                  </h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Set up your organization to start collaborating with your team on CollabHub.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle icon={Building2}>Organization Setup</CardTitle>
                    <CardDescription>
                      Enter your company details. You will become the organization owner.
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
                        placeholder="e.g. Acme Technologies, DevStudio"
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
                          rows={2}
                          value={createForm.description}
                          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                          placeholder="Brief description of your organization..."
                          className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Industry
                          </label>
                          <select
                            value={createForm.industry}
                            onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                            className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                          >
                            <option value="">Select Industry</option>
                            {INDUSTRY_OPTIONS.map((ind) => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Company Size
                          </label>
                          <select
                            value={createForm.company_size}
                            onChange={(e) => setCreateForm({ ...createForm, company_size: e.target.value })}
                            className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
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
                          className="w-full text-xs"
                        >
                          Create Company Workspace
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
          INVITE TEAMMATE MODAL
          ======================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={closeInviteModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          <div className="relative z-10 w-full max-w-md my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">
                  Invite a teammate
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Add someone to your <span className="text-slate-200 font-medium">{company?.name}</span> workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inviteError && (
              <Alert variant="error" onClose={() => setInviteError(null)}>
                {inviteError}
              </Alert>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <Input
                label="Work email"
                type="email"
                name="email"
                id="invite-member-email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="colleague@example.com"
                required
                icon={Mail}
                autoFocus
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} — {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Designation (Job title)"
                name="designation"
                id="invite-member-designation"
                value={inviteForm.designation}
                onChange={(e) => setInviteForm({ ...inviteForm, designation: e.target.value })}
                placeholder="e.g. Backend Developer, QA Engineer"
                icon={Briefcase}
              />

              <Input
                label="Department"
                name="department"
                id="invite-member-department"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                placeholder="e.g. Engineering, Product, Testing"
                icon={Building2}
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeInviteModal}
                  disabled={inviteLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={inviteLoading}
                  className="text-xs"
                >
                  {inviteLoading ? 'Sending...' : 'Send invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          REVOKE CONFIRMATION MODAL
          ======================================================= */}
      {isRevokeModalOpen && revokingInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={closeRevokeModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          <div className="relative z-10 w-full max-w-sm my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/25">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Revoke invitation?
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  This invitation for <span className="font-mono text-slate-200">{revokingInvitation.email}</span> will no longer be valid and cannot be accepted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeRevokeModal}
                disabled={revokeLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmRevoke}
                loading={revokeLoading}
                className="text-xs"
              >
                Revoke invitation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          INVITATION DETAILS MODAL
          ======================================================= */}
      {isDetailsModalOpen && selectedInvitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={closeDetailsModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          <div className="relative z-10 w-full max-w-md my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Invitation details
              </h3>
              <button
                type="button"
                onClick={closeDetailsModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Recipient email</span>
                <span className="font-mono text-slate-200 font-medium">{selectedInvitation.email || '—'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Role</span>
                <div>{renderRoleBadge(selectedInvitation.role)}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <div>{renderStatusBadge(getEffectiveStatus(selectedInvitation))}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Designation</span>
                <span className="text-slate-200 font-medium">{selectedInvitation.designation || '—'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Department</span>
                <span className="text-slate-200 font-medium">{selectedInvitation.department || '—'}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                <span className="text-slate-500">Created at</span>
                <span className="text-slate-300">{formatDate(selectedInvitation.created_at)}</span>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-500">Expires at</span>
                <span className="text-slate-300">{formatDate(selectedInvitation.expires_at)}</span>
              </div>

              {selectedInvitation.accepted_at && (
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Accepted at</span>
                  <span className="text-emerald-400">{formatDate(selectedInvitation.accepted_at)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {getEffectiveStatus(selectedInvitation) === 'PENDING' && (
                <Button
                  type="button"
                  variant="danger"
                  size="xs"
                  onClick={() => {
                    closeDetailsModal();
                    openRevokeModal(selectedInvitation);
                  }}
                >
                  Revoke invitation
                </Button>
              )}

              {(getEffectiveStatus(selectedInvitation) === 'EXPIRED' || getEffectiveStatus(selectedInvitation) === 'REVOKED') && (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  icon={RotateCcw}
                  onClick={() => {
                    closeDetailsModal();
                    openInviteModal(selectedInvitation);
                  }}
                >
                  Invite again
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={closeDetailsModal}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          EDIT MEMBER MODAL
          ======================================================= */}
      {isEditMemberModalOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={closeEditMemberModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          <div className="relative z-10 w-full max-w-md my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Edit member
              </h3>
              <button
                type="button"
                onClick={closeEditMemberModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-300 font-bold text-xs">
                {(editingMember.user?.full_name || editingMember.user?.username || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-200 text-xs block truncate">
                  {editingMember.user?.full_name || editingMember.user?.username}
                </span>
                <span className="text-[11px] text-slate-400 font-mono truncate block">
                  {editingMember.user?.email}
                </span>
              </div>
            </div>

            {editMemberError && (
              <Alert variant="error" onClose={() => setEditMemberError(null)}>
                {editMemberError}
              </Alert>
            )}

            <form onSubmit={handleEditMemberSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Role
                </label>
                <select
                  value={editMemberForm.role}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
                  className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  {isOwner && <option value="OWNER">Owner</option>}
                </select>
              </div>

              <Input
                label="Designation"
                name="designation"
                id="edit-member-designation"
                value={editMemberForm.designation}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, designation: e.target.value })}
                placeholder="e.g. Senior Backend Developer"
                icon={Briefcase}
              />

              <Input
                label="Department"
                name="department"
                id="edit-member-department"
                value={editMemberForm.department}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, department: e.target.value })}
                placeholder="e.g. Engineering"
                icon={Building2}
              />

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeEditMemberModal}
                  disabled={editMemberLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={editMemberLoading}
                  className="text-xs"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================
          EDIT COMPANY PROFILE MODAL
          ======================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            onClick={closeEditModal}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          <div className="relative z-10 w-full max-w-lg my-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Edit company profile
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
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

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <Input
                label="Company Name"
                name="name"
                id="edit-company-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g. Acme Technologies"
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
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="What does your company do?"
                  className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Industry
                  </label>
                  <select
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRY_OPTIONS.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Company Size
                  </label>
                  <select
                    value={editForm.company_size}
                    onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                    className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Company Size</option>
                    {COMPANY_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>{size} employees</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeEditModal}
                  disabled={editLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={editLoading}
                  className="text-xs"
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
