import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CookieConsentComponent } from './cookie-consent.component';

/**
 * Hydration-safety contract for the cookie banner (see provideClientHydration
 * in app.config.ts): the component's FIRST render must be empty — identical to
 * the server-rendered DOM — and the banner may only appear via afterNextRender,
 * i.e. after hydration has completed.
 */
describe('CookieConsentComponent (hydration-safe reveal)', () => {
  beforeEach(async () => {
    localStorage.removeItem('cookie-consent');
    await TestBed.configureTestingModule({
      imports: [CookieConsentComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function flushAfterNextRender() {
    // afterNextRender callbacks run at the end of an ApplicationRef tick.
    TestBed.inject(ApplicationRef).tick();
  }

  it('does not reveal synchronously in the constructor (server-render-safe)', () => {
    // The old bug: the constructor read localStorage and set visible
    // synchronously. The contract is that visible stays false until an
    // afterNextRender hook runs (which never happens on the server). Note:
    // under the zoneless TestBed, detectChanges() itself flushes
    // afterNextRender hooks, so the pre-hook state is only observable
    // before the first detectChanges().
    const fixture = TestBed.createComponent(CookieConsentComponent);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('reveals the banner after render when no consent is stored', () => {
    const fixture = TestBed.createComponent(CookieConsentComponent);
    fixture.detectChanges();
    flushAfterNextRender();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('essential cookies');
  });

  it('stays hidden when consent was already recorded', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    const fixture = TestBed.createComponent(CookieConsentComponent);
    fixture.detectChanges();
    flushAfterNextRender();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('accept() persists the choice and hides the banner', () => {
    const fixture = TestBed.createComponent(CookieConsentComponent);
    fixture.detectChanges();
    flushAfterNextRender();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    (buttons[1] as HTMLButtonElement).click(); // Accept
    fixture.detectChanges();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('decline() persists the choice and hides the banner', () => {
    const fixture = TestBed.createComponent(CookieConsentComponent);
    fixture.detectChanges();
    flushAfterNextRender();
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click(); // Decline
    fixture.detectChanges();
    expect(localStorage.getItem('cookie-consent')).toBe('declined');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
