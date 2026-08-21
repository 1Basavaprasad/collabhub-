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
    <div id="profile" className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/20 space-y-6">
      {/* Top Banner with User Avatar & Refresh Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
            {user.full_name
              ? user.full_name.charAt(0).toUpperCase()
              : user.username
              ? user.username.charAt(0).toUpperCase()
              : 'U'}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {user.full_name || 'CollabHub User'}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Session
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-0.5">
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
        >
          Refresh Profile
        </Button>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Full Name */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              Full Name
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200 mt-1">
            {user.full_name || '—'}
          </p>
        </div>

        {/* Username */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <AtSign className="h-3.5 w-3.5 text-indigo-400" />
              Username
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200 font-mono mt-1">
            @{user.username}
          </p>
        </div>

        {/* Email */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              Email Address
            </span>
            <button
              onClick={() => copyToClipboard(user.email, 'email')}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Copy email to clipboard"
            >
              {copiedField === 'email' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-sm font-semibold text-slate-200 font-mono mt-1 truncate">
            {user.email}
          </p>
        </div>

        {/* User ID */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
              <Fingerprint className="h-3.5 w-3.5 text-indigo-400" />
              Account UUID
            </span>
            <button
              onClick={() => copyToClipboard(user.id, 'id')}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Copy User ID"
            >
              {copiedField === 'id' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p
            className="text-xs font-mono font-medium text-slate-300 mt-1 truncate"
            title={user.id}
          >
            {user.id || '—'}
          </p>
        </div>

        {/* Account Authorization Card (Full Width) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  FastAPI JWT Authorized Session
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Bearer token active in HTTP Authorization header (/auth/me verified)
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-mono">
              Authenticated
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
