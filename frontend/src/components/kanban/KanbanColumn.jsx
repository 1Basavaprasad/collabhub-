import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const COLUMN_META = {
  TODO: {
    title: 'To Do',
    headerDot: 'bg-slate-400 dark:bg-slate-500',
    countBadge: 'bg-slate-100 dark:bg-[#182337] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#223046]',
    borderTop: 'border-t-slate-400 dark:border-t-slate-500',
  },
  IN_PROGRESS: {
    title: 'In Progress',
    headerDot: 'bg-indigo-500 dark:bg-indigo-400',
    countBadge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
    borderTop: 'border-t-indigo-500 dark:border-t-indigo-400',
  },
  REVIEW: {
    title: 'Review',
    headerDot: 'bg-amber-500 dark:bg-amber-400',
    countBadge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    borderTop: 'border-t-amber-500 dark:border-t-amber-400',
  },
  DONE: {
    title: 'Done',
    headerDot: 'bg-emerald-500 dark:bg-emerald-400',
    countBadge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    borderTop: 'border-t-emerald-500 dark:border-t-emerald-400',
  },
};

const KanbanColumn = ({
  status,
  tasks = [],
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const meta = COLUMN_META[status] || COLUMN_META.TODO;

  return (
    <div className="flex flex-col flex-1 min-w-[270px] max-w-[330px] bg-slate-50/80 dark:bg-[#101726]/80 rounded-xl border border-slate-200/70 dark:border-[#1E2A3C] overflow-hidden">
      {/* Column Header */}
      <div className={`px-3 py-2.5 border-b border-slate-200/70 dark:border-[#1E2A3C] border-t-2 ${meta.borderTop} bg-white/70 dark:bg-[#131D2E]/70 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${meta.headerDot}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-[#F8FAFC]">
            {meta.title}
          </h3>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${meta.countBadge}`}>
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(status)}
          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1B283F] transition-colors cursor-pointer"
          title={`Add task to ${meta.title}`}
          aria-label={`Add task to ${meta.title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Task Cards Container */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[140px]">
        {tasks.length === 0 ? (
          <div className="h-24 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200 dark:border-[#1E2A3C] rounded-lg bg-white/40 dark:bg-[#131D2E]/20 space-y-1">
            <p className="text-[11px] text-slate-400 dark:text-[#64748B] font-medium">
              No tasks
            </p>
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add task</span>
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>

      {/* Column Footer: Quick Add Button */}
      {tasks.length > 0 && (
        <div className="p-2 border-t border-slate-200/60 dark:border-[#1E2A3C]/60 bg-white/30 dark:bg-[#131D2E]/30">
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="w-full py-1 px-2.5 rounded-lg border border-dashed border-slate-200 dark:border-[#1E2A3C] text-xs font-medium text-slate-500 dark:text-[#94A3B8] hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-[#152033] flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add task</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanColumn;
