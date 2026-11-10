# Backend API contract

The source of truth is [`../openapi.json`](../openapi.json). The live adapter (`src/lib/data-source/api-provider.ts`) validates backend responses using `backend-schemas.ts`. It never substitutes mock records or fabricated success responses.

Set `NEXT_PUBLIC_API_URL` to the server origin; `/api` is appended automatically. A URL already ending in `/api` is accepted. Default: `http://localhost:8000`. Restart development or rebuild production when changing this variable. Configure backend CORS to allow your frontend origin.

| Route | Use |
| --- | --- |
| GET `/api/health` | Settings connectivity and database status |
| GET `/api/datasets` | Dataset history and active dataset metadata |
| POST `/api/datasets/upload` | Original CSV in multipart field `file` |
| GET `/api/datasets/{id}/analytics` | Overview, topic, trend, distribution, answers, textbook charts |
| GET `/api/datasets/{id}/status` | Report processing state |
| GET `/api/datasets/{id}/report` | Stored completed educational report |
| POST `/api/curriculum/optimize` | Integer current hours keyed by real dataset topics |
| POST `/api/recommendations/analyze` | Generate report, including complete last optimization response when available |

Supported analytics filters: grade, subject, textbook, topic. `all` is omitted. School filtering is unavailable in this contract.

Uploading selects the returned backend dataset ID and invalidates all live queries. Dataset selection persists in localStorage when available. Charts use backend aggregates, not local recomputation. CSV contents and structure are validated by the backend; errors including 413/422 details are displayed.

Dashboard scores are percentages; optimization mastery ratios are multiplied by 100 only for display. Textbook counts are available per topic; unique totals and overall textbook averages are not fabricated from overlapping topic samples.

The contract has no raw-row retrieval, CSV download, school heatmap, authentication, user profile, or plan-storage routes. Live UI does not claim these are supported. Optimizer current hours are explicitly user inputs, not inferred from CSV. Generated reports retain backend findings, evidence, topic/textbook interpretation, curriculum explanations, recommendations and limitations. Processing reports poll until ready; failed reports show errors. Recalculate explicitly to include newly calculated hours in a stored report.

Normal requests time out after 30 seconds; report generation allows 120 seconds. Requests honor query cancellation. No FastAPI implementation or reachable backend deployment was supplied, so verification uses contract-shaped test fixtures rather than an actual database/server.
