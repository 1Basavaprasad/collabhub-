import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Alert from '../components/Alert';
import {
  Layers,
  User,
  AtSign,
  Mail,
  ArrowRight,
  Server,
} from 'lucide-react';

const RequirementCheck = ({ passed, text }) => (
  <div
    className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
      passed ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-400 dark:text-[#64748B]'
    }`}
  >
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        passed
          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
          : 'bg-slate-100 dark:bg-[#1B263A] text-slate-400 dark:text-[#64748B] border border-slate-200 dark:border-[#263449]'
      }`}
    >
      {passed ? '✓' : '•'}
    </span>
    <span>{text}</span>
  </div>
);

const Register = () => {
  const { register, healthInfo } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 5 Backend Password Security Rules (auth.py)
  const passwordRequirements = {
    minLength: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const passedCount = Object.values(passwordRequirements).filter(Boolean).length;
  const isPasswordStrong = passedCount === 5;

  const passwordsMatch =
    formData.confirm_password.length > 0 &&
    formData.password === formData.confirm_password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      return 'Please enter your full name.';
    }
    if (!formData.username.trim()) {
      return 'Please choose a username.';
    }
    if (formData.username.trim().length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (!formData.email.trim()) {
      return 'Please enter your email address.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!isPasswordStrong) {
      return 'Password does not meet all security complexity requirements.';
    }
    if (!formData.confirm_password) {
      return 'Please confirm your password.';
    }
    if (formData.password !== formData.confirm_password) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess('Account created successfully! Redirecting to sign in...');

      setTimeout(() => {
        const loginUrl = redirectParam
          ? `/login?redirect=${encodeURIComponent(redirectParam)}`
          : '/login';
        navigate(loginUrl, {
          state: {
            registered: true,
            email: formData.email.trim(),
          },
        });
      }, 1400);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 409) {
          setError(
            err.response.data?.detail ||
              'A user with this username or email already exists.'
          );
        } else if (err.response.status === 422) {
          setError(
            err.response.data?.detail ||
              'Please verify all form fields meet requirements.'
          );
        } else {
          setError(
            err.response.data?.detail ||
              'Registration failed. Please try again.'
          );
        }
      } else if (err.request) {
        setError(
          'Cannot connect to the TeamX backend. Please verify port 8001 is active.'
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
      <div className="w-full max-w-lg space-y-6">
        
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
              Create your TeamX account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Get started with enterprise workspace collaboration
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl p-6 sm:p-8 shadow-xs bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] space-y-4 animate-scale-in">
          
          {/* Success Banner */}
          {success && (
            <Alert variant="success" title="Account created!">
              {success}
            </Alert>
          )}

          {/* Error Banner */}
          {error && (
            <Alert
              variant="error"
              title="Registration error"
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <Input
                id="full_name"
                name="full_name"
                label="Full name"
                required
                placeholder="Jane Doe"
                value={formData.full_name}
                onChange={handleChange}
                icon={User}
                autoFocus
              />

              {/* Username */}
              <Input
                id="username"
                name="username"
                label="Username"
                required
                placeholder="janedoe"
                value={formData.username}
                onChange={handleChange}
                icon={AtSign}
              />
            </div>

            {/* Email */}
            <Input
              id="email"
              name="email"
              type="email"
              label="Work email address"
              required
              autoComplete="email"
              placeholder="jane@company.com"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
            />

            {/* Password */}
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />

            {/* Live 5-Rule Password Checklist */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50/70 dark:bg-[#0F172A] space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] font-mono block">
                Password Requirements
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <RequirementCheck
                  passed={passwordRequirements.minLength}
                  text="At least 8 characters"
                />
                <RequirementCheck
                  passed={passwordRequirements.uppercase}
                  text="One uppercase letter (A-Z)"
                />
                <RequirementCheck
                  passed={passwordRequirements.lowercase}
                  text="One lowercase letter (a-z)"
                />
                <RequirementCheck
                  passed={passwordRequirements.number}
                  text="One numerical digit (0-9)"
                />
                <RequirementCheck
                  passed={passwordRequirements.special}
                  text="One special character (!@#...)"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              label="Confirm password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.confirm_password}
              onChange={handleChange}
              error={
                formData.confirm_password && !passwordsMatch
                  ? 'Passwords do not match.'
                  : undefined
              }
            />

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                id="register-submit-btn"
                loading={loading}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full font-medium"
                size="md"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>
          </form>

          {/* Switch to Login */}
          <div className="pt-4 border-t border-slate-100 dark:border-[#263449] text-center">
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Already have an account?{' '}
              <Link
                to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Sign in &rarr;
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

export default Register;
