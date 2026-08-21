import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Alert from '../components/Alert';
import { Layers, Mail, ArrowRight, ArrowLeft, KeyRound, MailCheck, Server } from 'lucide-react';

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
          'Cannot connect to the CollabHub backend. Please verify the service is active on port 8001.'
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold uppercase tracking-wider mb-2 font-mono">
              <KeyRound className="h-3 w-3" />
              <span>Password Recovery</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {submitted ? 'Check your email' : 'Reset your password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {submitted
                ? 'We have sent password reset instructions to your email address'
                : 'Enter your registered email and we will send you a secure recovery link'}
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 border border-slate-800/80 space-y-5">
          
          {submitted ? (
            /* SUBMITTED SUCCESS VIEW */
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-start gap-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-300">
                <MailCheck className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
                <div className="leading-relaxed text-xs">
                  <h4 className="font-semibold text-emerald-200 text-sm">
                    Recovery Link Dispatched
                  </h4>
                  <p className="mt-1 text-slate-300">
                    If an account is associated with <strong className="text-white font-mono">{email}</strong>, we have sent password reset instructions.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <Link to="/login" className="block w-full">
                  <Button
                    variant="primary"
                    size="md"
                    icon={ArrowLeft}
                    iconPosition="left"
                    className="w-full"
                  >
                    Return to Sign In
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 cursor-pointer focus:outline-none"
                >
                  Use a different email address
                </button>
              </div>
            </div>
          ) : (
            /* FORM INPUT VIEW */
            <>
              {error && (
                <Alert
                  variant="error"
                  title="Recovery Error"
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
                  label="Registered Email Address"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@company.com"
                  icon={Mail}
                  helperText="Your reset link will remain active for 15 minutes."
                />

                <div className="pt-1">
                  <Button
                    type="submit"
                    id="forgot-password-submit-btn"
                    loading={loading}
                    icon={ArrowRight}
                    iconPosition="right"
                    className="w-full"
                    size="md"
                  >
                    {loading ? 'Sending reset link...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <Link
                  to="/login"
                  className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>

                <Link
                  to="/register"
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Create account &rarr;
                </Link>
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

export default ForgotPassword;
