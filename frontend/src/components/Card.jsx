export const CardHeader = ({ children, className = '' }) => (
  <div className={`pb-4 border-b border-slate-800/80 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', icon: Icon }) => (
  <h3 className={`text-base font-bold text-white tracking-tight flex items-center gap-2 ${className}`}>
    {Icon && <Icon className="h-4 w-4 text-indigo-400" />}
    <span>{children}</span>
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-xs text-slate-400 mt-1 leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={`pt-4 ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`pt-4 border-t border-slate-800/80 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const Card = ({
  children,
  className = '',
  hover = false,
  glass = true,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 transition-all duration-200 ${
        glass ? 'glass-panel' : 'bg-slate-900/70 border-slate-800'
      } ${hover ? 'glass-panel-hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
