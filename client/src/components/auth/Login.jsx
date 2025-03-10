import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import Register from "./Register";
import { useAuth } from "./AuthContext";
import { useAxios } from "./AxiosProvider";
import { useLocation } from 'react-router-dom';
import ForgotPassword from "./ForgotPassword";
import '../../styles/Login.css';

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login, user } = useAuth();
  const { setSessionExpired } = useAxios();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isVerified = searchParams.get('verified') === 'true';

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(identifier, password);
      setSessionExpired(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    !forgotPassword ? (
      <div className="login-container">
        {isVerified && <p style={{ color: "green" }}>Email verified successfully! You can now log in.</p>}
        {user ? (
          <p>Welcome, {user.username}</p>
        ) : (
          <div className="login-card">
              {isRegistered ? (
                  <div>
                      <h2>Login</h2>
                      {error && <p style={{ color: "red" }}>{error}</p>}
                      <form onSubmit={handleSubmit}>
                          <input
                              className="login-card-input"
                              type="text"
                              placeholder="Email or Username"
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                          />
                          <div>
                            <input
                              className="login-card-input"
                              type={showPassword ? "text" : "password"}
                              placeholder="Password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              style={{ flex: 1 }}
                            />
                            <span className="login-eye" onClick={togglePasswordVisibility} style={{ cursor: "pointer", marginLeft: "5px" }}>
                              {showPassword ? <FontAwesomeIcon icon={faEye} /> : <FontAwesomeIcon icon={faEyeSlash} />}
                            </span>
                          </div>
                          <button type="submit">Login</button>
                      </form>
                      <p style={{ cursor: 'pointer' }} onClick={() => setIsRegistered(false)}>Register</p>
                      <p style={{ cursor: 'pointer' }} onClick={() => setForgotPassword(true)}>Forgot your password?</p>
                  </div>
              ) : (
                  <Register 
                  handleClick={() => setIsRegistered(true)}
                  />
              )}
              
          </div>
        )}
      </div>
    ) : (
        <ForgotPassword />
    )
  );
};

export default Login;