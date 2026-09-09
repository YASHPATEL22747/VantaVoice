# VantaVoice

**VantaVoice** is a privacy-first, hackathon-ready voice AI workspace: browser speech input + secure Gemini backend + server-side tool calling + local conversation history + PWA support.

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
      @google/genai SDK
             │
          Gemini
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

Gemini function calling follows Google's current pattern: the model proposes a function call, the application executes the function, and the result is sent back to the model for the final response. citeturn0search1turn0search3

## Features

- 🎙️ Browser-native voice input
- 🔁 Hands-free turn-taking: listen, answer, speak, and resume automatically
- 🗣️ Optional “Hey Vanta” wake-word mode
- 🤖 Gemini-powered natural-language responses
- 🧰 Secure server-side function/tool calling
- ⏱️ Current time and date tools
- 🧮 Safe basic calculator tool
- 🔊 Text-to-speech replies
- 🧠 Local conversation history
- ⚙️ Language and voice settings
- 📱 Responsive dark/neon UI
- 📦 PWA + offline shell
- 🔐 Gemini API key stays server-side

## Run locally

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Create the environment file

Copy `server/.env.example` to `server/.env` and set your Gemini API key there.

**Never commit `server/.env` or paste a real API key into GitHub/source code.**

### 3. Start VantaVoice

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The backend exposes `/api/health` and `/api/chat`. The frontend automatically uses `/api/chat` for requests that need Gemini.

## Important

Opening `index.html` directly still gives you the local voice UI, but Gemini mode requires the Node server because the API key must remain private.

## Security design

- API key is read from `GEMINI_API_KEY` on the server.
- `.env` is ignored by Git.
- Frontend never receives the API key.
- Request bodies are size-limited.
- Tools are allowlisted on the server.
- Calculator input is restricted to basic arithmetic characters.
- Tool execution is performed by application code, not by Gemini itself.

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

## License

MIT
