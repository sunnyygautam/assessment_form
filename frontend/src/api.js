import axios from "axios";

const api = axios.create({
  baseURL: ""
  // baseURL: "http://localhost:5000"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔥 Handle expired/invalid token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      console.log("Session expired");

      localStorage.removeItem("token");
      localStorage.removeItem("role");

      window.location.href = "/"; // redirect to login
    }

    return Promise.reject(err);
  }
);

export default api;
