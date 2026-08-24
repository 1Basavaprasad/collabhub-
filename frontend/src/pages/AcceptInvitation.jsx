import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
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
          message: 'This invitation has expired. Please ask your administrator for a new link.',
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
          <Badge variant="warning" dot size="sm">
            <Crown className="h-3 w-3 inline mr-1 text-amber-600 dark:text-amber-400" />
            OWNER
          </Badge>
        );
      case 'ADMIN':
        return (
          <Badge variant="purple" dot size="sm">
            <ShieldCheck className="h-3 w-3 inline mr-1 text-purple-600 dark:text-purple-400" />
            ADMIN
          </Badge>
        );
      case 'MEMBER':
      default:
        return (
          <Badge variant="indigo" size="sm">
            <UserCheck className="h-3 w-3 inline mr-1 text-indigo-600 dark:text-indigo-400" />
            MEMBER
          </Badge>
        );
    }
  };

  const currentRedirectUrl = encodeURIComponent(location.pathname + location.search);
  const isEmailMismatch =
    isAuthenticated &&
    invitationData?.email &&
    user?.email &&
    user.email.toLowerCase() !== invitationData.email.toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-800 dark:text-[#CBD5E1] selection:bg-indigo-500 selection:text-white bg-mesh">
      <div className="w-full max-w-md space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
              Team<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </span>
          </Link>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-8 shadow-xs space-y-4 text-center animate-pulse">
            <RefreshCw className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-200 dark:bg-[#182235] rounded mx-auto" />
              <div className="h-3 w-56 bg-slate-100 dark:bg-[#182235]/60 rounded mx-auto" />
            </div>
          </div>
        ) : successData ? (

          /* SUCCESS ACCEPTED CARD */
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-white dark:bg-[#151F32] p-6 sm:p-8 shadow-xs space-y-5 text-center animate-scale-in">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto shadow-2xs">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                Invitation accepted!
              </h2>
              <p className="text-sm text-slate-600 dark:text-[#CBD5E1]">
                Welcome to <strong className="text-slate-900 dark:text-[#F8FAFC]">{invitationData?.company_name || 'the workspace'}</strong>.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/company')}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full text-xs font-medium"
              >
                Go to Workspace
              </Button>
            </div>
          </div>
        ) : errorState ? (

          /* ERROR CARD */
          <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-[#151F32] p-6 sm:p-8 shadow-xs space-y-5 text-center animate-fade-in">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 mx-auto">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                {errorState.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                {errorState.message}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto text-xs font-medium"
              >
                Go to Dashboard
              </Button>
              {errorState.type === 'email_mismatch' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/login?redirect=${currentRedirectUrl}`)}
                  icon={LogIn}
                  className="w-full sm:w-auto text-xs font-medium"
                >
                  Switch account
                </Button>
              )}
            </div>
          </div>
        ) : invitationData ? (

          /* VALID INVITATION CARD */
          <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-white dark:bg-[#151F32] p-6 sm:p-8 shadow-xs space-y-5 animate-scale-in">
            
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-100 dark:border-[#263449]">
              <span className="text-[11px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
                You&apos;re Invited!
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                Join {invitationData.company_name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
                You&apos;ve been invited to collaborate with this organization.
              </p>
            </div>

            {/* Details Summary */}
            <div className="rounded-xl border border-slate-200/80 dark:border-[#263449] bg-slate-50/60 dark:bg-[#0F172A] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-medium">
                  <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                  Invited email
                </span>
                <span className="font-mono text-slate-900 dark:text-[#F8FAFC] font-semibold truncate max-w-[200px]">
                  {invitationData.email}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]" />
                  Role
                </span>
                <div>{renderRoleBadge(invitationData.role)}</div>
              </div>

              {invitationData.designation && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-medium">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    Designation
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">
                    {invitationData.designation}
                  </span>
                </div>
              )}

              {invitationData.department && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 font-medium">
                    <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    Department
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">
                    {invitationData.department}
                  </span>
                </div>
              )}

              {invitationData.expires_at && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-[#263449] text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires
                  </span>
                  <span>
                    {new Date(invitationData.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Email Mismatch Warning Card */}
            {isEmailMismatch && (
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-xs text-amber-900 dark:text-amber-300 space-y-2">
                <div className="font-semibold flex items-center gap-1.5 text-amber-950 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>This invitation belongs to another email address.</span>
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <p>Signed in as: <strong className="font-mono">{user?.email}</strong></p>
                  <p>Invited email: <strong className="font-mono">{invitationData.email}</strong></p>
                </div>
                <div className="pt-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => navigate(`/login?redirect=${currentRedirectUrl}`)}
                    className="w-full text-xs"
                  >
                    Switch account
                  </Button>
                </div>
              </div>
            )}

            {/* Authentication Condition & Actions */}
            {isAuthenticated ? (
              <div className="space-y-3 pt-1">
                {user && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#263449] text-xs">
                    <Avatar user={user} size="sm" variant="indigo-solid" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] block truncate">
                        {user.full_name || user.username}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono block truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleAccept}
                  loading={accepting}
                  disabled={isEmailMismatch}
                  className="w-full text-xs font-medium"
                >
                  {accepting ? 'Accepting invitation...' : 'Accept invitation'}
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
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300 text-center">
                  Continue with your TeamX account to join this workspace.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/login?redirect=${currentRedirectUrl}`)}
                    icon={LogIn}
                    className="w-full text-xs font-medium"
                  >
                    Log in
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/register?redirect=${currentRedirectUrl}`)}
                    icon={UserPlus}
                    className="w-full text-xs font-medium"
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
