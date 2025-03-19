import React, { createContext, useContext, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AxiosContext = createContext();

export const AxiosProvider = ({ children, onSessionExpired }) => {
  const { logout } = useAuth();
  const logoutTriggered = useRef(false);

  const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        if (!logoutTriggered.current) {
          logoutTriggered.current = true;
          logout();
          if (onSessionExpired) {
            onSessionExpired();
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return (
    <AxiosContext.Provider value={{ axiosInstance }}>
      {children}
    </AxiosContext.Provider>
  );
};

export const useAxios = () => {
  return useContext(AxiosContext);
};
