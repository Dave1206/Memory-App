import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useAxios } from './auth/AxiosProvider';
import { useAuth } from "./auth/AuthContext";
import Footer from './Footer';
import Login from './auth/Login';
import UserProfile from './profile/UserProfile';
import EventList from './events/Eventlist';
import ResetPassword from './auth/ResetPassword';
import ForgotPassword from './auth/ForgotPassword';
import ToggleableList from './ToggleableList';
import Navbar from './Navbar';
import Feed from './Feed';
import '../styles/App.css';

function App() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventInvites, setEventInvites] = useState([]);
  const axiosInstance = useAxios();

  const getEvents = useCallback(async () => {
    if (!axiosInstance) return;
    try {
      const response = await axiosInstance.get("/events");
      const fetchedEvents = response.data;
      const sortedEvents = fetchedEvents.Optins.sort((a, b) => a.has_shared - b.has_shared);
      const sortedEventInvites = fetchedEvents.Invites.sort((a, b) => a.has_shared - b.has_shared);
      setEvents(sortedEvents);
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

  return (
    <Router>
      <div className="wrapper">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/events" />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            path="/events"
            element={
              user ? (
                <>
                  <ToggleableList getEvents={getEvents} user={user} onLogout={logout} />
                  <Navbar events={eventInvites} userId={user?.id} onEventUpdate={handleEventInvite} />
                  <EventList events={events} getEvents={getEvents} userId={user?.id} />
                </>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Profile route, extracting userId from the URL params */}
          <Route
            path="/profile/:userId"
            element={
              user ? (
                <>
                  <UserProfile user={user} />
                  <ToggleableList getEvents={getEvents} user={user} onLogout={logout} />
                  <Navbar events={eventInvites} userId={user?.id} onEventUpdate={handleEventInvite} />
                </>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Feed route */}
          <Route
            path="/feed"
            element={
              user ? (
                <>
                  <Feed user={user} />
                  <ToggleableList getEvents={getEvents} user={user} onLogout={logout} />
                  <Navbar events={eventInvites} userId={user?.id} />
                </>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Redirect to events if logged in, otherwise to login */}
          <Route path="/" element={user ? <Navigate to="/events" /> : <Navigate to="/login" />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
