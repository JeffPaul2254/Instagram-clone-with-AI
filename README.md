# 📸 Instagram Clone — Local Full-Stack App

A fully functional Instagram clone with React frontend + Node.js/Express backend + MySQL database.

---

## ✅ Features

- **Auth**: Sign up, Log in, JWT sessions
- **Feed**: Chronological post feed from all users
- **Create Post**: Upload image + caption via the navbar `+` button
- **Like Posts**: Heart button (double-tap image too!)
- **Comments**: View and add comments
- **Suggested For You**: Right sidebar shows real accounts from your DB
- **Follow/Unfollow**: Follow suggested users

---

## 🔧 Prerequisites

- **Node.js** v16+ — [nodejs.org](https://nodejs.org)
- **MySQL** running locally (MAMP, XAMPP, Homebrew, or native)

---

## 🚀 Setup (3 Steps)

### Step 1 — MySQL Database

Open your MySQL client and run:

```sql
CREATE DATABASE instagram_clone;
```

Or run the included file:
```bash
mysql -u root -p < setup.sql
```

> If your MySQL root password is not empty, open `backend/server.js` and update line ~22:
> ```js
> password: 'YOUR_MYSQL_PASSWORD',
> ```

---

### Step 2 — Backend

```bash
cd backend
npm install
npm start
```

You should see:
```
✅ Database tables ready
🚀 Server running on http://localhost:5000
```

---

### Step 3 — Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm start
```

React will open **http://localhost:3000** automatically.

---

## 🗂 Project Structure

```
instagram-clone/
├── backend/
│   ├── server.js          # Express API + MySQL
│   ├── package.json
│   └── uploads/           # Auto-created on first run
│       ├── posts/
│       └── avatars/
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── context/
│       │   └── AuthContext.js
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── SignupPage.js
│       │   └── HomePage.js
│       └── components/
│           ├── Navbar.js       # + Create post modal
│           ├── PostCard.js     # Like, comment, share
│           └── RightSidebar.js # Suggested users
└── setup.sql
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Get current user |
| GET  | `/api/posts/feed` | Get all posts |
| POST | `/api/posts` | Create post (multipart) |
| POST | `/api/posts/:id/like` | Toggle like |
| GET  | `/api/posts/:id/comments` | Get comments |
| POST | `/api/posts/:id/comments` | Add comment |
| GET  | `/api/users/suggestions` | Suggested users |
| POST | `/api/users/:id/follow` | Toggle follow |

---

## 🛠 Troubleshooting

**MySQL connection error?**
- Ensure MySQL is running
- Check username/password in `backend/server.js`
- Ensure `instagram_clone` database exists

**Port already in use?**
- Backend: Change `PORT` in `server.js`
- Frontend: React will ask to use another port automatically

**CORS error?**
- Make sure backend is running on port 5000
- The `proxy` in `frontend/package.json` handles this

---

## 🎨 Tech Stack

- **Frontend**: React 18, React Router v6, Axios, react-hot-toast
- **Backend**: Node.js, Express, MySQL2, bcryptjs, jsonwebtoken, multer
- **Database**: MySQL with 5 tables: users, posts, likes, comments, follows
