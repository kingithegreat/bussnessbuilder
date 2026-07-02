# BusinessFlow v1.2 — AI Lead & Growth Engine

## What it does

The Growth Engine transforms BusinessFlow from a website builder into an AI-powered business growth platform. It analyses a user's site, enquiries, analytics, and services, then gives practical recommendations and helps users apply improvements directly.

## Features

### 1. Growth Coach Dashboard (`/admin/growth`)

A dedicated page with:
- **Metric cards** — Page views (7d), total enquiries, conversion rate, follow-ups needed
- **AI Growth Summary** — Natural language analysis of business performance
- **Recommendations** — Priority-ranked, actionable improvement suggestions with draft/done/dismiss actions
- **Leads needing follow-up** — Enquiries that need attention, linked to inbox
- **Marketing Content Generator** — Generate 6 types of marketing content

### 2. Apply Recommendations (v1.2)

Each recommendation supports actions:
- **Draft Improvement** — AI drafts content specific to the recommendation type (hero text, FAQ, service description, follow-up message, etc.)
- **Mark Done** — Marks the recommendation as applied
- **Dismiss** — Hides the recommendation (restorable)
- **Copy** — Copies drafted content to clipboard
- **Add as FAQ** — For FAQ-type recommendations, inserts the draft as a new FAQ entry on the site
- **Open Inbox** — For lead follow-up recommendations, links directly to the enquiry inbox

Draft workflow: AI drafts → user reviews → user copies or applies manually. No destructive auto-edits.

### 3. Enhanced Lead CRM (Enquiry Inbox)

The inbox now includes:
- **Lead stage filters** — All, New, Hot, Follow-up, Won, Lost (with counts)
- **Lead temperature selector** — Hot/Warm/Cold in the detail view
- **Last contacted date** — Track when you last reached out
- **AI reply intent selector** — Choose from 5 reply types:
  - Reply (standard response)
  - Follow-up (nudge non-responders)
  - Quote (estimate/pricing)
  - Close Lost (polite close-out)
  - Booking Confirmation

### 4. Marketing Content Generator

Generate ready-to-use content:
- Facebook post
- Instagram caption
- Google Business Profile update
- Review request message
- Service promotion
- Seasonal offer

All content uses the business's actual name, services, location, and tone of voice.

### 5. Website Improvement Recommendations

The AI analyses:
- Services without prices
- Missing testimonials or FAQs
- Low conversion rates
- Unanswered enquiries
- Popular vs. underperforming services

Each recommendation has a title, reason, suggestion, priority (high/medium/low), and type.

## Data Model

### Enquiry (updated fields)
```
lastContactedDate?: string   — ISO date when owner last contacted the lead
```
Existing fields used for lead management: `status`, `leadScore`, `followUpDate`, `nextAction`, `draftReply`, `customerNotes`.

Default lead stages (new users): `New → Contacted → Quoted → Booked → Won → Lost`

### GrowthReport (returned by API, not persisted)
```typescript
interface GrowthReport {
  id: string;
  createdAt: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  pageViews: number;
  enquiries: number;
  conversionRate: number;
  topServices: { name: string; count: number }[];
  leadSummary: {
    total: number;
    new: number;
    hot: number;
    warm: number;
    cold: number;
    needsFollowUp: number;
  };
  recommendations: GrowthRecommendation[];
  generatedSummary: string;
  suggestedActions: string[];
}
```

### GrowthRecommendation (from API)
```typescript
interface GrowthRecommendation {
  title: string;
  reason: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  type?: RecommendationType;
  draftContent?: string;
}
```

### SavedRecommendation (persisted in Firestore)
```typescript
type RecommendationType = 'hero' | 'service' | 'faq' | 'pricing' | 'trust' | 'cta' | 'lead-follow-up' | 'marketing' | 'seo' | 'general';
type RecommendationStatus = 'new' | 'drafted' | 'applied' | 'dismissed';
type RecommendationSource = 'ai' | 'template' | 'analytics' | 'enquiry-pattern';

interface SavedRecommendation {
  id: string;
  title: string;
  reason: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  type: RecommendationType;
  status: RecommendationStatus;
  source: RecommendationSource;
  draftContent?: string;
  createdAt: string;
  updatedAt: string;
  dismissedAt?: string;
  appliedAt?: string;
}
```

### DraftRecommendationResponse (from API)
```typescript
interface DraftRecommendationResponse {
  title: string;
  draftType: RecommendationType;
  draftContent: string;
  explanation: string;
  fallback: boolean;
}
```

### Firestore path
```
users/{uid}/businessData/recommendations → { items: SavedRecommendation[] }
```
Covered by the existing wildcard rule: `match /businessData/{docId}`.

## API Endpoints

### `POST /api/ai/growth-report`
- **Auth**: Firebase token required
- **Rate limit**: 20 AI requests/min/user (shared with other AI endpoints)
- **Request**: `{ uid: string }`
- **Response**: `GrowthReport` object
- **Logic**: Server reads user's Firestore data (profile, services, enquiries, analytics, subscription), computes metrics, and calls Gemini to generate summary and recommendations
- **Free tier**: Returns computed metrics + template-based recommendations with types (no AI call)
- **Pro/Business**: Full AI-generated analysis via Gemini 2.5 Flash

### `POST /api/ai/draft-recommendation`
- **Auth**: Firebase token required
- **Rate limit**: 20 AI requests/min/user (shared)
- **Request**: `{ uid: string, recommendation: { title: string, type: string, suggestion: string } }`
- **Response**: `DraftRecommendationResponse` object
- **Logic**: Validates recommendation type against allowed list, reads user's business data for context, generates a draft improvement
- **Input sanitization**: Type validated against whitelist, title capped at 200 chars, suggestion capped at 500 chars
- **Free tier**: Returns template-based draft with `fallback: true`
- **Pro/Business**: AI-generated draft via Gemini 2.5 Flash with JSON response mode

### `POST /api/ai/generate` (existing, used for all other AI)
Used by the client for lead replies, marketing content, and other AI features. The client builds the prompt and sends it to the server for Gemini processing. **Server-side tier enforcement:** the endpoint reads the user's subscription from Firestore and returns `{ text: null, fallback: true }` for free-tier users, which triggers template fallbacks on the client. Pro and Business users proceed to Gemini.

## Tier Gating

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Lead stages & filters | Yes | Yes | Yes |
| Basic metrics dashboard | Yes | Yes | Yes |
| Template-based recommendations | Yes | Yes | Yes |
| View recommendations with status | Yes | Yes | Yes |
| Mark done / dismiss / restore | Yes | Yes | Yes |
| Template drafts (all types) | Yes | Yes | Yes |
| AI growth report (Gemini) | No | Yes | Yes |
| AI drafts (Gemini) | No | Yes | Yes |
| AI lead replies (Gemini) | No | Yes | Yes |
| AI marketing content (Gemini) | No | Yes | Yes |
| AI business descriptions (Gemini) | No | Yes | Yes |
| Add as FAQ (from draft) | Yes | Yes | Yes |
| Template lead replies | Yes | Yes | Yes |
| Template marketing content | Yes | Yes | Yes |

### Server-side enforcement

All three AI endpoints enforce tier gating on the server — the client cannot bypass it:

- **`/api/ai/generate`** — reads `subscriptions/{uid}` from Firestore. Free-tier users receive `{ text: null, fallback: true }`, which the client handles as a template fallback. Pro/Business users proceed to Gemini.
- **`/api/ai/growth-report`** — checks tier. Free-tier users receive computed metrics with template-based recommendations (no Gemini call).
- **`/api/ai/draft-recommendation`** — checks tier. Free-tier users receive template-based drafts with `fallback: true`. Pro/Business users get AI-generated drafts.

Client-side UI (disabled buttons, upgrade prompts) is a UX convenience only. If a free user has their own client-side Gemini API key, they can still use AI directly — they are paying for their own usage, not the platform's.

## Files

| File | Change |
|------|--------|
| `src/app/types.ts` | Added `SavedRecommendation`, `DraftRecommendationResponse`, `RecommendationType`, `RecommendationStatus`, `RecommendationSource`; added `type?` to `GrowthRecommendation` |
| `src/app/firestore.service.ts` | Added `loadRecommendations()`, `saveRecommendations()` |
| `src/app/data.service.ts` | Added `savedRecommendations` signal, `setRecommendations()`, `updateRecommendation()`, `loadRecommendations()` |
| `src/app/ai.service.ts` | Added `draftRecommendation()`, `generateLeadReply()`, `generateMarketingContent()`, `generateGrowthReport()` |
| `src/app/subscription.service.ts` | Added `growthAi` and `marketing` to tier limits; added `canUseGrowthAi()`, `canUseMarketing()` |
| `src/app/admin-growth.component.ts` | Growth Coach page with recommendation actions, draft preview, status badges, FAQ insertion |
| `src/app/admin-inbox.component.ts` | Added filter chips, reply intent selector, last contacted date, lead temperature |
| `src/app/admin-layout.component.ts` | Added Growth Coach nav link |
| `src/app/app.routes.ts` | Added `/admin/growth` route |
| `src/server.ts` | Added `POST /api/ai/draft-recommendation`, updated `POST /api/ai/growth-report` with recommendation types, server-side tier gating on `/api/ai/generate` |
| `src/app/data.service.ts` | Updated default statuses to pipeline-focused stages |
| `firestore.rules` | Added analytics collection rules (covers recommendations via existing wildcard) |

## How to Test

1. **Growth Coach**: Log in → Admin → Growth Coach → click "Generate Report"
2. **Draft improvement**: Click "Draft Improvement" on a recommendation → see draft preview
3. **Copy draft**: Click "Copy" to copy draft content to clipboard
4. **Add as FAQ**: On a FAQ-type recommendation, click "Add as FAQ" → check FAQ section on public site
5. **Mark done**: Click "Done" → recommendation shows "DONE" badge, stays visible
6. **Dismiss**: Click "Dismiss" → recommendation hidden, use "Show dismissed" to see it, "Restore" to bring back
7. **Persistence**: Dismiss or apply a recommendation → refresh page → status persists
8. **Lead filters**: Admin → Enquiries → use filter chips (New, Hot, Follow-up, Won, Lost)
9. **AI reply types**: Select an enquiry → choose reply type from dropdown → Generate
10. **Marketing**: Growth Coach → Marketing Content Generator → select type → Generate
11. **Free tier**: Template drafts only, AI features show upgrade prompt
12. **Backward compatibility**: Generate a report with existing data → no crashes

## Known Limitations

- Reports auto-regenerate weekly (the latest one is persisted), but there is no
  historical archive — each regeneration replaces the previous report
- Marketing content uses the existing rate limit pool (20 AI requests/min)
- Page view tracking requires the analytics Firestore rule to be deployed
- Recommendation matching on re-generation uses title comparison (not a stable ID)

## Draft insertion coverage

Every recommendation type now has an apply path from the draft preview:

- `faq` → "Add as FAQ", `service` → "Add as Service", `hero` → "Apply to Hero",
  `cta` → "Apply CTA", `trust` → "Add as Testimonial"
- `pricing`, `marketing`, `seo`, `general` → **"Insert as Section"**: creates a
  `custom` free-content page section via `createSection('custom', ...)`
  (`section-library.ts`), heading from the rec title (or an explicit
  `Heading:`/`Title:` first line in the draft — `parseSectionDraft`), body from
  the draft. Rendered by the public page's `@default` section case, no renderer
  changes. `pricing` keeps its "Review services" deep-link too.
- `lead-follow-up` → "Open Inbox" navigation link (nothing to insert)

## Future Improvements

- Historical report comparison (week-over-week trends)
- Email digest for the weekly auto-generated report
- Lead scoring automation based on engagement signals
- Email sequence templates for follow-up workflows
- A/B testing recommendations for CTA text
