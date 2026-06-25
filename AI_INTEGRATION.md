# CampusFlow AI Integration Layer

This update modifies only the existing Node.js/Express AI layer. It keeps the implementation focused on the two requested AI modules and sends one standardized n8n webhook payload shape from both modules.

## Included modules only

1. **AI Study Buddy**
   - Endpoint: `POST /api/ai/flashcards`
   - Input: student details, subject, deadline, and pasted lecture notes.
   - Output: frontend-ready flashcards and MCQ quiz JSON.
   - n8n: sends the common payload for WhatsApp quiz notification and Calendar study session block.

2. **Smart Deadline Manager**
   - Endpoint: `POST /api/ai/schedule`
   - Input: student details, subject, task title, deadline, and topics.
   - Output: frontend-ready study schedule JSON.
   - n8n: sends the common payload for 24 hr / 1 hr WhatsApp reminders and Calendar deadline event.


## Backend database compatibility

The AI routes accept backend/database naming conventions and normalize them before AI generation or n8n dispatch:

- `name` is accepted as an alias for `studentName`.
- `title` is accepted as an alias for `taskTitle`.
- `reminderTime` is converted to `reminderOffsetHours` by comparing it with `deadline`.
- `reminderOffsetHours` still defaults to `24` when neither `reminderOffsetHours` nor a valid `reminderTime` is provided.

See `COMPATIBILITY_REPORT.md` for the full verification report.

## Common n8n webhook payload

Both endpoints send this exact structure to n8n through `services/n8nService.js`:

```json
{
  "studentName": "Rahul",
  "phone": "+919999999999",
  "subject": "DBMS",
  "taskTitle": "DBMS Assignment",
  "deadline": "2026-07-10T18:00:00Z",
  "reminderOffsetHours": 24
}
```

`reminderOffsetHours` defaults to `24` when omitted.

## Files

- `routes/ai.js` — Express router exposing only `/flashcards` and `/schedule`.
- `services/aiService.js` — Groq API calls, prompts, retry handling, parsing, and validation.
- `services/n8nService.js` — one reusable `sendWebhook(payload)` function for both modules.
- `utils/parser.js` — malformed AI JSON cleanup and safe parsing helpers.
- `utils/validators.js` — common field, ISO deadline, AI response, and webhook payload validation.
- `.env.example` — Groq and single n8n webhook URL placeholders.
- `package.json` — Node dependencies only.

## Install dependencies

```bash
npm install
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```env
GROQ_API_KEY=gsk_your_real_groq_key_here
GROQ_MODEL=llama3-8b-8192
N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/campusflow-ai
```

Do not commit the real `.env` file. If a real `GROQ_API_KEY` is shared in chat or committed by mistake, rotate it immediately in Groq and replace it locally only.

## Express integration

Mount the router in the existing Express app:

```js
const aiRoutes = require('./routes/ai');

app.use(express.json());
app.use('/api/ai', aiRoutes);
```

## Endpoints

### `POST /api/ai/flashcards`

Request:

```json
{
  "studentName": "Rahul",
  "phone": "+919999999999",
  "subject": "Operating Systems",
  "taskTitle": "OS Quiz Ready",
  "deadline": "2026-07-10T18:00:00Z",
  "notes": "CPU scheduling and deadlocks..."
}
```

Response:

```json
{
  "success": true,
  "flashcards": [
    {
      "question": "What is CPU scheduling?",
      "answer": "The process of selecting which process runs next on the CPU."
    }
  ],
  "mcqs": [
    {
      "question": "Which concept can cause processes to wait forever?",
      "options": ["Deadlock", "Compilation", "Indexing", "Rendering"],
      "answer": "Deadlock"
    }
  ]
}
```

### `POST /api/ai/schedule`

Request:

```json
{
  "studentName": "Rahul",
  "phone": "+919999999999",
  "subject": "DBMS",
  "taskTitle": "DBMS Assignment",
  "deadline": "2026-07-10T18:00:00Z",
  "topics": ["SQL", "Normalization", "Transactions"]
}
```

Response:

```json
{
  "success": true,
  "schedule": {
    "Day 1": "Study SQL basics",
    "Day 2": "Practice normalization"
  }
}
```

## Removed from this scope

- Notice summarizer route and AI logic.
- Separate n8n webhook functions and payload shapes.
- Python FastAPI implementation files.
- Frontend, authentication, database schemas, Supabase logic, Twilio configuration, Google Calendar configuration, and n8n workflow creation.
