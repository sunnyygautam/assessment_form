const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * SAVE DRAFT
 */

app.post("/api/draft", async (req, res) => {
  const { user_id, data } = req.body;

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
//app.post("/api/submit", async (req, res) => {
//  const { user_id, data } = req.body;

//  try {
//    const result = await pool.query(
//      `INSERT INTO assessments (user_id, data, status)
//       VALUES ($1, $2, 'submitted')
//       RETURNING *`,
//      [user_id, data]
 //   );
//
  //  res.json(result.rows[0]);
 // } catch (err) {
  //  console.error(err);
  //  res.status(500).send("Error submitting form");
 // }
//});

app.post("/api/submit", async (req, res) => {
  const { user_id, data } = req.body;

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

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error submitting form");
  }
});

/**
 * GET DRAFT
 */
app.get("/api/draft/:user_id", async (req, res) => {
  const { user_id } = req.params;

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
