import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, PLATFORM_ID, inject, input } from '@angular/core';
import { resolveTip, tipLabelFor } from './tooltip-copy';

let nextId = 0;
const LONG_PRESS_MS = 450;
const TOUCH_HIDE_MS = 2500;
const GAP = 8;
const EDGE = 8;
/** Hover show delay (NN/g, Material 3: ~300–500 ms) so sweeping the pointer
 *  across a toolbar doesn't flash a tip on every control. Focus is instant. */
const HOVER_DELAY_MS = 400;
/** Only one tooltip on screen at a time (Material 3). */
let activeTip: TooltipDirective | null = null;

/**
 * Accessible hover/focus/long-press tooltip for every button and link.
 *
 * - Applies automatically to `<button>`, `<a href>` / `<a routerLink>` and any
 *   element with `bfTip`. Copy comes from `bfTip` (a key in TIPS or literal
 *   text) or, failing that, from the control's visible label / aria-label via
 *   the central copy table in tooltip-copy.ts.
 * - Wires `aria-describedby` to a `role="tooltip"` element, so screen readers
 *   hear the explanation; any existing `title` is folded in (no double native
 *   tooltip).
 * - `pointer-events: none` so it never blocks clicks; Escape dismisses;
 *   flips below / clamps horizontally near viewport edges; CSS honours
 *   prefers-reduced-motion. Opt out with `bfTip="off"`.
 */
@Directive({
  // Attribute/element selector on purpose: every button and link gets a tip.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'button, a[href], a[routerLink], [bfTip]',
  standalone: true,
})
export class TooltipDirective implements AfterViewInit, OnDestroy {
  readonly bfTip = input<string | undefined>(undefined);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private tipEl: HTMLElement | null = null;
  private readonly id = `bf-tip-${++nextId}`;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private titleText: string | null = null;
  private readonly cleanups: (() => void)[] = [];

  ngAfterViewInit(): void {
    if (!this.browser) return;
    const el = this.host.nativeElement;
    const title = el.getAttribute('title');
    if (title) { this.titleText = title; el.removeAttribute('title'); }
    this.refresh();
    const on = (type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      this.cleanups.push(() => el.removeEventListener(type, fn, opts));
    };
    on('mouseenter', () => {
      this.clearHover();
      this.hoverTimer = setTimeout(() => this.show(), HOVER_DELAY_MS);
    });
    on('mouseleave', () => this.hide());
    on('focusin', () => this.show());
    on('focusout', () => this.hide());
    on('keydown', e => { if ((e as KeyboardEvent).key === 'Escape') this.hide(); });
    on('touchstart', () => {
      this.clearPress();
      this.pressTimer = setTimeout(() => this.show(TOUCH_HIDE_MS), LONG_PRESS_MS);
    }, { passive: true });
    on('touchend', () => this.clearPress(), { passive: true });
    on('touchmove', () => this.clearPress(), { passive: true });
  }

  /** The current tooltip text for this control, or null when there is none. */
  text(): string | null {
    const explicit = this.bfTip();
    if (explicit === 'off') return null;
    const el = this.host.nativeElement;
    return resolveTip(explicit, tipLabelFor(el), this.titleText);
  }

  private refresh(): string | null {
    const text = this.text();
    const el = this.host.nativeElement;
    if (!text) { this.detach(); return null; }
    if (!this.tipEl) {
      const tip = this.doc.createElement('div');
      tip.id = this.id;
      tip.setAttribute('role', 'tooltip');
      tip.className = 'bf-tip';
      tip.hidden = true;
      this.doc.body.appendChild(tip);
      this.tipEl = tip;
      const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!ids.includes(this.id)) el.setAttribute('aria-describedby', [...ids, this.id].join(' '));
    }
    if (this.tipEl.textContent !== text) this.tipEl.textContent = text;
    return text;
  }

  show(autoHideMs?: number): void {
    if (!this.browser || !this.refresh() || !this.tipEl) return;
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (activeTip && activeTip !== this) activeTip.hide();
    // Module-level "currently open tip" pointer, not an alias for closures.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    activeTip = this;
    const tip = this.tipEl;
    tip.hidden = false;
    tip.classList.remove('bf-tip--below');
    this.position();
    tip.classList.add('bf-tip--visible');
    if (autoHideMs) this.hideTimer = setTimeout(() => this.hide(), autoHideMs);
  }

  hide(): void {
    this.clearPress();
    this.clearHover();
    if (activeTip === this) activeTip = null;
    if (!this.tipEl) return;
    this.tipEl.classList.remove('bf-tip--visible');
    this.tipEl.hidden = true;
  }

  private clearHover(): void {
    if (this.hoverTimer) { clearTimeout(this.hoverTimer); this.hoverTimer = null; }
  }

  private position(): void {
    const tip = this.tipEl!;
    const win = this.doc.defaultView;
    const vw = win?.innerWidth ?? 1024;
    const r = this.host.nativeElement.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let top = r.top - th - GAP;
    if (top < EDGE) { top = r.bottom + GAP; tip.classList.add('bf-tip--below'); }
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(EDGE, Math.min(left, vw - tw - EDGE));
    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
  }

  private clearPress(): void {
    if (this.pressTimer) { clearTimeout(this.pressTimer); this.pressTimer = null; }
  }

  private detach(): void {
    if (!this.tipEl) return;
    const el = this.host.nativeElement;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(i => i && i !== this.id);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
    this.tipEl.remove();
    this.tipEl = null;
  }

  ngOnDestroy(): void {
    this.clearPress();
    this.clearHover();
    if (activeTip === this) activeTip = null;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.cleanups.forEach(fn => fn());
    this.tipEl?.remove();
    this.tipEl = null;
  }
}
