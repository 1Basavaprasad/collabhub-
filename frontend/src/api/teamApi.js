import api from './axios';

/**
 * Get all teams belonging to a company workspace with optional filters
 * @param {string} companyId - UUID of the company
 * @param {Object} params - { status: 'all'|'active'|'archived', my_teams: boolean }
 * @returns {Promise<Array<Object>>} - List of teams
 */
export const getCompanyTeamsApi = async (companyId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params.my_teams) {
    queryParams.append('my_teams', 'true');
  }
  const url = `/companies/${companyId}/teams${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Create a new team in a company workspace
 * @param {string} companyId - UUID of the company
 * @param {Object} data - { name, description, icon, color }
 * @returns {Promise<Object>} - Created team
 */
export const createTeamApi = async (companyId, data) => {
  const response = await api.post(`/companies/${companyId}/teams`, {
    name: data.name?.trim(),
    description: data.description ? data.description.trim() : null,
    icon: data.icon || 'users',
    color: data.color || 'indigo',
  });
  return response.data;
};

/**
 * Get detailed team information including members
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Object>} - Team details with members
 */
export const getTeamApi = async (companyId, teamId) => {
  const response = await api.get(`/companies/${companyId}/teams/${teamId}`);
  return response.data;
};

/**
 * Update team name, description, icon, or color
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {Object} data - { name, description, icon, color, is_archived }
 * @returns {Promise<Object>} - Updated team
 */
export const updateTeamApi = async (companyId, teamId, data) => {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.description !== undefined) {
    payload.description = data.description ? data.description.trim() : null;
  }
  if (data.icon !== undefined) payload.icon = data.icon;
  if (data.color !== undefined) payload.color = data.color;
  if (data.is_archived !== undefined) payload.is_archived = data.is_archived;

  const response = await api.patch(`/companies/${companyId}/teams/${teamId}`, payload);
  return response.data;
};

/**
 * Archive a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Object>}
 */
export const archiveTeamApi = async (companyId, teamId) => {
  const response = await api.post(`/companies/${companyId}/teams/${teamId}/archive`);
  return response.data;
};

/**
 * Restore an archived team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Object>}
 */
export const restoreTeamApi = async (companyId, teamId) => {
  const response = await api.post(`/companies/${companyId}/teams/${teamId}/restore`);
  return response.data;
};

/**
 * Permanently delete a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<void>}
 */
export const deleteTeamApi = async (companyId, teamId) => {
  const response = await api.delete(`/companies/${companyId}/teams/${teamId}`);
  return response.data;
};

/**
 * Get all members in a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Array<Object>>} - List of team members
 */
export const getTeamMembersApi = async (companyId, teamId) => {
  const response = await api.get(`/companies/${companyId}/teams/${teamId}/members`);
  return response.data;
};

/**
 * Add a single company member to a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {Object} data - { user_id, role }
 * @returns {Promise<Object>} - Added team member
 */
export const addTeamMemberApi = async (companyId, teamId, data) => {
  const response = await api.post(`/companies/${companyId}/teams/${teamId}/members`, {
    user_id: data.user_id,
    role: data.role || 'MEMBER',
  });
  return response.data;
};

/**
 * Batch add multiple company members to a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {Object} data - { user_ids: string[], role: string }
 * @returns {Promise<Array<Object>>} - List of added members
 */
export const batchAddTeamMembersApi = async (companyId, teamId, data) => {
  const response = await api.post(`/companies/${companyId}/teams/${teamId}/members/batch`, {
    user_ids: data.user_ids,
    role: data.role || 'MEMBER',
  });
  return response.data;
};

/**
 * Transfer team leadership to another member
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} newLeadUserId - UUID of the target member
 * @returns {Promise<Object>}
 */
export const transferTeamLeadershipApi = async (companyId, teamId, newLeadUserId) => {
  const response = await api.post(`/companies/${companyId}/teams/${teamId}/transfer-leadership`, {
    new_lead_user_id: newLeadUserId,
  });
  return response.data;
};

/**
 * Update a team member's role (LEAD or MEMBER)
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} userId - UUID of the user
 * @param {Object} data - { role }
 * @returns {Promise<Object>} - Updated team member
 */
export const updateTeamMemberApi = async (companyId, teamId, userId, data) => {
  const response = await api.patch(
    `/companies/${companyId}/teams/${teamId}/members/${userId}`,
    { role: data.role }
  );
  return response.data;
};

/**
 * Remove a member from a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} userId - UUID of the user
 * @returns {Promise<void>}
 */
export const removeTeamMemberApi = async (companyId, teamId, userId) => {
  const response = await api.delete(
    `/companies/${companyId}/teams/${teamId}/members/${userId}`
  );
  return response.data;
};

/**
 * Get activity audit log for a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Array<Object>>} - List of activity log events
 */
export const getTeamActivityApi = async (companyId, teamId) => {
  const response = await api.get(`/companies/${companyId}/teams/${teamId}/activity`);
  return response.data;
};
