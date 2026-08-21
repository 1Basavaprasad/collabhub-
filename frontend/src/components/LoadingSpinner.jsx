import { Loader2 } from 'lucide-react';

const sizeMap = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
  xl: 'h-10 w-10',
};

const LoadingSpinner = ({ size = 'md', className = '', label }) => {
  return (
    <div className="inline-flex items-center gap-2">
      <Loader2 className={`animate-spin text-indigo-400 ${sizeMap[size] || sizeMap.md} ${className}`} />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
