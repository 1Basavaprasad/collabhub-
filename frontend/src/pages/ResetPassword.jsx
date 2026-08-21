import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, ArrowRight, CheckCircle2, ShieldCheck, Check, X, Server } from 'lucide-react';

const RESET_TOKEN_STORAGE_KEY = 'collabhub_reset_token';

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

const ResetPassword = () => {
  const { resetPassword, healthInfo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /*
   * Read token silently from URL (?token=...)
   * The token is captured internally and NEVER displayed in a visible input field.
   */
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

  /*
   * Strip token from visible URL bar if present in query parameters.
   */
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
    if (formData.new_password !== formData.confirm_password) {
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
      setSuccess(true);
      // Clean up token after successful use
      sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          setError(
            err.response.data?.detail ||
              'Invalid or expired password reset link. Please request a new reset link.'
          );
        } else if (err.response.status === 422) {
          setError(
            err.response.data?.detail ||
              'Password does not meet the required security specifications.'
          );
        } else {
          setError(
            err.response.data?.detail ||
              'Password reset failed. Please try again.'
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
      state: {
        passwordReset: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[460px] space-y-6">
        
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-semibold uppercase tracking-wider mb-2 font-mono">
              <ShieldCheck className="h-3 w-3" />
              <span>Security Terminal</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {success ? 'Password reset successfully' : 'Create new password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {success
                ? 'Your password has been updated. You can now sign in using your new password.'
                : 'Set a strong new password for your CollabHub account'}
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 border border-slate-800/80 space-y-5">
          
          {/* SUCCESS STATE */}
          {success ? (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-start gap-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-300">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
                <div className="leading-relaxed text-xs">
                  <h4 className="font-semibold text-emerald-200 text-sm">
                    Password reset successfully
                  </h4>
                  <p className="mt-1 text-slate-300">
                    Your password has been updated. You can now sign in using your new password.
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
                  className="w-full"
                >
                  Continue to Sign In
                </Button>
              </div>
            </div>
          ) : (
            /* FORM STATE */
            <>
              {/* Warning if no token exists in memory/session */}
              {!resetToken && (
                <Alert variant="warning" title="Missing Reset Token">
                  No active reset token was detected in your session. Please open the link sent to your email or request a new recovery link.
                </Alert>
              )}

              {error && (
                <Alert
                  variant="error"
                  title="Reset Error"
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
                    label="New Password"
                    required
                    autoComplete="new-password"
                    value={formData.new_password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                  />

                  {/* Password Strength Checklist */}
                  {formData.new_password && (
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
                    label="Confirm New Password"
                    required
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter your new password"
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
                    id="reset-password-submit-btn"
                    loading={loading}
                    disabled={!isPasswordStrong || !resetToken}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full"
                    size="md"
                  >
                    {loading ? 'Updating password...' : 'Reset Password'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-800/80 text-center">
                <p className="text-xs text-slate-400">
                  Remember your password?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Sign in &rarr;
                  </Link>
                </p>
              </div>
            </>
          )}

        </div>

        {/* Bottom Health Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
          <Server className="h-3.5 w-3.5 text-indigo-400" />
          <span>FastAPI Service:</span>
          <span className={healthInfo.isOnline ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
            {healthInfo.isOnline ? 'Healthy' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;