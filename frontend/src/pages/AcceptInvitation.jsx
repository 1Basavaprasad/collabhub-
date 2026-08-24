import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Button from '../components/Button';
import Alert from '../components/Alert';
import {
  Building2,
  Mail,
  ShieldCheck,
  Crown,
  UserCheck,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogIn,
  UserPlus,
  RefreshCw,
  Layers,
} from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tokenFromUrl = searchParams.get('token') || '';

  const { user, isAuthenticated } = useAuth();
  const { verifyInvitation, acceptInvitation } = useCompany();

  const [invitationData, setInvitationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [successData, setSuccessData] = useState(null);

  const loadInvitation = useCallback(async () => {
    if (!tokenFromUrl) {
      setErrorState({
        type: 'missing_token',
        title: 'Missing invitation link',
        message: 'No invitation token was found in your link. Please check the URL you received.',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorState(null);

    try {
      const data = await verifyInvitation(tokenFromUrl);
      setInvitationData(data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 410) {
        setErrorState({
          type: 'expired',
          title: 'Invitation expired',
          message: 'This invitation is no longer valid. Please contact your company administrator to request a new invitation.',
        });
      } else if (status === 404) {
        setErrorState({
          type: 'not_found',
          title: 'Invitation not found',
          message: detail || 'This invitation link is invalid or has already been accepted.',
        });
      } else {
        setErrorState({
          type: 'error',
          title: 'Unable to load invitation',
          message: detail || 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [tokenFromUrl, verifyInvitation]);

  useEffect(() => {
    loadInvitation();
  }, [loadInvitation]);

  const handleAccept = async () => {
    if (!tokenFromUrl || accepting) return;

    setAccepting(true);
    setErrorState(null);

    try {
      const result = await acceptInvitation(tokenFromUrl);
      setSuccessData(result);
      setTimeout(() => {
        navigate('/company');
      }, 2000);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 403) {
        setErrorState({
          type: 'email_mismatch',
          title: 'Email mismatch',
          message: detail || `This invitation was sent to ${invitationData?.email}, but you are signed in as ${user?.email}. Please sign in with the invited account.`,
        });
      } else if (status === 400) {
        setErrorState({
          type: 'already_member',
          title: 'Already a member',
          message: detail || 'You are already a member of this workspace.',
        });
      } else if (status === 410) {
        setErrorState({
          type: 'expired',
          title: 'Invitation expired',
          message: 'This invitation has expired.',
        });
      } else {
        setErrorState({
          type: 'error',
          title: 'Unable to accept invitation',
          message: detail || 'Could not accept the invitation. Please try again.',
        });
      }
    } finally {
      setAccepting(false);
    }
  };

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
            <Crown className="h-3 w-3 text-amber-400" />
            OWNER
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
            <ShieldCheck className="h-3 w-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'MEMBER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
            <UserCheck className="h-3 w-3 text-indigo-400" />
            MEMBER
          </span>
        );
    }
  };

  const currentRedirectUrl = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 bg-mesh">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-sm">
              <Layers className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Collab<span className="text-indigo-400">Hub</span>
            </span>
          </Link>
        </div>

        {/* LOADING SKELETON */}
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl space-y-4 text-center animate-pulse">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-800 rounded mx-auto" />
              <div className="h-3 w-56 bg-slate-800/60 rounded mx-auto" />
            </div>
          </div>
        ) : successData ? (

          /* SUCCESS CARD */
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 sm:p-8 shadow-xl space-y-4 text-center animate-fade-in">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Welcome to {invitationData?.company_name || 'the team'}!
              </h2>
              <p className="text-xs text-slate-300">
                You have joined the workspace. Redirecting to company portal...
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/company')}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full text-xs"
              >
                Go to Workspace
              </Button>
            </div>
          </div>
        ) : errorState ? (

          /* ERROR CARD */
          <div className="rounded-2xl border border-rose-500/30 bg-slate-900/80 p-6 sm:p-8 shadow-xl space-y-4 text-center animate-fade-in">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {errorState.title}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {errorState.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto text-xs"
              >
                Go to Dashboard
              </Button>
              {errorState.type === 'email_mismatch' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/login?redirect=${currentRedirectUrl}`)}
                  icon={LogIn}
                  className="w-full sm:w-auto text-xs"
                >
                  Switch account
                </Button>
              )}
            </div>
          </div>
        ) : invitationData ? (

          /* VALID INVITATION CARD */
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 shadow-xl space-y-5 animate-fade-in">
            
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Workspace Invitation
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Join {invitationData.company_name}
              </h2>
              <p className="text-xs text-slate-400">
                You&apos;ve been invited to collaborate with this workspace.
              </p>
            </div>

            {/* Details Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-500" />
                  Invited email
                </span>
                <span className="font-mono text-slate-200 font-medium truncate max-w-[200px]">
                  {invitationData.email}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-slate-500" />
                  Role
                </span>
                <div>{renderRoleBadge(invitationData.role)}</div>
              </div>

              {invitationData.designation && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 text-indigo-400" />
                    Designation
                  </span>
                  <span className="font-medium text-slate-200">
                    {invitationData.designation}
                  </span>
                </div>
              )}

              {invitationData.department && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3 text-purple-400" />
                    Department
                  </span>
                  <span className="font-medium text-slate-200">
                    {invitationData.department}
                  </span>
                </div>
              )}

              {invitationData.expires_at && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires
                  </span>
                  <span className="font-mono">
                    {new Date(invitationData.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Authentication Condition & Actions */}
            {isAuthenticated ? (
              <div className="space-y-2.5 pt-1">
                {user?.email.toLowerCase() !== invitationData.email.toLowerCase() && (
                  <Alert variant="warning" title="Signed in with a different email">
                    You are signed in as <span className="font-semibold">{user?.email}</span>. This invitation was addressed to <span className="font-semibold">{invitationData.email}</span>.
                  </Alert>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAccept}
                  loading={accepting}
                  className="w-full text-xs font-semibold"
                >
                  Accept invitation
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-xs"
                >
                  Decline & go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <Alert variant="info" title="Authentication required">
                  Please log in or create an account with <span className="font-semibold">{invitationData.email}</span> to accept this invitation.
                </Alert>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/login?redirect=${currentRedirectUrl}`)}
                    icon={LogIn}
                    className="w-full text-xs"
                  >
                    Sign in to accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/register?redirect=${currentRedirectUrl}`)}
                    icon={UserPlus}
                    className="w-full text-xs"
                  >
                    Create account
                  </Button>
                </div>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};

export default AcceptInvitation;
