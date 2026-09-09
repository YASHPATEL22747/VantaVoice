# VantaVoice

**VantaVoice** is a privacy-first, hackathon-ready voice AI workspace: browser speech input + secure Groq backend + server-side tool calling + local conversation history + PWA support.

## Architecture

```text
Browser / PWA
   │
   ├─ Web Speech API → transcript
   ├─ local history/settings
   └─ POST /api/chat
             │
        Node + Express
             │
      Groq OpenAI-compatible API
             │
               Groq
             │
       Tool decision
             │
   ┌─────────┼──────────┐
   │         │          │
 time      date     calculator
   └─────────┴──────────┘
             │
        final response
```

Groq function calling follows the OpenAI-compatible chat completions pattern: the model proposes a function call, the application executes it, and the result is sent back for the final response.

## Features

- 🎙️ Browser-native voice input
- 🔁 Hands-free turn-taking: listen, answer, speak, and resume automatically
- 🗣️ Optional “Hey Vanta” wake-word mode
- 🤖 Groq-powered natural-language responses
- 🧰 Secure server-side function/tool calling
- ⏱️ Current time and date tools
- 🧮 Safe basic calculator tool
- 🔊 Text-to-speech replies
- 🧠 Local conversation history
- ⚙️ Language and voice settings
- 📱 Responsive dark/neon UI
- 📦 PWA + offline shell
- 🔐 Groq API key stays server-side

## Run locally

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Create the environment file

Copy `server/.env.example` to `server/.env` and set your Groq API key there.

**Never commit `server/.env` or paste a real API key into GitHub/source code.**

### 3. Start VantaVoice

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The backend exposes `/api/health` and `/api/chat`. The frontend automatically uses Groq for requests that need AI.

## Important

Opening `index.html` directly still gives you the local voice UI, but AI mode requires the Node server because the API key must remain private.

## Security design

- The `GROQ_API_KEY` is read only on the server.
- `.env` is ignored by Git.
- Frontend never receives the API key.
- Request bodies are size-limited.
- Tools are allowlisted on the server.
- Calculator input is restricted to basic arithmetic characters.
- Tool execution is performed by application code, not by the model itself.

## Roadmap

1. More allowlisted productivity tools
2. Optional encrypted cloud conversation sync
3. Accessibility and keyboard-first controls
4. Deployment-ready backend configuration

## Hands-free demo

1. Start the server and open `http://localhost:3000`.
2. VantaVoice attempts to start hands-free listening automatically.
3. If the browser asks for microphone permission, allow it once. Some browsers require the **Hands-free session** button for this first permission gesture.
4. Talk naturally. VantaVoice listens, answers aloud, and resumes listening after the reply.
5. For wake-word mode, enable **Wake word** and say “Hey Vanta” before each command.

Browser speech recognition is provided by Chrome/Edge Web Speech APIs. A microphone permission gesture is required by the browser; after that, the conversation loop is automatic. Voice history remains local to the browser.

## Groq setup

In `server/.env`:

```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Groq supports the local function tools for time, date, calculator, memory, and notes. Web search is intentionally disabled in Groq mode; local tools remain fully server-controlled.

## License

MIT
