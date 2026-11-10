import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkflowDemoComponent } from './workflow-demo.component';
import { WORKFLOW_STORAGE_KEY } from './service-workflow';

describe('WorkflowDemoComponent', () => {
  beforeEach(() => {
    localStorage.removeItem(WORKFLOW_STORAGE_KEY);
    TestBed.configureTestingModule({ imports: [WorkflowDemoComponent], providers: [provideRouter([])] });
  });

  it('renders the demo banner, branding and sample board', () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('[data-testid="demo-banner"]')?.textContent).toMatch(/No real payments/);
    expect(el.querySelector('[data-testid="biz-name"]')?.textContent).toContain('(sample)');
    expect(el.querySelectorAll('[data-testid^="stage-"]').length).toBe(5);
    expect(el.querySelectorAll('[data-testid^="job-"]').length).toBe(3);
  });

  it('creates a job, advances it and persists to localStorage', () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); const c = f.componentInstance; f.detectChanges();
    c.draft.customerName = 'Demo Person'; c.draft.address = '5 Example Rd'; c.qty = { 'wash-fold': 1 };
    c.submitJob();
    const job = c.selected()!;
    expect(job.ref).toBe('O-0004');
    c.move(job, 1);
    expect(c.selected()!.stageId).toBe('collected');
    const stored = JSON.parse(localStorage.getItem(WORKFLOW_STORAGE_KEY)!);
    expect(stored.jobs[0].customerName).toBe('Demo Person');
    // reload: new instance reads persisted state
    const f2 = TestBed.createComponent(WorkflowDemoComponent);
    expect(f2.componentInstance.state().jobs[0].stageId).toBe('collected');
  });

  it('shows validation errors instead of creating an invalid job', () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); const c = f.componentInstance;
    c.submitJob();
    expect(c.formErrors().length).toBeGreaterThan(0);
    expect(c.state().jobs.length).toBe(3);
  });

  it('re-brands and re-labels via settings for a different business', () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); const c = f.componentInstance;
    c.loadPreset('on-site-service');
    c.edit.business.name = 'Bay Window Cleaning';
    c.edit.stages[1].label = 'Cleaning windows';
    c.saveSettings();
    expect(c.settingsErrors()).toEqual([]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-testid="biz-name"]').textContent).toContain('Bay Window Cleaning');
    expect(f.nativeElement.textContent).toContain('Cleaning windows');
    expect(f.nativeElement.textContent).not.toContain('Cleaning partner');
  });

  it('reordering and adding stages in settings keeps each stage name with its stage', async () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); const c = f.componentInstance;
    c.tab.set('settings'); f.detectChanges(); await f.whenStable();
    const click = async (label: string) => { (f.nativeElement.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement).click(); f.detectChanges(); await f.whenStable(); f.detectChanges(); };
    const addBtn = [...f.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) => b.textContent!.includes('Add stage')) as HTMLButtonElement;
    addBtn.click(); f.detectChanges(); await f.whenStable();
    const input = (n: number) => f.nativeElement.querySelector(`input[aria-label="Stage ${n} name"]`) as HTMLInputElement;
    input(6).value = 'Drying'; input(6).dispatchEvent(new Event('input')); f.detectChanges(); await f.whenStable();
    await click('Move stage 6 up');
    await click('Move stage 5 up');
    const expected = ['Booked', 'Picked up', 'Cleaning & drying', 'Drying', 'Ready', 'Returned'];
    expect(c.edit.stages.map(s => s.label)).toEqual(expected);
    expect([1, 2, 3, 4, 5, 6].map(n => input(n).value)).toEqual(expected);
    c.saveSettings();
    expect(c.settingsErrors()).toEqual([]);
    expect(c.cfg().stages.map(s => s.label)).toEqual(expected);
  });

  it('removing a service in settings keeps the booked line and price on in-flight jobs', async () => {
    const f = TestBed.createComponent(WorkflowDemoComponent); const c = f.componentInstance;
    c.draft.customerName = 'Demo Person'; c.draft.address = '5 Example Rd'; c.qty = { 'wash-fold': 2, 'dry-clean': 1 };
    c.submitJob();
    const id = c.selected()!.id;
    c.tab.set('settings'); f.detectChanges(); await f.whenStable();
    c.edit.services = c.edit.services.filter(s => s.id !== 'dry-clean');
    c.edit.services[0].price = 45;
    c.saveSettings();
    c.tab.set('board'); c.selectedId.set(id); f.detectChanges();
    expect(f.nativeElement.querySelector('[data-testid="job-total"]').textContent).toContain('88.00');
    expect(f.nativeElement.querySelector('[data-testid="job-detail"]').textContent).toContain('Dry cleaning');
  });
});
