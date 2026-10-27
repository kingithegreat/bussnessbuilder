#!/usr/bin/env node
/** GET-only public preflight. No credentials, writes, emails or paid AI calls.
 * Node 22+: node scripts/demo-smoke.mjs https://your-app.example
 * Optional: BF_DEMO_SITE_ID=known-published-demo-slug
 * Exit 0 means public preflight passed, NOT signed-in acceptance or launch approval.
 */
const input = process.argv[2] || process.env.BF_BASE_URL;
if (!input) {
  console.error('Usage: node scripts/demo-smoke.mjs <base-url>');
  process.exit(2);
}
let base;
try {
  base = new URL(input);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
      base.search || base.hash || base.pathname !== '/') throw new Error('Use an origin without credentials, path or query');
} catch (error) {
  console.error(`Invalid base URL: ${error.message}`);
  process.exit(2);
}

let failures = 0;
const evidence = { checkedAt: new Date().toISOString(), origin: base.origin, scope: 'public GET-only preflight', checks: [] };
async function check(path, validate, expectedStatus = 200, kind = 'json') {
  try {
    const response = await fetch(new URL(path, base), {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Accept: kind === 'json' ? 'application/json' : 'text/html' },
    });
    if (response.status !== expectedStatus) throw new Error(`Expected HTTP ${expectedStatus}, got ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes(kind === 'json' ? 'application/json' : 'text/html')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }
    const body = kind === 'json' ? await response.json() : await response.text();
    const detail = validate(body);
    if (!detail) throw new Error('Unexpected response shape or missing app shell');
    evidence.checks.push({ path, status: 'PASS', detail });
    return body;
  } catch (error) {
    failures++;
    evidence.checks.push({ path, status: 'FAIL', detail: error.message });
  }
}

await check('/healthz/', b => b?.status === 'ok' && 'healthy');
for (const path of ['/', '/setup', '/login', '/pricing', '/privacy', '/terms']) {
  await check(path, b => /<app-root[\s>]/.test(b) && /<script[\s>]/.test(b) && 'HTML app shell served; browser interaction requires separate acceptance', 200, 'html');
}
await check('/api/pricing', b =>
  ['USD', 'NZD'].includes(b?.currency) && Number.isFinite(b.pro) && b.pro > 0 &&
  Number.isFinite(b.business) && b.business > 0 && typeof b.gstInclusive === 'boolean' &&
  { currency: b.currency, pro: b.pro, business: b.business, gstInclusive: b.gstInclusive });
for (const path of ['/api/email-alerts/status', '/api/sms/status']) {
  await check(path, b => typeof b?.enabled === 'boolean' &&
    { configured: b.enabled, deliveryTested: false });
}
await check('/api/bookings?uid=demo-smoke', b => typeof b?.error === 'string' && 'unauthenticated owner request rejected', 401);
const showcases = await check('/api/showcases', b =>
  Array.isArray(b?.showcases) && b.showcases.length <= 4 &&
  b.showcases.every(s => typeof s?.slug === 'string' && s.slug.length > 0 && s.slug.length <= 200) &&
  { listed: b.showcases.length, note: 'Zero means no showcase is available for the walkthrough' });
for (const site of showcases?.showcases || []) {
  const path = `/api/site/${encodeURIComponent(site.slug)}`;
  await check(path, b => typeof b?.profile?.name === 'string' && Array.isArray(b?.services) && 'listed showcase is published');
  await check(`${path}/booking`, b => b?.enabled === true && Array.isArray(b?.services) &&
    b.services.length > 0 && typeof b?.timezone === 'string' && 'showcase booking services are available; no request submitted');
}
if (process.env.BF_DEMO_SITE_ID) {
  await check(`/api/site/${encodeURIComponent(process.env.BF_DEMO_SITE_ID)}`, b =>
    typeof b?.profile?.name === 'string' && Array.isArray(b?.services) && 'published site data readable');
}
evidence.result = failures ? 'FAIL' : 'PASS';
evidence.limitations = 'No signed-in flow, owner isolation, delivery, restore, paid providers, or deployment commit proven. Disabled notifications are recorded, not treated as delivery success.';
console.log(JSON.stringify(evidence, null, 2));
process.exitCode = failures ? 1 : 0;
