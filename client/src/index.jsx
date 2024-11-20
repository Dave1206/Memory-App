import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { AuthProvider } from './components/auth/AuthContext';
import { AxiosProvider } from './components/auth/AxiosProvider';

const root = ReactDOM.createRoot(document.getElementById("root"));

const setDynamicVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

setDynamicVh();
window.addEventListener('resize', setDynamicVh);



root.render(
  <React.StrictMode>
    <AuthProvider>
      <AxiosProvider>
        <App />
      </AxiosProvider>
    </AuthProvider>
  </React.StrictMode>
);