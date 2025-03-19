import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { AuthProvider } from './components/auth/AuthContext';
import { AxiosProvider } from './components/auth/AxiosProvider';
import { MessengerProvider } from './components/messenger/MessengerContext';

const root = ReactDOM.createRoot(document.getElementById("root"));

const setDynamicVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

setDynamicVh();
window.addEventListener('resize', setDynamicVh);

function RootComponent() {
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleSessionExpired = () => {
    console.log("Session has expired.");
    setSessionExpired(true);
  };

  return (
    <AuthProvider>
      <AxiosProvider onSessionExpired={handleSessionExpired}>
        <MessengerProvider>
          <App sessionExpired={sessionExpired} />
        </MessengerProvider>
      </AxiosProvider>
    </AuthProvider>
  );
}

root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);