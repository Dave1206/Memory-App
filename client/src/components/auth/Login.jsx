import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import Register from "./Register";
import { useAuth } from "./AuthContext";
import { useAxios } from "./AxiosProvider";
import ForgotPassword from "./ForgotPassword";
import '../../styles/Login.css';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const { setSessionExpired } = useAxios();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password);
    setSessionExpired(false);
  };

  return (
    !forgotPassword ? (
      <div className="login-container">
        {user ? (
          <p>Welcome, {user.username}</p>
        ) : (
          <div className="login-card">
              {isRegistered ? (
                  <div>
                      <h2>Login</h2>
                      <form onSubmit={handleSubmit}>
                          <input
                              type="email"
                              placeholder="Email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                          />
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <input
                              type={showPassword ? "text" : "password"}
                              placeholder="Password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              style={{ flex: 1 }}
                            />
                            <span onClick={togglePasswordVisibility} style={{ cursor: "pointer", marginLeft: "5px" }}>
                              {showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
                            </span>
                          </div>
                          <button type="submit">Login</button>
                      </form>
                      <p style={{ cursor: 'pointer' }} onClick={() => setIsRegistered(false)}>Not registered? Click here.</p>
                      <p style={{ cursor: 'pointer' }} onClick={() => setForgotPassword(true)}>Forgot your password? Click here.</p>
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
      <div>
        <ForgotPassword />
      </div>
    )
  );
};

export default Login;