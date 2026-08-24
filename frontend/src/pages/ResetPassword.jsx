import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, ArrowRight, CheckCircle2, Check, X, Server } from 'lucide-react';

const RESET_TOKEN_STORAGE_KEY = 'collabhub_reset_token';

const RequirementCheck = ({ passed, text }) => (
  <div
    className={`flex items-center gap-1.5 text-xs transition-colors ${
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

  const strengthLabel =
    passedCount <= 2 ? 'Weak' : passedCount <= 4 ? 'Medium' : 'Strong';

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
          'Cannot connect to the CollabHub backend. Please verify port 8001 is active.'
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToLogin = () => {
    navigate('/login', {
      state: { passwordReset: true },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="w-full max-w-[420px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-sm">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Collab<span className="text-indigo-400">Hub</span>
            </span>
          </Link>

          <div className="pt-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {success ? 'Password reset complete' : 'Choose a new password'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {success
                ? 'Your password has been updated securely.'
                : 'Create a new secure password for your CollabHub account.'}
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="rounded-2xl p-6 sm:p-7 shadow-xl bg-slate-900/80 border border-slate-800 space-y-4">
          
          {/* SUCCESS STATE */}
          {success ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-emerald-300 text-xs">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="leading-relaxed">
                  <h4 className="font-semibold text-emerald-200 text-xs">
                    Password reset successfully
                  </h4>
                  <p className="mt-0.5 text-slate-300">
                    You can now sign in to your workspace using your new password.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleContinueToLogin}
                  icon={ArrowRight}
                  iconPosition="right"
                  className="w-full text-xs font-semibold"
                >
                  Continue to sign in
                </Button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <>
              {!resetToken && (
                <Alert variant="warning" title="Missing reset token">
                  No active reset token was detected in your session. Please open the link sent to your email.
                </Alert>
              )}

              {error && (
                <Alert
                  variant="error"
                  title="Reset error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* New Password */}
                <div>
                  <PasswordInput
                    id="new_password"
                    name="new_password"
                    label="New password"
                    required
                    autoComplete="new-password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    autoFocus
                  />

                  {/* Password Strength Checklist */}
                  {formData.new_password && (
                    <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Strength:</span>
                        <span
                          className={`font-semibold font-mono ${
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
                                ? 'bg-emerald-500'
                                : strengthLabel === 'Medium'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Requirements Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                        <RequirementCheck
                          passed={passwordRequirements.minLength}
                          text="8+ characters"
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
                    label="Confirm password"
                    required
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                  />

                  {formData.confirm_password && (
                    <div
                      className={`mt-1 text-xs font-medium flex items-center gap-1.5 animate-fade-in ${
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
                <div className="pt-1">
                  <Button
                    type="submit"
                    id="reset-password-submit-btn"
                    loading={loading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full text-xs font-semibold"
                    size="md"
                  >
                    {loading ? 'Updating password...' : 'Update password'}
                  </Button>
                </div>
              </form>

              <div className="pt-3 border-t border-slate-800 text-center">
                <Link
                  to="/login"
                  className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  &larr; Back to sign in
                </Link>
              </div>
            </>
          )}

        </div>

        {/* Bottom Health Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
          <Server className="h-3 w-3 text-indigo-400" />
          <span>API Status:</span>
          <span className={healthInfo.isOnline ? 'text-emerald-400' : 'text-slate-400'}>
            {healthInfo.isOnline ? 'Connected' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;