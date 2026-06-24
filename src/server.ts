import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: true,
});

/**
 * Liveness/readiness probe for Cloud Run (and any container orchestrator).
 * Returns 200 as soon as the process is serving, without touching the
 * Angular render path.
 */
app.get('/healthz', (_req, res) => {
  res.status(200).json({status: 'ok'});
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * Cloud Run injects the `PORT` env var (defaults to 8080); fall back to 4000 for
 * local runs. Binding to 0.0.0.0 is required so the container accepts traffic.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = Number(process.env['PORT']) || 4000;
  app.listen(port, '0.0.0.0', (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
