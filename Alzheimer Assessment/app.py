# -*- coding: utf-8 -*-
"""
Flask API for Alzheimer's Assessment ML Pipeline
Compatible with alzheimers_full_pipeline.py (ISET 2025)
"""

from flask import Flask, request, jsonify
import joblib
import numpy as np
import os

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Load all saved models
# ---------------------------------------------------------------------------
MODEL_DIR = "model_outputs"

xgb_classifier  = joblib.load(f"{MODEL_DIR}/xgb_classifier.pkl")   # trained on 29 features
xgb_regressor   = joblib.load(f"{MODEL_DIR}/xgb_regressor.pkl")    # trained on OASIS (5 features)
scaler          = joblib.load(f"{MODEL_DIR}/scaler.pkl")            # for 29-feature classifier
scaler_reg      = joblib.load(f"{MODEL_DIR}/scaler_reg.pkl")        # for OASIS regressor
scaler_cluster  = joblib.load(f"{MODEL_DIR}/scaler_cluster.pkl")    # for 9 cluster features
kmeans          = joblib.load(f"{MODEL_DIR}/kmeans.pkl")
feature_cols    = joblib.load(f"{MODEL_DIR}/feature_cols.pkl")      # 29 PascalCase names
cluster_records = joblib.load(f"{MODEL_DIR}/cluster_labels.pkl")    # list of dicts

# Build a lookup dict: cluster_id -> record
cluster_lookup = {rec["Cluster"]: rec for rec in cluster_records}

# ---------------------------------------------------------------------------
# Constants (must match the training script exactly)
# ---------------------------------------------------------------------------

# 9 features used for clustering (PascalCase, same as training)
CLUSTER_FEATURES = [
    "Age", "FunctionalAssessment", "MMSE", "ADL",
    "MemoryComplaints", "BehavioralProblems", "Confusion",
    "Disorientation", "DifficultyCompletingTasks"
]

# 5 OASIS features used for the MMSE regressor
OASIS_FEATURES = ["Age", "EDUC", "eTIV", "nWBV", "ASF"]

# Angular sends camelCase keys → map to PascalCase for the models
CAMEL_TO_PASCAL = {
    "age":                       "Age",
    "gender":                    "Gender",
    "bmi":                       "BMI",
    "smoking":                   "Smoking",
    "alcoholConsumption":        "AlcoholConsumption",
    "physicalActivity":          "PhysicalActivity",
    "dietQuality":               "DietQuality",
    "sleepQuality":              "SleepQuality",
    "familyHistoryAlzheimers":   "FamilyHistoryAlzheimers",
    "cardiovascularDisease":     "CardiovascularDisease",
    "diabetes":                  "Diabetes",
    "depression":                "Depression",
    "headInjury":                "HeadInjury",
    "hypertension":              "Hypertension",
    "systolicBP":                "SystolicBP",
    "diastolicBP":               "DiastolicBP",
    "cholesterolTotal":          "CholesterolTotal",
    "cholesterolLDL":            "CholesterolLDL",
    "cholesterolHDL":            "CholesterolHDL",
    "cholesterolTriglycerides":  "CholesterolTriglycerides",
    "functionalAssessment":      "FunctionalAssessment",
    "memoryComplaints":          "MemoryComplaints",
    "behavioralProblems":        "BehavioralProblems",
    "adl":                       "ADL",
    "confusion":                 "Confusion",
    "disorientation":            "Disorientation",
    "personalityChanges":        "PersonalityChanges",
    "difficultyCompletingTasks": "DifficultyCompletingTasks",
    "forgetfulness":             "Forgetfulness",
    "mmse":                      "MMSE",
}

# ---------------------------------------------------------------------------
# Helper: normalize incoming JSON to PascalCase
# ---------------------------------------------------------------------------
def normalize_input(raw: dict) -> dict:
    """Convert camelCase keys from Angular to PascalCase used by models."""
    pascal = {}
    for k, v in raw.items():
        key = CAMEL_TO_PASCAL.get(k, k)   # fallback: keep original
        try:
            pascal[key] = float(v)
        except (TypeError, ValueError):
            pascal[key] = 0.0  # coerce non-numeric to 0.0 instead of leaving as str
    return pascal


# ---------------------------------------------------------------------------
# Helper: safe scaling — replaces any NaN/Inf produced by the scaler with 0
# ---------------------------------------------------------------------------
def safe_transform(scaler_obj, x: np.ndarray) -> np.ndarray:
    """
    Transform x with scaler_obj and replace any NaN or Inf values with 0.
    This guards against the scaler producing NaN when a feature column that
    was seen during training has variance=0 or the input value is invalid.
    """
    result = scaler_obj.transform(x)
    result = np.where(np.isfinite(result), result, 0.0)
    return result


# ---------------------------------------------------------------------------
# Helper: MMSE stage interpretation
# ---------------------------------------------------------------------------
def get_mmse_stage(mmse: float) -> dict:
    if mmse >= 24:
        return {"stage": "Normal / No Significant Impairment",
                "severityLevel": "none", "mmseRange": "24-30"}
    elif mmse >= 20:
        return {"stage": "Mild Cognitive Impairment (MCI)",
                "severityLevel": "Mild", "mmseRange": "20-23"}
    elif mmse >= 10:
        return {"stage": "Moderate Alzheimer's Disease",
                "severityLevel": "Moderate", "mmseRange": "10-19"}
    else:
        return {"stage": "Severe Alzheimer's Disease",
                "severityLevel": "Severe", "mmseRange": "0-9"}


# ---------------------------------------------------------------------------
# Helper: estimate MMSE without OASIS features
# Uses the same fallback formula as run_full_pipeline() in the training script
# ---------------------------------------------------------------------------
def estimate_mmse(p: dict) -> float:
    func      = p.get("FunctionalAssessment", 5)
    adl       = p.get("ADL", 5)
    confusion = p.get("Confusion", 0)
    memory    = p.get("MemoryComplaints", 0)
    mmse      = 30 - (func * 1.5) - (adl * 0.5) - (confusion * 5) - (memory * 3)
    return max(0.0, min(30.0, mmse))


# ---------------------------------------------------------------------------
# Helper: risk score for healthy patients  (matches compute_risk_score())
# ---------------------------------------------------------------------------
def compute_risk_score(p: dict) -> dict:
    score = 0
    factors = []

    age = p.get("Age", 0)
    if age >= 75:
        score += 25; factors.append("Advanced age (≥75)")
    elif age >= 65:
        score += 15; factors.append("Older age (65-74)")

    if p.get("FamilyHistoryAlzheimers", 0):
        score += 20; factors.append("Family history of Alzheimer's")
    if p.get("Gender", 0) == 1:
        score += 5;  factors.append("Female sex (slightly higher risk)")
    if p.get("Depression", 0):
        score += 10; factors.append("Depression (treatable risk factor)")
    if p.get("CardiovascularDisease", 0):
        score += 8;  factors.append("Cardiovascular disease")
    if p.get("Diabetes", 0):
        score += 7;  factors.append("Diabetes")
    if p.get("Hypertension", 0):
        score += 6;  factors.append("Hypertension")
    if p.get("Smoking", 0):
        score += 5;  factors.append("Smoking")
    if p.get("MemoryComplaints", 0):
        score += 8;  factors.append("Memory complaints (subjective)")
    if p.get("Forgetfulness", 0):
        score += 6;  factors.append("Forgetfulness")
    if p.get("Confusion", 0):
        score += 6;  factors.append("Occasional confusion")

    # Protective
    if p.get("PhysicalActivity", 5) >= 7:
        score -= 8;  factors.append("✅ High physical activity (protective)")
    if p.get("SleepQuality", 5) >= 8:
        score -= 5;  factors.append("✅ Good sleep quality (protective)")
    if p.get("DietQuality", 5) >= 7:
        score -= 5;  factors.append("✅ Good diet quality (protective)")

    score = max(0, min(100, score))
    level = "Low" if score < 30 else ("Moderate" if score < 60 else "High")
    return {"score": score, "level": level, "riskFactors": factors}


# ---------------------------------------------------------------------------
# Recommendations (matches TREATMENT_RECOMMENDATIONS / PREVENTIVE_RECOMMENDATIONS)
# ---------------------------------------------------------------------------
TREATMENT = {
    "mild": {
        "title": "💊 Mild Stage – Early Intervention",
        "medications": [
            "Cholinesterase inhibitors (Donepezil, Rivastigmine, Galantamine)",
            "Regular cognitive function monitoring",
        ],
        "lifestyle": [
            "Cognitive training exercises (puzzles, memory games, reading)",
            "Mediterranean diet adherence",
            "Aerobic exercise 150 min/week",
            "Social engagement and stimulation",
            "Sleep hygiene optimization (7-9 hours)",
        ],
        "monitoring": [
            "MMSE assessment every 6 months",
            "Caregiver education sessions",
            "Safety home assessment",
            "Driving ability evaluation",
        ],
        "support": [
            "Support group enrollment (patient + family)",
            "Legal/financial planning (while capacity intact)",
            "Care coordinator assignment",
        ],
    },
    "moderate": {
        "title": "🏥 Moderate Stage – Active Management",
        "medications": [
            "Memantine (Namenda) – for moderate to severe",
            "Combination therapy: Memantine + Cholinesterase inhibitor",
            "Manage behavioral symptoms: antidepressants if needed",
        ],
        "lifestyle": [
            "Structured daily routine with visual cues",
            "Supervised physical activity",
            "Music and art therapy",
            "Reminiscence therapy",
        ],
        "monitoring": [
            "Monthly caregiver check-ins",
            "Quarterly medical evaluations",
            "Fall risk assessment",
            "Nutritional status monitoring",
        ],
        "support": [
            "Full-time caregiver involvement",
            "Adult day care program consideration",
            "Home modification for safety (grab bars, door alarms)",
            "Respite care for family caregivers",
        ],
    },
    "severe": {
        "title": "🩺 Severe Stage – Comfort & Safety Focus",
        "medications": [
            "Continue Memantine if tolerated",
            "Manage pain and discomfort proactively",
            "Antipsychotics only if severe behavioral disturbances",
        ],
        "lifestyle": [
            "Sensory stimulation (music, aromatherapy)",
            "Gentle physical activity (range of motion)",
            "Comfort-focused care",
        ],
        "monitoring": [
            "Daily vital signs monitoring",
            "Swallowing safety assessment",
            "Pressure ulcer prevention protocol",
        ],
        "support": [
            "Memory care facility evaluation",
            "Palliative care consultation",
            "24/7 supervised care",
            "Hospice planning discussion",
        ],
    },
}

PREVENTIVE = {
    "Low": {
        "title": "✅ Low Risk – Maintenance & Wellness",
        "description": "Your current lifestyle appears protective. Maintain these habits.",
        "actions": [
            "Annual cognitive screening (baseline MMSE)",
            "Continue current physical activity routine",
            "Maintain Mediterranean or MIND diet",
            "Stay socially and intellectually engaged",
            "Annual cardiovascular checkup",
        ],
        "monitoring": ["Annual reassessment recommended"],
    },
    "Moderate": {
        "title": "⚠️ Moderate Risk – Active Prevention",
        "description": "Several modifiable risk factors detected. Early action can significantly reduce your risk.",
        "actions": [
            "Increase physical activity to ≥150 min/week",
            "Cognitive enrichment: learn new skills, puzzles, reading",
            "Address depression/anxiety with mental health professional",
            "Optimize blood pressure and cholesterol management",
            "Improve sleep quality (consider sleep study if needed)",
            "Nutrition counseling for brain-healthy diet",
        ],
        "monitoring": ["Cognitive screening every 6 months"],
    },
    "High": {
        "title": "🚨 High Risk – Urgent Preventive Care",
        "description": "Multiple significant risk factors identified. Medical consultation strongly advised.",
        "actions": [
            "Immediate consultation with neurologist or geriatric specialist",
            "Baseline neuropsychological assessment",
            "Genetic counseling (APOE status) if appropriate",
            "Intensive cardiovascular risk management",
            "Structured cognitive rehabilitation program",
            "Family education and planning discussions",
        ],
        "monitoring": ["Quarterly medical follow-up; cognitive testing every 3 months"],
    },
}


# ---------------------------------------------------------------------------
# Main prediction endpoint
# ---------------------------------------------------------------------------
@app.route("/api/assess/predict", methods=["POST"])
def predict():
    raw = request.get_json(force=True)
    if not raw:
        return jsonify({"error": "Empty request body"}), 400

    # Normalize camelCase → PascalCase, coerce all values to float
    p = normalize_input(raw)

    # ── 1. Build classification feature vector (29 features, PascalCase) ──
    x = np.array([[p.get(col, 0.0) for col in feature_cols]], dtype=np.float64)
    x_scaled = safe_transform(scaler, x)

    # ── 2. Classification ──
    prob      = float(xgb_classifier.predict_proba(x_scaled)[0][1])
    predicted = int(prob >= 0.5)

    # ── 3. Clustering (9 features) ──
    x_cluster    = np.array([[p.get(col, 0.0) for col in CLUSTER_FEATURES]], dtype=np.float64)
    x_cluster_sc = safe_transform(scaler_cluster, x_cluster)   # NaNs replaced here
    cluster_id   = int(kmeans.predict(x_cluster_sc)[0])
    rec          = cluster_lookup.get(cluster_id, {})
    cluster_label = rec.get("label", "Unknown")
    diag_rate     = float(rec.get("diag_rate", 0.0))

    result = {
        "cluster": {
            "id":                     cluster_id,
            "label":                  cluster_label,
            "diagnosisRateInCluster": round(diag_rate, 4),
        },
        "diagnosis": {
            "predicted":   predicted,
            "probability": round(prob, 4),
            "label":       "Alzheimer's Detected" if predicted == 1
                           else "No Alzheimer's Detected",
        },
    }

    if predicted == 1:
        # ── 4a. MMSE estimation ──
        # If the user supplied MMSE directly (hidden field), use it.
        # Otherwise fall back to the formula used in run_full_pipeline().
        if "MMSE" in p and p["MMSE"] > 0:
            mmse_val = float(p["MMSE"])
        else:
            mmse_val = estimate_mmse(p)

        stage_info     = get_mmse_stage(mmse_val)
        severity_level = stage_info["severityLevel"]
        if severity_level == "none":
            severity_level = "mild"

        rec_treatment = TREATMENT.get(severity_level.lower(), TREATMENT["mild"])

        result["severity"] = {
            "mmseEstimate":  round(mmse_val, 1),
            "stage":         stage_info["stage"],
            "severityLevel": severity_level,
            "mmseRange":     stage_info["mmseRange"],
        }
        result["recommendations"] = {
            "path":        "sick",
            "title":       rec_treatment["title"],
            "medications": rec_treatment["medications"],
            "lifestyle":   rec_treatment["lifestyle"],
            "monitoring":  rec_treatment["monitoring"],
            "support":     rec_treatment["support"],
        }

    else:
        # ── 4b. Risk score for healthy patients ──
        risk = compute_risk_score(p)
        prev = PREVENTIVE[risk["level"]]

        result["riskAssessment"] = {
            "score":       risk["score"],
            "level":       risk["level"],
            "riskFactors": risk["riskFactors"],
        }
        result["recommendations"] = {
            "path":        "healthy",
            "title":       prev["title"],
            "description": prev["description"],
            "actions":     prev["actions"],
            "monitoring":  prev["monitoring"],
        }

    return jsonify(result)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "models_loaded": True})


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)