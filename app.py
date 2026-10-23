import json
import os
from pathlib import Path

import joblib
import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()
app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
LOCATION_DATA_PATH = BASE_DIR / "data" / "india_states_districts.json"
MODEL_PATH = BASE_DIR / "models" / "crop_model.joblib"

# Loading the model is optional: the website can still open before training.
model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "").strip()

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]

# Broad educational season map only. This is not a district-level crop calendar.
SEASON_CROPS = {
    "kharif": {"rice", "maize", "cotton", "jute", "mungbean", "mothbeans",
               "blackgram", "lentil", "pigeonpeas", "kidneybeans", "papaya",
               "banana", "coconut", "muskmelon", "watermelon"},
    "rabi": {"wheat", "chickpea", "lentil", "pomegranate", "grapes", "orange",
             "apple", "coffee"},
    "zaid": {"watermelon", "muskmelon", "cucumber", "mungbean", "maize"}
}

def load_location_data():
    if not LOCATION_DATA_PATH.exists():
        return None
    with LOCATION_DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)

def get_weather(latitude, longitude):
    response = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,precipitation",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
            "forecast_days": 7,
            "timezone": "auto",
        },
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    current = data.get("current", {})
    daily = data.get("daily", {})
    return {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "current_rain_mm": current.get("precipitation"),
        "forecast_rain_7d_mm": round(sum(v or 0 for v in daily.get("precipitation_sum", [])), 1),
        "forecast_dates": daily.get("time", []),
        "forecast_highs": daily.get("temperature_2m_max", []),
        "forecast_lows": daily.get("temperature_2m_min", []),
    }

def season_notes(season, weather):
    notes = []
    season_text = {
        "kharif": "Kharif is generally associated with the monsoon; local sowing dates and drainage are important.",
        "rabi": "Rabi is generally the cooler-season crop cycle; local sowing windows and irrigation availability matter.",
        "zaid": "Zaid is generally the warm interval between Rabi and Kharif; water availability is especially important.",
    }
    if season in season_text:
        notes.append(season_text[season])
    if weather:
        rain = weather.get("forecast_rain_7d_mm")
        if rain is not None:
            if rain >= 50:
                notes.append("The next 7-day forecast indicates substantial rain. Check drainage and avoid unnecessary irrigation.")
            elif rain <= 5:
                notes.append("Little rain is forecast for the next 7 days. Check root-zone moisture before irrigation.")
            else:
                notes.append("Use the short forecast together with actual soil moisture; it is not a seasonal rainfall estimate.")
    return notes


def simple_chat_reply(message, language="en"):
    language = language if language in ["en", "hi", "pa", "ta", "te", "bn"] else "en"

    replies = {
        "en": {
            "greeting": "Namaste! I am Farmer Dost. I can help with crops, soil health, irrigation, fertilizers, pests, and farming seasons. What crop are you growing, and which district are you from?",
            "wheat": "Wheat is generally a Rabi crop in many parts of India. Sowing time and variety depend on your district, soil, irrigation, and local recommendations.",
            "rice": "Rice water requirements depend on the variety, soil, weather, and planting method. Tell me your district, crop stage, and whether your field is irrigated or rain-fed.",
            "soil": "Healthy soil supports better crop growth. A soil test can identify pH and nutrient levels. Avoid adding fertilizer based only on guesswork.",
            "irrigation": "Irrigation depends on crop type, growth stage, soil moisture, and rainfall. Check soil moisture and weather before watering.",
            "fertilizer": "The right fertilizer depends on your crop, growth stage, and soil-test results. Excess fertilizer can harm crops. Follow local agricultural advice for application rates.",
            "pests": "Crop damage may be caused by pests, disease, nutrient deficiency, or weather stress. Identify the problem before applying pesticides, follow the product label, and consult your local KVK when needed.",
            "season": "India has three commonly discussed cropping seasons: Kharif during the monsoon, Rabi during cooler months, and Zaid during the warmer interval between major seasons. Sowing windows vary by crop and district.",
            "crops": "To consider suitable crops, share your state, district, season, soil type, irrigation availability, and soil-test values if available. Model-based suggestions do not guarantee yield.",
            "weather": "I cannot confirm live weather or rainfall forecasts from this basic chatbot. Check the India Meteorological Department or another official forecast before making weather-sensitive farming decisions.",
            "government": "Agricultural schemes and eligibility rules can change. Check the relevant official government portal or local agriculture office for current eligibility, documents, and application dates.",
            "default": "Namaste! I am Farmer Dost, your basic farming assistant. I can help with crop selection, soil health, irrigation, fertilizers, pests, diseases, and farming seasons. Please share your crop, district, growth stage, and problem."
        },

        "hi": {
            "greeting": "नमस्ते! मैं Farmer Dost हूँ। मैं फसल, मिट्टी, सिंचाई, खाद, कीट और खेती के मौसम के बारे में मदद कर सकता हूँ। आप कौन-सी फसल उगा रहे हैं और आपका जिला कौन-सा है?",
            "wheat": "गेहूँ भारत के कई क्षेत्रों में रबी की फसल है। इसकी बुवाई का समय और किस्म आपके जिले, मिट्टी, सिंचाई और स्थानीय कृषि सलाह पर निर्भर करते हैं।",
            "rice": "धान में पानी की आवश्यकता उसकी किस्म, मिट्टी, मौसम और रोपाई के तरीके पर निर्भर करती है। अपना जिला, फसल की अवस्था और सिंचाई की स्थिति बताएं।",
            "soil": "स्वस्थ मिट्टी फसल की अच्छी वृद्धि में मदद करती है। मिट्टी की जाँच से pH और पोषक तत्वों की जानकारी मिल सकती है। बिना जाँच के अनुमान से खाद न डालें।",
            "irrigation": "सिंचाई फसल, उसकी अवस्था, मिट्टी की नमी और बारिश पर निर्भर करती है। पानी देने से पहले मिट्टी की नमी और मौसम देखें।",
            "fertilizer": "सही खाद का चुनाव फसल, उसकी अवस्था और मिट्टी की जाँच पर निर्भर करता है। अधिक खाद फसल को नुकसान पहुँचा सकती है। खाद की मात्रा के लिए स्थानीय कृषि सलाह लें।",
            "pests": "फसल को नुकसान कीट, बीमारी, पोषक तत्वों की कमी या मौसम के कारण हो सकता है। समस्या की पहचान किए बिना कीटनाशक न डालें। उत्पाद के लेबल का पालन करें और जरूरत पड़ने पर स्थानीय KVK से सलाह लें।",
            "season": "भारत में खेती के तीन प्रमुख मौसम खरीफ, रबी और जायद हैं। बुवाई का सही समय फसल और जिले के अनुसार बदलता है।",
            "crops": "उपयुक्त फसल के बारे में सलाह के लिए अपना राज्य, जिला, मौसम, मिट्टी का प्रकार, सिंचाई की उपलब्धता और मिट्टी की जाँच के परिणाम बताएं। मॉडल का सुझाव उपज की गारंटी नहीं है।",
            "weather": "यह सामान्य चैटबॉट लाइव मौसम या बारिश का पूर्वानुमान नहीं बता सकता। मौसम पर निर्भर खेती के फैसले से पहले भारत मौसम विज्ञान विभाग की आधिकारिक जानकारी देखें।",
            "government": "सरकारी कृषि योजनाओं और पात्रता के नियम बदल सकते हैं। वर्तमान जानकारी के लिए आधिकारिक सरकारी पोर्टल या स्थानीय कृषि कार्यालय से संपर्क करें।",
            "default": "नमस्ते! मैं Farmer Dost हूँ। मैं फसल चयन, मिट्टी, सिंचाई, खाद, कीट, बीमारियों और खेती के मौसम में मदद कर सकता हूँ। अपनी फसल, जिला, फसल की अवस्था और समस्या बताएं।"
        },

        "pa": {
            "greeting": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Farmer Dost ਹਾਂ। ਮੈਂ ਫਸਲਾਂ, ਮਿੱਟੀ, ਸਿੰਚਾਈ, ਖਾਦਾਂ, ਕੀੜਿਆਂ ਅਤੇ ਖੇਤੀ ਦੇ ਮੌਸਮ ਬਾਰੇ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਤੁਸੀਂ ਕਿਹੜੀ ਫਸਲ ਉਗਾ ਰਹੇ ਹੋ ਅਤੇ ਤੁਹਾਡਾ ਜ਼ਿਲ੍ਹਾ ਕਿਹੜਾ ਹੈ?",
            "wheat": "ਕਣਕ ਪੰਜਾਬ ਸਮੇਤ ਭਾਰਤ ਦੇ ਕਈ ਹਿੱਸਿਆਂ ਵਿੱਚ ਰਬੀ ਦੀ ਫਸਲ ਹੈ। ਬਿਜਾਈ ਦਾ ਸਮਾਂ ਅਤੇ ਕਿਸਮ ਤੁਹਾਡੇ ਜ਼ਿਲ੍ਹੇ, ਮਿੱਟੀ, ਸਿੰਚਾਈ ਅਤੇ ਸਥਾਨਕ ਖੇਤੀਬਾੜੀ ਸਲਾਹ 'ਤੇ ਨਿਰਭਰ ਕਰਦੇ ਹਨ।",
            "rice": "ਝੋਨੇ ਦੀ ਪਾਣੀ ਦੀ ਲੋੜ ਕਿਸਮ, ਮਿੱਟੀ, ਮੌਸਮ ਅਤੇ ਲਗਾਉਣ ਦੇ ਤਰੀਕੇ 'ਤੇ ਨਿਰਭਰ ਕਰਦੀ ਹੈ। ਆਪਣਾ ਜ਼ਿਲ੍ਹਾ, ਫਸਲ ਦੀ ਅਵਸਥਾ ਅਤੇ ਸਿੰਚਾਈ ਬਾਰੇ ਦੱਸੋ।",
            "soil": "ਸਿਹਤਮੰਦ ਮਿੱਟੀ ਫਸਲ ਦੇ ਚੰਗੇ ਵਾਧੇ ਵਿੱਚ ਮਦਦ ਕਰਦੀ ਹੈ। ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਨਾਲ pH ਅਤੇ ਪੋਸ਼ਕ ਤੱਤਾਂ ਬਾਰੇ ਪਤਾ ਲੱਗ ਸਕਦਾ ਹੈ। ਬਿਨਾਂ ਜਾਂਚ ਦੇ ਅੰਦਾਜ਼ੇ ਨਾਲ ਖਾਦ ਨਾ ਪਾਓ।",
            "irrigation": "ਸਿੰਚਾਈ ਫਸਲ, ਉਸ ਦੀ ਅਵਸਥਾ, ਮਿੱਟੀ ਦੀ ਨਮੀ ਅਤੇ ਮੀਂਹ 'ਤੇ ਨਿਰਭਰ ਕਰਦੀ ਹੈ। ਪਾਣੀ ਦੇਣ ਤੋਂ ਪਹਿਲਾਂ ਮਿੱਟੀ ਦੀ ਨਮੀ ਅਤੇ ਮੌਸਮ ਵੇਖੋ।",
            "fertilizer": "ਸਹੀ ਖਾਦ ਫਸਲ, ਉਸ ਦੀ ਅਵਸਥਾ ਅਤੇ ਮਿੱਟੀ ਦੀ ਜਾਂਚ 'ਤੇ ਨਿਰਭਰ ਕਰਦੀ ਹੈ। ਵੱਧ ਖਾਦ ਨੁਕਸਾਨ ਕਰ ਸਕਦੀ ਹੈ। ਖਾਦ ਦੀ ਮਾਤਰਾ ਲਈ ਸਥਾਨਕ ਖੇਤੀਬਾੜੀ ਸਲਾਹ ਲਵੋ।",
            "pests": "ਫਸਲ ਦਾ ਨੁਕਸਾਨ ਕੀੜਿਆਂ, ਬਿਮਾਰੀਆਂ, ਪੋਸ਼ਕ ਤੱਤਾਂ ਦੀ ਘਾਟ ਜਾਂ ਮੌਸਮ ਕਾਰਨ ਹੋ ਸਕਦਾ ਹੈ। ਸਮੱਸਿਆ ਦੀ ਪਛਾਣ ਤੋਂ ਪਹਿਲਾਂ ਕੀਟਨਾਸ਼ਕ ਨਾ ਵਰਤੋ ਅਤੇ ਲੇਬਲ ਦੀ ਪਾਲਣਾ ਕਰੋ। ਲੋੜ ਪੈਣ 'ਤੇ ਸਥਾਨਕ KVK ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
            "season": "ਭਾਰਤ ਵਿੱਚ ਖੇਤੀ ਦੇ ਤਿੰਨ ਮੁੱਖ ਮੌਸਮ ਖਰੀਫ, ਰਬੀ ਅਤੇ ਜ਼ਾਇਦ ਹਨ। ਬਿਜਾਈ ਦਾ ਸਮਾਂ ਫਸਲ ਅਤੇ ਜ਼ਿਲ੍ਹੇ ਅਨੁਸਾਰ ਬਦਲਦਾ ਹੈ।",
            "crops": "ਢੁਕਵੀਂ ਫਸਲ ਬਾਰੇ ਸਲਾਹ ਲਈ ਆਪਣਾ ਰਾਜ, ਜ਼ਿਲ੍ਹਾ, ਮੌਸਮ, ਮਿੱਟੀ ਦੀ ਕਿਸਮ, ਸਿੰਚਾਈ ਅਤੇ ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਦੇ ਨਤੀਜੇ ਦੱਸੋ। ਮਾਡਲ ਦੀ ਸਲਾਹ ਪੈਦਾਵਾਰ ਦੀ ਗਾਰੰਟੀ ਨਹੀਂ ਹੈ।",
            "weather": "ਇਹ ਬੁਨਿਆਦੀ ਚੈਟਬੋਟ ਲਾਈਵ ਮੌਸਮ ਜਾਂ ਮੀਂਹ ਦੀ ਭਵਿੱਖਬਾਣੀ ਨਹੀਂ ਦੇ ਸਕਦਾ। ਮੌਸਮ ਬਾਰੇ ਫੈਸਲਾ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਅਧਿਕਾਰਤ ਮੌਸਮ ਜਾਣਕਾਰੀ ਵੇਖੋ।",
            "government": "ਸਰਕਾਰੀ ਖੇਤੀਬਾੜੀ ਯੋਜਨਾਵਾਂ ਅਤੇ ਯੋਗਤਾ ਦੇ ਨਿਯਮ ਬਦਲ ਸਕਦੇ ਹਨ। ਮੌਜੂਦਾ ਜਾਣਕਾਰੀ ਲਈ ਸਰਕਾਰੀ ਪੋਰਟਲ ਜਾਂ ਸਥਾਨਕ ਖੇਤੀਬਾੜੀ ਦਫ਼ਤਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
            "default": "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Farmer Dost ਹਾਂ। ਮੈਂ ਫਸਲਾਂ, ਮਿੱਟੀ, ਸਿੰਚਾਈ, ਖਾਦਾਂ, ਕੀੜਿਆਂ ਅਤੇ ਖੇਤੀ ਦੇ ਮੌਸਮ ਬਾਰੇ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਆਪਣੀ ਫਸਲ, ਜ਼ਿਲ੍ਹਾ ਅਤੇ ਸਮੱਸਿਆ ਦੱਸੋ।"
        },

        "ta": {
            "greeting": "வணக்கம்! நான் Farmer Dost. பயிர்கள், மண், நீர்ப்பாசனம், உரங்கள், பூச்சிகள் மற்றும் விவசாயப் பருவங்கள் பற்றி உதவ முடியும். நீங்கள் எந்தப் பயிரை வளர்க்கிறீர்கள்? உங்கள் மாவட்டம் எது?",
            "wheat": "கோதுமை இந்தியாவின் பல பகுதிகளில் ரபி பருவப் பயிராகும். விதைக்கும் நேரமும் ரகமும் உங்கள் மாவட்டம், மண், நீர்ப்பாசனம் மற்றும் உள்ளூர் வேளாண் ஆலோசனையைப் பொறுத்தது.",
            "rice": "நெற்பயிருக்கு தேவையான நீர் அதன் ரகம், மண், வானிலை மற்றும் நடவு முறையைப் பொறுத்தது. உங்கள் மாவட்டம், பயிரின் வளர்ச்சி நிலை மற்றும் நீர்ப்பாசன விவரங்களைச் சொல்லுங்கள்.",
            "soil": "ஆரோக்கியமான மண் பயிர் வளர்ச்சிக்கு உதவுகிறது. மண் பரிசோதனை மூலம் pH மற்றும் ஊட்டச்சத்து அளவுகளை அறியலாம். பரிசோதனை இல்லாமல் ஊகத்தின் அடிப்படையில் உரமிட வேண்டாம்.",
            "irrigation": "நீர்ப்பாசனம் பயிர் வகை, வளர்ச்சி நிலை, மண்ணின் ஈரப்பதம் மற்றும் மழையைப் பொறுத்தது. நீர் பாய்ச்சுவதற்கு முன் மண்ணின் ஈரப்பதத்தையும் வானிலையையும் பாருங்கள்.",
            "fertilizer": "சரியான உரம் பயிர், வளர்ச்சி நிலை மற்றும் மண் பரிசோதனை முடிவுகளைப் பொறுத்தது. அதிக உரம் பயிரை பாதிக்கலாம். உள்ளூர் வேளாண் ஆலோசனையைப் பின்பற்றுங்கள்.",
            "pests": "பயிர் சேதம் பூச்சிகள், நோய்கள், ஊட்டச்சத்து குறைபாடு அல்லது வானிலை காரணமாக இருக்கலாம். பிரச்சினையை அடையாளம் காணும் முன் பூச்சிக்கொல்லி பயன்படுத்த வேண்டாம். தயாரிப்பு லேபிளைப் பின்பற்றுங்கள்; தேவைப்பட்டால் உள்ளூர் KVK-ஐ அணுகுங்கள்.",
            "season": "இந்தியாவில் முக்கியமாக காரீஃப், ரபி மற்றும் ஜாயித் ஆகிய மூன்று பயிர் பருவங்கள் உள்ளன. விதைக்கும் காலம் பயிர் மற்றும் மாவட்டத்தைப் பொறுத்து மாறும்.",
            "crops": "பொருத்தமான பயிரைத் தேர்வு செய்ய உங்கள் மாநிலம், மாவட்டம், பருவம், மண் வகை, நீர்ப்பாசன வசதி மற்றும் மண் பரிசோதனை முடிவுகளைப் பகிருங்கள். மாதிரி பரிந்துரை விளைச்சலுக்கு உத்தரவாதம் அல்ல.",
            "weather": "இந்த அடிப்படை chatbot நேரடி வானிலை அல்லது மழை முன்னறிவிப்பை உறுதிப்படுத்த முடியாது. வானிலையைச் சார்ந்த முடிவுகளுக்கு முன் அதிகாரப்பூர்வ முன்னறிவிப்பைப் பாருங்கள்.",
            "government": "அரசு வேளாண் திட்டங்களும் தகுதி விதிகளும் மாறலாம். தற்போதைய விவரங்களுக்கு அதிகாரப்பூர்வ அரசு இணையதளம் அல்லது உள்ளூர் வேளாண் அலுவலகத்தை அணுகுங்கள்.",
            "default": "வணக்கம்! நான் Farmer Dost. பயிர்கள், மண், நீர்ப்பாசனம், உரங்கள், பூச்சிகள் மற்றும் விவசாயப் பருவங்கள் பற்றி உதவ முடியும். உங்கள் பயிர், மாவட்டம் மற்றும் பிரச்சினையைச் சொல்லுங்கள்."
        },

        "te": {
            "greeting": "నమస్కారం! నేను Farmer Dost. పంటలు, నేల, నీటిపారుదల, ఎరువులు, పురుగులు మరియు పంటకాలాల గురించి సహాయం చేయగలను. మీరు ఏ పంట పండిస్తున్నారు? మీ జిల్లా ఏది?",
            "wheat": "గోధుమలు భారతదేశంలోని అనేక ప్రాంతాల్లో రబీ పంట. విత్తే సమయం, రకం మీ జిల్లా, నేల, నీటిపారుదల మరియు స్థానిక వ్యవసాయ సలహాపై ఆధారపడి ఉంటాయి.",
            "rice": "వరి పంటకు అవసరమైన నీరు రకం, నేల, వాతావరణం మరియు నాటే విధానంపై ఆధారపడి ఉంటుంది. మీ జిల్లా, పంట దశ, నీటిపారుదల వివరాలు చెప్పండి.",
            "soil": "ఆరోగ్యకరమైన నేల పంట పెరుగుదలకు సహాయపడుతుంది. నేల పరీక్ష ద్వారా pH మరియు పోషకాల స్థాయిలను తెలుసుకోవచ్చు. పరీక్ష లేకుండా ఊహించి ఎరువులు వేయకండి.",
            "irrigation": "నీటిపారుదల పంట రకం, పెరుగుదల దశ, నేల తేమ మరియు వర్షంపై ఆధారపడి ఉంటుంది. నీరు పెట్టే ముందు నేల తేమను, వాతావరణాన్ని పరిశీలించండి.",
            "fertilizer": "సరైన ఎరువు పంట, పెరుగుదల దశ మరియు నేల పరీక్ష ఫలితాలపై ఆధారపడి ఉంటుంది. అధిక ఎరువు పంటకు హాని చేయవచ్చు. స్థానిక వ్యవసాయ సలహాను పాటించండి.",
            "pests": "పంట నష్టం పురుగులు, వ్యాధులు, పోషకాల లోపం లేదా వాతావరణం వల్ల రావచ్చు. సమస్యను గుర్తించే ముందు పురుగుమందులు వాడకండి. ఉత్పత్తి లేబుల్‌ను పాటించి, అవసరమైతే స్థానిక KVKను సంప్రదించండి.",
            "season": "భారతదేశంలో ఖరీఫ్, రబీ, జైద్ అనే మూడు ప్రధాన పంటకాలాలు ఉన్నాయి. విత్తే సమయం పంట మరియు జిల్లాను బట్టి మారుతుంది.",
            "crops": "సరైన పంటను ఎంచుకోవడానికి మీ రాష్ట్రం, జిల్లా, సీజన్, నేల రకం, నీటిపారుదల సౌకర్యం మరియు నేల పరీక్ష ఫలితాలను చెప్పండి. మోడల్ సూచన దిగుబడికి హామీ కాదు.",
            "weather": "ఈ ప్రాథమిక చాట్‌బాట్ ప్రత్యక్ష వాతావరణం లేదా వర్ష సూచనను నిర్ధారించలదు. వాతావరణంపై ఆధారపడే నిర్ణయాలకు ముందు అధికారిక సూచనను చూడండి.",
            "government": "ప్రభుత్వ వ్యవసాయ పథకాలు మరియు అర్హత నియమాలు మారవచ్చు. తాజా వివరాల కోసం అధికారిక ప్రభుత్వ వెబ్‌సైట్ లేదా స్థానిక వ్యవసాయ కార్యాలయాన్ని సంప్రదించండి.",
            "default": "నమస్కారం! నేను Farmer Dost. పంటలు, నేల, నీటిపారుదల, ఎరువులు, పురుగులు మరియు పంటకాలాల గురించి సహాయం చేయగలను. మీ పంట, జిల్లా మరియు సమస్యను చెప్పండి."
        },

        "bn": {
            "greeting": "নমস্কার! আমি Farmer Dost। ফসল, মাটি, সেচ, সার, পোকামাকড় এবং চাষের মরসুম সম্পর্কে সাহায্য করতে পারি। আপনি কোন ফসল চাষ করছেন এবং আপনার জেলা কোনটি?",
            "wheat": "গম ভারতের অনেক অঞ্চলে রবি ফসল। বপনের সময় ও জাত আপনার জেলা, মাটি, সেচ এবং স্থানীয় কৃষি পরামর্শের ওপর নির্ভর করে।",
            "rice": "ধানের জলের চাহিদা জাত, মাটি, আবহাওয়া এবং রোপণের পদ্ধতির ওপর নির্ভর করে। আপনার জেলা, ফসলের বৃদ্ধি পর্যায় এবং সেচের ব্যবস্থা জানান।",
            "soil": "উর্বর ও সুস্থ মাটি ফসলের বৃদ্ধিতে সাহায্য করে। মাটি পরীক্ষা করে pH এবং পুষ্টির মাত্রা জানা যায়। পরীক্ষা ছাড়া অনুমান করে সার দেবেন না।",
            "irrigation": "সেচ ফসলের ধরন, বৃদ্ধির পর্যায়, মাটির আর্দ্রতা এবং বৃষ্টির ওপর নির্ভর করে। জল দেওয়ার আগে মাটির আর্দ্রতা ও আবহাওয়া দেখুন।",
            "fertilizer": "সঠিক সার নির্ভর করে ফসল, বৃদ্ধির পর্যায় এবং মাটি পরীক্ষার ফলাফলের ওপর। অতিরিক্ত সার ফসলের ক্ষতি করতে পারে। স্থানীয় কৃষি পরামর্শ মেনে চলুন।",
            "pests": "ফসলের ক্ষতি পোকা, রোগ, পুষ্টির অভাব বা আবহাওয়ার কারণে হতে পারে। সমস্যা শনাক্ত করার আগে কীটনাশক ব্যবহার করবেন না। পণ্যের লেবেল মেনে চলুন এবং প্রয়োজনে স্থানীয় KVK-র পরামর্শ নিন।",
            "season": "ভারতে প্রধানত খরিফ, রবি ও জায়েদ—এই তিনটি চাষের মরসুম রয়েছে। বপনের সময় ফসল ও জেলার ওপর নির্ভর করে বদলে যায়।",
            "crops": "উপযুক্ত ফসল বেছে নিতে আপনার রাজ্য, জেলা, মরসুম, মাটির ধরন, সেচের সুবিধা এবং মাটি পরীক্ষার ফলাফল জানান। মডেলের পরামর্শ ফলনের নিশ্চয়তা নয়।",
            "weather": "এই সাধারণ চ্যাটবট সরাসরি আবহাওয়া বা বৃষ্টির পূর্বাভাস নিশ্চিত করতে পারে না। আবহাওয়া-নির্ভর সিদ্ধান্তের আগে সরকারি পূর্বাভাস দেখুন।",
            "government": "সরকারি কৃষি প্রকল্প ও যোগ্যতার নিয়ম বদলাতে পারে। বর্তমান তথ্যের জন্য সরকারি পোর্টাল বা স্থানীয় কৃষি দপ্তরের সঙ্গে যোগাযোগ করুন।",
            "default": "নমস্কার! আমি Farmer Dost। ফসল, মাটি, সেচ, সার, পোকামাকড় এবং চাষের মরসুম সম্পর্কে সাহায্য করতে পারি। আপনার ফসল, জেলা এবং সমস্যার কথা জানান।"
        }
    }
    q = message.lower().strip()

    # Greetings
    if any(word in q for word in [
        "hello", "hi", "hey", "namaste", "नमस्ते", "राम राम"
    ]):
        return replies[language]["greeting"]

    # Wheat
    if any(word in q for word in ["wheat", "gehun", "गेहूं", "गेंहू"]):
        return replies[language]["wheat"]

    # Rice and paddy
    if any(word in q for word in ["rice", "paddy", "dhan", "धान", "चावल"]):
        return replies[language]["rice"]

    # Soil health
    if any(word in q for word in ["soil", "ph", "मिट्टी", "soil test"]):
        return replies[language]["soil"]

    # Irrigation
    if any(word in q for word in [
        "irrigation", "irrigate", "watering", "water", "सिंचाई", "पानी"
    ]):
        return replies[language]["irrigation"]

    # Fertilizers and nutrients
    if any(word in q for word in [
        "fertilizer", "fertiliser", "urea", "npk", "खाद", "उर्वरक", "यूरिया"
    ]):
        return replies[language]["fertilizer"]

    # Pests and diseases
    if any(word in q for word in [
        "pest", "insect", "disease", "fungus", "spots", "कीट", "रोग", "बीमारी", "फफूंद"
    ]):
        return replies[language]["pests"]

    # Crop seasons
    if any(word in q for word in [
        "season", "kharif", "rabi", "zaid", "खरीफ", "रबी", "जायद"
    ]):
        return replies[language]["season"]

    # Crop recommendations
    if any(word in q for word in [
        "which crop", "suggest crop", "recommend crop", "best crop",
        "crop recommendation", "कौन सी फसल", "कौनसी फसल"
    ]):
        return replies[language]["crops"]

    # Weather
    if any(word in q for word in [
        "weather", "rain", "rainfall", "forecast", "मौसम", "बारिश", "वर्षा"
    ]):
        return replies[language]["weather"]

    # Government support
    if any(word in q for word in [
        "government scheme", "subsidy", "pm kisan", "सरकारी योजना", "सब्सिडी", "पीएम किसान"
    ]):
        return replies[language]["government"]

    # Default response
    return replies[language]["default"]


@app.route("/api/weather", methods=["POST"])
def weather_api():
    body = request.get_json(silent=True) or {}
    try:
        latitude = float(body["latitude"])
        longitude = float(body["longitude"])
    except (KeyError, TypeError, ValueError):
        return jsonify(success=False, message="Select a state and district first."), 400
    try:
        weather = get_weather(latitude, longitude)
        return jsonify(success=True, weather=weather)
    except requests.RequestException:
        return jsonify(success=False, message="Weather service is unavailable right now. You can still use manually entered climate values."), 502

@app.route("/api/crop-suggestions", methods=["POST"])
def crop_suggestions():
    body = request.get_json(silent=True) or {}
    try:
        values = {
            "N": float(body["N"]), "P": float(body["P"]), "K": float(body["K"]),
            "ph": float(body["ph"]), "temperature": float(body["temperature"]),
            "humidity": float(body["humidity"]), "rainfall": float(body["rainfall"])
        }
    except (KeyError, TypeError, ValueError):
        return jsonify(success=False, message="Enter valid numeric values for N, P, K, pH, temperature, humidity, and rainfall."), 400

    if not 0 <= values["ph"] <= 14:
        return jsonify(success=False, message="Soil pH must be between 0 and 14."), 400
    if not 0 <= values["humidity"] <= 100:
        return jsonify(success=False, message="Humidity must be between 0 and 100."), 400
    if any(values[k] < 0 for k in ["N", "P", "K", "rainfall"]):
        return jsonify(success=False, message="N, P, K, and rainfall cannot be negative."), 400

    if model is None:
        return jsonify(success=False, message="The crop model is not trained yet. Add data/Crop_recommendation.csv and run: python train_model.py"), 503

    features = [[values[name] for name in FEATURES]]
    season = str(body.get("season", "kharif")).lower()
    state = str(body.get("state", "")).strip()
    district = str(body.get("district", "")).strip()
    try:
        probabilities = model.predict_proba(features)[0]
        classes = list(model.classes_)
        ranked = sorted(zip(classes, probabilities), key=lambda item: item[1], reverse=True)
        seasonal = SEASON_CROPS.get(season, set())
        seasonal_ranked = [item for item in ranked if str(item[0]).lower().replace(" ", "") in
                           {crop.replace(" ", "") for crop in seasonal}]
        # Keep model-ranked crops visible even if the broad season mapping has no match.
        chosen = seasonal_ranked[:3] if seasonal_ranked else ranked[:3]
        candidates = [
            {"crop": str(name).replace("_", " ").title(), "confidence_percent": round(float(prob) * 100, 1)}
            for name, prob in chosen
        ]
        top_crop = candidates[0]["crop"] if candidates else str(model.predict(features)[0]).replace("_", " ").title()
    except Exception:
        app.logger.exception("Crop prediction failed")
        return jsonify(success=False, message="The model could not process these values. Check the dataset feature columns and try again."), 500

    return jsonify(
        success=True,
        crop=top_crop,
        candidates=candidates,
        explanation="These crops are ranked by the trained model using the soil and climate values you entered. Percentages are model scores, not guaranteed chances of success.",
        location={"state": state, "district": district},
        season=season.title(),
        tips=season_notes(season, None),
        disclaimer="This model is based on the training dataset and broad season hints. It does not yet contain validated crop calendars for every Indian district. Confirm soil-test units, local sowing windows, water availability, and advice from your local KVK/agriculture officer before planting."
    )
    
@app.route("/")
def index():
    return render_template("member4.html")


@app.route("/api/locations", methods=["GET"])
def locations_api():
    data = load_location_data()

    if data is None:
        return jsonify(
            success=False,
            message="India location data is not installed yet. Run: python download_location_data.py"
        ), 503

    return jsonify(success=True, locations=data)


@app.route("/api/chat", methods=["POST"])
def chat_api():
    body = request.get_json(silent=True) or {}
    message = str(body.get("message", "")).strip()
    history = body.get("history", [])
    language = str(body.get("language", "en")).lower()

    supported_languages = {
        "en": "English",
        "hi": "Hindi",
        "pa": "Punjabi",
        "ta": "Tamil",
        "te": "Telugu",
        "bn": "Bengali",
    }

    if language not in supported_languages:
        language = "en"
    language_name = supported_languages[language]

    if not message:
        return jsonify(success=False, message="Please type a question."), 400

    if OPENAI_API_KEY and OPENAI_MODEL:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=OPENAI_API_KEY)
            safe_history = []
            if isinstance(history, list):
                for item in history[-6:]:
                    if isinstance(item, dict) and item.get("role") in ["user", "assistant"]:
                        safe_history.append({
                            "role": item["role"],
                            "content": str(item.get("content", ""))[:1200],
                        })

            response = client.responses.create(
                model=OPENAI_MODEL,
                instructions=(
                    "You are Farmer Dost, a careful agricultural information assistant "
                    "for Indian farmers. Reply in " + language_name + ". "
                    "Use simple, farmer-friendly language. Keep crop names clear and "
                    "include the English crop name in parentheses when helpful. "
                    "Ask for missing context. Do not invent weather, market prices, "
                    "or government rules. Do not prescribe exact pesticide doses "
                    "without a verified product label. Encourage local KVK or "
                    "agriculture officer advice for high-risk decisions."
                ),
                input=safe_history + [{"role": "user", "content": message}],
                max_output_tokens=500,
            )
            if response.output_text.strip():
                return jsonify(success=True, reply=response.output_text.strip(), mode="ai")
        except Exception:
            app.logger.exception("Chat provider failed; using basic fallback.")

    return jsonify(
        success=True,
        reply=simple_chat_reply(message, language),
        mode="basic",
    )

if __name__ == "__main__":
    app.run(debug=True)
