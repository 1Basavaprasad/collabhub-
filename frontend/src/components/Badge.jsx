const variants = {
  success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/20',
  warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-500/20',
  error: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-500/20',
  purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-500/20',
  neutral: 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-[#CBD5E1] border-slate-200/80 dark:border-[#263449]',
  blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/80 dark:border-blue-500/20',
};

const dotColors = {
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  error: 'bg-rose-500 dark:bg-rose-400',
  indigo: 'bg-indigo-500 dark:bg-indigo-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  neutral: 'bg-slate-400 dark:bg-slate-500',
  blue: 'bg-blue-500 dark:bg-blue-400',
};

const Badge = ({
  children,
  variant = 'neutral',
  dot = false,
  pulse = false,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase font-mono select-none ${
        variants[variant] || variants.neutral
      } ${sizeClasses} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                dotColors[variant] || 'bg-slate-400'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
              dotColors[variant] || 'bg-slate-400'
            }`}
          />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
