import React, { createContext, useContext, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AxiosContext = createContext();

export const AxiosProvider = ({ children }) => {
  const { logout } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);
  const logoutTriggered = useRef(false);

  const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      if (error.response && error.response.status === 401) {
        if (!logoutTriggered.current){
          logoutTriggered.current = true;
          setSessionExpired(true);
          logout();
        }
      }
      return Promise.reject(error);
    }
  );

  return (
    <AxiosContext.Provider value={{ axiosInstance, sessionExpired, setSessionExpired }}>
      {children}
    </AxiosContext.Provider>
  );
};

export const useAxios = () => {
  return useContext(AxiosContext);
};
