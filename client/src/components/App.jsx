import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAxios } from './auth/AxiosProvider';
import { useAuth } from "./auth/AuthContext";
import Footer from './Footer';
import Login from './auth/Login';
import UserProfile from './profile/UserProfile';
import UserPreferences from './profile/UserPreferences';
import ResetPassword from './auth/ResetPassword';
import ForgotPassword from './auth/ForgotPassword';
import ToggleableList from './ToggleableList';
import Navbar from './Navbar';
import Messenger from './messenger/Messenger';
import Feed from './Feed';
import EventRoute from './events/EventRoute';
import LandingToggle from "./LandingToggle";
import RightSidebar from "./RightSidebar";
import useMediaQuery from "../hooks/useMediaQuery";
import '../styles/App.css';
import ModeratorTools from './moderation/ModeratorTools';

function App({ sessionExpired }) {
  const { user, logout } = useAuth();
  const { isPageLoaded } = useAxios();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const clearFeedNotificationsRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleFeedViewed = () => {
    if (clearFeedNotificationsRef.current) {
      clearFeedNotificationsRef.current();
    }
  };

  useEffect(() => {
    if (sessionExpired && user) {
      logout();
    }
  }, [sessionExpired, logout, user]);

  useEffect(() => {
    const timer = setTimeout(() => setIsCheckingSession(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isCheckingSession || !isPageLoaded) {
    return (
      <div className="loading-container">
        <p>Loading</p>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="wrapper">
        {!isMobile && <LandingToggle /> }
        {user && <Messenger />}
        {user && <Navbar userId={user?.id} registerClearFeed={(fn) => (clearFeedNotificationsRef.current = fn)} />}
        {user && isMobile && <ToggleableList />}

        {sessionExpired && <Navigate to="/login" state={{ sessionExpired: true }} replace />}

        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile/:userId" element={user ? <UserProfile user={user} /> : <Navigate to="/login" />} />
          <Route path="/settings/:userId" element={user ? <UserPreferences user={user} /> : <Navigate to="/login" />} />
          <Route path="/home" element={user ? <Feed user={user} onFeedTabView={handleFeedViewed} /> : <Navigate to="/login" />} />
          <Route path="/event/:eventId" element={user? <EventRoute /> : <Navigate to="/login" />} /> 
          <Route path="/moderator-tools" element={user ? <ModeratorTools user={user} /> : <Navigate to="/login" />} />
          <Route path="/" element={user ? <Navigate to="/home" /> : <Navigate to="/login" />} />
        </Routes>
        {!isMobile && user && <RightSidebar />}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
