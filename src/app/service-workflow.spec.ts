import {
  WORKFLOW_PRESETS, applyConfig, createJob, gstPortion, initialState, isComplete, jobTotal,
  moveJob, newJobErrors, normaliseConfig, parseState, presetConfig, setPayment, validateConfig,
  WorkflowState,
} from './service-workflow';

const NOW = new Date('2026-11-08T07:00:00Z');
const empty = (preset = 'laundry-pickup'): WorkflowState => ({ config: presetConfig(preset), jobs: [], nextRef: 1 });

describe('service workflow (configurable demo)', () => {
  it('every preset is valid and laundry is only a preset', () => {
    for (const p of WORKFLOW_PRESETS) expect(validateConfig(p.build())).toEqual([]);
    expect(WORKFLOW_PRESETS.map(p => p.id)).toContain('laundry-pickup');
    expect(WORKFLOW_PRESETS.length).toBeGreaterThan(1);
  });

  it('runs a laundry job end-to-end: booked → returned, payment separate', () => {
    let s = createJob(empty(), { customerName: 'Test Person', address: '1 Fake St', partner: 'Sample Dry Cleaners Ltd', lines: [{ serviceId: 'wash-fold', qty: 2 }, { serviceId: 'dry-clean', qty: 1 }] }, NOW);
    const id = s.jobs[0].id;
    expect(s.jobs[0].ref).toBe('O-0001');
    expect(s.jobs[0].stageId).toBe('booked');
    expect(jobTotal(s.config, s.jobs[0])).toBe(88);
    expect(gstPortion(s.config, 88)).toBeCloseTo(11.48, 2);
    for (let i = 0; i < 10; i++) s = moveJob(s, id, 1, NOW);
    expect(s.jobs[0].stageId).toBe('returned');
    expect(isComplete(s.config, s.jobs[0])).toBe(true);
    expect(s.jobs[0].payment).toBe('unpaid');
    s = setPayment(s, id, 'paid', NOW);
    expect(s.jobs[0].payment).toBe('paid');
    expect(s.jobs[0].stageId).toBe('returned');
    expect(s.jobs[0].history.map(h => h.text)).toContain('Moved to Cleaning & drying');
    s = moveJob(s, id, -1, NOW);
    expect(s.jobs[0].stageId).toBe('ready');
  });

  it('validates new jobs against the configured fields', () => {
    const c = presetConfig('laundry-pickup');
    expect(newJobErrors(c, { customerName: '', lines: [] }).length).toBe(3);
    const onsite = presetConfig('on-site-service');
    onsite.usesPickup = false;
    expect(newJobErrors(onsite, { customerName: 'A', lines: [{ serviceId: 'standard', qty: 1 }] })).toEqual([]);
    expect(() => createJob(empty(), { customerName: '', lines: [] })).toThrow();
  });

  it('applying a new config remaps jobs in removed stages and drops removed services', () => {
    let s = createJob(empty(), { customerName: 'A', address: 'x', lines: [{ serviceId: 'duvet', qty: 1 }, { serviceId: 'express', qty: 1 }] }, NOW);
    s = moveJob(moveJob(s, s.jobs[0].id, 1, NOW), s.jobs[0].id, 1, NOW);
    const next = structuredClone(s.config);
    next.stages = next.stages.filter(x => x.id !== 'at-partner');
    next.services = next.services.filter(x => x.id !== 'duvet');
    next.usesPartner = false;
    next.business.name = 'Any Business Ltd';
    s = applyConfig(s, next, NOW);
    expect(s.jobs[0].stageId).toBe('booked');
    expect(s.jobs[0].lines).toEqual([{ serviceId: 'express', qty: 1 }]);
    expect(s.config.business.name).toBe('Any Business Ltd');
  });

  it('rejects invalid configs', () => {
    const c = presetConfig('laundry-pickup');
    c.business.name = ' '; c.business.accent = 'red;background:url(x)'; c.stages = c.stages.slice(0, 1); c.services[0].price = -1;
    const errs = validateConfig(c);
    expect(errs.length).toBeGreaterThanOrEqual(4);
    expect(() => applyConfig(empty(), c)).toThrow();
  });

  it('normalises untrusted stored data and falls back safely', () => {
    const c = normaliseConfig({ presetId: 'repair-collect', business: { name: 'X'.repeat(500), accent: 'javascript:1' }, stages: [{ label: 'Only one' }], services: [{ name: 'Fix', price: 'abc' }] });
    expect(c.business.name.length).toBe(80);
    expect(c.business.accent).toBe('#1d4ed8');
    expect(c.stages.length).toBeGreaterThanOrEqual(2);
    expect(c.services[0].price).toBe(0);
    expect(parseState('not json').jobs.every(j => j.sample)).toBe(true);
    expect(parseState(null).config.presetId).toBe('laundry-pickup');
  });

  it('round-trips state through JSON with stage/payment guards', () => {
    const s = initialState('laundry-pickup', NOW);
    const raw = JSON.parse(JSON.stringify(s));
    raw.jobs[0].stageId = 'deleted-stage'; raw.jobs[0].payment = 'bitcoin';
    const back = parseState(JSON.stringify(raw));
    expect(back.jobs.length).toBe(3);
    expect(back.jobs[0].stageId).toBe('booked');
    expect(back.jobs[0].payment).toBe('unpaid');
    expect(back.nextRef).toBe(4);
  });

  it('sample data is clearly fictional', () => {
    const s = initialState('laundry-pickup', NOW);
    expect(s.config.business.name).toMatch(/sample/i);
    for (const j of s.jobs) { expect(j.sample).toBe(true); expect(j.customerName).toMatch(/^Sample/); }
  });
});
