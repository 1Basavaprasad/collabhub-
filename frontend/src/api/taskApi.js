import api from './axios';

/**
 * Get tasks belonging to a project with optional filters
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {Object} params - { status?, priority?, assignee_id?, search? }
 * @returns {Promise<Array<Object>>} - List of task records
 */
export const getProjectTasksApi = async (companyId, projectId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params.priority && params.priority !== 'all') {
    queryParams.append('priority', params.priority);
  }
  if (params.assignee_id && params.assignee_id !== 'all') {
    queryParams.append('assignee_id', params.assignee_id);
  }
  if (params.search?.trim()) {
    queryParams.append('search', params.search.trim());
  }

  const qs = queryParams.toString();
  const url = `/companies/${companyId}/projects/${projectId}/tasks${qs ? `?${qs}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Create a new task in a project
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {Object} data - { title, description?, status?, priority?, assignee_id?, due_date?, position? }
 * @returns {Promise<Object>} - Created task
 */
export const createTaskApi = async (companyId, projectId, data) => {
  const payload = {
    title: data.title?.trim(),
    description: data.description?.trim() || null,
    status: data.status || 'TODO',
    priority: data.priority || 'MEDIUM',
    assignee_id: data.assignee_id || null,
    due_date: data.due_date || null,
    position: typeof data.position === 'number' ? data.position : 0,
  };

  const response = await api.post(
    `/companies/${companyId}/projects/${projectId}/tasks`,
    payload
  );
  return response.data;
};

/**
 * Get detailed task information
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} taskId - UUID of the task
 * @returns {Promise<Object>} - Task details
 */
export const getTaskApi = async (companyId, projectId, taskId) => {
  const response = await api.get(
    `/companies/${companyId}/projects/${projectId}/tasks/${taskId}`
  );
  return response.data;
};

/**
 * Update task metadata
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} taskId - UUID of the task
 * @param {Object} data - { title?, description?, status?, priority?, assignee_id?, due_date?, position? }
 * @returns {Promise<Object>} - Updated task
 */
export const updateTaskApi = async (companyId, projectId, taskId, data) => {
  const payload = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.status !== undefined) payload.status = data.status;
  if (data.priority !== undefined) payload.priority = data.priority;
  if (data.assignee_id !== undefined) payload.assignee_id = data.assignee_id || null;
  if (data.due_date !== undefined) payload.due_date = data.due_date || null;
  if (data.position !== undefined) payload.position = data.position;

  const response = await api.patch(
    `/companies/${companyId}/projects/${projectId}/tasks/${taskId}`,
    payload
  );
  return response.data;
};

/**
 * Update task status (Kanban column movement)
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} taskId - UUID of the task
 * @param {Object} data - { status, position? }
 * @returns {Promise<Object>} - Updated task
 */
export const updateTaskStatusApi = async (companyId, projectId, taskId, data) => {
  const payload = {
    status: data.status,
  };
  if (typeof data.position === 'number') {
    payload.position = data.position;
  }

  const response = await api.patch(
    `/companies/${companyId}/projects/${projectId}/tasks/${taskId}/status`,
    payload
  );
  return response.data;
};

/**
 * Explicitly mark a task as completed
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} taskId - UUID of the task
 * @returns {Promise<Object>} - Completed task
 */
export const completeTaskApi = async (companyId, projectId, taskId) => {
  const response = await api.patch(
    `/companies/${companyId}/projects/${projectId}/tasks/${taskId}/complete`
  );
  return response.data;
};

/**
 * Get all tasks assigned to current user in company
 * @param {string} companyId - UUID of the company
 * @param {Object} params - { status?, priority?, search? }
 * @returns {Promise<Array<Object>>} - List of assigned tasks
 */
export const getMyTasksApi = async (companyId, params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  if (params.priority && params.priority !== 'all') {
    queryParams.append('priority', params.priority);
  }
  if (params.search?.trim()) {
    queryParams.append('search', params.search.trim());
  }

  const qs = queryParams.toString();
  const url = `/companies/${companyId}/my-tasks${qs ? `?${qs}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get summary KPI stats for current user's assigned tasks
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Object>} - { assigned_to_me, due_today, overdue, completed }
 */
export const getMyTasksSummaryApi = async (companyId) => {
  const response = await api.get(`/companies/${companyId}/my-tasks/summary`);
  return response.data;
};

/**
 * Permanently delete a task
 * @param {string} companyId - UUID of the company
 * @param {string} projectId - UUID of the project
 * @param {string} taskId - UUID of the task
 * @returns {Promise<void>}
 */
export const deleteTaskApi = async (companyId, projectId, taskId) => {
  const response = await api.delete(
    `/companies/${companyId}/projects/${projectId}/tasks/${taskId}`
  );
  return response.data;
};
