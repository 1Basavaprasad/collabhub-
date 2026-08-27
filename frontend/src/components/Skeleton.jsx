export const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => (
  <div className={`bg-slate-200/70 dark:bg-[#182235] ${rounded} ${className} skeleton-shimmer`} />
);

export const StatCardSkeleton = () => (
  <div className="rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 shadow-xs space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    <div className="space-y-1.5">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="w-full bg-white dark:bg-[#151F32] rounded-2xl border border-slate-200/80 dark:border-[#263449] overflow-hidden shadow-xs">
    {/* Header */}
    <div className="px-5 py-4 border-b border-slate-100 dark:border-[#263449] bg-slate-50/60 dark:bg-[#1B263A]/40 flex items-center justify-between gap-4">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-8 w-44 rounded-xl" />
    </div>

    {/* Rows */}
    <div className="divide-y divide-slate-100 dark:divide-[#263449]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <Skeleton key={j} className="h-3.5 w-16 hidden sm:block" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const TeamCardSkeleton = () => (
  <div className="rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 shadow-xs space-y-4">
    <div className="flex items-start justify-between gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    <div className="space-y-1.5 pt-1">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-3 w-full" />
    </div>
    <div className="pt-2 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  </div>
);

export const CardSkeleton = ({ lines = 3 }) => (
  <div className="rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 sm:p-6 shadow-xs space-y-3.5">
    <div className="flex items-center justify-between">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="h-7 w-20 rounded-xl" />
    </div>
    <div className="space-y-2 pt-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3.5 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  </div>
);

export const TaskCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-4 shadow-2xs space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-12 rounded-md" />
      <Skeleton className="h-4 w-4 rounded-md" />
    </div>
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
    <div className="pt-2 border-t border-slate-100 dark:border-[#263449]/70 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const SkeletonCard = TaskCardSkeleton;

export default Skeleton;
