import { TestBed } from '@angular/core/testing';
import { ShowcaseLinksComponent } from './showcase-links.component';

/** UX audit F1: the job-workflow demo link must not depend on /api/showcases. */
describe('ShowcaseLinksComponent', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = realFetch; });

  async function render(fetchImpl: typeof fetch) {
    globalThis.fetch = fetchImpl;
    await TestBed.configureTestingModule({ imports: [ShowcaseLinksComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ShowcaseLinksComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('still shows the workflow demo link when the showcases API fails', async () => {
    const el = await render((() => Promise.reject(new Error('offline'))) as unknown as typeof fetch);
    expect(el.querySelector('[data-testid="workflow-demo-link"]')?.getAttribute('href')).toBe('/demo/workflow');
  });

  it('still shows the workflow demo link when the showcases API returns none', async () => {
    const el = await render((() => Promise.resolve(new Response(JSON.stringify({ showcases: [] }), { status: 200 }))) as unknown as typeof fetch);
    expect(el.querySelector('[data-testid="workflow-demo-link"]')).toBeTruthy();
  });

  it('lists showcases alongside the demo link when the API returns them', async () => {
    const body = { showcases: [{ id: 'a', label: 'Mobile Car Detailing', name: 'Kōwhai Coast', path: '/s/demo-kowhai-coast-detailing' }] };
    const el = await render((() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))) as unknown as typeof fetch);
    expect(el.textContent).toContain('Mobile Car Detailing');
    expect(el.querySelector('a[href="/s/demo-kowhai-coast-detailing"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="workflow-demo-link"]')).toBeTruthy();
  });
});
