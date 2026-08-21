import { Layers } from 'lucide-react';
import Button from './Button';

const EmptyState = ({
  icon: Icon = Layers,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 backdrop-blur-sm ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 shadow-inner">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-bold text-white tracking-tight">
        {title}
      </h3>

      <p className="mt-1.5 text-xs text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && (
        <div className="mt-5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAction}
            className="text-xs"
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
