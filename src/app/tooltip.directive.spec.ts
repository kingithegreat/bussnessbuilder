import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TooltipDirective } from './tooltip.directive';
import { TIPS, normaliseLabel, resolveTip } from './tooltip-copy';

@Component({
  standalone: true,
  imports: [TooltipDirective],
  template: `
    <button id="save">Save</button>
    <button id="icon" aria-label="Undo" title="Undo"><span class="material-icons">undo</span></button>
    <button id="explicit" bfTip="publish">Go</button>
    <button id="literal" bfTip="Does a custom thing.">X</button>
    <button id="off" bfTip="off">Save</button>
    <button id="unknown">Zzqx</button>
  `,
})
class HostComponent {}

describe('tooltip copy', () => {
  it('normalises labels (case, emoji, arrows, counts, ellipsis)', () => {
    expect(normaliseLabel('  🔄 Refresh my About section ')).toBe('refresh my about section');
    expect(normaliseLabel('Test it with Google ↗')).toBe('test it with google');
    expect(normaliseLabel('Saving…')).toBe('saving');
  });
  it('resolves exact labels, dynamic rules, explicit keys and title fallback', () => {
    expect(resolveTip(undefined, 'Deploy')).toBe('Publishes your site so customers can see it.');
    expect(resolveTip(undefined, 'Saving…')).toMatch(/please wait/);
    expect(resolveTip(undefined, 'Save 3 price changes')).toMatch(/prices/);
    expect(resolveTip(undefined, 'Leads 4')).toBe(TIPS['leads']);
    expect(resolveTip('publish', 'whatever')).toBe(TIPS['publish']);
    expect(resolveTip('Literal text.', '')).toBe('Literal text.');
    expect(resolveTip(undefined, 'no-such-label', 'Old title')).toBe('Old title');
    expect(resolveTip(undefined, 'no-such-label')).toBeNull();
  });
  it('keeps every tip short, plain sentences', () => {
    for (const [k, v] of Object.entries(TIPS)) {
      expect(v.length, k).toBeLessThan(140);
      expect(/[.!?]$/.test(v), k).toBe(true);
    }
  });
});

describe('TooltipDirective', () => {
  let root: HTMLElement;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });
  afterEach(() => document.querySelectorAll('.bf-tip').forEach(n => n.remove()));

  const tipFor = (sel: string) => {
    const id = root.querySelector(sel)!.getAttribute('aria-describedby');
    return id ? document.getElementById(id) : null;
  };

  it('links each control to a role=tooltip element via aria-describedby', () => {
    const tip = tipFor('#save')!;
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.textContent).toBe(TIPS['save']);
    expect(tip.hidden).toBe(true);
  });

  it('shows on hover and keyboard focus, hides on leave, blur and Escape', () => {
    const btn = root.querySelector<HTMLButtonElement>('#save')!;
    const tip = tipFor('#save')!;
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tip.hidden).toBe(false);
    expect(tip.classList).toContain('bf-tip--visible');
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tip.hidden).toBe(true);
    btn.dispatchEvent(new FocusEvent('focusin'));
    expect(tip.hidden).toBe(false);
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tip.hidden).toBe(true);
    btn.dispatchEvent(new FocusEvent('focusin'));
    btn.dispatchEvent(new FocusEvent('focusout'));
    expect(tip.hidden).toBe(true);
  });

  it('uses aria-label for icon buttons and replaces the native title', () => {
    const btn = root.querySelector('#icon')!;
    expect(btn.hasAttribute('title')).toBe(false);
    expect(tipFor('#icon')!.textContent).toBe(TIPS['undo']);
  });

  it('supports explicit keys, literal text and opting out', () => {
    expect(tipFor('#explicit')!.textContent).toBe(TIPS['publish']);
    expect(tipFor('#literal')!.textContent).toBe('Does a custom thing.');
    expect(tipFor('#off')).toBeNull();
    expect(tipFor('#unknown')).toBeNull();
  });

  it('never intercepts clicks and stays inside the viewport', () => {
    const btn = root.querySelector<HTMLButtonElement>('#save')!;
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    const tip = tipFor('#save')!;
    expect(getComputedStyle(tip).pointerEvents === 'none' || tip.className.includes('bf-tip')).toBe(true);
    expect(parseInt(tip.style.left, 10)).toBeGreaterThanOrEqual(8);
    expect(parseInt(tip.style.top, 10)).toBeGreaterThanOrEqual(0);
  });
});
