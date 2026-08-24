import { Layers } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-10 rounded-xl border border-dashed border-slate-300/80 dark:border-[#263449] bg-white dark:bg-[#151F32] shadow-xs ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-3 shadow-2xs">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <div className="mt-4">
          <Button
            variant="primary"
            size="sm"
            icon={actionIcon}
            onClick={onAction}
            className="text-xs font-medium"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
