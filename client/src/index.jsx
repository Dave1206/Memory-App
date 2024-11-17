import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import { AuthProvider } from './components/auth/AuthContext';
import { AxiosProvider } from './components/auth/AxiosProvider';

ReactDOM.render(
  <AuthProvider>
    <AxiosProvider>
      <App />
    </AxiosProvider>
  </AuthProvider>,
  document.getElementById('root')
);