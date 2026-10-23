
const languageSelect = document.getElementById("languageSelect");

const translations = {
  en: {
    cropTab: "Crop Suggestions",
    chatTab: "Farmer Assistant",
    cropTitle: "Find suitable crops",
    chatTitle: "Ask Farmer Dost",
    getSuggestions: "Get crop suggestions",
    send: "Send",
    chatPlaceholder: "Ask a farming question...",
    thinking: "Farmer Dost is thinking...",
    checking: "Checking crop suitability...",
    suggested: "Suggested crops",
    seasonNotes: "Season notes",
    greeting: "Namaste! I am Farmer Dost. What would you like to know about farming?"
  },
  hi: {
    cropTab: "फसल सुझाव",
    chatTab: "किसान सहायक",
    cropTitle: "उपयुक्त फसलें खोजें",
    chatTitle: "किसान दोस्त से पूछें",
    getSuggestions: "फसल सुझाव प्राप्त करें",
    send: "भेजें",
    chatPlaceholder: "खेती के बारे में प्रश्न पूछें...",
    thinking: "किसान दोस्त सोच रहा है...",
    checking: "फसल की उपयुक्तता जाँची जा रही है...",
    suggested: "सुझाई गई फसलें",
    seasonNotes: "मौसम संबंधी सुझाव",
    greeting: "नमस्ते! मैं किसान दोस्त हूँ। आप खेती के बारे में क्या जानना चाहते हैं?"
  },
  pa: {
    cropTab: "ਫਸਲਾਂ ਦੇ ਸੁਝਾਅ",
    chatTab: "ਕਿਸਾਨ ਸਹਾਇਕ",
    cropTitle: "ਢੁਕਵੀਆਂ ਫਸਲਾਂ ਲੱਭੋ",
    chatTitle: "ਕਿਸਾਨ ਦੋਸਤ ਨੂੰ ਪੁੱਛੋ",
    getSuggestions: "ਫਸਲਾਂ ਦੇ ਸੁਝਾਅ ਲਵੋ",
    send: "ਭੇਜੋ",
    chatPlaceholder: "ਖੇਤੀ ਬਾਰੇ ਸਵਾਲ ਪੁੱਛੋ...",
    thinking: "ਕਿਸਾਨ ਦੋਸਤ ਸੋਚ ਰਿਹਾ ਹੈ...",
    checking: "ਫਸਲ ਦੀ ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ...",
    suggested: "ਸੁਝਾਈਆਂ ਫਸਲਾਂ",
    seasonNotes: "ਮੌਸਮ ਸੰਬੰਧੀ ਸੁਝਾਅ",
    greeting: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਕਿਸਾਨ ਦੋਸਤ ਹਾਂ। ਤੁਸੀਂ ਖੇਤੀ ਬਾਰੇ ਕੀ ਜਾਣਨਾ ਚਾਹੁੰਦੇ ਹੋ?"
  },
  ta: {
    cropTab: "பயிர் பரிந்துரைகள்",
    chatTab: "விவசாயி உதவியாளர்",
    cropTitle: "பொருத்தமான பயிர்களைக் கண்டறியவும்",
    chatTitle: "உழவர் நண்பரிடம் கேளுங்கள்",
    getSuggestions: "பயிர் பரிந்துரைகளைப் பெறுக",
    send: "அனுப்பு",
    chatPlaceholder: "விவசாயம் பற்றி கேளுங்கள்...",
    thinking: "உழவர் நண்பர் சிந்திக்கிறார்...",
    checking: "பயிர் பொருத்தம் சரிபார்க்கப்படுகிறது...",
    suggested: "பரிந்துரைக்கப்பட்ட பயிர்கள்",
    seasonNotes: "பருவக் குறிப்புகள்",
    greeting: "வணக்கம்! நான் உழவர் நண்பன். விவசாயம் பற்றி என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?"
  },
  te: {
    cropTab: "పంట సూచనలు",
    chatTab: "రైతు సహాయకుడు",
    cropTitle: "తగిన పంటలను కనుగొనండి",
    chatTitle: "రైతు దోస్త్‌ను అడగండి",
    getSuggestions: "పంట సూచనలు పొందండి",
    send: "పంపండి",
    chatPlaceholder: "వ్యవసాయం గురించి ప్రశ్న అడగండి...",
    thinking: "రైతు దోస్త్ ఆలోచిస్తోంది...",
    checking: "పంట అనుకూలతను పరిశీలిస్తున్నాం...",
    suggested: "సూచించిన పంటలు",
    seasonNotes: "సీజన్ సూచనలు",
    greeting: "నమస్కారం! నేను రైతు దోస్త్. వ్యవసాయం గురించి ఏమి తెలుసుకోవాలనుకుంటున్నారు?"
  },
  bn: {
    cropTab: "ফসলের পরামর্শ",
    chatTab: "কৃষক সহায়ক",
    cropTitle: "উপযুক্ত ফসল খুঁজুন",
    chatTitle: "কৃষক বন্ধুকে জিজ্ঞাসা করুন",
    getSuggestions: "ফসলের পরামর্শ নিন",
    send: "পাঠান",
    chatPlaceholder: "কৃষি সম্পর্কে প্রশ্ন করুন...",
    thinking: "কৃষক বন্ধু ভাবছে...",
    checking: "ফসলের উপযুক্ততা যাচাই করা হচ্ছে...",
    suggested: "প্রস্তাবিত ফসল",
    seasonNotes: "মরসুমের পরামর্শ",
    greeting: "নমস্কার! আমি কৃষক বন্ধু। কৃষি সম্পর্কে কী জানতে চান?"
  }
};

function getLanguageText(key) {
  const language = languageSelect?.value || "en";
  return translations[language]?.[key] || translations.en[key] || key;
}

function applyLanguage() {
  const tabButtons = document.querySelectorAll(".tab");
  if (tabButtons[0]) tabButtons[0].textContent = getLanguageText("cropTab");
  if (tabButtons[1]) tabButtons[1].textContent = getLanguageText("chatTab");

  const cropTitle = document.querySelector("#cropPanel h1");
  const chatTitle = document.querySelector("#chatPanel h1");
  if (cropTitle) cropTitle.textContent = getLanguageText("cropTitle");
  if (chatTitle) chatTitle.textContent = getLanguageText("chatTitle");

  const cropButton = cropForm.querySelector('button[type="submit"]');
  const chatButton = chatForm.querySelector('button[type="submit"]');
  if (cropButton) cropButton.textContent = getLanguageText("getSuggestions");
  if (chatButton) chatButton.textContent = getLanguageText("send");

  chatInput.placeholder = getLanguageText("chatPlaceholder");

  const greeting = chatMessages.querySelector(".bubble.bot");
  if (greeting && history.length === 0) {
    greeting.textContent = getLanguageText("greeting");
  }

  document.documentElement.lang = languageSelect?.value || "en";
}

const tabs = document.querySelectorAll(".tab");
tabs.forEach(button => button.addEventListener("click", () => {
  tabs.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  document.querySelectorAll(".panel").forEach(panel => panel.classList.add("hidden"));
  document.getElementById(button.dataset.panel).classList.remove("hidden");
}));

const stateSelect = document.getElementById("stateSelect");
const districtSelect = document.getElementById("districtSelect");
const locationStatus = document.getElementById("locationStatus");
const cropForm = document.getElementById("cropForm");
const cropResult = document.getElementById("cropResult");
let locationData = [];

async function loadLocations() {
  try {
    const response = await fetch("/api/locations");
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Could not load locations.");
    locationData = data.locations;
    stateSelect.replaceChildren(new Option("Select a state / UT", ""));
    locationData.forEach(state => stateSelect.add(new Option(state.name, state.name)));
    locationStatus.textContent = `Loaded ${locationData.length} state/UT entries. Select a state to load its districts.`;
    locationStatus.classList.remove("error");
  } catch (error) {
    locationStatus.textContent = error.message + " See README.md for the setup command.";
    locationStatus.classList.add("error");
    stateSelect.replaceChildren(new Option("Location list unavailable", ""));
  }
}

stateSelect.addEventListener("change", () => {
  const selected = locationData.find(item => item.name === stateSelect.value);
  districtSelect.replaceChildren(new Option(selected ? "Select a district" : "Choose a state first", ""));
  if (selected) {
    (selected.districts || []).forEach(district => {
      const name = typeof district === "string" ? district : district.name;
      if (name) districtSelect.add(new Option(name, name));
    });
    districtSelect.disabled = false;
  } else {
    districtSelect.disabled = true;
  }
});

function addText(parent, tag, text, className = "") {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

cropForm.addEventListener("submit", async event => {
  event.preventDefault();
  cropResult.classList.remove("hidden");
  cropResult.replaceChildren();
  addText(cropResult, "p", "Checking crop suitability...");
  const payload = Object.fromEntries(new FormData(cropForm).entries());
payload.language = languageSelect.value;
  ["N", "P", "K", "ph", "temperature", "humidity", "rainfall"].forEach(key => payload[key] = Number(payload[key]));
  try {
    const response = await fetch("/api/crop-suggestions", {
      method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Could not get crop suggestions.");
    cropResult.replaceChildren();
    addText(cropResult, "h2", "Suggested crops");
    addText(cropResult, "p", data.explanation);
    const list = document.createElement("ol");
    (data.candidates || [{crop: data.crop, confidence_percent: null}]).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.crop + (item.confidence_percent === null ? "" : ` — model score ${item.confidence_percent}%`);
      list.appendChild(li);
    });
    cropResult.appendChild(list);
    addText(cropResult, "p", `Selected location: ${payload.district}, ${payload.state} · Season: ${payload.season}`);
    addText(cropResult, "strong", "Season notes");
    const notes = document.createElement("ul");
    (data.tips || []).forEach(tip => addText(notes, "li", tip));
    cropResult.appendChild(notes);
    addText(cropResult, "p", data.disclaimer, "hint");
  } catch (error) {
    cropResult.replaceChildren();
    addText(cropResult, "p", error.message, "error");
  }
});

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const history = [];
function addBubble(text, role) {
  const bubble = document.createElement("div");
  bubble.className = "bubble " + (role === "user" ? "user" : "bot");
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
chatForm.addEventListener("submit", async event => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addBubble(message, "user");
  history.push({role: "user", content: message});
  chatInput.value = "";
  const waiting = document.createElement("div");
  waiting.className = "bubble bot";
  waiting.textContent = "Farmer Dost is thinking...";
  chatMessages.appendChild(waiting);
  try {
    const response = await fetch("/api/chat", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
  message,
  history: history.slice(-6, -1),
  language: languageSelect.value
})
    });
    const data = await response.json();
    waiting.remove();
    if (!response.ok || !data.success) throw new Error(data.message || "Chat request failed.");
    addBubble(data.reply, "assistant");
    history.push({role: "assistant", content: data.reply});
  } catch (error) {
    waiting.textContent = "Sorry, I could not answer right now. " + error.message;
  }
});

languageSelect.addEventListener("change", applyLanguage);
applyLanguage();
loadLocations();
