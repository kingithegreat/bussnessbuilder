import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Render every route on the server at request time. The app's state lives in
    // the browser (localStorage), so server-side rendering produces the default
    // shell which the client then hydrates — the right fit for a Cloud Run SSR
    // deployment.
    path: '**',
    renderMode: RenderMode.Server,
  },
];
