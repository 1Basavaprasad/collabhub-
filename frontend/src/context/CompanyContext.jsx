/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  getMyCompanyApi,
  createCompanyApi,
  updateCompanyApi,
} from '../api/companyApi';

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the authenticated user's company from GET /companies/me
  const fetchCompany = useCallback(async () => {
    if (!token) {
      setCompany(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMyCompanyApi();
      setCompany(data);
      return data;
    } catch (err) {
      // 404 indicates the user has not created a company yet (valid initial state)
      if (err.response && err.response.status === 404) {
        setCompany(null);
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

  // Create a company for the authenticated user
  const createCompany = async ({ name, description }) => {
    setError(null);
    try {
      const newCompany = await createCompanyApi({ name, description });
      setCompany(newCompany);
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
  const updateCompany = async ({ name, description }) => {
    if (!company?.id) {
      throw new Error('No active company to update.');
    }

    setError(null);
    try {
      const updated = await updateCompanyApi(company.id, { name, description });
      setCompany(updated);
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

  // Fetch company whenever auth status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCompany();
    } else {
      setCompany(null);
      setLoading(false);
      setError(null);
    }
  }, [isAuthenticated, fetchCompany]);

  const value = {
    company,
    hasCompany: Boolean(company),
    loading,
    error,
    fetchCompany,
    createCompany,
    updateCompany,
    clearError: () => setError(null),
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
