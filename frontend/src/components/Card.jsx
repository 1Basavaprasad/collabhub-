export const CardHeader = ({ children, className = '' }) => (
  <div className={`pb-4 border-b border-slate-100 dark:border-[#263449] ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', icon: Icon }) => (
  <h3 className={`text-sm sm:text-base font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5 ${className}`}>
    {Icon && (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <span>{children}</span>
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-500 dark:text-[#94A3B8] mt-1 leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`pt-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const Card = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-5 sm:p-6 shadow-xs transition-all duration-200 ${
        hover ? 'hover:border-slate-300 dark:hover:border-[#33435c] hover:shadow-sm' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
