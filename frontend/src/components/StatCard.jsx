const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  actionButton,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-200 hover:border-slate-700/80 hover:bg-slate-900/80 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {actionButton}
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
            {value}
          </span>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {badge}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Subtle bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
    </div>
  );
};

export default StatCard;
