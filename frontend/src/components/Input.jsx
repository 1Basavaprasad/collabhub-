const Input = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  icon: Icon,
  autoComplete,
  className = '',
  ...props
}) => {
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
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-[#94A3B8]">
            <Icon className="h-4 w-4" />
          </div>
        )}

        <input
          id={id || name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`block w-full h-10 rounded-xl border bg-white dark:bg-[#0F172A] py-2 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-[#64748B] shadow-2xs transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-slate-50 dark:disabled:bg-[#151F32] disabled:text-slate-400 dark:disabled:text-[#64748B] disabled:cursor-not-allowed ${
            Icon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${
            error
              ? 'border-rose-300 dark:border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-200/90 dark:border-[#263449] hover:border-slate-300 dark:hover:border-[#33435c] focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500/20'
          }`}
          {...props}
        />
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-normal animate-fade-in">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{helperText}</p>}
    </div>
  );
};

export default Input;
