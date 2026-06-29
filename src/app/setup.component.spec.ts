import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { SetupWizardComponent } from './setup.component';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';

describe('SetupWizardComponent — preview-before-publish gate', () => {
  let completeSetupCalls: number;
  let navigated: unknown[] | null;

  const dataStub = {
    updateProfile: () => { /* noop */ },
    setServices: () => { /* noop */ },
    setFaqs: () => { /* noop */ },
    setSiteSlug: () => { /* noop */ },
    completeSetup: () => { completeSetupCalls++; },
  };
  const aiStub = {
    generateBusinessDescription: async () => 'desc',
    getPresetServices: () => [],
  };
  const authStub = {
    currentUser: () => null,
    getIdToken: async () => null,
  };
  const httpStub = { post: () => of({ slug: 'apex' }) };
  const routerStub = { navigate: async (cmds: unknown[]) => { navigated = cmds; return true; } };

  function makeComponent(): SetupWizardComponent {
    TestBed.configureTestingModule({
      providers: [
        { provide: DataService, useValue: dataStub },
        { provide: AiService, useValue: aiStub },
        { provide: AuthService, useValue: authStub },
        { provide: HttpClient, useValue: httpStub },
        { provide: Router, useValue: routerStub },
      ],
    });
    return TestBed.createComponent(SetupWizardComponent).componentInstance;
  }

  beforeEach(() => {
    completeSetupCalls = 0;
    navigated = null;
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
});
