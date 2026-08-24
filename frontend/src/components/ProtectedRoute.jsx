import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { Layers } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Authentication Initialization Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 bg-mesh selection:bg-indigo-500 selection:text-white">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
            <Layers className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono">
            <LoadingSpinner size="sm" />
            <span>Checking your session...</span>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, safely redirect to /login with full return destination
  if (!isAuthenticated) {
    const fullPath = location.pathname + location.search;
    const redirectUrl = `/login?redirect=${encodeURIComponent(fullPath)}`;
    return <Navigate to={redirectUrl} state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
