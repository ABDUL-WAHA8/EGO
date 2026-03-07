# ✈ Wanderlist — Travel Bucket List App

A full-stack travel bucket list web application built with FastAPI + PostgreSQL + Vanilla JS.

## Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript → Vercel
- **Backend**: FastAPI (Python) → Render
- **Database**: PostgreSQL → Neon.tech

---

## 🚀 Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your .env values
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
# Just open with Live Server (VS Code) or:
npx serve . -p 3000
```

### 3. Set API URL
In `frontend/js/api.js`, the default is `http://localhost:8000`.
For production, set `window.API_BASE_URL` before loading `api.js`.

---

## 🗄 Database (Neon.tech)
1. Create free account at https://neon.tech
2. Create a new project
3. Copy the connection string to your `.env` as `DATABASE_URL`
4. Tables are created automatically on first run

---

## 🌐 Deployment

### Backend → Render
1. Push to GitHub
2. New Web Service on Render → connect repo
3. Set Root Directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables from `.env`

### Frontend → Vercel
1. New project on Vercel → connect repo
2. Set Root Directory: `frontend`
3. Framework: Other (static)
4. Add env variable: `NEXT_PUBLIC_API_URL` = your Render URL
5. In `frontend/js/api.js`, update `API_BASE` to your Render URL

---

## 📁 Structure
```
travel-bucket-list/
├── frontend/          # Static HTML/CSS/JS → Vercel
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── explore.html
│   ├── destination.html
│   ├── profile.html
│   ├── css/
│   └── js/
└── backend/           # FastAPI → Render
    ├── main.py
    ├── models.py
    ├── schemas.py
    ├── auth.py
    ├── database.py
    ├── dependencies.py
    └── routers/
```