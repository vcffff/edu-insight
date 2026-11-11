# EduInsight AI

### From assessment results to a focused teaching plan.

EduInsight helps educators answer three questions: **Where are students struggling? What should we prioritize? How can we use the teaching hours we already have?**

Upload an anonymized CSV, explore the results, enter current teaching hours, and request an evidence-led action plan. The interface is in Russian; uploaded topic names and textbook titles keep their original language.

**[Judge walkthrough](#a-three-minute-judge-walkthrough) · [Run locally](#run-locally) · [Demo CSV](docs/samples/single-student.csv) · [Backend API docs](https://edu-insight-bciy.onrender.com/docs)**

---

## The problem

Assessment spreadsheets contain useful signals, but moving from a table of scores to a teaching decision takes time. An overall average can hide a weak topic, and a chart alone does not explain how to respond within a limited timetable.

## Our approach

```text
Assessment CSV
      ↓
Backend validation and analytics
      ↓
Overview → Topic-level diagnosis → Teaching-hour optimization
                                         ↓
                              Recommendations and export
```
<img width="1983" height="793" alt="image" src="https://github.com/user-attachments/assets/8d82e14b-8782-4ea8-9c86-345f95a35ce8" />

| Step | What the educator sees |
| --- | --- |
| **Upload** | A server-backed dataset library and charts beneath the uploader. |
| **Understand** | Student count, average score, critical topics, trends and score distribution. The active filename stays visible in Overview. |
| **Investigate** | A separate topic chart, searchable and sortable results, and an inspector for the selected topic. |
| **Plan** | Current hours entered by the educator and a backend-calculated allocation, with a before/after chart and CSV export. |
| **Act** | A structured report with findings, evidence, topic interpretations, recommendations, limitations and JSON export. |

### What makes the experience useful

- **A connected workflow:** all live screens use the same selected backend dataset.
- **Actionable planning:** teaching hours are explicit inputs, not guessed from assessment scores.
- **Visible evidence and limitations:** unavailable data stays unavailable; warnings are not hidden or replaced with invented metrics.
- **A dependable presentation option:** an explicit offline demo is available, clearly separated from Live API data.
- **A focused interface:** no accounts, profile setup or notification clutter; responsive navigation and restrained, reduced-motion-aware entrance effects.

## A three-minute judge walkthrough

Start the frontend locally using the instructions below. Keep **Live API** selected for the real upload flow.

1. **0:00 — Upload:** open **Данные** (`/datasets`) and upload [`single-student.csv`](docs/samples/single-student.csv). Charts appear below the uploader when the backend returns analytics.
2. **0:30 — Establish context:** open **Обзор** (`/`). Show the active filename, student count, average, and result trend.
3. **1:00 — Diagnose:** open **Аналитика тем** (`/topic-analytics`). Compare the topics, search for Algebra, and inspect its mastery and sample size.
4. **1:45 — Plan:** open **Оптимизатор программы** (`/curriculum-optimizer`). Enter current hours, for example Algebra **8**, Geometry **6**, Statistics **4**. Click **Оптимизировать** and inspect the backend's result. Export the allocation if useful.
5. **2:30 — Explain:** open **Рекомендации** (`/recommendations`). Use **Пересчитать отчёт** to include the latest optimization. Show the evidence, limitations and report export.

> **If the backend is unavailable:** select **Демоданные** in the header for the built-in offline dataset. The demo illustrates the interface with browser-local calculations; it is not a successful live upload or a backend-generated report. The sample CSV above is intended for **Live API**; the offline importer has its own downloadable template.

### What to expect from the sample

The sample is deliberately small: one synthetic student, three topics, one textbook and three dated assessments.

| Topic | Raw score | Normalized score |
| --- | --- | --- |
| Algebra | 2 / 10 | 20% |
| Geometry | 3 / 10 | 30% |
| Statistics | 2 / 10 | 20% |

Expected overall average: approximately **23.3%**. All three topics are below the **60%** critical threshold. The **75%** line in the topic view is a visual planning benchmark, not a predicted learning outcome.

This is a functional demonstration, **not evidence of educational impact**. A one-student sample cannot support school-wide conclusions.

## Run locally

**Requirements:** Node.js 22.13+ and npm.

```bash
npm install
```

Create `.env.local` using `.env.example`:

```env
NEXT_PUBLIC_API_URL=https://edu-insight-bciy.onrender.com
```

```bash
npm run dev
```

Open **http://localhost:3000**. For a production build, run `npm run build`, then `npm start`.

- The adapter adds `/api` automatically; do not use `/docs` as the API base URL.
- Restart development or rebuild production after changing the environment variable.
- The backend must allow your frontend origin through CORS. A `503` response means the backend is unavailable; the frontend will not silently substitute demo data.
- A previously selected source is restored from browser storage. Select **Live API** explicitly if a previous visit used **Демоданные**.

## Architecture

This repository contains the **frontend**, not the backend implementation.

| Layer | Technology / responsibility |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Interface | Tailwind CSS, Radix primitives, Lucide icons |
| Charts | Recharts |
| Server state | TanStack Query; caches separated by source, dataset and filters |
| API boundary | Fetch, multipart CSV uploads, Zod response validation |
| Offline demo | Deterministic sample data and browser-local analytics |
| Entrance motion | CSS opacity/transform animations; no extra animation dependency |

The API contract is [`openapi.json`](openapi.json). The live adapter is [`src/lib/data-source/api-provider.ts`](src/lib/data-source/api-provider.ts). Backend dashboards display server aggregates; live optimization and reports come from backend endpoints.

See [API integration details](docs/api-contract.md), [data-source behavior](docs/data-source.md), and [design provenance](docs/design-source.md).

## Responsible interpretation and current scope

- Upload **anonymized data only**. The app does not automatically remove personal identifiers.
- Scores and maximum scores do not necessarily represent counts of correct and incorrect answers. Answer-count visualizations appear only when the backend provides those counts.
- Missing dates can exclude records from the trend. Subject filtering depends on what the backend stores.
- A student with multiple assessments can appear in multiple score ranges; the distribution is not necessarily a unique-student headcount.
- Hour allocations support human planning; they do not predict learning gains or automatically publish a timetable.
- The current API has no authentication, account management, raw-row download or plan-storage endpoints. Live plans can be exported, not saved through an invented endpoint.
- Report quality and live availability depend on the backend. The frontend does not claim a particular AI model or independently verified educational effectiveness.

## Verification

```bash
npm run lint
npm run build
npm run typecheck
npm test
npx playwright install chromium
npx playwright test e2e/backend-contract.spec.ts e2e/entrance.spec.ts --workers=1
```

The browser checks cover the upload-to-chart workflow, active-file persistence, distinct overview/topic views, mobile navigation and reduced-motion behavior. They use intercepted contract-shaped API responses, **not a live production database**. Playwright starts the production frontend on port **3100** after a build.

Other browser specs are legacy scenarios for earlier UI/API versions and are not the current acceptance suite. Production builds download Google fonts and therefore need network access during that step.
