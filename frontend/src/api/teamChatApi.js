import api from './axios';

/**
 * Get messages in a team's private chat
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {number} limit - Number of messages
 * @param {number} offset - Pagination offset
 * @returns {Promise<{messages: Array<Object>, total_count: number, has_more: boolean}>}
 */
export const getTeamMessagesApi = async (companyId, teamId, limit = 100, offset = 0) => {
  const response = await api.get(
    `/companies/${companyId}/teams/${teamId}/messages?limit=${limit}&offset=${offset}`
  );
  return response.data;
};

/**
 * Send a message to team chat
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string|Object} payload - Message text or object with { message, reply_to_message_id, mentioned_user_ids }
 * @returns {Promise<Object>} - Created message
 */
export const sendTeamMessageApi = async (companyId, teamId, payload) => {
  const data = typeof payload === 'string'
    ? { message: payload.trim() }
    : {
        message: payload.message?.trim(),
        reply_to_message_id: payload.reply_to_message_id || null,
        mentioned_user_ids: payload.mentioned_user_ids || null,
      };

  const response = await api.post(
    `/companies/${companyId}/teams/${teamId}/messages`,
    data
  );
  return response.data;
};

/**
 * Edit an existing message
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} messageId - UUID of the message
 * @param {Object} data - { message, mentioned_user_ids? }
 * @returns {Promise<Object>} - Updated message
 */
export const editTeamMessageApi = async (companyId, teamId, messageId, data) => {
  const response = await api.patch(
    `/companies/${companyId}/teams/${teamId}/messages/${messageId}`,
    data
  );
  return response.data;
};

/**
 * Delete a message from team chat (soft-delete)
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} messageId - UUID of the message
 * @returns {Promise<void>}
 */
export const deleteTeamMessageApi = async (companyId, teamId, messageId) => {
  const response = await api.delete(
    `/companies/${companyId}/teams/${teamId}/messages/${messageId}`
  );
  return response.data;
};

/**
 * Toggle emoji reaction on a message
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} messageId - UUID of the message
 * @param {string} emoji - Emoji character
 * @returns {Promise<Object>} - Updated message with new reaction grouping
 */
export const toggleMessageReactionApi = async (companyId, teamId, messageId, emoji) => {
  const response = await api.post(
    `/companies/${companyId}/teams/${teamId}/messages/${messageId}/reactions`,
    { emoji }
  );
  return response.data;
};

/**
 * Toggle pin status of a message
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} messageId - UUID of the message
 * @returns {Promise<Object>} - Updated message
 */
export const togglePinMessageApi = async (companyId, teamId, messageId) => {
  const response = await api.post(
    `/companies/${companyId}/teams/${teamId}/messages/${messageId}/pin`
  );
  return response.data;
};

/**
 * Get all pinned messages for a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @returns {Promise<Array<Object>>} - List of pinned messages
 */
export const getPinnedMessagesApi = async (companyId, teamId) => {
  const response = await api.get(
    `/companies/${companyId}/teams/${teamId}/messages/pinned`
  );
  return response.data;
};

/**
 * Search messages within a team
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string} query - Keyword to search
 * @param {number} limit - Max results
 * @returns {Promise<{messages: Array<Object>, total_count: number}>}
 */
export const searchTeamMessagesApi = async (companyId, teamId, query, limit = 50) => {
  const response = await api.get(
    `/companies/${companyId}/teams/${teamId}/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return response.data;
};

/**
 * Mark team chat as read
 * @param {string} companyId - UUID of the company
 * @param {string} teamId - UUID of the team
 * @param {string|null} messageId - Optional latest read message ID
 * @returns {Promise<Object>}
 */
export const markTeamChatReadApi = async (companyId, teamId, messageId = null) => {
  const response = await api.post(
    `/companies/${companyId}/team-chat/${teamId}/read`,
    messageId ? { message_id: messageId } : {}
  );
  return response.data;
};

/**
 * Get unread message counts for all user teams in the company
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Array<Object>>} - List of unread counts per team
 */
export const getTeamsUnreadCountsApi = async (companyId) => {
  const response = await api.get(
    `/companies/${companyId}/team-chat/unread-counts`
  );
  return response.data;
};
