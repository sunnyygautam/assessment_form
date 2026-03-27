import React, { useState } from "react";
import axios from "axios";
import { useEffect } from "react";

function Login({ setAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hover, setHover] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const login = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password
      });

    if (remember) {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", username);
      localStorage.setItem("password", password);   // ⚠️ not secure
    } else {
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("role", res.data.role);
      localStorage.removeItem("username");
    }

      setAuth(true);
    } catch (err) {
      console.error(err);
      alert("Invalid credentials");
    }
  };

  // 🔥 Enter key support
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
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

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKeyPress}
          style={styles.input}
        />

        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            style={{ ...styles.input, width: "93%" }}
          />

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
  }
};

export default Login;