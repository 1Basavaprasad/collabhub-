import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Edit2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import { getDisplayName } from '../Avatar';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_OPTIONS = [
  { id: 'LOW', label: 'Low' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HIGH', label: 'High' },
  { id: 'URGENT', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'REVIEW', label: 'Review' },
  { id: 'DONE', label: 'Done' },
];

const TaskModal = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  task = null,
  effectiveMembers = [],
  loading = false,
}) => {
  const { user: currentUser } = useAuth();
  const isEditing = !!task;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee_id: '',
    due_date: '',
  });

  const [formError, setFormError] = useState(null);

  // Initialize form values when modal opens or task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'TODO',
        priority: task.priority || 'MEDIUM',
        assignee_id: task.assignee_id || (task.assignee ? task.assignee.id : ''),
        due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        assignee_id: '',
        due_date: '',
      });
    }
    setFormError(null);
  }, [task, isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  };

  // Sort effectiveMembers so the currently authenticated user is placed first with clear (You) label
  const sortedMembers = useMemo(() => {
    if (!Array.isArray(effectiveMembers)) return [];
    return [...effectiveMembers].sort((a, b) => {
      const aIsCurrent = currentUser && (a.id === currentUser.id || a.email === currentUser.email);
      const bIsCurrent = currentUser && (b.id === currentUser.id || b.email === currentUser.email);
      if (aIsCurrent && !bIsCurrent) return -1;
      if (!aIsCurrent && bIsCurrent) return 1;
      const nameA = (a.full_name || a.username || '').toLowerCase();
      const nameB = (b.full_name || b.username || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [effectiveMembers, currentUser]);

  // Resolve selected assignee details
  const selectedAssignee = useMemo(() => {
    if (!formData.assignee_id) return null;
    return effectiveMembers.find((m) => m.id === formData.assignee_id);
  }, [formData.assignee_id, effectiveMembers]);

  const selectedAssigneeName = selectedAssignee ? getDisplayName(selectedAssignee) : null;
  const isSelectedCurrentUser =
    currentUser &&
    selectedAssignee &&
    (selectedAssignee.id === currentUser.id || selectedAssignee.email === currentUser.email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a task title.');
      return;
    }
    if (trimmedTitle.length > 200) {
      setFormError('Task title cannot exceed 200 characters.');
      return;
    }

    try {
      const payload = {
        title: trimmedTitle,
        description: formData.description.trim() || null,
        status: isEditing ? formData.status : 'TODO',
        priority: formData.priority,
        assignee_id: formData.assignee_id || null,
        assignee_name: selectedAssigneeName,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      };

      await onSubmit(payload, task?.id);
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save task.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[540px]"
      title={
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            {isEditing ? <Edit2 className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
            {isEditing ? 'Edit task' : 'Create task'}
          </span>
        </div>
      }
      description={
        isEditing
          ? 'Update task details, status, and assignment'
          : 'Add a task to this project'
      }
      bodyClassName="p-4 sm:p-5"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEditing && onDelete && (
              <Button
                variant="danger"
                size="xs"
                type="button"
                onClick={() => onDelete(task)}
                disabled={loading}
              >
                Delete task
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="secondary"
              size="xs"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="xs"
              type="submit"
              form="task-modal-form"
              loading={loading}
            >
              {isEditing ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-modal-form" onSubmit={handleSubmit} className="space-y-3.5">
        {formError && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* 1. Title Input */}
        <div className="space-y-1">
          <label
            htmlFor="task-title-input"
            className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]"
          >
            Task title <span className="text-rose-500">*</span>
          </label>
          <input
            id="task-title-input"
            type="text"
            required
            maxLength={200}
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Implement authentication flow..."
            className="block w-full h-9 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-3 text-xs text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] shadow-2xs transition-all duration-200 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        {/* 2. Description Input */}
        <div className="space-y-1">
          <label
            htmlFor="task-description-input"
            className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]"
          >
            Description <span className="text-slate-400 dark:text-[#64748B] font-normal text-[11px] ml-1">(optional)</span>
          </label>
          <textarea
            id="task-description-input"
            rows={2}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Add context, acceptance criteria, or relevant links..."
            maxLength={5000}
            className="block w-full rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-3 py-2 text-xs text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] shadow-2xs transition-all duration-200 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 resize-none min-h-[56px]"
          />
        </div>

        {/* 3. Task Details Section */}
        <div className="pt-0.5 space-y-1.5">
          <p className="text-[11px] font-medium text-slate-400 dark:text-[#8292A9] uppercase tracking-wider">
            Task details
          </p>

          {isEditing ? (
            /* Edit Mode: 2x2 Grid with Status Selector */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Status */}
              <div className="space-y-1">
                <label
                  htmlFor="task-status-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Status
                </label>
                <select
                  id="task-status-select"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 cursor-pointer"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label
                  htmlFor="task-priority-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Priority
                </label>
                <select
                  id="task-priority-select"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <label
                  htmlFor="task-assignee-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Assignee
                </label>
                {effectiveMembers.length === 0 ? (
                  <div className="h-8.5 px-2.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/50 dark:bg-[#0B1322] text-slate-400 text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">No members</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      id="task-assignee-select"
                      value={formData.assignee_id}
                      onChange={(e) => handleChange('assignee_id', e.target.value)}
                      className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {sortedMembers.map((m) => {
                        const name = getDisplayName(m);
                        const isCurrent =
                          currentUser && (m.id === currentUser.id || m.email === currentUser.email);
                        return (
                          <option key={m.id} value={m.id}>
                            {name}{isCurrent ? ' (You)' : ''} · {m.email}
                          </option>
                        );
                      })}
                    </select>
                    {selectedAssigneeName && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                        Assigned to {selectedAssigneeName}{isSelectedCurrentUser ? ' (You)' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label
                  htmlFor="task-due-date-input"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Due date
                </label>
                <input
                  type="date"
                  id="task-due-date-input"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          ) : (
            /* Create Mode: Horizontal 3-Column Layout on Desktop */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Priority */}
              <div className="space-y-1">
                <label
                  htmlFor="task-priority-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Priority
                </label>
                <select
                  id="task-priority-select"
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <label
                  htmlFor="task-assignee-select"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Assignee
                </label>
                {effectiveMembers.length === 0 ? (
                  <div className="h-8.5 px-2.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-slate-50/50 dark:bg-[#0B1322] text-slate-400 text-xs flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">No members</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      id="task-assignee-select"
                      value={formData.assignee_id}
                      onChange={(e) => handleChange('assignee_id', e.target.value)}
                      className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {sortedMembers.map((m) => {
                        const name = getDisplayName(m);
                        const isCurrent =
                          currentUser && (m.id === currentUser.id || m.email === currentUser.email);
                        return (
                          <option key={m.id} value={m.id}>
                            {name}{isCurrent ? ' (You)' : ''} · {m.email}
                          </option>
                        );
                      })}
                    </select>
                    {selectedAssigneeName && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                        Assigned to {selectedAssigneeName}{isSelectedCurrentUser ? ' (You)' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label
                  htmlFor="task-due-date-input"
                  className="block text-[11px] font-medium text-slate-600 dark:text-[#CBD5E1]"
                >
                  Due date
                </label>
                <input
                  type="date"
                  id="task-due-date-input"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  className="block w-full h-8.5 rounded-lg border border-slate-200/90 dark:border-[#243247] bg-white dark:bg-[#0B1322] px-2.5 text-xs text-slate-800 dark:text-[#F8FAFC] shadow-2xs transition-all focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
