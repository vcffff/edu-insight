# Data sources

Live API is the default for the entire site. The header retains an explicit **Демоданные** option for offline demonstrations; an explicit saved preference is restored. Live failures never fall back to demo data.

Copy `.env.example` to `.env.local`, configure `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`), and restart development/rebuild production. Enable frontend-origin CORS on your backend. See [api-contract.md](api-contract.md) for exact routes and limitations.

Queries are isolated by source, dataset ID and supported filters. Uploading or selecting a backend dataset cancels old requests, resets filters, and invalidates live caches. Only the active dataset ID and source preference are stored in the browser; live CSV files are uploaded to the backend. Demo data and demo plans remain browser-local.

Verification: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. `npx playwright test e2e/backend-contract.spec.ts --workers=1` tests actual multipart upload requests, chart rendering, navigation and selected dataset persistence with intercepted backend contract fixtures. Legacy browser scenarios in the other spec files target the previous provisional live contract and are not backend-contract acceptance tests.
