# 🏥 Contributors

This project was collaboratively developed by:

- Sonakshi Saraswat (@sonakshyy) — AI Model Training, Triage System & ML Pipeline
- Lakshya Sharma — Frontend , Backend & dashboard


# 🏥 AI Hospital Triage System — Complete Guide

A production-ready hackathon project: AI-based Pre-Triage + Re-Triage system
to reduce hospital wait times and save lives.

---

## 📁 Folder Structure

```
hospital-triage/
├── backend/              ← Node.js + Express (deploy on Render)
│   ├── config/db.js
│   ├── models/Patient.js
│   ├── routes/patients.js
│   ├── services/aiService.js
│   ├── services/cronService.js
│   ├── server.js
│   └── package.json
│
├── frontend-qr/          ← React QR Registration (deploy on Vercel)
│   └── src/
│       ├── api/index.js
│       ├── components/RegistrationForm.js
│       ├── components/QRDisplay.js
│       ├── App.js / App.css
│       └── index.js
│
├── dashboard/            ← React Dashboards (run LOCALLY)
│   └── src/
│       ├── pages/ReTriageDashboard.js
│       ├── pages/FinalDashboard.js
│       ├── components/VitalsModal.js
│       ├── components/WalkInModal.js
│       ├── components/PatientDetailModal.js
│       ├── socket/index.js
│       ├── api/index.js
│       └── utils/priority.js
│
└── ai-service/           ← FastAPI Python AI (run LOCALLY + expose via ngrok)
    ├── main.py
    └── requirements.txt
```

---

## 🔄 System Flow

```
Patient scans QR (Vercel)
    → POST /api/patient → MongoDB (status: pending)
    
Cron Job (every 30s)
    → GET pending patients
    → POST to FastAPI /predict (via ngrok)
    → UPDATE MongoDB (status: pre_triaged, priority assigned)

Nurse opens Re-Triage Dashboard (localhost:3001)
    → Sees queue sorted by priority
    → Level-1: Approve → status: completed
    → Level-1: Disapprove / Any: Fill Vitals → status: re_triaged
    → Walk-in Emergency → status: completed, priority: level1
    → Walk-in Normal → status: re_triaged

Cron Job (every 30s, offset 15s)
    → GET re_triaged patients
    → POST to FastAPI /predict
    → UPDATE MongoDB (status: completed, priority assigned)

Final Dashboard (localhost:3001/final)
    → Shows completed patients as colored cards
    → level1=red, level2=orange, level3=yellow, level4/5=green
    → Click card → full details modal
```

---

## 🚀 STEP-BY-STEP SETUP

---

### STEP 1 — MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Click **"Build a Database"** → Choose **FREE tier (M0)**
3. Select **AWS / Singapore (ap-southeast-1)** or closest region
4. Create a username + password (save these!)
5. Under **"Network Access"** → Click **"Add IP Address"** → choose **"Allow Access from Anywhere"** (0.0.0.0/0)
6. Click **"Connect"** → **"Drivers"** → Node.js
7. Copy the connection string:
   ```
   mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/hospital_triage?retryWrites=true&w=majority
   ```
8. Replace `<password>` with your actual password

---

### STEP 2 — FastAPI AI Service (Local)

```bash
cd hospital-triage/ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate         # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Test it:
```bash
curl http://localhost:8000/health
# → {"status":"healthy"}
```

---

### STEP 3 — Expose FastAPI via ngrok

The Render backend (deployed in cloud) cannot call your localhost.
Use ngrok to create a public tunnel.

```bash
# Install ngrok: https://ngrok.com/download
# Sign up at ngrok.com → get your auth token

ngrok config add-authtoken YOUR_NGROK_TOKEN

# In a NEW terminal (keep FastAPI running)
ngrok http 8000
```

You'll see:
```
Forwarding   https://abc123.ngrok-free.app → http://localhost:8000
```

**Copy this URL (e.g., https://abc123.ngrok-free.app)**
You'll need it as `AI_URL` in Render.

⚠️ The ngrok URL changes every time you restart (free tier).
   Update it in Render env vars when it changes.

---

### STEP 4 — Backend (Render)

1. Push the `backend/` folder to a GitHub repo
2. Go to https://render.com → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** `Node`
5. Add Environment Variables:
   ```
   MONGODB_URI   = mongodb+srv://...  (from Step 1)
   AI_URL        = https://abc123.ngrok-free.app  (from Step 3)
   FRONTEND_URL  = https://your-app.vercel.app  (from Step 5)
   NODE_ENV      = production
   ```
6. Click **Deploy**
7. Copy the Render URL (e.g., `https://hospital-triage-api.onrender.com`)

---

### STEP 5 — Frontend QR (Vercel)

1. Push `frontend-qr/` to GitHub
2. Go to https://vercel.com → **New Project**
3. Import the repo
4. Set **Root Directory** to `frontend-qr`
5. Add Environment Variable:
   ```
   REACT_APP_BACKEND_URL = https://hospital-triage-api.onrender.com
   ```
6. Deploy → copy the Vercel URL
7. Go back to Render → update `FRONTEND_URL` with Vercel URL
8. Generate a QR code pointing to your Vercel URL and print/display it

---

### STEP 6 — Local Dashboards

```bash
cd hospital-triage/dashboard

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_BACKEND_URL=https://hospital-triage-api.onrender.com" > .env

# Start dashboard (runs on port 3001)
npm start
```

Browser opens at `http://localhost:3001`
- `/`      → Re-Triage Queue (for triage nurse)
- `/final` → Final Dashboard (for hospital staff)

---

## 🧪 TESTING GUIDE

### Test 1 — QR Registration

Open your Vercel URL and fill the form:
```json
{
  "name": "Rahul Sharma",
  "age": 35,
  "gender": "male",
  "mobile": "9876543210",
  "condition": "Severe chest pain radiating to left arm",
  "symptoms": "Difficulty breathing, sweating",
  "eta": "2025-01-15T14:30"
}
```

### Test 2 — Postman: Direct Patient Registration

**POST** `https://your-backend.onrender.com/api/patient`
```json
{
  "name": "Priya Patel",
  "age": 28,
  "gender": "female",
  "mobile": "9123456789",
  "condition": "Unconscious after road accident",
  "symptoms": "Head injury, severe bleeding",
  "eta": "2025-01-15T15:00"
}
```

### Test 3 — Postman: Manually Trigger Pre-Triage AI

**POST** `https://your-backend.onrender.com/api/pre-triage/run`
*(No body needed)*

### Test 4 — Postman: Submit Vitals (Re-Triage)

**PUT** `https://your-backend.onrender.com/api/patient/PATIENT_ID/vitals`
```json
{
  "vitals": {
    "temp": 38.9,
    "pulse": 118,
    "spo2": 91,
    "bp": { "sbp": 165, "dbp": 95 }
  },
  "symptoms": "Shortness of breath, high fever, cough",
  "condition": "Suspected pneumonia"
}
```

### Test 5 — Postman: Add Walk-In Emergency

**POST** `https://your-backend.onrender.com/api/patient/walk-in`
```json
{
  "name": "Amit Kumar",
  "age": 52,
  "gender": "male",
  "mobile": "9000011111",
  "condition": "Cardiac arrest",
  "isEmergency": true,
  "department": "Cardiology"
}
```

### Test 6 — Postman: Manually Trigger Re-Triage AI

**POST** `https://your-backend.onrender.com/api/re-triage`

### Test 7 — Test AI directly

**POST** `http://localhost:8000/predict`
```json
{
  "_id": "test123",
  "symptoms": "difficulty breathing, chest pain",
  "condition": "cardiac arrest, unconscious",
  "vitals": {
    "temp": 38.5,
    "pulse": 140,
    "spo2": 86,
    "bp": { "sbp": 185, "dbp": 110 }
  }
}
```
Expected: `{"_id":"test123","priority":"level1","department":"Cardiology","explanation":"..."}`

---

## 🗄️ Database — Status Flow

```
pending
  ↓ (AI pre-triage cron)
pre_triaged  ←── shown in Re-Triage Queue
  ↓ (nurse approves emergency)    ↓ (nurse fills vitals)
completed                       re_triaged
  ↑                               ↓ (AI re-triage cron)
  └─────────────── completed ─────┘
```

---

## ⚠️ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| AI not being called | Check `AI_URL` in Render env vars matches current ngrok URL |
| Render backend crashes | Check MongoDB URI is correct, IP whitelist is 0.0.0.0/0 |
| Socket not connecting | Check `REACT_APP_BACKEND_URL` in dashboard `.env` |
| Patients stuck in "pending" | Cron runs every 30s — wait or hit `/api/pre-triage/run` |
| ngrok URL expired | Free tier URLs expire. Restart ngrok, update `AI_URL` in Render |
| CORS errors | Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly |

---

## 🤝 Architecture Handshake (AI Integration)

```
Node.js (Render)                FastAPI (Local + ngrok)
─────────────────               ──────────────────────
cronService.js
  → finds pending patients
  → for each patient:
      axios.POST(AI_URL/predict, {
        _id, symptoms,          → app.post("/predict")
        condition, vitals           compute_priority()
      })                            get_department()
                              ←     build_explanation()
      receives { _id,
        priority, dept, expl }
  → Patient.findByIdAndUpdate(
      _id, { status, priority,
             dept, explanation })
  → io.emit("patient_pre_triaged")
```

**Key Rule:** FastAPI NEVER touches MongoDB.
Node.js is the ONLY database client.
FastAPI only computes and returns predictions.

---

## 📱 QR Code for Hospital Display

After deploying to Vercel, generate a printable QR:

```javascript
// Use qrcode npm package to generate PNG for printing
const QRCode = require('qrcode');
QRCode.toFile('hospital-qr.png', 'https://your-app.vercel.app', {
  width: 400, margin: 2
});
```

Or use https://qr-code-generator.com — paste your Vercel URL.

---

## 🔑 Environment Variables Summary

### Backend (Render)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hospital_triage
AI_URL=https://abc123.ngrok-free.app
FRONTEND_URL=https://your-qr-app.vercel.app
NODE_ENV=production
PORT=5000
```

### Frontend QR (Vercel)
```env
REACT_APP_BACKEND_URL=https://hospital-triage-api.onrender.com
```

### Dashboard (Local .env)
```env
REACT_APP_BACKEND_URL=https://hospital-triage-api.onrender.com
```
