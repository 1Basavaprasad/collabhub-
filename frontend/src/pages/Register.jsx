import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  Building2,
  Users2,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

const RequirementCheck = ({ passed, text }) => (
  <div
    className={`flex items-center gap-1.5 text-xs transition-colors duration-150 ${
      passed ? 'text-emerald-400 font-medium' : 'text-slate-500'
    }`}
  >
    <span
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
        passed
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-slate-800 text-slate-500 border border-slate-700'
      }`}
    >
      {passed ? '✓' : '•'}
    </span>
    <span>{text}</span>
  </div>
);

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

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

  const strengthLabel =
    passedCount <= 2 ? 'Weak' : passedCount <= 4 ? 'Medium' : 'Strong';

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
    if (!formData.password) {
      return 'Please enter a password.';
    }
    if (!isPasswordStrong) {
      return 'Password must meet all 5 security requirements below.';
    }
    if (!formData.confirm_password) {
      return 'Please confirm your password.';
    }
    if (formData.password !== formData.confirm_password) {
      return 'Passwords do not match. Please verify.';
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
      const response = await register({
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setSuccess(
        response.message ||
          'Account created successfully! Redirecting to sign in...'
      );

      // Redirect user to login page after short delay with prefilled email
      setTimeout(() => {
        navigate('/login', {
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
              'An account with this email or username already exists.'
          );
        } else if (err.response.status === 422) {
          setError(
            err.response.data?.detail ||
              'Validation error: Please ensure all fields are properly formatted.'
          );
        } else {
          setError(
            err.response.data?.detail ||
              'Registration failed. Please check your information and try again.'
          );
        }
      } else if (err.request) {
        setError(
          'Cannot reach the CollabHub backend server. Please verify port 8001 is active.'
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-mesh relative flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Platform Hierarchy & Value Props (5 Cols on Desktop) */}
          <div className="lg:col-span-5 space-y-7">
            {/* Brand Header */}
            <div>
              <Link to="/" className="inline-flex items-center gap-3 group">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-600/25 border border-indigo-400/30 group-hover:scale-105 transition-transform">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold tracking-tight text-white">
                    Collab<span className="text-indigo-400">Hub</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 font-mono">
                    Company Platform
                  </span>
                </div>
              </Link>

              <div className="mt-6 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Company & Team Workspace</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  One platform to manage your company teams and projects.
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  CollabHub structures your company workspace into dedicated teams, projects, and tasks with isolated multi-tenant security.
                </p>
              </div>
            </div>

            {/* Architecture Hierarchy Highlights */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Company Multi-Tenancy</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Complete data isolation between independent registered companies.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Users2 className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Teams & Projects Hierarchy</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Organize backend, frontend, and DevOps teams with project task boards.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">JWT Authenticated Access</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    FastAPI bearer token protection and bcrypt hashed credentials.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Structured Registration Card (7 Cols on Desktop) */}
          <div className="lg:col-span-7">
            <div className="glass-panel rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/60 border border-slate-800/80 space-y-5">
              
              {/* Card Header */}
              <div>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full mb-2 font-mono">
                  Get Started
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Create your CollabHub account
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Fill in your details below to activate your account
                </p>
              </div>

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
                  title="Registration Error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name & Username Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    label="Full Name"
                    required
                    autoComplete="name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Morgan"
                    icon={User}
                  />

                  <Input
                    id="username"
                    name="username"
                    type="text"
                    label="Username"
                    required
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="alexmorgan"
                    icon={AtSign}
                  />
                </div>

                {/* Email */}
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Work Email Address"
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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                  />

                  {/* Password Strength Checklist */}
                  {formData.password && (
                    <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Strength:</span>
                        <span
                          className={`font-bold font-mono ${
                            strengthLabel === 'Strong'
                              ? 'text-emerald-400'
                              : strengthLabel === 'Medium'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {strengthLabel}
                        </span>
                      </div>

                      {/* Progress bars */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              lvl <= passedCount
                                ? strengthLabel === 'Strong'
                                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                : strengthLabel === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Requirements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        <RequirementCheck
                          passed={passwordRequirements.minLength}
                          text="At least 8 characters"
                        />
                        <RequirementCheck
                          passed={passwordRequirements.uppercase}
                          text="One uppercase letter"
                        />
                        <RequirementCheck
                          passed={passwordRequirements.lowercase}
                          text="One lowercase letter"
                        />
                        <RequirementCheck
                          passed={passwordRequirements.number}
                          text="One number"
                        />
                        <RequirementCheck
                          passed={passwordRequirements.special}
                          text="One special character"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <PasswordInput
                    id="confirm_password"
                    name="confirm_password"
                    label="Confirm Password"
                    required
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                  />

                  {formData.confirm_password && (
                    <div
                      className={`mt-1.5 text-xs font-medium flex items-center gap-1.5 animate-fade-in ${
                        passwordsMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" />
                          <span>Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    id="register-submit-btn"
                    loading={loading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full"
                    size="md"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </div>
              </form>

              {/* Card Footer: Switch to Login */}
              <div className="pt-4 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Sign in &rarr;
                  </Link>
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
