import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:via-indigo-400 hover:to-purple-500 hover:shadow-indigo-500/35 border border-indigo-400/20 active:scale-[0.99]',
  secondary:
    'bg-slate-800/90 text-slate-200 hover:bg-slate-700/90 hover:text-white border border-slate-700/80 active:scale-[0.99]',
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
  lg: 'px-6 py-3.5 text-base font-semibold rounded-2xl gap-2.5',
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
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
      ) : null}

      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      )}
    </button>
  );
};

export default Button;
