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
      className={`relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-4 shadow-xs transition-all duration-150 hover:border-slate-300 dark:hover:border-[#33435c] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] font-mono">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {actionButton}
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1]">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            {value}
          </span>
          {badge && (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449] font-mono">
              {badge}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-normal truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
