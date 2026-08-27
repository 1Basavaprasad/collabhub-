import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { TeamProvider } from './context/TeamContext';
import { ProjectProvider } from './context/ProjectContext';
import { TaskProvider } from './context/TaskContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Company from './pages/Company';
import Teams from './pages/Teams';
import Projects from './pages/Projects';
import MyTasks from './pages/MyTasks';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AcceptInvitation from './pages/AcceptInvitation';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <CompanyProvider>
              <TeamProvider>
                <ProjectProvider>
                  <TaskProvider>
                    <ToastProvider>
                      <Routes>
                    {/* Public Routes - redirect to /dashboard if already authenticated */}
                    <Route element={<PublicRoute />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                    </Route>

                    {/* Protected Routes - require valid JWT session */}
                    <Route element={<ProtectedRoute />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/company" element={<Company />} />
                      <Route path="/teams" element={<Teams />} />
                      <Route path="/teams/:teamId" element={<Teams />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/projects/:projectId" element={<Projects />} />
                      <Route path="/tasks" element={<MyTasks />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/settings" element={<Settings />} />
                    </Route>

                    {/* Standalone Invitation Verification & Acceptance Route */}
                    <Route path="/invitations/accept" element={<AcceptInvitation />} />

                    {/* Root Redirect to Dashboard (ProtectedRoute handles auth gate) */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Navigate to="/dashboard" replace />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch-all Not Found Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ToastProvider>
              </TaskProvider>
            </ProjectProvider>
          </TeamProvider>
        </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
