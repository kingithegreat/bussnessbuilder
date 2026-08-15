import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SetupWizardComponent } from './setup.component';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { SlugService } from './slug.service';
import { SETUP_DRAFT_KEY, PENDING_PUBLISH_KEY } from './setup-draft';

describe('SetupWizardComponent — preview-before-publish gate', () => {
  let completeSetupCalls: number;
  let navigated: unknown[] | null;
  let loggedIn: boolean;
  let claimCalls: number;

  const dataStub = {
    updateProfile: () => { /* noop */ },
    setServices: () => { /* noop */ },
    setFaqs: () => { /* noop */ },
    setSiteSlug: () => { /* noop */ },
    completeSetup: () => { completeSetupCalls++; },
    exportState: () => '{"profile":{"name":"Apex"}}',
  };
  const aiStub = {
    generateBusinessDescription: async () => 'desc',
    getPresetServices: () => [],
  };
  const authStub = {
    isLoggedIn: () => loggedIn,
    currentUser: () => (loggedIn ? { uid: 'u1' } : null),
    getIdToken: async () => (loggedIn ? 'tok' : null),
  };
  const slugStub = { claimIfMissing: async () => { claimCalls++; return 'apex'; } };
  const httpStub = { post: () => of({ slug: 'apex' }) };
  const routerStub = { navigate: async (cmds: unknown[]) => { navigated = cmds; return true; } };

  function makeComponent(): SetupWizardComponent {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: dataStub },
        { provide: AiService, useValue: aiStub },
        { provide: AuthService, useValue: authStub },
        { provide: SlugService, useValue: slugStub },
        { provide: HttpClient, useValue: httpStub },
        { provide: Router, useValue: routerStub },
      ],
    });
    return TestBed.createComponent(SetupWizardComponent).componentInstance;
  }

  beforeEach(() => {
    completeSetupCalls = 0;
    claimCalls = 0;
    navigated = null;
    loggedIn = true;
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('onReview with an invalid form shows an error and does not open the gate', () => {
    const c = makeComponent();
    c.onReview();
    expect(c.reviewing()).toBe(false);
    expect(c.formError()).toContain('Please fill in');
  });

  it('onReview with a valid form opens the gate but does NOT publish', () => {
    const c = makeComponent();
    c.form.setValue({ name: 'Apex', type: 'cleaner', tagline: '', email: 'a@b.com', phone: '', serviceArea: '' });
    c.onReview();
    expect(c.reviewing()).toBe(true);
    expect(c.formError()).toBe('');
    expect(completeSetupCalls).toBe(0); // publish must not happen on review
  });

  it('onBackToEdit closes the gate without publishing', () => {
    const c = makeComponent();
    c.reviewing.set(true);
    c.onBackToEdit();
    expect(c.reviewing()).toBe(false);
    expect(completeSetupCalls).toBe(0);
  });

  it('onConfirmPublish completes setup and navigates to the dashboard', async () => {
    const c = makeComponent();
    c.form.setValue({ name: 'Apex', type: 'cleaner', tagline: '', email: 'a@b.com', phone: '', serviceArea: '' });
    await c.onConfirmPublish();
    expect(completeSetupCalls).toBe(1);
    expect(navigated).toEqual(['/admin/dashboard']);
  });

  it('selectedTypeLabel returns the preset label for the chosen type', () => {
    const c = makeComponent();
    c.form.patchValue({ type: 'cleaner' });
    expect(c.selectedTypeLabel().length).toBeGreaterThan(0);
  });

  it('claims a slug when publishing while logged in', async () => {
    const c = makeComponent();
    c.form.setValue({ name: 'Apex', type: 'cleaner', tagline: '', email: 'a@b.com', phone: '', serviceArea: '' });
    await c.onConfirmPublish();
    expect(claimCalls).toBe(1);
  });

  describe('logged-out visitor (wizard before account)', () => {
    beforeEach(() => { loggedIn = false; });

    it('finishes the wizard, stashes the site and routes to sign-up', async () => {
      const c = makeComponent();
      c.form.setValue({ name: 'Apex', type: 'cleaner', tagline: '', email: 'a@b.com', phone: '', serviceArea: '' });
      await c.onConfirmPublish();

      expect(completeSetupCalls).toBe(1);
      expect(navigated).toEqual(['/signup']);
      // businessflow_state is the key DataService.init() migrates on first login.
      expect(localStorage.getItem('businessflow_state')).toBe(dataStub.exportState());
      expect(localStorage.getItem(PENDING_PUBLISH_KEY)).toBe('1');
    });

    it('does not try to claim a slug before an account exists', async () => {
      const c = makeComponent();
      c.form.setValue({ name: 'Apex', type: 'cleaner', tagline: '', email: 'a@b.com', phone: '', serviceArea: '' });
      await c.onConfirmPublish();
      expect(claimCalls).toBe(0);
    });
  });

  describe('draft persistence', () => {
    it('restores a saved draft into the form', () => {
      localStorage.setItem(SETUP_DRAFT_KEY, JSON.stringify({
        name: 'Restored Co', type: 'cleaner', tagline: 'Tag', email: 'r@c.com', phone: '', serviceArea: 'Akl',
      }));
      const c = makeComponent();
      c.ngOnInit();
      expect(c.form.value.name).toBe('Restored Co');
      expect(c.form.value.serviceArea).toBe('Akl');
    });

    it('saves keystrokes so a refresh does not empty the wizard', () => {
      const c = makeComponent();
      c.ngOnInit();
      c.form.patchValue({ name: 'Half Typed' });
      expect(localStorage.getItem(SETUP_DRAFT_KEY)).toContain('Half Typed');
    });

    it('progress reflects what is filled in, starting at 0', () => {
      const c = makeComponent();
      c.ngOnInit();
      expect(c.progress()).toBe(0);
      c.form.patchValue({ name: 'Apex', type: 'cleaner', email: 'a@b.com' });
      expect(c.progress()).toBeGreaterThan(0);
    });
  });

  describe('tagline auto-fill follows the chosen type', () => {
    it('replaces a previous preset tagline when the type changes', () => {
      const c = makeComponent();
      c.ngOnInit();
      c.form.patchValue({ type: 'cleaner' });
      const cleanerTagline = c.form.value.tagline;
      expect(cleanerTagline).toBeTruthy();

      c.form.patchValue({ type: 'barber' });
      expect(c.form.value.tagline).not.toBe(cleanerTagline);
      expect(c.form.value.tagline).toBeTruthy();
    });

    it("never overwrites a tagline the owner typed", () => {
      const c = makeComponent();
      c.ngOnInit();
      c.form.patchValue({ tagline: 'Golf tours of the North Island' });
      c.form.patchValue({ type: 'cleaner' });
      expect(c.form.value.tagline).toBe('Golf tours of the North Island');
    });

    it("clears the auto-fill for a type with no preset, rather than inheriting the last trade's line", () => {
      const c = makeComponent();
      c.ngOnInit();
      c.form.patchValue({ type: 'cleaner' });
      expect(c.form.value.tagline).toBeTruthy();
      c.form.patchValue({ type: 'other' });
      expect(c.form.value.tagline).toBe('');
    });
  });

});
