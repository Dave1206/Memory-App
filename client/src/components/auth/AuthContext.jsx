import React, { useEffect, createContext, useContext, useState } from "react";
import axios from "axios";

axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL; 

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isModMode, setIsModMode] = useState(false); 

  // Toggle mod mode
  const toggleModMode = () => {
    setIsModMode(prevMode => !prevMode);
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post("/login", { email, password }, { withCredentials: true });
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await axios.post("/logout", {}, { withCredentials: true });
      setUser(null);
      setIsModMode(false);
    } catch (error) {
      console.error("Logout error:", error.response?.data || error.message);
    }
  };

  // Register function
  const register = async (username, email, password, confirmPassword) => {
    try {
      const response = await axios.post(
        "/register",
        { username, email, password, confirmPassword },
        { withCredentials: true }
      );
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error("Registration error:", error.response?.data || error.message);
      throw error;
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get('/auth/session', { withCredentials: true });
        setUser(response.data.user);
      } catch (err) {
        console.error('No active session:', err.response?.data || err.message);
        setUser(null);
      }
    };
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isModMode, toggleModMode }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
