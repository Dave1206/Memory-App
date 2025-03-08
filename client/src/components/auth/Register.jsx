import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useAxios } from "./AxiosProvider";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const Register = ({ handleClick }) => {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [isUsernameValid, setIsUsernameValid] = useState(null);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const { axiosInstance } = useAxios();
  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  const validateUsername = (name) => {
    const usernameRegex = /^(?!.*[_.]{2})[a-zA-Z0-9][a-zA-Z0-9._]{1,18}[a-zA-Z0-9]$/;
    return usernameRegex.test(name);
  };
  
  useEffect(() => {
    if (username.length < 3) {
      setIsUsernameValid(false);
      setIsUsernameAvailable(null);
      return;
    }

    const checkUsernameAvailability = async (name) => {
      try {
        const response = await axiosInstance.get(`/check-username?username=${name}`);
        return response.data.available;
      } catch (error) {
        console.error("Error checking username availability:", error);
        return false;
      }
    };

    if (validateUsername(username)) {
      setIsUsernameValid(true);

      const timer = setTimeout(async () => {
        const available = await checkUsernameAvailability(username);
        setIsUsernameAvailable(available);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setIsUsernameValid(false);
      setIsUsernameAvailable(null);
    }
  }, [username, axiosInstance]);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!isUsernameValid || !isUsernameAvailable) {
      setError("Invalid or unavailable username.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }

    try {
      await register(username, email, password, confirmPassword);
      setIsRegistered(true);
    } catch (err) {
      setError(err.response?.data.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div>
      <h2>Register</h2>
      {isRegistered ? (
        <p style={{ color: "green" }}>
          Registration successful! Please check your email and click the verification link to activate your account.
        </p>
      ) : (
      <form onSubmit={handleRegister}>
        <div>
          <label>Username:</label>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {username.length > 0 && isUsernameValid === false && <span className="check-username" style={{ color: "red" }}><FontAwesomeIcon icon={faTimesCircle} /></span>}
          {isUsernameValid && isUsernameAvailable === true && <span className="check-username" style={{ color: "green" }}><FontAwesomeIcon icon={faCheckCircle} /></span>}
          {isUsernameValid && isUsernameAvailable === false && <span className="check-username" style={{ color: "red" }}><FontAwesomeIcon icon={faTimesCircle} /></span>}
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
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
              {!showPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
            </span>
          </div>
        </div>
        <div>
          <label>Confirm Password:</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <span onClick={toggleConfirmPasswordVisibility} style={{ cursor: "pointer", marginLeft: "5px" }}>
              {!showConfirmPassword ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
            </span>
          </div>
          <small>
            Password must be at least 8 characters and include an uppercase letter, lowercase letter,
            number, and special character.
          </small>
        </div>
        <button type="submit">Register</button>
      </form>)}
      <p onClick={handleClick}>Login.</p>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default Register;
