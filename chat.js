const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const apiStatus = document.getElementById('apiStatus');

const STORAGE_KEY = 'ai_chatbot_history';
const API_KEY_STORAGE = 'ai_chatbot_openai_key';

// --- History ---
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const messages = JSON.parse(raw);
    const welcome = chatMessages.querySelector('[data-welcome]');
    if (welcome) welcome.remove();
    messages.forEach(({ content, isUser }) => appendMessage(content, isUser, false));
  } catch (_) {}
}

function saveToHistory(content, isUser) {
  try {
    const items = [];
    chatMessages.querySelectorAll('.message').forEach((msg) => {
      const p = msg.querySelector('.bubble p');
      if (p && !msg.id) items.push({ content: p.textContent, isUser: msg.classList.contains('user') });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (_) {}
}

function clearHistory() {
  if (!confirm('Clear all chat history? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  const welcome = chatMessages.querySelector('[data-welcome]');
  chatMessages.innerHTML = '';
  if (!welcome) {
    const wrap = document.createElement('div');
    wrap.className = 'message bot';
    wrap.setAttribute('data-welcome', '');
    wrap.innerHTML = '<div class="bubble"><p>Chat cleared. Hi again! How can I help?</p></div>';
    chatMessages.appendChild(wrap);
  } else {
    chatMessages.appendChild(welcome);
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- API key ---
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE);
  updateApiStatus();
}

function updateApiStatus() {
  apiStatus.textContent = getApiKey() ? 'AI (OpenAI)' : 'Online';
}

// --- Settings modal ---
function openSettings() {
  apiKeyInput.value = getApiKey();
  settingsModal.hidden = false;
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.hidden = true;
}

function saveSettings() {
  setApiKey(apiKeyInput.value.trim());
  closeSettings();
  maybeShowFileWarning();
}

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
clearHistoryBtn.addEventListener('click', clearHistory);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// --- Rule-based responses (more topics) ---
const responses = {
  greeting: [
    "Hello! How can I help you today?",
    "Hi there! What's on your mind?",
    "Hey! Good to see you. What can I do for you?",
  ],
  howAreYou: [
    "I'm doing great, thanks for asking! How about you?",
    "All systems operational. How are you?",
    "I'm here and ready to chat. How are you doing?",
  ],
  name: [
    "I'm your AI assistant. You can call me whatever you like!",
    "I don't have a name—just think of me as your helpful bot.",
    "I'm the AI behind this chat. What would you like to call me?",
  ],
  time: () => [
    `Right now it's ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    `The time is ${new Date().toLocaleTimeString()}.`,
  ],
  date: () => [
    `Today is ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
    new Date().toLocaleDateString(),
  ],
  thanks: [
    "You're welcome! Anything else?",
    "Happy to help! Let me know if you need more.",
    "Glad I could help!",
  ],
  bye: [
    "Goodbye! Talk to you later.",
    "See you! Have a great day.",
    "Bye! Take care.",
  ],
  help: [
    "I can chat, tell you the time or date, answer simple questions, and respond to greetings. Add an OpenAI API key in Settings for full AI replies!",
    "Ask me: time, date, how are you, jokes, motivation, or say hi. Or enable OpenAI in Settings for open-ended questions.",
  ],
  joke: [
    "Why did the scarecrow win an award? He was outstanding in his field!",
    "What do you call a fake noodle? An impasta!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What did the ocean say to the beach? Nothing, it just waved.",
  ],
  motivation: [
    "You've got this. One step at a time.",
    "Progress over perfection. Keep going!",
    "Every expert was once a beginner. Keep learning!",
    "Small steps still move you forward.",
  ],
  weather: [
    "I can't check live weather from here—try a weather app or site. I can tell you the current date and time though!",
    "I don't have access to weather data. Want to know the time or date instead?",
  ],
  programming: [
    "I can help with general programming ideas. For full code help, add an OpenAI API key in Settings!",
    "Programming is all about breaking problems into smaller steps. What language or topic are you into?",
  ],
  favorite: [
    "I don't have favorites—I'm a bot! But I'm curious: what's yours?",
    "I like helping you. What do you like?",
  ],
  default: [
    "That's interesting! Tell me more.",
    "I'm not sure how to answer that. Try asking about time, date, a joke, or add an API key in Settings for full AI.",
    "I do best with: greetings, time, date, jokes, or motivation. Or enable OpenAI in Settings for anything else!",
  ],
};

function normalize(text) {
  return text.trim().toLowerCase().replace(/[?!.]/g, '');
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBotResponse(userText) {
  const t = normalize(userText);

  if (!t) return pick(responses.default);

  if (/\b(hi|hey|hello|howdy|yo|sup|good morning|good afternoon|good evening)\b/.test(t))
    return pick(responses.greeting);
  if (/\b(how are you|how're you|how r u|hows it going|how's it going)\b/.test(t))
    return pick(responses.howAreYou);
  if (/\b(who are you|what is your name|what's your name|your name)\b/.test(t))
    return pick(responses.name);
  if (/\b(time|what time|current time|clock)\b/.test(t))
    return pick(responses.time());
  if (/\b(date|what date|today|what day)\b/.test(t))
    return pick(responses.date());
  if (/\b(thank|thanks|thx|ty)\b/.test(t))
    return pick(responses.thanks);
  if (/\b(bye|goodbye|see you|later|goodnight)\b/.test(t))
    return pick(responses.bye);
  if (/\b(help|what can you do)\b/.test(t))
    return pick(responses.help);
  if (/\b(joke|funny|make me laugh)\b/.test(t))
    return pick(responses.joke);
  if (/\b(motivat|inspire|encourage|cheer me up)\b/.test(t))
    return pick(responses.motivation);
  if (/\b(weather|rain|sunny|temperature)\b/.test(t))
    return pick(responses.weather);
  if (/\b(code|programming|program|javascript|python|html)\b/.test(t))
    return pick(responses.programming);
  if (/\b(favorite|favourite|like best|your favorite)\b/.test(t))
    return pick(responses.favorite);

  return pick(responses.default);
}

// --- OpenAI ---
function isFileProtocol() {
  return window.location.protocol === 'file:';
}

async function fetchOpenAI(userText) {
  const key = getApiKey();
  if (!key) return { reply: null, error: null };

  // Browsers block fetch to OpenAI when the page is opened as file:// (CORS)
  if (isFileProtocol()) {
    return {
      reply: null,
      error: 'Page opened as a file. Open it via a local server instead (e.g. run in this folder: npx serve, then visit http://localhost:3000).',
    };
  }

  const history = [];
  chatMessages.querySelectorAll('.message').forEach((msg) => {
    const p = msg.querySelector('.bubble p');
    if (p && !msg.id) {
      const role = msg.classList.contains('user') ? 'user' : 'assistant';
      history.push({ role, content: p.textContent });
    }
  });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful, friendly assistant. Keep replies concise and conversational.' },
          ...history.slice(-20),
          { role: 'user', content: userText },
        ],
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `API error: ${res.status}`;
      return { reply: null, error: msg };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return { reply: content || null, error: null };
  } catch (err) {
    const message = err.message || 'Network error';
    const hint = message.includes('Failed to fetch') || message.includes('NetworkError')
      ? ' (Try opening this page via a local server: npx serve in this folder, then http://localhost:3000)'
      : '';
    return { reply: null, error: message + hint };
  }
}

// --- UI ---
function appendMessage(content, isUser, save = true) {
  const wrap = document.createElement('div');
  wrap.className = `message ${isUser ? 'user' : 'bot'}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const p = document.createElement('p');
  p.textContent = content;
  bubble.appendChild(p);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (save) saveToHistory(content, isUser);
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message bot';
  wrap.id = 'typingIndicator';
  wrap.innerHTML = `
    <div class="bubble">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function handleSubmit(e) {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, true);
  userInput.value = '';
  sendBtn.disabled = true;
  showTyping();

  const fallback = getBotResponse(text);
  let reply;
  let error;

  try {
    const result = await fetchOpenAI(text);
    reply = result.reply;
    error = result.error;
  } catch (err) {
    reply = null;
    error = err.message || 'Unknown error';
  }

  hideTyping();

  if (error) {
    const isQuotaOrBilling =
      /quota|billing|plan|payment|insufficient credits/i.test(error);
    const friendlyMessage = isQuotaOrBilling
      ? "Your OpenAI account has hit its quota or needs billing set up. Check your plan and payment at https://platform.openai.com/account/billing — I'll use built-in replies until then."
      : `OpenAI failed: ${error}\n\nUsing built-in reply:`;
    appendMessage(friendlyMessage, false);
    reply = fallback;
  }
  if (!reply) reply = fallback;

  appendMessage(reply, false);
  sendBtn.disabled = false;
  userInput.focus();
}

chatForm.addEventListener('submit', handleSubmit);
userInput.focus();

// Show warning when API key is set but page is opened as file://
function maybeShowFileWarning() {
  const banner = document.getElementById('fileProtocolWarning');
  if (getApiKey() && isFileProtocol()) banner.hidden = false;
  else if (banner) banner.hidden = true;
}

// Init
updateApiStatus();
loadHistory();
maybeShowFileWarning();
