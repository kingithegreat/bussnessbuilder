# BusinessFlow Studio

A reusable small-business website, enquiry, and automation template for any
business type. Built with **Angular 21** (standalone components + signals) and
**Tailwind CSS**. The app runs entirely in the browser — business data is kept
in `localStorage`, so no backend or database is required.

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000

## Build

```bash
npm run build
```

The production build is emitted to `dist/app/browser`.

## Deploy to Firebase Hosting

This app is a static single-page application, so it deploys to **Firebase
Hosting** with no Cloud Functions or billing required.

### One-time setup

1. Install the Firebase CLI (if you don't have it):
   ```bash
   npm install -g firebase-tools
   ```
2. Sign in:
   ```bash
   firebase login
   ```
3. Point the project at your Firebase project. Either edit the `default`
   project id in [`.firebaserc`](.firebaserc), or run:
   ```bash
   firebase use --add
   ```
   and pick your project (create one first at https://console.firebase.google.com
   if needed).

### Deploy

```bash
npm run deploy
```

This builds the app and runs `firebase deploy --only hosting`. After it
finishes, the CLI prints your live **Hosting URL**.

> CI / non-interactive deploys: generate a token with `firebase login:ci` and
> run `firebase deploy --only hosting --token "$FIREBASE_TOKEN"`.

## Continuous deployment (GitHub Actions)

[`.github/workflows/firebase-deploy.yml`](.github/workflows/firebase-deploy.yml)
auto-builds and deploys to Firebase Hosting on every push to `main`. To enable it:

1. Replace the placeholder `projectId: bussnessbuilder` in the workflow (and the
   `default` in [`.firebaserc`](.firebaserc)) with your real Firebase project id.
2. Create a service account key with the **Firebase Hosting Admin** role — the
   easiest way is to run `firebase init hosting:github` locally, which sets the
   secret up for you. Otherwise add a repository secret named
   `FIREBASE_SERVICE_ACCOUNT` containing the service account JSON.

Once configured, merging to `main` deploys automatically — no manual
`firebase deploy` needed.

## Project Configuration

- [`firebase.json`](firebase.json) — Hosting config. Serves `dist/app/browser`
  and rewrites all routes to `index.html` for client-side routing.
- [`.firebaserc`](.firebaserc) — the Firebase project alias.
