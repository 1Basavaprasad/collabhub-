/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useCompany } from './CompanyContext';
import {
  getCompanyProjectsApi,
  getProjectApi,
  createProjectApi,
  updateProjectApi,
  archiveProjectApi,
  restoreProjectApi,
  deleteProjectApi,
  getProjectTeamsApi,
  addProjectTeamApi,
  removeProjectTeamApi,
  getProjectMembersApi,
  getProjectEffectiveMembersApi,
  addProjectMemberApi,
  removeProjectMemberApi,
} from '../api/projectApi';

const ProjectContext = createContext(null);

const extractApiError = (err, defaultMsg = 'An error occurred.') => {
  if (!err) return defaultMsg;
  if (err.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail;

    if (status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (status === 403) {
      return typeof detail === 'string'
        ? detail
        : "You don't have permission to manage this project.";
    }
    if (status === 409) {
      return typeof detail === 'string'
        ? detail
        : 'This item is already assigned to this project.';
    }
    if (status === 404) {
      return typeof detail === 'string' ? detail : 'Project or member not found.';
    }
    if (status === 422) {
      if (Array.isArray(detail)) {
        return detail.map((d) => d.msg || 'Invalid input').join(', ');
      }
      return typeof detail === 'string' ? detail : 'Please check the information provided.';
    }
    if (status >= 500) {
      return 'Something went wrong. Please try again.';
    }
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return err.message || defaultMsg;
};

export const ProjectProvider = ({ children }) => {
  const { company } = useCompany();
  const [projects, setProjects] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projectDetailLoading, setProjectDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  // Project Teams and Members State
  const [projectTeams, setProjectTeams] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [effectiveMembers, setEffectiveMembers] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  // Load all projects for active company
  const loadProjects = useCallback(
    async (params = {}) => {
      if (!company?.id) {
        setProjects([]);
        setTotalProjects(0);
        return [];
      }

      const activeStatus = params.status !== undefined ? params.status : statusFilter;

      setLoading(true);
      setError(null);
      try {
        const data = await getCompanyProjectsApi(company.id, {
          status: activeStatus,
          ...params,
        });
        const safeData = Array.isArray(data) ? data : (data?.items || []);
        const total = typeof data?.total === 'number' ? data.total : safeData.length;
        setProjects(safeData);
        setTotalProjects(total);
        return data;
      } catch (err) {
        console.error('Failed to load projects:', err);
        const msg = extractApiError(err, 'Unable to load workspace projects.');
        setError(msg);
        setProjects([]);
        setTotalProjects(0);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [company?.id, statusFilter]
  );

  // Load project teams
  const loadProjectTeams = useCallback(
    async (projectId) => {
      if (!company?.id || !projectId) {
        setProjectTeams([]);
        return [];
      }
      setTeamsLoading(true);
      try {
        const data = await getProjectTeamsApi(company.id, projectId);
        const safeList = Array.isArray(data) ? data : [];
        setProjectTeams(safeList);
        return safeList;
      } catch (err) {
        console.error('Failed to load project teams:', err);
        setProjectTeams([]);
        return [];
      } finally {
        setTeamsLoading(false);
      }
    },
    [company?.id]
  );

  // Load project direct & effective members
  const loadProjectMembers = useCallback(
    async (projectId) => {
      if (!company?.id || !projectId) {
        setProjectMembers([]);
        setEffectiveMembers([]);
        return { direct: [], effective: [] };
      }
      setMembersLoading(true);
      try {
        const [directData, effectiveData] = await Promise.all([
          getProjectMembersApi(company.id, projectId, { effective: false }),
          getProjectEffectiveMembersApi(company.id, projectId),
        ]);
        const safeDirect = Array.isArray(directData) ? directData : [];
        const safeEffective = Array.isArray(effectiveData) ? effectiveData : [];
        setProjectMembers(safeDirect);
        setEffectiveMembers(safeEffective);
        return { direct: safeDirect, effective: safeEffective };
      } catch (err) {
        console.error('Failed to load project members:', err);
        setProjectMembers([]);
        setEffectiveMembers([]);
        return { direct: [], effective: [] };
      } finally {
        setMembersLoading(false);
      }
    },
    [company?.id]
  );

  // Load single project details
  const loadProject = useCallback(
    async (projectId) => {
      if (!company?.id || !projectId) {
        setSelectedProject(null);
        setProjectTeams([]);
        setProjectMembers([]);
        setEffectiveMembers([]);
        return null;
      }

      setProjectDetailLoading(true);
      setError(null);
      try {
        const [projectData, teamsData, membersData] = await Promise.all([
          getProjectApi(company.id, projectId),
          getProjectTeamsApi(company.id, projectId).catch(() => []),
          getProjectEffectiveMembersApi(company.id, projectId).catch(() => []),
        ]);

        const safeTeams = Array.isArray(teamsData) ? teamsData : (projectData?.teams || []);
        const safeEffective = Array.isArray(membersData) ? membersData : [];
        const safeDirect = Array.isArray(projectData?.direct_members)
          ? projectData.direct_members
          : [];

        setSelectedProject(projectData);
        setProjectTeams(safeTeams);
        setProjectMembers(safeDirect);
        setEffectiveMembers(safeEffective);
        return projectData;
      } catch (err) {
        console.error('Failed to load project details:', err);
        const msg = extractApiError(err, 'Unable to load project details.');
        setError(msg);
        return null;
      } finally {
        setProjectDetailLoading(false);
      }
    },
    [company?.id]
  );

  // Create project
  const createProject = useCallback(
    async (projectData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const newProject = await createProjectApi(company.id, projectData);
        setProjects((prev) => [newProject, ...prev]);
        setTotalProjects((prev) => prev + 1);
        return newProject;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to create project.');
        throw new Error(msg);
      }
    },
    [company?.id]
  );

  // Update project
  const updateProject = useCallback(
    async (projectId, projectData) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const updated = await updateProjectApi(company.id, projectId, projectData);
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updated } : p)));
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => ({ ...prev, ...updated }));
        }
        return updated;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to update project.');
        throw new Error(msg);
      }
    },
    [company?.id, selectedProject?.id]
  );

  // Archive project
  const archiveProject = useCallback(
    async (projectId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const res = await archiveProjectApi(company.id, projectId);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, status: 'ARCHIVED', archived_at: res.archived_at || new Date().toISOString() }
              : p
          )
        );
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => ({
            ...prev,
            status: 'ARCHIVED',
            archived_at: res.archived_at || new Date().toISOString(),
          }));
        }
        return res;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to archive project.');
        throw new Error(msg);
      }
    },
    [company?.id, selectedProject?.id]
  );

  // Restore project
  const restoreProject = useCallback(
    async (projectId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        const res = await restoreProjectApi(company.id, projectId);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, status: 'ACTIVE', archived_at: null } : p
          )
        );
        if (selectedProject?.id === projectId) {
          setSelectedProject((prev) => ({ ...prev, status: 'ACTIVE', archived_at: null }));
        }
        return res;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to restore project.');
        throw new Error(msg);
      }
    },
    [company?.id, selectedProject?.id]
  );

  // Delete project
  const deleteProject = useCallback(
    async (projectId) => {
      if (!company?.id) throw new Error('No active company workspace.');

      setError(null);
      try {
        await deleteProjectApi(company.id, projectId);
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setTotalProjects((prev) => Math.max(0, prev - 1));
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
      } catch (err) {
        const msg = extractApiError(err, 'Unable to delete project.');
        throw new Error(msg);
      }
    },
    [company?.id, selectedProject?.id]
  );

  // Add team to project
  const addProjectTeam = useCallback(
    async (projectId, teamId) => {
      if (!company?.id) throw new Error('No active company workspace.');
      try {
        const added = await addProjectTeamApi(company.id, projectId, teamId);
        // Refresh teams and effective members
        await Promise.all([
          loadProjectTeams(projectId),
          loadProjectMembers(projectId),
        ]);
        return added;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to assign team to project.');
        throw new Error(msg);
      }
    },
    [company?.id, loadProjectTeams, loadProjectMembers]
  );

  // Remove team from project
  const removeProjectTeam = useCallback(
    async (projectId, teamId) => {
      if (!company?.id) throw new Error('No active company workspace.');
      try {
        await removeProjectTeamApi(company.id, projectId, teamId);
        // Refresh teams and effective members
        await Promise.all([
          loadProjectTeams(projectId),
          loadProjectMembers(projectId),
        ]);
      } catch (err) {
        const msg = extractApiError(err, 'Unable to remove team from project.');
        throw new Error(msg);
      }
    },
    [company?.id, loadProjectTeams, loadProjectMembers]
  );

  // Add direct member to project
  const addProjectMember = useCallback(
    async (projectId, userId) => {
      if (!company?.id) throw new Error('No active company workspace.');
      try {
        const added = await addProjectMemberApi(company.id, projectId, userId);
        // Refresh direct & effective members
        await loadProjectMembers(projectId);
        return added;
      } catch (err) {
        const msg = extractApiError(err, 'Unable to assign member to project.');
        throw new Error(msg);
      }
    },
    [company?.id, loadProjectMembers]
  );

  // Remove direct member from project
  const removeProjectMember = useCallback(
    async (projectId, userId) => {
      if (!company?.id) throw new Error('No active company workspace.');
      try {
        await removeProjectMemberApi(company.id, projectId, userId);
        // Refresh direct & effective members
        await loadProjectMembers(projectId);
      } catch (err) {
        const msg = extractApiError(err, 'Unable to remove member from project.');
        throw new Error(msg);
      }
    },
    [company?.id, loadProjectMembers]
  );

  // Automatically load projects when company or statusFilter changes
  useEffect(() => {
    if (company?.id) {
      loadProjects({ status: statusFilter });
    } else {
      setProjects([]);
      setTotalProjects(0);
      setSelectedProject(null);
      setProjectTeams([]);
      setProjectMembers([]);
      setEffectiveMembers([]);
    }
  }, [company?.id, statusFilter, loadProjects]);

  const value = {
    projects,
    totalProjects,
    selectedProject,
    projectTeams,
    projectMembers,
    effectiveMembers,
    loading,
    projectDetailLoading,
    teamsLoading,
    membersLoading,
    error,
    statusFilter,
    setStatusFilter,
    setSelectedProject,
    loadProjects,
    loadProject,
    loadProjectTeams,
    loadProjectMembers,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    addProjectTeam,
    removeProjectTeam,
    addProjectMember,
    removeProjectMember,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

