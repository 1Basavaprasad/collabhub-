import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, Mail, ArrowRight, Server } from 'lucide-react';

const Login = () => {
  const { login, healthInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Success notifications if redirected after registration or password reset
  const registrationSuccess = location.state?.registered;
  const passwordResetSuccess = location.state?.passwordReset;
  const registeredEmail = location.state?.email;

  const [formData, setFormData] = useState(() => ({
    email: registeredEmail || '',
    password: '',
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !formData.password) {
      setError('Please enter both your email and password.');
      return;
    }

    setLoading(true);

    try {
      await login(trimmedEmail, formData.password);

      // Redirect to intended route or dashboard
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError(
            err.response.data?.detail ||
              'Incorrect email or password. Please verify your credentials.'
          );
        } else if (err.response.status === 422) {
          setError('Invalid email address format or missing parameters.');
        } else {
          setError(
            err.response.data?.detail || 'Sign in failed. Please try again.'
          );
        }
      } else if (err.request) {
        setError(
          'Cannot connect to the CollabHub backend. Please verify the service is running on port 8001.'
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

      {/* Main Centered Container */}
      <div className="relative z-10 w-full max-w-[440px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-600/25 border border-indigo-400/30 group-hover:scale-105 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Collab<span className="text-indigo-400">Hub</span>
            </span>
          </Link>

          <div className="pt-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Sign in to CollabHub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Enter your credentials to access your company workspace
            </p>
          </div>
        </div>

        {/* Auth Glass Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 border border-slate-800/80 space-y-5">
          
          {/* Registration Success Banner */}
          {registrationSuccess && (
            <Alert variant="success" title="Account created successfully!">
              Please sign in with your email and password to proceed.
            </Alert>
          )}

          {/* Password Reset Success Banner */}
          {passwordResetSuccess && (
            <Alert variant="success" title="Password reset complete!">
              Your password has been updated. Please sign in with your new password.
            </Alert>
          )}

          {/* Error Banner */}
          {error && (
            <Alert
              variant="error"
              title="Sign In Error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              icon={Mail}
            />

            {/* Password */}
            <div>
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-1">
              <Button
                type="submit"
                id="login-submit-btn"
                loading={loading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full"
                size="md"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Card Footer: Switch to Register */}
          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign up &rarr;
              </Link>
            </p>
          </div>

        </div>

        {/* Bottom Health / Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
          <Server className="h-3.5 w-3.5 text-indigo-400" />
          <span>FastAPI Backend (8001):</span>
          <span className={healthInfo.isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
            {healthInfo.isOnline ? 'Connected' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
