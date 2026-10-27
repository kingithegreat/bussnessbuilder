import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AiActionsComponent } from './ai-actions.component';
import { SiteChangesService } from './site-changes.service';
import { DataService } from './data.service';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

describe('Quick AI actions reach reviewed changes', () => {
  const currentUser = signal<{ uid: string } | null>({ uid: 'owner' });
  const prepare = vi.fn(), setPages = vi.fn(), generateText = vi.fn();
  let component: AiActionsComponent;
  beforeEach(() => {
    vi.resetAllMocks(); currentUser.set({ uid: 'owner' }); prepare.mockResolvedValue(true); generateText.mockResolvedValue(null);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { currentUser } },
      { provide: DataService, useValue: { profile: () => ({ name: 'Local Mow', type: 'lawn mowing', description: 'Saved About', ctaText: 'Contact us' }), services: () => [{ id: 'mow', name: 'Mowing', price: '$40' }], getPages: () => [], setPages } },
      { provide: AiService, useValue: { generateText } },
      { provide: SiteChangesService, useValue: { busy: signal(false), pending: signal(null), prepare } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ] });
    component = TestBed.runInInjectionContext(() => new AiActionsComponent()); TestBed.tick();
  });
  it('calculates a price preview and submits only the selected change for approval', async () => {
    component.priceAsk = 'Raise all prices by 10%'; await component.previewPrices();
    expect(component.changes()?.[0].newPrice).toBe('$44'); expect(prepare).not.toHaveBeenCalled();
    await component.savePrices();
    expect(prepare).toHaveBeenCalledWith('Raise all prices by 10%', [{ target: 'service', field: 'price', serviceId: 'mow', before: '$40', after: '$44' }]);
  });
  it('turns an exact CTA command into a saved guarded proposal', async () => {
    component.command = 'Set button text to Book now'; await component.runCommand();
    expect(prepare).toHaveBeenCalledWith(component.command, [{ target: 'profile', field: 'ctaText', before: 'Contact us', after: 'Book now' }]);
  });
  it('discards generation from a previous account', async () => {
    let resolve!: (text: string) => void;
    generateText.mockImplementationOnce(() => new Promise<string>(r => { resolve = r; }));
    const work = component.generateAbout();
    currentUser.set({ uid: 'other' }); TestBed.tick(); resolve('Old-account About'); await work;
    expect(component.about()).toBeNull(); expect(prepare).not.toHaveBeenCalled();
  });
  it('does not publish a post with unresolved offer placeholders', () => {
    component.post.set({ title: 'Spring', content: 'Save [your offer here]' }); component.savePost(true);
    expect(setPages).not.toHaveBeenCalled();
    component.post.set({ title: 'Spring', content: 'Contact us about your garden.' }); component.savePost(false);
    expect(setPages.mock.calls[0][0][0].published).toBe(false);
  });
});
