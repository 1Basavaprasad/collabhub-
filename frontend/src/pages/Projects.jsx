import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useProject } from '../context/ProjectContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Avatar, { getDisplayName } from '../components/Avatar';
import { useToast } from '../components/Toast';
import { useTask } from '../context/TaskContext';
import KanbanBoard from '../components/kanban/KanbanBoard';
import { getCompanyTeamsApi } from '../api/teamApi';
import { getCompanyMembersApi } from '../api/companyApi';
import { getProjectActivityApi } from '../api/projectApi';
import {
  FolderKanban,
  Plus,
  Search,
  ArrowLeft,
  Shield,
  Trash2,
  Edit2,
  AlertTriangle,
  Building2,
  ChevronRight,
  MoreVertical,
  Check,
  Archive,
  RotateCcw,
  Sparkles,
  Code2,
  Terminal,
  Zap,
  Briefcase,
  Layers,
  Rocket,
  Compass,
  Cpu,
  Target,
  Clock,
  Eye,
  X,
  CheckSquare,
  User,
  Calendar,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  ShieldCheck,
  Info,
  LayoutDashboard,
  Kanban,
  Activity,
  CheckCircle2,
  Flag,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react';

// Visual Identity Icon Map
const ICON_OPTIONS = [
  { id: 'folder-kanban', label: 'Kanban', icon: FolderKanban },
  { id: 'layers', label: 'Architecture', icon: Layers },
  { id: 'code', label: 'Engineering', icon: Code2 },
  { id: 'rocket', label: 'Launch', icon: Rocket },
  { id: 'sparkles', label: 'Product', icon: Sparkles },
  { id: 'zap', label: 'Automation', icon: Zap },
  { id: 'terminal', label: 'DevOps', icon: Terminal },
  { id: 'briefcase', label: 'Business', icon: Briefcase },
  { id: 'shield', label: 'Security', icon: Shield },
  { id: 'compass', label: 'Strategy', icon: Compass },
  { id: 'cpu', label: 'Core / AI', icon: Cpu },
  { id: 'target', label: 'Milestone', icon: Target },
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
  return item ? item.icon : FolderKanban;
};

const getColorClasses = (colorId) => {
  const item = COLOR_OPTIONS.find((c) => c.id === colorId);
  return item || COLOR_OPTIONS[0];
};

const formatActivityTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getActivityGroupKey = (dateStr) => {
  if (!dateStr) return 'Earlier';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Earlier';
  const now = new Date();

  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const getActivityIconConfig = (action) => {
  switch (action) {
    case 'TASK_CREATED':
      return {
        icon: Plus,
        bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/40',
      };
    case 'TASK_ASSIGNED':
      return {
        icon: UserPlus,
        bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/40',
      };
    case 'TASK_UNASSIGNED':
      return {
        icon: UserMinus,
        bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40',
      };
    case 'TASK_STATUS_CHANGED':
      return {
        icon: ArrowRightLeft,
        bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/40',
      };
    case 'TASK_COMPLETED':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40',
      };
    case 'TASK_PRIORITY_CHANGED':
      return {
        icon: Flag,
        bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40',
      };
    case 'TASK_DUE_DATE_CHANGED':
      return {
        icon: Calendar,
        bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/40',
      };
    case 'TASK_UPDATED':
      return {
        icon: Edit2,
        bg: 'bg-slate-100 dark:bg-[#1B283F] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#263449]',
      };
    case 'TASK_DELETED':
      return {
        icon: Trash2,
        bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/40',
      };
    default:
      return {
        icon: Activity,
        bg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/40',
      };
  }
};

const Projects = () => {
  const { projectId: routeProjectId } = useParams();
  const navigate = useNavigate();
  const mainScrollRef = useRef(null);
  const { addToast } = useToast();

  const { user } = useAuth();
  const { company, canManageCompany, currentUserRole } = useCompany();
  const {
    projects,
    selectedProject,
    projectTeams,
    projectMembers,
    effectiveMembers,
    loading,
    projectDetailLoading,
    teamsLoading,
    membersLoading,
    error,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    addProjectTeam,
    removeProjectTeam,
    addProjectMember,
    removeProjectMember,
    setSelectedProject,
  } = useProject();

  // App Layout Shell State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | archived

  // Project Detail Tab State ('tasks' | 'overview' | 'people' | 'activity')
  const [activeProjectTab, setActiveProjectTab] = useState('tasks');

  // Task Context
  const { tasks, loadTasks } = useTask();

  // Action Menu State
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);

  // Modals State for Projects
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Modals State for Teams & Members
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [removeTeamModalOpen, setRemoveTeamModalOpen] = useState(false);
  const [removeMemberModalOpen, setRemoveMemberModalOpen] = useState(false);

  // Target Entities for Modals
  const [targetProject, setTargetProject] = useState(null);
  const [targetTeamToRemove, setTargetTeamToRemove] = useState(null);
  const [targetMemberToRemove, setTargetMemberToRemove] = useState(null);

  const [selectedTeamToAdd, setSelectedTeamToAdd] = useState(null);
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState(null);

  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const [teamSubmitting, setTeamSubmitting] = useState(false);
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const [availableCompanyTeams, setAvailableCompanyTeams] = useState([]);
  const [availableCompanyMembers, setAvailableCompanyMembers] = useState([]);
  const [loadingAvailableTeams, setLoadingAvailableTeams] = useState(false);
  const [loadingAvailableMembers, setLoadingAvailableMembers] = useState(false);

  // Details Page Filter State
  const [memberListSearch, setMemberListSearch] = useState('');
  const [teamListSearch, setTeamListSearch] = useState('');

  // Form State for Create / Edit Project
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'folder-kanban',
    color: 'indigo',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Permission Check: Owner or Admin can manage projects and members
  const canManageProjects = useMemo(() => {
    return canManageCompany || currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  }, [canManageCompany, currentUserRole]);

  // Project Activity State
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);

  const fetchProjectActivities = useCallback(async (projId) => {
    const targetId = projId || selectedProject?.id || routeProjectId;
    if (!company?.id || !targetId) return;
    setActivitiesLoading(true);
    setActivitiesError(null);
    try {
      const res = await getProjectActivityApi(company.id, targetId, { limit: 100 });
      setActivities(res?.items || []);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to load project activity timeline.';
      setActivitiesError(msg);
    } finally {
      setActivitiesLoading(false);
    }
  }, [company?.id, selectedProject?.id, routeProjectId]);

  // Load activity when tab changes to activity or routeProjectId changes
  useEffect(() => {
    if (activeProjectTab === 'activity' && (selectedProject?.id || routeProjectId)) {
      fetchProjectActivities(selectedProject?.id || routeProjectId);
    }
  }, [activeProjectTab, selectedProject?.id, routeProjectId, fetchProjectActivities]);

  // Load single project details and tasks when route parameter is present
  useEffect(() => {
    if (routeProjectId) {
      loadProject(routeProjectId);
      if (company?.id) {
        loadTasks(company.id, routeProjectId);
      }
    } else {
      setSelectedProject(null);
    }
  }, [routeProjectId, company?.id, loadProject, loadTasks, setSelectedProject]);

  // Scroll to top on view changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo(0, 0);
    }
  }, [routeProjectId]);

  // Close action menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpenId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Compute summary stats
  const projectStats = useMemo(() => {
    if (!Array.isArray(projects)) {
      return { total: 0, active: 0, archived: 0 };
    }
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'ACTIVE').length;
    const archived = projects.filter((p) => p.status === 'ARCHIVED').length;
    return { total, active, archived };
  }, [projects]);

  // Filter projects by search and status tab
  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) return [];
    return projects.filter((p) => {
      if (!p) return false;
      // Status filter
      if (statusFilter === 'active' && p.status !== 'ACTIVE') return false;
      if (statusFilter === 'archived' && p.status !== 'ARCHIVED') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const descMatch = (p.description || '').toLowerCase().includes(q);
        if (!nameMatch && !descMatch) return false;
      }

      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  // Filtered people with project access for Project Detail view
  const displayMembers = useMemo(() => {
    if (!Array.isArray(effectiveMembers)) return [];
    if (!memberListSearch.trim()) return effectiveMembers;
    const q = memberListSearch.toLowerCase().trim();
    return effectiveMembers.filter((m) => {
      const nameMatch = (m.full_name || '').toLowerCase().includes(q);
      const usernameMatch = (m.username || '').toLowerCase().includes(q);
      const emailMatch = (m.email || '').toLowerCase().includes(q);
      const desigMatch = (m.designation || '').toLowerCase().includes(q);
      const teamMatch = (m.team_names || []).some((tn) => tn.toLowerCase().includes(q));
      return nameMatch || usernameMatch || emailMatch || desigMatch || teamMatch;
    });
  }, [effectiveMembers, memberListSearch]);

  // Filtered assigned teams for Project Detail view
  const displayTeams = useMemo(() => {
    return projectTeams.filter((pt) => {
      if (!teamListSearch.trim()) return true;
      const q = teamListSearch.toLowerCase().trim();
      const teamName = (pt.team?.name || '').toLowerCase();
      const teamDesc = (pt.team?.description || '').toLowerCase();
      return teamName.includes(q) || teamDesc.includes(q);
    });
  }, [projectTeams, teamListSearch]);

  // Filtered available company teams for Add Team Modal
  const filteredAvailableTeams = useMemo(() => {
    return availableCompanyTeams.filter((team) => {
      if (!teamSearchQuery.trim()) return true;
      const q = teamSearchQuery.toLowerCase().trim();
      return (
        (team.name || '').toLowerCase().includes(q) ||
        (team.description || '').toLowerCase().includes(q)
      );
    });
  }, [availableCompanyTeams, teamSearchQuery]);

  // Filtered available company members for Add Member Modal
  const filteredAvailableMembers = useMemo(() => {
    return availableCompanyMembers.filter((cm) => {
      const userObj = cm.user || cm;
      if (!memberSearchQuery.trim()) return true;
      const q = memberSearchQuery.toLowerCase().trim();
      const nameMatch = (userObj.full_name || '').toLowerCase().includes(q);
      const emailMatch = (userObj.email || '').toLowerCase().includes(q);
      const usernameMatch = (userObj.username || '').toLowerCase().includes(q);
      const desigMatch = (cm.designation || '').toLowerCase().includes(q);
      const deptMatch = (cm.department || '').toLowerCase().includes(q);
      return nameMatch || emailMatch || usernameMatch || desigMatch || deptMatch;
    });
  }, [availableCompanyMembers, memberSearchQuery]);

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Project name is required.';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Project name must be at least 2 characters.';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Project name cannot exceed 100 characters.';
    }
    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'folder-kanban',
      color: 'indigo',
    });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (project) => {
    setTargetProject(project);
    setFormData({
      name: project.name || '',
      description: project.description || '',
      icon: project.icon || 'folder-kanban',
      color: project.color || 'indigo',
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  // Submit Create Project
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (formSubmitting) return;
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormErrors({});
    try {
      const created = await createProject(formData);
      addToast({
        type: 'success',
        title: 'Project Created',
        message: `Project "${created.name}" has been created successfully.`,
      });
      setCreateModalOpen(false);
      setFormData({
        name: '',
        description: '',
        icon: 'folder-kanban',
        color: 'indigo',
      });
      setFormErrors({});
    } catch (err) {
      setFormErrors({ server: err.message });
      addToast({
        type: 'error',
        title: 'Failed to Create Project',
        message: err.message,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Project
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (formSubmitting) return;
    if (!targetProject || !validateForm()) return;

    setFormSubmitting(true);
    setFormErrors({});
    try {
      const updated = await updateProject(targetProject.id, formData);
      addToast({
        type: 'success',
        title: 'Project Updated',
        message: `Project "${updated.name}" has been updated.`,
      });
      setEditModalOpen(false);
      setTargetProject(null);
      setFormErrors({});
    } catch (err) {
      setFormErrors({ server: err.message });
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Archive Project
  const handleArchiveConfirm = async () => {
    if (!targetProject) return;
    setFormSubmitting(true);
    try {
      await archiveProject(targetProject.id);
      addToast({
        type: 'success',
        title: 'Project Archived',
        message: `Project "${targetProject.name}" has been archived.`,
      });
      setArchiveModalOpen(false);
      setTargetProject(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Archive Failed',
        message: err.message,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Restore Project
  const handleRestoreConfirm = async () => {
    if (!targetProject) return;
    setFormSubmitting(true);
    try {
      await restoreProject(targetProject.id);
      addToast({
        type: 'success',
        title: 'Project Restored',
        message: `Project "${targetProject.name}" is now active.`,
      });
      setRestoreModalOpen(false);
      setTargetProject(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Restore Failed',
        message: err.message,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Project
  const handleDeleteConfirm = async () => {
    if (!targetProject) return;
    setFormSubmitting(true);
    try {
      await deleteProject(targetProject.id);
      addToast({
        type: 'success',
        title: 'Project Deleted',
        message: `Project "${targetProject.name}" was permanently removed.`,
      });
      setDeleteModalOpen(false);
      setTargetProject(null);
      if (routeProjectId) {
        navigate('/projects');
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Add Team Modal & Load Available Company Teams
  const handleOpenAddTeamModal = async () => {
    if (!company?.id) return;
    setTeamSearchQuery('');
    setSelectedTeamToAdd(null);
    setAddTeamModalOpen(true);
    setLoadingAvailableTeams(true);
    try {
      const teamsData = await getCompanyTeamsApi(company.id, { limit: 100 });
      const list = Array.isArray(teamsData) ? teamsData : (teamsData?.items || []);
      setAvailableCompanyTeams(list);
    } catch (err) {
      console.error('Failed to load available teams:', err);
      addToast({
        type: 'error',
        title: 'Unable to Load Teams',
        message: 'Failed to fetch company teams.',
      });
    } finally {
      setLoadingAvailableTeams(false);
    }
  };

  // Open Add Member Modal & Load Available Company Members
  const handleOpenAddMemberModal = async () => {
    if (!company?.id) return;
    setMemberSearchQuery('');
    setSelectedMemberToAdd(null);
    setAddMemberModalOpen(true);
    setLoadingAvailableMembers(true);
    try {
      const membersData = await getCompanyMembersApi(company.id, { limit: 100 });
      const list = Array.isArray(membersData) ? membersData : (membersData?.items || []);
      setAvailableCompanyMembers(list);
    } catch (err) {
      console.error('Failed to load available members:', err);
      addToast({
        type: 'error',
        title: 'Unable to Load Members',
        message: 'Failed to fetch company members.',
      });
    } finally {
      setLoadingAvailableMembers(false);
    }
  };

  // Submit Add Team
  const handleAddTeamSubmit = async (e) => {
    if (e) e.preventDefault();
    if (teamSubmitting || !selectedTeamToAdd || !routeProjectId) return;

    setTeamSubmitting(true);
    try {
      await addProjectTeam(routeProjectId, selectedTeamToAdd.id);
      addToast({
        type: 'success',
        title: 'Team Assigned',
        message: `Team "${selectedTeamToAdd.name}" assigned to project successfully.`,
      });
      setAddTeamModalOpen(false);
      setSelectedTeamToAdd(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Assign Team',
        message: err.message || 'Unable to assign team to this project.',
      });
    } finally {
      setTeamSubmitting(false);
    }
  };

  // Submit Add Member
  const handleAddMemberSubmit = async (e) => {
    if (e) e.preventDefault();
    if (memberSubmitting || !selectedMemberToAdd || !routeProjectId) return;

    setMemberSubmitting(true);
    try {
      const targetUserId = selectedMemberToAdd.user_id || selectedMemberToAdd.id;
      await addProjectMember(routeProjectId, targetUserId);
      const displayName = selectedMemberToAdd.user
        ? getDisplayName(selectedMemberToAdd.user)
        : (selectedMemberToAdd.full_name || selectedMemberToAdd.username || 'Member');
      addToast({
        type: 'success',
        title: 'Person Added',
        message: `"${displayName}" was granted direct access to this project.`,
      });
      setAddMemberModalOpen(false);
      setSelectedMemberToAdd(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Add Person',
        message: err.message || 'Unable to add person to this project.',
      });
    } finally {
      setMemberSubmitting(false);
    }
  };

  // Confirm Remove Team
  const handleRemoveTeamConfirm = async () => {
    if (!targetTeamToRemove || !routeProjectId || teamSubmitting) return;
    setTeamSubmitting(true);
    try {
      const teamId = targetTeamToRemove.team_id || targetTeamToRemove.id;
      const teamName = targetTeamToRemove.team?.name || targetTeamToRemove.name || 'Team';
      await removeProjectTeam(routeProjectId, teamId);
      addToast({
        type: 'success',
        title: 'Team Removed',
        message: `Team "${teamName}" was removed from this project.`,
      });
      setRemoveTeamModalOpen(false);
      setTargetTeamToRemove(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Remove Team',
        message: err.message || 'Unable to remove team from project.',
      });
    } finally {
      setTeamSubmitting(false);
    }
  };

  // Confirm Remove Member
  const handleRemoveMemberConfirm = async () => {
    if (!targetMemberToRemove || !routeProjectId || memberSubmitting) return;
    setMemberSubmitting(true);
    try {
      const userId = targetMemberToRemove.id || targetMemberToRemove.user_id;
      const memberName = targetMemberToRemove.full_name || targetMemberToRemove.username || 'Member';
      await removeProjectMember(routeProjectId, userId);
      addToast({
        type: 'success',
        title: 'Person Removed',
        message: `Direct access for "${memberName}" was removed.`,
      });
      setRemoveMemberModalOpen(false);
      setTargetMemberToRemove(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Remove Person',
        message: err.message || 'Unable to remove direct access.',
      });
    } finally {
      setMemberSubmitting(false);
    }
  };

  // Format Dates
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ============================================================
  // RENDER: SINGLE PROJECT DETAILS VIEW (/projects/:projectId)
  // ============================================================
  if (routeProjectId) {
    const activeProject = selectedProject;
    const IconComp = getIconComponent(activeProject?.icon);
    const colorClasses = getColorClasses(activeProject?.color);

    return (
      <div className="h-screen bg-[#F4F6FA] dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] overflow-hidden selection:bg-indigo-500 selection:text-white">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main ref={mainScrollRef} className="flex-1 overflow-y-auto min-w-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-3.5">
              {/* Top Navigation & Breadcrumb */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Projects</span>
                </button>

                <div className="flex items-center gap-1.5 text-slate-400 dark:text-[#64748B]">
                  <span>Projects</span>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span className="font-medium text-slate-700 dark:text-[#CBD5E1] truncate max-w-xs">
                    {activeProject?.name || 'Project Details'}
                  </span>
                </div>
              </div>

              {projectDetailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2.5">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Loading project details...</p>
                </div>
              ) : !activeProject ? (
                <Card className="p-10 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mb-3">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">Project Not Found</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8] max-w-md mx-auto">
                    The requested project does not exist or has been removed from this workspace.
                  </p>
                  <Button
                    variant="primary"
                    size="xs"
                    className="mt-4"
                    onClick={() => navigate('/projects')}
                  >
                    Return to Projects
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3.5 animate-fade-in">
                  {/* Compact Professional Project Header */}
                  <div className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Icon + Title + Status + Meta */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9.5 w-9.5 rounded-lg ${colorClasses.bg} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                              {activeProject.name}
                            </h1>
                            <Badge
                              variant={activeProject.status === 'ACTIVE' ? 'success' : 'neutral'}
                              size="xs"
                              dot
                            >
                              {activeProject.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-[#94A3B8] flex-wrap">
                            {activeProject.description && (
                              <>
                                <span className="truncate max-w-sm text-slate-600 dark:text-[#CBD5E1]">
                                  {activeProject.description}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {effectiveMembers.length} {effectiveMembers.length === 1 ? 'member' : 'members'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CheckSquare className="h-3 w-3" />
                              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      {canManageProjects && (
                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => handleOpenEditModal(activeProject)}
                            className="inline-flex items-center gap-1"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>

                          {activeProject.status === 'ACTIVE' ? (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                setTargetProject(activeProject);
                                setArchiveModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            >
                              <Archive className="h-3 w-3" />
                              <span>Archive</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="xs"
                              onClick={() => {
                                setTargetProject(activeProject);
                                setRestoreModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Restore</span>
                            </Button>
                          )}

                          <Button
                            variant="danger"
                            size="xs"
                            onClick={() => {
                              setTargetProject(activeProject);
                              setDeleteModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Detail Tab Navigation Bar */}
                  <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-[#202C3F] pb-px">
                    <button
                      type="button"
                      onClick={() => setActiveProjectTab('overview')}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeProjectTab === 'overview'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-[#131D2E]/70 shadow-2xs'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#131D2E]/30'
                      }`}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      <span>Overview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProjectTab('tasks')}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeProjectTab === 'tasks'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-[#131D2E]/70 shadow-2xs'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#131D2E]/30'
                      }`}
                    >
                      <Kanban className="h-3.5 w-3.5" />
                      <span>Tasks</span>
                      {tasks.length > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {tasks.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProjectTab('people')}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeProjectTab === 'people'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-[#131D2E]/70 shadow-2xs'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#131D2E]/30'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>People</span>
                      {effectiveMembers.length > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-[#182337] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-[#223046]">
                          {effectiveMembers.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProjectTab('activity')}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeProjectTab === 'activity'
                          ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-[#131D2E]/70 shadow-2xs'
                          : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#131D2E]/30'
                      }`}
                    >
                      <Activity className="h-3.5 w-3.5" />
                      <span>Activity</span>
                    </button>
                  </div>

                  {/* ============================================================ */}
                  {/* TAB 1: KANBAN TASKS BOARD                                    */}
                  {/* ============================================================ */}
                  {activeProjectTab === 'tasks' && (
                    <div className="animate-fade-in">
                      <KanbanBoard
                        companyId={company?.id}
                        projectId={activeProject.id}
                        effectiveMembers={effectiveMembers}
                        canManage={canManageProjects}
                      />
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* TAB 2: OVERVIEW                                              */}
                  {/* ============================================================ */}
                  {activeProjectTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Metadata and Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Project Overview Metadata */}
                        <Card className="p-5 space-y-4">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] font-mono">
                            Project Overview
                          </h3>

                          <div className="space-y-3.5 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-[#263449]">
                              <span className="text-slate-500 dark:text-[#94A3B8]">Workspace</span>
                              <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                                {company?.name || 'Workspace'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-[#263449]">
                              <span className="text-slate-500 dark:text-[#94A3B8]">Created Date</span>
                              <span className="font-medium text-slate-800 dark:text-[#E2E8F0] flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {formatDate(activeProject.created_at)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-[#263449]">
                              <span className="text-slate-500 dark:text-[#94A3B8]">Last Updated</span>
                              <span className="font-medium text-slate-800 dark:text-[#E2E8F0] flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {formatDate(activeProject.updated_at)}
                              </span>
                            </div>

                            {activeProject.archived_at && (
                              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-[#263449]">
                                <span className="text-amber-500 font-medium">Archived At</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  {formatDate(activeProject.archived_at)}
                                </span>
                              </div>
                            )}

                            <div className="pt-2">
                              <span className="text-slate-500 dark:text-[#94A3B8] block mb-2">Project Creator</span>
                              {activeProject.creator ? (
                                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-[#151F32] border border-slate-100 dark:border-[#263449]">
                                  <Avatar user={activeProject.creator} size="xs" variant="indigo-solid" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                      {getDisplayName(activeProject.creator)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] truncate font-mono">
                                      {activeProject.creator.email}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Workspace Member</span>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Deliverables / Kanban Snapshot Card */}
                        <Card className="md:col-span-2 p-6 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Kanban className="h-4 w-4 text-indigo-500" />
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                  Tasks & Kanban Workflow
                                </h3>
                              </div>
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => setActiveProjectTab('tasks')}
                              >
                                View Kanban Board →
                              </Button>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                              Track deliverables, assignments, priorities, and status progression for <strong className="text-slate-700 dark:text-slate-300">{activeProject.name}</strong>.
                            </p>

                            {/* Task Completion Progress */}
                            {tasks.length > 0 && (() => {
                              const doneCount = tasks.filter((t) => t.status === 'DONE').length;
                              const percent = Math.round((doneCount / tasks.length) * 100);
                              return (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500 dark:text-[#94A3B8] font-medium">Completion Progress</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC]">{percent}% ({doneCount}/{tasks.length})</span>
                                  </div>
                                  <div className="h-2 w-full bg-slate-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Task Metrics Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151F32] border border-slate-100 dark:border-[#263449] text-center">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">To Do</span>
                              <p className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mt-0.5">
                                {tasks.filter((t) => t.status === 'TODO').length}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">In Progress</span>
                              <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                                {tasks.filter((t) => t.status === 'IN_PROGRESS').length}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Review</span>
                              <p className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                                {tasks.filter((t) => t.status === 'REVIEW').length}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-center">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:emerald-400 tracking-wider">Done</span>
                              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                                {tasks.filter((t) => t.status === 'DONE').length}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* People Summary Glance Card */}
                      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                              Team & Project Contributors ({effectiveMembers.length})
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                              {projectTeams.length} teams assigned • {effectiveMembers.length} active contributors with workspace access
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setActiveProjectTab('people')}
                        >
                          Manage in People tab →
                        </Button>
                      </Card>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* TAB 3: PEOPLE & TEAMS                                        */}
                  {/* ============================================================ */}
                  {activeProjectTab === 'people' && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
                              <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              <span>People working on this project</span>
                            </h2>
                            <div className="relative group/help flex items-center">
                              <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-0.5 rounded-full focus:outline-none cursor-pointer"
                                title="Assigning a team gives all of its members access to this project. You can also add people individually."
                                aria-label="Access explanation"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/help:block w-72 p-2.5 bg-slate-900 dark:bg-[#1E293B] text-white text-[11px] leading-relaxed rounded-lg shadow-xl border border-slate-700/50 z-30 pointer-events-none">
                                Assigning a team gives all of its members access to this project. You can also add people individually.
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-[#1E293B]" />
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                            Add a team to give all its members access, or add people individually.
                          </p>
                        </div>
                      </div>

                      {/* Two-Column Balanced Card Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* ========================================================= */}
                        {/* CARD 1: TEAMS ASSIGNED TO THIS PROJECT                    */}
                        {/* ========================================================= */}
                        <Card className="p-5 sm:p-6 flex flex-col space-y-4 shadow-xs">
                          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-[#263449]">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                Teams assigned to this project
                              </h3>
                              <Badge variant="indigo" size="xs">
                                {projectTeams.length}
                              </Badge>
                            </div>

                            {canManageProjects && (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={handleOpenAddTeamModal}
                                className="inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Assign Team</span>
                              </Button>
                            )}
                          </div>

                          {/* Search in Teams if more than 3 teams */}
                          {projectTeams.length > 3 && (
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={teamListSearch}
                                onChange={(e) => setTeamListSearch(e.target.value)}
                                placeholder="Filter assigned teams..."
                                className="w-full pl-8 pr-7 py-1.5 bg-[#F8F9FC] dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] rounded-xl text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                              />
                              {teamListSearch && (
                                <button
                                  type="button"
                                  onClick={() => setTeamListSearch('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Teams Content Body */}
                          {teamsLoading ? (
                            <div className="space-y-3 py-2">
                              {[1, 2].map((idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-slate-100 dark:border-[#263449] animate-pulse flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 flex-1">
                                    <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-[#1B263A]" />
                                    <div className="space-y-1.5 flex-1">
                                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-[#1B263A] rounded" />
                                      <div className="h-2.5 w-16 bg-slate-200 dark:bg-[#1B263A] rounded" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : projectTeams.length === 0 ? (
                            <div className="py-8 text-center space-y-2.5">
                              <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Users className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                                  No teams assigned to this project yet.
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto mt-0.5">
                                  Assign an entire team to give all its members access at once.
                                </p>
                              </div>
                              {canManageProjects && (
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={handleOpenAddTeamModal}
                                  className="mt-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Assign Team</span>
                                </Button>
                              )}
                            </div>
                          ) : displayTeams.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                              No teams matched &quot;{teamListSearch}&quot;.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-[#263449]">
                              {displayTeams.map((pt) => {
                                const teamIconComp = getIconComponent(pt.team?.icon);
                                const teamColors = getColorClasses(pt.team?.color);

                                return (
                                  <div
                                    key={pt.id}
                                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div
                                        className={`h-9 w-9 rounded-xl ${teamColors.bg} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                                      >
                                        <teamIconComp className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                          {pt.team?.name || 'Unnamed Team'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                                          {pt.team?.description || 'Team workspace'}
                                        </p>
                                      </div>
                                    </div>

                                    {canManageProjects && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setTargetTeamToRemove(pt);
                                          setRemoveTeamModalOpen(true);
                                        }}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                        title="Remove team from project"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>

                        {/* ========================================================= */}
                        {/* CARD 2: PEOPLE WITH PROJECT ACCESS                        */}
                        {/* ========================================================= */}
                        <Card className="p-5 sm:p-6 flex flex-col space-y-4 shadow-xs">
                          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-[#263449]">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                                People with project access
                              </h3>
                              <Badge variant="emerald" size="xs">
                                {effectiveMembers.length}
                              </Badge>
                            </div>

                            {canManageProjects && (
                              <Button
                                variant="primary"
                                size="xs"
                                onClick={handleOpenAddMemberModal}
                                className="inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Person</span>
                              </Button>
                            )}
                          </div>

                          {/* Search in Members if more than 3 members */}
                          {effectiveMembers.length > 3 && (
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={memberListSearch}
                                onChange={(e) => setMemberListSearch(e.target.value)}
                                placeholder="Search people by name, email, or team..."
                                className="w-full pl-8 pr-7 py-1.5 bg-[#F8F9FC] dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] rounded-xl text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                              />
                              {memberListSearch && (
                                <button
                                  type="button"
                                  onClick={() => setMemberListSearch('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Members Content Body */}
                          {membersLoading ? (
                            <div className="space-y-3 py-2">
                              {[1, 2, 3].map((idx) => (
                                <div key={idx} className="p-3 rounded-lg border border-slate-100 dark:border-[#263449] animate-pulse flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 flex-1">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#1B263A]" />
                                    <div className="space-y-1.5 flex-1">
                                      <div className="h-3.5 w-28 bg-slate-200 dark:bg-[#1B263A] rounded" />
                                      <div className="h-2.5 w-36 bg-slate-200 dark:bg-[#1B263A] rounded" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : effectiveMembers.length === 0 ? (
                            <div className="py-8 text-center space-y-2.5">
                              <div className="mx-auto h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <UserCheck className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC]">
                                  No people have access to this project yet.
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto mt-0.5">
                                  Add a person directly or assign a team to give its members access.
                                </p>
                              </div>
                              {canManageProjects && (
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={handleOpenAddMemberModal}
                                  className="mt-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Add Person</span>
                                </Button>
                              )}
                            </div>
                          ) : displayMembers.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                              No people matched &quot;{memberListSearch}&quot;.
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-[#263449]">
                              {displayMembers.map((m) => {
                                const isDirect = m.source_type === 'direct' || m.source_type === 'both';
                                const isTeam = m.source_type === 'team' || m.source_type === 'both';
                                const isSelf = m.id === user?.id;
                                const teamNamesStr =
                                  m.team_names && m.team_names.length > 0 ? m.team_names.join(', ') : 'Team';

                                let sourceLabel = '';
                                let badgeClasses = 'bg-slate-100 dark:bg-[#1B263A] text-slate-700 dark:text-[#CBD5E1] border-slate-200/80 dark:border-[#263449]';

                                if (isDirect && isTeam) {
                                  sourceLabel = `Added directly • ${teamNamesStr}`;
                                  badgeClasses = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/40';
                                } else if (isDirect) {
                                  sourceLabel = 'Added directly';
                                  badgeClasses = 'bg-slate-100 dark:bg-[#1B263A] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-[#263449]';
                                } else if (isTeam) {
                                  sourceLabel = teamNamesStr;
                                  badgeClasses = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/40';
                                }

                                const isMenuOpen = actionMenuOpenId === `member-${m.id}`;

                                return (
                                  <div
                                    key={m.id}
                                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group relative"
                                  >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <Avatar user={m} size="sm" variant="indigo-solid" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                                            {getDisplayName(m)}
                                            {isSelf && (
                                              <span className="ml-1 text-[10px] font-normal text-slate-400">
                                                (You)
                                              </span>
                                            )}
                                          </p>

                                          {m.designation && (
                                            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1B263A] px-1.5 py-0.2 rounded font-normal">
                                              {m.designation}
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] truncate font-mono">
                                          {m.email}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right: Access source badge + Three-dot action menu */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {sourceLabel && (
                                        <span
                                          className={`text-[10.5px] font-medium border px-2.5 py-0.5 rounded-full whitespace-nowrap ${badgeClasses}`}
                                        >
                                          {sourceLabel}
                                        </span>
                                      )}

                                      {/* Three-dot action menu */}
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuOpenId(isMenuOpen ? null : `member-${m.id}`);
                                          }}
                                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B263A] flex items-center justify-center transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                          title="Member options"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </button>

                                        {isMenuOpen && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white dark:bg-[#1B263A] border border-slate-200 dark:border-[#263449] shadow-xl py-1 z-30 text-xs animate-scale-in"
                                          >
                                            {isDirect && canManageProjects ? (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setActionMenuOpenId(null);
                                                  setTargetMemberToRemove(m);
                                                  setRemoveMemberModalOpen(true);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left font-medium cursor-pointer"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Remove direct access</span>
                                              </button>
                                            ) : (
                                              <div className="px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500">
                                                {isTeam ? `Access via ${teamNamesStr}` : 'Workspace access'}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      </div>

                      {/* Informational Help Banner */}
                      <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-[#151F32]/60 border border-slate-200/70 dark:border-[#263449] text-xs text-slate-600 dark:text-[#94A3B8]">
                        <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          <Info className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="leading-relaxed">
                            <strong className="font-semibold text-slate-900 dark:text-[#F8FAFC] mr-1.5">
                              How project access works:
                            </strong>
                            Assigning a team automatically gives all of its members access to this project. You can also add people individually.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* TAB 4: ACTIVITY TIMELINE                                     */}
                  {/* ============================================================ */}
                  {activeProjectTab === 'activity' && (
                    <div className="space-y-4 animate-fade-in">
                      {/* Header Ribbon */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131D2E] p-4 rounded-xl border border-slate-200/80 dark:border-[#202C3F] shadow-2xs">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                            <Activity className="h-4 w-4 text-indigo-500" />
                            <span>Project Activity</span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                            Real-time audit log of task creations, assignments, status transitions, and deliverables.
                          </p>
                        </div>

                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => fetchProjectActivities()}
                          disabled={activitiesLoading}
                          className="self-start sm:self-auto gap-1"
                        >
                          <RefreshCw className={`h-3 w-3 ${activitiesLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh</span>
                        </Button>
                      </div>

                      {/* Timeline Body */}
                      {activitiesLoading && activities.length === 0 ? (
                        <div className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-6 space-y-4 shadow-2xs">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-start gap-3 animate-pulse">
                              <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#1B283F] shrink-0" />
                              <div className="space-y-1.5 flex-1">
                                <div className="h-3.5 w-48 bg-slate-200 dark:bg-[#1B283F] rounded" />
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-[#1B283F] rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : activitiesError ? (
                        <div className="p-8 text-center rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#131D2E] shadow-2xs space-y-3">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 max-w-sm mx-auto">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                              Unable to load activity timeline
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                              {activitiesError}
                            </p>
                          </div>
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => fetchProjectActivities()}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : activities.length === 0 ? (
                        <div className="py-12 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-dashed border-slate-300 dark:border-[#202C3F] p-6 space-y-3 shadow-2xs">
                          <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5 max-w-sm mx-auto">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                              No activity yet
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                              Task creation, assignments, status changes, and other project updates will appear here.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-4 sm:p-5 shadow-2xs space-y-6">
                          {(() => {
                            // Group activities by date
                            const groups = {};
                            activities.forEach((act) => {
                              const key = getActivityGroupKey(act.created_at);
                              if (!groups[key]) groups[key] = [];
                              groups[key].push(act);
                            });

                            return Object.entries(groups).map(([groupTitle, items]) => (
                              <div key={groupTitle} className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8292A9] font-mono">
                                    {groupTitle}
                                  </span>
                                  <div className="h-px flex-1 bg-slate-100 dark:bg-[#202C3F]" />
                                </div>

                                <div className="space-y-3.5 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-px before:bg-slate-200/70 dark:before:bg-[#202C3F]">
                                  {items.map((act) => {
                                    const iconCfg = getActivityIconConfig(act.action);
                                    const IconComp = iconCfg.icon;
                                    const actorName = act.actor ? getDisplayName(act.actor) : 'Team Member';
                                    const timeStr = formatActivityTime(act.created_at);

                                    return (
                                      <div
                                        key={act.id}
                                        className="flex items-start justify-between gap-3 relative pl-1 group"
                                      >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                          {/* Avatar with subtle Action Badge overlay */}
                                          <div className="relative shrink-0">
                                            <Avatar
                                              user={act.actor}
                                              size="sm"
                                              variant="indigo-solid"
                                              className="ring-2 ring-white dark:ring-[#131D2E]"
                                            />
                                            <div
                                              className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border flex items-center justify-center shadow-2xs ${iconCfg.bg}`}
                                            >
                                              <IconComp className="h-2.5 w-2.5" />
                                            </div>
                                          </div>

                                          {/* Content */}
                                          <div className="min-w-0 flex-1 pt-0.5 space-y-0.5">
                                            <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">
                                              <strong className="font-semibold text-slate-900 dark:text-[#F8FAFC] mr-1.5">
                                                {actorName}
                                              </strong>
                                              <span>{act.details || act.action.replace('_', ' ').toLowerCase()}</span>
                                            </p>
                                          </div>
                                        </div>

                                        {/* Timestamp */}
                                        <span className="text-[11px] font-mono text-slate-400 dark:text-[#64748B] shrink-0 pt-0.5">
                                          {timeStr}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modals */}
        {renderModals()}
      </div>
    );
  }

  // ============================================================
  // RENDER: PROJECTS DIRECTORY VIEW (/projects)
  // ============================================================
  return (
    <div className="h-screen bg-[#F4F6FA] dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] overflow-hidden selection:bg-indigo-500 selection:text-white">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-xs">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                    Projects
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Organize initiatives, track deliverables, and manage cross-functional projects.
                </p>
              </div>

              {canManageProjects && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Project</span>
                </Button>
              )}
            </div>

            {/* Summary StatCards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Total Projects"
                value={projectStats.total}
                icon={FolderKanban}
                variant="indigo"
              />
              <StatCard
                title="Active Projects"
                value={projectStats.active}
                icon={Sparkles}
                variant="emerald"
              />
              <StatCard
                title="Archived Projects"
                value={projectStats.archived}
                icon={Archive}
                variant="amber"
              />
            </div>

            {/* Filters, Tabs & Search Toolbar */}
            <Card className="p-3.5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#151F32] border border-slate-200/60 dark:border-[#263449]">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-white dark:bg-[#202D43] text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({projectStats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'active'
                        ? 'bg-white dark:bg-[#202D43] text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Active ({projectStats.active})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('archived')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === 'archived'
                        ? 'bg-white dark:bg-[#202D43] text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Archived ({projectStats.archived})
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-[#64748B]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects by name or description..."
                    className="w-full pl-9 pr-8 py-1.5 bg-[#F8F9FC] dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] rounded-xl text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Projects Directory Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <Card key={idx} className="p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-[#1B263A]" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-[#1B263A] rounded" />
                        <div className="h-3 w-20 bg-slate-200 dark:bg-[#1B263A] rounded" />
                      </div>
                    </div>
                    <div className="h-3 w-full bg-slate-200 dark:bg-[#1B263A] rounded" />
                    <div className="h-3 w-4/5 bg-slate-200 dark:bg-[#1B263A] rounded" />
                  </Card>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="p-12 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FolderKanban className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {searchQuery ? 'No matching projects found' : 'No projects in this view'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
                  {searchQuery
                    ? `No project matched "${searchQuery}". Try modifying your search query.`
                    : statusFilter === 'archived'
                    ? 'There are no archived projects in this company workspace.'
                    : 'Get started by creating a new project to track deliverables and workflows.'}
                </p>
                {canManageProjects && !searchQuery && statusFilter !== 'archived' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenCreateModal}
                    className="mt-2 inline-flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Project</span>
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => {
                  const IconComp = getIconComponent(project.icon);
                  const colorClasses = getColorClasses(project.color);
                  const isMenuOpen = actionMenuOpenId === project.id;

                  return (
                    <Card
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="p-5 flex flex-col justify-between hover:shadow-md hover:border-slate-300 dark:hover:border-[#334155] transition-all group relative cursor-pointer"
                    >
                      {/* Top Row: Visual Badge, Title, Menu */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`h-10 w-10 rounded-lg ${colorClasses.bg} text-white flex items-center justify-center shrink-0 shadow-xs`}
                            >
                              <IconComp className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                {project.name}
                              </h3>
                              <Badge
                                variant={project.status === 'ACTIVE' ? 'success' : 'neutral'}
                                size="xs"
                                dot
                              >
                                {project.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Quick Action Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(isMenuOpen ? null : project.id);
                              }}
                              className="h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202D43] flex items-center justify-center transition-colors cursor-pointer"
                              title="Project options"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 rounded-lg bg-white dark:bg-[#1B263A] border border-slate-200 dark:border-[#263449] shadow-lg py-1 z-30 text-xs animate-scale-in"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    navigate(`/projects/${project.id}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] transition-colors text-left"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                                  <span>View Details</span>
                                </button>

                                {canManageProjects && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuOpenId(null);
                                        handleOpenEditModal(project);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] transition-colors text-left"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                                      <span>Edit Settings</span>
                                    </button>

                                    {project.status === 'ACTIVE' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActionMenuOpenId(null);
                                          setTargetProject(project);
                                          setArchiveModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left"
                                      >
                                        <Archive className="h-3.5 w-3.5" />
                                        <span>Archive Project</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActionMenuOpenId(null);
                                          setTargetProject(project);
                                          setRestoreModalOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        <span>Restore Project</span>
                                      </button>
                                    )}

                                    <div className="border-t border-slate-100 dark:border-[#263449] my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuOpenId(null);
                                        setTargetProject(project);
                                        setDeleteModalOpen(true);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Delete Project</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed min-h-[32px]">
                          {project.description || 'No description provided.'}
                        </p>
                      </div>

                      {/* Bottom Row: Creator and Created Date */}
                      <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {project.creator ? (
                            <>
                              <Avatar user={project.creator} size="xs" variant="indigo-solid" />
                              <span className="text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1] truncate">
                                {getDisplayName(project.creator)}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Workspace</span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-[#64748B] shrink-0 font-mono">
                          {formatDate(project.created_at)}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {renderModals()}
    </div>
  );

  // ============================================================
  // MODALS RENDERING (CREATE, EDIT, ARCHIVE, RESTORE, DELETE)
  // ============================================================
  function renderModals() {
    return (
      <>
        {/* CREATE PROJECT MODAL */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => !formSubmitting && setCreateModalOpen(false)}
          title="Create New Project"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            {formErrors.server && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400">
                {formErrors.server}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mobile App Redesign"
                error={formErrors.name}
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Outline objectives, deliverables, and scope..."
                className="w-full px-3 py-2 bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] rounded-lg text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {formErrors.description && (
                <p className="mt-1 text-rose-500 text-[11px]">{formErrors.description}</p>
              )}
            </div>

            {/* Visual Identity: Icon Picker */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                Visual Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = formData.icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: item.id })}
                      className={`h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-600 dark:text-[#94A3B8] hover:border-slate-300 dark:hover:border-[#334155]'
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Identity: Color Palette */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                Theme Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_OPTIONS.map((item) => {
                  const isSelected = formData.color === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: item.id })}
                      className={`h-7 rounded-md ${item.bg} flex items-center justify-center transition-transform cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105' : 'hover:opacity-90'
                      }`}
                      title={item.label}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={formSubmitting}
              >
                Create Project
              </Button>
            </div>
          </form>
        </Modal>

        {/* EDIT PROJECT MODAL */}
        <Modal
          isOpen={editModalOpen}
          onClose={() => !formSubmitting && setEditModalOpen(false)}
          title="Edit Project"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            {formErrors.server && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400">
                {formErrors.server}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
                Project Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={formErrors.name}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Outline objectives, deliverables, and scope..."
                className="w-full px-3 py-2 bg-white dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] rounded-lg text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {formErrors.description && (
                <p className="mt-1 text-rose-500 text-[11px]">{formErrors.description}</p>
              )}
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                Visual Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {ICON_OPTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = formData.icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: item.id })}
                      className={`h-9 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-[#263449] bg-white dark:bg-[#151F32] text-slate-600 dark:text-[#94A3B8] hover:border-slate-300 dark:hover:border-[#334155]'
                      }`}
                      title={item.label}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-[#CBD5E1] mb-1.5">
                Theme Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_OPTIONS.map((item) => {
                  const isSelected = formData.color === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: item.id })}
                      className={`h-7 rounded-md ${item.bg} flex items-center justify-center transition-transform cursor-pointer ${
                        isSelected ? 'ring-2 ring-offset-2 ring-indigo-600 scale-105' : 'hover:opacity-90'
                      }`}
                      title={item.label}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={formSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* ARCHIVE PROJECT MODAL */}
        <Modal
          isOpen={archiveModalOpen}
          onClose={() => !formSubmitting && setArchiveModalOpen(false)}
          title="Archive Project"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
              <Archive className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Archive "{targetProject?.name}"?</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  Archiving moves this project to the archived directory. All data and associations are preserved and can be restored at any time.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setArchiveModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleArchiveConfirm}
                loading={formSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Archive Project
              </Button>
            </div>
          </div>
        </Modal>

        {/* RESTORE PROJECT MODAL */}
        <Modal
          isOpen={restoreModalOpen}
          onClose={() => !formSubmitting && setRestoreModalOpen(false)}
          title="Restore Project"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              <RotateCcw className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Restore "{targetProject?.name}" to Active?</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                  This project will return to the active projects directory and become visible in standard active filters.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRestoreModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRestoreConfirm}
                loading={formSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Restore to Active
              </Button>
            </div>
          </div>
        </Modal>

        {/* DELETE PROJECT MODAL */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => !formSubmitting && setDeleteModalOpen(false)}
          title="Delete Project Permanently"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Are you absolutely sure?</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  This action will permanently delete <strong className="font-bold">{targetProject?.name}</strong>. This operation cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={formSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                loading={formSubmitting}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </Modal>

        {/* ============================================================ */}
        {/* ASSIGN TEAM TO PROJECT MODAL                                 */}
        {/* ============================================================ */}
        <Modal
          isOpen={addTeamModalOpen}
          onClose={() => !teamSubmitting && setAddTeamModalOpen(false)}
          title="Assign a Team"
          description="Everyone in this team will automatically get access to this project."
          size="md"
        >
          <div className="space-y-4 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                placeholder="Search workspace teams by name or description..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] rounded-lg text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              {teamSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTeamSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Teams List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-[#263449]">
              {loadingAvailableTeams ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-[#151F32] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredAvailableTeams.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  {availableCompanyTeams.length === 0
                    ? 'No teams found in this workspace.'
                    : `No teams matching "${teamSearchQuery}".`}
                </div>
              ) : (
                filteredAvailableTeams.map((team) => {
                  const isAssigned = projectTeams.some((pt) => pt.team_id === team.id);
                  const isSelected = selectedTeamToAdd?.id === team.id;
                  const teamColor = getColorClasses(team.color || 'indigo');

                  return (
                    <div
                      key={team.id}
                      onClick={() => !isAssigned && setSelectedTeamToAdd(team)}
                      className={`pt-2 first:pt-0 pb-2 flex items-center justify-between gap-3 rounded-lg px-2.5 transition-all cursor-pointer ${
                        isAssigned
                          ? 'opacity-50 cursor-not-allowed bg-slate-50/50 dark:bg-[#151F32]/50'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40'
                          : 'hover:bg-slate-50 dark:hover:bg-[#151F32]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-lg ${teamColor.bg} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                            {team.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] truncate">
                            {team.description || `${team.member_count ?? 0} members`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isAssigned ? (
                          <Badge variant="neutral" size="xs">
                            Already Assigned
                          </Badge>
                        ) : isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAddTeamModalOpen(false)}
                disabled={teamSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddTeamSubmit}
                loading={teamSubmitting}
                disabled={!selectedTeamToAdd || teamSubmitting}
              >
                Assign Team
              </Button>
            </div>
          </div>
        </Modal>

        {/* ============================================================ */}
        {/* ADD PERSON TO PROJECT MODAL                                  */}
        {/* ============================================================ */}
        <Modal
          isOpen={addMemberModalOpen}
          onClose={() => !memberSubmitting && setAddMemberModalOpen(false)}
          title="Add Person"
          description="This person will get direct access to this project."
          size="md"
        >
          <div className="space-y-4 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search workspace members by name, email, or role..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#151F32] border border-slate-200 dark:border-[#263449] rounded-lg text-xs text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              {memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMemberSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-[#263449]">
              {loadingAvailableMembers ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-[#151F32] rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredAvailableMembers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  {availableCompanyMembers.length === 0
                    ? 'No workspace members found.'
                    : `No members matching "${memberSearchQuery}".`}
                </div>
              ) : (
                filteredAvailableMembers.map((cm) => {
                  const userObj = cm.user || cm;
                  const memberUserId = userObj.id || cm.user_id;
                  const isDirectMember = projectMembers.some(
                    (pm) => (pm.user_id || pm.user?.id) === memberUserId
                  );
                  const effectiveMatch = effectiveMembers.find((em) => em.id === memberUserId);
                  const isInAssignedTeam =
                    effectiveMatch &&
                    (effectiveMatch.source_type === 'team' || effectiveMatch.source_type === 'both');

                  const isSelected =
                    (selectedMemberToAdd?.user_id || selectedMemberToAdd?.id) === memberUserId;

                  return (
                    <div
                      key={cm.id || memberUserId}
                      onClick={() => !isDirectMember && setSelectedMemberToAdd(cm)}
                      className={`pt-2 first:pt-0 pb-2 flex items-center justify-between gap-3 rounded-lg px-2.5 transition-all cursor-pointer ${
                        isDirectMember
                          ? 'opacity-50 cursor-not-allowed bg-slate-50/50 dark:bg-[#151F32]/50'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40'
                          : 'hover:bg-slate-50 dark:hover:bg-[#151F32]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={userObj} size="sm" variant="indigo-solid" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                              {getDisplayName(userObj)}
                            </p>
                            {cm.designation && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-[#1B263A] px-1.5 py-0.2 rounded">
                                {cm.designation}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] truncate font-mono">
                            {userObj.email}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isDirectMember ? (
                          <Badge variant="neutral" size="xs">
                            Already Added
                          </Badge>
                        ) : isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : isInAssignedTeam ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="purple" size="xs">
                              In Team
                            </Badge>
                            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                              Add Direct
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                            Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#263449] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAddMemberModalOpen(false)}
                disabled={memberSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddMemberSubmit}
                loading={memberSubmitting}
                disabled={!selectedMemberToAdd || memberSubmitting}
              >
                Add Person
              </Button>
            </div>
          </div>
        </Modal>

        {/* ============================================================ */}
        {/* REMOVE TEAM CONFIRMATION MODAL                               */}
        {/* ============================================================ */}
        <Modal
          isOpen={removeTeamModalOpen}
          onClose={() => !teamSubmitting && setRemoveTeamModalOpen(false)}
          title="Remove team from project?"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Remove "{targetTeamToRemove?.team?.name || targetTeamToRemove?.name || 'Team'}" from project?
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  Removing this team will remove project access inherited from this team. The workspace team and its members will not be deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRemoveTeamModalOpen(false)}
                disabled={teamSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleRemoveTeamConfirm}
                loading={teamSubmitting}
              >
                Remove Team
              </Button>
            </div>
          </div>
        </Modal>

        {/* ============================================================ */}
        {/* REMOVE PERSON CONFIRMATION MODAL                             */}
        {/* ============================================================ */}
        <Modal
          isOpen={removeMemberModalOpen}
          onClose={() => !memberSubmitting && setRemoveMemberModalOpen(false)}
          title="Remove person from project?"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">
                  Remove "{targetMemberToRemove?.full_name || targetMemberToRemove?.username || 'this person'}" from project?
                </p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  This removes their direct project access. If they are also part of an assigned team, they will continue to have access through that team.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRemoveMemberModalOpen(false)}
                disabled={memberSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleRemoveMemberConfirm}
                loading={memberSubmitting}
              >
                Remove Person
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }
};

export default Projects;

