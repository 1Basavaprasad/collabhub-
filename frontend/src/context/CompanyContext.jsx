/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import {
  getMyCompanyApi,
  getMyCompaniesListApi,
  getCompanyByIdApi,
  createCompanyApi,
  updateCompanyApi,
  getCompanyMembersApi,
  createCompanyMemberApi,
  updateCompanyMemberApi,
  createCompanyInvitationApi,
  getCompanyInvitationsApi,
  revokeCompanyInvitationApi,
  verifyCompanyInvitationApi,
  acceptCompanyInvitationApi,
} from '../api/companyApi';

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load members for a given company ID
  const loadCompanyMembers = useCallback(async (targetCompanyId) => {
    if (!targetCompanyId) {
      setMembers([]);
      return [];
    }

    setMembersLoading(true);
    try {
      const memberList = await getCompanyMembersApi(targetCompanyId);
      const safeList = Array.isArray(memberList) ? memberList : [];
      setMembers(safeList);
      return safeList;
    } catch (err) {
      console.error('Failed to load company members:', err);
      setMembers([]);
      return [];
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Load invitations for a given company ID (OWNER/ADMIN only)
  const loadCompanyInvitations = useCallback(async (targetCompanyId) => {
    if (!targetCompanyId) {
      setInvitations([]);
      setInvitationsError(null);
      return [];
    }

    setInvitationsLoading(true);
    setInvitationsError(null);
    try {
      const invList = await getCompanyInvitationsApi(targetCompanyId);
      const safeList = Array.isArray(invList) ? invList : [];
      setInvitations(safeList);
      return safeList;
    } catch (err) {
      // 403 Forbidden is expected for MEMBERs
      if (err.response && err.response.status === 403) {
        setInvitations([]);
        return [];
      }
      console.error('Failed to load company invitations:', err);
      const msg = err.response?.data?.detail || err.message || 'Unable to load invitations.';
      setInvitationsError(msg);
      setInvitations([]);
      return [];
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // Fetch the authenticated user's company, all memberships, and invitations
  const fetchCompany = useCallback(async () => {
    if (!token) {
      setCompany(null);
      setCompanies([]);
      setMembers([]);
      setInvitations([]);
      setInvitationsError(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch active/first company
      const activeData = await getMyCompanyApi();
      setCompany(activeData);

      // 2. Fetch all user companies in background
      try {
        const listData = await getMyCompaniesListApi();
        setCompanies(Array.isArray(listData) && listData.length > 0 ? listData : (activeData ? [activeData] : []));
      } catch {
        setCompanies(activeData ? [activeData] : []);
      }

      // 3. Load members & invitations for active company
      if (activeData?.id) {
        try {
          setMembersLoading(true);
          const memberList = await getCompanyMembersApi(activeData.id);
          setMembers(Array.isArray(memberList) ? memberList : []);
        } catch {
          setMembers([]);
        } finally {
          setMembersLoading(false);
        }

        try {
          setInvitationsLoading(true);
          setInvitationsError(null);
          const invList = await getCompanyInvitationsApi(activeData.id);
          setInvitations(Array.isArray(invList) ? invList : []);
        } catch (err) {
          if (err.response && err.response.status === 403) {
            setInvitations([]);
          } else {
            const msg = err.response?.data?.detail || err.message || 'Unable to load invitations.';
            setInvitationsError(msg);
            setInvitations([]);
          }
        } finally {
          setInvitationsLoading(false);
        }
      }

      return activeData;
    } catch (err) {
      // 404 indicates the user has not created or joined a company yet
      if (err.response && err.response.status === 404) {
        setCompany(null);
        setCompanies([]);
        setMembers([]);
        setInvitations([]);
        setInvitationsError(null);
        return null;
      }

      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to fetch company information.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load a specific company by ID
  const loadCompany = async (companyId) => {
    try {
      const data = await getCompanyByIdApi(companyId);
      setCompany(data);
      await loadCompanyMembers(companyId);
      await loadCompanyInvitations(companyId);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to load company.';
      setError(errorMessage);
      throw err;
    }
  };

  // Create a company for the authenticated user
  const createCompany = async (formData) => {
    setError(null);
    try {
      const newCompany = await createCompanyApi(formData);
      setCompany(newCompany);
      setCompanies((prev) => [...prev, newCompany]);
      if (newCompany?.id) {
        await loadCompanyMembers(newCompany.id);
        await loadCompanyInvitations(newCompany.id);
      }
      return newCompany;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to create company.';
      setError(errorMessage);
      throw err;
    }
  };

  // Update company information
  const updateCompany = async (formData) => {
    if (!company?.id) {
      throw new Error('No active company to update.');
    }

    setError(null);
    try {
      const updated = await updateCompanyApi(company.id, formData);
      setCompany(updated);
      setCompanies((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      return updated;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to update company.';
      setError(errorMessage);
      throw err;
    }
  };

  // Send invitation to a member
  const sendCompanyInvitation = async ({ email, role, designation, department }) => {
    if (!company?.id) {
      throw new Error('No active company to send invitation for.');
    }

    setError(null);
    setInvitationLoading(true);
    try {
      const invitation = await createCompanyInvitationApi(company.id, {
        email,
        role,
        designation,
        department,
      });
      // Refresh invitations list
      await loadCompanyInvitations(company.id);
      return invitation;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to create company invitation.';
      setError(errorMessage);
      throw err;
    } finally {
      setInvitationLoading(false);
    }
  };

  // Revoke an invitation
  const revokeInvitation = async (invitationId) => {
    if (!company?.id) {
      throw new Error('No active company.');
    }

    try {
      const revoked = await revokeCompanyInvitationApi(company.id, invitationId);
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitationId ? revoked : inv))
      );
      return revoked;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to revoke invitation.';
      throw new Error(errorMessage);
    }
  };

  // Verify an invitation token
  const verifyInvitation = async (rawToken) => {
    return await verifyCompanyInvitationApi(rawToken);
  };

  // Accept an invitation token
  const acceptInvitation = async (rawToken) => {
    const result = await acceptCompanyInvitationApi(rawToken);
    // Reload companies after acceptance
    await fetchCompany();
    return result;
  };

  // Add a member directly (OWNER/ADMIN only)
  const addCompanyMember = async ({ user_id, role, designation, department }) => {
    if (!company?.id) {
      throw new Error('No active company to add member to.');
    }

    setError(null);
    try {
      const newMember = await createCompanyMemberApi(company.id, {
        user_id,
        role,
        designation,
        department,
      });
      await loadCompanyMembers(company.id);
      return newMember;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to add company member.';
      setError(errorMessage);
      throw err;
    }
  };

  // Update member role, designation, or department
  const updateCompanyMember = async (userId, { role, designation, department }) => {
    if (!company?.id) {
      throw new Error('No active company to update member for.');
    }

    setError(null);
    try {
      const updated = await updateCompanyMemberApi(company.id, userId, {
        role,
        designation,
        department,
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === userId || m.user?.id === userId
            ? { ...m, ...updated, user: m.user || updated.user }
            : m
        )
      );
      return updated;
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Failed to update member.';
      setError(errorMessage);
      throw err;
    }
  };

  // Select an active company from user's companies list
  const selectCompany = async (selectedCompany) => {
    if (selectedCompany && selectedCompany.id) {
      setCompany(selectedCompany);
      await loadCompanyMembers(selectedCompany.id);
      await loadCompanyInvitations(selectedCompany.id);
    }
  };

  // Determine current user's membership and permissions in the active company
  const currentUserMembership = useMemo(() => {
    if (!user?.id || !Array.isArray(members) || members.length === 0) return null;
    return members.find((m) => m.user_id === user.id || m.user?.id === user.id) || null;
  }, [user?.id, members]);

  const currentUserRole = currentUserMembership?.role || 'MEMBER';
  const isOwner = currentUserRole === 'OWNER';
  const isAdmin = currentUserRole === 'ADMIN';
  const isMember = currentUserRole === 'MEMBER';
  const canManageCompany = isOwner || isAdmin;
  const canInviteMembers = isOwner || isAdmin;
  const canEditMembers = isOwner || isAdmin;

  // Fetch company whenever auth status or token changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCompany();
    } else {
      setCompany(null);
      setCompanies([]);
      setMembers([]);
      setInvitations([]);
      setInvitationsError(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, fetchCompany]);

  const value = {
    company,
    companies,
    members,
    invitations,
    currentUserMembership,
    currentUserRole,
    isOwner,
    isAdmin,
    isMember,
    canManageCompany,
    canInviteMembers,
    canEditMembers,
    hasCompany: Boolean(company),
    loading,
    membersLoading,
    invitationsLoading,
    invitationsError,
    invitationLoading,
    error,
    fetchCompany,
    loadCompany,
    loadCompanies: fetchCompany,
    loadCompanyMembers,
    loadCompanyInvitations,
    createCompany,
    updateCompany,
    sendCompanyInvitation,
    revokeInvitation,
    verifyInvitation,
    acceptInvitation,
    addCompanyMember,
    updateCompanyMember,
    selectCompany,
    clearError: () => setError(null),
    clearInvitationsError: () => setInvitationsError(null),
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export default CompanyContext;
