import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, ArrowRight, CheckCircle2, Server } from 'lucide-react';

const RESET_TOKEN_STORAGE_KEY = 'collabhub_reset_token';

const RequirementCheck = ({ passed, text }) => (
  <div
    className={`flex items-center gap-1.5 text-xs transition-colors ${
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

const ResetPassword = () => {
  const { resetPassword, healthInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlToken = searchParams.get('token') || '';

  const [resetToken] = useState(() => {
    if (urlToken) {
      sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, urlToken);
      return urlToken;
    }
    return sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || '';
  });

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (urlToken) {
      navigate('/reset-password', { replace: true });
    }
  }, [urlToken, navigate]);

  // Backend Password Security Requirements (auth.py)
  const passwordRequirements = {
    minLength: formData.new_password.length >= 8,
    uppercase: /[A-Z]/.test(formData.new_password),
    lowercase: /[a-z]/.test(formData.new_password),
    number: /\d/.test(formData.new_password),
    special: /[^A-Za-z0-9]/.test(formData.new_password),
  };

  const passedCount = Object.values(passwordRequirements).filter(Boolean).length;
  const isPasswordStrong = passedCount === 5;

  const passwordsMatch =
    formData.confirm_password.length > 0 &&
    formData.new_password === formData.confirm_password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!resetToken.trim()) {
      return 'Password reset link is invalid or has expired. Please request a new recovery link.';
    }
    if (!formData.new_password) {
      return 'Please enter a new password.';
    }
    if (!isPasswordStrong) {
      return 'Please ensure your new password meets all 5 security requirements below.';
    }
    if (!formData.confirm_password) {
      return 'Please confirm your new password.';
    }
    if (!passwordsMatch) {
      return 'Passwords do not match. Please verify.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await resetPassword(resetToken.trim(), formData.new_password);
      sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
      setSuccess(true);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          setError(
            err.response.data?.detail ||
              'The password reset link is invalid or has expired. Please request a new one.'
          );
        } else if (err.response.status === 422) {
          setError(
            err.response.data?.detail ||
              'Password format is invalid. Please verify all requirements are met.'
          );
        } else {
          setError(
            err.response.data?.detail ||
              'Failed to reset password. Please request a new link.'
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

  const handleContinueToLogin = () => {
    navigate('/login', { state: { passwordReset: true } });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Set your new password
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Choose a secure password for your TeamX account
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="rounded-xl p-6 sm:p-8 shadow-xs bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] space-y-4 animate-scale-in">
          
          {success ? (
            /* SUCCESS VIEW */
            <div className="space-y-4 text-center animate-fade-in py-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  Password reset successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Your credentials have been updated. You can now sign in with your new password.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleContinueToLogin}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full text-xs font-medium"
                >
                  Sign in to workspace
                </Button>
              </div>
            </div>
          ) : (
            /* FORM VIEW */
            <>
              {error && (
                <Alert
                  variant="error"
                  title="Reset error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput
                  id="new_password"
                  name="new_password"
                  label="New password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.new_password}
                  onChange={handleChange}
                  autoFocus
                />

                {/* Password Requirements */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50/70 dark:bg-[#0F172A] space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] font-mono block">
                    Security Requirements
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <RequirementCheck
                      passed={passwordRequirements.minLength}
                      text="8+ characters"
                    />
                    <RequirementCheck
                      passed={passwordRequirements.uppercase}
                      text="Uppercase (A-Z)"
                    />
                    <RequirementCheck
                      passed={passwordRequirements.lowercase}
                      text="Lowercase (a-z)"
                    />
                    <RequirementCheck
                      passed={passwordRequirements.number}
                      text="Number (0-9)"
                    />
                    <RequirementCheck
                      passed={passwordRequirements.special}
                      text="Special character"
                    />
                  </div>
                </div>

                <PasswordInput
                  id="confirm_password"
                  name="confirm_password"
                  label="Confirm new password"
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    id="reset-password-submit-btn"
                    loading={loading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full font-medium"
                    size="md"
                  >
                    {loading ? 'Updating password...' : 'Update password'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 dark:border-[#263449] text-center">
                <Link
                  to="/login"
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  &larr; Back to sign in
                </Link>
              </div>
            </>
          )}

        </div>

        {/* Bottom Status */}
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

export default ResetPassword;