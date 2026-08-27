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
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 shadow-xs transition-all duration-200 hover:border-slate-300 dark:hover:border-[#33435c] hover:shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] font-mono">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {actionButton}
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-100 dark:border-[#263449]/60 shadow-2xs">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            {value}
          </span>
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-[#1B263A] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#263449] font-mono">
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
