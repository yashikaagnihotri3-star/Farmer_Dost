# Farmer Dost — Part 2 (Crop Suggestion Upgrade)

This is a separate upgraded copy of the Member 4 starter project. Keep Part 1 as your backup.

## What changed in Part 2?
- State/Union Territory dropdown and dependent district dropdown.
- Location list downloader script.
- The app can open before the crop model is trained; it displays a clear message instead of crashing.
- Training script saves `models/crop_model.joblib`.
- Crop output can show the top three model-ranked crop labels.
- Existing chatbot is retained for now; chatbot improvements are postponed until the crop module is tested.

## Important limitations
- The district list is downloaded from a public community dataset. Verify it against current official government records before production use; administrative names change.
- The common Crop Recommendation dataset does not include state, district, or season as training features. State/district is collected in the form, and season is used only as a broad educational filter. This is NOT yet a validated district-specific agronomy model.
- The Kaggle crop CSV and trained model are not included in this ZIP. You must add the CSV and train locally.
- Model scores are not guarantees of crop success. Confirm recommendations with a soil test and local KVK/agriculture officer.

## Setup (Windows / VS Code)

Open this folder in VS Code. In Terminal > New Terminal, run:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python download_location_data.py
```

If PowerShell blocks activation, use Command Prompt:
```bat
.venv\Scripts\activate.bat
```

## Train the crop model

1. Download the Crop Recommendation Dataset from:
   https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset
2. Place the CSV at `data/Crop_recommendation.csv`.
3. Run:

```powershell
python train_model.py
```

This creates `models/crop_model.joblib`.

## Run the website

```powershell
python app.py
```

Open:
`http://127.0.0.1:5000`

The location dropdown needs `python download_location_data.py` to have completed successfully. The crop suggestion feature needs `python train_model.py` to have completed successfully.

## Optional chatbot API

Copy `.env.example` to `.env` and add an API key and a model name available to your API account. Leave them blank to use the basic fallback. Never upload `.env` to GitHub.

## API endpoints
- `GET /api/locations`
- `POST /api/crop-suggestions`
- `POST /api/weather`
- `POST /api/chat`

## Data source
The downloader uses the public dataset:
https://github.com/CodingMation/indian-states-districts
Check its current structure and license before redistribution or production use.
