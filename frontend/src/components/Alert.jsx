import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const alertConfig = {
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300',
    title: 'text-emerald-950 dark:text-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    container: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300',
    title: 'text-rose-950 dark:text-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300',
    title: 'text-amber-950 dark:text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    container: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-800 dark:text-indigo-300',
    title: 'text-indigo-950 dark:text-indigo-200',
    icon: Info,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
};

const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const config = alertConfig[variant] || alertConfig.info;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs sm:text-sm animate-fade-in ${config.container} ${className}`}
    >
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.iconColor}`} />
      
      <div className="flex-1 leading-relaxed">
        {title && (
          <h4 className={`font-semibold mb-0.5 ${config.title}`}>
            {title}
          </h4>
        )}
        <div className="opacity-90">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
