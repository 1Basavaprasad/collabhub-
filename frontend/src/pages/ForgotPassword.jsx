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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-mesh selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="w-full max-w-[400px] space-y-6">
        
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
              {submitted ? 'Check your email' : 'Reset your password'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {submitted
                ? 'We sent password reset instructions to your email address'
                : 'Enter your email and we will send you a recovery link'}
            </p>
          </div>
        </div>

        {/* Card Panel */}
        <div className="rounded-2xl p-6 sm:p-7 shadow-xl bg-slate-900/80 border border-slate-800 space-y-4">
          
          {submitted ? (
            /* SUBMITTED SUCCESS VIEW */
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-emerald-300 text-xs">
                <MailCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="leading-relaxed">
                  <h4 className="font-semibold text-emerald-200 text-xs">
                    Recovery email sent
                  </h4>
                  <p className="mt-0.5 text-slate-300">
                    If an account exists for <strong className="text-white font-mono">{email}</strong>, we have sent instructions.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link to="/login" className="block w-full">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowLeft}
                    iconPosition="left"
                    className="w-full text-xs"
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
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
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

              <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    className="w-full text-xs font-semibold"
                    size="md"
                  >
                    {loading ? 'Sending link...' : 'Send reset link'}
                  </Button>
                </div>
              </form>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <Link
                  to="/login"
                  className="flex items-center gap-1 font-medium text-slate-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Sign in</span>
                </Link>

                <Link
                  to="/register"
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Sign up &rarr;
                </Link>
              </div>
            </>
          )}

        </div>

        {/* Bottom Status */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
          <Server className="h-3 w-3 text-indigo-400" />
          <span>API:</span>
          <span className={healthInfo.isOnline ? 'text-emerald-400' : 'text-slate-400'}>
            {healthInfo.isOnline ? 'Connected' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
