const variants = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  neutral: 'bg-slate-800 text-slate-300 border-slate-700/80',
};

const dotColors = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
  indigo: 'bg-indigo-400',
  purple: 'bg-purple-400',
  neutral: 'bg-slate-400',
};

const Badge = ({
  children,
  variant = 'neutral',
  dot = false,
  pulse = false,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide uppercase font-mono ${variants[variant]} ${sizeClasses} ${className}`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[variant]}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColors[variant]}`} />
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
