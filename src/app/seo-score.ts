/**
 * Per-page SEO score with plain-English fixes. Pure and deterministic so the
 * owner sees the same score every time; no external calls.
 */
export interface SeoPageInput {
  name: string;           // e.g. "Home", "About us"
  path: string;           // shown to the owner, e.g. "/s/pyespa"
  title: string;
  description: string;
  h1: string;
  headings: string[];     // h2/h3 text
  images: { alt: string }[];
  text: string;           // visible body text
  localKeywords: string[]; // e.g. ["Tauranga", "lawn mowing"]
}

export interface SeoCheck { id: string; label: string; pass: boolean; weight: number; fix: string; where: string }
export interface SeoResult { score: number; grade: 'Great' | 'Good' | 'Needs work'; checks: SeoCheck[] }

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const has = (hay: string, needles: string[]) => needles.some(n => n && hay.toLowerCase().includes(n.toLowerCase()));

export function scoreSeoPage(p: SeoPageInput, settingsHint = 'Website → Branding → SEO'): SeoResult {
  const kw = p.localKeywords.map(k => k.trim()).filter(k => k.length >= 3);
  const altMissing = p.images.filter(i => !i.alt.trim()).length;
  const bodyWords = words(p.text);
  const checks: SeoCheck[] = [
    { id: 'title', label: 'Page title is 30–60 characters', weight: 15, where: settingsHint,
      pass: p.title.length >= 30 && p.title.length <= 60,
      fix: p.title.length < 30 ? `Your title is ${p.title.length} characters. Add what you do and where, e.g. "${[p.title || 'Your business', kw[1], kw[0]].filter(Boolean).join(' — ')}".` : `Your title is ${p.title.length} characters; Google cuts off around 60. Shorten it.` },
    { id: 'description', label: 'Meta description is 70–160 characters', weight: 15, where: settingsHint,
      pass: p.description.length >= 70 && p.description.length <= 160,
      fix: p.description.length < 70 ? 'Write one or two sentences (70–160 characters) saying what you offer, where, and why people choose you.' : 'Trim the description to 160 characters so it is not cut off in Google.' },
    { id: 'h1', label: 'Has one clear main heading', weight: 10, where: 'Your homepage headline',
      pass: words(p.h1) >= 2, fix: 'Add a main headline of a few words that says what you do.' },
    { id: 'headings', label: 'Uses section headings (at least 2)', weight: 10, where: 'Website → Homepage sections',
      pass: p.headings.filter(h => h.trim()).length >= 2, fix: 'Break the page up with short section headings (Services, About, Contact).' },
    { id: 'alt', label: 'Every image has alt text', weight: 10, where: 'Image settings for each photo',
      pass: altMissing === 0, fix: `${altMissing} image${altMissing === 1 ? '' : 's'} with no description. Describe each photo in a few words (helps Google Images and screen readers).` },
    { id: 'length', label: 'Enough text (300+ words)', weight: 15, where: 'About and service descriptions',
      pass: bodyWords >= 300, fix: `About ${bodyWords} words so far. Add detail to your About section and each service. Aim for 300+ words.` },
    { id: 'local-title', label: 'Mentions your town or area in the title or headline', weight: 15, where: settingsHint,
      pass: !kw[0] || has(`${p.title} ${p.h1}`, [kw[0]]), fix: kw[0] ? `Add "${kw[0]}" to your page title or headline. Local searches like "${kw[1] || 'service'} ${kw[0]}" are how most customers find you.` : 'Add your service area in Settings so we can check this.' },
    { id: 'local-body', label: 'Mentions your service and area in the text', weight: 10, where: 'About section',
      pass: kw.length === 0 || kw.every(k => has(p.text, [k])), fix: `Mention ${kw.map(k => `"${k}"`).join(' and ')} naturally in your About text.` },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.filter(c => c.pass).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((got / total) * 100);
  return { score, grade: score >= 85 ? 'Great' : score >= 60 ? 'Good' : 'Needs work', checks };
}

/** Pull headings, image alts and plain text out of a content page (markdown or simple HTML). */
export function extractFromContent(content: string): { headings: string[]; images: { alt: string }[]; text: string; h1: string } {
  const md = content || '';
  const headings = [...md.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m => m[1]).concat([...md.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi)].map(m => m[1].replace(/<[^>]+>/g, '')));
  const h1 = (md.match(/^#\s+(.+)$/m)?.[1] || md.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '');
  const images = [...md.matchAll(/!\[([^\]]*)\]\([^)]*\)/g)].map(m => ({ alt: m[1] }))
    .concat([...md.matchAll(/<img\b[^>]*>/gi)].map(m => ({ alt: m[0].match(/\balt\s*=\s*"([^"]*)"/i)?.[1] || '' })));
  const text = md.replace(/<[^>]+>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/[#*_>`[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return { headings, images, text, h1 };
}

export interface GbpStep { id: string; title: string; detail: string; link: string; linkLabel: string }

/** Google Business Profile setup, linking only to Google's own pages. */
export const GBP_STEPS: GbpStep[] = [
  { id: 'create', title: 'Create or claim your Business Profile', detail: 'Sign in with a Google account and search for your business. Claim it if it exists, otherwise add it. Use exactly the same business name as on your website.', link: 'https://support.google.com/business/answer/2911778', linkLabel: 'Google: add or claim your profile' },
  { id: 'verify', title: 'Verify your business', detail: 'Google will ask you to verify, usually by video, phone, text or email. Your profile won\'t show fully until this is done.', link: 'https://support.google.com/business/answer/7107242', linkLabel: 'Google: verify your business' },
  { id: 'details', title: 'Fill in hours, phone, website and service area', detail: 'Use the same phone number and hours as your website, and paste in your BusinessFlow site address as the website. Service businesses can hide their street address and set a service area.', link: 'https://support.google.com/business/answer/3039617', linkLabel: 'Google: edit your profile' },
  { id: 'photos', title: 'Add photos', detail: 'Add your logo, a cover photo and a few photos of your work. Profiles with photos get more clicks.', link: 'https://support.google.com/business/answer/6103862', linkLabel: 'Google: photos & videos' },
  { id: 'reviews', title: 'Ask happy customers for reviews', detail: 'Share your Google review link after each job and reply to every review. Never pay for or filter reviews.', link: 'https://support.google.com/business/answer/3474122', linkLabel: 'Google: tips to get more reviews' },
  { id: 'rules', title: 'Check Google\'s guidelines', detail: 'Keep your name free of extra keywords and keep details accurate. Breaking the rules can get a profile suspended.', link: 'https://support.google.com/business/answer/3038177', linkLabel: 'Google: profile guidelines' },
  { id: 'console', title: 'Optional: add your site to Search Console', detail: 'See which searches find you. For custom domains, verify the domain and submit your sitemap (your site address + /sitemap.xml).', link: 'https://search.google.com/search-console/about', linkLabel: 'Google Search Console' },
];
