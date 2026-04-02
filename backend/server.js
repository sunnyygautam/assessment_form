const express = require("express");
const cors = require("cors");
const pool = require("./db");
const path = require("path");
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

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

//HELPER FUNCTION
const filterFieldsByRole = (data, role) => {
  const filtered = {};

  Object.keys(data).forEach((key) => {

    if (role === "appraiser") {
      // ✅ Only allow appraiser fields
      if (
        key.startsWith("appraiser-") ||
        key.toLowerCase().includes("appraiser")
      ) {
        filtered[key] = data[key];
      }
    }

    if (role === "appraisee") {
      // ✅ Only allow appraisee fields
      if (
        key.startsWith("appraisee-") ||
        !key.toLowerCase().includes("appraiser")
      ) {
        filtered[key] = data[key];
      }
    }

  });

  return filtered;
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
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔥 ONLY bcrypt check (NO plain comparison)
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch); // 🔍 DEBUG
    // console.log("Username:", username);
    console.log("DB user:", user);
    console.log("Entered password:", password);
    // console.log("Stored hash:", user?.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      user_id: user.id
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
});

/**
 * SAVE DRAFT
 */

app.post("/api/draft", verifyToken, upload.any(), async (req, res) => {
  const user_id = req.user.id;

  try {
    // 🔥 check submitted
    const submittedCheck = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'submitted'`,
      [user_id]
    );

    if (submittedCheck.rows.length > 0) {
      return res.status(400).json({
        message: "Form already submitted. Draft not allowed."
      });
    }

    // 🔥 get existing draft
    const existing = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'draft'`,
      [user_id]
    );

    let existingData = existing.rows[0]?.data || {};

    // 🔥 merge fields
    // let newData = {
    //   ...existingData,
    //   ...req.body
    // };
    const role = req.user.role; // 🔥 IMPORTANT

    const filteredBody = filterFieldsByRole(req.body, role);

    let newData = {
      ...existingData,
      ...filteredBody
    };

    // 🔥 attach files
    if (req.files && req.files.length > 0) {
      // req.files.forEach(file => {
      //   newData[file.fieldname] = file.filename;
      // });
      req.files.forEach(file => {
        const key = file.fieldname;

        if (req.user.role === "appraiser") {
          if (key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        } else {
          if (!key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO assessments (user_id, data, status)
       VALUES ($1, $2, 'draft')
       ON CONFLICT (user_id, status)
       DO UPDATE SET
         data = $2,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, newData]
    );

    res.json({
      success: true,
      data: result.rows[0].data
    });

  } catch (err) {
    console.error("Draft error:", err);
    res.status(500).json({ message: "Error saving draft" });
  }
});

/**
 * FINAL SUBMIT
 */
app.post("/api/submit", verifyToken, upload.any(), async (req, res) => {
  const user_id = req.user.id;

  try {
    // 🔥 Check if already submitted
    const submittedCheck = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'submitted'`,
      [user_id]
    );

    if (submittedCheck.rows.length > 0) {
      return res.status(400).json({
        message: "Form already submitted"
      });
    }

    // 🔥 Get existing draft (if any)
    const existing = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'draft'`,
      [user_id]
    );

    let existingData = existing.rows[0]?.data || {};

    // 🔥 Merge incoming text fields
    // let newData = {
    //   ...existingData,
    //   ...req.body
    // };
    const role = req.user.role; // 🔥 IMPORTANT

    const filteredBody = filterFieldsByRole(req.body, role);

    let newData = {
      ...existingData,
      ...filteredBody
    };

    // 🔥 Attach uploaded files (per field)
    if (req.files && req.files.length > 0) {
      // req.files.forEach(file => {
      //   newData[file.fieldname] = file.filename;
      // });
      req.files.forEach(file => {
        const key = file.fieldname;

        if (req.user.role === "appraiser") {
          if (key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        } else {
          if (!key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        }
      });
    }

    let result;

    // 🔥 If draft exists → update it to submitted
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE assessments
         SET data = $2,
             status = 'submitted',
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND status = 'draft'
         RETURNING *`,
        [user_id, newData]
      );
    } 
    // 🔥 Else insert new
    else {
      result = await pool.query(
        `INSERT INTO assessments (user_id, data, status)
         VALUES ($1, $2, 'submitted')
         RETURNING *`,
        [user_id, newData]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Form submitted successfully",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("Submit Error:", err);

    return res.status(500).json({
      success: false,
      message: "Error submitting form"
    });
  }
});

/**
 * GET DRAFT
 */
app.get("/api/draft", verifyToken, async (req, res) => {
  const user_id = req.user.id;

  try {
    // 🔥 FIRST check submitted
    const submitted = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'submitted'
       LIMIT 1`,
      [user_id]
    );

    if (submitted.rows.length > 0) {
      return res.json(submitted.rows[0]); // ✅ return submitted
    }

    // 🔹 else return draft
    const draft = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 AND status = 'draft'
       LIMIT 1`,
      [user_id]
    );

    res.json(draft.rows[0] || {});

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { username, newPassword } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password = $1 WHERE username = $2",
      [hashedPassword, username]
    );

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating password");
  }
});

app.get("/api/admin/assessment/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM assessments 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching assessment");
  }
});

// ✅ ADMIN DRAFT
app.post("/api/admin/draft/:userId", verifyToken, upload.any(), async (req, res) => {
  const user_id = req.params.userId;

  try {
    const existing = await pool.query(
      `SELECT * FROM assessments WHERE user_id = $1 AND status = 'draft'`,
      [user_id]
    );

    let existingData = existing.rows[0]?.data || {};

    // let newData = {
    //   ...existingData,
    //   ...req.body
    // };
    const filteredBody = filterFieldsByRole(req.body, "appraiser");

    let newData = {
      ...existingData,
      ...filteredBody
    };

    if (req.files && req.files.length > 0) {
      // req.files.forEach(file => {
      //   newData[file.fieldname] = file.filename;
      // });
      req.files.forEach(file => {
        const key = file.fieldname;

        if (req.user.role === "appraiser") {
          if (key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        } else {
          if (!key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        }
      });
    }

    const result = await pool.query(
      `INSERT INTO assessments (user_id, data, status)
       VALUES ($1, $2, 'draft')
       ON CONFLICT (user_id, status)
       DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, newData]
    );

    res.json({ success: true, data: result.rows[0].data });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving admin draft");
  }
});

// ✅ ADMIN SUBMIT
app.post("/api/admin/submit/:userId", verifyToken, upload.any(), async (req, res) => {
  const user_id = req.params.userId;

  try {
    const existing = await pool.query(
      `SELECT * FROM assessments WHERE user_id = $1`,
      [user_id]
    );

    let existingData = existing.rows[0]?.data || {};

    // let newData = {
    //   ...existingData,
    //   ...req.body
    // };
    const filteredBody = filterFieldsByRole(req.body, "appraiser");

    let newData = {
      ...existingData,
      ...filteredBody
    };

    if (req.files && req.files.length > 0) {
      // req.files.forEach(file => {
      //   newData[file.fieldname] = file.filename;
      // });
      req.files.forEach(file => {
        const key = file.fieldname;

        if (req.user.role === "appraiser") {
          if (key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        } else {
          if (!key.toLowerCase().includes("appraiser")) {
            newData[key] = file.filename;
          }
        }
      });
    }

    const result = await pool.query(
      `UPDATE assessments
       SET data = $2,
           status = 'submitted',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING *`,
      [user_id, newData]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting admin form");
  }
});

//ADMIN DELETE
app.delete("/api/admin/assessment/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    // await pool.query(
    //   `DELETE FROM assessments WHERE user_id = $1`,
    //   [userId]
    // );
    await pool.query(
      `UPDATE assessments 
      SET status = 'draft', data = '{}'
      WHERE user_id = $1`,
      [userId]
    );

    res.json({ message: "Assessment deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting assessment");
  }
});

//ADMIN REJECT
app.post("/api/admin/reject/:userId", verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    await pool.query(
      `UPDATE assessments 
      SET status = 'draft' 
      WHERE user_id = $1`,
      [userId]
    );

    res.json({ message: "Assessment deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting assessment");
  }
});

  // 🔥 Serve React build
  app.use(express.static(path.join(__dirname, "build")));
  app.use("/uploads", express.static("uploads"));

  // 🔥 Catch-all route (for React routing)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });

app.listen(5000, () => console.log("Server running on port 5000"));
