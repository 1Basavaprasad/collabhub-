import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Sparkles } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 animate-pulse flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <Loader2 className="w-20 h-20 text-indigo-500/30 animate-spin absolute" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide">Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page and preserve requested path
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
