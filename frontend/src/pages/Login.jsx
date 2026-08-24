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
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get('redirect');
      const destination = redirectParam || location.state?.from?.pathname || '/dashboard';
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="w-full max-w-[400px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm font-bold text-sm">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Collab<span className="text-indigo-400">Hub</span>
            </span>
          </Link>

          <div className="pt-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Sign in to your account
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Access your company workspaces and collaborate
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl p-6 sm:p-7 shadow-xl bg-slate-900/80 border border-slate-800 space-y-4">
          
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
              title="Sign in error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
              <div className="flex justify-end mt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none"
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
                className="w-full text-xs font-semibold"
                size="md"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          {/* Card Footer: Switch to Register */}
          <div className="pt-3 border-t border-slate-800 text-center">
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
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
          <Server className="h-3 w-3 text-indigo-400" />
          <span>API Connection:</span>
          <span className={healthInfo.isOnline ? 'text-emerald-400' : 'text-slate-400'}>
            {healthInfo.isOnline ? 'Online' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
