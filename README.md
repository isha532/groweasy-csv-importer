# GrowEasy CSV Importer

An AI-powered CSV importer that ingests leads from **any** CSV layout — Facebook
Lead Ads exports, Google Ads exports, sales-team spreadsheets, other CRM
exports, whatever — and intelligently maps them into GrowEasy's CRM schema.

Built for the GrowEasy Software Developer (Intern / Full-Time) assignment.

**Position applied for:** _Intern / Full-Time_ — set this to whichever you're applying for before submitting.

## Live demo

- Frontend: _add your deployed URL here_
- Backend: _add your deployed URL here_

## How it works

```
┌─────────────┐      1. upload CSV       ┌──────────────────┐
│   Browser    │ ───────────────────────▶ │  POST /api/csv/  │
│  (Next.js)   │                          │      preview     │
│              │ ◀─────────────────────── │  (parses only,   │
│              │   headers + rows          │   no AI)         │
└──────────────┘                          └──────────────────┘
        │
        │ 2. user reviews preview, clicks "Confirm import"
        ▼
┌──────────────┐   3. POST /api/csv/import  ┌──────────────────┐
│   Browser    │ ──────────────────────────▶│  batches rows,   │
│              │  ◀── 202 { jobId }          │  calls AI model  │
│              │                             │  per batch       │
│              │   4. poll GET               └──────────────────┘
│              │   /api/csv/import/:jobId              │
│              │  ◀── progress + final result           │
└──────────────┘                                        ▼
                                              ┌──────────────────┐
                                              │ success[] +      │
                                              │ skipped[] + totals│
                                              └──────────────────┘
```

- **Step 1–2 (frontend):** the file is uploaded to the backend, which parses
  it and returns headers/rows for preview. **No AI runs at this point** —
  this satisfies the "no AI processing before confirm" requirement while
  still keeping CSV parsing on the backend, per the spec.
- **Step 3 (confirm):** the frontend re-sends the full parsed row set to
  `/api/csv/import`. The backend splits rows into batches, sends each batch
  to the configured AI provider with a structured-output tool call, validates
  the result, and retries failed batches with exponential backoff.
- **Step 4 (result):** the frontend polls a lightweight job-status endpoint
  and renders imported vs. skipped records with totals, plus a CSV export of
  the imported records.

## AI prompt engineering approach

The extraction prompt (`backend/src/services/extractionSchema.ts`) encodes
every rule from the assignment directly as model instructions:

- Column names are never assumed — the model is told the input comes from an
  unknown source and must infer meaning from headers + sample values.
- `crm_status` and `data_source` are constrained to the exact allowed enum
  values via **structured output** (OpenAI function calling / Anthropic tool
  use with a JSON schema), not just prompt text — so the model literally
  cannot return an invalid value.
- Multiple emails/phones: first one wins, the rest are folded into
  `crm_note` with a clear label.
- Every row is referenced by `row_index` in the response so results can be
  reconciled back to the original row even if the model reorders them.
- The backend never trusts the model's skip decision alone — after
  extraction, any record without a non-empty `email` or
  `mobile_without_country_code` is force-skipped, so the "must have email or
  mobile" rule is enforced twice (defense in depth).

## Project structure

```
backend/    Node.js + Express + TypeScript API
frontend/   Next.js + TypeScript + Tailwind UI
sample-data/  Example CSVs (clean + intentionally messy) for testing
```

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: AI_PROVIDER=gemini and GEMINI_API_KEY (get a free key at
# https://aistudio.google.com/apikey — no credit card needed)
npm install
npm run dev        # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev        # http://localhost:3000
```

Open `http://localhost:3000`, upload a CSV from `sample-data/`, preview it,
confirm, and watch the AI-extracted result.

### 3. Docker (optional)

```bash
cp backend/.env.example backend/.env   # fill in your AI key first
docker compose up --build
```

### 4. Tests

```bash
cd backend
npm test
```

## Environment variables

**backend/.env**

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `gemini` (free tier), `openai`, or `anthropic` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | required if using Gemini — **has a genuine free tier, no card needed** |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | required if using OpenAI |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | required if using Anthropic |
| `AI_BATCH_SIZE` | rows sent to the AI per request (default 15) |
| `AI_MAX_CONCURRENCY` | batches processed in parallel (default 3) |
| `AI_MAX_RETRIES` | retries per failed batch (default 2) |
| `CORS_ORIGIN` | frontend origin allowed to call the API |

**frontend/.env.local**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | backend base URL |

## Design decisions worth calling out

- **Stateless backend, job-polling for progress.** Rather than holding a
  websocket/SSE connection open for the (potentially slow) AI extraction
  step, the import endpoint returns a `jobId` immediately and the frontend
  polls for progress. Simpler to deploy anywhere (Vercel, Railway, Render)
  without sticky sessions.
- **Bounded concurrency batch processing.** Batches run with a concurrency
  cap (default 3 in flight) instead of either fully serial (slow) or fully
  parallel (risks provider rate limits).
- **Two-layer validation.** Zod schema validates the AI's structured output
  before it's trusted, and a business-rule check re-verifies the
  email/mobile requirement independently of what the model claims.
- **Swappable AI provider.** `AIProvider` is a small interface; OpenAI and
  Anthropic implementations are ~50 lines each and share the same prompt and
  schema, so adding Gemini is a similar-sized addition.

## Bonus features implemented

- Drag & drop upload
- Progress indicator during AI processing (batch counter + progress bar)
- Retry mechanism for failed batches (exponential backoff, then graceful
  per-row skip with reason instead of failing the whole import)
- Dark mode
- Unit tests (CSV parsing + batch extraction, incl. an out-of-order /
  provider-failure scenario)
- Docker setup for both services
- CSV export of imported records from the results screen
