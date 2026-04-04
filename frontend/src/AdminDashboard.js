import React, { useEffect, useState } from "react";
import api from "./api";

function AdminDashboard({ onLogout, onSelectUser }) {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const handleDelete = async (userId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this assessment?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/api/admin/assessment/${userId}`);

      alert("Assessment deleted successfully");

      // 🔥 refresh table
      fetchData();

    } catch (err) {
      console.error(err);
      alert("Error deleting assessment");
    }
  };
  const handleReject = async (userId) => {
    const confirmReject = window.confirm(
      "Are you sure you want to reject this assessment?"
    );

    if (!confirmReject) return;

    try {
      await api.post(`/api/admin/reject/${userId}`);

      alert("Assessment rejected successfully");

      // 🔥 refresh table
      fetchData();

    } catch (err) {
      console.error(err);
      alert("Error rejecting assessment");
    }
  };

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

  // const calculateScore = (responses) => {
  //   let total = 0;

  //   for (let i = 0; i < 10; i++) {
  //     const val = responses[`appraiser-${i}`];
  //     if (val) total += Number(val);
  //   }
  //   return total;
  // };
  const calculateScore = (responses, role) => {
    let total = 0;

    const prefix = role === "appraiser" ? "appraiser" : "appraisee";

    for (let i = 0; i < 10; i++) {
      const val = responses[`${prefix}-${i}`];
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

  const downloadPDF = async (userId) => {
    try {
      const res = await api.get(`/api/pdf/${userId}`, {
        responseType: "blob"
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `appraisal_${userId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error("PDF Error:", err);

      // ✅ ONLY show error if backend actually failed
      if (err.response && err.response.status !== 200) {
        alert("Error downloading PDF");
      }

      // ❌ REMOVE this
      // if (!err.response) alert(...)
    }
  };

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
                <td>
                  {/* {calculateScore(item.data || {}, "appraiser")} */}
                  Appraisee: {calculateScore(item.data, "appraisee")} <br />
                  Appraiser: {calculateScore(item.data, "appraiser")}
                </td>
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
                <button
                  style={{ marginLeft: "10px", color: "red" }}
                  onClick={() => handleReject(item.user_id)}
                >
                  Reject
                </button>
                <button
                  style={{ marginLeft: "10px", color: "red" }}
                  onClick={() => handleDelete(item.user_id)}
                >
                  Reset
                </button>
                <button
                  style={{ marginLeft: "10px" }}
                  onClick={() =>
                    downloadPDF(item.user_id)
                  }
                >
                  📄 Download Server PDF
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