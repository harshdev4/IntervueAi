# IntervueAI

IntervueAI is an AI-powered technical interview preparation platform that conducts personalized, adaptive mock interviews using a candidate's resume and job description.

The system analyzes the candidate's profile, creates an interview plan, generates technical questions dynamically, evaluates spoken answers, adapts question difficulty based on performance, and provides an overall evaluation at the end of the interview.

The application also includes voice-based interaction using Groq TTS for interviewer questions and browser Speech-to-Text (STT) for candidate answers.

## Features

- Resume-based candidate profiling
- Job-description-aware interview planning
- Adaptive technical interview
- Dynamic question generation using Ollama `gemma4:31b-cloud`
- Exactly 10 questions per interview
- Adaptive question difficulty
- One-question-ahead background generation
- Candidate answer evaluation
- STT-aware answer evaluation
- Overall interview evaluation
- Groq Orpheus TTS for interviewer questions
- Browser Speech Recognition for candidate answers
- Live speech transcript preview
- Resume PDF parsing
- React/Vite interactive frontend
- Node.js/Express backend
- In-memory interview state
- UiPath integration for automation workflows

## Interview Workflow

The interview follows this general flow:

```text
Resume + Job Description
          ↓
   Candidate Profiler
          ↓
    Interview Planner
          ↓
  Interview Plan (10 questions)
          ↓
    Interviewer Agent
          ↓
   Generate Question
          ↓
     Candidate Answer
          ↓
    Speech-to-Text
          ↓
    Answer Evaluator
          ↓
 Adapt Difficulty / Topic
          ↓
   Generate Next Question
          ↓
       ... × 10
          ↓
 Overall Interview Evaluation
````

### Adaptive Interview

The interviewer does not generate all question text in advance.

The planner defines the interview structure and topics, while the interviewer generates questions dynamically based on:

* Candidate profile
* Job description
* Interview plan
* Current topic
* Current difficulty
* Previously asked questions
* Candidate's previous answers
* Previous evaluation results
* Candidate strengths and weak areas

The interview contains a maximum of **10 questions**.

### Question Buffering

To reduce waiting time between questions, the system generates one question ahead in the background.

For example:

```text
Current question: Q1
Buffered question: Q2

Candidate answers Q1
        ↓
Q2 is immediately available
        ↓
Background generation starts for Q3
```

The buffer never generates a question beyond the 10-question interview limit.

## Voice Interaction

### Interviewer TTS

Interviewer questions are converted to speech using Groq's Orpheus TTS model.

The TTS generation is integrated directly into the question-generation workflow rather than exposed through a separate `/voice/speak` endpoint.

The default voice is:

```env
GROQ_TTS_VOICE=troy
```

### Candidate STT

Candidate answers can be given using the browser's Speech Recognition API.

The frontend:

1. Starts microphone recognition.
2. Displays the live transcript.
3. Accumulates finalized speech.
4. Handles temporary recognition interruptions.
5. Automatically attempts to reconnect when appropriate.
6. Allows the candidate to review/edit the transcript.
7. Sends the resulting text to the backend for evaluation.

Because the answer is generated using STT, the evaluator is instructed to distinguish transcription errors from genuine technical mistakes.

For example:

```text
STT: "I used sequel database"

Interpretation:
"I used SQL database"
```

An obvious transcription error should not reduce the candidate's score when the intended technical meaning is clear.

However, genuine technical misunderstandings are still evaluated normally.

## Project Structure

```text
IntervueAI/
│
├── backend/
│   ├── index.js
│   ├── interviewStore.js
│   ├── package.json
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── ...
│   ├── package.json
│   └── ...
│
└── README.md
```

### Backend

The backend contains:

* Express API
* Resume PDF parsing
* Candidate profiling
* Interview planning
* Dynamic question generation
* Answer evaluation
* Adaptive difficulty logic
* Question buffering
* Overall interview evaluation
* Groq TTS generation
* Interview state management

### Frontend

The frontend is a React 19 application built with Vite.

It provides:

* Resume upload
* Job description input
* Interview setup
* Interview question display
* Question audio playback
* Microphone controls
* Live STT transcript
* Answer editing
* Answer submission
* Interview progress
* Evaluation/results display

## Requirements

* Node.js
* npm
* Ollama Cloud API key
* Groq API key
* Modern browser with Speech Recognition support for voice input

## Environment Variables

Create `backend/.env`:

```env
OLLAMA_API_KEY=your_ollama_api_key

GROQ_API_KEY=your_groq_api_key

# Optional
GROQ_TTS_VOICE=troy
```

## Installation

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Running the Application

Start the backend:

```bash
cd backend
node index.js
```

The backend runs on:

```text
http://localhost:5000
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Vite will display the frontend URL in the terminal.

## API

### `POST /start-interview`

Starts a new interview.

Uses:

* Candidate resume PDF
* Job description

Request type:

```text
multipart/form-data
```

Fields:

```text
file
jobDescription
```

The resume is parsed and used to create:

1. Candidate profile
2. Interview plan
3. Interview state

The interview is configured for **10 questions**.

Interview state is currently stored in server memory and is lost when the backend restarts.

---

### `POST /interview/:id/question`

Generates or retrieves the current interview question.

The response contains information such as:

```json
{
  "questionNumber": 1,
  "totalQuestions": 10,
  "question": "Your generated question",
  "topic": "React",
  "difficulty": "medium",
  "audio": "..."
}
```

Question audio is generated using Groq TTS.

The endpoint also supports the one-question-ahead buffering mechanism.

---

### `POST /interview/:id/answer`

Submits the candidate's answer.

Request:

```json
{
  "answer": "Your response here"
}
```

The answer is evaluated using the LLM.

The evaluator considers:

* Correctness
* Relevance
* Completeness
* Technical depth
* Clarity
* Concepts covered
* Concepts missing

The evaluator is also instructed to account for Speech-to-Text transcription errors.

After evaluation, the interview difficulty can be adjusted based on the candidate's performance.

If the interview has not reached question 10, the next question is returned.

After question 10, the system generates the overall interview evaluation.

---

## Interview Evaluation

Each answer produces a structured evaluation:

```json
{
  "score": 8,
  "correctness": "mostly_correct",
  "strengths": [
    "Good understanding of React hooks"
  ],
  "weaknesses": [
    "Could explain the performance implications in more detail"
  ],
  "feedback": "Good explanation with a minor omission.",
  "concepts_covered": [
    "useMemo",
    "memoization"
  ],
  "concepts_missing": [
    "dependency behavior"
  ],
  "recommended_difficulty": "hard"
}
```

At the end of the 10-question interview, the system generates an overall evaluation based on the candidate's complete interview performance.

## AI Models

### LLM

The application uses:

```text
gemma4:31b-cloud
```

through the Ollama Cloud API.

It is used for:

* Candidate profiling
* Interview planning
* Question generation
* Answer evaluation
* Overall interview evaluation

### Text-to-Speech

The application uses Groq's Orpheus TTS model:

```text
canopylabs/orpheus-v1-english
```

The default voice is:

```text
troy
```

### Speech-to-Text

Candidate speech is converted to text using the browser's native Speech Recognition API:

```js
window.SpeechRecognition ||
window.webkitSpeechRecognition
```

## Data Storage

The current version does not use a database.

Interview data is stored in an in-memory server-side store.

This includes:

* Candidate profile
* Job description
* Interview plan
* Questions
* Candidate answers
* Answer evaluations
* Question buffer
* Current difficulty
* Overall evaluation

All interview data is lost when the backend process is restarted.

## Current Limitations

* Interview state is not persisted in a database.
* Browser Speech Recognition support varies by browser.
* STT accuracy depends on microphone quality, browser support, accent, background noise, and speech clarity.
* Groq/Ollama API availability and rate limits can affect response generation.
* TTS generation requires a valid Groq API key.
* Voice input requires browser microphone permission.
* The current application is intended as an interview-preparation/demo system rather than a production hiring system.

## Future Improvements

Potential future improvements include:

* MongoDB/PostgreSQL persistence
* User authentication
* Interview history
* Candidate performance analytics
* More advanced adaptive topic selection
* Improved STT using dedicated transcription models
* True streaming TTS
* Multiple interviewer voices
* Interview session recovery
* Detailed performance dashboards
* UiPath-based workflow automation
* Deployment to a cloud platform

````