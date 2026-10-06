/** The first supported chat action. The server owns its identity and audit fields. */
export interface HomepageHeadlineAction {
  id: string;
  type: 'homepage.headline';
  status: 'prepared' | 'applied' | 'undone';
  before: { tagline: string };
  after: { tagline: string };
  request: string;
  reason: string;
  source: 'ai' | 'template';
  actorUid: string;
  createdAt: string;
  appliedAt?: string;
  undoneAt?: string;
}

export type SiteAction = HomepageHeadlineAction;
export interface PrepareHeadlineInput { id: string; request: string; expectedHeadline: string }

export const SITE_ACTION_LIMITS = { request: 500, headline: 160, reason: 500 } as const;

export function validActionId(id: unknown): id is string {
  return typeof id === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function plainText(text: unknown, maximum: number, singleLine = false): text is string {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= maximum
    && !/[<>]/.test(text)
    && ![...text].some(character => {
      const code = character.charCodeAt(0);
      return code === 127 || code < 32 && ![9, 10, 13].includes(code);
    })
    && (!singleLine || !/[\r\n\t]/.test(text));
}

export function validSiteActionRequest(request: unknown): request is string {
  return plainText(request, SITE_ACTION_LIMITS.request);
}

export function validHeadline(headline: unknown): headline is string {
  return plainText(headline, SITE_ACTION_LIMITS.headline, true);
}

export function validActionReason(reason: unknown): reason is string {
  return plainText(reason, SITE_ACTION_LIMITS.reason);
}

/** A narrow intent gate; unsupported requests never become executable commands. */
export function isHomepageHeadlineRequest(request: unknown): request is string {
  return validSiteActionRequest(request)
    && /\b(headline|tagline)\b|\b(home\s?page|hero)\b.{0,80}\b(heading|title)\b/i.test(request);
}

/** Guard history data before it reaches components or an approval transaction. */
export function isHomepageHeadlineAction(value: unknown): value is HomepageHeadlineAction {
  if (!value || typeof value !== 'object') return false;
  const action = value as Record<string, unknown>;
  const before = action['before'] as Record<string, unknown> | undefined;
  const after = action['after'] as Record<string, unknown> | undefined;
  return validActionId(action['id']) && action['type'] === 'homepage.headline'
    && ['prepared', 'applied', 'undone'].includes(action['status'] as string)
    && !!before && typeof before['tagline'] === 'string'
    && !!after && validHeadline(after['tagline'])
    && validSiteActionRequest(action['request']) && validActionReason(action['reason'])
    && ['ai', 'template'].includes(action['source'] as string)
    && typeof action['actorUid'] === 'string' && action['actorUid'].length > 0
    && typeof action['createdAt'] === 'string' && Number.isFinite(Date.parse(action['createdAt']))
    && (action['appliedAt'] === undefined || typeof action['appliedAt'] === 'string' && Number.isFinite(Date.parse(action['appliedAt'])))
    && (action['undoneAt'] === undefined || typeof action['undoneAt'] === 'string' && Number.isFinite(Date.parse(action['undoneAt'])));
}
