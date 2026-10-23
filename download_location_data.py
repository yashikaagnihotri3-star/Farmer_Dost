"""Download a public India state/district JSON file and normalize it for the app."""
import json
from pathlib import Path
import requests

BASE_DIR = Path(__file__).resolve().parent
OUTPUT = BASE_DIR / "data" / "india_states_districts.json"
SOURCE_URLS = [
    "https://raw.githubusercontent.com/CodingMation/indian-states-districts/main/data/india_states_districts.min.json",
    "https://raw.githubusercontent.com/CodingMation/indian-states-districts/main/data/india_states_districts.json",
]

def find_states(payload):
    if isinstance(payload, dict):
        for key in ("states", "data", "locations", "result"):
            if key in payload and isinstance(payload[key], list):
                return payload[key]
        # Some datasets store the state list under a different root key.
        for value in payload.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                if any(k in value[0] for k in ("state", "stateName", "name", "state_name")):
                    return value
    if isinstance(payload, list):
        return payload
    return []

def normalize(payload):
    records = find_states(payload)
    result = []
    for row in records:
        if not isinstance(row, dict):
            continue
        state_name = row.get("name") or row.get("state") or row.get("stateName") or row.get("state_name")
        if isinstance(state_name, dict):
            state_name = state_name.get("en") or state_name.get("english") or state_name.get("local")
        districts = row.get("districts") or row.get("children") or row.get("district")
        if not state_name or not isinstance(districts, list):
            continue
        cleaned = []
        for district in districts:
            if isinstance(district, str):
                name = district
            elif isinstance(district, dict):
                name = district.get("name") or district.get("district") or district.get("districtName")
                if isinstance(name, dict):
                    name = name.get("en") or name.get("english") or name.get("local")
            else:
                name = None
            if name and str(name).strip():
                cleaned.append({"name": str(name).strip()})
        if cleaned:
            result.append({"name": str(state_name).strip(), "districts": sorted(cleaned, key=lambda d: d["name"].casefold())})
    # Remove duplicate state names while preserving normalized names.
    unique = {}
    for item in result:
        unique[item["name"]] = item
    return sorted(unique.values(), key=lambda item: item["name"].casefold())

def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    last_error = None
    for url in SOURCE_URLS:
        try:
            response = requests.get(url, timeout=20)
            response.raise_for_status()
            payload = response.json()
            normalized = normalize(payload)
            if len(normalized) < 20 or not any(s["districts"] for s in normalized):
                raise ValueError("The downloaded JSON had an unexpected format.")
            OUTPUT.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
            district_count = sum(len(state["districts"]) for state in normalized)
            print(f"Saved {len(normalized)} state/UT entries and {district_count} district entries to {OUTPUT}")
            print("Please check the list against the current official government list before production use; district names can change.")
            return
        except Exception as exc:
            last_error = exc
    raise SystemExit(
        "Could not download the India state/district data. Check your internet connection and try again. "
        f"Last error: {last_error}"
    )

if __name__ == "__main__":
    main()
