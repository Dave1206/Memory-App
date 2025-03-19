import React, { useState, useEffect, useCallback } from 'react';
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
import LandingToggle from "./LandingToggle";
import RightSidebar from "./RightSidebar";
import useMediaQuery from "../hooks/useMediaQuery";
import '../styles/App.css';
import ModeratorTools from './moderation/ModeratorTools';

function App({ sessionExpired }) {
  const { user, logout } = useAuth();
  const { axiosInstance } = useAxios();
  const [eventInvites, setEventInvites] = useState([]);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const getEvents = useCallback(async () => {
    if (!axiosInstance) return;
    try {
      const response = await axiosInstance.get("/events");
      const fetchedEvents = response.data;
      const sortedEventInvites = fetchedEvents.Invites.sort((a, b) => a.has_shared - b.has_shared);
      setEventInvites(sortedEventInvites);
    } catch (err) {
      console.error("Error fetching events", err.response?.data || err.message);
    }
  }, [axiosInstance]);

  useEffect(() => {
    if (user) {
      getEvents();
    }
  }, [user, getEvents]);

  const handleEventInvite = (eventId) => {
    setEventInvites((prevEventInvites) =>
      prevEventInvites.filter((event) => event.event_id !== eventId)
    );
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

  if (isCheckingSession) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="wrapper">
        {!isMobile && <LandingToggle /> }
        {user && <Messenger />}
        {user && <Navbar events={eventInvites} userId={user?.id} onEventUpdate={handleEventInvite} />}
        {user && isMobile && <ToggleableList events={eventInvites} onEventUpdate={handleEventInvite} />}

        {sessionExpired && <Navigate to="/login" state={{ sessionExpired: true }} replace />}

        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile/:userId" element={user ? <UserProfile user={user} /> : <Navigate to="/login" />} />
          <Route path="/settings/:userId" element={user ? <UserPreferences user={user} /> : <Navigate to="/login" />} />
          <Route path="/home" element={user ? <Feed user={user} getEvents={getEvents} /> : <Navigate to="/login" />} />
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
