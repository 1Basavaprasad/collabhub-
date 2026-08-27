import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  AtSign,
  Fingerprint,
  ShieldCheck,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import Button from './Button';
import Avatar from './Avatar';

const UserProfile = () => {
  const { user, refreshUser } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user) {
    return null;
  }

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div id="profile" className="rounded-2xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-6 sm:p-7 shadow-xs space-y-6">
      {/* Top Banner with User Avatar & Refresh Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-[#263449]">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="2xl" variant="indigo-solid" />

          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {user.full_name || 'TeamX User'}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] font-mono mt-0.5">
              @{user.username}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          loading={isRefreshing}
          icon={RefreshCw}
          iconPosition="left"
          className="text-xs font-medium"
        >
          Refresh
        </Button>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Full Name */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] p-4 transition-all hover:border-slate-300 dark:hover:border-[#33435c]">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
            <User className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Full Name
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] mt-1">
            {user.full_name || '—'}
          </p>
        </div>

        {/* Username */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] p-4 transition-all hover:border-slate-300 dark:hover:border-[#33435c]">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
            <AtSign className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Username
          </span>
          <p className="text-sm font-mono font-semibold text-slate-900 dark:text-[#F8FAFC] mt-1">
            @{user.username}
          </p>
        </div>

        {/* Email */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] p-4 transition-all hover:border-slate-300 dark:hover:border-[#33435c]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
              <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Email Address
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(user.email, 'email')}
              className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#202D43] transition-colors cursor-pointer"
              title="Copy email"
            >
              {copiedField === 'email' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] font-mono truncate">
            {user.email}
          </p>
        </div>

        {/* Account ID */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] p-4 transition-all hover:border-slate-300 dark:hover:border-[#33435c]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
              <Fingerprint className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Account ID
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(user.id, 'id')}
              className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#202D43] transition-colors cursor-pointer"
              title="Copy Account ID"
            >
              {copiedField === 'id' ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs font-mono font-medium text-slate-700 dark:text-[#CBD5E1] truncate" title={user.id}>
            {user.id || '—'}
          </p>
        </div>

        {/* Security / Status */}
        <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/50 dark:bg-[#0F172A] p-4 transition-all hover:border-slate-300 dark:hover:border-[#33435c]">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            Security Status
          </span>
          <p className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            JWT Authenticated
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
