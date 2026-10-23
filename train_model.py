from pathlib import Path
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "Crop_recommendation.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "crop_model.joblib"
FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET = "label"

def main():
    if not DATA_PATH.exists():
        raise SystemExit(
            "Missing data/Crop_recommendation.csv. Download the public crop recommendation CSV "
            "and place it at that exact path. The dataset is not bundled in this ZIP."
        )
    df = pd.read_csv(DATA_PATH)
    missing = [col for col in FEATURES + [TARGET] if col not in df.columns]
    if missing:
        raise SystemExit(f"Dataset is missing columns: {missing}")
    df = df[FEATURES + [TARGET]].dropna()
    if df.empty:
        raise SystemExit("The dataset has no usable rows after removing missing values.")
    if df[TARGET].nunique() < 2:
        raise SystemExit("The dataset must contain at least two crop labels.")
    X, y = df[FEATURES], df[TARGET]
    counts = y.value_counts()
    stratify = y if counts.min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )
    model = RandomForestClassifier(
        n_estimators=200, random_state=42, class_weight="balanced", n_jobs=-1
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)
    print(f"Hold-out test accuracy: {accuracy_score(y_test, predictions):.3f}")
    print(classification_report(y_test, predictions, zero_division=0))
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to: {MODEL_PATH}")
    print("Reminder: this dataset does not train the model on state or season. Those need separate validated regional data.")

if __name__ == "__main__":
    main()
