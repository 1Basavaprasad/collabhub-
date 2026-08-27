import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  X,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import Modal from '../Modal';
import Button from '../Button';
import { SkeletonCard } from '../Skeleton';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const KanbanBoard = ({
  companyId,
  projectId,
  effectiveMembers = [],
  canManage = true,
}) => {
  const {
    tasks,
    loading,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  } = useTask();

  // Local filter states for instant response
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Filter tasks locally for instantaneous search and selection
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = task.title?.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      // Priority match
      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }

      // Assignee match
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned') {
          if (task.assignee_id) return false;
        } else {
          if (task.assignee_id !== assigneeFilter) return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter]);

  // Group filtered tasks by column status
  const tasksByColumn = useMemo(() => {
    const map = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
    };

    filteredTasks.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.TODO.push(t);
      }
    });

    // Ensure within-column position ordering
    Object.keys(map).forEach((col) => {
      map[col].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return map;
  }, [filteredTasks]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setAssigneeFilter('all');
  };

  // Open Create Task Modal (defaults directly to TODO)
  const handleOpenCreate = () => {
    setSelectedTask(null);
    setTaskModalOpen(true);
  };

  // Open Edit Modal on Card Click
  const handleOpenEdit = (task) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  // Submit Create / Edit Task
  const handleTaskSubmit = async (payload, taskId = null) => {
    setActionLoading(true);
    try {
      if (taskId) {
        await updateTask(companyId, projectId, taskId, payload);
      } else {
        await createTask(companyId, projectId, payload);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Move Status handler
  const handleStatusChange = async (taskId, newStatus) => {
    await updateTaskStatus(companyId, projectId, taskId, newStatus);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (task) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  // Confirm Task Deletion
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setActionLoading(true);
    try {
      await deleteTask(companyId, projectId, taskToDelete.id);
      setDeleteModalOpen(false);
      setTaskModalOpen(false);
      setTaskToDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Single-Row Filter & Toolbar Header */}
      <div className="bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search Input */}
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

            {/* Priority Filter */}
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

            {/* Assignee Filter */}
            <div className="w-36">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full px-2.5 py-1 h-8 text-xs rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/70 dark:bg-[#0B1322] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer"
              >
                <option value="all">All People</option>
                <option value="unassigned">Unassigned</option>
                {effectiveMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.username}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters CTA */}
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

          {/* Right: Task Count Badge & Primary New Task Button */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-[#94A3B8]">
              Tasks · <strong className="text-slate-900 dark:text-[#F8FAFC]">{tasks.length}</strong>
            </span>

            {canManage && (
              <Button
                variant="primary"
                size="xs"
                icon={Plus}
                onClick={handleOpenCreate}
              >
                Create Task
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board Canvas */}
      {loading && tasks.length === 0 ? (
        /* Loading Skeleton Board */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-[#1E2A3C] bg-slate-50/70 dark:bg-[#101726]/80 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3.5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              </div>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        /* Overall Board Empty State */
        <div className="py-12 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-dashed border-slate-300 dark:border-[#202C3F] p-6 space-y-3">
          <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="space-y-0.5 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
              No tasks yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Create your first task to start organizing deliverables on the Kanban board.
            </p>
          </div>
          {canManage && (
            <div className="pt-1">
              <Button
                variant="primary"
                size="xs"
                icon={Plus}
                onClick={handleOpenCreate}
              >
                Create Task
              </Button>
            </div>
          )}
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Search/Filter Empty State */
        <div className="py-10 text-center bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/80 dark:border-[#202C3F] p-5 space-y-2.5">
          <div className="mx-auto h-8 w-8 rounded-lg bg-slate-100 dark:bg-[#1B283F] text-slate-400 flex items-center justify-center">
            <Filter className="h-4 w-4" />
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#F8FAFC]">
            No matching tasks found
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto">
            No tasks match the active search query or filter criteria.
          </p>
          <Button variant="secondary" size="xs" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        </div>
      ) : (
        /* 4-Column Kanban Columns Grid */
        <div className="flex gap-3.5 overflow-x-auto pb-3 pt-0.5 snap-x scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasksByColumn[status] || []}
              onAddTask={handleOpenCreate}
              onEditTask={handleOpenEdit}
              onDeleteTask={handleOpenDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        onDelete={handleOpenDelete}
        task={selectedTask}
        effectiveMembers={effectiveMembers}
        loading={actionLoading}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete task?"
        description="This action cannot be undone."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setDeleteModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="xs"
              onClick={handleConfirmDelete}
              loading={actionLoading}
            >
              Delete task
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-xs text-slate-600 dark:text-[#CBD5E1]">
          <p>
            Are you sure you want to delete{' '}
            <strong className="text-slate-900 dark:text-[#F8FAFC]">
              &quot;{taskToDelete?.title}&quot;
            </strong>
            ?
          </p>
          <p className="text-slate-500 dark:text-[#94A3B8]">
            This task will be permanently removed from this project workspace.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default KanbanBoard;
