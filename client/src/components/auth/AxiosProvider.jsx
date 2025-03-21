import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const AxiosContext = createContext();

export const AxiosProvider = ({ children, onSessionExpired }) => {
  const { logout } = useAuth();
  const logoutTriggered = useRef(false);
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    const handlePageLoad = () => setIsPageLoaded(true);

    if (document.readyState === "complete") {
      setIsPageLoaded(true);
    } else {
      window.addEventListener("load", handlePageLoad);
    }

    const fallbackTimeout = setTimeout(() => {
      setIsPageLoaded(true);
    }, 3000);

    return () => {
      window.removeEventListener("load", handlePageLoad);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
  });

  axiosInstance.interceptors.request.use(
    async (config) => {
      if (!isPageLoaded) {
        await new Promise((resolve) => {
          const interval = setInterval(() => {
            if (isPageLoaded) {
              clearInterval(interval);
              resolve();
            }
          }, 50);
        });
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

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
    <AxiosContext.Provider value={{ axiosInstance, isPageLoaded }}>
      {children}
    </AxiosContext.Provider>
  );
};

export const useAxios = () => {
  return useContext(AxiosContext);
};
