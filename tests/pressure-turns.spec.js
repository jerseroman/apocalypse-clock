const { test, expect } = require('@playwright/test');
const FunctionalCascade = require('../src/cascade-model.js');

// Model 1.5.0 pressure turns and recovery. Synthetic cases check the declared mechanism,
// not calibration: the turn probability and the recovery drops are stated assumptions.
const START = 2025;
const PRESSURE_YEAR = 2026;
const END = 2100;
const CENSORED = END + 1;

function node(id, overrides = {}) {
  return {
    id, domain: 'biosphere', weight: 1, services: [], dependencies: [],
    pressureRatio: 0.9, growth: 0.05, vulnerability: 0.5, spontaneousYear: CENSORED,
    ...overrides,
  };
}

function simulate(nodes, overrides = {}) {
  return FunctionalCascade.simulate({
    nodes, startYear: START, pressureYear: PRESSURE_YEAR, endYear: END,
    threshold: 0.5, collectAll: true, collectTrace: true, ...overrides,
  });
}

const causes = (result, id) => result.trace.filter(row => row.target === id).map(row => [row.year, row.cause]);

test.describe('pressure turns and recovery in the cascade core', () => {
  test('after a turn the pressure retraces its rise year for year', () => {
    const rising = { pressureRatio: 0.5, growth: 0.04 };
    const turned = { ...rising, turnYear: 2040 };
    for (let k = 0; k <= 14; k++) {
      expect(FunctionalCascade.pressureRatio(turned, 2040 + k, PRESSURE_YEAR)).toBe(FunctionalCascade.pressureRatio(rising, 2040 - k, PRESSURE_YEAR));
    }
    expect(FunctionalCascade.pressureRatio(turned, 2030, PRESSURE_YEAR)).toBe(FunctionalCascade.pressureRatio(rising, 2030, PRESSURE_YEAR));
  });

  test('a failed node recovers after its turn once its drive falls by the recovery drop', () => {
    // Drive at failure in 2029 is 1 (clamped). Recovery needs 0.9 * 1.05^(9 - k) <= 0.75 after the
    // 2035 turn, which first holds for k = 13, in 2048.
    const result = simulate([
      node('a', { spontaneousYear: 2029, turnYear: 2035, recoveryDrop: 0.25 }),
      node('b', { pressureRatio: 0.1, growth: 0 }),
    ]);
    expect(result.year).toBe(2029);
    expect(result.firstActivationYears.a).toBe(2029);
    expect(result.recoveryYears.a).toBe(2048);
    expect(result.activeIntervals.a).toEqual([[2029, 2048]]);
    expect(causes(result, 'a')).toEqual([[2029, 'spontaneous'], [2048, 'recovered']]);
    expect(result.backBelowYear).toBe(2048);
    expect(result.aboveThresholdAtEnd).toBe(false);
  });

  test('irreversible nodes and nodes without a turn stay failed', () => {
    const result = simulate([
      node('irreversible', { spontaneousYear: 2029, turnYear: 2035, recoveryDrop: null }),
      node('unturned', { spontaneousYear: 2029, recoveryDrop: 0.25 }),
    ]);
    expect(result.recoveryYears).toEqual({ irreversible: CENSORED, unturned: CENSORED });
    expect(result.aboveThresholdAtEnd).toBe(true);
    expect(result.backBelowYear).toBe(CENSORED);
  });

  test('a recovered node can be induced again but its own past horizon does not reactivate it', () => {
    // 'down' recovers in 2048 as above. In 2060 'up' fails: 0.9 * 1.05^-16 + 0.7 * 1 >= 1 induces
    // 'down' again. Between 2048 and 2060 its passed spontaneous year does not reactivate it.
    const result = simulate([
      node('down', { spontaneousYear: 2029, turnYear: 2035, recoveryDrop: 0.25, vulnerability: 0.7, dependencies: [{ id: 'up', weight: 1, lag: 0 }] }),
      node('up', { pressureRatio: 0.1, growth: 0, vulnerability: 0, spontaneousYear: 2060 }),
    ]);
    expect(result.activeIntervals.down).toEqual([[2029, 2048], [2060, CENSORED]]);
    expect(causes(result, 'down')).toEqual([[2029, 'spontaneous'], [2048, 'recovered'], [2060, 'induced']]);
    expect(result.firstActivationYears.down).toBe(2029);
    expect(result.activationCauses.down).toBe('spontaneous');
    expect(result.backBelowYear).toBe(2048);
    expect(result.aboveThresholdAtEnd).toBe(true);
  });

  test('a turn after the model horizon changes nothing', () => {
    const chain = extra => [
      node('a', { pressureRatio: 0.3, growth: 0.02, spontaneousYear: 2031, ...extra }),
      node('b', { pressureRatio: 0.3, growth: 0.02, vulnerability: 0.8, dependencies: [{ id: 'a', weight: 1, lag: 2 }], ...extra }),
      node('c', { pressureRatio: 0.2, growth: 0.01, vulnerability: 0.8, dependencies: [{ id: 'b', weight: 0.6, lag: 1 }], ...extra }),
    ];
    expect(JSON.stringify(simulate(chain({ turnYear: 3000, recoveryDrop: 0.5 })))).toBe(JSON.stringify(simulate(chain({}))));
  });

  test('domain reconstruction follows activity intervals when nodes recover', () => {
    const nodes = [
      node('a', { spontaneousYear: 2029, turnYear: 2035, recoveryDrop: 0.25 }),
      node('b', { pressureRatio: 0.1, growth: 0, spontaneousYear: 2050 }),
    ];
    const result = simulate(nodes, { threshold: 1 });
    const domainYear = activeIntervals => FunctionalCascade.firstCrossingFromActivationYears({
      nodes, activationYears: result.firstActivationYears, activationCauses: result.activationCauses,
      activeIntervals, startYear: START, endYear: END, threshold: 1, domain: 'biosphere',
    }).year;
    expect(domainYear(result.activeIntervals)).toBe(CENSORED);
    expect(domainYear(null)).toBe(2050);
  });

  test('invalid turn fields are rejected', () => {
    expect(() => simulate([node('a', { turnYear: 2035.5 })])).toThrow(/turnYear/);
    expect(() => simulate([node('a', { turnYear: 2035, recoveryDrop: 0 })])).toThrow(/recoveryDrop/);
    expect(() => simulate([node('a', { turnYear: 2035, recoveryDrop: 1.5 })])).toThrow(/recoveryDrop/);
  });
});

test.describe('pressure turns in the Monte Carlo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('turn draws: switch, frequency, years, recovery classes and untouched inputs', async ({ page }) => {
    const report = await page.evaluate(() => {
      const paramsRng = createRngContext('turn-unit-params');
      const sampled = THREATS.map(t => sampleThreatNumerics(applyScenario(t, 'baseline'), 1, paramsRng));
      const before = JSON.stringify(sampled);
      const context = createPressureTurnContext({ seed: 'turn-unit' });
      const years = new Set();
      let turned = 0;
      let draws = 0;
      let dropsMatchClass = true;
      let unturnedUntouched = true;
      for (let run = 0; run < 400; run++) {
        applyPressureTurns(sampled, context).forEach((t, i) => {
          draws++;
          if (Number.isFinite(t.pressure_turn_year)) {
            turned++;
            years.add(t.pressure_turn_year);
            if (t.pressure_recovery_drop !== (PRESSURE_TURNS.recoveryDrop[reversibilityTypeForThreat(THREATS[i])] ?? null)) dropsMatchClass = false;
          } else if (t !== sampled[i]) {
            unturnedUntouched = false;
          }
        });
      }
      const drop = id => context.recoveryDrop.get(id);
      return {
        off: createPressureTurnContext({ pressureTurns: false }),
        sameWhenOff: applyPressureTurns(sampled, null) === sampled,
        share: turned / draws,
        minYear: Math.min(...years),
        maxYear: Math.max(...years),
        distinctYears: years.size,
        dropsMatchClass,
        unturnedUntouched,
        drops: { climate: drop('climate'), minerals: drop('minerals'), supply: drop('supply'), authoritarian: drop('authoritarian'), ai: drop('ai') },
        unchanged: JSON.stringify(sampled) === before,
      };
    });
    expect(report.off).toBeNull();
    expect(report.sameWhenOff).toBe(true);
    expect(report.share).toBeGreaterThan(0.45);
    expect(report.share).toBeLessThan(0.55);
    expect(report.minYear).toBe(2027);
    expect(report.maxYear).toBe(2100);
    expect(report.distinctYears).toBe(74);
    expect(report.dropsMatchClass).toBe(true);
    expect(report.unturnedUntouched).toBe(true);
    expect(report.drops).toEqual({ climate: null, minerals: null, supply: 0.25, authoritarian: 0.25, ai: 0.5 });
    expect(report.unchanged).toBe(true);
  });

  test('standalone horizons: no crossing after the turn, and event hazard follows the mirrored path', async ({ page }) => {
    const r = await page.evaluate(() => {
      // priority / threshold = 0.8 and g = 0.02 cross at 2026 + ln(1.25) / ln(1.02) = 2037.3, coded 2038.
      const threshold = 8.5;
      const priority = threshold * 0.8;
      const g = 0.02;
      const horizon = (type, turn) => computeThreatHorizon(priority, g, threshold, type, true, null, turn);
      const eventAt = (turn, u) => {
        let draws = 0;
        const year = computeThreatHorizon(priority, g, threshold, 'event', true, { random01: () => { draws++; return u; } }, turn);
        return { year, draws };
      };
      return {
        base: horizon('continuous'),
        turnAfterCrossing: horizon('continuous', 2040),
        turnInCrossingYear: horizon('continuous', 2038),
        turnBeforeCrossing: horizon('continuous', 2037),
        regimeBefore: horizon('regime', 2037),
        regimeAfter: horizon('regime', 2040),
        events: [0.05, 0.2, 0.4, 0.6, 0.8, 0.95].map(u => ({ none: eventAt(undefined, u), late: eventAt(2100, u), early: eventAt(2030, u) })),
      };
    });
    expect(r.base).toBe(2038);
    expect(r.turnAfterCrossing).toBe(2038);
    expect(r.turnInCrossingYear).toBe(2038);
    expect(r.turnBeforeCrossing).toBe(2101);
    expect(r.regimeBefore).toBe(2101);
    expect(r.regimeAfter).toBe(2038);
    r.events.forEach(event => {
      expect([event.none.draws, event.late.draws, event.early.draws]).toEqual([1, 1, 1]);
      expect(event.late.year).toBe(event.none.year);
      expect(event.early.year).toBeGreaterThanOrEqual(event.none.year);
      if (event.none.year <= 2030) expect(event.early.year).toBe(event.none.year);
    });
  });

  test('turns only delay or remove crossings: every order statistic is at or after its value without turns', async ({ page }) => {
    await page.waitForFunction(() => typeof _running !== 'undefined' && _running === false && _cdfCurves?.baseline?.ensemble, null, { timeout: 60000 });
    const report = await page.evaluate(async () => {
      const params = { ...snapshotParams('baseline', 300), seed: 'turn-monotone' };
      const off = await runMC('baseline', 300, null, { ...params, pressureTurns: false });
      const on = await runMC('baseline', 300, null, params);
      const series = res => ({
        cascade: res.ensemble.dynamicCascade.crossing, compensatory: res.ensemble.compensatory.crossing,
        maxRule: res.ensemble.maxRule.crossing, graph: res.ensemble.graphWeighted.crossing,
        ...Object.fromEntries(Object.entries(res.domainStats).map(([domain, stats]) => [domain, stats.crossing])),
      });
      const a = series(off);
      const b = series(on);
      return {
        earlier: Object.keys(a).filter(key => b[key].some((year, i) => year < a[key][i])),
        later: Object.keys(a).filter(key => b[key].some((year, i) => year > a[key][i])),
        recoveryOff: off.cascadeRecovery,
        recoveryOn: on.cascadeRecovery,
      };
    });
    expect(report.earlier).toEqual([]);
    expect(report.later).toContain('cascade');
    expect(report.recoveryOff.backBelowAtEnd).toBe(0);
    expect(report.recoveryOn.crossedRuns).toBeLessThanOrEqual(report.recoveryOff.crossedRuns);
  });
});
