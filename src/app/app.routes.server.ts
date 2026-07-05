import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Everything under /admin and /app-admin is behind authGuard/appAdminGuard —
  // it's never indexed, never viewed pre-auth, and gains nothing from SSR.
  // Rendering it on the server was pure wasted Cloud Run compute on every
  // dashboard navigation, and a latent risk surface: any future admin
  // component that reads a browser-only global (window/localStorage) during
  // init would silently break SSR for an authenticated-only page that was
  // never meant to run server-side in the first place.
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'app-admin/**', renderMode: RenderMode.Client },
  // Live-preview iframe content for the page builder — also auth-only, zero
  // SEO value, and deliberately skips DataService.init() (see app.routes.ts).
  { path: 'preview-frame', renderMode: RenderMode.Client },
  {
    // Render every remaining route on the server at request time. The app's
    // state lives in the browser (localStorage), so server-side rendering
    // produces the default shell which the client then hydrates — the right
    // fit for public/SEO-relevant routes (landing, pricing, public site
    // pages) on a Cloud Run SSR deployment.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
