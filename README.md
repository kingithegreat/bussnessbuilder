# BusinessFlow Studio

An all-in-one template for small businesses: answer a few questions in the setup
wizard and instantly get a customizable public page, an enquiry inbox/CRM, and
AI-powered content tools. Built with **Angular 21**, **Tailwind CSS v4**, and
**Angular Material**, with optional **Google Gemini** content generation.

State is stored locally in the browser (localStorage) — no backend required.

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

## Build

```bash
npm run build
```

Produces a static client-side build in `dist/app/browser/`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production static build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Deployment

This is a static single-page app — deploy `dist/app/browser/` to any static
host. SPA deep-link routing requires serving `index.html` for unknown paths;
config is included for common hosts:

- **GitHub Pages** — `.github/workflows/deploy.yml` builds and publishes on every
  push. Enable it once via **Settings → Pages → Source: GitHub Actions**.
- **Netlify** — `netlify.toml` (publish dir + SPA redirect).
- **Vercel** — `vercel.json` (output dir + rewrites).
- **Other hosts** — `public/_redirects` provides the SPA fallback for
  Netlify-style hosts; otherwise configure your host to serve `index.html` for
  all routes.
