import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTeam } from '../context/TeamContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Avatar, { getDisplayName } from '../components/Avatar';
import { getTeamApi } from '../api/teamApi';
import {
  Users2,
  Users,
  Plus,
  Search,
  ArrowLeft,
  Shield,
  Trash2,
  Edit2,
  AlertTriangle,
  Crown,
  Building2,
  ChevronRight,
  MoreVertical,
  Check,
  Activity,
  Archive,
  RotateCcw,
  Sparkles,
  Code2,
  Terminal,
  Zap,
  Briefcase,
  Layers,
  Rocket,
  Heart,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  UserPlus,
  X,
  Eye,
} from 'lucide-react';

// Visual Identity Icon Map
const ICON_OPTIONS = [
  { id: 'users', label: 'Users', icon: Users2 },
  { id: 'code', label: 'Engineering', icon: Code2 },
  { id: 'terminal', label: 'DevOps', icon: Terminal },
  { id: 'zap', label: 'Automation', icon: Zap },
  { id: 'sparkles', label: 'Product', icon: Sparkles },
  { id: 'briefcase', label: 'Business', icon: Briefcase },
  { id: 'layers', label: 'Design', icon: Layers },
  { id: 'rocket', label: 'Growth', icon: Rocket },
  { id: 'heart', label: 'People/HR', icon: Heart },
  { id: 'shield', label: 'Security', icon: Shield },
];

// Visual Identity Color Map
const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-600', lightBg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-600', lightBg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-600', lightBg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-600', lightBg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-600', lightBg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-600', lightBg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/20' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-700', lightBg: 'bg-slate-100 dark:bg-[#1B263A]', text: 'text-slate-700 dark:text-[#CBD5E1]', border: 'border-slate-300 dark:border-[#263449]' },
];

const getIconComponent = (iconId) => {
  const item = ICON_OPTIONS.find((i) => i.id === iconId);
  return item ? item.icon : Users2;
};

const getColorClasses = (colorId) => {
  const item = COLOR_OPTIONS.find((c) => c.id === colorId);
  return item || COLOR_OPTIONS[0];
};

const Teams = () => {
  const { teamId: routeTeamId } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { company, members: companyMembers, canManageCompany, currentUserRole } = useCompany();
  const {
    teams,
    selectedTeam,
    teamActivities,
    loading,
    teamDetailLoading,
    activityLoading,
    error,
    loadTeams,
    loadTeam,
    loadTeamActivity,
    createTeam,
    updateTeam,
    deleteTeam,
    archiveTeam,
    restoreTeam,
    batchAddTeamMembers,
    updateTeamMember,
    removeTeamMember,
    transferTeamLeadership,
  } = useTeam();

  // App Layout Shell State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Directory Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | archived
  const [myTeamsFilter, setMyTeamsFilter] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name | recent | members

  // Dedicated Team Details View Tabs: 'overview' | 'members' | 'activity'
  const [activeTab, setActiveTab] = useState('overview');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // 3-dot Action Menu state for Directory Cards
  const [activeMenuTeamId, setActiveMenuTeamId] = useState(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isTransferLeadModalOpen, setIsTransferLeadModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoveMemberModalOpen, setIsRemoveMemberModalOpen] = useState(false);

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    icon: 'users',
    color: 'indigo',
  });

  const [editTeamForm, setEditTeamForm] = useState({
    name: '',
    description: '',
    icon: 'users',
    color: 'indigo',
  });

  const [actionTargetTeam, setActionTargetTeam] = useState(null);
  const [targetTeamMembers, setTargetTeamMembers] = useState([]);
  const [targetTeamMembersLoading, setTargetTeamMembersLoading] = useState(false);

  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState([]);
  const [addMembersRole, setAddMembersRole] = useState('MEMBER');
  const [targetNewLeadId, setTargetNewLeadId] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Feedback notifications
  const [feedback, setFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Auto-dismiss toast feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load team details if URL contains :teamId
  useEffect(() => {
    if (routeTeamId) {
      loadTeam(routeTeamId);
      loadTeamActivity(routeTeamId);
    }
  }, [routeTeamId, loadTeam, loadTeamActivity]);

  // Close 3-dot menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.team-action-menu-container')) {
        setActiveMenuTeamId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter & Sort Teams in Directory
  const filteredTeams = useMemo(() => {
    if (!Array.isArray(teams)) return [];

    return teams
      .filter((team) => {
        // Status filter
        if (statusFilter === 'active' && team.is_archived) return false;
        if (statusFilter === 'archived' && !team.is_archived) return false;

        // My teams filter
        if (myTeamsFilter) {
          const isMember = team.is_member === true;
          const isLead = (team.leads || []).some((l) => l.id === user?.id);
          if (!isMember && !isLead) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (team.name || '').toLowerCase().includes(q);
          const matchDesc = (team.description || '').toLowerCase().includes(q);
          if (!matchName && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'recent') {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        if (sortBy === 'members') {
          return (b.member_count || 0) - (a.member_count || 0);
        }
        return 0;
      });
  }, [teams, statusFilter, myTeamsFilter, searchQuery, sortBy, user?.id]);

  // Statistics calculation for KPI cards
  const teamStats = useMemo(() => {
    if (!Array.isArray(teams)) {
      return { totalTeams: 0, activeTeams: 0, totalMembers: 0, totalLeads: 0 };
    }
    const totalTeams = teams.length;
    const activeTeams = teams.filter((t) => !t.is_archived).length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.member_count || 0), 0);
    const totalLeads = teams.reduce((acc, t) => acc + (t.leads?.length || 0), 0);

    return { totalTeams, activeTeams, totalMembers, totalLeads };
  }, [teams]);

  // Filtered members in dedicated team view
  const filteredTeamMembers = useMemo(() => {
    if (!selectedTeam || !Array.isArray(selectedTeam.members)) return [];
    if (!memberSearchQuery.trim()) return selectedTeam.members;

    const q = memberSearchQuery.toLowerCase();
    return selectedTeam.members.filter((m) => {
      const u = m.user || {};
      const fullName = (u.full_name || '').toLowerCase();
      const username = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return fullName.includes(q) || username.includes(q) || email.includes(q);
    });
  }, [selectedTeam, memberSearchQuery]);

  // Workspace members not yet added to this team
  const eligibleCompanyMembers = useMemo(() => {
    if (!selectedTeam || !Array.isArray(companyMembers)) return [];
    const currentMemberUserIds = new Set(
      (selectedTeam.members || []).map((m) => m.user_id || m.user?.id)
    );

    return companyMembers.filter((cm) => {
      const uid = cm.user?.id || cm.user_id;
      return uid && !currentMemberUserIds.has(uid);
    });
  }, [selectedTeam, companyMembers]);

  // Eligible members for leadership transfer
  const eligibleNewLeads = useMemo(() => {
    const membersList = actionTargetTeam
      ? targetTeamMembers
      : selectedTeam?.members || [];

    if (!Array.isArray(membersList)) return [];
    return membersList.filter((m) => m.role !== 'LEAD');
  }, [actionTargetTeam, targetTeamMembers, selectedTeam]);

  // Permissions logic for selected team
  const isTeamLead = useMemo(() => {
    if (!selectedTeam || !user?.id) return false;
    return (selectedTeam.leads || []).some((lead) => lead.id === user.id);
  }, [selectedTeam, user?.id]);

  const canManageCurrentTeam = canManageCompany || isTeamLead;

  const userTeamAccessLevel = useMemo(() => {
    if (canManageCompany) return 'Workspace Admin (Full Control)';
    if (isTeamLead) return 'Team Lead (Team Manager)';
    const isMember = (selectedTeam?.members || []).some(
      (m) => m.user_id === user?.id || m.user?.id === user?.id
    );
    if (isMember) return 'Team Member (Collaborator)';
    return 'Workspace Member (Viewer)';
  }, [canManageCompany, isTeamLead, selectedTeam, user?.id]);

  // Navigate to team detail view
  const handleOpenTeam = (tId, initialTab = 'overview') => {
    setActiveTab(initialTab);
    navigate(`/teams/${tId}`);
  };

  // Back to Teams directory
  const handleBackToTeams = () => {
    navigate('/teams');
  };

  // Open Create Team Modal
  const handleOpenCreateModal = () => {
    setTeamForm({
      name: '',
      description: '',
      icon: 'users',
      color: 'indigo',
    });
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  // Submit Create Team
  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      setModalError('Please provide a valid team name.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      const newTeam = await createTeam(teamForm);
      setIsCreateModalOpen(false);
      setFeedback({ type: 'success', message: `Team "${newTeam.name}" created successfully.` });
      navigate(`/teams/${newTeam.id}`);
    } catch (err) {
      setModalError(err.message || 'Failed to create team.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Team Modal
  const handleOpenEditModal = (targetTeam = selectedTeam) => {
    if (!targetTeam) return;
    setActionTargetTeam(targetTeam);
    setEditTeamForm({
      name: targetTeam.name || '',
      description: targetTeam.description || '',
      icon: targetTeam.icon || 'users',
      color: targetTeam.color || 'indigo',
    });
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit Team
  const handleEditTeamSubmit = async (e) => {
    e.preventDefault();
    const target = actionTargetTeam || selectedTeam;
    if (!target) return;

    if (!editTeamForm.name.trim()) {
      setModalError('Team name is required.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      await updateTeam(target.id, editTeamForm);
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'Team details updated successfully.' });
      if (selectedTeam?.id === target.id) {
        loadTeam(target.id);
        loadTeamActivity(target.id);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update team.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Transfer Leadership Modal
  const handleOpenTransferLeadModal = async (targetTeam = selectedTeam) => {
    if (!targetTeam || !company?.id) return;
    setActionTargetTeam(targetTeam);
    setTargetNewLeadId('');
    setModalError(null);
    setIsTransferLeadModalOpen(true);

    if (!targetTeam.members || targetTeam.members.length === 0) {
      setTargetTeamMembersLoading(true);
      try {
        const fullTeam = await getTeamApi(company.id, targetTeam.id);
        setTargetTeamMembers(fullTeam.members || []);
      } catch (err) {
        console.error('Failed to load team members for transfer:', err);
        setTargetTeamMembers([]);
      } finally {
        setTargetTeamMembersLoading(false);
      }
    } else {
      setTargetTeamMembers(targetTeam.members);
    }
  };

  // Submit Transfer Leadership
  const handleTransferLeadSubmit = async (e) => {
    e.preventDefault();
    const target = actionTargetTeam || selectedTeam;
    if (!target) return;

    if (!targetNewLeadId) {
      setModalError('Please select a team member to become the new lead.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      await transferTeamLeadership(target.id, targetNewLeadId);
      setIsTransferLeadModalOpen(false);
      setFeedback({ type: 'success', message: 'Team leadership transferred successfully.' });
      if (selectedTeam?.id === target.id) {
        loadTeam(target.id);
        loadTeamActivity(target.id);
      } else {
        loadTeams();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to transfer leadership.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Archive Modal
  const handleOpenArchiveModal = (targetTeam = selectedTeam) => {
    if (!targetTeam) return;
    setActionTargetTeam(targetTeam);
    setIsArchiveModalOpen(true);
  };

  // Submit Archive Team
  const handleArchiveTeamSubmit = async () => {
    const target = actionTargetTeam || selectedTeam;
    if (!target) return;

    setActionLoading(true);
    try {
      await archiveTeam(target.id);
      setIsArchiveModalOpen(false);
      setFeedback({ type: 'success', message: `Team "${target.name}" archived.` });
      if (selectedTeam?.id === target.id) {
        loadTeam(target.id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to archive team.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Restore Modal
  const handleOpenRestoreModal = (targetTeam = selectedTeam) => {
    if (!targetTeam) return;
    setActionTargetTeam(targetTeam);
    setIsRestoreModalOpen(true);
  };

  // Submit Restore Team
  const handleRestoreTeamSubmit = async () => {
    const target = actionTargetTeam || selectedTeam;
    if (!target) return;

    setActionLoading(true);
    try {
      await restoreTeam(target.id);
      setIsRestoreModalOpen(false);
      setFeedback({ type: 'success', message: `Team "${target.name}" restored.` });
      if (selectedTeam?.id === target.id) {
        loadTeam(target.id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to restore team.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (targetTeam = selectedTeam) => {
    if (!targetTeam) return;
    setActionTargetTeam(targetTeam);
    setDeleteConfirmText('');
    setModalError(null);
    setIsDeleteModalOpen(true);
  };

  // Submit Delete Team
  const handleDeleteTeamSubmit = async (e) => {
    e.preventDefault();
    const target = actionTargetTeam || selectedTeam;
    if (!target) return;

    const expectedName = target.name.trim().toLowerCase();
    if (deleteConfirmText.trim().toLowerCase() !== expectedName) {
      setModalError(`Please type "${target.name}" exactly to confirm deletion.`);
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      const deletedName = target.name;
      await deleteTeam(target.id);
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      setFeedback({ type: 'success', message: `Team "${deletedName}" permanently deleted.` });
      await loadTeams();
      if (selectedTeam?.id === target.id) {
        navigate('/teams');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to delete team.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Batch Add Members Modal
  const handleOpenAddMembersModal = () => {
    setSelectedUserIdsToAdd([]);
    setAddMembersRole('MEMBER');
    setModalError(null);
    setIsAddMembersModalOpen(true);
  };

  // Toggle user selection in batch add modal
  const handleToggleUserSelect = (uid) => {
    setSelectedUserIdsToAdd((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Select all eligible members
  const handleSelectAllEligible = () => {
    if (selectedUserIdsToAdd.length === eligibleCompanyMembers.length) {
      setSelectedUserIdsToAdd([]);
    } else {
      setSelectedUserIdsToAdd(eligibleCompanyMembers.map((cm) => cm.user.id || cm.user_id));
    }
  };

  // Submit Batch Add Members
  const handleBatchAddMembersSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIdsToAdd.length === 0) {
      setModalError('Please select at least one member to add.');
      return;
    }

    setActionLoading(true);
    setModalError(null);
    try {
      await batchAddTeamMembers(selectedTeam.id, {
        user_ids: selectedUserIdsToAdd,
        role: addMembersRole,
      });
      setIsAddMembersModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Added ${selectedUserIdsToAdd.length} ${
          selectedUserIdsToAdd.length === 1 ? 'member' : 'members'
        } to ${selectedTeam.name}.`,
      });
      loadTeam(selectedTeam.id);
      loadTeamActivity(selectedTeam.id);
    } catch (err) {
      setModalError(err.message || 'Failed to add members.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Role Toggle (LEAD <-> MEMBER)
  const handleToggleRole = async (targetMember) => {
    if (!selectedTeam || !targetMember) return;
    const newRole = targetMember.role === 'LEAD' ? 'MEMBER' : 'LEAD';

    setActionLoading(true);
    try {
      await updateTeamMember(selectedTeam.id, targetMember.user_id, { role: newRole });
      setFeedback({
        type: 'success',
        message: `Updated role for ${getDisplayName(targetMember.user)} to ${newRole}.`,
      });
      loadTeam(selectedTeam.id);
      loadTeamActivity(selectedTeam.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update member role.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Remove Member Modal
  const handleOpenRemoveMemberModal = (member) => {
    setMemberToRemove(member);
    setModalError(null);
    setIsRemoveMemberModalOpen(true);
  };

  // Submit Remove Member
  const handleRemoveMemberSubmit = async () => {
    if (!selectedTeam || !memberToRemove) return;

    setActionLoading(true);
    try {
      await removeTeamMember(selectedTeam.id, memberToRemove.user_id);
      setIsRemoveMemberModalOpen(false);
      setFeedback({
        type: 'success',
        message: `Removed ${getDisplayName(memberToRemove.user)} from ${selectedTeam.name}.`,
      });
      setMemberToRemove(null);
      loadTeam(selectedTeam.id);
      loadTeamActivity(selectedTeam.id);
    } catch (err) {
      setModalError(err.message || 'Failed to remove member.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white">
      {/* Top SaaS Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Responsive Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Breadcrumb Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] font-normal">
                <span>TeamX</span>
                <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
                <span>Workspace</span>
                <ChevronRight className="h-3 w-3 text-slate-400 dark:text-[#64748B]" />
                <span className="text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-xs">
                  {selectedTeam ? selectedTeam.name : 'Teams'}
                </span>
              </div>

              {selectedTeam && (
                <button
                  type="button"
                  onClick={handleBackToTeams}
                  className="text-xs text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>All Teams</span>
                </button>
              )}
            </div>

            {/* Toast Alert */}
            {feedback && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in shadow-xs ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5 font-medium">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                <button
                  onClick={() => setFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Global Error Banner with Retry */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => loadTeams({ status: statusFilter, my_teams: myTeamsFilter })}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 1: DEDICATED TEAM DETAILS VIEW                          */}
            {/* ============================================================ */}
            {selectedTeam ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* Header Actions & Breadcrumb Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                    <button
                      type="button"
                      onClick={handleBackToTeams}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Back to Teams</span>
                    </button>
                    <span className="text-slate-300 dark:text-[#263449]">/</span>
                    <span className="text-slate-400 dark:text-[#94A3B8]">{company?.name || 'Workspace'}</span>
                    <span className="text-slate-300 dark:text-[#263449]">/</span>
                    <span className="text-slate-900 dark:text-[#F8FAFC] font-semibold truncate max-w-xs">{selectedTeam.name}</span>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    {canManageCurrentTeam && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit2}
                          onClick={() => handleOpenEditModal(selectedTeam)}
                        >
                          Edit Team
                        </Button>

                        {canManageCompany && (
                          <>
                            {selectedTeam.is_archived ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={RotateCcw}
                                onClick={() => handleOpenRestoreModal(selectedTeam)}
                              >
                                Restore Team
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={Archive}
                                onClick={() => handleOpenArchiveModal(selectedTeam)}
                              >
                                Archive Team
                              </Button>
                            )}

                            <Button
                              variant="danger"
                              size="sm"
                              icon={Trash2}
                              onClick={() => handleOpenDeleteModal(selectedTeam)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Team Hero Header Card */}
                {(() => {
                  const IconComp = getIconComponent(selectedTeam.icon);
                  const colorMeta = getColorClasses(selectedTeam.color);

                  return (
                    <Card className="p-6 sm:p-7 border border-slate-200/80 dark:border-[#263449] shadow-xs">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-3.5 max-w-3xl">
                          <div className="flex items-start gap-4">
                            <div
                              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colorMeta.bg} text-white font-bold text-xl shadow-xs shrink-0`}
                            >
                              <IconComp className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                                  {selectedTeam.name}
                                </h1>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      selectedTeam.is_archived
                                        ? 'bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449]'
                                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        selectedTeam.is_archived ? 'bg-slate-400' : 'bg-emerald-500'
                                      }`}
                                    />
                                    {selectedTeam.is_archived ? 'ARCHIVED' : 'ACTIVE'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono mt-1">
                                Workspace Team &bull; Created{' '}
                                {selectedTeam.created_at
                                  ? new Date(selectedTeam.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : '—'}
                              </p>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] leading-relaxed pt-1 max-w-2xl">
                            {selectedTeam.description || 'No description has been added for this team.'}
                          </p>
                        </div>

                        {/* Summary Metric Ribbon */}
                        <div className="flex items-center gap-6 bg-slate-50/90 dark:bg-[#1B263A]/40 p-4 sm:p-5 rounded-xl border border-slate-200/70 dark:border-[#263449] shrink-0 self-start md:self-auto">
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-slate-400 dark:text-[#94A3B8]">
                              Members
                            </span>
                            <p className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono">
                              {selectedTeam.member_count || selectedTeam.members?.length || 0}
                            </p>
                          </div>
                          <div className="h-9 w-px bg-slate-200 dark:bg-[#263449]" />
                          <div className="space-y-0.5">
                            <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-slate-400 dark:text-[#94A3B8]">
                              Team Leads
                            </span>
                            <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                              {selectedTeam.leads?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })()}

                {/* Navigation Tabs (Overview, Members, Activity) */}
                <div className="border-b border-slate-200 dark:border-[#263449] flex items-center gap-8 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'overview'
                        ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Overview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('members')}
                    className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'members'
                        ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Users2 className="h-4 w-4" />
                    <span>Members</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#1B263A] text-slate-700 dark:text-[#CBD5E1] font-mono text-[10px]">
                      {selectedTeam.members?.length || selectedTeam.member_count || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activity')}
                    className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                      activeTab === 'activity'
                        ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity</span>
                    {teamActivities.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#1B263A] text-slate-700 dark:text-[#CBD5E1] font-mono text-[10px]">
                        {teamActivities.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                    {/* Left 2 Cols: About & Leadership */}
                    <div className="lg:col-span-2 space-y-6">
                      <Card className="p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">About this team</h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                          {selectedTeam.description || 'No description provided for this team.'}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-[#263449] text-xs">
                          <div>
                            <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                              Workspace
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-[#CBD5E1] mt-0.5 block">
                              {company?.name || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                              Status
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-[#CBD5E1] mt-0.5 block">
                              {selectedTeam.is_archived ? 'Archived' : 'Active'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                              Created On
                            </span>
                            <span className="font-mono text-slate-700 dark:text-[#CBD5E1] mt-0.5 block">
                              {selectedTeam.created_at ? new Date(selectedTeam.created_at).toLocaleString() : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] block">
                              Last Updated
                            </span>
                            <span className="font-mono text-slate-700 dark:text-[#CBD5E1] mt-0.5 block">
                              {selectedTeam.updated_at ? new Date(selectedTeam.updated_at).toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>
                      </Card>

                      {/* Team Leadership Card */}
                      <Card className="p-6 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">Team Leadership</h3>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Designated team leads responsible for coordinating this team.</p>
                          </div>
                          {canManageCurrentTeam && eligibleNewLeads.length > 0 && (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={ArrowRightLeft}
                              onClick={() => handleOpenTransferLeadModal(selectedTeam)}
                            >
                              Transfer Leadership
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {(selectedTeam.leads || []).length > 0 ? (
                            selectedTeam.leads.map((lead) => (
                              <div
                                key={lead.id}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449]"
                              >
                                <Avatar user={lead} size="sm" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                      {getDisplayName(lead)}
                                    </span>
                                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate block">
                                    {lead.email}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 p-4 text-center rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] text-xs text-slate-500 dark:text-[#94A3B8]">
                              No team leads currently assigned.
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Right 1 Col: Permissions & Access Card */}
                    <div className="space-y-6">
                      <Card className="p-6 space-y-4 bg-slate-50/70 dark:bg-[#0F172A]/50 border-slate-200/80 dark:border-[#263449]">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase font-medium text-slate-400 dark:text-[#94A3B8] tracking-wider">
                            Your Access Level
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                              {userTeamAccessLevel}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-[#263449] text-xs">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-normal">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>View team details & activity</span>
                          </div>
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-normal">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>View team member list</span>
                          </div>
                          {canManageCurrentTeam ? (
                            <>
                              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-normal">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Add and remove team members</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-normal">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Assign & transfer leadership</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-normal">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Edit team identity & description</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-[#64748B]">
                              <div className="h-4 w-4 rounded-full border border-slate-300 dark:border-[#263449] flex items-center justify-center text-[10px]">✕</div>
                              <span>Member management restricted</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* TAB 2: MEMBERS */}
                {activeTab === 'members' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                          Team Members
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          People assigned to collaborate within this team.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="relative w-full sm:w-64">
                          <Search className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Search team members..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-800 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 shadow-2xs"
                          />
                        </div>

                        {canManageCurrentTeam && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={UserPlus}
                            onClick={handleOpenAddMembersModal}
                          >
                            Add Members
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Members Table */}
                    {teamDetailLoading ? (
                      <Card className="p-8 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
                        Loading team members...
                      </Card>
                    ) : filteredTeamMembers.length === 0 ? (
                      <Card className="p-10 text-center space-y-2.5">
                        <Users2 className="h-9 w-9 text-slate-300 dark:text-[#64748B] mx-auto" />
                        <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">
                          {memberSearchQuery ? 'No matching members found.' : 'No team members yet'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                          {memberSearchQuery
                            ? 'Try changing your search keywords.'
                            : 'Add people from your workspace to start collaborating with this team.'}
                        </p>
                        {canManageCurrentTeam && !memberSearchQuery && (
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={UserPlus}
                            onClick={handleOpenAddMembersModal}
                            className="mt-2"
                          >
                            Add Members
                          </Button>
                        )}
                      </Card>
                    ) : (
                      <Card className="overflow-hidden border border-slate-200/80 dark:border-[#263449] shadow-xs">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-600 dark:text-[#CBD5E1]">
                            <thead className="bg-slate-50/80 dark:bg-[#1B263A]/40 border-b border-slate-200 dark:border-[#263449] text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]">
                              <tr>
                                <th className="py-3 px-4">Member</th>
                                <th className="py-3 px-4">Email</th>
                                <th className="py-3 px-4">Role</th>
                                <th className="py-3 px-4">Joined</th>
                                {canManageCurrentTeam && (
                                  <th className="py-3 px-4 text-right">Actions</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#263449] font-normal">
                              {filteredTeamMembers.map((m) => {
                                const memberUser = m.user || {};
                                const isLead = m.role === 'LEAD';

                                return (
                                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-[#202D43]/50 transition-colors">
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar user={memberUser} size="sm" />
                                        <div>
                                          <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block">
                                            {getDisplayName(memberUser)}
                                          </span>
                                          {memberUser.username && (
                                            <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-mono">
                                              @{memberUser.username}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-[#CBD5E1]">
                                      {memberUser.email || '—'}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <Badge
                                        variant={isLead ? 'indigo' : 'neutral'}
                                        size="xs"
                                        className="font-mono font-medium"
                                      >
                                        {isLead ? '👑 LEAD' : 'MEMBER'}
                                      </Badge>
                                    </td>
                                    <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-[#94A3B8]">
                                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                                    </td>
                                    {canManageCurrentTeam && (
                                      <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => handleToggleRole(m)}
                                          >
                                            {isLead ? 'Make Member' : 'Make Lead'}
                                          </Button>
                                          <Button
                                            variant="danger"
                                            size="xs"
                                            onClick={() => handleOpenRemoveMemberModal(m)}
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-[#263449] p-2 space-y-2">
                          {filteredTeamMembers.map((m) => {
                            const memberUser = m.user || {};
                            const isLead = m.role === 'LEAD';

                            return (
                              <div key={m.id} className="p-3 bg-slate-50/50 dark:bg-[#0F172A]/50 rounded-xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <Avatar user={memberUser} size="sm" />
                                    <div>
                                      <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] text-xs block">
                                        {getDisplayName(memberUser)}
                                      </span>
                                      <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono">
                                        {memberUser.email}
                                      </span>
                                    </div>
                                  </div>
                                  <Badge variant={isLead ? 'indigo' : 'neutral'} size="xs">
                                    {isLead ? 'LEAD' : 'MEMBER'}
                                  </Badge>
                                </div>

                                {canManageCurrentTeam && (
                                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-[#263449]">
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() => handleToggleRole(m)}
                                    >
                                      {isLead ? 'Make Member' : 'Make Lead'}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="xs"
                                      onClick={() => handleOpenRemoveMemberModal(m)}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* TAB 3: REAL ACTIVITY AUDIT LOG (Clean timeline) */}
                {activeTab === 'activity' && (
                  <Card className="p-6 space-y-4 animate-fade-in border border-slate-200/80 dark:border-[#263449] shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">Activity Timeline</h3>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Audit history of actions recorded in this team.</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={RotateCcw}
                        onClick={() => loadTeamActivity(selectedTeam.id)}
                        loading={activityLoading}
                      >
                        Refresh
                      </Button>
                    </div>

                    {activityLoading ? (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-[#94A3B8]">Loading activity timeline...</div>
                    ) : teamActivities.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-[#64748B]">No recorded activity yet.</div>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-slate-200 dark:border-[#263449] space-y-4 pt-2">
                        {teamActivities.map((act) => {
                          const actor = act.actor;
                          return (
                            <div key={act.id} className="relative flex items-start gap-3 text-xs">
                              {/* Timeline dot */}
                              <div className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-[#151F32]" />
                              
                              <Avatar user={actor} size="xs" className="mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0 bg-slate-50/80 dark:bg-[#0F172A]/60 p-3 rounded-xl border border-slate-200/80 dark:border-[#263449]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                    {getDisplayName(actor) || 'System'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400 dark:text-[#94A3B8]">
                                    {act.created_at ? new Date(act.created_at).toLocaleString() : ''}
                                  </span>
                                </div>
                                <p className="text-slate-600 dark:text-[#CBD5E1] mt-1">
                                  <span className="font-mono font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] mr-1.5">
                                    {act.action}
                                  </span>
                                  {act.details || ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}

              </div>
            ) : (
              /* ============================================================ */
              /* VIEW 2: TEAMS DASHBOARD DIRECTORY                            */
              /* ============================================================ */
              <div className="space-y-6 animate-fade-in">
                
                {/* Header & Primary CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                  <div>
                    <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Teams</h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                      Organize your workspace into focused teams and collaborate around shared goals.
                    </p>
                  </div>

                  {canManageCompany && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Plus}
                      onClick={handleOpenCreateModal}
                      className="shadow-xs self-start sm:self-auto cursor-pointer"
                    >
                      Create Team
                    </Button>
                  )}
                </div>

                {/* Real Metrics Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between border-slate-200/80 dark:border-[#263449] shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                        TOTAL TEAMS
                      </span>
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1]">
                        <Users2 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] font-mono">
                        {teamStats.totalTeams}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Across your workspace</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between border-slate-200/80 dark:border-[#263449] shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                        ACTIVE TEAMS
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
                        {teamStats.activeTeams}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Currently active</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between border-slate-200/80 dark:border-[#263449] shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                        TOTAL MEMBERS
                      </span>
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1]">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] font-mono">
                        {teamStats.totalMembers}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Across all teams</p>
                    </div>
                  </Card>

                  <Card className="p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between border-slate-200/80 dark:border-[#263449] shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                        TEAM LEADS
                      </span>
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Crown className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">
                        {teamStats.totalLeads}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Assigned team leads</p>
                    </div>
                  </Card>
                </div>

                {/* Unified Filter & Search Toolbar */}
                <div className="bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-[#0F172A] rounded-lg text-xs font-medium self-start md:self-auto overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('all');
                        setMyTeamsFilter(false);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === 'all' && !myTeamsFilter
                          ? 'bg-white dark:bg-[#151F32] text-slate-900 dark:text-[#F8FAFC] shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      All Teams
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMyTeamsFilter(true);
                        setStatusFilter('all');
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        myTeamsFilter
                          ? 'bg-white dark:bg-[#151F32] text-indigo-700 dark:text-indigo-400 shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      My Teams
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('active');
                        setMyTeamsFilter(false);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === 'active' && !myTeamsFilter
                          ? 'bg-white dark:bg-[#151F32] text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('archived');
                        setMyTeamsFilter(false);
                      }}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === 'archived' && !myTeamsFilter
                          ? 'bg-white dark:bg-[#151F32] text-slate-800 dark:text-[#CBD5E1] shadow-2xs font-semibold'
                          : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      Archived
                    </button>
                  </div>

                  {/* Search & Sort Controls */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teams..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449] rounded-xl text-slate-800 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0F172A] border border-slate-200/80 dark:border-[#263449] rounded-xl text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="recent">Recently Created</option>
                      <option value="members">Most Members</option>
                    </select>
                  </div>
                </div>

                {/* Teams Grid / Loading / Empty States */}
                {loading ? (
                  /* Skeleton Loading State */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-6 space-y-4 border-slate-200/80 dark:border-[#263449]">
                        <div className="flex items-center justify-between">
                          <div className="h-10 w-10 bg-slate-200 dark:bg-[#182235] rounded-xl skeleton-shimmer" />
                          <div className="h-5 w-16 bg-slate-200 dark:bg-[#182235] rounded-full skeleton-shimmer" />
                        </div>
                        <div className="space-y-2 pt-1">
                          <div className="h-4 w-3/5 bg-slate-200 dark:bg-[#182235] rounded skeleton-shimmer" />
                          <div className="h-3 w-full bg-slate-200 dark:bg-[#182235] rounded skeleton-shimmer" />
                        </div>
                        <div className="h-6 w-24 bg-slate-200 dark:bg-[#182235] rounded-full pt-2 skeleton-shimmer" />
                        <div className="pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between">
                          <div className="h-4 w-20 bg-slate-200 dark:bg-[#182235] rounded skeleton-shimmer" />
                          <div className="h-7 w-20 bg-slate-200 dark:bg-[#182235] rounded-xl skeleton-shimmer" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : filteredTeams.length === 0 ? (
                  /* Context-Aware Empty State */
                  <Card className="p-12 text-center space-y-3.5 border-dashed border border-slate-300/80 dark:border-[#263449] bg-white dark:bg-[#151F32]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 mx-auto">
                      <Users2 className="h-6 w-6" />
                    </div>
                    
                    {searchQuery ? (
                      <>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">No teams found</h3>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                          We couldn't find any teams matching <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">"{searchQuery}"</span>.
                        </p>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setSearchQuery('')}
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      </>
                    ) : statusFilter === 'archived' ? (
                      <>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">No archived teams</h3>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                          Archived teams will appear here when you archive them.
                        </p>
                      </>
                    ) : myTeamsFilter ? (
                      <>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">You haven't joined any teams yet</h3>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                          When you are added to a team by an administrator or lead, it will appear here.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">No teams yet</h3>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                          Create a team to organize your workspace and collaborate with your members.
                        </p>
                        {canManageCompany && (
                          <div className="pt-2">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Plus}
                              onClick={handleOpenCreateModal}
                            >
                              Create Team
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                ) : (
                  /* Redesigned Premium Team Cards Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTeams.map((team) => {
                      const IconComp = getIconComponent(team.icon);
                      const colorMeta = getColorClasses(team.color);
                      const leads = team.leads || [];
                      const primaryLead = leads[0];
                      const membersPreview = team.members_preview || [];
                      const isMenuOpen = activeMenuTeamId === team.id;

                      const isTeamLeadForThisTeam = leads.some((l) => l.id === user?.id);
                      const canManageThisTeam = canManageCompany || isTeamLeadForThisTeam;
                      const canArchiveOrDelete = canManageCompany;

                      return (
                        <Card
                          key={team.id}
                          className={`p-5 sm:p-6 flex flex-col justify-between border-slate-200/80 dark:border-[#263449] hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all group relative cursor-pointer ${
                            team.is_archived ? 'opacity-75 bg-slate-50/60 dark:bg-[#151F32]/60' : 'bg-white dark:bg-[#151F32]'
                          }`}
                          onClick={() => handleOpenTeam(team.id)}
                        >
                          <div className="space-y-4">
                            {/* Top Row: Visual Avatar + Status Badge + Action Menu */}
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMeta.bg} text-white font-bold text-sm shadow-2xs shrink-0`}
                              >
                                <IconComp className="h-5 w-5" />
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    team.is_archived
                                      ? 'bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449]'
                                      : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      team.is_archived ? 'bg-slate-400' : 'bg-emerald-500'
                                    }`}
                                  />
                                  {team.is_archived ? 'Archived' : 'Active'}
                                </span>

                                {/* Action Menu (Three-dot) */}
                                <div className="relative team-action-menu-container">
                                  <button
                                    type="button"
                                    aria-label="Team actions"
                                    aria-expanded={isMenuOpen}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuTeamId(isMenuOpen ? null : team.id);
                                    }}
                                    className="p-1 text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202D43] rounded-lg transition-colors cursor-pointer focus:outline-none"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>

                                  {/* Dropdown Action Menu */}
                                  {isMenuOpen && (
                                    <div
                                      className="absolute right-0 top-8 z-30 w-52 bg-white dark:bg-[#1B263A] border border-slate-200/80 dark:border-[#263449] rounded-xl shadow-xl p-1.5 text-xs animate-scale-in divide-y divide-slate-100 dark:divide-[#263449]"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="py-0.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveMenuTeamId(null);
                                            handleOpenTeam(team.id, 'overview');
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                        >
                                          <Eye className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                          <span>View Team</span>
                                        </button>

                                        {canManageThisTeam && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuTeamId(null);
                                                handleOpenEditModal(team);
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                            >
                                              <Edit2 className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                              <span>Edit Team</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuTeamId(null);
                                                handleOpenTeam(team.id, 'members');
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                            >
                                              <Users2 className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                              <span>Manage Members</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuTeamId(null);
                                                handleOpenTransferLeadModal(team);
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                            >
                                              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                              <span>Transfer Leadership</span>
                                            </button>
                                          </>
                                        )}
                                      </div>

                                      {canArchiveOrDelete && (
                                        <div className="py-0.5">
                                          {team.is_archived ? (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuTeamId(null);
                                                handleOpenRestoreModal(team);
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                            >
                                              <RotateCcw className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                              <span>Restore Team</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveMenuTeamId(null);
                                                handleOpenArchiveModal(team);
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#202D43] rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                            >
                                              <Archive className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                              <span>Archive Team</span>
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveMenuTeamId(null);
                                              handleOpenDeleteModal(team);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                            <span>Delete Team</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Team Name & Description */}
                            <div className="space-y-1">
                              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F8FAFC] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                                {team.name}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2 min-h-[32px] leading-relaxed">
                                {team.description || 'No description provided.'}
                              </p>
                            </div>

                            {/* Metrics Row: Members Count & Team Lead */}
                            <div className="pt-2 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs">
                              {/* Member Information */}
                              <div className="flex items-center gap-2 min-w-0">
                                {membersPreview.length > 0 ? (
                                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                                    {membersPreview.slice(0, 3).map((m, idx) => (
                                      <Avatar
                                        key={m.id || idx}
                                        user={m}
                                        size="xs"
                                        className="ring-2 ring-white dark:ring-[#151F32]"
                                      />
                                    ))}
                                    {team.member_count > 3 && (
                                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-[#1B263A] border border-slate-200 dark:border-[#263449] text-[9px] font-mono text-slate-600 dark:text-[#CBD5E1] font-medium ring-2 ring-white dark:ring-[#151F32]">
                                        +{team.member_count - 3}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Users2 className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                                )}
                                <span className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1] font-mono">
                                  {team.member_count || 1} {team.member_count === 1 ? 'member' : 'members'}
                                </span>
                              </div>

                              {/* Lead Information */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {primaryLead ? (
                                  <>
                                    <Avatar user={primaryLead} size="xs" />
                                    <span className="font-medium text-slate-800 dark:text-[#CBD5E1] truncate max-w-[100px]">
                                      {getDisplayName(primaryLead)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 dark:text-[#64748B] font-mono text-[11px]">
                                    No lead
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer: Created Date & View CTA */}
                          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#94A3B8] font-mono text-[11px]">
                              <Clock className="h-3 w-3 text-slate-400 dark:text-[#94A3B8] shrink-0" />
                              <span>
                                {team.created_at
                                  ? new Date(team.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : '—'}
                              </span>
                            </div>

                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Open team</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CREATE TEAM MODAL (WITH LIVE CARD PREVIEW)          */}
      {/* ============================================================ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create a team"
        description="Set up a new collaboration group with custom visual branding."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateTeamSubmit}
              loading={actionLoading}
            >
              {actionLoading ? 'Creating team...' : 'Create team'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTeamSubmit} className="space-y-5 text-xs">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Col: Form Inputs */}
            <div className="space-y-4">
              <Input
                label="Team name *"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="e.g. Engineering, Automation, Design"
                required
                autoFocus
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Description</label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                  placeholder="What does this team focus on?"
                  rows={2}
                  className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-800 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                />
              </div>

              {/* Visual Identity: Icon Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Team Icon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ICON_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = teamForm.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTeamForm({ ...teamForm, icon: item.id })}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium'
                            : 'border-slate-200 dark:border-[#263449] bg-white dark:bg-[#0F172A] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] truncate max-w-full">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Identity: Color Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Team Color</label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setTeamForm({ ...teamForm, color: c.id })}
                      className={`h-7 w-7 rounded-full ${c.bg} flex items-center justify-center text-white transition-transform cursor-pointer ${
                        teamForm.color === c.id ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      {teamForm.color === c.id && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Live Interactive Card Preview */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] block">
                Card Preview
              </span>
              {(() => {
                const PreviewIcon = getIconComponent(teamForm.icon);
                const previewColor = getColorClasses(teamForm.color);

                return (
                  <div className="p-5 rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs space-y-3.5">
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${previewColor.bg} text-white font-bold text-sm shadow-2xs`}
                      >
                        <PreviewIcon className="h-5 w-5" />
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                        {teamForm.name.trim() || 'Team Name'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
                        {teamForm.description.trim() || 'Team description will be shown here.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs text-slate-600 dark:text-[#CBD5E1]">
                      <span>1 member (Creator)</span>
                      <span className="font-mono text-slate-400 dark:text-[#94A3B8] text-[11px]">Just now</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: EDIT TEAM MODAL                                     */}
      {/* ============================================================ */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Team"
        description="Update team name, description, and visual identity."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEditTeamSubmit}
              loading={actionLoading}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditTeamSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
              {modalError}
            </div>
          )}

          <Input
            label="Team name *"
            value={editTeamForm.name}
            onChange={(e) => setEditTeamForm({ ...editTeamForm, name: e.target.value })}
            placeholder="Team name"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Description</label>
            <textarea
              value={editTeamForm.description}
              onChange={(e) => setEditTeamForm({ ...editTeamForm, description: e.target.value })}
              rows={3}
              className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-800 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Team Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = editTeamForm.icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setEditTeamForm({ ...editTeamForm, icon: item.id })}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-slate-200 dark:border-[#263449] bg-white dark:bg-[#0F172A] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Team Color</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setEditTeamForm({ ...editTeamForm, color: c.id })}
                  className={`h-7 w-7 rounded-full ${c.bg} flex items-center justify-center text-white transition-transform cursor-pointer ${
                    editTeamForm.color === c.id ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                  }`}
                  title={c.label}
                >
                  {editTeamForm.color === c.id && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: BATCH ADD MEMBERS MODAL                             */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddMembersModalOpen}
        onClose={() => setIsAddMembersModalOpen(false)}
        title={`Add Members to ${selectedTeam?.name || 'Team'}`}
        description="Select colleagues from your workspace to join this team."
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddMembersModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchAddMembersSubmit}
              loading={actionLoading}
              disabled={selectedUserIdsToAdd.length === 0}
            >
              {selectedUserIdsToAdd.length > 0
                ? `Add ${selectedUserIdsToAdd.length} ${selectedUserIdsToAdd.length === 1 ? 'member' : 'members'}`
                : 'Add members'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleBatchAddMembersSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
              {modalError}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">Eligible Workspace Members</span>
            {eligibleCompanyMembers.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllEligible}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium cursor-pointer"
              >
                {selectedUserIdsToAdd.length === eligibleCompanyMembers.length
                  ? 'Deselect all'
                  : 'Select all'}
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-[#263449] rounded-xl divide-y divide-slate-100 dark:divide-[#263449] bg-slate-50/50 dark:bg-[#0F172A]/50">
            {eligibleCompanyMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
                All workspace members are already part of this team.
              </div>
            ) : (
              eligibleCompanyMembers.map((cm) => {
                const memberUser = cm.user || cm;
                const uid = memberUser.id || cm.user_id;
                const isSelected = selectedUserIdsToAdd.includes(uid);

                return (
                  <label
                    key={uid}
                    className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-100/60 dark:hover:bg-[#202D43]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleUserSelect(uid)}
                        className="rounded border-slate-300 dark:border-[#263449] text-indigo-600 focus:ring-indigo-500"
                      />
                      <Avatar user={memberUser} size="sm" />
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                          {getDisplayName(memberUser)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono block truncate">
                          {memberUser.email}
                        </span>
                      </div>
                    </div>

                    <Badge variant="neutral" size="xs" className="shrink-0">
                      {cm.role || 'MEMBER'}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Role to Assign</label>
            <select
              value={addMembersRole}
              onChange={(e) => setAddMembersRole(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] rounded-xl text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:border-indigo-500"
            >
              <option value="MEMBER">Team Member</option>
              <option value="LEAD">Team Lead</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 4: TRANSFER LEADERSHIP MODAL                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isTransferLeadModalOpen}
        onClose={() => setIsTransferLeadModalOpen(false)}
        title="Transfer Team Leadership"
        description={`Choose a member to become the new lead of ${(actionTargetTeam || selectedTeam)?.name}.`}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTransferLeadModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTransferLeadSubmit}
              loading={actionLoading}
              disabled={!targetNewLeadId}
            >
              Transfer Leadership
            </Button>
          </>
        }
      >
        <form onSubmit={handleTransferLeadSubmit} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
              {modalError}
            </div>
          )}

          {targetTeamMembersLoading ? (
            <div className="py-6 text-center text-slate-500 dark:text-[#94A3B8]">Loading team members...</div>
          ) : eligibleNewLeads.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A] text-center text-slate-500 dark:text-[#94A3B8]">
              All current team members are already assigned as leads. Add more members first.
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">Select New Team Lead</label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-[#263449] rounded-xl divide-y divide-slate-100 dark:divide-[#263449] bg-slate-50/50 dark:bg-[#0F172A]/50">
                {eligibleNewLeads.map((m) => {
                  const u = m.user || {};
                  const isSelected = targetNewLeadId === m.user_id;

                  return (
                    <label
                      key={m.id || m.user_id}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-100/60 dark:hover:bg-[#202D43]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="newLead"
                          value={m.user_id}
                          checked={isSelected}
                          onChange={() => setTargetNewLeadId(m.user_id)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                            {getDisplayName(u)}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono block truncate">
                            {u.email}
                          </span>
                        </div>
                      </div>
                      <Badge variant="neutral" size="xs">
                        Member
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 5: ARCHIVE TEAM CONFIRMATION                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Team"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsArchiveModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={handleArchiveTeamSubmit}
              loading={actionLoading}
            >
              Archive Team
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-[#CBD5E1]">
          <p>
            Are you sure you want to archive <strong className="text-slate-900 dark:text-[#F8FAFC]">"{(actionTargetTeam || selectedTeam)?.name}"</strong>?
          </p>
          <p className="text-slate-500 dark:text-[#94A3B8]">
            Archiving a team hides it from default directory views. Team history, members, and audit logs are preserved and can be restored at any time.
          </p>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 6: RESTORE TEAM CONFIRMATION                           */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Restore Team"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRestoreModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRestoreTeamSubmit}
              loading={actionLoading}
            >
              Restore Team
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-[#CBD5E1]">
          <p>
            Restore <strong className="text-slate-900 dark:text-[#F8FAFC]">"{(actionTargetTeam || selectedTeam)?.name}"</strong> to active status?
          </p>
          <p className="text-slate-500 dark:text-[#94A3B8]">
            The team will once again be visible in all standard workspace directories and workflows.
          </p>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 7: PERMANENT DELETE CONFIRMATION                       */}
      {/* ============================================================ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Team Permanently"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              size="sm"
              onClick={handleDeleteTeamSubmit}
              loading={actionLoading}
              disabled={deleteConfirmText.trim().toLowerCase() !== (actionTargetTeam || selectedTeam)?.name?.trim()?.toLowerCase()}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <form onSubmit={handleDeleteTeamSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900 dark:text-rose-200">
              <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <span>Permanent Deletion Warning</span>
            </div>
            <p className="leading-relaxed">
              This action cannot be undone. All membership associations and team settings for{' '}
              <strong>"{(actionTargetTeam || selectedTeam)?.name}"</strong> will be permanently deleted.
            </p>
          </div>

          {modalError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
              {modalError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">
              Type <strong className="text-slate-900 dark:text-[#F8FAFC]">"{(actionTargetTeam || selectedTeam)?.name}"</strong> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={(actionTargetTeam || selectedTeam)?.name}
              required
            />
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 8: REMOVE MEMBER CONFIRMATION                          */}
      {/* ============================================================ */}
      <Modal
        isOpen={isRemoveMemberModalOpen}
        onClose={() => setIsRemoveMemberModalOpen(false)}
        title="Remove Member from Team"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRemoveMemberModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger-solid"
              size="sm"
              onClick={handleRemoveMemberSubmit}
              loading={actionLoading}
            >
              Remove Member
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-600 dark:text-[#CBD5E1]">
          <p>
            Are you sure you want to remove <strong className="text-slate-900 dark:text-[#F8FAFC]">{getDisplayName(memberToRemove?.user)}</strong> from {selectedTeam?.name}?
          </p>
          <p className="text-slate-500 dark:text-[#94A3B8]">
            This user will lose access to team resources. They will remain a member of the company workspace.
          </p>
        </div>
      </Modal>

    </div>
  );
};

export default Teams;
