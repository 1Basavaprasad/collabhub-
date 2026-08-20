import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Layers, 
  Mail, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  ShieldCheck,
  KeyRound
} from 'lucide-react';

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
          setError('Invalid email format. Please check and try again.');
        } else {
          setError(err.response.data?.detail || 'Failed to request password reset. Please try again.');
        }
      } else if (err.request) {
        setError('Cannot connect to CollabHub backend. Please make sure the server is running on port 8001.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-mesh relative selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background glowing accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        
        {/* Brand header */}
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25 border border-indigo-400/30">
            <Layers className="h-8 w-8 text-white" />
          </div>
        </div>

        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Reset your <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">password</span>
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your registered email address and we&apos;ll send you instructions to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="glass-panel rounded-2xl py-8 px-6 sm:px-10 shadow-2xl shadow-black/40 border border-slate-800/80">
          
          {submitted ? (
            /* Success State */
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-emerald-300 text-sm">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-200 text-sm">Request Submitted</h3>
                  <p className="mt-1 text-xs text-emerald-300/90 leading-relaxed">
                    If an account exists with this email, you will receive instructions to reset your password.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  to="/login"
                  className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition-all"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Return to Sign In</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
                >
                  Try a different email address
                </button>
              </div>
            </div>
          ) : (
            /* Form State */
            <>
              {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-rose-300 text-xs">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-rose-200 block mb-0.5">Request Failed</span>
                    {error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="name@company.com"
                      className="block w-full rounded-xl border border-slate-700/80 bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    id="forgot-password-submit-btn"
                    disabled={loading}
                    className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending instructions...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Instructions</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
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

        {/* Backend health status badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>CollabHub FastAPI Service:</span>
          <span className={`font-mono font-medium ${healthInfo.isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
            {healthInfo.isOnline ? 'Connected (Port 8001)' : 'Checking...'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
