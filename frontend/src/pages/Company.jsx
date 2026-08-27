import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../components/Toast';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Alert from '../components/Alert';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import Avatar, { getDisplayName } from '../components/Avatar';
import { TableSkeleton } from '../components/Skeleton';
import {
  Building2,
  ChevronRight,
  Fingerprint,
  Edit3,
  Copy,
  Check,
  RefreshCw,
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
  Search,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Send,
  Sparkles,
  Clock,
  Ban,
  MoreVertical,
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
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const mainScrollRef = useRef(null);

  const {
    company,
    members = [],
    invitations = [],
    currentUserRole = 'MEMBER',
    isOwner = false,
    isAdmin = false,
    canManageCompany = false,
    canInviteMembers = false,
    canEditMembers = false,
    hasCompany = false,
    loading = false,
    membersLoading = false,
    invitationsLoading = false,
    invitationsError = null,
    error = null,
    clearError,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    sendCompanyInvitation,
    revokeInvitation,
    loadCompanyInvitations,
    updateCompanyMember,
  } = useCompany();

  // Tab State safely parsed from URL
  const tabParam = searchParams.get('tab')?.toLowerCase();
  const currentValidTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'overview';
  const [activeTab, setActiveTab] = useState(currentValidTab);

  // Synchronize activeTab whenever searchParams changes and reset scroll position to top
  useEffect(() => {
    setActiveTab(currentValidTab);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [currentValidTab, location.search]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Modals visibility
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
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

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'MEMBER',
    designation: '',
    department: '',
  });

  const [editingMember, setEditingMember] = useState(null);
  const [editMemberForm, setEditMemberForm] = useState({
    role: 'MEMBER',
    designation: '',
    department: '',
  });

  const [revokingInvitation, setRevokingInvitation] = useState(null);
  const [selectedInvitation, setSelectedInvitation] = useState(null);

  // Action status states
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editMemberLoading, setEditMemberLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [formError, setFormError] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [editMemberError, setEditMemberError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Members search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Invitations search & filter
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState('ALL');

  // Safely switch tab, reset scroll to top, and persist query parameter in URL
  const handleTabChange = (newTab) => {
    const safeTab = VALID_TABS.includes(newTab) ? newTab : 'overview';
    setActiveTab(safeTab);

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (safeTab === 'overview') {
        next.delete('tab');
      } else {
        next.set('tab', safeTab);
      }
      return next;
    });

    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  };

  // If page loads directly on tab=invitations, fetch invitations
  useEffect(() => {
    if (currentValidTab === 'invitations' && company?.id && canManageCompany && typeof loadCompanyInvitations === 'function') {
      loadCompanyInvitations(company.id);
    }
  }, [currentValidTab, company?.id, canManageCompany, loadCompanyInvitations]);

  const copyCompanyId = () => {
    if (!company?.id) return;
    navigator.clipboard.writeText(company.id);
    setCopiedUuid(true);
    addToast('Workspace ID copied to clipboard', 'info');
    setTimeout(() => setCopiedUuid(false), 2000);
  };

  const copyInviteUrl = (token) => {
    if (!token) return;
    const url = `${window.location.origin}/invitations/accept?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteLink(true);
    addToast('Invitation link copied to clipboard', 'info');
    setTimeout(() => setCopiedInviteLink(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSuccessMessage(null);
    setFormError(null);
    setInviteError(null);
    if (typeof clearError === 'function') clearError();
    try {
      if (typeof fetchCompany === 'function') {
        await fetchCompany();
      }
      setLogoLoadError(false);
      addToast('Workspace data refreshed', 'success');
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
    if (typeof clearError === 'function') clearError();
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

  // Submit Create Company
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.name.trim()) {
      setFormError('Please enter a company name.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        industry: createForm.industry || undefined,
        company_size: createForm.company_size || undefined,
        country: createForm.country.trim() || undefined,
        city: createForm.city.trim() || undefined,
        website: createForm.website.trim() || undefined,
        logo_url: createForm.logo_url.trim() || undefined,
      };

      await createCompany(payload);
      addToast('Company workspace created successfully!', 'success');
      setActiveTab('overview');
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to create company. Please check input parameters.'
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // Submit Edit Company
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!editForm.name.trim()) {
      setFormError('Company name is required.');
      return;
    }

    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        industry: editForm.industry || undefined,
        company_size: editForm.company_size || undefined,
        country: editForm.country.trim() || undefined,
        city: editForm.city.trim() || undefined,
        website: editForm.website.trim() || undefined,
        logo_url: editForm.logo_url.trim() || undefined,
      };

      await updateCompany(payload);
      closeEditModal();
      addToast('Company updated successfully', 'success');
    } catch (err) {
      setFormError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to update company. Please try again.'
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Invite Member
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);

    const trimmedEmail = inviteForm.email.trim();
    if (!trimmedEmail) {
      setInviteError('Please enter a work email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setInviteError('Please enter a valid email format (e.g. name@company.com).');
      return;
    }

    setInviteLoading(true);
    try {
      await sendCompanyInvitation({
        email: trimmedEmail,
        role: inviteForm.role,
        designation: inviteForm.designation.trim() || undefined,
        department: inviteForm.department.trim() || undefined,
      });

      closeInviteModal();
      if (typeof clearError === 'function') clearError();
      addToast(`Invitation sent to ${trimmedEmail}`, 'success');
      setSuccessMessage(`Invitation successfully sent to ${trimmedEmail}`);
    } catch (err) {
      setInviteError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to send invitation. Please try again.'
      );
    } finally {
      setInviteLoading(false);
    }
  };

  // Submit Edit Member
  const handleEditMemberSubmit = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditMemberError(null);

    setEditMemberLoading(true);
    try {
      const payload = {
        role: editMemberForm.role,
        designation: editMemberForm.designation.trim() || undefined,
        department: editMemberForm.department.trim() || undefined,
      };

      await updateCompanyMember(editingMember.user_id, payload);
      closeEditMemberModal();
      addToast('Member updated successfully', 'success');
    } catch (err) {
      setEditMemberError(
        err.response?.data?.detail ||
          err.message ||
          'Failed to update member role.'
      );
    } finally {
      setEditMemberLoading(false);
    }
  };

  // Submit Revoke Invitation
  const handleRevokeSubmit = async () => {
    if (!revokingInvitation) return;
    setRevokeLoading(true);
    try {
      await revokeInvitation(revokingInvitation.id);
      closeRevokeModal();
      if (typeof clearError === 'function') clearError();
      addToast('Invitation revoked successfully', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to revoke invitation', 'error');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Submit Company Workspace Deletion (Owner only)
  const handleDeleteCompany = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (deleteConfirmationName.trim() !== (company?.name || '').trim()) {
      addToast('Please enter the exact workspace name to confirm deletion.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCompany(company.id);
      addToast(`Workspace "${company.name}" has been deleted.`, 'success');
      setIsDeleteModalOpen(false);
      setDeleteConfirmationName('');
    } catch (err) {
      addToast(err.message || 'Failed to delete workspace.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Members list
  const departments = useMemo(() => {
    const set = new Set();
    members.forEach((m) => {
      if (m.department && m.department.trim()) {
        set.add(m.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (roleFilter !== 'ALL' && m.role !== roleFilter) {
        return false;
      }
      if (departmentFilter !== 'ALL' && m.department !== departmentFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = (m.user?.full_name || m.full_name)?.toLowerCase().includes(query);
        const userMatch = (m.user?.username || m.username)?.toLowerCase().includes(query);
        const emailMatch = (m.user?.email || m.email)?.toLowerCase().includes(query);
        const desigMatch = m.designation?.toLowerCase().includes(query);
        const deptMatch = m.department?.toLowerCase().includes(query);
        return nameMatch || userMatch || emailMatch || desigMatch || deptMatch;
      }
      return true;
    });
  }, [members, roleFilter, departmentFilter, searchTerm]);

  // Filtered Invitations list and stats
  const invitationStats = useMemo(() => {
    const stats = {
      total: invitations.length,
      pending: 0,
      accepted: 0,
      expired: 0,
      revoked: 0,
    };
    invitations.forEach((inv) => {
      const st = (inv.status || 'PENDING').toUpperCase();
      if (st === 'PENDING') stats.pending++;
      else if (st === 'ACCEPTED') stats.accepted++;
      else if (st === 'EXPIRED') stats.expired++;
      else if (st === 'REVOKED') stats.revoked++;
    });
    return stats;
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (invStatusFilter !== 'ALL') {
        const st = (inv.status || 'PENDING').toUpperCase();
        if (st !== invStatusFilter) return false;
      }
      if (invSearchTerm.trim()) {
        const query = invSearchTerm.toLowerCase();
        const emailMatch = inv.email?.toLowerCase().includes(query);
        const desigMatch = inv.designation?.toLowerCase().includes(query);
        const deptMatch = inv.department?.toLowerCase().includes(query);
        return emailMatch || desigMatch || deptMatch;
      }
      return true;
    });
  }, [invitations, invStatusFilter, invSearchTerm]);

  // Role Badge Helper
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'OWNER':
        return (
          <Badge variant="warning" dot size="xs">
            <Crown className="h-3 w-3 inline mr-1 text-amber-600 dark:text-amber-400" />
            OWNER
          </Badge>
        );
      case 'ADMIN':
        return (
          <Badge variant="purple" dot size="xs">
            <ShieldCheck className="h-3 w-3 inline mr-1 text-purple-600 dark:text-purple-400" />
            ADMIN
          </Badge>
        );
      case 'MEMBER':
      default:
        return (
          <Badge variant="indigo" size="xs">
            <UserCheck className="h-3 w-3 inline mr-1 text-indigo-600 dark:text-indigo-400" />
            MEMBER
          </Badge>
        );
    }
  };

  // Status Badge Helper for Invitations
  const renderStatusBadge = (status) => {
    const st = (status || 'PENDING').toUpperCase();
    switch (st) {
      case 'PENDING':
        return (
          <Badge variant="warning" dot pulse size="xs">
            Pending
          </Badge>
        );
      case 'ACCEPTED':
        return (
          <Badge variant="success" dot size="xs">
            Accepted
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge variant="error" size="xs">
            Expired
          </Badge>
        );
      case 'REVOKED':
        return (
          <Badge variant="neutral" size="xs">
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="xs">{status}</Badge>;
    }
  };

  // Consistent Date Formatting Helper across table and modals
  const formatEventDate = (dateString) => {
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

  // Safe time remaining calculator for PENDING invitations
  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    try {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diffMs = expiry.getTime() - now.getTime();
      if (diffMs <= 0) return 'Expired';
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays >= 1) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
      }
      if (diffHours >= 1) {
        return `${diffHours} hr${diffHours > 1 ? 's' : ''} left`;
      }
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins} min${diffMins > 1 ? 's' : ''} left`;
    } catch {
      return null;
    }
  };

  // Dynamic Lifecycle Event Renderer for Desktop Table
  const renderInvitationLifecycleEvent = (inv) => {
    const status = (inv.status || '').toUpperCase();

    if (status === 'PENDING') {
      const timeRemaining = getTimeRemaining(inv.expires_at);
      const dateFormatted = formatEventDate(inv.expires_at);
      return (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-[#CBD5E1] font-medium font-mono">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span>Expires {dateFormatted}</span>
          </div>
          {timeRemaining && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 pl-5">
              {timeRemaining}
            </span>
          )}
        </div>
      );
    }

    if (status === 'ACCEPTED') {
      const acceptedDate = formatEventDate(inv.accepted_at || inv.updated_at);
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium font-mono">
          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Accepted {acceptedDate !== '—' ? acceptedDate : ''}</span>
        </div>
      );
    }

    if (status === 'REVOKED') {
      const revokedDate = formatEventDate(inv.updated_at);
      return (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
          <Ban className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B] shrink-0" />
          <span>Revoked {revokedDate !== '—' ? revokedDate : ''}</span>
        </div>
      );
    }

    if (status === 'EXPIRED') {
      const expiredDate = formatEventDate(inv.expires_at);
      return (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium font-mono">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <span>Expired {expiredDate}</span>
        </div>
      );
    }

    return <span className="text-slate-400 dark:text-[#64748B] text-xs font-mono">—</span>;
  };

  return (
    <div className="h-screen bg-[#F4F6FA] dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Top SaaS Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh min-h-0">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Breadcrumb Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
                <span>TeamX</span>
                <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
                <span>Workspace</span>
                <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
                <span className="text-indigo-600 dark:text-indigo-400 font-medium capitalize">{activeTab}</span>
              </div>

              {hasCompany && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  icon={RefreshCw}
                  className="text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                >
                  Refresh
                </Button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <Alert variant="error" title="Workspace Error">
                {error}
              </Alert>
            )}

            {/* Global Success Banner */}
            {successMessage && (
              <Alert
                variant="success"
                title="Operation complete"
                onClose={() => setSuccessMessage(null)}
              >
                {successMessage}
              </Alert>
            )}

            {/* IF NO COMPANY EXISTS: SETUP VIEW */}
            {!hasCompany && !loading ? (
              <div className="max-w-xl mx-auto space-y-6 animate-fade-in py-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-2xs mx-auto">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
                    Create your company workspace
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                    Set up your organization on TeamX to manage members, invite teammates, and collaborate across teams.
                  </p>
                </div>

                <Card>
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {formError && (
                      <Alert variant="error" title="Validation error">
                        {formError}
                      </Alert>
                    )}

                    <Input
                      id="create-name"
                      name="name"
                      label="Company Name"
                      required
                      placeholder="Acme Technologies, Inc."
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      icon={Building2}
                      autoFocus
                    />

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Brief summary of what your company builds..."
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] p-3 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Industry
                        </label>
                        <select
                          value={createForm.industry}
                          onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                          className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
                        >
                          <option value="">Select industry...</option>
                          {INDUSTRY_OPTIONS.map((ind) => (
                            <option key={ind} value={ind}>{ind}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
                          Company Size
                        </label>
                        <select
                          value={createForm.company_size}
                          onChange={(e) => setCreateForm({ ...createForm, company_size: e.target.value })}
                          className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
                        >
                          <option value="">Select size...</option>
                          {COMPANY_SIZE_OPTIONS.map((sz) => (
                            <option key={sz} value={sz}>{sz} employees</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="City"
                        placeholder="San Francisco"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      />
                      <Input
                        label="Country"
                        placeholder="United States"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                      />
                    </div>

                    <Input
                      label="Website URL"
                      placeholder="https://example.com"
                      value={createForm.website}
                      onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                      icon={Globe}
                    />

                    <div className="pt-2">
                      <Button
                        type="submit"
                        loading={createLoading}
                        icon={ArrowRight}
                        iconPosition="right"
                        className="w-full font-medium"
                        size="md"
                      >
                        {createLoading ? 'Creating workspace...' : 'Create Company Workspace'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            ) : loading ? (
              /* State B: Workspace Loading State */
              <div className="space-y-6 animate-fade-in">
                <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-6 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">Loading workspace...</h3>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono">Fetching company details and memberships...</p>
                    </div>
                  </div>
                </div>
                <TableSkeleton rows={4} />
              </div>
            ) : (
              /* MAIN COMPANY WORKSPACE PAGE */
              <div className="space-y-6 animate-fade-in">
                
                {/* Header Banner */}
                <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Company Avatar / Logo */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] shadow-xs flex items-center justify-center">
                      {company?.logo_url && !logoLoadError ? (
                        <img
                          src={company.logo_url}
                          alt={company.name}
                          onError={() => setLogoLoadError(true)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white font-bold text-2xl">
                          {company?.name ? company.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] truncate">
                          {company?.name}
                        </h1>
                        <div>{renderRoleBadge(currentUserRole)}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                        {company?.industry && (
                          <span className="flex items-center gap-1 font-normal">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
                            {company.industry}
                          </span>
                        )}
                        {(company?.city || company?.country) && (
                          <span className="flex items-center gap-1 font-normal">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
                            {[company.city, company.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {company?.website && (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-normal hover:underline"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Website</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* Profile Completeness Bar */}
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1B263A]">
                          <div
                            className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                            style={{ width: `${company?.profile_completeness ?? 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-[#94A3B8]">
                          {company?.profile_completeness ?? 0}% complete
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {canInviteMembers && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={UserPlus}
                        onClick={() => openInviteModal()}
                        className="text-xs font-medium"
                      >
                        Invite member
                      </Button>
                    )}

                    {canManageCompany && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit3}
                        onClick={openEditModal}
                        className="text-xs font-medium"
                      >
                        Edit company
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tabs Navigation Strip */}
                <div className="border-b border-slate-200 dark:border-[#263449] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange('overview')}
                      className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
                        activeTab === 'overview'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      <span>Overview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('members')}
                      className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
                        activeTab === 'members'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>Members</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1]">
                        {members.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange('invitations')}
                      className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
                        activeTab === 'invitations'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Mail className="h-4 w-4" />
                      <span>Invitations</span>
                      {canManageCompany && (
                        <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1]">
                          {invitations.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: 2 Columns Company Information */}
                      <div className="md:col-span-2 space-y-6">
                        {/* Company Description Card */}
                        <Card>
                          <CardHeader className="flex items-center justify-between">
                            <CardTitle icon={Building2}>About Organization</CardTitle>
                            {canManageCompany && (
                              <button
                                type="button"
                                onClick={openEditModal}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium cursor-pointer"
                              >
                                Edit details
                              </button>
                            )}
                          </CardHeader>
                          <CardContent>
                            {company?.description ? (
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                                {company.description}
                              </p>
                            ) : (
                              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#263449] bg-slate-50/60 dark:bg-[#0F172A]/50 text-center">
                                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                                  No organization description added yet.
                                </p>
                                {canManageCompany && (
                                  <button
                                    type="button"
                                    onClick={openEditModal}
                                    className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                                  >
                                    + Add description
                                  </button>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Industry */}
                          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
                              <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Industry
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] mt-1">
                              {company?.industry || 'Not specified'}
                            </p>
                          </div>

                          {/* Company Size */}
                          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
                              <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Company Size
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] mt-1">
                              {company?.company_size ? `${company.company_size} employees` : 'Not specified'}
                            </p>
                          </div>

                          {/* Location */}
                          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
                              <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Location
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] mt-1">
                              {[company?.city, company?.country].filter(Boolean).join(', ') || 'Not specified'}
                            </p>
                          </div>

                          {/* Website */}
                          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
                              <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              Website
                            </span>
                            {company?.website ? (
                              <a
                                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mt-1 flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{company.website}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              <p className="text-sm text-slate-400 dark:text-[#64748B] mt-1">
                                Not added yet
                              </p>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right: 1 Column Workspace Details & Identifiers */}
                      <div className="space-y-6">
                        
                        {/* Workspace Identifiers Card */}
                        <Card>
                          <CardHeader>
                            <CardTitle icon={Fingerprint}>Workspace Details</CardTitle>
                            <CardDescription>Organization identifier & metadata</CardDescription>
                          </CardHeader>

                          <CardContent className="space-y-3.5 text-xs">
                            <div>
                              <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8] mb-1">
                                <span className="font-mono text-[11px] uppercase">Organization ID</span>
                                <button
                                  type="button"
                                  onClick={copyCompanyId}
                                  className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                                  title="Copy Organization ID"
                                >
                                  {copiedUuid ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] font-mono text-[11px] text-slate-700 dark:text-[#CBD5E1] break-all select-all">
                                {company?.id}
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449]">
                              <span className="text-slate-500 dark:text-[#94A3B8]">Your Role</span>
                              <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{currentUserRole}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449]">
                              <span className="text-slate-500 dark:text-[#94A3B8]">Active Members</span>
                              <span className="font-mono font-semibold text-slate-900 dark:text-[#F8FAFC]">{members.length}</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Quick Module Access */}
                        <Card>
                          <CardHeader>
                            <CardTitle icon={Sparkles}>Workspace Navigation</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <button
                              type="button"
                              onClick={() => handleTabChange('members')}
                              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B263A]/40 hover:bg-slate-100 dark:hover:bg-[#202D43] text-xs font-medium text-slate-800 dark:text-[#CBD5E1] transition-colors cursor-pointer border border-slate-200/80 dark:border-[#263449]"
                            >
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Manage Members ({members.length})</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400 dark:text-[#94A3B8]" />
                            </button>

                            {canManageCompany && (
                              <button
                                type="button"
                                onClick={() => handleTabChange('invitations')}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B263A]/40 hover:bg-slate-100 dark:hover:bg-[#202D43] text-xs font-medium text-slate-800 dark:text-[#CBD5E1] transition-colors cursor-pointer border border-slate-200/80 dark:border-[#263449]"
                              >
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                  <span>Invitations ({invitations.length})</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-[#94A3B8]" />
                              </button>
                            )}
                          </CardContent>
                        </Card>

                      </div>

                    </div>

                    {/* Danger Zone: Workspace Deletion (Owner only) */}
                    {isOwner && (
                      <div className="pt-2">
                        <Card className="border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
                          <CardHeader>
                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="h-4 w-4" />
                              <CardTitle className="text-sm text-rose-700 dark:text-rose-400">Danger Zone</CardTitle>
                            </div>
                            <CardDescription>
                              Sensitive and irreversible workspace actions.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-0">
                            <div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                Delete Workspace
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                                Remove this workspace from your active account and revoke all pending invitations.
                              </p>
                            </div>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => {
                                setDeleteConfirmationName('');
                                setIsDeleteModalOpen(true);
                              }}
                              className="shrink-0 text-xs"
                            >
                              Delete Workspace
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: MEMBERS */}
                {activeTab === 'members' && (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Top Controls: Search + Filters + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151F32] p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] shadow-xs">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[220px]">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-[#94A3B8]">
                          <Search className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search members by name, email, or designation..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-2xs"
                        />
                      </div>

                      {/* Filter Dropdowns */}
                      <div className="flex items-center gap-2.5">
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-700 dark:text-[#CBD5E1] font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                        >
                          <option value="ALL">All Roles</option>
                          <option value="OWNER">Owner</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                        </select>

                        {departments.length > 0 && (
                          <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-700 dark:text-[#CBD5E1] font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                          >
                            <option value="ALL">All Departments</option>
                            {departments.map((dept) => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        )}

                        {canInviteMembers && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={UserPlus}
                            onClick={() => openInviteModal()}
                            className="text-xs font-medium shrink-0"
                          >
                            Invite
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Members Content: Desktop Table & Mobile Cards */}
                    {membersLoading ? (
                      <TableSkeleton rows={4} />
                    ) : filteredMembers.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="No members found"
                        description={
                          searchTerm || roleFilter !== 'ALL' || departmentFilter !== 'ALL'
                            ? 'No workspace members match your search filters.'
                            : "Your workspace doesn't have any members yet."
                        }
                        actionLabel={canInviteMembers ? 'Invite member' : undefined}
                        onAction={canInviteMembers ? () => openInviteModal() : undefined}
                      />
                    ) : (
                      <>
                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#151F32] rounded-xl border border-slate-200/80 dark:border-[#263449] shadow-xs">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-[#263449]">
                            <thead className="bg-slate-50/80 dark:bg-[#1B263A]/40">
                              <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                  Member
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                  Role
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                  Designation
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                  Department
                                </th>
                                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                  Joined
                                </th>
                                {canEditMembers && (
                                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider w-24 min-w-[84px]">
                                    Actions
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#263449] bg-white dark:bg-[#151F32]">
                              {filteredMembers.map((m) => {
                                const memberName = m.user?.full_name || m.full_name || m.user?.username || m.username || 'Member';
                                const memberEmail = m.user?.email || m.email || '';
                                const isSelf = user?.id === m.user_id || (user?.id && m.user?.id === user.id);

                                return (
                                  <tr key={m.user_id || m.id} className="hover:bg-slate-50/60 dark:hover:bg-[#202D43]/50 transition-colors">
                                    {/* Member Column */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center gap-3">
                                        <Avatar user={m} size="md" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                              {memberName}
                                            </span>
                                            {isSelf && (
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                                                You
                                              </span>
                                            )}
                                          </div>
                                          {memberEmail && (
                                            <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono block">
                                              {memberEmail}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Role Column */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {renderRoleBadge(m.role)}
                                    </td>

                                    {/* Designation Column */}
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-[#CBD5E1] font-normal">
                                      {m.designation || <span className="text-slate-400 dark:text-[#64748B]">—</span>}
                                    </td>

                                    {/* Department Column */}
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-[#CBD5E1]">
                                      {m.department || <span className="text-slate-400 dark:text-[#64748B]">—</span>}
                                    </td>

                                    {/* Joined Column */}
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
                                      {m.created_at
                                        ? new Date(m.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                          })
                                        : '—'}
                                    </td>

                                    {/* Actions Column */}
                                    {canEditMembers && (
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs w-24 min-w-[84px]">
                                        {(isOwner || (isAdmin && m.role !== 'OWNER')) ? (
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            icon={Edit3}
                                            onClick={() => openEditMemberModal(m)}
                                            className="text-xs text-slate-600 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400"
                                          >
                                            Edit
                                          </Button>
                                        ) : (
                                          <span className="text-slate-400 dark:text-[#64748B] text-xs">—</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                          {filteredMembers.map((m) => {
                            const memberName = m.user?.full_name || m.full_name || m.user?.username || m.username || 'Member';
                            const memberEmail = m.user?.email || m.email || '';
                            const isSelf = user?.id === m.user_id || (user?.id && m.user?.id === user.id);

                            return (
                              <div
                                key={m.user_id || m.id}
                                className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs space-y-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <Avatar user={m} size="lg" />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                          {memberName}
                                        </h4>
                                        {isSelf && (
                                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      {memberEmail && (
                                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono truncate">
                                          {memberEmail}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div>{renderRoleBadge(m.role)}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-[#263449]">
                                  <div>
                                    <span className="text-slate-400 dark:text-[#94A3B8] block text-[10px] uppercase font-mono">Designation</span>
                                    <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">{m.designation || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 dark:text-[#94A3B8] block text-[10px] uppercase font-mono">Department</span>
                                    <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">{m.department || '—'}</span>
                                  </div>
                                </div>

                                {canEditMembers && (isOwner || (isAdmin && m.role !== 'OWNER')) && (
                                  <div className="pt-2 border-t border-slate-100 dark:border-[#263449] flex justify-end">
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      icon={Edit3}
                                      onClick={() => openEditMemberModal(m)}
                                      className="text-xs w-full"
                                    >
                                      Edit Membership
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB 3: INVITATIONS */}
                {activeTab === 'invitations' && (
                  <div className="space-y-5 animate-fade-in">
                    
                    {/* Header Ribbon & Subtitle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#151F32] p-5 rounded-xl border border-slate-200/80 dark:border-[#263449] shadow-xs">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
                          <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Invitations History</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          Manage invitations sent to people you want to add to your workspace.
                        </p>
                      </div>

                      {canInviteMembers && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={UserPlus}
                          onClick={() => openInviteModal()}
                          className="text-xs font-medium shrink-0"
                        >
                          + Invite member
                        </Button>
                      )}
                    </div>

                    {/* Stats Ribbon: Clean neutral surfaces with subtle accents */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-slate-400 dark:text-[#94A3B8]">Total</span>
                          <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-[#64748B]" />
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono mt-1">{invitationStats.total}</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-amber-600 dark:text-amber-400">Pending</span>
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono mt-1">{invitationStats.pending}</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-emerald-600 dark:text-emerald-400">Accepted</span>
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono mt-1">{invitationStats.accepted}</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-rose-600 dark:text-rose-400">Expired</span>
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono mt-1">{invitationStats.expired}</p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-slate-500 dark:text-[#94A3B8]">Revoked</span>
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                        </div>
                        <p className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono mt-1">{invitationStats.revoked}</p>
                      </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#151F32] p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] shadow-xs">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[220px]">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-[#94A3B8]">
                          <Search className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search invitations by email, designation..."
                          value={invSearchTerm}
                          onChange={(e) => setInvSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors shadow-2xs"
                        />
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-2">
                        <select
                          value={invStatusFilter}
                          onChange={(e) => setInvStatusFilter(e.target.value)}
                          className="px-3 py-2 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-700 dark:text-[#CBD5E1] font-medium focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                        >
                          <option value="ALL">All Statuses</option>
                          <option value="PENDING">Pending</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="EXPIRED">Expired</option>
                          <option value="REVOKED">Revoked</option>
                        </select>
                      </div>
                    </div>

                    {/* Invitations Content: Clear States & Error Handling */}
                    {membersLoading || invitationsLoading ? (
                      <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-8 shadow-xs space-y-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <RefreshCw className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                          <p className="text-xs font-mono text-slate-500 dark:text-[#94A3B8] font-medium">Loading invitations...</p>
                        </div>
                        <TableSkeleton rows={4} cols={6} />
                      </div>
                    ) : !canManageCompany ? (
                      /* State E: Permission notice for MEMBER */
                      <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs space-y-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            Access Restricted
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                            Only workspace owners and admins can manage invitations.
                          </p>
                        </div>
                        <div className="pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleTabChange('overview')}
                            className="text-xs font-medium"
                          >
                            Back to Overview
                          </Button>
                        </div>
                      </div>
                    ) : invitationsError ? (
                      /* State F: API Error state */
                      <div className="p-8 text-center rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#151F32] shadow-xs space-y-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            Unable to load invitations
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                            {invitationsError}
                          </p>
                        </div>
                        <div className="pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => company?.id && loadCompanyInvitations(company.id)}
                            icon={RefreshCw}
                            className="text-xs font-medium"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : filteredInvitations.length === 0 ? (
                      /* State G: Empty state */
                      <EmptyState
                        icon={Mail}
                        title="No invitations yet"
                        description={
                          invSearchTerm || invStatusFilter !== 'ALL'
                            ? 'No invitations match your search filters.'
                            : 'Invite people to collaborate with your organization.'
                        }
                        actionLabel={canInviteMembers ? 'Invite member' : undefined}
                        onAction={canInviteMembers ? () => openInviteModal() : undefined}
                      />
                    ) : (
                      <>
                        {/* DESKTOP TABLE */}
                        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#151F32] rounded-2xl border border-slate-200/80 dark:border-[#263449] shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-[#263449]">
                              <thead className="bg-slate-50/80 dark:bg-[#1B263A]/40">
                                <tr>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Recipient
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Role
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Designation
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Status
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Sent
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                                    Deadline / Event
                                  </th>
                                  <th scope="col" className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider w-24 min-w-[84px]">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-[#263449] bg-white dark:bg-[#151F32]">
                                {filteredInvitations.map((inv) => {
                                  return (
                                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-[#202D43]/50 transition-colors">
                                      {/* Recipient Email */}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                            <Mail className="h-4 w-4" />
                                          </div>
                                          <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">
                                            {inv.email}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Role */}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {renderRoleBadge(inv.role)}
                                      </td>

                                      {/* Designation */}
                                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-700 dark:text-[#CBD5E1]">
                                        {inv.designation || <span className="text-slate-400 dark:text-[#64748B]">—</span>}
                                      </td>

                                      {/* Status Badge */}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {renderStatusBadge(inv.status)}
                                      </td>

                                      {/* Sent Date */}
                                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-[#94A3B8] font-mono">
                                        {formatEventDate(inv.created_at)}
                                      </td>

                                      {/* Dynamic Lifecycle Event (Deadline / Accepted / Revoked / Expired) */}
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {renderInvitationLifecycleEvent(inv)}
                                      </td>

                                      {/* Actions */}
                                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs w-24 min-w-[84px]">
                                        <div className="flex items-center justify-center">
                                          <button
                                            type="button"
                                            onClick={() => openDetailsModal(inv)}
                                            aria-label={`View details for invitation to ${inv.email}`}
                                            title="View invitation details"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all duration-150 shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                          >
                                            <Eye className="h-4 w-4 shrink-0" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                          {filteredInvitations.map((inv) => {
                            const status = (inv.status || '').toUpperCase();
                            const isPending = status === 'PENDING';
                            const canReinvite = (status === 'EXPIRED' || status === 'REVOKED') && canInviteMembers;

                            return (
                              <div
                                key={inv.id}
                                className="p-4 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs space-y-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono block truncate">
                                      {inv.email}
                                    </span>
                                    <div className="mt-1 flex items-center gap-2">
                                      {renderRoleBadge(inv.role)}
                                      {renderStatusBadge(inv.status)}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-[#263449]">
                                  <div>
                                    <span className="text-slate-400 dark:text-[#94A3B8] block text-[10px] uppercase font-mono">Designation</span>
                                    <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">{inv.designation || '—'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 dark:text-[#94A3B8] block text-[10px] uppercase font-mono">
                                      {isPending ? 'Deadline' : 'Lifecycle Event'}
                                    </span>
                                    <div className="font-medium text-slate-700 dark:text-[#CBD5E1] font-mono text-xs mt-0.5">
                                      {isPending && (
                                        <div>
                                          <span>Expires {formatEventDate(inv.expires_at)}</span>
                                          {getTimeRemaining(inv.expires_at) && (
                                            <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                                              {getTimeRemaining(inv.expires_at)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {status === 'ACCEPTED' && (
                                        <span className="text-emerald-700 dark:text-emerald-400">
                                          Accepted {formatEventDate(inv.accepted_at || inv.updated_at)}
                                        </span>
                                      )}
                                      {status === 'REVOKED' && (
                                        <span className="text-slate-500 dark:text-[#94A3B8]">
                                          Revoked {formatEventDate(inv.updated_at) !== '—' ? formatEventDate(inv.updated_at) : ''}
                                        </span>
                                      )}
                                      {status === 'EXPIRED' && (
                                        <span className="text-rose-600 dark:text-rose-400">
                                          Expired {formatEventDate(inv.expires_at)}
                                        </span>
                                      )}
                                      {!['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'].includes(status) && '—'}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-[#263449] flex items-center justify-end gap-2">
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    icon={Eye}
                                    onClick={() => openDetailsModal(inv)}
                                    aria-label={`View details for invitation to ${inv.email}`}
                                  >
                                    Details
                                  </Button>
                                  {isPending && isOwner && (
                                    <Button
                                      variant="danger"
                                      size="xs"
                                      icon={Trash2}
                                      onClick={() => openRevokeModal(inv)}
                                      aria-label={`Revoke invitation for ${inv.email}`}
                                    >
                                      Revoke
                                    </Button>
                                  )}
                                  {canReinvite && (
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      icon={RotateCcw}
                                      onClick={() => openInviteModal({
                                        email: inv.email,
                                        role: inv.role,
                                        designation: inv.designation,
                                        department: inv.department,
                                      })}
                                      aria-label={`Invite ${inv.email} again`}
                                      className="text-indigo-600 dark:text-indigo-400"
                                    >
                                      Re-invite
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT COMPANY PROFILE                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Company Profile"
        description="Update your organization metadata and workspace appearance."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeEditModal}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={editLoading}
              onClick={handleEditSubmit}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <Alert variant="error" title="Update failed">
              {formError}
            </Alert>
          )}

          <Input
            label="Company Name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Acme Corporation"
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
              Description
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="What does your company do?"
              className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] p-3 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
                Industry
              </label>
              <select
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
              >
                <option value="">Select industry...</option>
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
                Company Size
              </label>
              <select
                value={editForm.company_size}
                onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
              >
                <option value="">Select size...</option>
                {COMPANY_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>{sz} employees</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              placeholder="San Francisco"
            />
            <Input
              label="Country"
              value={editForm.country}
              onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
              placeholder="United States"
            />
          </div>

          <Input
            label="Website URL"
            value={editForm.website}
            onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
            placeholder="https://example.com"
            icon={Globe}
          />

          <Input
            label="Logo Image URL"
            value={editForm.logo_url}
            onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
            placeholder="https://example.com/logo.png"
            helperText="Provide a direct URL to a PNG, SVG, or JPG image."
          />
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: INVITE A NEW MEMBER                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
        title="Invite a new member"
        description="Send an invitation to join your workspace."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeInviteModal}
              disabled={inviteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={inviteLoading}
              onClick={handleInviteSubmit}
              icon={Send}
              iconPosition="right"
            >
              {inviteLoading ? 'Sending invitation...' : 'Send invitation'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/10 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span>The recipient will receive an email with a secure invitation link to join your workspace.</span>
          </div>

          {inviteError && (
            <Alert variant="error" title="Unable to send invitation">
              {inviteError}
            </Alert>
          )}

          <Input
            id="invite-email"
            label="Work email"
            type="email"
            required
            placeholder="colleague@company.com"
            value={inviteForm.email}
            onChange={(e) => {
              setInviteForm({ ...inviteForm, email: e.target.value });
              if (inviteError) setInviteError(null);
              if (error && typeof clearError === 'function') clearError();
            }}
            icon={Mail}
            autoFocus
          />

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
              Role in Workspace <span className="text-indigo-600 dark:text-indigo-400 font-bold">*</span>
            </label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    inviteForm.role === opt.value
                      ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                      : 'border-slate-200 dark:border-[#263449] bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={inviteForm.role === opt.value}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                      {opt.label}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation"
              placeholder="e.g. Senior Frontend Engineer"
              value={inviteForm.designation}
              onChange={(e) => setInviteForm({ ...inviteForm, designation: e.target.value })}
              icon={Briefcase}
            />

            <Input
              label="Department"
              placeholder="e.g. Engineering"
              value={inviteForm.department}
              onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
              icon={Building}
            />
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: EDIT MEMBER ROLE / DESIGNATION                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={isEditMemberModalOpen}
        onClose={closeEditMemberModal}
        title="Edit Member Details"
        description={`Update role and workspace assignment for ${editingMember?.full_name || editingMember?.username || 'member'}.`}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeEditMemberModal}
              disabled={editMemberLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={editMemberLoading}
              onClick={handleEditMemberSubmit}
            >
              {editMemberLoading ? 'Updating...' : 'Update Member'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditMemberSubmit} className="space-y-4">
          {editMemberError && (
            <Alert variant="error" title="Update error">
              {editMemberError}
            </Alert>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] flex items-center gap-3">
            <Avatar user={editingMember} size="lg" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                {editingMember?.user?.full_name || editingMember?.full_name || editingMember?.user?.username || editingMember?.username || 'Member'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono block truncate">
                {editingMember?.user?.email || editingMember?.email || ''}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
              Role Assignment
            </label>
            <select
              value={editMemberForm.role}
              onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
              className="block w-full rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#0F172A] py-2 px-3 text-sm text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
            >
              <option value="MEMBER">Member (Standard Workspace Access)</option>
              <option value="ADMIN">Admin (Can manage profile and invite members)</option>
              {isOwner && (
                <option value="OWNER">Owner (Full ownership & management)</option>
              )}
            </select>
          </div>

          <Input
            label="Designation"
            value={editMemberForm.designation}
            onChange={(e) => setEditMemberForm({ ...editMemberForm, designation: e.target.value })}
            placeholder="e.g. Lead Architect"
            icon={Briefcase}
          />

          <Input
            label="Department"
            value={editMemberForm.department}
            onChange={(e) => setEditMemberForm({ ...editMemberForm, department: e.target.value })}
            placeholder="e.g. Infrastructure"
            icon={Building}
          />
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: CONFIRM REVOKE INVITATION                      */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={closeRevokeModal}
        title="Revoke Invitation"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={closeRevokeModal}
              disabled={revokeLoading}
            >
              Keep Invitation
            </Button>
            <Button
              variant="danger-solid"
              size="sm"
              loading={revokeLoading}
              onClick={handleRevokeSubmit}
            >
              {revokeLoading ? 'Revoking...' : 'Revoke Invitation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Are you sure you want to revoke this invitation?</span>
            </div>
            <p className="leading-relaxed">
              The invitation token sent to <strong className="font-mono text-rose-950 dark:text-rose-200">{revokingInvitation?.email}</strong> will be invalidated immediately.
            </p>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: INVITATION DETAILS MODAL                       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        title="Invitation Details"
        description="Detailed metadata for workspace invitation."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            {selectedInvitation?.status === 'PENDING' && isOwner && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  const invToRevoke = selectedInvitation;
                  closeDetailsModal();
                  openRevokeModal(invToRevoke);
                }}
              >
                Revoke Invitation
              </Button>
            )}
            {(selectedInvitation?.status === 'EXPIRED' || selectedInvitation?.status === 'REVOKED') && canInviteMembers && (
              <Button
                variant="primary"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  const invData = {
                    email: selectedInvitation.email,
                    role: selectedInvitation.role,
                    designation: selectedInvitation.designation,
                    department: selectedInvitation.department,
                  };
                  closeDetailsModal();
                  openInviteModal(invData);
                }}
              >
                Send New Invitation
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={closeDetailsModal}>
              Close
            </Button>
          </div>
        }
      >
        {selectedInvitation && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Recipient Email</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-[#F8FAFC]">{selectedInvitation.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Status</span>
                <div>{renderStatusBadge(selectedInvitation.status)}</div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Assigned Role</span>
                <div>{renderRoleBadge(selectedInvitation.role)}</div>
              </div>

              {selectedInvitation.designation && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Designation</span>
                  <span className="font-medium text-slate-800 dark:text-[#CBD5E1]">{selectedInvitation.designation}</span>
                </div>
              )}

              {selectedInvitation.department && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Department</span>
                  <span className="font-medium text-slate-800 dark:text-[#CBD5E1]">{selectedInvitation.department}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Sent Date</span>
                <span className="font-mono text-slate-700 dark:text-[#CBD5E1]">
                  {selectedInvitation.created_at ? new Date(selectedInvitation.created_at).toLocaleString() : '—'}
                </span>
              </div>

              {/* PENDING: Expiration & Time Remaining */}
              {selectedInvitation.status === 'PENDING' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-[#94A3B8]">Expires</span>
                    <span className="font-mono text-slate-700 dark:text-[#CBD5E1]">
                      {selectedInvitation.expires_at ? new Date(selectedInvitation.expires_at).toLocaleString() : '—'}
                    </span>
                  </div>
                  {getTimeRemaining(selectedInvitation.expires_at) && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-[#94A3B8]">Time Remaining</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {getTimeRemaining(selectedInvitation.expires_at)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* ACCEPTED: Accepted Date */}
              {selectedInvitation.status === 'ACCEPTED' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Accepted Date</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {selectedInvitation.accepted_at
                      ? new Date(selectedInvitation.accepted_at).toLocaleString()
                      : selectedInvitation.updated_at
                      ? new Date(selectedInvitation.updated_at).toLocaleString()
                      : 'Accepted'}
                  </span>
                </div>
              )}

              {/* REVOKED: Revoked Date */}
              {selectedInvitation.status === 'REVOKED' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Revoked Date</span>
                  <span className="font-mono text-slate-600 dark:text-[#94A3B8]">
                    {selectedInvitation.updated_at
                      ? new Date(selectedInvitation.updated_at).toLocaleString()
                      : 'Revoked'}
                  </span>
                </div>
              )}

              {/* EXPIRED: Expired Date */}
              {selectedInvitation.status === 'EXPIRED' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Expired Date</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 font-semibold">
                    {selectedInvitation.expires_at ? new Date(selectedInvitation.expires_at).toLocaleString() : 'Expired'}
                  </span>
                </div>
              )}
            </div>

            {selectedInvitation.token && selectedInvitation.status === 'PENDING' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono font-medium uppercase text-slate-500 dark:text-[#94A3B8]">
                  Invitation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/invitations/accept?token=${selectedInvitation.token}`}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0F172A] font-mono text-[11px] text-slate-700 dark:text-[#CBD5E1] select-all"
                  />
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={copiedInviteLink ? Check : Copy}
                    onClick={() => copyInviteUrl(selectedInvitation.token)}
                  >
                    {copiedInviteLink ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: DELETE WORKSPACE CONFIRMATION MODAL            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeleteConfirmationName('');
          }
        }}
        title="Delete Workspace"
        description="Permanently remove this workspace from your active account."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmationName('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={handleDeleteCompany}
              disabled={isDeleting || deleteConfirmationName.trim() !== (company?.name || '').trim()}
            >
              {isDeleting ? 'Deleting company...' : 'Delete Company'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDeleteCompany} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Warning: This will deactivate this workspace.</span>
            </div>
            <p className="leading-relaxed">
              This will remove <strong className="font-semibold text-rose-950 dark:text-rose-100">{company?.name}</strong> from your active workspaces and immediately revoke all pending invitations.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
              Type <strong className="font-mono text-slate-900 dark:text-white select-all">{company?.name}</strong> to confirm:
            </label>
            <Input
              type="text"
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              placeholder={company?.name}
              disabled={isDeleting}
              autoFocus
            />
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Company;
