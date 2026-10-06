import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HeadlineChatComponent } from './headline-chat.component';
import { SiteActionService } from './site-action.service';
import { SiteAction } from './site-action';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

function proposal(overrides: Partial<SiteAction> = {}): SiteAction {
  return {
    id: 'proposal-one', type: 'homepage.headline', status: 'prepared',
    before: { tagline: 'We clean homes' }, after: { tagline: 'A fresher home starts with Apex Cleaning' },
    request: 'Improve my homepage headline', reason: 'Names the service and the business clearly.',
    source: 'template', actorUid: 'owner', createdAt: '2026-10-07T01:00:00.000Z', ...overrides,
  };
}

describe('Homepage headline conversation and review', () => {
  let fixture: ComponentFixture<HeadlineChatComponent>;
  let element: HTMLElement;
  const profile = signal({ tagline: 'We clean homes' });
  const complete = signal(true);
  const actions = {
    busy: signal(false), error: signal<string | null>(null), errorCode: signal<string | null>(null),
    recoveryPending: signal(false), retryUnconfirmedChange: vi.fn<() => Promise<boolean>>(),
    draft: signal<SiteAction | null>(null), history: signal<SiteAction[]>([]),
    prepare: vi.fn<(request: string) => Promise<SiteAction | null>>(),
    approve: vi.fn<(id: string) => Promise<boolean>>(),
    undo: vi.fn<(id: string) => Promise<boolean>>(),
    loadHistory: vi.fn<() => Promise<void>>(),
    clearDraft: vi.fn<() => void>(), review: vi.fn<(action: SiteAction) => void>(),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    vi.resetAllMocks();
    profile.set({ tagline: 'We clean homes' }); complete.set(true);
    actions.busy.set(false); actions.error.set(null); actions.errorCode.set(null);
    actions.recoveryPending.set(false);
    actions.draft.set(null); actions.history.set([]);
    actions.loadHistory.mockResolvedValue(undefined);
    actions.retryUnconfirmedChange.mockImplementation(async () => { actions.recoveryPending.set(false); actions.error.set(null); return true; });
    actions.prepare.mockImplementation(async request => {
      const result = proposal({ request }); actions.draft.set(result); actions.history.set([result]); return result;
    });
    actions.approve.mockImplementation(async id => {
      const prepared = actions.history().find(action => action.id === id)!;
      actions.history.set([{ ...prepared, status: 'applied' }]); actions.draft.set(null);
      profile.set({ tagline: prepared.after.tagline }); return true;
    });
    actions.undo.mockImplementation(async id => {
      const applied = actions.history().find(action => action.id === id)!;
      actions.history.set([{ ...applied, status: 'undone' }]);
      profile.set({ tagline: applied.before.tagline }); return true;
    });
    actions.clearDraft.mockImplementation(() => actions.draft.set(null));
    actions.review.mockImplementation(action => actions.draft.set(action));
    TestBed.configureTestingModule({ imports: [HeadlineChatComponent], providers: [provideRouter([]),
      { provide: SiteActionService, useValue: actions },
      { provide: DataService, useValue: { profile, isSetupComplete: complete, siteSlug: signal('apex') } },
      { provide: AuthService, useValue: { currentUser: signal({ uid: 'owner' }) } },
    ] });
    fixture = TestBed.createComponent(HeadlineChatComponent); fixture.detectChanges();
    await fixture.whenStable(); fixture.detectChanges();
    element = fixture.nativeElement;
  });

  async function click(label: string): Promise<void> {
    const button = Array.from(element.querySelectorAll('button')).find(candidate => candidate.textContent?.trim() === label);
    expect(button).toBeDefined(); button!.click(); await fixture.whenStable(); fixture.detectChanges();
  }

  it('prepares a real review without applying it, then changes the headline only after explicit approval', async () => {
    await click('Prepare a proposal');
    expect(actions.prepare).toHaveBeenCalledWith('Improve my homepage headline');
    expect(actions.approve).not.toHaveBeenCalled();
    expect(profile().tagline).toBe('We clean homes');
    expect(element.querySelector('[data-testid="headline-before"]')?.textContent).toContain('We clean homes');
    expect(element.querySelector('[data-testid="headline-after"]')?.textContent).toContain('A fresher home starts with Apex Cleaning');
    expect(element.textContent).toContain('Template proposal');
    expect(element.textContent).toContain('currently published homepage');
    await click('Approve and update live headline');
    expect(actions.approve).toHaveBeenCalledWith('proposal-one');
    expect(profile().tagline).toBe('A fresher home starts with Apex Cleaning');
    expect(element.querySelector('[data-testid="headline-proposal"]')).toBeNull();
    expect(element.textContent).toContain('Headline updated');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('live headline has been updated');
  });

  it('uses the saved proposal and calls undo only for an applied history entry', async () => {
    actions.history.set([proposal({ status: 'applied' }), proposal({ id: 'undone', status: 'undone' })]);
    fixture.detectChanges();
    expect(element.querySelectorAll('li button').length).toBe(1);
    await click('Undo headline change');
    expect(actions.undo).toHaveBeenCalledWith('proposal-one');
    expect(profile().tagline).toBe('We clean homes');
    expect(element.textContent).toContain('Change undone');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('previous headline has been restored');
  });

  it('shows stored history on reload and lets the owner reopen a prepared proposal', async () => {
    expect(actions.loadHistory).toHaveBeenCalledTimes(1);
    actions.loadHistory.mockImplementation(async () => { actions.history.set([proposal()]); });
    await click('Reload history');
    expect(element.textContent).toContain('Proposal awaiting approval');
    await click('Review proposal');
    expect(actions.review).toHaveBeenCalledWith(proposal());
    expect(element.querySelector('[data-testid="headline-proposal"]')).not.toBeNull();
    expect(actions.approve).not.toHaveBeenCalled();
  });

  it('retains a proposal after a failed approval and exposes history recovery and the homepage editor', async () => {
    actions.draft.set(proposal()); actions.history.set([proposal()]);
    actions.approve.mockImplementation(async () => {
      actions.error.set('This headline changed elsewhere. Review it in the homepage editor or prepare a new proposal.');
      actions.errorCode.set('headline_conflict'); return false;
    }); fixture.detectChanges();
    await click('Approve and update live headline');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('changed elsewhere');
    expect(element.querySelector('[data-testid="headline-proposal"]')).not.toBeNull();
    expect(element.querySelector('a[href="/admin/builder"]')).not.toBeNull();
    expect(profile().tagline).toBe('We clean homes');
    await click('Reload change history');
    expect(actions.loadHistory).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="status"]')?.textContent).not.toContain('updated');
  });

  it('displays failed undo without claiming the previous headline was restored', async () => {
    actions.history.set([proposal({ status: 'applied' })]);
    actions.undo.mockImplementation(async () => { actions.error.set('Could not confirm the change. Reload change history and retry.'); return false; });
    fixture.detectChanges(); await click('Undo headline change');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Reload change history');
    expect(element.querySelector('[role="status"]')?.textContent).not.toContain('restored');
    expect(element.textContent).toContain('Headline updated');
  });

  it('disables request, approve and undo controls while a request is in progress', async () => {
    actions.draft.set(proposal()); actions.history.set([proposal({ status: 'applied' })]); actions.busy.set(true);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(element.querySelector('textarea')?.disabled).toBe(true);
    expect(Array.from(element.querySelectorAll('button')).every(button => button.disabled)).toBe(true);
    await fixture.componentInstance.prepare(); await fixture.componentInstance.approve('proposal-one'); await fixture.componentInstance.undo('proposal-one');
    expect(actions.prepare).not.toHaveBeenCalled(); expect(actions.approve).not.toHaveBeenCalled(); expect(actions.undo).not.toHaveBeenCalled();
  });

  it('keeps unsupported requests within a clear scope and routes other changes to Website', async () => {
    const textarea = element.querySelector('textarea')!;
    textarea.value = 'Change my website colours'; textarea.dispatchEvent(new Event('input')); fixture.detectChanges();
    actions.prepare.mockImplementation(async () => { actions.error.set('This assistant currently improves homepage headlines. Use Website for other changes.'); return null; });
    await click('Prepare a proposal');
    expect(actions.prepare).toHaveBeenCalledWith('Change my website colours');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('homepage headlines');
    expect(element.querySelector('a[href="/admin/website"]')?.textContent).toContain('Open in Website');
    expect(actions.approve).not.toHaveBeenCalled();
  });

  it('offers an exact-operation retry while an unconfirmed mutation blocks new changes', async () => {
    actions.recoveryPending.set(true); actions.draft.set(proposal());
    actions.history.set([proposal({ status: 'applied' })]);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('previous headline change has not been confirmed');
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    await fixture.componentInstance.prepare(); await fixture.componentInstance.approve('proposal-one'); await fixture.componentInstance.undo('proposal-one');
    expect(actions.prepare).not.toHaveBeenCalled(); expect(actions.approve).not.toHaveBeenCalled(); expect(actions.undo).not.toHaveBeenCalled();
    actions.retryUnconfirmedChange.mockResolvedValueOnce(false);
    await click('Retry unconfirmed change');
    expect(actions.retryUnconfirmedChange).toHaveBeenCalledTimes(1);
    expect(element.querySelector('[role="status"]')?.textContent).not.toContain('is confirmed');
    expect(actions.recoveryPending()).toBe(true);
    await click('Retry unconfirmed change');
    expect(actions.retryUnconfirmedChange).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('previous headline change is confirmed');
    expect(element.querySelector('[role="alert"]')).toBeNull();
    actions.busy.set(true); actions.recoveryPending.set(true);
    await fixture.componentInstance.retryUnconfirmedChange();
    expect(actions.retryUnconfirmedChange).toHaveBeenCalledTimes(2);
  });

  it('shows the actual public fallback for a blank saved headline and renders proposal copy as text', () => {
    actions.draft.set(proposal({ before: { tagline: '' }, after: { tagline: '<img src=x onerror=alert(1)>' }, source: 'ai' }));
    fixture.detectChanges();
    expect(element.querySelector('[data-testid="headline-before"]')?.textContent).toContain('Professional services you can trust.');
    expect(element.textContent).toContain('uses this default headline');
    expect(element.textContent).toContain('AI proposal');
    expect(element.querySelector('[data-testid="headline-after"]')?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.querySelector('img')).toBeNull();
  });

  it('closes a proposal without approving or removing its saved history', async () => {
    actions.draft.set(proposal()); actions.history.set([proposal()]); fixture.detectChanges();
    await click('Close proposal');
    expect(actions.clearDraft).toHaveBeenCalledTimes(1); expect(actions.approve).not.toHaveBeenCalled();
    expect(actions.history()).toEqual([proposal()]);
    expect(element.querySelector('[data-testid="headline-proposal"]')).toBeNull();
  });

  it('links to the live site only when setup is complete and prevents changing an unpublished site', async () => {
    expect(element.querySelector('a[target="_blank"]')?.getAttribute('href')).toBe('/site/apex');
    complete.set(false); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(element.querySelector('a[target="_blank"]')).toBeNull();
    expect(element.textContent).toContain('Finish website setup');
    expect(element.querySelector('a[href="/setup"]')?.textContent).toContain('Continue setup and preview');
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
    await fixture.componentInstance.prepare(); await fixture.componentInstance.approve('proposal-one'); await fixture.componentInstance.undo('proposal-one');
    expect(actions.prepare).not.toHaveBeenCalled(); expect(actions.approve).not.toHaveBeenCalled(); expect(actions.undo).not.toHaveBeenCalled();
  });
});
