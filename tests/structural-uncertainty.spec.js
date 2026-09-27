const { test, expect } = require('@playwright/test');

test.describe('structural uncertainty sampling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('components switch off cleanly and default to all five', async ({ page }) => {
    const result = await page.evaluate(() => ({
      off: structuralComponentsOf({ structuralUncertainty: false }),
      defaults: structuralComponentsOf({}),
      lagsOnly: structuralComponentsOf({ structuralComponents: { lags: true } }),
      offContext: createStructuralContext({ structuralUncertainty: false }),
    }));
    expect(result.off).toEqual([]);
    expect(result.defaults).toEqual(['threshold', 'criticality', 'dependencyWeights', 'lags', 'growthClass']);
    expect(result.lagsOnly).toEqual(['lags']);
    expect(result.offContext).toBeNull();
  });

  test('growth class shifts move one step on the extended class ladder', async ({ page }) => {
    const factors = await page.evaluate(() => [0.003, 0.01, 0.02, 0.03].map(growthClassFactors));
    const expected = [{ down: 0.3, up: 10 / 3 }, { down: 0.3, up: 2 }, { down: 0.5, up: 1.5 }, { down: 2 / 3, up: 1.5 }];
    factors.forEach((factor, i) => {
      expect(factor.down).toBeCloseTo(expected[i].down, 12);
      expect(factor.up).toBeCloseTo(expected[i].up, 12);
    });
  });

  test('sampled structure stays inside its declared ranges and leaves inputs untouched', async ({ page }) => {
    const report = await page.evaluate(() => {
      const paramsRng = createRngContext('structural-unit-params');
      const sampled = THREATS.map(t => sampleThreatNumerics(applyScenario(t, 'baseline'), 1, paramsRng));
      const before = JSON.stringify(sampled);
      const params = { ...snapshotParams('baseline', 400), seed: 'structural-unit' };
      const context = createStructuralContext(params);
      const out = { thresholds: [], levelsOrdered: true, levelsShared: true, levelRanges: true, weightSums: true, lagValues: new Set(), lagsWhole: true, growthRatios: { down: 0, same: 0, up: 0, other: 0 } };
      for (let run = 0; run < 400; run++) {
        const { threats, params: runParams } = applyStructuralUncertainty(sampled, params, context);
        out.thresholds.push(runParams.cascadeThreshold);
        const byTier = new Map();
        threats.forEach((t, i) => {
          const declaredTier = sampled[i].functional_weight;
          if (Math.abs(t.functional_weight - declaredTier) > 0.5 + 1e-12) out.levelRanges = false;
          if (byTier.has(declaredTier) && byTier.get(declaredTier) !== t.functional_weight) out.levelsShared = false;
          byTier.set(declaredTier, t.functional_weight);
          const total = (t.deps || []).reduce((sum, id) => sum + t.dependency_weights[id], 0);
          if ((t.deps || []).length && Math.abs(total - 1) > 1e-12) out.weightSums = false;
          (t.deps || []).forEach(id => {
            const lag = t.dependency_lags[id];
            if (!Number.isInteger(lag) || lag < 0 || lag > 5) out.lagsWhole = false;
            out.lagValues.add(lag);
          });
          const factors = context.growthFactors.get(t.id);
          const ratio = t.growth_rate / sampled[i].growth_rate;
          if (Math.abs(ratio - 1) < 1e-12) out.growthRatios.same++;
          else if (Math.abs(ratio - factors.down) < 1e-12) out.growthRatios.down++;
          else if (Math.abs(ratio - factors.up) < 1e-12) out.growthRatios.up++;
          else out.growthRatios.other++;
        });
        const tiers = [...byTier.entries()].sort((a, b) => a[0] - b[0]).map(entry => entry[1]);
        if (!tiers.every((value, i) => i === 0 || value > tiers[i - 1])) out.levelsOrdered = false;
      }
      return {
        ...out,
        lagValues: [...out.lagValues].sort((a, b) => a - b),
        thresholdMin: Math.min(...out.thresholds),
        thresholdMax: Math.max(...out.thresholds),
        unchanged: JSON.stringify(sampled) === before,
      };
    });

    expect(report.thresholdMin).toBeGreaterThanOrEqual(0.40);
    expect(report.thresholdMax).toBeLessThanOrEqual(0.60);
    expect(report.levelRanges).toBe(true);
    expect(report.levelsShared).toBe(true);
    expect(report.levelsOrdered).toBe(true);
    expect(report.weightSums).toBe(true);
    expect(report.lagsWhole).toBe(true);
    expect(report.lagValues).toEqual([0, 1, 2, 3, 4, 5]);
    expect(report.growthRatios.other).toBe(0);
    const draws = report.growthRatios.down + report.growthRatios.same + report.growthRatios.up;
    expect(report.growthRatios.down / draws).toBeGreaterThan(0.2);
    expect(report.growthRatios.down / draws).toBeLessThan(0.3);
    expect(report.growthRatios.up / draws).toBeGreaterThan(0.2);
    expect(report.growthRatios.up / draws).toBeLessThan(0.3);
    expect(report.unchanged).toBe(true);
  });
});
