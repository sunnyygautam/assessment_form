import React, { useEffect, useState } from "react";
import api from "./api";

function AdminDashboard({ onLogout }) {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get("/api/assessments");
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateScore = (responses) => {
    let total = 0;

    for (let i = 0; i < 10; i++) {
      const val = responses[`appraiser-${i}`];
      if (val) total += Number(val);
    }

    return total;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>📊 Admin Dashboard</h2>

      <table border="1" width="100%" cellPadding="8">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Status</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>{item.user_id}</td>
              <td>{item.status}</td>
              <td>{calculateScore(item.data)}</td>
              <td>
                <button onClick={() => setSelected(item)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔍 Detail View */}
      {selected && (
        <div style={{ marginTop: "20px" }}>
          <h3>📄 Employee Details</h3>

          <pre style={{ background: "#f4f4f4", padding: "10px" }}>
            {JSON.stringify(selected.data, null, 2)}
          </pre>

          <button onClick={() => setSelected(null)}>Close</button>
        </div>
     )}
    <div style={{ position: "absolute", right: "20px", top: "20px" }}>
        <button onClick={onLogout}>Logout</button>
    </div>
    </div>
  );
}

export default AdminDashboard;