# IntervueAI

IntervueAI is an AI-assisted technical interview backend with a React/Vite frontend scaffold. The backend accepts a candidate's resume and a job description, asks an Ollama-hosted model to build a candidate profile and interview plan, generates questions, evaluates answers, and adjusts question difficulty based on performance. It also exposes a Groq text-to-speech endpoint.

## Project structure

- `backend/` — Express API, PDF resume parsing, interview state, AI prompts, and speech generation.
- `frontend/` — React 19 application built with Vite. The current `App.jsx` is the default Vite starter screen; the interview workflow is not yet wired into this UI.

## Requirements

- Node.js and npm
- An Ollama Cloud API key (`OLLAMA_API_KEY`) for profile, planning, question, and answer-evaluation requests
- A Groq API key (`GROQ_API_KEY`) for the speech endpoint

## Setup

Install dependencies in each app directory:

```bash
cd backend
npm install
cd ../frontend
npm install
```

Create `backend/.env` with the required credentials:

```env
OLLAMA_API_KEY=your_ollama_api_key
GROQ_API_KEY=your_groq_api_key
# Optional; defaults to "troy"
GROQ_TTS_VOICE=troy
```

Start the backend and frontend in separate terminals:

```bash
cd backend
node index.js
```

```bash
cd frontend
npm run dev
```

The API listens on `http://localhost:5000`. Vite prints the frontend URL when it starts. The backend currently enables CORS for all origins.

## API

### `POST /start-interview`

Start an interview using `multipart/form-data` fields:

- `file` — PDF resume (up to 2 MB)
- `jobDescription` — non-empty job description text

Returns an `interviewId`, extracted candidate profile, and generated interview plan. Interview state is kept in server memory, so it is lost when the backend restarts.

### `POST /interview/:id/question`

Generate and return the first question, or return the current question if one has already been generated. The response includes the question number, total question count, topic, and difficulty.

### `POST /interview/:id/answer`

Submit JSON containing a non-empty answer:

```json
{ "answer": "Your response here" }
```

Returns answer feedback and, while the interview continues, the next question. On completion, it also returns the overall evaluation.

### `POST /voice/speak`

Submit JSON with text of up to 200 characters and an optional voice:

```json
{ "text": "Tell me about a project you worked on.", "voice": "troy" }
```

Returns generated WAV audio. The voice defaults to `GROQ_TTS_VOICE`, then `troy`.

## Notes

- The backend calls `https://ollama.com/api/chat` with model `gemma4:31b-cloud`.
- Interview profiles, plans, questions, answers, and evaluations are held in an in-memory map; there is no persistent database configured.
- `frontend/README.md` describes a planned interview experience, but the current frontend source is still the Vite starter app.
