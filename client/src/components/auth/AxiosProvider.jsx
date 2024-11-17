import React, { createContext, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AxiosContext = createContext();

export const AxiosProvider = ({ children }) => {
  const { logout } = useAuth();

  const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  // Set up interceptor for handling 401 responses
  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        logout();  // Trigger logout on 401 Unauthorized error
        window.location.href = '/login';  // Redirect to login
      }
      return Promise.reject(error);
    }
  );

  return (
    <AxiosContext.Provider value={axiosInstance}>
      {children}
    </AxiosContext.Provider>
  );
};

// Custom hook to use axios instance
export const useAxios = () => {
  return useContext(AxiosContext);
};
