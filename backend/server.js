const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const SECRET = "mysecretkey"; // move to env later

//Read token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).send("No token");
  }

  const token = authHeader.split(" ")[1]; // ✅ FIX

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send("Invalid token");
  }
};

app.get("/api/assessments", verifyToken, async (req, res) => {
  try {
    // 🔒 Only appraiser/admin allowed
    if (req.user.role !== "appraiser") {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      `SELECT a.id, a.user_id, u.username, a.status, a.data
       FROM assessments a
       JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching assessments");
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    const user = result.rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role, user_id: user.id });

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

/**
 * SAVE DRAFT
 */

app.post("/api/draft", verifyToken, async (req, res) => {
  const user_id = req.user.id;
  const { data } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO assessments (user_id, data, status)
       VALUES ($1, $2, 'draft')
       ON CONFLICT (user_id, status)
       DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, data]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving draft");
  }
});

/**
 * FINAL SUBMIT
 */

app.post("/api/submit", verifyToken, async (req, res) => {
  const user_id = req.user.id;
  const { data } = req.body;

  try {
    const result = await pool.query(
      `UPDATE assessments
       SET data = $2,
           status = 'submitted',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND status = 'draft'
       RETURNING *`,
      [user_id, data]
    );

    // 🔥 If no draft exists → insert new
    if (result.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO assessments (user_id, data, status)
         VALUES ($1, $2, 'submitted')
         RETURNING *`,
        [user_id, data]
      );

      return res.json(insert.rows[0]);
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
        // 🔥 Handle duplicate submission
    if (err.code === "23505") {
      return res.status(400).json({
        message: "Form already submitted"
      });
    }

    res.status(500).json({
      message: "Error submitting form"
    });
//    res.status(500).send("Error submitting form");
  }
});

/**
 * GET DRAFT
 */
app.get("/api/draft", verifyToken, async (req, res) => {
//  const { user_id } = req.params;
  const user_id = req.user.id;
  const { data } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM assessments
       WHERE user_id = $1 AND status = 'draft'
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching draft");
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
