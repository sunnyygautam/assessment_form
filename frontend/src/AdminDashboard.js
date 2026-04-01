import React, { useEffect, useState } from "react";
import api from "./api";

function AdminDashboard({ onLogout, onSelectUser }) {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get("/api/assessments");
      console.log("API DATA:", res.data);
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

  const filteredData = data.filter((item) => {
    const name = (item.username || "").toLowerCase();

    const matchesName =
      name.includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "" || item.status === statusFilter;

    return matchesName && matchesStatus;
  });

  return (
    <div style={{ padding: "20px" }}>
      <h2>📊 Admin Dashboard</h2>

    <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
    <input
        type="text"
        placeholder="Search by username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "8px", width: "200px" }}
    />

    <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        style={{ padding: "8px" }}
    >
        <option value="">All Status</option>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
    </select>
    </div>

      <table border="1" width="100%" cellPadding="8">
        <thead>
          <tr>
            <th>Username</th>
            <th>Status</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
        {filteredData.length === 0 ? (
            <tr>
            <td colSpan="4" style={{ textAlign: "center" }}>
                No records found
            </td>
            </tr>
        ) : (
            filteredData.map((item) => (
            <tr key={item.id}>
                <td>{item.username}</td>
                <td>{item.status}</td>
                <td>{calculateScore(item.data || {})}</td>
                <td>
                <button onClick={() => setSelected(item)}>
                    View
                </button>
                {/* <button onClick={() => onSelectUser(item)}> */}
                <button
                  disabled={!item.data}
                  style={{ marginLeft: "10px" }}
                  onClick={() =>
                    onSelectUser({
                      userId: item.user_id,
                      username: item.username
                    })
                  }
                >
                  ✏️ Open Form
                </button>
                </td>
            </tr>
            ))
        )}
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
        <button onClick={() => {
            setSearch("");
            setStatusFilter("");
            }}>
            Clear
        </button>
    </div>
    </div>
  );
}

export default AdminDashboard;