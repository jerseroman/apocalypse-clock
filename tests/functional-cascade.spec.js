const { test, expect } = require('@playwright/test');
const FunctionalCascade = require('../src/cascade-model.js');

// Pure core contracts. These synthetic cases test the declared first-functional-
// failure mechanism, not empirical calibration or a forecast of global collapse.
const START = 2025;
const END = 2030;
const CENSORED = END + 1;

function node(id, overrides = {}) {
  return {
    id, domain: 'technology', weight: 1, services: [], dependencies: [],
    pressureRatio: 0.2, growth: 0, vulnerability: 0.8,
    spontaneousYear: 9999,
    ...overrides,
  };
}

function simulate(nodes, overrides = {}) {
  return FunctionalCascade.simulate({
    nodes, startYear: START, pressureYear: START, endYear: END,
    threshold: 1, collectAll: true, collectTrace: true, ...overrides,
  });
}

function chain() {
  return [
    node('a', { spontaneousYear: 2026 }),
    node('b', { dependencies: [{ id: 'a', weight: 1 }] }),
    node('c', { dependencies: [{ id: 'b', weight: 1 }] }),
  ];
}

function activationMap(result) {
  return Object.fromEntries(Object.entries(result.firstActivationYears).sort());
}

test.describe('first-functional-failure cascade core', () => {
  test('one initiator propagates through a multi-step chain within the declared annual step', () => {
    const result = simulate(chain());
    expect(result.year).toBe(2026);
    expect(activationMap(result)).toEqual({ a: 2026, b: 2026, c: 2026 });
    expect(result.activationCauses.a).toBe('spontaneous');
    expect(result.activationCauses.b).toBe('induced');
    expect(result.activationCauses.c).toBe('induced');
    expect(new Set(result.activeThreats)).toEqual(new Set(['a', 'b', 'c']));
    expect(new Set(result.topDrivers)).toEqual(new Set(['b', 'c']));
    const toB = result.trace.find(row => row.target === 'b');
    const toC = result.trace.find(row => row.target === 'c');
    expect(toB).toMatchObject({ year: 2026, target: 'b' });
    expect(toC).toMatchObject({ year: 2026, target: 'c' });
    expect(toB.sources).toContain('a');
    expect(toC.sources).toContain('b');
  });

  test('unobserved spontaneous dates 2101 and 9999 do not gate induced failure', () => {
    const earlySentinel = chain().map(n => n.id === 'a' ? n : { ...n, spontaneousYear: 2101 });
    const distantSentinel = chain();
    const a = simulate(earlySentinel);
    const b = simulate(distantSentinel);
    expect(a.year).toBe(2026);
    expect(a.year).toBe(b.year);
    expect(activationMap(a)).toEqual(activationMap(b));
    expect(a.firstActivationYears.b).toBeLessThan(2101);
  });

  test('susceptibility alone does not create a spontaneous event without an active upstream source', () => {
    const result = simulate([
      node('source', { pressureRatio: 1, growth: 0.5 }),
      node('target', { pressureRatio: 1, dependencies: [{ id: 'source', weight: 1 }] }),
    ]);
    expect(result.year).toBe(CENSORED);
    expect(activationMap(result)).toEqual({ source: CENSORED, target: CENSORED });
    expect(result.activeThreats).toEqual([]);
    expect(result.functionalLoss).toBe(0);
  });

  test('a seedless directed cycle remains inactive and terminates', () => {
    const result = simulate([
      node('a', { pressureRatio: 1, dependencies: [{ id: 'b', weight: 1 }] }),
      node('b', { pressureRatio: 1, dependencies: [{ id: 'a', weight: 1 }] }),
    ]);
    expect(result.year).toBe(CENSORED);
    expect(activationMap(result)).toEqual({ a: CENSORED, b: CENSORED });
    expect(result.trace.filter(row => row.target === 'a' || row.target === 'b')).toEqual([]);
  });

  test('a dependency is directed: target failure does not propagate backwards to its supplier', () => {
    const result = simulate([
      node('a', { spontaneousYear: 2026, dependencies: [{ id: 'b', weight: 1 }] }),
      node('b'),
    ]);
    expect(result.year).toBe(CENSORED);
    expect(result.firstActivationYears.a).toBe(2026);
    expect(result.firstActivationYears.b).toBe(CENSORED);
    expect(result.activeMass).toBeCloseTo(0.5, 12);
  });

  test('synchronous closure is invariant to node-list order, including chains longer than three edges', () => {
    const nodes = [node('a', { spontaneousYear: 2026 })];
    for (const [id, upstream] of [['b', 'a'], ['c', 'b'], ['d', 'c'], ['e', 'd'], ['f', 'e']]) {
      nodes.push(node(id, { dependencies: [{ id: upstream, weight: 1 }] }));
    }
    const forward = simulate(nodes);
    const reverse = simulate([...nodes].reverse());
    const shuffled = simulate([nodes[3], nodes[1], nodes[5], nodes[0], nodes[4], nodes[2]]);
    expect(forward.year).toBe(2026);
    expect(forward.firstActivationYears.f).toBe(2026);
    for (const result of [reverse, shuffled]) {
      expect(result.year).toBe(forward.year);
      expect(activationMap(result)).toEqual(activationMap(forward));
      expect(result.functionalLoss).toBe(forward.functionalLoss);
    }
  });

  test('more pressure, stronger edges, earlier/additional seeds and lower aggregate thresholds cannot delay crossing', () => {
    const nodes = [
      node('a', { spontaneousYear: 2026 }),
      node('b', { pressureRatio: 0.35, growth: 0.1, vulnerability: 1,
        dependencies: [{ id: 'a', weight: 0.6 }] }),
    ];
    const base = simulate(nodes);
    expect(base.year).toBe(2027);
    const pressure = simulate([nodes[0], { ...nodes[1], pressureRatio: 0.4 }]);
    const edge = simulate([nodes[0], { ...nodes[1], dependencies: [{ id: 'a', weight: 0.7 }] }]);
    const earlierSeed = simulate([{ ...nodes[0], spontaneousYear: 2025 }, nodes[1]]);
    const extraSeed = simulate([nodes[0], { ...nodes[1], spontaneousYear: 2025 }]);
    const lowerThreshold = simulate(nodes, { threshold: 0.5 });
    for (const result of [pressure, edge, earlierSeed, extraSeed, lowerThreshold]) {
      expect(result.year).toBeLessThanOrEqual(base.year);
    }
    expect(pressure.firstActivationYears.b).toBe(2026);
    expect(edge.firstActivationYears.b).toBe(2026);
    expect(lowerThreshold.year).toBe(2026);
  });

  test('priority fields cannot reweight exposure or service loss and input objects remain unchanged', () => {
    const nodes = [
      node('a', { spontaneousYear: 2026, priority: 1 }),
      node('inactive', { priority: 1 }),
      node('b', { pressureRatio: 0.5, vulnerability: 1, priority: 1,
        dependencies: [{ id: 'a', weight: 0.5 }, { id: 'inactive', weight: 0.5 }] }),
    ];
    const original = JSON.stringify(nodes);
    const base = simulate(nodes, { threshold: 0.6 });
    expect(JSON.stringify(nodes)).toBe(original);
    const alternative = simulate(nodes.map(n => ({ ...n, priority: n.id === 'inactive' ? 1e12 : 1e-12 })), { threshold: 0.6 });
    expect(base.year).toBe(2026);
    expect(alternative.year).toBe(base.year);
    expect(activationMap(alternative)).toEqual(activationMap(base));
    expect(alternative.activeMass).toBeCloseTo(base.activeMass, 12);
  });

  test('zero-weight edges do not transmit and zero functional weights do not contribute lost mass', () => {
    const result = simulate([
      node('source', { spontaneousYear: 2026, weight: 0, services: ['health_care'] }),
      node('target', { services: ['health_care'], dependencies: [{ id: 'source', weight: 0 }] }),
    ], { threshold: 0.5 });
    expect(result.year).toBe(CENSORED);
    expect(result.firstActivationYears.source).toBe(2026);
    expect(result.firstActivationYears.target).toBe(CENSORED);
    expect(result.activeMass).toBe(0);
    expect(result.maxServiceLoss).toBe(0);
    expect(result.functionalLoss).toBe(0);
  });

  test('critical-service loss is non-compensatory without requiring all domains or induced failures', () => {
    const nodes = [
      node('health', { weight: 1, services: ['health_care'], spontaneousYear: 2026 }),
      node('other', { weight: 99, services: ['coordination_exchange'] }),
    ];
    const service = simulate(nodes, { threshold: 0.5 });
    const globalOnly = simulate(nodes.map(n => ({ ...n, services: [] })), { threshold: 0.5 });
    expect(service.year).toBe(2026);
    expect(service.activeMass).toBeCloseTo(0.01, 12);
    expect(service.serviceLosses.health_care).toBe(1);
    expect(service.maxServiceLoss).toBe(1);
    expect(service.functionalLoss).toBe(1);
    expect(service.inducedMass).toBe(0);
    expect(globalOnly.year).toBe(CENSORED);
    // This asserts the declared service-failure trigger, not universal collapse.
  });

  test('overlapping ecological markers use maximum group weight rather than double-counted global or service loss', () => {
    const markers = [
      node('oceans', { weight: 3, overlapGroup: 'ecosystem_integrity', services: ['ecological_life_support'], spontaneousYear: 2026 }),
      node('biodiversity', { weight: 3, overlapGroup: 'ecosystem_integrity', services: ['ecological_life_support'], spontaneousYear: 2027 }),
      node('other', { weight: 3, services: ['ecological_life_support'] }),
    ];
    const score = (nodes, active, induced = []) => FunctionalCascade.metrics(
      FunctionalCascade.prepare(nodes), new Set(active), new Set(induced),
    );
    const single = score([markers[0], markers[2]], ['oceans']);
    const oneMarker = score(markers, ['oceans']);
    const bothMarkers = score(markers, ['oceans', 'biodiversity'], ['oceans', 'biodiversity']);
    expect(oneMarker.activeMass).toBe(single.activeMass);
    expect(bothMarkers.activeMass).toBe(single.activeMass);
    expect(bothMarkers.activeMass).toBe(0.5);
    expect(bothMarkers.inducedMass).toBe(0.5);
    expect(oneMarker.serviceLosses.ecological_life_support).toBe(0.5);
    expect(bothMarkers.serviceLosses.ecological_life_support).toBe(0.5);

    const distinct = score(markers.map(n => ({ ...n, overlapGroup: n.id })), ['oceans', 'biodiversity']);
    const implicitDistinct = score(markers.map(({ overlapGroup, ...n }) => n), ['oceans', 'biodiversity']);
    expect(distinct.activeMass).toBeCloseTo(2 / 3, 12);
    expect(distinct).toEqual(implicitDistinct);

    const unequal = score([
      { ...markers[0], weight: 2, services: ['ecological_life_support', 'coastal_function'] },
      markers[1],
      { ...markers[2], weight: 5, services: ['ecological_life_support', 'coastal_function'] },
    ], ['oceans']);
    expect(unequal.activeMass).toBeCloseTo(2 / 8, 12);
    expect(unequal.serviceLosses.ecological_life_support).toBeCloseTo(2 / 8, 12);
    expect(unequal.serviceLosses.coastal_function).toBeCloseTo(2 / 7, 12);

    const result = simulate(markers);
    expect(result.firstActivationYears.oceans).toBe(2026);
    expect(result.firstActivationYears.biodiversity).toBe(2027);
    expect(result.activationCauses.oceans).toBe('spontaneous');
    expect(result.activationCauses.biodiversity).toBe('spontaneous');
    expect(result.activeMass).toBe(0.5);
  });

  test('non-inducible event nodes still activate spontaneously, aggregate and transmit to downstream nodes', () => {
    const nodes = [
      node('source', { spontaneousYear: 2026 }),
      node('event', { inducible: false, pressureRatio: 0.9, vulnerability: 1,
        spontaneousYear: 2030, dependencies: [{ id: 'source', weight: 1 }] }),
      node('downstream', { dependencies: [{ id: 'event', weight: 1 }] }),
    ];
    const result = simulate(nodes);
    expect(result.year).toBe(2030);
    expect(activationMap(result)).toEqual({ downstream: 2030, event: 2030, source: 2026 });
    expect(result.activationCauses.event).toBe('spontaneous');
    expect(result.activationCauses.downstream).toBe('induced');
    expect(result.trace.filter(row => row.target === 'event')).toEqual([
      { year: 2030, target: 'event', cause: 'spontaneous', sources: [] },
    ]);
    expect(result.topDrivers).not.toContain('event');
    expect(result.topDrivers).toContain('downstream');
    expect(result.activeMass).toBe(1);
    expect(result.inducedMass).toBeCloseTo(1 / 3, 12);

    const noEvent = simulate(nodes.map(n => n.id === 'event' ? { ...n, spontaneousYear: 9999 } : n));
    expect(noEvent.year).toBe(CENSORED);
    expect(noEvent.firstActivationYears.event).toBe(CENSORED);
    expect(noEvent.firstActivationYears.downstream).toBe(CENSORED);
  });

  test('one spontaneous seed crosses a directed cascade with explicit two-year and one-year transmission lags', () => {
    const nodes = [
      node('a', { spontaneousYear: 2030 }),
      node('b', { dependencies: [{ id: 'a', weight: 1, lag: 2 }] }),
      node('c', { dependencies: [{ id: 'b', weight: 1, lag: 1 }] }),
    ];
    const result = simulate(nodes, { endYear: 2040 });
    expect(result.year).toBe(2033);
    expect(activationMap(result)).toEqual({ a: 2030, b: 2032, c: 2033 });
    expect(result.trace.find(row => row.target === 'b')).toMatchObject({ year: 2032, sources: ['a'] });
    expect(result.trace.find(row => row.target === 'c')).toMatchObject({ year: 2033, sources: ['b'] });
    expect(Object.values(result.activationCauses).filter(cause => cause === 'spontaneous')).toHaveLength(1);

    const noSeed = simulate(nodes.map(n => n.id === 'a' ? { ...n, spontaneousYear: 9999 } : n), { endYear: 2040 });
    expect(noSeed.year).toBe(2041);
    expect(noSeed.activeThreats).toEqual([]);
  });

  test('longer transmission lags cannot advance activation and invalid lags are rejected', () => {
    const runLags = (first, second) => simulate([
      node('a', { spontaneousYear: 2030 }),
      node('b', { dependencies: [{ id: 'a', weight: 1, lag: first }] }),
      node('c', { dependencies: [{ id: 'b', weight: 1, lag: second }] }),
    ], { endYear: 2040 });
    const instant = runLags(0, 0);
    const baseline = runLags(2, 1);
    const delayed = runLags(5, 4);
    expect(instant.year).toBe(2030);
    expect(baseline.year).toBe(2033);
    expect(delayed.year).toBe(2039);
    for (const id of ['a', 'b', 'c']) {
      expect(baseline.firstActivationYears[id]).toBeGreaterThanOrEqual(instant.firstActivationYears[id]);
      expect(delayed.firstActivationYears[id]).toBeGreaterThanOrEqual(baseline.firstActivationYears[id]);
    }
    expect(() => runLags(-1, 0)).toThrow();
    expect(() => runLags(0.5, 0)).toThrow();
  });

  test('negative node or dependency weights are rejected rather than silently changing causal direction', () => {
    expect(() => simulate([node('a', { weight: -1 })])).toThrow();
    expect(() => simulate([
      node('a'), node('b', { dependencies: [{ id: 'a', weight: -0.1 }] }),
    ])).toThrow();
  });

  test('annual boundaries, exact induction equality and pressure-year origin are explicit', () => {
    expect(simulate([node('a', { spontaneousYear: START })]).year).toBe(START);
    expect(simulate([node('a', { spontaneousYear: END })]).year).toBe(END);
    expect(simulate([node('a', { spontaneousYear: END + 1 })]).year).toBe(CENSORED);

    const exact = simulate([
      node('a', { spontaneousYear: START }),
      node('b', { pressureRatio: 0.5, vulnerability: 0.5, dependencies: [{ id: 'a', weight: 1 }] }),
    ]);
    const below = simulate([
      node('a', { spontaneousYear: START }),
      node('b', { pressureRatio: 0.5 - 1e-8, vulnerability: 0.5, dependencies: [{ id: 'a', weight: 1 }] }),
    ]);
    expect(exact.firstActivationYears.b).toBe(START);
    expect(below.firstActivationYears.b).toBe(CENSORED);

    const anchored = simulate([
      node('a', { spontaneousYear: 2021 }),
      node('b', { pressureRatio: 0.5, growth: 1, vulnerability: 0.4,
        dependencies: [{ id: 'a', weight: 1 }] }),
    ], { startYear: 2020, pressureYear: 2025, endYear: 2026 });
    expect(anchored.firstActivationYears.b).toBe(2026);
    expect(anchored.year).toBe(2026);
  });

  test('domain crossing reuses full-system propagation but restricts only the reporting denominator', () => {
    const nodes = [
      node('civil-source', { domain: 'civilization', weight: 99, services: ['critical_infrastructure'] }),
      node('tech-a', { domain: 'technology', weight: 1, services: ['critical_infrastructure'] }),
      node('tech-b', { domain: 'technology', weight: 1, services: ['critical_infrastructure'] }),
    ];
    const history = {
      nodes,
      activationYears: { 'civil-source': 2029, 'tech-a': 2027, 'tech-b': CENSORED },
      activationCauses: { 'civil-source': 'spontaneous', 'tech-a': 'induced' },
      startYear: START,
      endYear: END,
      threshold: 0.5,
    };
    const technology = FunctionalCascade.firstCrossingFromActivationYears({ ...history, domain: 'technology' });
    const fullSystem = FunctionalCascade.firstCrossingFromActivationYears(history);
    expect(technology.year).toBe(2027);
    expect(technology.activeThreats).toEqual(['tech-a']);
    expect(technology.inducedMass).toBeCloseTo(0.5, 12);
    expect(fullSystem.year).toBe(2029);
    expect(() => FunctionalCascade.firstCrossingFromActivationYears({ ...history, domain: 'missing' })).toThrow(/No cascade nodes/);
  });
});
