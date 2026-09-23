# IntervueAI Frontend

React + Vite frontend for the supplied Express backend.

## Run

```bash
npm install
npm run dev
```

By default the frontend calls:

`http://localhost:5000`

To use another backend URL, create `.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Backend endpoints used

- `POST /start-interview` — multipart form: `file`, `jobDescription`
- `POST /interview/:id/question`
- `POST /interview/:id/answer` — JSON: `{ "answer": "..." }`

The UI includes:
- Resume PDF drag/drop
- Job description editor
- Candidate profile + generated interview plan
- Adaptive interview screen
- Question timer
- Browser text-to-speech for questions
- Answer submission + per-answer feedback
- Overall evaluation dashboard
- Responsive mobile/tablet/desktop layout
