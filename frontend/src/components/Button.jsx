import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 border border-indigo-500/30 active:scale-[0.99]',
  secondary:
    'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-800 hover:border-slate-700 active:scale-[0.99]',
  outline:
    'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white border border-slate-700 hover:border-slate-600 active:scale-[0.99]',
  ghost:
    'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 active:scale-[0.99]',
  danger:
    'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 active:scale-[0.99]',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  sm: 'px-3.5 py-2 text-xs font-medium rounded-xl gap-2',
  md: 'px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
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
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}

      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="h-4 w-4 shrink-0" />
      )}
    </button>
  );
};

export default Button;
