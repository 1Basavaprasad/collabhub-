import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  AtSign, 
  KeyRound, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw,
  Fingerprint
} from 'lucide-react';

const UserProfile = () => {
  const { user, refreshUser } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!user) {
    return null;
  }

  const copyToClipboard = (text, fieldName) => {
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl shadow-black/20">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {user.full_name || 'CollabHub User'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                Active
              </span>
            </div>
            <p className="text-sm text-slate-400 font-mono">@{user.username}</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Profile Details Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Full Name */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-indigo-400" />
              Full Name
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200 mt-1">
            {user.full_name || '—'}
          </p>
        </div>

        {/* Username */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <AtSign className="h-3.5 w-3.5 text-indigo-400" />
              Username
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200 font-mono mt-1">
            {user.username}
          </p>
        </div>

        {/* Email */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              Email Address
            </span>
            <button
              onClick={() => copyToClipboard(user.email, 'email')}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
              title="Copy email"
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
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5 text-indigo-400" />
              User ID
            </span>
            <button
              onClick={() => copyToClipboard(user.id, 'id')}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
              title="Copy User ID"
            >
              {copiedField === 'id' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs font-mono font-medium text-slate-300 mt-1 truncate" title={user.id}>
            {user.id}
          </p>
        </div>

        {/* Account Status */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 transition-all hover:border-slate-700/60 md:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Account Status
              </span>
              <p className="text-sm font-semibold text-slate-200">
                Active &bull; Fully Authenticated Session
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Authenticated
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfile;
