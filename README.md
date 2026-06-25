# BusinessFlow Studio

An all-in-one SaaS website builder for small businesses. Answer a few questions in
the setup wizard and instantly get a customizable public page, an enquiry inbox/CRM,
AI-powered content tools, and subscription billing. Built with **Angular 21** (SSR),
**Tailwind CSS v4**, **Angular Material**, **Firebase** (Auth, Firestore, Storage),
and **Stripe** subscriptions.

**Live:** https://businessflow-722923667291.us-central1.run.app

## Architecture

- **Frontend:** Angular 21 standalone components, signal-based state management
- **Server:** Express SSR server (`src/server.ts`) with API endpoints
- **Auth:** Firebase Auth (Email/Password + Google sign-in)
- **Database:** Firestore — per-user data at `/users/{uid}/businessData/main`
- **Storage:** Firebase Storage for user image uploads
- **AI:** Google Gemini (`@google/genai`) with template fallback
- **Payments:** Stripe subscriptions (Free / Pro $14/mo / Business $22/mo)
- **Deploy:** Google Cloud Run (project: `sitebuilder-b2ee6`)

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up Firebase:
   - Create a Firebase project or use the existing `sitebuilder-b2ee6`
   - Enable Auth providers: Email/Password + Google
   - Create Firestore database
   - Copy your web app config to `src/environments/environment.ts`
   - For server-side Firestore: set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key

3. Start the dev server (http://localhost:3000):
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Local dev | Path to Firebase service account JSON |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_PRICE_ID_PRO` | For payments | Stripe Price ID for Pro tier |
| `STRIPE_PRICE_ID_BUSINESS` | For payments | Stripe Price ID for Business tier |
| `STRIPE_WEBHOOK_SECRET` | For payments | Stripe webhook signing secret |
| `NG_ALLOWED_HOSTS` | Cloud Run | Angular SSR host check (`*` for Cloud Run) |

## Enabling AI (Google Gemini)

AI content tools work out of the box using built-in templates. For real AI:

1. Get a Gemini API key: https://aistudio.google.com/apikey
2. In the app: **Admin → AI Tools → Gemini API Key → Save Key**

The key is stored only in the user's browser.

## Build & deploy

```bash
npm run build              # Production SSR build
npm run serve:ssr:app      # Run locally (http://localhost:4000)

# Deploy to Cloud Run
gcloud run deploy businessflow \
  --source . \
  --region us-central1 \
  --set-env-vars="NG_ALLOWED_HOSTS=*"
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production SSR build (browser + server) |
| `npm run serve:ssr:app` | Run the built SSR server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /healthz` | None | Liveness probe |
| `GET /api/site/:uid` | None | Load published site data |
| `POST /api/site/:uid/enquiry` | None (rate-limited) | Submit enquiry |
| `POST /api/stripe/create-checkout-session` | Firebase token | Create Stripe checkout |
| `POST /api/stripe/customer-portal` | Firebase token | Open billing portal |
| `POST /api/stripe/webhook` | Stripe signature | Handle Stripe events |

## Continuous Deployment

`.github/workflows/deploy.yml` builds and deploys on push to `main` using
Workload Identity Federation. Set these GitHub repo variables/secrets:

- Variables: `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE`
- Secrets: `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`
