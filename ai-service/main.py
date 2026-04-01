# ai-service/main.py — FastAPI prediction service
# Run: uvicorn main:app --reload --port 8000
# Expose: ngrok http 8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="Hospital Triage AI", version="1.0.0")

# CORS — allow calls from Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Models ────────────────────────────────────
class VitalsInput(BaseModel):
    temp:  Optional[float] = None   # °C
    bp:    Optional[dict]  = None   # { sbp, dbp }
    pulse: Optional[int]   = None   # bpm
    spo2:  Optional[float] = None   # %

class PredictRequest(BaseModel):
    _id:       str
    symptoms:  Optional[str]         = ""
    condition: Optional[str]         = ""
    vitals:    Optional[VitalsInput] = None

class PredictResponse(BaseModel):
    _id:         str
    priority:    str
    department:  str
    explanation: str


# ─── Rule-based AI Logic ─────────────────────────────────────────

EMERGENCY_KEYWORDS = [
    "unconscious", "unresponsive", "cardiac arrest", "heart attack",
    "stroke", "not breathing", "stopped breathing", "severe bleeding",
    "trauma", "accident", "head injury", "anaphylaxis", "anaphylactic",
    "convulsion", "seizure", "choking", "respiratory failure",
    "loss of consciousness", "critical", "emergency"
]

HIGH_URGENCY_KEYWORDS = [
    "difficulty breathing", "shortness of breath", "severe pain",
    "high fever", "fracture", "broken bone", "burns", "chest pain",
    "severe headache", "altered consciousness", "vomiting blood",
    "drug overdose", "poisoning", "severe allergic", "diabetic"
]

MODERATE_KEYWORDS = [
    "moderate pain", "vomiting", "dizziness", "fever", "infection",
    "abdominal pain", "back pain", "laceration", "sprain", "dehydration"
]

DEPARTMENT_MAP = {
    "cardiac":      "Cardiology",
    "chest pain":   "Cardiology",
    "heart":        "Cardiology",
    "head injury":  "Neurology",
    "stroke":       "Neurology",
    "unconscious":  "Neurology",
    "seizure":      "Neurology",
    "neuro":        "Neurology",
    "breathing":    "Pulmonology",
    "respiratory":  "Pulmonology",
    "asthma":       "Pulmonology",
    "lung":         "Pulmonology",
    "fracture":     "Orthopedics",
    "accident":     "Trauma & Orthopedics",
    "trauma":       "Trauma & Orthopedics",
    "bone":         "Orthopedics",
    "abdominal":    "Gastroenterology",
    "stomach":      "Gastroenterology",
    "appendix":     "Gastroenterology",
    "liver":        "Gastroenterology",
    "burn":         "Burns & Plastics",
    "skin":         "Dermatology",
    "eye":          "Ophthalmology",
    "ear":          "ENT",
    "child":        "Pediatrics",
    "infant":       "Pediatrics",
    "pregnant":     "Obstetrics & Gynecology",
    "pregnancy":    "Obstetrics & Gynecology",
    "diabetic":     "Endocrinology",
    "diabetes":     "Endocrinology",
    "mental":       "Psychiatry",
    "poison":       "Toxicology",
    "overdose":     "Toxicology",
}

PRIORITY_META = {
    "level1": ("CRITICAL",    "Immediate life-saving intervention required. Do NOT delay."),
    "level2": ("EMERGENT",    "High risk. Should be seen within 15 minutes."),
    "level3": ("URGENT",      "Requires prompt attention within 30 minutes."),
    "level4": ("LESS URGENT", "Stable. Can be seen within 60 minutes."),
    "level5": ("NON-URGENT",  "Minor complaint. Can be seen when capacity allows."),
}


def compute_priority(symptoms: str, condition: str, vitals: Optional[VitalsInput]) -> str:
    score = 0
    text = f"{symptoms} {condition}".lower()

    # Keyword scoring
    for kw in EMERGENCY_KEYWORDS:
        if kw in text:
            score += 6

    for kw in HIGH_URGENCY_KEYWORDS:
        if kw in text:
            score += 3

    for kw in MODERATE_KEYWORDS:
        if kw in text:
            score += 1

    # Vitals scoring
    if vitals:
        spo2  = vitals.spo2
        pulse = vitals.pulse
        temp  = vitals.temp
        bp    = vitals.bp or {}
        sbp   = bp.get("sbp", None)

        if spo2 is not None:
            if spo2 < 88:   score += 8
            elif spo2 < 92: score += 5
            elif spo2 < 95: score += 2

        if pulse is not None:
            if pulse > 140 or pulse < 40:  score += 6
            elif pulse > 120 or pulse < 50: score += 3
            elif pulse > 100 or pulse < 60: score += 1

        if temp is not None:
            if temp > 40 or temp < 35:   score += 5
            elif temp > 39 or temp < 36: score += 2

        if sbp is not None:
            if sbp > 180 or sbp < 80:    score += 5
            elif sbp > 160 or sbp < 90:  score += 2

    # Map score → priority
    if score >= 10: return "level1"
    if score >= 6:  return "level2"
    if score >= 3:  return "level3"
    if score >= 1:  return "level4"
    return "level5"


def get_department(symptoms: str, condition: str, priority: str) -> str:
    text = f"{symptoms} {condition}".lower()
    for keyword, dept in DEPARTMENT_MAP.items():
        if keyword in text:
            return dept
    # Default by priority
    if priority == "level1": return "Emergency"
    return "General Medicine"


def build_explanation(symptoms, condition, priority, department, vitals) -> str:
    label, tag = PRIORITY_META[priority]
    lines = [f"[{label}] {tag}", f"Assigned Department: {department}."]

    if condition:
        lines.append(f"Chief Complaint: {condition}.")
    if symptoms:
        lines.append(f"Reported Symptoms: {symptoms}.")

    if vitals:
        v_parts = []
        if vitals.temp  is not None: v_parts.append(f"Temp {vitals.temp}°C")
        if vitals.pulse is not None: v_parts.append(f"Pulse {vitals.pulse} bpm")
        if vitals.spo2  is not None: v_parts.append(f"SpO₂ {vitals.spo2}%")
        if vitals.bp:
            sbp = vitals.bp.get("sbp")
            dbp = vitals.bp.get("dbp")
            if sbp and dbp: v_parts.append(f"BP {sbp}/{dbp} mmHg")
        if v_parts:
            lines.append(f"Vitals: {', '.join(v_parts)}.")

    lines.append("Hospital staff should prepare accordingly before patient arrival.")
    return " ".join(lines)


# ─── Predict Endpoint ────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
async def predict(data: PredictRequest):
    symptoms  = data.symptoms  or ""
    condition = data.condition or ""
    vitals    = data.vitals

    priority    = compute_priority(symptoms, condition, vitals)
    department  = get_department(symptoms, condition, priority)
    explanation = build_explanation(symptoms, condition, priority, department, vitals)

    return PredictResponse(
        _id=data._id,
        priority=priority,
        department=department,
        explanation=explanation,
    )


@app.get("/")
async def root():
    return {"status": "ok", "message": "🧠 Triage AI Service running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
