import api from './axios';

/**
 * Get the current authenticated user's active/primary company
 * @returns {Promise<Object>} - Company details with profile_completeness
 */
export const getMyCompanyApi = async () => {
  const response = await api.get('/companies/me');
  return response.data;
};

/**
 * Get all companies the authenticated user belongs to
 * @returns {Promise<Array<Object>>} - List of companies
 */
export const getMyCompaniesListApi = async () => {
  const response = await api.get('/companies');
  return response.data;
};

/**
 * Create a new company for the authenticated user
 * @param {Object} companyData - { name, description, industry, company_size, country, city, website, logo_url }
 * @returns {Promise<Object>} - Created company details
 */
export const createCompanyApi = async ({
  name,
  description,
  industry,
  company_size,
  country,
  city,
  website,
  logo_url,
}) => {
  const payload = {
    name: name?.trim(),
    description: description ? description.trim() : null,
    industry: industry ? industry.trim() : null,
    company_size: company_size ? company_size.trim() : null,
    country: country ? country.trim() : null,
    city: city ? city.trim() : null,
    website: website ? website.trim() : null,
    logo_url: logo_url ? logo_url.trim() : null,
  };
  const response = await api.post('/companies', payload);
  return response.data;
};

/**
 * Get company details by company ID
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Object>} - Company details
 */
export const getCompanyByIdApi = async (companyId) => {
  const response = await api.get(`/companies/${companyId}`);
  return response.data;
};

/**
 * Update existing company information
 * @param {string} companyId - UUID of the company
 * @param {Object} data - { name, description, industry, company_size, country, city, website, logo_url }
 * @returns {Promise<Object>} - Updated company details
 */
export const updateCompanyApi = async (companyId, data) => {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name ? data.name.trim() : '';
  if (data.description !== undefined) payload.description = data.description ? data.description.trim() : null;
  if (data.industry !== undefined) payload.industry = data.industry ? data.industry.trim() : null;
  if (data.company_size !== undefined) payload.company_size = data.company_size ? data.company_size.trim() : null;
  if (data.country !== undefined) payload.country = data.country ? data.country.trim() : null;
  if (data.city !== undefined) payload.city = data.city ? data.city.trim() : null;
  if (data.website !== undefined) payload.website = data.website ? data.website.trim() : null;
  if (data.logo_url !== undefined) payload.logo_url = data.logo_url ? data.logo_url.trim() : null;

  const response = await api.patch(`/companies/${companyId}`, payload);
  return response.data;
};

/**
 * Get all members of a company (including user details, role, designation, department)
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Array<Object>>} - List of company members with user summaries
 */
export const getCompanyMembersApi = async (companyId) => {
  const response = await api.get(`/companies/${companyId}/members`);
  return response.data;
};

/**
 * Directly add a member to the company (OWNER/ADMIN only)
 * @param {string} companyId - UUID of the company
 * @param {Object} data - { user_id, role, designation, department }
 * @returns {Promise<Object>} - Created membership
 */
export const createCompanyMemberApi = async (
  companyId,
  { user_id, role = 'MEMBER', designation, department }
) => {
  const params = new URLSearchParams({
    user_id,
    role: role || 'MEMBER',
  });
  if (designation?.trim()) params.append('designation', designation.trim());
  if (department?.trim()) params.append('department', department.trim());

  const response = await api.post(`/companies/${companyId}/members?${params.toString()}`);
  return response.data;
};

/**
 * Update an existing member's role, designation, or department (OWNER/ADMIN only)
 * @param {string} companyId - UUID of the company
 * @param {string} userId - UUID of the user/member
 * @param {Object} data - { role?, designation?, department? }
 * @returns {Promise<Object>} - Updated company member
 */
export const updateCompanyMemberApi = async (companyId, userId, data) => {
  const payload = {};
  if (data.role !== undefined) payload.role = data.role;
  if (data.designation !== undefined) payload.designation = data.designation ? data.designation.trim() : null;
  if (data.department !== undefined) payload.department = data.department ? data.department.trim() : null;

  const response = await api.patch(`/companies/${companyId}/members/${userId}`, payload);
  return response.data;
};

/**
 * Create a company invitation for a user by email
 * @param {string} companyId - UUID of the company
 * @param {Object} data - { email: string, role?: string, designation?: string, department?: string }
 * @returns {Promise<Object>} - Created invitation details
 */
export const createCompanyInvitationApi = async (
  companyId,
  { email, role = 'MEMBER', designation, department }
) => {
  const payload = {
    email: email?.trim().toLowerCase(),
    role: role || 'MEMBER',
    designation: designation?.trim() || null,
    department: department?.trim() || null,
  };
  const response = await api.post(`/companies/${companyId}/invitations`, payload);
  return response.data;
};

/**
 * Get all company invitations (OWNER/ADMIN only)
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Array<Object>>} - List of company invitations
 */
export const getCompanyInvitationsApi = async (companyId) => {
  const response = await api.get(`/companies/${companyId}/invitations`);
  return response.data;
};

/**
 * Revoke a pending company invitation (OWNER/ADMIN only)
 * @param {string} companyId - UUID of the company
 * @param {string} invitationId - UUID of the invitation
 * @returns {Promise<Object>} - Revoked invitation details
 */
export const revokeCompanyInvitationApi = async (companyId, invitationId) => {
  const response = await api.post(`/companies/${companyId}/invitations/${invitationId}/revoke`);
  return response.data;
};

/**
 * Verify an invitation token before accepting it
 * @param {string} token - Raw invitation token
 * @returns {Promise<Object>} - { company_id, company_name, email, role, designation, department, expires_at }
 */
export const verifyCompanyInvitationApi = async (token) => {
  const response = await api.get(`/companies/invitations/verify/${encodeURIComponent(token)}`);
  return response.data;
};

/**
 * Accept a company invitation using the authenticated user's credentials
 * @param {string} token - Raw invitation token
 * @returns {Promise<Object>} - Accepted CompanyInvitationResponse
 */
export const acceptCompanyInvitationApi = async (token) => {
  const response = await api.post(`/companies/invitations/accept/${encodeURIComponent(token)}`);
  return response.data;
};

/**
 * Remove a member from the company (OWNER/ADMIN only)
 * @param {string} companyId - UUID of the company
 * @param {string} userId - UUID of the user/member to remove
 * @returns {Promise<Object>} - Confirmation message
 */
export const removeCompanyMemberApi = async (companyId, userId) => {
  const response = await api.delete(`/companies/${companyId}/members/${userId}`);
  return response.data;
};

/**
 * Leave a company as the authenticated user
 * @param {string} companyId - UUID of the company
 * @returns {Promise<Object>} - Confirmation message
 */
export const leaveCompanyApi = async (companyId) => {
  const response = await api.post(`/companies/${companyId}/leave`);
  return response.data;
};
