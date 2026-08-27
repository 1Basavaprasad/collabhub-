import api from './axios';

/**
 * Get projects belonging to a company workspace with optional pagination and filters
 * @param {string} companyId - UUID of the company
 * @param {Object} params - { page?, limit?, status?, search?, sort_by? }
 * @returns {Promise<Object>} - Paginated response with items and metadata
 */
export const getCompanyProjectsApi = async (companyId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params.search?.trim()) {
    queryParams.append('search', params.search.trim());
  }
  if (params.sort_by) {
    queryParams.append('sort_by', params.sort_by);
  }
  const url = `/companies/${companyId}/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Create a new project in a company workspace
 * @param {string} companyId - UUID of the company
 * @param {Object} data - { name, description, icon, color }
 * @returns {Promise<Object>} - Created project
 */
export const createProjectApi = async (companyId, data) => {
  const response = await api.post(`/companies/${companyId}/projects`, {
    name: data.name?.trim(),
    description: data.description ? data.description.trim() : null,
    icon: data.icon || 'folder-kanban',
    color: data.color || 'indigo',
  });
  return response.data;
};

/**
 * Get detailed project information
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Object>} - Project details
 */
export const getProjectApi = async (companyId, projectId) => {
  const response = await api.get(`/companies/${companyId}/projects/${projectId}`);
  return response.data;
};

/**
 * Update project name, description, icon, color, or status
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {Object} data - { name?, description?, icon?, color?, status? }
 * @returns {Promise<Object>} - Updated project
 */
export const updateProjectApi = async (companyId, projectId, data) => {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.icon !== undefined) payload.icon = data.icon;
  if (data.color !== undefined) payload.color = data.color;
  if (data.status !== undefined) payload.status = data.status;

  const response = await api.patch(`/companies/${companyId}/projects/${projectId}`, payload);
  return response.data;
};

/**
 * Archive a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Object>}
 */
export const archiveProjectApi = async (companyId, projectId) => {
  const response = await api.post(`/companies/${companyId}/projects/${projectId}/archive`);
  return response.data;
};

/**
 * Restore an archived project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Object>}
 */
export const restoreProjectApi = async (companyId, projectId) => {
  const response = await api.post(`/companies/${companyId}/projects/${projectId}/restore`);
  return response.data;
};

/**
 * Permanently delete a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<void>}
 */
export const deleteProjectApi = async (companyId, projectId) => {
  const response = await api.delete(`/companies/${companyId}/projects/${projectId}`);
  return response.data;
};

/**
 * Get teams assigned to a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Array<Object>>} - List of assigned project teams
 */
export const getProjectTeamsApi = async (companyId, projectId) => {
  const response = await api.get(`/companies/${companyId}/projects/${projectId}/teams`);
  return response.data;
};

/**
 * Assign a team to a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Object>} - Assigned project team record
 */
export const addProjectTeamApi = async (companyId, projectId, teamId) => {
  const response = await api.post(`/companies/${companyId}/projects/${projectId}/teams`, {
    team_id: teamId,
  });
  return response.data;
};

/**
 * Remove an assigned team from a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} teamId - UUID of the team
 * @returns {Promise<void>}
 */
export const removeProjectTeamApi = async (companyId, projectId, teamId) => {
  const response = await api.delete(
    `/companies/${companyId}/projects/${projectId}/teams/${teamId}`
  );
  return response.data;
};

/**
 * Get direct or effective members of a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {Object} params - { effective?: boolean }
 * @returns {Promise<Array<Object>>} - List of project members
 */
export const getProjectMembersApi = async (companyId, projectId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.effective) {
    queryParams.append('effective', 'true');
  }
  const url = `/companies/${companyId}/projects/${projectId}/members${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get effective project members (direct + inherited from teams)
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @returns {Promise<Array<Object>>} - List of unique effective members with source info
 */
export const getProjectEffectiveMembersApi = async (companyId, projectId) => {
  const response = await api.get(
    `/companies/${companyId}/projects/${projectId}/members?effective=true`
  );
  return response.data;
};

/**
 * Assign a direct member to a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} - Assigned project member record
 */
export const addProjectMemberApi = async (companyId, projectId, userId) => {
  const response = await api.post(`/companies/${companyId}/projects/${projectId}/members`, {
    user_id: userId,
  });
  return response.data;
};

/**
 * Remove a direct member from a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} userId - UUID of the user
 * @returns {Promise<void>}
 */
export const removeProjectMemberApi = async (companyId, projectId, userId) => {
  const response = await api.delete(
    `/companies/${companyId}/projects/${projectId}/members/${userId}`
  );
  return response.data;
};

/**
 * Get project activity audit timeline with pagination
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {Object} params - { page?, limit? }
 * @returns {Promise<Object>} - Paginated response { items, total, page, limit, total_pages }
 */
export const getProjectActivityApi = async (companyId, projectId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  const url = `/companies/${companyId}/projects/${projectId}/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

