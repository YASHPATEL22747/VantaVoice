const $ = id => document.getElementById(id);
const micBtn = $('micBtn'), state = $('state'), transcript = $('transcript'), response = $('response');
const statusText = $('statusText'), activity = $('activity'), handsFreeToggle = $('handsFreeToggle');
const handsFreeLabel = $('handsFreeLabel'), wakeToggle = $('wakeToggle'), voiceToggle = $('voiceToggle');
const resumeSelect = $('resumeSelect'), langSelect = $('langSelect'), historyPanel = $('historyPanel');
const settingsPanel = $('settingsPanel'), historyList = $('historyList');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const settingsKey = 'vantavoice-settings';
const storedSettings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
let recognition = null, wakeRecognition = null, isListening = false;
let handsFree = Boolean(storedSettings.handsFree), wakeEnabled = Boolean(storedSettings.wakeEnabled);
let isSpeaking = false, requestInFlight = false, shouldResume = false;
let history = JSON.parse(localStorage.getItem('vantavoice-history') || '[]');
let sessionId = localStorage.getItem('vantavoice-session') || crypto.randomUUID();
localStorage.setItem('vantavoice-session', sessionId);

function saveSettings() { localStorage.setItem(settingsKey, JSON.stringify({ handsFree, wakeEnabled, resume: resumeSelect.value, language: langSelect.value, voice: voiceToggle.checked })); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function saveHistory(question, answer) { history.unshift({ q: question, r: answer, t: new Date().toLocaleString() }); history = history.slice(0, 30); localStorage.setItem('vantavoice-history', JSON.stringify(history)); renderHistory(); }
function renderHistory() { historyList.innerHTML = history.length ? history.map(item => `<article class="history-item"><b>${escapeHtml(item.q)}</b><span>${escapeHtml(item.r)}</span><small>${escapeHtml(item.t)}</small></article>`).join('') : 'No conversations yet.'; }
function setState(next, message) { document.body.dataset.state = next; state.textContent = message || ({ idle: handsFree ? 'Hands-free is ready - speak naturally' : 'Press start once, then talk naturally', listening: wakeEnabled ? 'Listening for “Hey Vanta”...' : 'Listening... speak now', thinking: 'Vanta is thinking...', searching: 'Searching the web...', acting: 'Vanta is acting...', speaking: 'Vanta is speaking...', error: 'Something needs attention.' }[next] || next); statusText.textContent = next === 'idle' ? (handsFree ? 'Hands-free active' : 'Local layer ready') : next[0].toUpperCase() + next.slice(1); activity.textContent = next.toUpperCase(); }
function updateControls() { handsFreeToggle.setAttribute('aria-pressed', String(handsFree)); micBtn.setAttribute('aria-pressed', String(handsFree || isListening)); micBtn.classList.toggle('active', isListening || handsFree); handsFreeLabel.textContent = handsFree ? 'On - listening automatically' : 'Off - tap to activate'; saveSettings(); }
function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); isSpeaking = false; }
function speak(text) { if (!voiceToggle.checked || !('speechSynthesis' in window)) { setState('idle'); maybeResume(); return; } stopSpeech(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = langSelect.value; utterance.rate = .98; utterance.pitch = 1; utterance.onstart = () => { isSpeaking = true; setState('speaking'); }; utterance.onend = () => { isSpeaking = false; setState('idle'); maybeResume(); }; utterance.onerror = () => { isSpeaking = false; setState('idle'); maybeResume(); }; speechSynthesis.speak(utterance); }
function maybeResume() { if (shouldResume && handsFree && !requestInFlight) { shouldResume = false; window.setTimeout(() => { if (wakeEnabled) startWakeListener(); else startListening(); }, 250); } }
function startListening() { if (!recognition || isListening || isSpeaking || requestInFlight) return; try { recognition.lang = langSelect.value; recognition.start(); } catch (error) { /* browser is already starting */ } }
function stopListening() { try { recognition?.stop(); } catch (error) { /* browser is already idle */ } }
function startWakeListener() { if (!SpeechRecognition || wakeRecognition) return; wakeRecognition = new SpeechRecognition(); wakeRecognition.lang = langSelect.value; wakeRecognition.continuous = true; wakeRecognition.interimResults = true; wakeRecognition.onresult = event => { let heard = ''; for (let index = event.resultIndex; index < event.results.length; index += 1) heard += event.results[index][0].transcript; const match = heard.toLowerCase().match(/(?:hey|okay|ok)\s+vanta\b(?:[,:;.!-]?\s*(.*))?/); if (!match || requestInFlight || isSpeaking) return; const command = (match[1] || '').trim(); stopWakeListener(); if (command) answer(command); else startListening(); }; wakeRecognition.onend = () => { if (wakeEnabled && !requestInFlight && !isSpeaking) window.setTimeout(startWakeListener, 300); }; try { wakeRecognition.start(); setState('listening'); } catch (error) { setState('error', 'Wake word could not start. Check microphone permission.'); } }
function stopWakeListener() { try { wakeRecognition?.stop(); } catch (error) { /* already stopped */ } wakeRecognition = null; }
function setHandsFree(enabled) { handsFree = enabled; if (handsFree) { shouldResume = true; startListening(); setState('listening'); } else { shouldResume = false; stopListening(); if (!wakeEnabled) setState('idle'); } updateControls(); }
function setWakeMode(enabled) { wakeEnabled = enabled; if (wakeEnabled) { handsFree = true; stopListening(); startWakeListener(); } else { stopWakeListener(); setState('idle'); if (handsFree) startListening(); } updateControls(); }
async function askGemini(text) {
  requestInFlight = true; stopListening(); response.textContent = ''; setState('thinking');
  try {
    const result = await fetch('/api/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
    if (!result.ok) { const data = await result.json().catch(() => ({})); throw new Error(data.error || `AI request failed (${result.status})`); }
    const reader = result.body.getReader(), decoder = new TextDecoder(); let buffer = '', answerText = '';
    while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const chunks = buffer.split('\n\n'); buffer = chunks.pop() || ''; for (const chunk of chunks) { let event = 'message', data = ''; for (const line of chunk.split('\n')) { if (line.startsWith('event:')) event = line.slice(6).trim(); if (line.startsWith('data:')) data += line.slice(5).trim(); } if (!data) continue; let payload; try { payload = JSON.parse(data); } catch { continue; } if (event === 'state' || event === 'ready') setState(payload.state || 'thinking'); if (event === 'token') { answerText += payload.text || ''; response.textContent = answerText; } if (event === 'error') throw new Error(payload.error || 'Streaming failed'); } }
    if (!answerText) answerText = 'I could not generate a response.'; saveHistory(text, answerText); requestInFlight = false; shouldResume = handsFree; speak(answerText); if (!voiceToggle.checked) maybeResume();
  } catch (error) { requestInFlight = false; const message = error.message.includes('Failed to fetch') ? 'Backend is not running. Start the VantaVoice server.' : error.message; response.textContent = message; saveHistory(text, message); setState('error', message); if (handsFree && !wakeEnabled) window.setTimeout(startListening, 1200); }
}
function localAnswer(query) {
  if (query.includes('setting')) { openPanel(settingsPanel); return 'Settings panel opened.'; }
  if (query.includes('joke')) return 'Why do programmers prefer dark mode? Because light attracts fewer bugs.';
  if (/\b(time|samay)\b/.test(query)) return `It is ${new Intl.DateTimeFormat(langSelect.value, { hour: 'numeric', minute: '2-digit' }).format(new Date())}.`;
  if (/\b(date|today|tarikh)\b/.test(query)) return `Today is ${new Intl.DateTimeFormat(langSelect.value, { dateStyle: 'full' }).format(new Date())}.`;
  const calculation = query.match(/(?:calculate|what is)\s+([0-9+\-*/%.()\s]+)\??$/);
  if (calculation && /^[0-9+\-*/%.()\s]+$/.test(calculation[1])) {
    try { const result = Function(`"use strict"; return (${calculation[1]})`)(); if (Number.isFinite(result)) return `The answer is ${result}.`; } catch { return 'That calculation is not valid.'; }
  }
  if (/^(hello|hi|hey)\b/.test(query)) return 'Hey! VantaVoice is listening.';
  return null;
}
async function answer(text) { const query = text.toLowerCase().trim(); transcript.textContent = text; const local = localAnswer(query); if (local) { response.textContent = local; saveHistory(text, local); speak(local); return; } await askGemini(text); }
function openPanel(panel) { panel.hidden = false; panel.classList.add('show'); }
function closePanel(panel) { panel.classList.remove('show'); window.setTimeout(() => { panel.hidden = true; }, 180); }

if (SpeechRecognition) {
  recognition = new SpeechRecognition(); recognition.lang = storedSettings.language || 'en-IN'; recognition.interimResults = true; recognition.continuous = false;
  recognition.onstart = () => { isListening = true; updateControls(); setState('listening'); };
  recognition.onend = () => { isListening = false; updateControls(); if (handsFree && !requestInFlight && !isSpeaking && shouldResume) window.setTimeout(() => { if (wakeEnabled) startWakeListener(); else startListening(); }, 250); };
  recognition.onerror = event => { isListening = false; updateControls(); if (event.error === 'not-allowed') { handsFree = false; updateControls(); setState('error', 'Microphone permission was blocked. Allow it in the browser.'); } else if (event.error !== 'aborted') setState('error', 'Voice input failed. Tap start to try again.'); };
  recognition.onresult = event => { let finalText = '', interim = ''; for (let index = event.resultIndex; index < event.results.length; index += 1) event.results[index].isFinal ? finalText += event.results[index][0].transcript : interim += event.results[index][0].transcript; transcript.textContent = finalText || interim; if (finalText.trim()) { shouldResume = handsFree; answer(finalText.trim()); } };
} else { micBtn.disabled = true; handsFreeToggle.disabled = true; setState('error', 'Speech recognition is not supported in this browser.'); }

handsFreeToggle.onclick = () => setHandsFree(!handsFree); micBtn.onclick = () => handsFree ? setHandsFree(false) : setHandsFree(true); wakeToggle.checked = wakeEnabled; wakeToggle.addEventListener('change', event => setWakeMode(event.target.checked)); voiceToggle.checked = storedSettings.voice !== false; resumeSelect.value = storedSettings.resume || 'on'; langSelect.value = storedSettings.language || 'en-IN';
voiceToggle.addEventListener('change', saveSettings); resumeSelect.addEventListener('change', () => { saveSettings(); shouldResume = resumeSelect.value === 'on'; }); langSelect.addEventListener('change', () => { if (recognition) recognition.lang = langSelect.value; if (wakeRecognition) wakeRecognition.lang = langSelect.value; saveSettings(); });
$('historyBtn').onclick = () => openPanel(historyPanel); $('settingsBtn').onclick = () => openPanel(settingsPanel); $('clearBtn').onclick = () => { transcript.textContent = 'Your words will appear here...'; response.textContent = 'Vanta is ready when you are.'; setState('idle'); }; document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => closePanel($(button.dataset.close))); document.querySelectorAll('[data-command]').forEach(button => button.onclick = () => answer(button.dataset.command));
document.addEventListener('keydown', event => { if (event.key === ' ' && event.target === document.body) { event.preventDefault(); handsFree ? setHandsFree(false) : setHandsFree(true); } if (event.key === 'Escape') { stopSpeech(); setHandsFree(false); } });
renderHistory(); updateControls();
function bootHandsFree() {
  if (!SpeechRecognition || storedSettings.handsFree === false) return;
  handsFree = true;
  shouldResume = true;
  updateControls();
  setState('listening', 'Starting hands-free mode...');
  window.setTimeout(startListening, 700);
}
window.addEventListener('load', () => window.setTimeout(bootHandsFree, 500));
fetch('/api/health').then(result => result.json()).then(data => { statusText.textContent = data.aiConfigured ? 'AI connected' : 'Backend ready - add Gemini key'; }).catch(() => { statusText.textContent = 'Local mode'; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));