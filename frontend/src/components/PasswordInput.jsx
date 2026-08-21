import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const PasswordInput = ({
  id,
  name = 'password',
  label = 'Password',
  value,
  onChange,
  placeholder = '••••••••',
  required = false,
  disabled = false,
  error,
  helperText,
  autoComplete = 'current-password',
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id || name}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            {label}
            {required && <span className="text-indigo-400 ml-1">*</span>}
          </label>
        </div>
      )}

      <div className="relative rounded-xl shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
          <Lock className="h-4 w-4" />
        </div>

        <input
          id={id || name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`block w-full rounded-xl border bg-slate-900/80 pl-10 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-slate-900/40 disabled:text-slate-500 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-700/80 focus:border-indigo-500 focus:ring-indigo-500/25'
          }`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 font-medium animate-fade-in">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-400">{helperText}</p>}
    </div>
  );
};

export default PasswordInput;
