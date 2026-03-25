# TLMTI Staff Performance Assessment & Development Form 2025

A full-stack web application for managing staff performance assessments with multi-step forms, role-based access, and PostgreSQL persistence.

---

## 🚀 Features

### ✅ Section 1 – Assessment Form

* Dynamic form generated from JSON
* Supports:

  * Text inputs
  * Date fields
  * Radio buttons
  * Textareas
  * Sub-questions (1, 2, 3 format)
* Auto-save draft support

### ✅ Section 2 – Performance Evaluation

* Structured rating table
* Appraisee & Appraiser inputs
* Score calculation (out of 40)
* Rating categories:

  * POOR
  * AVERAGE
  * GOOD
  * EXCELLENT

### 🔐 Authentication & Authorization

* JWT-based login system
* Role-based access:

  * Appraisee → fills Section 1 & self-rating
  * Appraiser → evaluates performance

### 💾 Draft & Submission System

* Save draft (UPSERT in PostgreSQL)
* Resume form anytime
* Final submission locks data

---

## 🏗️ Tech Stack

### Frontend

* React.js
* Axios (with interceptor for JWT)
* Dynamic UI rendering

### Backend

* Node.js
* Express.js
* JWT Authentication

### Database

* PostgreSQL (JSONB for flexible schema)

### DevOps

* Docker (optional setup)

---

## 📁 Project Structure

```
assessment_form/
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── Login.js
│   │   ├── api.js
│   │   ├── form.json
│   │   └── App.css
│
├── backend/
│   ├── server.js
│   ├── db.js
│   └── package.json
│
└── docker-compose.yml
```

---

## ⚙️ Setup Instructions

### 🔹 1. Clone Repository

```bash
git clone <repo-url>
cd assessment_form
```

---

### 🔹 2. Backend Setup

```bash
cd backend
npm install
```

#### Configure PostgreSQL (db.js)

```js
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "assessment_db",
  password: "postgres",
  port: 5432,
});
```

---

### 🔹 3. Create Database Tables

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK (role IN ('appraisee', 'appraiser')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessments (
  id SERIAL PRIMARY KEY,
  user_id INT,
  data JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, status)
);
```

---

### 🔹 4. Insert Test Users

```sql
INSERT INTO users (username, password, role)
VALUES 
('user1', 'password123', 'appraisee'),
('manager1', 'password123', 'appraiser');
```

---

### 🔹 5. Start Backend

```bash
node server.js
```

Server runs on:

```
http://localhost:5000
```

---

### 🔹 6. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App runs on:

```
http://localhost:3000
```

---

## 🔐 Authentication Flow

1. User logs in via `/api/login`
2. JWT token stored in `localStorage`
3. Axios interceptor attaches token:

```
Authorization: Bearer <token>
```

4. Backend verifies token using middleware

---

## 💾 API Endpoints

### 🔹 Login

```
POST /api/login
```

### 🔹 Save Draft (UPSERT)

```
POST /api/draft
```

### 🔹 Get Draft

```
GET /api/draft
```

### 🔹 Submit Final

```
POST /api/submit
```

---

## 🧠 Key Concepts

* Dynamic form rendering from JSON
* JWT-based secure API communication
* PostgreSQL JSONB for flexible schema
* UPSERT logic for draft management
* Multi-step form navigation

---

## 🚀 Future Enhancements

* 🔐 Password hashing (bcrypt)
* 📄 PDF export (final form)
* 📊 Dashboard & analytics
* 👥 Multi-user management
* 📧 Email notifications
* 🕒 Session timeout handling

---

## 👨‍💻 Author

Sunny Kumar Gautam

---

## 📄 License

This project is for internal use and demonstration purposes.
