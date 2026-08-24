import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, Mail, ArrowRight, ArrowLeft, MailCheck, Server } from 'lucide-react';

const ForgotPassword = () => {
  const { forgotPassword, healthInfo } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await forgotPassword(trimmedEmail);
      setSubmitted(true);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 422) {
          setError('Invalid email address format. Please check and try again.');
        } else {
          setError(
            err.response.data?.detail ||
              'Failed to process password reset request. Please try again.'
          );
        }
      } else if (err.request) {
        setError(
          'Cannot connect to the TeamX backend. Please verify the service is active on port 8001.'
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>

          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              {submitted ? 'Check your email' : 'Reset your password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-0.5">
              {submitted
                ? 'We sent password reset instructions to your inbox'
                : 'Enter your email and we will send you a recovery link'}
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="rounded-xl p-6 sm:p-8 shadow-xs bg-white dark:bg-[#151F32] border border-slate-200/80 dark:border-[#263449] space-y-4 animate-scale-in">
          
          {submitted ? (
            /* SUBMITTED SUCCESS VIEW */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                <MailCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="leading-relaxed">
                  <h4 className="font-semibold text-emerald-950 dark:text-emerald-200">
                    Recovery link sent
                  </h4>
                  <p className="mt-1 text-slate-600 dark:text-[#CBD5E1]">
                    If an account exists for <strong className="text-slate-900 dark:text-[#F8FAFC] font-mono">{email}</strong>, we have dispatched password reset instructions.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Link to="/login" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    icon={ArrowLeft}
                    iconPosition="left"
                    className="w-full text-xs font-medium"
                  >
                    Back to sign in
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="w-full text-center text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors py-1 cursor-pointer font-medium"
                >
                  Try another email
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT VIEW */
            <>
              {error && (
                <Alert
                  variant="error"
                  title="Recovery error"
                  onClose={() => setError(null)}
                >
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Registered email address"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@company.com"
                  icon={Mail}
                  autoFocus
                />

                <div className="pt-1">
                  <Button
                    type="submit"
                    id="forgot-password-submit-btn"
                    loading={loading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full text-xs font-medium"
                    size="md"
                  >
                    {loading ? 'Sending link...' : 'Send reset link'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 dark:border-[#263449] flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
                <Link
                  to="/login"
                  className="flex items-center gap-1 font-medium text-slate-700 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to login</span>
                </Link>

                <Link
                  to="/register"
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                  Sign up &rarr;
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

export default ForgotPassword;
