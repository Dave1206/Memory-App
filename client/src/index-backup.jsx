import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';
import { AuthProvider } from './auth/AuthContext';
import { AxiosProvider } from './auth/AxiosProvider';

ReactDOM.render(
  <AuthProvider>
    <AxiosProvider>
      <App />
    </AxiosProvider>
  </AuthProvider>,
  document.getElementById('root')
);
