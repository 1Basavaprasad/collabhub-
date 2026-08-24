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

      // Safely redirect to intended route or dashboard
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      let destination = '/dashboard';

      if (
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//')
      ) {
        destination = redirectParam;
      } else if (location.state?.from?.pathname) {
        const fromState = location.state.from;
        destination = fromState.pathname + (fromState.search || '');
      }

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
          'Cannot connect to the TeamX backend. Please verify the service is running on port 8001.'
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-bold text-base group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Sign in to your account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Access your workspace and collaborate with your team
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl p-6 sm:p-8 shadow-xs bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] space-y-4 animate-scale-in">
          
          {/* Registration Success Banner */}
          {registrationSuccess && (
            <Alert variant="success" title="Account created successfully!">
              Please sign in with your credentials to enter your workspace.
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
              title="Sign in error"
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
              label="Email address"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@company.com"
              icon={Mail}
              autoFocus
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
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors focus:outline-none"
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
                className="w-full text-xs font-medium"
                size="md"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          {/* Card Footer: Switch to Register */}
          <div className="pt-4 border-t border-slate-100 dark:border-[#263449] text-center">
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Create account &rarr;
              </Link>
            </p>
          </div>

        </div>

        {/* Bottom Health Status */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-[#94A3B8] font-mono">
          <Server className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>API Connection:</span>
          <span className={healthInfo.isOnline ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
            {healthInfo.isOnline ? 'Online' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
