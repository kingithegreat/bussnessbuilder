import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SetupWizardComponent } from './setup.component';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { SlugService } from './slug.service';
import { FunnelService } from './funnel.service';
import { SETUP_DRAFT_KEY } from './setup-draft';

/** UX audit F12: phones get a pinned "Review & continue" and a collapsed live preview. */
describe('Setup wizard on phones (F12)', () => {
  function render() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SetupWizardComponent],
      providers: [
        { provide: DataService, useValue: { updateProfile: () => undefined, setServices: () => undefined, setFaqs: () => undefined, setSiteSlug: () => undefined, completeSetup: () => undefined, exportState: () => '{}' } },
        { provide: AiService, useValue: { generateBusinessDescription: async () => '', getPresetServices: () => [] } },
        { provide: AuthService, useValue: { isLoggedIn: () => false, currentUser: () => null, getIdToken: async () => null } },
        { provide: SlugService, useValue: { claimIfMissing: async () => 'x' } },
        { provide: HttpClient, useValue: { post: () => of({}), get: () => of({}) } },
        { provide: Router, useValue: { navigate: async () => true } },
        { provide: FunnelService, useValue: { step: () => undefined, flag: () => undefined, flushNow: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(SetupWizardComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  beforeEach(() => localStorage.clear());

  it('pins a "Review & continue" bar for phones and keeps the desktop button for large screens', () => {
    const { el } = render();
    const bar = el.querySelector('[data-testid="mobile-review-bar"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.className).toContain('fixed');
    expect(bar.className).toContain('lg:hidden');
    expect(bar.textContent).toContain('Review & continue');
    const inline = Array.from(el.querySelectorAll('form button')).find(b => b.textContent?.includes('Review & continue'));
    expect(inline?.parentElement?.className).toContain('hidden lg:flex');
  });

  it('the pinned button runs the same review step', () => {
    const { fixture, el } = render();
    const spy = vi.spyOn(fixture.componentInstance, 'onReview');
    (el.querySelector('[data-testid="mobile-review-bar"] button') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('hides the live preview on phones with no toggle until a field is filled', () => {
    const { fixture, el } = render();
    const preview = el.querySelector('[data-testid="live-preview"]') as HTMLElement;
    expect(preview.className).toContain('max-lg:hidden');
    expect(preview.className).toContain('lg:h-[800px]');
    expect(el.querySelector('[data-testid="preview-toggle"]')).toBeNull();
    fixture.componentInstance.form.patchValue({ name: 'Apex Cleaners' });
    fixture.detectChanges();
    const toggle = el.querySelector('[data-testid="preview-toggle"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain('Show live preview');
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(preview.className).not.toContain('max-lg:hidden');
    expect(preview.className).toContain('rounded-[2rem]');
    toggle.click(); fixture.detectChanges();
    expect(preview.className).toContain('max-lg:hidden');
  });

  it('offers the preview toggle straight away when a saved draft is resumed', () => {
    localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({ name: 'Apex', type: '', tagline: '', email: '', phone: '', serviceArea: '' }));
    const { el } = render();
    expect(el.querySelector('[data-testid="preview-toggle"]')).not.toBeNull();
  });
});
