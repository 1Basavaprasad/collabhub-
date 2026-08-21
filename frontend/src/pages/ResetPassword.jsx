import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import {
  Layers,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

const RESET_TOKEN_STORAGE_KEY = 'collabhub_reset_token';

/*
 * Individual password requirement
 */
const PasswordRequirement = ({ passed, text }) => (
  <div
    className={`flex items-center gap-2 ${passed ? 'text-emerald-400' : 'text-slate-500'
      }`}
  >
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${passed ? 'bg-emerald-500/15' : 'bg-slate-800'
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
   * Email link:
   *
   * /reset-password?token=ABC123
   *
   * The token is read internally.
   * It is never displayed to the user.
   */
  const urlToken = searchParams.get('token') || '';

  const [resetToken, setResetToken] = useState(() => {
    if (urlToken) {
      return urlToken;
    }

    return sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || '';
  });

  const [formData, setFormData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /*
   * Password requirements
   *
   * These match the backend rules:
   *
   * 8+ characters
   * Uppercase
   * Lowercase
   * Number
   * Special character
   */
  const passwordRequirements = {
    minLength: formData.new_password.length >= 8,
    uppercase: /[A-Z]/.test(formData.new_password),
    lowercase: /[a-z]/.test(formData.new_password),
    number: /\d/.test(formData.new_password),
    special: /[^A-Za-z0-9]/.test(formData.new_password),
  };

  const passedRequirements = Object.values(passwordRequirements).filter(
    Boolean
  ).length;

  const passwordStrength =
    passedRequirements <= 2
      ? 'Weak'
      : passedRequirements <= 4
        ? 'Medium'
        : 'Strong';

  const passwordIsStrong = passedRequirements === 5;

  /*
   * Read token from email URL.
   *
   * Then remove the token from the visible URL.
   */
  useEffect(() => {
    if (urlToken) {
      sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, urlToken);
      setResetToken(urlToken);

      navigate('/reset-password', {
        replace: true,
      });
    }
  }, [urlToken, navigate]);

  /*
   * Handle password input changes.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) {
      setError(null);
    }
  };

  /*
   * Validate the form before sending to backend.
   */
  const validateForm = () => {
    if (!resetToken.trim()) {
      return 'Password reset link is invalid or missing. Please request a new password reset link.';
    }

    if (!formData.new_password) {
      return 'Please enter a new password.';
    }

    if (!passwordIsStrong) {
      return 'Please choose a stronger password that meets all the requirements.';
    }

    if (!formData.confirm_password) {
      return 'Please confirm your new password.';
    }

    if (formData.new_password !== formData.confirm_password) {
      return 'Passwords do not match. Please verify.';
    }

    return null;
  };

  /*
   * Submit new password.
   */
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
      /*
       * Token is stored internally.
       * It is never taken from a visible input.
       */
      const response = await resetPassword(
        resetToken.trim(),
        formData.new_password
      );

      /*
       * Password reset successful.
       */
      setSuccess(true);

      /*
       * Remove the token after successful use.
       */
      sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);

      console.log(
        response?.message || 'Password reset successfully'
      );
    } catch (err) {
      if (err.response) {
        if (err.response.status === 400) {
          setError(
            err.response.data?.detail ||
            'Invalid or expired password reset link. Please request a new one.'
          );
        } else if (err.response.status === 422) {
          setError(
            err.response.data?.detail ||
            'Password does not meet the required security rules.'
          );
        } else {
          setError(
            err.response.data?.detail ||
            'Password reset failed. Please try again.'
          );
        }
      } else if (err.request) {
        setError(
          'Cannot connect to CollabHub backend. Please make sure the server is running on port 8001.'
        );
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * Navigate to login.
   */
  const handleContinueToLogin = () => {
    navigate('/login', {
      state: {
        passwordReset: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-mesh relative selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* Background accents */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
            <Layers className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          {success ? (
            <>
              Password{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                reset
              </span>
            </>
          ) : (
            <>
              Create new{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                password
              </span>
            </>
          )}
        </h2>

        <p className="mt-2 text-center text-sm text-slate-400">
          {success
            ? 'Your CollabHub password has been updated successfully'
            : 'Enter a strong new password to secure your CollabHub account'}
        </p>
      </div>

      {/* Main card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">

        <div className="glass-panel rounded-2xl py-8 px-6 sm:px-10 shadow-2xl shadow-black/40 border border-slate-800/80">

          {/* SUCCESS STATE */}
          {success ? (
            <div className="animate-fadeIn">

              {/* Success message */}
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-5 text-emerald-300">

                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />

                <div className="leading-relaxed">

                  <span className="font-semibold text-emerald-200 block mb-1">
                    Password reset successful!
                  </span>

                  <span className="text-sm text-emerald-300">
                    Your password has been updated successfully.
                    You can now sign in with your new password.
                  </span>

                </div>

              </div>

              {/* Continue button */}
              <button
                type="button"
                onClick={handleContinueToLogin}
                className="group mt-5 flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all duration-200 cursor-pointer"
              >
                <span>Continue to Sign In</span>

                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

            </div>
          ) : (
            <>
              {/* ERROR MESSAGE */}
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-rose-300 text-xs">

                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />

                  <div className="leading-relaxed">

                    <span className="font-semibold text-rose-200 block mb-0.5">
                      Reset Error
                    </span>

                    {error}

                  </div>

                </div>
              )}

              {/* PASSWORD FORM */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* New Password */}
                <div>

                  <label
                    htmlFor="new_password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    New Password
                  </label>

                  <div className="relative rounded-xl shadow-sm">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>

                    <input
                      id="new_password"
                      name="new_password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.new_password}
                      onChange={handleChange}
                      placeholder="Create a strong password"
                      className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-10 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                  </div>

                  {/* PASSWORD STRENGTH */}
                  {formData.new_password && (
                    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">

                      {/* Strength title */}
                      <div className="flex items-center justify-between mb-2">

                        <span className="text-xs font-semibold text-slate-300">
                          Password strength
                        </span>

                        <span
                          className={`text-xs font-bold ${passwordStrength === 'Strong'
                              ? 'text-emerald-400'
                              : passwordStrength === 'Medium'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                        >
                          {passwordStrength}
                        </span>

                      </div>

                      {/* Strength bar */}
                      <div className="flex gap-1 mb-3">

                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${level <= passedRequirements
                                ? passwordStrength === 'Strong'
                                  ? 'bg-emerald-500'
                                  : passwordStrength === 'Medium'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                : 'bg-slate-700'
                              }`}
                          />
                        ))}

                      </div>

                      {/* Requirements */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">

                        <PasswordRequirement
                          passed={passwordRequirements.minLength}
                          text="8+ characters"
                        />

                        <PasswordRequirement
                          passed={passwordRequirements.uppercase}
                          text="Uppercase letter"
                        />

                        <PasswordRequirement
                          passed={passwordRequirements.lowercase}
                          text="Lowercase letter"
                        />

                        <PasswordRequirement
                          passed={passwordRequirements.number}
                          text="Number"
                        />

                        <PasswordRequirement
                          passed={passwordRequirements.special}
                          text="Special character"
                        />

                      </div>

                    </div>
                  )}

                </div>

                {/* Confirm Password */}
                <div>

                  <label
                    htmlFor="confirm_password"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative rounded-xl shadow-sm">

                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>

                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="Re-enter your new password"
                      className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-10 pr-11 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                      aria-label={
                        showConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                  </div>

                  {/* Password match indicator */}
                  {formData.confirm_password && (
                    <div
                      className={`mt-2 text-xs font-medium ${formData.new_password ===
                          formData.confirm_password
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                        }`}
                    >
                      {formData.new_password ===
                        formData.confirm_password
                        ? '✓ Passwords match'
                        : '✗ Passwords do not match'}
                    </div>
                  )}

                </div>

                {/* Reset button */}
                <div className="pt-2">

                  <button
                    type="submit"
                    id="reset-password-submit-btn"
                    disabled={loading || !passwordIsStrong}
                    className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >

                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Resetting password...</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}

                  </button>

                  {!passwordIsStrong && formData.new_password && (
                    <p className="mt-2 text-center text-[11px] text-slate-500">
                      Complete all password requirements to continue.
                    </p>
                  )}

                </div>

              </form>

              {/* Back to login */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">

                <p className="text-xs text-slate-400">

                  Remember your password?{' '}

                  <Link
                    to="/login"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors underline-offset-4 hover:underline"
                  >
                    Sign in &rarr;
                  </Link>

                </p>

              </div>
            </>
          )}

        </div>

        {/* Backend health */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">

          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />

          <span>CollabHub FastAPI Service:</span>

          <span
            className={`font-mono font-medium ${healthInfo.isOnline
                ? 'text-emerald-400'
                : 'text-slate-400'
              }`}
          >
            {healthInfo.isOnline
              ? 'Connected (Port 8001)'
              : 'Checking...'}
          </span>

        </div>

      </div>

    </div>
  );
};

export default ResetPassword;