import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import UserProfile from '../components/UserProfile';
import { 
  ShieldCheck, 
  Activity, 
  Server, 
  Key, 
  Clock, 
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Layers,
  Code
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, healthInfo, checkHealth } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);

  const handleHealthRefresh = async () => {
    setIsHealthRefreshing(true);
    await checkHealth();
    setTimeout(() => setIsHealthRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-mesh">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>CollabHub Workspace</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                    Welcome, <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">{user?.full_name || user?.username || 'Developer'}</span>
                  </h1>
                  <p className="mt-2 text-sm text-slate-300 max-w-xl">
                    You are signed in to CollabHub. Your session is authenticated via FastAPI JWT tokens.
                  </p>
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-200 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Status: <strong className="text-emerald-400 font-semibold">Authenticated</strong></span>
                  </div>
                  
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm">
                    <Key className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Token: <strong className="text-indigo-300 font-mono">Bearer (HS256)</strong></span>
                  </div>
                </div>
              </div>

              {/* Subtle background glow */}
              <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Quick Status Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Authenticated User */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current User</span>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-white truncate">
                    {user?.full_name || '—'}
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    @{user?.username || '—'}
                  </p>
                </div>
              </div>

              {/* Backend Health Check */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Backend Health</span>
                  <button 
                    onClick={handleHealthRefresh}
                    title="Refresh health status"
                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${isHealthRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${healthInfo.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="text-base font-bold text-white capitalize">
                      {healthInfo.status || 'Checking...'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    Service: {healthInfo.service || 'collabhub-api'}
                  </p>
                </div>
              </div>

              {/* API Security */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Authorization</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Key className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">
                    JWT Protected
                  </p>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    Header: Bearer &bull;&bull;&bull;&bull;
                  </p>
                </div>
              </div>

            </div>

            {/* Profile Section Component */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  User Profile Information
                </h2>
                <span className="text-xs text-slate-400 font-mono">Source: GET /auth/me</span>
              </div>
              <UserProfile />
            </div>

            {/* Platform Scope Information Note */}
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5 backdrop-blur-sm text-xs text-slate-400 flex items-start gap-3">
              <Code className="h-5 w-5 shrink-0 text-indigo-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">CollabHub Frontend Scope</p>
                <p className="mt-1 leading-relaxed text-slate-400">
                  Authentication, registration, JWT authorization interceptors, protected routing, and user profile integration are active. Further workspace collaboration modules will connect dynamically as their FastAPI endpoints become available.
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>

    </div>
  );
};

export default Dashboard;
