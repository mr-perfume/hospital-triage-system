# # ai-service/main.py — FastAPI prediction service
# # Run: uvicorn main:app --reload --port 8000

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel, Field
# from typing import Optional
# import uvicorn

# app = FastAPI(title="Hospital Triage AI", version="1.0.0")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ─── Models ───────────────────────────────────────────────────────
# # Pydantic v2 does NOT support leading-underscore field names (_id).
# # Solution: store as `id` internally, alias to "_id" for JSON I/O.

# class VitalsInput(BaseModel):
#     temp:  Optional[float] = None
#     bp:    Optional[dict]  = None   # { "sbp": 120, "dbp": 80 }
#     pulse: Optional[int]   = None
#     spo2:  Optional[float] = None

# class PredictRequest(BaseModel):
#     id:        str  = Field(..., alias="_id")   # Accept "_id" from JSON body
#     symptoms:  Optional[str]         = ""
#     condition: Optional[str]         = ""
#     vitals:    Optional[VitalsInput] = None
#     model_config = {"populate_by_name": True}

# class PredictResponse(BaseModel):
#     id:          str = Field(..., alias="_id")   # Serialize as "_id" in response
#     priority:    str
#     department:  str
#     explanation: str
#     model_config = {"populate_by_name": True}


# # ─── Keyword lists ────────────────────────────────────────────────

# EMERGENCY_KEYWORDS = [
#     "unconscious", "unresponsive", "cardiac arrest", "heart attack",
#     "stroke", "not breathing", "stopped breathing", "severe bleeding",
#     "trauma", "accident", "head injury", "anaphylaxis", "anaphylactic",
#     "convulsion", "seizure", "choking", "respiratory failure",
#     "loss of consciousness", "critical", "emergency",
# ]

# HIGH_URGENCY_KEYWORDS = [
#     "difficulty breathing", "shortness of breath", "severe pain",
#     "high fever", "fracture", "broken bone", "burns", "chest pain",
#     "severe headache", "altered consciousness", "vomiting blood",
#     "drug overdose", "poisoning", "severe allergic", "diabetic",
# ]

# MODERATE_KEYWORDS = [
#     "moderate pain", "vomiting", "dizziness", "fever", "infection",
#     "abdominal pain", "back pain", "laceration", "sprain", "dehydration",
# ]

# DEPARTMENT_MAP = {
#     "cardiac": "Cardiology", "chest pain": "Cardiology", "heart": "Cardiology",
#     "head injury": "Neurology", "stroke": "Neurology", "unconscious": "Neurology",
#     "seizure": "Neurology", "neuro": "Neurology",
#     "breathing": "Pulmonology", "respiratory": "Pulmonology", "asthma": "Pulmonology",
#     "fracture": "Orthopedics", "accident": "Trauma & Orthopedics", "trauma": "Trauma & Orthopedics",
#     "abdominal": "Gastroenterology", "stomach": "Gastroenterology",
#     "burn": "Burns & Plastics", "eye": "Ophthalmology", "ear": "ENT",
#     "child": "Pediatrics", "infant": "Pediatrics",
#     "pregnant": "Obstetrics & Gynecology", "pregnancy": "Obstetrics & Gynecology",
#     "diabetic": "Endocrinology", "diabetes": "Endocrinology",
#     "mental": "Psychiatry", "poison": "Toxicology", "overdose": "Toxicology",
# }

# PRIORITY_META = {
#     "level1": ("CRITICAL",    "Immediate life-saving intervention required. Do NOT delay."),
#     "level2": ("EMERGENT",    "High risk. Should be seen within 15 minutes."),
#     "level3": ("URGENT",      "Requires prompt attention within 30 minutes."),
#     "level4": ("LESS URGENT", "Stable. Can be seen within 60 minutes."),
#     "level5": ("NON-URGENT",  "Minor complaint. Can be seen when capacity allows."),
# }


# # ─── Scoring logic ────────────────────────────────────────────────

# def compute_priority(symptoms: str, condition: str, vitals: Optional[VitalsInput]) -> str:
#     score = 0
#     text = f"{symptoms} {condition}".lower()

#     for kw in EMERGENCY_KEYWORDS:
#         if kw in text: score += 6
#     for kw in HIGH_URGENCY_KEYWORDS:
#         if kw in text: score += 3
#     for kw in MODERATE_KEYWORDS:
#         if kw in text: score += 1

#     if vitals:
#         spo2  = vitals.spo2
#         pulse = vitals.pulse
#         temp  = vitals.temp
#         bp    = vitals.bp or {}
#         sbp   = bp.get("sbp")

#         if spo2 is not None:
#             if spo2 < 88:   score += 8
#             elif spo2 < 92: score += 5
#             elif spo2 < 95: score += 2

#         if pulse is not None:
#             if pulse > 140 or pulse < 40:   score += 6
#             elif pulse > 120 or pulse < 50: score += 3
#             elif pulse > 100 or pulse < 60: score += 1

#         if temp is not None:
#             if temp > 40 or temp < 35:   score += 5
#             elif temp > 39 or temp < 36: score += 2

#         if sbp is not None:
#             if sbp > 180 or sbp < 80:   score += 5
#             elif sbp > 160 or sbp < 90: score += 2

#     if score >= 10: return "level1"
#     if score >= 6:  return "level2"
#     if score >= 3:  return "level3"
#     if score >= 1:  return "level4"
#     return "level5"


# def get_department(symptoms: str, condition: str, priority: str) -> str:
#     text = f"{symptoms} {condition}".lower()
#     for keyword, dept in DEPARTMENT_MAP.items():
#         if keyword in text:
#             return dept
#     return "Emergency" if priority == "level1" else "General Medicine"


# def build_explanation(symptoms, condition, priority, department, vitals) -> str:
#     label, tag = PRIORITY_META[priority]
#     lines = [f"[{label}] {tag}", f"Assigned Department: {department}."]
#     if condition: lines.append(f"Chief Complaint: {condition}.")
#     if symptoms:  lines.append(f"Reported Symptoms: {symptoms}.")
#     if vitals:
#         v_parts = []
#         if vitals.temp  is not None: v_parts.append(f"Temp {vitals.temp}C")
#         if vitals.pulse is not None: v_parts.append(f"Pulse {vitals.pulse} bpm")
#         if vitals.spo2  is not None: v_parts.append(f"SpO2 {vitals.spo2}%")
#         if vitals.bp:
#             sbp = vitals.bp.get("sbp")
#             dbp = vitals.bp.get("dbp")
#             if sbp and dbp: v_parts.append(f"BP {sbp}/{dbp} mmHg")
#         if v_parts: lines.append(f"Vitals: {', '.join(v_parts)}.")
#     lines.append("Hospital staff should prepare accordingly.")
#     return " ".join(lines)


# # ─── Endpoints ────────────────────────────────────────────────────

# @app.post("/predict", response_model=PredictResponse, response_model_by_alias=True)
# async def predict(data: PredictRequest):
#     symptoms  = data.symptoms  or ""
#     condition = data.condition or ""
#     vitals    = data.vitals

#     priority    = compute_priority(symptoms, condition, vitals)
#     department  = get_department(symptoms, condition, priority)
#     explanation = build_explanation(symptoms, condition, priority, department, vitals)

#     # data.id contains what the client sent as "_id"
#     # response_model_by_alias=True ensures the JSON response uses "_id" not "id"
#     return PredictResponse.model_validate({
#         "_id":         data.id,
#         "priority":    priority,
#         "department":  department,
#         "explanation": explanation,
#     })


# @app.get("/")
# async def root():
#     return {"status": "ok", "message": "Triage AI Service running"}

# @app.get("/health")
# async def health():
#     return {"status": "healthy"}


# if __name__ == "__main__":
#     uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# ================================================================
# ai-service/main.py — FastAPI wrapper for triage_model_v7.pkl
#
# HOW TO RUN:
#   1. Place triage_model_v7.pkl and triage_pipeline_v7.py
#      in the SAME folder as this file.
#   2. pip install -r requirements.txt
#   3. uvicorn main:app --reload --port 8000
#   4. Expose via ngrok: ngrok http 8000
# ================================================================

import os
import re
import sys
import logging
import warnings
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

warnings.filterwarnings("ignore")

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-8s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("TriageAPI")

# ── Paths ─────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
MODEL_PATH = BASE_DIR / "triage_model_v7.pkl"
PIPELINE   = BASE_DIR / "triage_pipeline_v7.py"

# ── Global model state ────────────────────────────────────────────
MODEL_STATE: Dict[str, Any] = {
    "model":         None,
    "imputers":      None,
    "all_features":  None,
    "kept_features": None,
    "loaded":        False,
}


# ================================================================
# STARTUP — Load model bundle
# ================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the .pkl bundle when the server starts."""
    log.info("━━━ Loading triage model bundle ━━━")

    if not MODEL_PATH.exists():
        log.error("❌ triage_model_v7.pkl not found at: %s", MODEL_PATH)
        log.error("   Copy triage_model_v7.pkl into the ai-service/ folder.")
        log.error("   Server will start but /predict will return 503.")
    else:
        try:
            # Import load_bundle from the pipeline file
            sys.path.insert(0, str(BASE_DIR))
            from triage_pipeline_v7 import load_bundle
            model, imputers, all_features, kept_features = load_bundle(str(MODEL_PATH))
            MODEL_STATE["model"]         = model
            MODEL_STATE["imputers"]      = imputers
            MODEL_STATE["all_features"]  = all_features
            MODEL_STATE["kept_features"] = kept_features
            MODEL_STATE["loaded"]        = True
            log.info("✅ Model loaded: %d all features | %d kept features",
                     len(all_features), len(kept_features))
            log.info("   Kept features: %s", kept_features[:10])
        except Exception as e:
            log.error("❌ Failed to load model bundle: %s", e)
            log.error("   /predict will return 503 until model is loaded.")
    yield
    log.info("Shutting down Triage AI service.")


app = FastAPI(title="Hospital Triage AI v7", version="7.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ================================================================
# PYDANTIC SCHEMAS
# ================================================================
class VitalsInput(BaseModel):
    temp:  Optional[float] = None   # °C
    bp:    Optional[dict]  = None   # { "sbp": 120, "dbp": 80 }
    pulse: Optional[int]   = None   # bpm (→ heart_rate)
    spo2:  Optional[float] = None   # %

class PredictRequest(BaseModel):
    # NOTE: Pydantic v2 doesn't allow leading underscore names.
    # We use alias "_id" → stored as `id`.
    id:        str  = Field(..., alias="_id")
    age:       Optional[int]        = None
    gender:    Optional[str]        = None   # "male" | "female" | "other"
    symptoms:  Optional[str]        = ""
    condition: Optional[str]        = ""
    vitals:    Optional[VitalsInput] = None
    model_config = {"populate_by_name": True}

class PredictResponse(BaseModel):
    id:          str = Field(..., alias="_id")
    priority:    str      # "level1" … "level5"
    department:  str
    explanation: str
    model_config = {"populate_by_name": True}


# ================================================================
# TEXT → BINARY FEATURE MAPPER
# Maps free-text symptoms/condition strings to the model's
# binary symptom and chronic-condition flags.
# ================================================================

SYMPTOM_MAP = {
    "symptom_shortness_of_breath": [
        "shortness of breath", "difficulty breathing", "breathless",
        "cant breathe", "cannot breathe", "breathing difficulty",
        "dyspnea", "dyspnoea", "short of breath",
    ],
    "symptom_severe_chest_pain": [
        "severe chest pain", "crushing chest", "stabbing chest pain",
        "intense chest pain", "excruciating chest",
    ],
    "symptom_chest_pain": [
        "chest pain", "chest discomfort", "chest tightness",
        "chest pressure", "heart pain",
    ],
    "symptom_neurological_deficit": [
        "neurological", "weakness in arm", "facial droop", "slurred speech",
        "numbness", "tingling", "loss of speech", "facial asymmetry",
        "stroke", "tia", "hemiplegia", "aphasia",
    ],
    "symptom_weakness": [
        "weakness", "weak", "feeble", "faintness", "fatigue",
        "general weakness", "body weakness",
    ],
    "symptom_fever": [
        "fever", "high temperature", "febrile", "pyrexia",
        "temperature", "hyperthermia", "hot",
    ],
    "symptom_pain": [
        "pain", "ache", "hurts", "hurting", "painful", "sore",
    ],
    "symptom_severe_pain": [
        "severe pain", "excruciating pain", "unbearable pain",
        "extreme pain", "acute pain", "10/10 pain", "worst pain",
    ],
    "symptom_mild_discomfort": [
        "mild discomfort", "mild pain", "slight pain",
        "minor discomfort", "discomfort",
    ],
    "symptom_palpitations": [
        "palpitation", "racing heart", "irregular heartbeat",
        "heart racing", "rapid heartbeat", "heart fluttering",
        "heart pounding", "tachycardia",
    ],
    "symptom_headache": [
        "headache", "head pain", "migraine", "head ache",
        "thunderclap headache", "head throbbing",
    ],
    "symptom_dizziness": [
        "dizziness", "dizzy", "vertigo", "lightheaded",
        "lightheadedness", "spinning", "unsteady",
    ],
    "symptom_nausea": [
        "nausea", "nauseous", "vomiting", "vomit", "vomited",
        "retching", "nausea and vomiting",
    ],
    "symptom_fatigue": [
        "fatigue", "tired", "exhausted", "lethargy", "lethargic",
        "no energy", "worn out",
    ],
    "symptom_cough": [
        "cough", "coughing", "productive cough", "dry cough",
        "blood in cough", "hemoptysis",
    ],
    "symptom_swelling": [
        "swelling", "swollen", "edema", "oedema",
        "puffiness", "bloated",
    ],
    "symptom_rash": [
        "rash", "skin rash", "hives", "urticaria",
        "skin eruption", "blisters", "itching rash",
    ],
    "symptom_abdominal_pain": [
        "abdominal pain", "stomach pain", "belly pain", "tummy pain",
        "gut pain", "abdominal cramps", "stomach ache",
    ],
    "symptom_flank_pain": [
        "flank pain", "side pain", "kidney pain",
        "loin pain", "renal pain",
    ],
    "symptom_limb_pain": [
        "limb pain", "arm pain", "leg pain", "extremity pain",
        "hand pain", "foot pain",
    ],
    "symptom_joint_pain": [
        "joint pain", "arthritis", "knee pain", "hip pain",
        "joint swelling", "joint stiffness",
    ],
    "symptom_urinary_symptoms": [
        "urinary", "dysuria", "burning urination", "frequent urination",
        "urinary frequency", "uti", "painful urination",
    ],
    "symptom_hematuria": [
        "blood in urine", "hematuria", "bloody urine", "red urine",
    ],
    "symptom_weight_loss": [
        "weight loss", "losing weight", "unintentional weight loss",
    ],
    "symptom_increased_thirst": [
        "increased thirst", "polydipsia", "excessive thirst",
        "very thirsty", "always thirsty",
    ],
    "symptom_stiffness": [
        "stiffness", "stiff", "rigidity", "stiff joints",
        "morning stiffness",
    ],
    "symptom_mobility_limitation": [
        "mobility", "cant walk", "immobile", "paralysis",
        "difficulty walking", "bedridden", "unable to move",
    ],
    "symptom_labor_pain": [
        "labor", "labour", "contractions", "delivery", "in labor",
        "giving birth",
    ],
    "pregnant": [
        "pregnant", "pregnancy", "gravid", "gestation",
        "expecting", "antenatal",
    ],
}

CHRONIC_MAP = {
    "chronic_heart_disease": [
        "heart disease", "cardiac disease", "heart failure",
        "heart attack history", "coronary artery", "cad", "chf",
        "ischemic heart", "heart condition",
    ],
    "chronic_hypertension": [
        "hypertension", "high blood pressure", "htn",
        "blood pressure condition",
    ],
    "chronic_diabetes": [
        "diabetes", "diabetic", "sugar", "t2dm", "t1dm",
        "type 2 diabetes", "type 1 diabetes",
    ],
    "chronic_cancer": [
        "cancer", "tumor", "tumour", "malignancy",
        "oncology", "carcinoma", "lymphoma",
    ],
    "chronic_osteoarthritis": [
        "osteoarthritis", "arthritis", "degenerative joint",
    ],
    "chronic_unspecified": [
        "chronic", "history of", "known case of", "on medication for",
        "underlying condition",
    ],
}

GENDER_CODE_MAP = {
    "male":   1,
    "female": 0,
    "other":  2,
    "m":      1,
    "f":      0,
}


def text_to_flags(text: str, keyword_map: dict) -> dict:
    """Match keywords in text and return binary feature dict."""
    text_lower = text.lower()
    flags = {}
    for feature, keywords in keyword_map.items():
        flags[feature] = 0
        for kw in keywords:
            if kw in text_lower:
                flags[feature] = 1
                break
    return flags


def build_model_input(req: PredictRequest) -> dict:
    """
    Converts the API request (backend format) into the feature dict
    expected by the triage_pipeline_v7 predict() function.
    """
    combined_text = f"{req.symptoms or ''} {req.condition or ''}".strip()
    vitals = req.vitals or VitalsInput()

    # ── Symptom & chronic flags from text ────────────────────────
    symptom_flags = text_to_flags(combined_text, SYMPTOM_MAP)
    chronic_flags = text_to_flags(combined_text, CHRONIC_MAP)

    # ── Gender → gender_code ──────────────────────────────────────
    gender_code = GENDER_CODE_MAP.get((req.gender or "").lower(), 2)

    # ── Assemble feature dict ─────────────────────────────────────
    feature_dict: dict = {
        # Pass-through patient ID (FIX A in pipeline)
        "patient_id": req.id,

        # Demographics
        "age":         req.age if req.age is not None else 40,
        "gender_code": gender_code,

        # Vitals
        "spo2":         vitals.spo2,
        "heart_rate":   vitals.pulse,
        "temperature":  vitals.temp,
        "systolic_bp":  vitals.bp.get("sbp") if vitals.bp else None,
        "diastolic_bp": vitals.bp.get("dbp") if vitals.bp else None,

        # Pain level — estimated from text if not provided
        "pain_level":   _estimate_pain(combined_text),

        # Previous ER visits and chronic count (default to 0 — not in form)
        "previous_er_visits": 0,
        "chronic_count": sum(chronic_flags.values()),

        # Free-text fields for the pipeline's keyword detector (Level-1 override)
        "complaint":           combined_text,
        "chief_complaint":     req.condition or "",
        "symptom_description": req.symptoms  or "",
    }

    # Merge symptom flags and chronic flags
    feature_dict.update(symptom_flags)
    feature_dict.update(chronic_flags)

    # Remove None values (let the imputer handle them)
    return {k: v for k, v in feature_dict.items() if v is not None}


def _estimate_pain(text: str) -> int:
    """Heuristic: estimate pain_level (0–10) from keywords."""
    t = text.lower()
    if any(w in t for w in ["excruciating", "worst", "unbearable", "10/10"]):
        return 9
    if any(w in t for w in ["severe pain", "severe", "intense", "extreme"]):
        return 7
    if any(w in t for w in ["moderate pain", "moderate", "significant"]):
        return 5
    if any(w in t for w in ["mild pain", "mild", "slight", "minor"]):
        return 2
    if any(w in t for w in ["pain", "ache", "hurts"]):
        return 4
    return 0


def level_to_priority(triage_level: int) -> str:
    """Convert numeric triage level (1-5) to our system's priority string."""
    return f"level{triage_level}"


# ================================================================
# ENDPOINTS
# ================================================================

@app.post(
    "/predict",
    response_model=PredictResponse,
    response_model_by_alias=True,
)
async def predict_endpoint(req: PredictRequest):
    """
    Main prediction endpoint called by Node.js backend.

    Input:  { "_id", "age", "gender", "symptoms", "condition", "vitals" }
    Output: { "_id", "priority", "department", "explanation" }
    """
    if not MODEL_STATE["loaded"]:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not loaded. Ensure triage_model_v7.pkl is in the ai-service/ "
                "directory and restart the server."
            ),
        )

    try:
        # Import predict from the pipeline (already loaded in sys.path)
        from triage_pipeline_v7 import predict as model_predict

        # Build model input dict
        model_input = build_model_input(req)
        log.info(
            "Predicting for patient %s | age=%s gender=%s | vitals: spo2=%s hr=%s temp=%s sbp=%s",
            req.id,
            model_input.get("age"),
            model_input.get("gender_code"),
            model_input.get("spo2", "—"),
            model_input.get("heart_rate", "—"),
            model_input.get("temperature", "—"),
            model_input.get("systolic_bp", "—"),
        )

        # Run the real model prediction
        result = model_predict(
            MODEL_STATE["model"],
            MODEL_STATE["imputers"],
            MODEL_STATE["all_features"],
            MODEL_STATE["kept_features"],
            model_input,
        )

        triage_level = result["triage_level"]
        priority     = level_to_priority(triage_level)
        department   = result["department"]
        explanation  = result["explanation"]

        # Enrich explanation with case summary if available
        case_summary = result.get("case_summary", "")
        if case_summary and case_summary not in explanation:
            explanation = f"{explanation} Summary: {case_summary}"

        # Add override info to explanation
        if result.get("override_triggered") and result.get("override_reason"):
            explanation = f"[OVERRIDE] {result['override_reason']}. {explanation}"

        log.info(
            "✅ Patient %s → %s (%s) | dept=%s | confidence=%.1f%%",
            req.id, priority, result["triage_label"],
            department, result["confidence"],
        )

        return PredictResponse.model_validate({
            "_id":        req.id,
            "priority":   priority,
            "department": department,
            "explanation": explanation,
        })

    except HTTPException:
        raise
    except Exception as e:
        log.error("❌ Prediction failed for patient %s: %s", req.id, e)
        # Safe fallback — system keeps running
        return PredictResponse.model_validate({
            "_id":        req.id,
            "priority":   "level3",
            "department": "General Medicine",
            "explanation": (
                f"AI prediction error ({str(e)[:100]}). "
                "Default Level 3 (URGENT) assigned. Please review manually."
            ),
        })


@app.get("/")
async def root():
    loaded = MODEL_STATE["loaded"]
    return {
        "status":  "ok",
        "message": "Hospital Triage AI v7 running",
        "model":   "triage_model_v7.pkl",
        "loaded":  loaded,
        "features_kept": len(MODEL_STATE["kept_features"] or []),
    }


@app.get("/health")
async def health():
    if not MODEL_STATE["loaded"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "status":  "healthy",
        "model":   "v7.0",
        "features": len(MODEL_STATE["kept_features"]),
    }


@app.get("/features")
async def list_features():
    """Debug endpoint — list all model features."""
    if not MODEL_STATE["loaded"]:
        raise HTTPException(status_code=503, detail="Model not loaded")
    return {
        "all_features":  MODEL_STATE["all_features"],
        "kept_features": MODEL_STATE["kept_features"],
        "n_all":  len(MODEL_STATE["all_features"]),
        "n_kept": len(MODEL_STATE["kept_features"]),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
