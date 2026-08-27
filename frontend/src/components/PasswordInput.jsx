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
            className="block text-xs font-medium text-slate-700 dark:text-[#CBD5E1]"
          >
            {label}
            {required && <span className="text-indigo-600 dark:text-indigo-400 ml-1 font-semibold">*</span>}
          </label>
        </div>
      )}

      <div className="relative rounded-xl">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-[#94A3B8]">
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
          className={`block w-full h-10 rounded-xl border bg-white dark:bg-[#0F172A] pl-10 pr-11 py-2 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] shadow-2xs transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-slate-50 dark:disabled:bg-[#151F32] disabled:text-slate-400 dark:disabled:text-[#64748B] disabled:cursor-not-allowed ${
            error
              ? 'border-rose-300 dark:border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200/90 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500/20'
          }`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-[#CBD5E1] transition-colors cursor-pointer focus:outline-none"
          tabIndex="-1"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-normal animate-fade-in">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">{helperText}</p>
      )}
    </div>
  );
};

export default PasswordInput;
