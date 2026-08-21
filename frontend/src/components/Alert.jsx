import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const alertConfig = {
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    title: 'text-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  error: {
    container: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
    title: 'text-rose-200',
    icon: AlertCircle,
    iconColor: 'text-rose-400',
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    title: 'text-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
  },
  info: {
    container: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
    title: 'text-indigo-200',
    icon: Info,
    iconColor: 'text-indigo-400',
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
      className={`flex items-start gap-3 rounded-2xl border p-4 text-xs backdrop-blur-sm animate-fade-in ${config.container} ${className}`}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      
      <div className="flex-1 leading-relaxed">
        {title && (
          <h4 className={`font-semibold mb-0.5 ${config.title}`}>
            {title}
          </h4>
        )}
        <div className="text-slate-300">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
