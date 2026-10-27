/** Runs inside the existing WIF deployment job. Never logs keys, tokens, env values or user data. */
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
const project = process.env.GCP_PROJECT_ID;
const region = process.env.GCP_REGION || 'us-central1';
const service = process.env.CLOUD_RUN_SERVICE || 'businessflow';
const release = process.env.RELEASE_SHA;
if (!project) throw new Error('GCP_PROJECT_ID is required');
const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
const report = { checkedAt: new Date().toISOString(), release, checks: {} };
const check = (name, status, detail = '') => { report.checks[name] = { status, detail }; console.log(`${name}: ${status}${detail ? ` (${detail})` : ''}`); };
async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? {} : r.json();
}
let fatal = false;
try {
  const run = await api(`https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${project}/services/${service}`);
  const containers = run.spec?.template?.spec?.containers || [];
  const env = Object.fromEntries((containers[0]?.env || []).map(e => [e.name, e.value ?? (e.valueFrom ? '[secret-reference]' : '')]));
  const requiredStripe = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const prices = !!(env.STRIPE_PRICE_ID_PRO || env.STRIPE_PRO_PRICE_ID) && !!(env.STRIPE_PRICE_ID_BUSINESS || env.STRIPE_BUSINESS_PRICE_ID);
  check('stripe', requiredStripe.every(k => env[k]) && prices ? (env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test_mode' : 'configured_unverified') : 'needs_account_setup', 'Real checkout and webhook acceptance must be confirmed by the account owner.');
  check('nzd_prices', env.STRIPE_PRICE_ID_PRO_NZD && env.STRIPE_PRICE_ID_BUSINESS_NZD ? 'configured_unverified' : 'needs_account_setup');
  check('email', ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM'].every(k => env[k]) ? 'configured_unverified' : 'needs_account_setup');
  check('sms', env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_FROM_NUMBER || env.TWILIO_MESSAGING_SERVICE_SID) ? 'configured_unverified' : 'needs_account_setup');
  check('platform_ai', env.GEMINI_API_KEY ? 'configured_unverified' : 'templates_only', 'Shared USD reservation envelope and per-user quotas apply before funded calls.');
  check('sentry', env.SENTRY_DSN ? 'configured_unverified' : 'needs_account_setup', 'Uptime checks run independently in GitHub Actions.');
  const url = run.status?.url;
  if (!url) throw new Error('Service has no ready URL');
  const health = await fetch(`${url}/healthz/`, { signal: AbortSignal.timeout(30000) });
  const data = await health.json();
  if (!health.ok || data.status !== 'ok' || release && data.release !== release) throw new Error('Ready revision does not match the expected release');
  check('live_release', 'verified', run.status?.latestReadyRevisionName || 'ready');
  for (const path of ['/pricing','/setup','/login','/privacy','/robots.txt']) {
    const r = await fetch(url + path, { signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`Public route ${path} returned HTTP ${r.status}`);
  }
  check('public_routes', 'verified');
} catch (e) { check('deployment', 'failed', e.message); fatal = true; }
try {
  await api(`https://${region}-run.googleapis.com/apis/domains.cloudrun.com/v1/namespaces/${project}/domainmappings`);
  check('domain_mapping_api', 'verified', 'Regional endpoint reachable by the deployment identity; runtime ownership/DNS still needs acceptance.');
} catch (e) { check('domain_mapping_api', 'needs_account_access', e.message); }
const compact = s => s.replace(/\r\n/g, '\n').trim();
for (const filename of ['firestore.rules', 'storage.rules']) {
  const base = `https://firebaserules.googleapis.com/v1/projects/${project}`;
  const label = filename.replace('.', '_');
  try {
    // Use the actual release list: bucket names differ between older Firebase projects.
    const releases = await api(`${base}/releases?pageSize=100`);
    const candidates = (releases.releases || []).filter(r => filename === 'firestore.rules' ? r.name.endsWith('/cloud.firestore') : r.name.includes('/firebase.storage/'));
    if (!candidates.length) { check(label, 'needs_account_setup', 'No deployed rules release found.'); continue; }
    for (const active of candidates) {
      let rules = await api(`https://firebaserules.googleapis.com/v1/${active.rulesetName}`);
      const expected = compact(readFileSync(filename, 'utf8'));
      const matches = rules.source?.files?.some(f => compact(f.content) === expected);
      if (!matches && process.env.DEPLOY_FIREBASE_RULES === 'true') {
        rules = await api(`${base}/rulesets`, 'POST', { source: { files: [{ name: filename, content: readFileSync(filename, 'utf8') }] } });
        await api(`https://firebaserules.googleapis.com/v1/${active.name}`, 'PATCH', { release: { name: active.name, rulesetName: rules.name }, updateMask: 'rulesetName' });
        const confirmed = await api(`https://firebaserules.googleapis.com/v1/${active.name}`);
        if (confirmed.rulesetName !== rules.name) throw new Error('Rules deployment was not confirmed');
        check(label, 'deployed_and_verified');
      } else check(label, matches ? 'verified' : 'mismatch', matches ? '' : 'Deploy the checked-in rules.');
    }
  } catch (e) { check(label, 'needs_account_access', e.message); }
}
try {
  const enabled = await api(`https://serviceusage.googleapis.com/v1/projects/${project}/services/siteverification.googleapis.com`);
  check('domain_verification_api', enabled.state === 'ENABLED' ? 'verified' : 'needs_account_setup', 'Custom-domain DNS and HTTPS acceptance still requires an owner-controlled domain.');
} catch (e) { check('domain_verification_api', 'needs_account_access', e.message); }
writeFileSync('production-readiness.json', JSON.stringify(report, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Production checks\n\n| Check | Status | Detail |\n| --- | --- | --- |\n${Object.entries(report.checks).map(([k,v]) => `| ${k} | ${v.status} | ${v.detail} |`).join('\n')}\n`);
if (fatal) process.exitCode = 1;
