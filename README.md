# Intelligent Poaching Detection and Response System

AI-powered poaching detection using **YOLOv8** with a **FastAPI + MongoDB** backend and a **React (Vite)** frontend.

## Quick start (recommended)

### 1) Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** running locally or a reachable MongoDB URI

### 2) Run the Application (Single Command)

We have provided a unified runner script that boots both the backend API and frontend web application simultaneously. 

1. Create your environment file:
   - Copy `backend/.env.example` → `backend/.env`
   - Fill in at least: `MONGO_URI`, `JWT_SECRET`
2. Install dependencies (if you haven't already):
   - Backend: `cd backend && python3 -m venv ../venv && source ../venv/bin/activate && pip install -r requirements.txt`
   - Frontend: `cd frontend && npm install`
3. Run the project from the root folder:

```bash
./run.sh
```

### 3) Manual setup (FastAPI & React)

1. Create your environment file:
   - Copy `backend/.env.example` → `backend/.env`
   - Fill in at least:
     - `MONGO_URI`
     - `JWT_SECRET`

2. Install Python dependencies:

```bash
cd "backend"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

3. Start the API server:

```bash
cd "backend"
source .venv/bin/activate
PYTHONPATH="$PWD" uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will run at:
- API root: `http://localhost:8000/`
- Swagger docs: `http://localhost:8000/docs`

> Notes
> - On startup, the app connects to MongoDB and loads the YOLO model once.
> - Static output folders are created automatically under `backend/static/`.

### 3) Frontend setup (React + Vite)

In a new terminal:

```bash
cd "frontend"
npm install
npm run dev
```

Frontend will run at:
- `http://localhost:5173`

## Configuration

### Backend environment variables

See `backend/.env.example`.

Common variables:
- `MONGO_URI`: MongoDB connection string (e.g. `mongodb://localhost:27017`)
- `DATABASE_NAME`: defaults to `poaching_detection_db`
- `JWT_SECRET`: secret for signing JWT tokens
- `BACKEND_CORS_ORIGINS`: list of allowed frontend origins

### Model weights

The backend uses **Ultralytics YOLOv8**. Weight files are present in the repo (examples: `yolov8n.pt`, `model/best.pt`).

If you change weights or paths, check the detection code in `backend/services/detection_service.py` and/or `model/detector.py`.

## Project structure (high level)

- `backend/` — FastAPI app, API routes, MongoDB, services
- `frontend/` — React app (Vite)
- `model/` — model utilities / training artifacts

## Troubleshooting

### MongoDB connection errors

- Ensure MongoDB is running and reachable via the `MONGO_URI` in `backend/.env`.
- If you’re using MongoDB Atlas, make sure your IP is allowed and the URI includes credentials.

### CORS issues

- Add your frontend URL (e.g. `http://localhost:5173`) to `BACKEND_CORS_ORIGINS` in `backend/.env`.

## Optional: run a quick smoke test

- Open `http://localhost:8000/docs` and try the available endpoints.

---

If you want, tell me your preferred setup (Docker vs local installs), and I can add a `docker-compose.yml` that starts **MongoDB + backend + frontend** in one command.