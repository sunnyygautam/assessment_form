import React, { useState } from "react";
import axios from "axios";

function Login({ setAuth }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
  try {
    const res = await axios.post("http://localhost:5000/api/login", {
      username,
      password
    });

    console.log("LOGIN RESPONSE:", res.data);  // ✅ DEBUG

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("role", res.data.role);

    console.log("TOKEN SAVED:", localStorage.getItem("token")); // ✅ DEBUG

    setAuth(true);
  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
};

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>

      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>Login</button>
    </div>
  );
}

export default Login;
