# BusinessFlow Studio

An all-in-one template for small businesses: answer a few questions in the setup
wizard and instantly get a customizable public page, an enquiry inbox/CRM, and
AI-powered content tools. Built with **Angular 21** (server-side rendering),
**Tailwind CSS v4**, and **Angular Material**, with optional **Google Gemini**
content generation.

The app is server-rendered by a small **Express** server and ships as a
container for **Google Cloud Run**. User data is stored locally in the browser
(localStorage) — the server only renders and serves the app.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server (http://localhost:3000):
   ```bash
   npm run dev
   ```

## Enabling AI (Google Gemini)

AI content tools (business description, enquiry reply drafts, Google Business
posts, social captions) work out of the box using built-in templates. To
generate real AI content:

1. Get a Gemini API key: https://aistudio.google.com/apikey
2. In the app, go to **Admin → AI Tools** and paste your key into the
   **Gemini API Key** panel, then **Save Key**.

The key is stored only in your browser and is never included in profile
exports. When no key is set, the tools fall back to templates automatically.

> A key may also be injected at build/host time as a `GEMINI_API_KEY` global if
> you prefer to bake it into a private deployment.

## Build & run the SSR server

```bash
npm run build        # builds the browser bundle + Node SSR server into dist/app
npm run serve:ssr:app # runs the server (defaults to http://localhost:4000)
```

The server listens on `$PORT` (default `4000` locally, `8080` in the container)
and exposes a `GET /healthz` endpoint that returns `{"status":"ok"}`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production SSR build (browser + server) |
| `npm run serve:ssr:app` | Run the built SSR server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Deployment (Google Cloud Run)

The repo includes a multi-stage `Dockerfile` that builds the app and runs the
Node SSR server. The container listens on `$PORT` (Cloud Run sets this to
`8080`) and has a `/healthz` probe.

Deploy straight from source — Cloud Build builds the `Dockerfile` for you:

```bash
gcloud run deploy businessflow \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

Or build and push the image yourself, then deploy:

```bash
# Build & test locally
docker build -t businessflow .
docker run --rm -p 8080:8080 businessflow   # http://localhost:8080

# Push to Artifact Registry and deploy
docker tag businessflow REGION-docker.pkg.dev/PROJECT/REPO/businessflow
docker push REGION-docker.pkg.dev/PROJECT/REPO/businessflow
gcloud run deploy businessflow \
  --image REGION-docker.pkg.dev/PROJECT/REPO/businessflow \
  --region us-central1 \
  --allow-unauthenticated
```

### SSR host check

Angular's SSR layer validates the `Host` / `X-Forwarded-Host` header to prevent
SSRF. Cloud Run terminates TLS and proxies requests, so the image defaults
`NG_ALLOWED_HOSTS=*` (validation delegated to that proxy). To also enforce it
in-app, set `NG_ALLOWED_HOSTS` to your exact domain(s), comma-separated:

```bash
gcloud run services update businessflow \
  --set-env-vars NG_ALLOWED_HOSTS=your-service-abc123-uc.a.run.app,www.example.com
```
