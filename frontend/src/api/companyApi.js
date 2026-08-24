import api from './axios';

/**
 * Get the current authenticated user's company
 * @returns {Promise<Object>} - Company details with profile_completeness
 */
export const getMyCompanyApi = async () => {
  const response = await api.get('/companies/me');
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
