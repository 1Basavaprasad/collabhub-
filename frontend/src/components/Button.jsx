import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs border border-transparent active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium',
  secondary:
    'bg-white dark:bg-[#151F32] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c] shadow-2xs active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-[#33435c] font-medium',
  outline:
    'bg-transparent text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#202D43] hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-slate-300 font-medium',
  ghost:
    'bg-transparent text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#202D43] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-slate-300 font-medium',
  danger:
    'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:text-rose-800 dark:hover:text-rose-300 border border-rose-200/80 dark:border-rose-900/40 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-rose-500 font-medium',
  'danger-solid':
    'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs border border-transparent active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-rose-500 font-medium',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1.5 h-7',
  sm: 'px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5 h-8',
  md: 'px-3.5 py-2 text-sm font-medium rounded-lg gap-2 h-9',
  lg: 'px-4 py-2.5 text-sm font-medium rounded-lg gap-2 h-10',
  xl: 'px-4.5 py-2.5 text-sm font-semibold rounded-lg gap-2.5 h-11',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0B1120] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 select-none ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      ) : null}

      {children && <span>{children}</span>}

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
    </button>
  );
};

export default Button;
