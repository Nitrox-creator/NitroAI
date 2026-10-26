
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

// Historique
function loadHistory() {
  try {
    const messages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const welcome = chatMessages.querySelector('[data-welcome]');
    if (messages.length && welcome) welcome.remove();
    messages.forEach(({ content, isUser }) => {
      appendMessage(content, isUser, false);
    });
  } catch (error) {
    console.warn('Unable to load history:', error);
  }
}

function saveToHistory() {
  const items = [];
  chatMessages.querySelectorAll('.message').forEach(msg => {
    if (msg.id === 'typingIndicator') return;
    const p = msg.querySelector('.bubble p');
    if (p && !msg.hasAttribute('data-welcome')) {
      items.push({
        content: p.textContent,
        isUser: msg.classList.contains('user')
      });
    }
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('Unable to save history:', error);
  }
}

function clearHistory() {
  if (!confirm('Clear all chat history?')) return;
  localStorage.removeItem(STORAGE_KEY);
  chatMessages.innerHTML = `
    <div class="message bot" data-welcome>
      <div class="bubble"><p>Chat cleared. Hi again! How can I help?</p></div>
    </div>`;
}

clearHistoryBtn.addEventListener('click', clearHistory);

// Clé API
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function updateApiStatus() {
  apiStatus.textContent = getApiKey() ? 'AI (OpenAI)' : 'Built-in mode';
}

// Paramètres
settingsBtn.addEventListener('click', () => {
  apiKeyInput.value = getApiKey();
  settingsModal.hidden = false;
  apiKeyInput.focus();
});

closeSettingsBtn.addEventListener('click', () => {
  settingsModal.hidden = true;
});

saveSettingsBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
  }
  settingsModal.hidden = true;
  updateApiStatus();
});

// Appel à OpenAI
async function fetchOpenAI(userText) {
  const key = getApiKey();
  if (!key) return { reply: null, error: null };

  const messages = [];
  chatMessages.querySelectorAll('.message').forEach(msg => {
    if (msg.id === 'typingIndicator') return;
    const p = msg.querySelector('.bubble p');
    if (!p || msg.hasAttribute('data-welcome')) return;

    messages.push({
      role: msg.classList.contains('user') ? 'user' : 'assistant',
      content: p.textContent
    });
  });

  // Le dernier message utilisateur est déjà dans l'historique de l'interface.
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are NitroAI, a helpful and friendly assistant. Reply in the language used by the user. Keep answers clear and conversational.'
          },
          ...messages.slice(-21)
        ],
        max_tokens: 500
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        reply: null,
        error: data.error?.message || `HTTP ${res.status}`
      };
    }

    return {
      reply: data.choices?.[0]?.message?.content?.trim() || null,
      error: null
    };
  } catch (error) {
    return {
      reply: null,
      error: error.message || 'Network error'
    };
  }
}

// Réponses de secours hors API
function getBotResponse(text) {
  const t = text.toLowerCase();

  if (/^(hi|hello|hey|bonjour|salut|coucou)\b/.test(t)) {
    return 'Salut ! 👋 Je suis NitroAI. Comment puis-je t’aider ?';
  }
  if (t.includes('ton nom') || t.includes('who are you')) {
    return 'Je suis NitroAI, ton assistant virtuel !';
  }
  if (t.includes('heure')) {
    return 'Je ne peux pas vérifier l’heure exacte en mode intégré.';
  }
  return 'Je suis en mode réponses intégrées. Ajoute une clé API OpenAI dans les paramètres pour obtenir des réponses générées par l’IA.';
}

// Interface
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

  if (save) saveToHistory();
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message bot';
  wrap.id = 'typingIndicator';
  wrap.innerHTML = '<div class="bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  document.getElementById('typingIndicator')?.remove();
}

async function handleSubmit(e) {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage(text, true);
  userInput.value = '';
  sendBtn.disabled = true;
  showTyping();

  let reply;
  try {
    const result = await fetchOpenAI(text);
    if (result.error) {
      appendMessage(`OpenAI failed: ${result.error}`, false);
    }
    reply = result.reply || getBotResponse(text);
  } catch (error) {
    reply = getBotResponse(text);
    appendMessage(`OpenAI failed: ${error.message || 'Unknown error'}`, false);
  }

  hideTyping();
  appendMessage(reply, false);
  sendBtn.disabled = false;
  userInput.focus();
}

chatForm.addEventListener('submit', handleSubmit);

updateApiStatus();
loadHistory();
userInput.focus();
