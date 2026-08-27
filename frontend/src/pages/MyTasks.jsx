import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  RotateCcw,
  X,
  Folder,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Building2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import Avatar, { getDisplayName } from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { useTask } from '../context/TaskContext';
import { useToast } from '../components/Toast';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'REVIEW', label: 'Review' },
  { id: 'DONE', label: 'Completed' },
];

const VIEW_PRESETS = [
  { id: 'all', label: 'Assigned to me' },
  { id: 'due_today', label: 'Due today' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const PRIORITY_CONFIG = {
  LOW: { label: 'Low', variant: 'neutral', dot: true },
  MEDIUM: { label: 'Medium', variant: 'indigo', dot: true },
  HIGH: { label: 'High', variant: 'warning', dot: true },
  URGENT: { label: 'Urgent', variant: 'error', dot: true, pulse: true },
};

const formatDeadline = (dateString, status) => {
  if (!dateString) return null;
  const due = new Date(dateString);
  if (isNaN(due.getTime())) return null;

  const now = new Date();
  const isToday = due.toDateString() === now.toDateString();
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = due.toDateString() === tomorrow.toDateString();

  const isOverdue = due < now && !isToday;

  const formattedDate = due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (status === 'DONE') {
    return { label: `Completed ${formattedDate}`, type: 'completed' };
  }

  if (isToday) {
    return { label: 'Due today', type: 'today' };
  }
  if (isTomorrow) {
    return { label: 'Due tomorrow', type: 'tomorrow' };
  }
  if (isOverdue) {
    const diffDays = Math.max(1, Math.floor((now - due) / (1000 * 60 * 60 * 24)));
    return { label: `Overdue · ${diffDays}d`, type: 'overdue' };
  }

  return { label: `Due ${formattedDate}`, type: 'future' };
};

const MyTasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, currentCompany, loading: companyLoading } = useCompany();
  const { addToast } = useToast();
  const companyId = company?.id || currentCompany?.id;

  const {
    myTasks = [],
    myTasksLoading,
    myTasksError,
    myTasksSummary,
    loadMyTasksAll,
    markTaskComplete,
  } = useTask();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewPreset, setViewPreset] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  // Local request state
  const [localLoading, setLocalLoading] = useState(true);
  const [localError, setLocalError] = useState(null);

  // Confirmation Modal state for completion
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (companyLoading) {
      return;
    }
    if (!companyId) {
      setLocalLoading(false);
      return;
    }

    setLocalLoading(true);
    setLocalError(null);
    try {
      await loadMyTasksAll(companyId);
    } catch (err) {
      setLocalError(err.message || 'Unable to load tasks.');
    } finally {
      setLocalLoading(false);
    }
  }, [companyLoading, companyId, loadMyTasksAll]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overall loading & error status
  const isLoading = (localLoading || myTasksLoading || companyLoading) && (!companyId || myTasks.length === 0);
  const effectiveError = myTasksError || localError;

  // Extract distinct projects for filter dropdown
  const uniqueProjects = useMemo(() => {
    const map = new Map();
    (myTasks || []).forEach((t) => {
      if (t.project?.id && !map.has(t.project.id)) {
        map.set(t.project.id, t.project.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [myTasks]);

  // Filter tasks locally
  const filteredTasks = useMemo(() => {
    const now = new Date();
    return (myTasks || []).filter((task) => {
      // Preset View filter
      if (viewPreset === 'due_today') {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        if (due.toDateString() !== now.toDateString() || task.status === 'DONE') return false;
      } else if (viewPreset === 'overdue') {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        if (due >= now || due.toDateString() === now.toDateString() || task.status === 'DONE') return false;
      } else if (viewPreset === 'completed') {
        if (task.status !== 'DONE') return false;
      }

      // Tab status match
      if (activeTab !== 'all' && task.status !== activeTab) {
        return false;
      }

      // Priority match
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== 'all' && task.project?.id !== projectFilter) {
        return false;
      }

      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query);
        const projMatch = task.project?.name?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !projMatch) return false;
      }

      return true;
    });
  }, [myTasks, activeTab, viewPreset, priorityFilter, projectFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'all' ||
    projectFilter !== 'all' ||
    activeTab !== 'all' ||
    viewPreset !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setProjectFilter('all');
    setActiveTab('all');
    setViewPreset('all');
  };

  const handleOpenCompleteModal = (task) => {
    setTaskToComplete(task);
    setConfirmModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!taskToComplete || !companyId) return;
    setActionLoading(true);
    try {
      await markTaskComplete(companyId, taskToComplete.project_id, taskToComplete.id);
      addToast({
        type: 'success',
        title: 'Task completed',
        message: `"${taskToComplete.title}" was marked as complete.`,
      });
      setConfirmModalOpen(false);
      setTaskToComplete(null);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to complete task',
        message: err.message || 'Something went wrong.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[#F4F6FA] dark:bg-[#0B1120] flex flex-col text-slate-800 dark:text-[#CBD5E1] overflow-hidden selection:bg-indigo-500 selection:text-white">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9.5 w-9.5 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
                    My Tasks
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Your assigned work across all projects.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={loadData}
                  className="gap-1"
                  disabled={isLoading}
                >
                  <RotateCcw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Assigned to me */}
              <button
                type="button"
                onClick={() => setViewPreset('all')}
                className={`bg-white dark:bg-[#131D2E] rounded-xl border p-3.5 shadow-2xs space-y-1 text-left transition-all cursor-pointer ${
                  viewPreset === 'all'
                    ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'border-slate-200/80 dark:border-[#202C3F] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8]">
                  <span className="text-[11px] font-medium uppercase tracking-wider">Assigned to me</span>
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {isLoading ? (
                    <div className="h-6 w-10 bg-slate-200 dark:bg-[#1B283F] rounded animate-pulse my-0.5" />
                  ) : (
                    myTasksSummary?.assigned_to_me ?? 0
                  )}
                </div>
              </button>

              {/* Due Today */}
              <button
                type="button"
                onClick={() => setViewPreset('due_today')}
                className={`bg-white dark:bg-[#131D2E] rounded-xl border p-3.5 shadow-2xs space-y-1 text-left transition-all cursor-pointer ${
                  viewPreset === 'due_today'
                    ? 'border-amber-500 ring-1 ring-amber-500/30'
                    : 'border-slate-200/80 dark:border-[#202C3F] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8]">
                  <span className="text-[11px] font-medium uppercase tracking-wider">Due today</span>
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {isLoading ? (
                    <div className="h-6 w-10 bg-slate-200 dark:bg-[#1B283F] rounded animate-pulse my-0.5" />
                  ) : (
                    <span className={myTasksSummary?.due_today > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                      {myTasksSummary?.due_today ?? 0}
                    </span>
                  )}
                </div>
              </button>

              {/* Overdue */}
              <button
                type="button"
                onClick={() => setViewPreset('overdue')}
                className={`bg-white dark:bg-[#131D2E] rounded-xl border p-3.5 shadow-2xs space-y-1 text-left transition-all cursor-pointer ${
                  viewPreset === 'overdue'
                    ? 'border-rose-500 ring-1 ring-rose-500/30'
                    : 'border-slate-200/80 dark:border-[#202C3F] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8]">
                  <span className="text-[11px] font-medium uppercase tracking-wider">Overdue</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-[#F8FAFC]">
                  {isLoading ? (
                    <div className="h-6 w-10 bg-slate-200 dark:bg-[#1B283F] rounded animate-pulse my-0.5" />
                  ) : (
                    <span className={myTasksSummary?.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>
                      {myTasksSummary?.overdue ?? 0}
                    </span>
                  )}
                </div>
              </button>

              {/* Completed */}
              <button
                type="button"
                onClick={() => setViewPreset('completed')}
                className={`bg-white dark:bg-[#131D2E] rounded-xl border p-3.5 shadow-2xs space-y-1 text-left transition-all cursor-pointer ${
                  viewPreset === 'completed'
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'border-slate-200/80 dark:border-[#202C3F] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 dark:text-[#94A3B8]">
                  <span className="text-[11px] font-medium uppercase tracking-wider">Completed</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {isLoading ? (
                    <div className="h-6 w-10 bg-slate-200 dark:bg-[#1B283F] rounded animate-pulse my-0.5" />
                  ) : (
                    myTasksSummary?.completed ?? 0
                  )}
                </div>
              </button>
            </div>

            {/* Status Tabs Bar & Filter Toolbar */}
            <div className="space-y-3">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 border-b border-slate-200/80 dark:border-[#202C3F] pb-px overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white/70 dark:bg-[#131D2E]/70 shadow-2xs'
                        : 'border-transparent text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-[#131D2E]/30'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Toolbar */}
              <div className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] px-3.5 py-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Search input */}
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full pl-8 pr-7 py-1 h-8 text-xs rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/70 dark:bg-[#0B1322] text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Priority dropdown */}
                  <div className="w-32">
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full px-2.5 py-1 h-8 text-xs rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/70 dark:bg-[#0B1322] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project dropdown */}
                  {uniqueProjects.length > 0 && (
                    <div className="w-36">
                      <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                        className="w-full px-2.5 py-1 h-8 text-xs rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/70 dark:bg-[#0B1322] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
                      >
                        <option value="all">All Projects</option>
                        {uniqueProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Reset filter */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-1 px-2 py-1 h-8 rounded-lg border border-slate-200 dark:border-[#243247] text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <div className="text-xs font-mono font-medium text-slate-500 dark:text-[#94A3B8] self-end sm:self-auto">
                  {isLoading ? (
                    <div className="h-4 w-20 bg-slate-200 dark:bg-[#1B283F] rounded animate-pulse" />
                  ) : (
                    <>
                      Showing <strong className="text-slate-900 dark:text-[#F8FAFC]">{filteredTasks.length}</strong> tasks
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Task Content Area */}
            {isLoading ? (
              /* Compact 3-Row Skeleton Loader */
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-3.5 animate-pulse flex items-center justify-between"
                  >
                    <div className="space-y-2 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-40 bg-slate-200 dark:bg-[#1B283F] rounded" />
                        <div className="h-4 w-12 bg-slate-200 dark:bg-[#1B283F] rounded-full" />
                      </div>
                      <div className="h-3 w-64 bg-slate-200 dark:bg-[#1B283F] rounded" />
                    </div>
                    <div className="h-7 w-24 bg-slate-200 dark:bg-[#1B283F] rounded shrink-0" />
                  </div>
                ))}
              </div>
            ) : effectiveError ? (
              /* Error State with Retry */
              <div className="py-12 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-rose-200 dark:border-rose-900/30 p-6 space-y-3">
                <div className="mx-auto h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                    Unable to load your tasks
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    {effectiveError || "We couldn't load your assigned work. Please try again."}
                  </p>
                </div>
                <div className="pt-1">
                  <Button variant="primary" size="xs" onClick={loadData}>
                    Retry
                  </Button>
                </div>
              </div>
            ) : !companyId ? (
              /* No Workspace Selected State */
              <div className="py-12 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-6 space-y-3">
                <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                    No active workspace
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Select or create a workspace to view your assigned tasks.
                  </p>
                </div>
                <div className="pt-1">
                  <Button variant="secondary" size="xs" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            ) : filteredTasks.length === 0 ? (
              /* Contextual Empty State */
              <div className="py-14 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-dashed border-slate-300 dark:border-[#202C3F] p-6 space-y-3">
                <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                    {hasActiveFilters ? 'No matching tasks found' : 'No tasks assigned to you'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    {hasActiveFilters
                      ? 'Try adjusting your filters or search keywords.'
                      : 'Tasks assigned to you across your projects will appear here.'}
                  </p>
                </div>
                <div className="pt-1">
                  {hasActiveFilters ? (
                    <Button variant="secondary" size="xs" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button variant="secondary" size="xs" onClick={() => navigate('/projects')}>
                      Browse Projects
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Actual Task List */
              <div className="space-y-2.5">
                {filteredTasks.map((task) => {
                  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                  const deadline = formatDeadline(task.due_date, task.status);
                  const isDone = task.status === 'DONE';
                  const assigneeName = getDisplayName(task.assignee);
                  const isAssignee = user?.id && task.assignee_id === user.id;
                  const creatorName = task.creator ? getDisplayName(task.creator) : null;
                  const completedByName = task.completed_by ? getDisplayName(task.completed_by) : null;

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-4 shadow-2xs hover:shadow-xs hover:border-indigo-400/40 dark:hover:border-indigo-500/30 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                    >
                      {/* Left: Task Information */}
                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Title and Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-sm font-medium ${isDone ? 'line-through text-slate-400 dark:text-[#64748B]' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>
                            {task.title}
                          </h3>

                          {/* Priority */}
                          <Badge variant={priorityMeta.variant} size="xs" dot={priorityMeta.dot}>
                            {priorityMeta.label}
                          </Badge>

                          {/* Project Tag */}
                          {task.project && (
                            <span
                              onClick={() => navigate(`/projects/${task.project.id}`)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#1B283F] hover:bg-slate-200 dark:hover:bg-[#223350] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            >
                              <Folder className="h-3 w-3 text-indigo-500" />
                              <span>{task.project.name}</span>
                              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
                            </span>
                          )}

                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            task.status === 'DONE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60'
                              : task.status === 'REVIEW'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60'
                              : 'bg-slate-100 dark:bg-[#182337] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#223046]'
                          }`}>
                            {task.status === 'TODO' ? 'To Do' : task.status === 'IN_PROGRESS' ? 'In Progress' : task.status === 'REVIEW' ? 'Review' : 'Done'}
                          </span>
                        </div>

                        {/* Description Preview */}
                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Metadata Footer: Assignee, Deadline & Creator */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                          {/* Assignee Identity */}
                          {task.assignee && (
                            <div className="flex items-center gap-1.5" title={task.assignee.email || assigneeName}>
                              <Avatar user={task.assignee} size="xs" variant="indigo-solid" className="shrink-0" />
                              <span className="font-medium text-slate-700 dark:text-[#CBD5E1]">
                                {assigneeName}
                                {isAssignee && <span className="text-indigo-600 dark:text-indigo-400 font-semibold ml-1">(You)</span>}
                              </span>
                            </div>
                          )}

                          {task.assignee && <span>•</span>}

                          {/* Deadline */}
                          {deadline ? (
                            <span className={`inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded ${
                              deadline.type === 'overdue'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold'
                                : deadline.type === 'today'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold'
                                : deadline.type === 'completed'
                                ? 'text-slate-400 dark:text-[#64748B]'
                                : 'text-slate-600 dark:text-[#CBD5E1]'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              <span>{deadline.label}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">No deadline</span>
                          )}

                          <span>•</span>

                          {/* Created by */}
                          {creatorName && (
                            <span>
                              Created by <strong className="text-slate-700 dark:text-[#CBD5E1]">{creatorName}</strong>
                            </span>
                          )}

                          {/* Completed by info */}
                          {isDone && completedByName && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Completed by {completedByName}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isDone ? (
                          <Button
                            variant="primary"
                            size="xs"
                            icon={CheckCircle2}
                            onClick={() => handleOpenCompleteModal(task)}
                          >
                            Mark complete
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                            <Check className="h-3.5 w-3.5" />
                            <span>Done</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Confirmation Modal for Marking Task Complete */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Complete this task?"
        description={`This will mark "${taskToComplete?.title}" as completed.`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setConfirmModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              onClick={handleConfirmComplete}
              loading={actionLoading}
            >
              Mark Complete
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-xs text-slate-600 dark:text-[#CBD5E1]">
          <p>
            Are you sure you want to mark{' '}
            <strong className="text-slate-900 dark:text-[#F8FAFC]">
              &quot;{taskToComplete?.title}&quot;
            </strong>{' '}
            as done?
          </p>
          <p className="text-slate-500 dark:text-[#94A3B8]">
            Your team and project members will see that you completed this assignment.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default MyTasks;
