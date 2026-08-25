/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCompany } from './CompanyContext';
import {
  getCompanyTeamsApi,
  getTeamApi,
  createTeamApi,
  updateTeamApi,
  archiveTeamApi,
  restoreTeamApi,
  deleteTeamApi,
  batchAddTeamMembersApi,
  transferTeamLeadershipApi,
  addTeamMemberApi,
  updateTeamMemberApi,
  removeTeamMemberApi,
  getTeamActivityApi,
} from '../api/teamApi';

const TeamContext = createContext(null);

export const TeamProvider = ({ children }) => {
  const { company } = useCompany();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamActivities, setTeamActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamDetailLoading, setTeamDetailLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [myTeamsFilter, setMyTeamsFilter] = useState(false);

  // Load all teams for active company
  const loadTeams = useCallback(
    async (params = {}) => {
      if (!company?.id) {
        setTeams([]);
        return [];
      }

      const activeStatus = params.status !== undefined ? params.status : statusFilter;
      const activeMyTeams = params.my_teams !== undefined ? params.my_teams : myTeamsFilter;

      setLoading(true);
      setError(null);
      try {
        const data = await getCompanyTeamsApi(company.id, {
          status: activeStatus,
          my_teams: activeMyTeams,
          ...params,
        });
        const safeData = Array.isArray(data) ? data : (data?.items || []);
        setTeams(safeData);
        return data;
      } catch (err) {
        console.error('Failed to load teams:', err);
        const msg = err.response?.data?.detail || 'Unable to load workspace teams.';
        setError(msg);
        setTeams([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [company?.id, statusFilter, myTeamsFilter]
  );

  // Load team details with members
  const loadTeam = useCallback(
    async (teamId) => {
      if (!company?.id || !teamId) {
        setSelectedTeam(null);
        return null;
      }

      setTeamDetailLoading(true);
      setError(null);
      try {
        const data = await getTeamApi(company.id, teamId);
        setSelectedTeam(data);
        return data;
      } catch (err) {
        console.error('Failed to load team details:', err);
        const msg = err.response?.data?.detail || 'Unable to load team details.';
        setError(msg);
        return null;
      } finally {
        setTeamDetailLoading(false);
      }
    },
    [company?.id]
  );

  // Load team activity log
  const loadTeamActivity = useCallback(
    async (teamId, params = {}) => {
      if (!company?.id || !teamId) {
        setTeamActivities([]);
        return [];
      }

      setActivityLoading(true);
      try {
        const data = await getTeamActivityApi(company.id, teamId, params);
        const safeData = Array.isArray(data) ? data : (data?.items || []);
        setTeamActivities(safeData);
        return data;
      } catch (err) {
        console.error('Failed to load team activity:', err);
        setTeamActivities([]);
        return [];
      } finally {
        setActivityLoading(false);
      }
    },
    [company?.id]
  );

  // Create team
  const createTeam = useCallback(
    async (teamData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const newTeam = await createTeamApi(company.id, teamData);
        setTeams((prev) => [...prev, newTeam]);
        return newTeam;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to create team.';
        throw new Error(msg);
      }
    },
    [company?.id]
  );

  // Update team
  const updateTeam = useCallback(
    async (teamId, teamData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const updated = await updateTeamApi(company.id, teamId, teamData);
        setTeams((prev) => prev.map((t) => (t.id === teamId ? { ...t, ...updated } : t)));
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({ ...prev, ...updated }));
        }
        return updated;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to update team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Archive team
  const archiveTeam = useCallback(
    async (teamId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const res = await archiveTeamApi(company.id, teamId);
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, is_archived: true } : t))
        );
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({ ...prev, is_archived: true }));
        }
        return res;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to archive team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Restore team
  const restoreTeam = useCallback(
    async (teamId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const res = await restoreTeamApi(company.id, teamId);
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? { ...t, is_archived: false } : t))
        );
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({ ...prev, is_archived: false }));
        }
        return res;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to restore team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Delete team
  const deleteTeam = useCallback(
    async (teamId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        await deleteTeamApi(company.id, teamId);
        setTeams((prev) => prev.filter((t) => t.id !== teamId));
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null);
        }
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to delete team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Add single team member
  const addTeamMember = useCallback(
    async (teamId, memberData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      try {
        const newMember = await addTeamMemberApi(company.id, teamId, memberData);
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({
            ...prev,
            member_count: (prev.member_count || 0) + 1,
            members: [...(prev.members || []), newMember],
          }));
        }
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId ? { ...t, member_count: (t.member_count || 0) + 1 } : t
          )
        );
        return newMember;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to add member to team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Batch add team members
  const batchAddTeamMembers = useCallback(
    async (teamId, data) => {
      if (!company?.id) throw new Error('No active company workspace.');

      try {
        const addedList = await batchAddTeamMembersApi(company.id, teamId, data);
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({
            ...prev,
            member_count: (prev.member_count || 0) + addedList.length,
            members: [...(prev.members || []), ...addedList],
          }));
        }
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId
              ? { ...t, member_count: (t.member_count || 0) + addedList.length }
              : t
          )
        );
        return addedList;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to add members to team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Transfer leadership
  const transferTeamLeadership = useCallback(
    async (teamId, newLeadUserId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      try {
        const res = await transferTeamLeadershipApi(company.id, teamId, newLeadUserId);
        await loadTeam(teamId);
        return res;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to transfer team leadership.';
        throw new Error(msg);
      }
    },
    [company?.id, loadTeam]
  );

  // Update team member role
  const updateTeamMember = useCallback(
    async (teamId, userId, updateData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      try {
        const updatedMember = await updateTeamMemberApi(
          company.id,
          teamId,
          userId,
          updateData
        );
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({
            ...prev,
            members: (prev.members || []).map((m) =>
              m.user_id === userId ? updatedMember : m
            ),
          }));
        }
        return updatedMember;
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to update team member role.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Remove team member
  const removeTeamMember = useCallback(
    async (teamId, userId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      try {
        await removeTeamMemberApi(company.id, teamId, userId);
        if (selectedTeam?.id === teamId) {
          setSelectedTeam((prev) => ({
            ...prev,
            member_count: Math.max(0, (prev.member_count || 1) - 1),
            members: (prev.members || []).filter((m) => m.user_id !== userId),
          }));
        }
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId
              ? { ...t, member_count: Math.max(0, (t.member_count || 1) - 1) }
              : t
          )
        );
      } catch (err) {
        const msg = err.response?.data?.detail || 'Unable to remove member from team.';
        throw new Error(msg);
      }
    },
    [company?.id, selectedTeam?.id]
  );

  // Automatically load teams when company changes
  useEffect(() => {
    if (company?.id) {
      loadTeams({ status: statusFilter, my_teams: myTeamsFilter });
    } else {
      setTeams([]);
      setSelectedTeam(null);
      setTeamActivities([]);
    }
  }, [company?.id, statusFilter, myTeamsFilter, loadTeams]);

  const value = {
    teams,
    selectedTeam,
    teamActivities,
    loading,
    teamDetailLoading,
    activityLoading,
    error,
    statusFilter,
    myTeamsFilter,
    setStatusFilter,
    setMyTeamsFilter,
    setSelectedTeam,
    loadTeams,
    loadTeam,
    loadTeamActivity,
    createTeam,
    updateTeam,
    archiveTeam,
    restoreTeam,
    deleteTeam,
    addTeamMember,
    batchAddTeamMembers,
    transferTeamLeadership,
    updateTeamMember,
    removeTeamMember,
  };

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};
