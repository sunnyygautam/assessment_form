import React, { useState } from "react";
import axios from "axios";
import { useEffect } from "react";

function Login({ setAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hover, setHover] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [showForgot, setShowForgot] = useState(false);
  const [resetUser, setResetUser] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const login = async () => {
    let newErrors = {};

    if (!username) newErrors.username = "Username is required";
    if (!password) newErrors.password = "Password is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password
      });

      if (remember) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);
        localStorage.setItem("username", username);
      } else {
        sessionStorage.setItem("token", res.data.token);
        sessionStorage.setItem("role", res.data.role);
      }

      setAuth(true);

    } catch (err) {
      setErrors({ general: "Invalid username or password" });
    }
  };

  const handleReset = async () => {
    console.log("Reset user:", resetUser);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/forgot-password",
        { username: resetUser }
      );

      setResetMsg(res.data.message);
    } catch (err) {
      setResetMsg("User not found");
    }
  };

  // 🔥 Enter key support
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };
  const handleResetKeyPress = (e) => {
    if (e.key === "Enter") {
      handleReset();
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRemember(true);
    }
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>TLMTI STAFF PERFORMANCE ASSESSMENT</h2>
        <h3 style={styles.title}>🔐 Login</h3>
        {errors.general && (
          <div style={styles.errorBox}>
            {errors.general}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyPress}
          style={styles.input}
        />
        {errors.username && (
          <span style={styles.error}>{errors.username}</span>
        )}

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            style={{ ...styles.input, width: "93%" }}
          />
          {errors.password && (
            <span style={styles.error}>{errors.password}</span>
          )}

          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              fontSize: "12px",
              color: "#007bff"
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
          <span
            onClick={() => setShowForgot(true)}
            style={{ color: "#007bff", cursor: "pointer", fontSize: "13px" }}
          >
            Forgot Password?
          </span>
        </div>

        <label style={{ fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ marginRight: "5px" }}
          />
          Remember me
        </label>

        <button
          onClick={login}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            ...styles.button,
            background: hover ? "#0056b3" : "#007bff"
          }}
        >
          Login
        </button>
      </div>
      {showForgot && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3>Reset Password</h3>

            <input
              placeholder="Enter username"
              value={resetUser}
              onChange={(e) => setResetUser(e.target.value)}
              style={styles.input}
              onKeyDown={handleResetKeyPress}
            />

            <button onClick={handleReset} style={styles.button}>
              Reset
            </button>

            {resetMsg && <p>{resetMsg}</p>}

            <button onClick={() => setShowForgot(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f6f8"
  },
  card: {
    width: "320px",
    padding: "30px",
    borderRadius: "10px",
    background: "#ffffff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  title: {
    textAlign: "center",
    marginBottom: "10px"
  },
  input: {
    padding: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px"
  },
  button: {
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    background: "#007bff",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer"
  },
  error: {
    color: "red",
    fontSize: "12px"
  },
  errorBox: {
    background: "#ffe6e6",
    color: "red",
    padding: "8px",
    borderRadius: "5px",
    textAlign: "center"
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "300px",
    textAlign: "center"
  }
};

export default Login;