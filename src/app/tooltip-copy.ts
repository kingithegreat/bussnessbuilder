/**
 * Central, plain-English tooltip copy for every button and link in the app.
 *
 * Style: one or two short sentences, present tense, saying what the control
 * does and what changes for the user or their customers.
 *
 * Lookup order (resolveTip):
 *  1. an explicit `bfTip` value — a key in TIPS, or literal text;
 *  2. the control's normalised label (aria-label, else visible text) in TIPS;
 *  3. the first matching RULES pattern (handles dynamic labels like
 *     "Saving…" or "Save 3 price changes");
 *  4. the element's original `title` attribute.
 */
export const TIPS: Record<string, string> = {
  // ── Saving / generic editing ────────────────────────────────────────────
  'save': 'Saves your changes. Anything already published updates for customers straight away.',
  'save changes': 'Saves your design changes and updates your live website.',
  'save settings': 'Saves these settings to your account.',
  'save business profile': 'Saves your business name, contact details and description. They appear on your website and quotes.',
  'save current site': 'Saves your current website as a reusable template you can load later.',
  'save current changes to this template': 'Overwrites this template with how your site looks right now.',
  'edit this template': 'Loads this template into your website so you can keep editing it.',
  'save pages': 'Saves your extra pages. Published pages become visible on your site.',
  'save description': 'Saves this description to your business profile and website.',
  'save key': 'Stores your own AI key so AI tools use it instead of the shared allowance.',
  'save address': 'Changes your website address. Old links to the previous address will stop working.',
  'save booking settings': 'Saves your bookable services and hours. Customers see the new times straight away.',
  'save new about text': 'Replaces the About section on your website with this new text.',
  'save as draft': 'Keeps this as a draft. Nothing changes on your live website.',
  'save & publish': 'Saves this and publishes it to your live website for customers to see.',
  'cancel': 'Closes this without saving anything.',
  'close': 'Closes this panel. Unsaved changes are kept until you leave the page.',
  'reset': 'Puts these settings back to the defaults. Save afterwards to make it permanent.',
  'delete': 'Permanently deletes this item. This cannot be undone.',
  'remove': 'Removes this item from the list. Save to make the change permanent.',
  'remove section': 'Removes this section from your page. Save to apply it to your live site.',
  'move up': 'Moves this item one place higher on the page.',
  'move down': 'Moves this item one place lower on the page.',
  'undo': 'Undoes your last change.',
  'redo': 'Re-applies the change you just undid.',
  'add': 'Adds this section to your page.',
  'add field': 'Adds a new question to your contact form.',
  'add link': 'Adds a new payment link customers can click to pay you.',
  'add image': 'Opens the image picker so you can upload a photo or choose a stock image.',
  'add day off': 'Blocks out a date so customers cannot book you that day.',
  '+ add a service': 'Adds a service customers can book online, with its own length and price.',
  '+ add line': 'Adds another line item (labour, materials, etc.) to this quote or invoice.',
  'dismiss': 'Hides this message. You can carry on as normal.',
  'done': 'Marks this as done and moves it out of your to-do list.',
  'restore': 'Brings this dismissed item back into your list.',
  'hide': 'Hides this guide for now. You can bring it back later.',
  'dismiss guide': 'Hides the getting-started guide. Your progress is kept.',
  'open': 'Opens this item so you can view or edit it.',
  'apply': 'Applies this crop to your image.',
  'try again': 'Runs this again and gives you a fresh suggestion.',
  'refresh': 'Reloads the latest numbers.',
  'view all': 'Shows the full list.',
  'export': 'Downloads a backup copy of your website settings and content.',
  'export json': 'Downloads your design settings as a JSON file you can keep or re-import.',
  'import': 'Loads settings or content from a file or pasted text into your site.',

  // ── Navigation (dashboard sidebar) ──────────────────────────────────────
  'home': 'Your dashboard: what needs doing today, new leads and quick actions.',
  'website': 'Edit your website: design, sections, pages and content.',
  'leads': 'See enquiries, booking requests and quotes from customers.',
  'marketing': 'AI-written posts, captions and descriptions to promote your business.',
  'growth': 'Weekly suggestions to win more work, plus follow-ups and reviews.',
  'analytics': 'See how many people visit your site and what they click.',
  'settings': 'Business profile, website address, domain, plan and account settings.',
  'open menu': 'Opens the navigation menu.',
  'close menu': 'Closes the navigation menu.',
  'close sidebar': 'Closes the navigation menu.',
  'sign out': 'Signs you out of Business Flow on this device.',
  'owner admin': 'Opens the platform owner tools (only visible to Business Flow staff).',
  'view public page': 'Opens your live website in a new tab, exactly as customers see it.',
  'view live site': 'Opens your live website in a new tab, exactly as customers see it.',
  'view live website': 'Opens your live website in a new tab, exactly as customers see it.',
  'view site': 'Opens this website in a new tab.',
  'back to app': 'Leaves the owner tools and goes back to your own dashboard.',
  'dashboard': 'Goes to your dashboard.',
  'users': 'Lists every business account on the platform.',
  'discounts': 'Create and manage discount codes for plans.',
  'funnel': 'Shows where new users drop off between sign-up and going live.',
  'go to dashboard': 'Goes to your Business Flow dashboard.',

  // ── Onboarding / setup ──────────────────────────────────────────────────
  'continue setup and preview': 'Finishes the setup steps and shows you a preview of your website.',
  'finish website setup': 'Finishes the setup steps so your website can go live.',
  'review & continue': 'Checks your answers, then takes you to the next step.',
  'back to editing': 'Goes back so you can change your answers.',
  "don't use a template": 'Starts with a plain layout instead of a ready-made template.',
  'no photo for now': 'Skips the photo. You can add one later from the website editor.',
  'complete setup to preview': 'Finish the setup steps first; then you can preview your site here.',
  'preview site': 'Opens a preview of your website so you can check it before customers do.',
  'desktop preview': 'Shows how your site looks on a computer screen.',
  'tablet preview': 'Shows how your site looks on a tablet.',
  'mobile preview': 'Shows how your site looks on a phone.',
  'centered': 'Uses a centred hero layout with the headline in the middle.',
  'split hero': 'Uses a split hero layout with text on one side and a photo on the other.',
  'square': 'Gives buttons square corners.',
  'rounded': 'Gives buttons softly rounded corners.',
  'pill': 'Gives buttons fully rounded, pill-shaped ends.',
  'remove background image': 'Removes the background photo from this section.',

  // ── Images ──────────────────────────────────────────────────────────────
  'change': 'Replaces this image with a different one.',
  'upload': 'Upload a photo from your device.',
  'stock photos': 'Browse free stock photos you can use on your site.',
  'url': 'Use an image from a web address.',
  'use this image': 'Puts the selected image on your website.',
  'close image picker': 'Closes the image picker without changing your image.',

  // ── Quotes & invoices ───────────────────────────────────────────────────
  'new quote': 'Starts a new quote you can send to a customer.',
  'new invoice': 'Starts a new invoice you can send to a customer.',
  'download pdf': 'Downloads this quote or invoice as a PDF you can print or attach.',
  'pdf': 'Downloads this quote or invoice as a PDF.',
  'email to customer': 'Emails this quote or invoice to the customer with a PDF attached.',

  // ── Bookings ────────────────────────────────────────────────────────────
  'booking settings': 'Set the services, hours and days customers can book online.',
  'take bookings online': 'Turn on online bookings so customers can request a time from your website.',
  '.ics': 'Downloads a calendar file so you can add this booking to your calendar.',
  'add to my calendar (.ics)': 'Downloads a calendar file so you can add this booking to your calendar.',
  'request booking': 'Sends your booking request to the business. They will confirm it with you.',

  // ── Reviews ─────────────────────────────────────────────────────────────
  'approve & publish': 'Approves this review and shows it on your website.',
  'reject': 'Rejects this review. It will not appear on your website.',
  'paste reviews': 'Paste in reviews from Google or elsewhere to show them on your site.',
  'leave a review': 'Opens a short form to leave a review for this business.',
  'send review': 'Sends your review. It appears once the business approves it.',

  // ── Payments ────────────────────────────────────────────────────────────
  'create a stripe account': 'Opens Stripe so you can set up an account to take card payments.',
  'stripe account': 'Opens your Stripe dashboard in a new tab.',
  'buy now': 'Takes you to a secure checkout to pay for this.',
  'pay now': 'Takes you to a secure checkout to pay the business.',

  // ── AI / marketing ──────────────────────────────────────────────────────
  'generate': 'Uses AI to write a draft for you. Nothing is published until you save it.',
  'generate post': 'Uses AI to write a Google Business post you can copy.',
  'generate caption': 'Uses AI to write a social media caption you can copy.',
  'generate with ai': 'Uses AI to write draft items for you to review before saving.',
  'generate report': 'Analyses your site and leads and suggests ways to win more work.',
  'draft improvement': 'Uses AI to draft a fix for this suggestion. You review it before it goes live.',
  'get a key': 'Opens Google AI Studio in a new tab to get a free AI key.',
  'copy to clipboard': 'Copies this text so you can paste it elsewhere.',
  'copy': 'Copies this text so you can paste it elsewhere.',
  'copied': 'Copied! Paste it wherever you need it.',
  'copy value': 'Copies this DNS value so you can paste it at your domain provider.',
  'copy link': 'Copies your website link so you can share it.',
  'copy details': "Copies the customer's details so you can paste them elsewhere.",
  'open in email client': 'Opens your email app with a reply to this customer ready to go.',
  'add as faq': 'Adds this as a question and answer on your website.',
  'add as service': 'Adds this to the services listed on your website.',
  'apply cta': 'Uses this as the main call-to-action button on your website.',
  'apply to hero': 'Uses this as the headline at the top of your website.',
  'insert as section': 'Adds this as a new section on your website.',
  'open inbox': 'Goes to your leads inbox.',
  'review services': 'Opens your services so you can check names and prices.',
  'preview changes': 'Shows what will change before anything is saved.',
  'open pages': 'Opens your extra pages so you can see the new draft.',
  'update my prices': 'Uses AI to suggest updated prices for your services. You choose which to keep.',
  'refresh my about section': 'Uses AI to rewrite your About section. You review it before saving.',
  'prepare a proposal': 'Uses AI to suggest a new headline. Nothing changes until you approve it.',
  'approve and update live headline': 'Approves this headline and updates your live website straight away.',
  'close proposal': 'Closes this suggestion without changing your website.',
  'review proposal': 'Opens the suggested change so you can approve or reject it.',
  'undo headline change': 'Puts your previous headline back on your live website.',
  'retry unconfirmed change': 'Tries the change again because it was not confirmed last time.',
  'reload change history': 'Reloads the list of recent changes.',
  'reload history': 'Reloads the list of recent changes.',
  'open homepage editor': 'Opens the editor for your homepage.',
  'open in website': 'Opens this in the website editor.',

  // ── Settings / domain / plan ────────────────────────────────────────────
  'check dns': 'Checks whether your domain records are set up correctly.',
  'create mapping': 'Connects your own domain to your Business Flow website.',
  'refresh status': 'Checks again whether your domain is connected and secure.',
  'start google verification': 'Starts proving to Google that you own this domain.',
  "i've added the record — confirm": 'Tell us you have added the DNS record so we can confirm ownership.',
  'deploy': 'Publishes your site so customers can see it.',
  'download png': 'Downloads your QR code as an image for flyers, vans and business cards.',
  'qr code': 'Shows a QR code customers can scan to open your website.',
  'open in new tab': 'Opens this in a new browser tab.',
  'manage subscription': 'Opens Stripe to change your plan, card or billing details.',
  'view plans': 'Compares plans and what each one includes.',
  'upgrade': 'Shows the paid plans that unlock this feature.',
  'upgrade to pro': 'Starts the Pro plan checkout to unlock more features.',
  'upgrade to business': 'Starts the Business plan checkout to unlock every feature.',
  'delete account': 'Permanently deletes your account, website and data. This cannot be undone.',
  'create code': 'Creates a new discount code customers can use at checkout.',
  'new page': 'Adds a new page to your website (for example an FAQ or Gallery page).',

  // ── SEO ─────────────────────────────────────────────────────────────────
  'edit seo title & description': 'Edits the title and description Google shows for your site.',
  'edit services & text': 'Edits your services and page text so Google understands what you do.',
  'set service area': 'Sets the areas you work in so locals can find you.',
  'test it with google': "Opens Google's test tool to check how your site appears in search.",

  // ── Public / marketing site ─────────────────────────────────────────────
  'get started': 'Create a free account and build your website in a few minutes.',
  'get started free': 'Create a free account and build your website in a few minutes.',
  'start building — free': 'Create a free account and build your website in a few minutes.',
  'see pricing': 'Compares the plans and what each one costs.',
  'sign in': 'Sign in to your Business Flow account.',
  'create account': 'Creates your free Business Flow account.',
  'create one': 'Switches to the sign-up form so you can create an account.',
  'continue with google': 'Signs in or creates an account using your Google account.',
  'forgot password?': 'Emails you a link to reset your password.',
  'businessflow studio': 'Goes to the Business Flow home page.',
  'go to businessflow': 'Learn about Business Flow, the website builder this site was made with.',
  'privacy policy': 'Reads how your information is collected and used.',
  'privacy': 'Reads how your information is collected and used.',
  'terms of service': 'Reads the terms for using this service.',
  'terms': 'Reads the terms for using this service.',
  'back to home': 'Goes back to the home page.',
  'back to site': 'Goes back to the main website.',
  'go back to site': 'Goes back to the main website.',
  'accept': 'Allows optional cookies that help improve the site.',
  'decline': 'Only uses the cookies the site needs to work.',
  'about': 'Jumps to the About section.',
  'services': 'Jumps to the list of services.',
  'contact': 'Jumps to the contact form.',
  'firebase privacy policy': 'Opens Google Firebase’s privacy policy in a new tab.',
  'gemini api terms': 'Opens the Google Gemini API terms in a new tab.',
  'google cloud privacy notice': 'Opens the Google Cloud privacy notice in a new tab.',
  'stripe privacy policy': 'Opens Stripe’s privacy policy in a new tab.',
  'submit form': 'Preview only: shows how the submit button looks to customers.',
  'unsplash licence': 'Reads the licence for the free stock photos used here.',
};

/** Patterns for dynamic labels. First match wins. */
export const RULES: [RegExp, string][] = [
  [/^(saving|publishing|sending|working|checking|confirming|mapping|starting|generating|drafting|analysing|please wait)\b/, 'Working on it — please wait a moment.'],
  [/^copied/, 'Copied! Paste it wherever you need it.'],
  [/^accept booking for /, 'Accepts this booking and lets the customer know.'],
  [/^decline booking for /, 'Declines this booking and lets the customer know.'],
  [/^save \d+ price changes?$/, 'Updates these prices on your live website.'],
  [/^save /, 'Saves your changes to this section.'],
  [/^add /, 'Adds a new item to this list. Save to keep it.'],
  [/^generate /, 'Uses AI to write a draft for you. Nothing is published until you save it.'],
  [/^write a .* special post$/, 'Uses AI to write a seasonal special post you can publish.'],
  [/^do this /, 'Takes you to the place to finish this checklist step.'],
  [/^(show|hide) dismissed/, 'Shows or hides suggestions you have dismissed.'],
  [/^(publish|go live)/, 'Publishes your site so customers can see it.'],
  [/^\d+d$/, 'Shows stats for this many days.'],
  [/^photo by /, 'Opens the photographer’s page on Unsplash.'],
  [/^(close|✕|×)$/, 'Closes this without saving anything.'],
];

/** Normalise a label for lookup: lower-case, no icons/emoji/arrows/counts. */
export function normaliseLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\(\d+\)/g, ' ')
    .replace(/[←→↗↑↓·]|&larr;/g, ' ')
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, ' ')
    .replace(/[!…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Accessible name used to look up a tip: aria-label, else text minus icons. */
export function tipLabelFor(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('mat-icon, .material-icons, [aria-hidden="true"], svg, .bf-tip').forEach(n => n.remove());
  return clone.textContent || '';
}

export function resolveTip(explicit: string | undefined | null, label: string, title?: string | null): string | null {
  if (explicit) return TIPS[normaliseLabel(explicit)] ?? explicit;
  const key = normaliseLabel(label);
  if (key) {
    if (TIPS[key]) return TIPS[key];
    // Strip a trailing count like "Leads 3" or "Website 12".
    const noCount = key.replace(/\s+\d+$/, '');
    if (TIPS[noCount]) return TIPS[noCount];
    for (const [re, tip] of RULES) if (re.test(key)) return tip;
  }
  return title || null;
}

// Keys used via explicit bfTip="…" (public tenant sites, dynamic labels).
Object.assign(TIPS, {
  'public:contact': 'Jumps to the contact form so you can send an enquiry or ask for a quote.',
  'public:services': 'Jumps to the list of services and prices.',
  'public:about': 'Jumps to the About section to learn more about this business.',
  'public:submit': 'Sends your enquiry to the business. They will get back to you soon.',
  'public:send-another': 'Clears the form so you can send another enquiry.',
  'action:go': 'Takes you straight to where you can do this.',
  'publish': 'Publishes your site so customers can see it.',
} satisfies Record<string, string>);
