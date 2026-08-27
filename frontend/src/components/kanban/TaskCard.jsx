import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowRight,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import Avatar, { getDisplayName } from '../Avatar';
import Badge from '../Badge';
import { useAuth } from '../../context/AuthContext';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    variant: 'neutral',
    dot: true,
  },
  MEDIUM: {
    label: 'Medium',
    variant: 'indigo',
    dot: true,
  },
  HIGH: {
    label: 'High',
    variant: 'warning',
    dot: true,
  },
  URGENT: {
    label: 'Urgent',
    variant: 'error',
    dot: true,
    pulse: true,
  },
};

const ALL_STATUSES = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'REVIEW', label: 'Review' },
  { id: 'DONE', label: 'Done' },
];

const formatDueDate = (dateString, status) => {
  if (!dateString) return null;
  const due = new Date(dateString);
  if (isNaN(due.getTime())) return null;

  const now = new Date();
  const isToday = due.toDateString() === now.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = due.toDateString() === tomorrow.toDateString();
  const isOverdue = due < now && !isToday;

  const formatted = due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (status === 'DONE') {
    return { label: `Completed ${formatted}`, type: 'completed' };
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

  return { label: formatted, type: 'normal' };
};

const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkComplete,
}) => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const dueDateMeta = formatDueDate(task.due_date, task.status);
  const assigneeName = getDisplayName(task.assignee);
  const isAssignee = user?.id && task.assignee_id === user.id;
  const isDone = task.status === 'DONE';
  const completedByName = task.completed_by ? getDisplayName(task.completed_by) : null;

  return (
    <div
      onClick={() => onEdit(task)}
      className="group relative bg-white dark:bg-[#152033] rounded-lg border border-slate-200/80 dark:border-[#223046] p-3 shadow-2xs hover:shadow-xs hover:border-indigo-400/50 dark:hover:border-indigo-500/40 transition-all duration-150 cursor-pointer select-none"
    >
      {/* Top Row: Priority Badge, Complete Action & 3-Dot Action Menu */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <Badge
          variant={priorityMeta.variant}
          size="xs"
          dot={priorityMeta.dot}
          pulse={priorityMeta.pulse}
        >
          {priorityMeta.label}
        </Badge>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Mark Complete Button for Assignee */}
          {isAssignee && !isDone && (
            <button
              type="button"
              onClick={() => onStatusChange ? onStatusChange(task.id, 'DONE') : null}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
              title="Mark task as complete"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden sm:inline">Complete</span>
            </button>
          )}

          {/* 3-Dot Menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1B283F] transition-colors cursor-pointer"
              aria-label="Task actions"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {/* Action Menu Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-6 z-30 w-40 bg-white dark:bg-[#131D2E] rounded-xl border border-slate-200/90 dark:border-[#263449] shadow-xl py-1 text-xs animate-scale-in">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1B283F] transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3 w-3 text-slate-400" />
                  <span>Edit task</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-[#202C3F]" />

                <p className="px-3 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8292A9]">
                  Move to
                </p>

                {ALL_STATUSES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={task.status === st.id}
                    onClick={() => {
                      setMenuOpen(false);
                      onStatusChange(task.id, st.id);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      task.status === st.id
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1B283F]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                      <span>{st.label}</span>
                    </span>
                    {task.status === st.id && <CheckCircle2 className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}

                <div className="my-1 border-t border-slate-100 dark:border-[#202C3F]" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(task);
                  }}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete task</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <h4 className={`text-xs sm:text-sm font-medium leading-snug line-clamp-2 mb-1 ${
        isDone ? 'line-through text-slate-400 dark:text-[#64748B]' : 'text-slate-900 dark:text-[#F8FAFC]'
      }`}>
        {task.title}
      </h4>

      {/* Task Description Preview */}
      {task.description && (
        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed mb-2.5">
          {task.description}
        </p>
      )}

      {/* Completion info banner if Done */}
      {isDone && completedByName && (
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2 font-medium">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span className="truncate">Done by {completedByName}</span>
        </div>
      )}

      {/* Bottom Row: Assignee & Due Date */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#202C3F] text-[11px]">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          {task.assignee ? (
            <>
              <Avatar user={task.assignee} size="xs" variant="indigo-solid" className="shrink-0" />
              <span
                className="truncate text-slate-700 dark:text-[#CBD5E1] font-medium max-w-[110px]"
                title={task.assignee?.email ? `${assigneeName} (${task.assignee.email})` : assigneeName}
              >
                {assigneeName}{isAssignee ? ' (You)' : ''}
              </span>
            </>
          ) : (
            <span className="text-slate-400 dark:text-[#64748B] italic flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-slate-300 dark:text-[#475569]" />
              Unassigned
            </span>
          )}
        </div>

        {/* Due Date */}
        <div className="shrink-0">
          {dueDateMeta ? (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${
                dueDateMeta.type === 'overdue'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold'
                  : dueDateMeta.type === 'today'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-semibold'
                  : dueDateMeta.type === 'completed'
                  ? 'text-slate-400 dark:text-[#64748B]'
                  : 'text-slate-500 dark:text-[#94A3B8]'
              }`}
            >
              <Calendar className="h-2.5 w-2.5" />
              <span>{dueDateMeta.label}</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-[#64748B] text-[10px]">No due date</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
