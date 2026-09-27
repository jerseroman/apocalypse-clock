/* Functional first-failure cascade. Transparent scenario rules, not fitted probabilities. */
(function expose(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FunctionalCascade = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';
  const clamp01 = value => Math.max(0, Math.min(1, value));

  function prepare(nodes) {
    if (!Array.isArray(nodes)) throw new TypeError('Cascade nodes must be an array.');
    const ordered = [...nodes].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const ids = new Set();
    for (const node of ordered) {
      if (!node.id || ids.has(node.id)) throw new Error('Cascade ids must be unique and nonempty.');
      ids.add(node.id);
      for (const field of ['weight', 'pressureRatio', 'growth', 'vulnerability']) {
        if (!Number.isFinite(node[field]) || node[field] < 0) throw new Error(`Invalid ${field} on ${node.id}.`);
      }
      if (node.vulnerability > 1) throw new Error(`Invalid vulnerability on ${node.id}.`);
      if (!Number.isFinite(node.spontaneousYear)) throw new Error(`Invalid spontaneousYear on ${node.id}.`);
      if (node.turnYear != null && !Number.isInteger(node.turnYear)) throw new Error(`Invalid turnYear on ${node.id}.`);
      if (node.recoveryDrop != null && !(node.recoveryDrop > 0 && node.recoveryDrop <= 1)) throw new Error(`Invalid recoveryDrop on ${node.id}.`);
    }
    return ordered.map(node => {
      const seen = new Set();
      const dependencies = [...(node.dependencies || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      for (const edge of dependencies) {
        if (!ids.has(edge.id) || edge.id === node.id || seen.has(edge.id)) throw new Error(`Invalid dependency on ${node.id}.`);
        if (!Number.isFinite(edge.weight) || edge.weight < 0) throw new Error(`Invalid dependency weight on ${node.id}.`);
        if (edge.lag != null && (!Number.isInteger(edge.lag) || edge.lag < 0)) throw new Error(`Invalid dependency lag on ${node.id}.`);
        seen.add(edge.id);
      }
      if (dependencies.reduce((sum, edge) => sum + edge.weight, 0) > 1 + 1e-10) throw new Error(`Dependency weights exceed one on ${node.id}.`);
      const services = [...new Set(node.services || [])].sort();
      if (!services.every(service => typeof service === 'string' && service.length)) throw new Error(`Invalid service on ${node.id}.`);
      if (node.overlapGroup != null && (typeof node.overlapGroup !== 'string' || !node.overlapGroup)) throw new Error(`Invalid overlap group on ${node.id}.`);
      return { ...node, services, dependencies, overlapGroup: node.overlapGroup || node.id };
    });
  }

  function pressureRatio(node, year, pressureYear) {
    // The forecast endpoint and the coded independent event year do not enter susceptibility.
    // After an optional turn year (not before pressureYear) the pressure retraces its rise:
    // each year of decline undoes one year of growth.
    const years = node.turnYear != null && year > node.turnYear
      ? 2 * node.turnYear - year - pressureYear
      : Math.max(0, year - pressureYear);
    return clamp01(node.pressureRatio * Math.pow(1 + node.growth, years));
  }

  function exposure(node, active, year, activationYears) {
    return clamp01(node.dependencies.reduce((sum, edge) => sum + (active.has(edge.id) && (!activationYears || activationYears[edge.id] + (edge.lag || 0) <= year) ? edge.weight : 0), 0));
  }

  // Own pressure plus vulnerability-weighted upstream exposure: the left side of the induction rule.
  function drive(node, active, year, activationYears, pressureYear) {
    return pressureRatio(node, year, pressureYear) + node.vulnerability * exposure(node, active, year, activationYears);
  }

  function metrics(nodes, active, induced) {
    const groups = Object.create(null), services = Object.create(null);
    const add = (basket, node) => {
      const group = node.overlapGroup || node.id;
      if (!basket[group]) basket[group] = { total: 0, lost: 0, induced: 0 };
      basket[group].total = Math.max(basket[group].total, node.weight);
      if (active.has(node.id)) basket[group].lost = Math.max(basket[group].lost, node.weight);
      if (induced.has(node.id)) basket[group].induced = Math.max(basket[group].induced, node.weight);
    };
    for (const node of nodes) {
      add(groups, node);
      for (const service of node.services) {
        if (!services[service]) services[service] = Object.create(null);
        add(services[service], node);
      }
    }
    const sum = (basket, field) => Object.values(basket).reduce((value, group) => value + group[field], 0);
    const total = sum(groups, 'total'), lost = sum(groups, 'lost'), inducedWeight = sum(groups, 'induced');
    const serviceLosses = Object.fromEntries(Object.entries(services).map(([key, basket]) => [key, sum(basket, 'total') ? sum(basket, 'lost') / sum(basket, 'total') : 0]));
    const activeMass = total ? lost / total : 0;
    const maxServiceLoss = Math.max(0, ...Object.values(serviceLosses));
    return { activeMass, inducedMass: total ? inducedWeight / total : 0, serviceLosses, maxServiceLoss,
      functionalLoss: Math.max(activeMass, maxServiceLoss) };
  }

  /**
   * Re-score an already propagated activation history for one reporting basket.
   * The activation history may come from a full-system simulation, so a domain
   * can include failures induced by nodes outside that domain. Only the loss
   * numerator and denominator are restricted; the causal propagation is not.
   * Optional activeIntervals ([start, end) years per node, from simulate) replace
   * the absorbing reading of activationYears when nodes can recover.
   */
  function firstCrossingFromActivationYears(options) {
    const { startYear, endYear, threshold, activationYears, activationCauses = {}, activeIntervals = null, domain = null } = options;
    if (![startYear, endYear].every(Number.isInteger) || startYear > endYear) throw new Error('Invalid cascade time axis.');
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Invalid cascade threshold.');
    if (!activationYears || typeof activationYears !== 'object') throw new TypeError('Activation years must be an object.');
    const allNodes = prepare(options.nodes);
    const nodes = domain == null ? allNodes : allNodes.filter(node => node.domain === domain);
    if (!nodes.length) throw new Error(`No cascade nodes found for domain ${domain}.`);
    for (const node of nodes) {
      const year = activationYears[node.id];
      if (year != null && !Number.isFinite(year)) throw new Error(`Invalid activation year on ${node.id}.`);
    }

    const isActive = activeIntervals
      ? (node, year) => (activeIntervals[node.id] || []).some(([start, end]) => start <= year && year < end)
      : (node, year) => (activationYears[node.id] ?? endYear + 1) <= year;
    let latestMetrics = metrics(nodes, new Set(), new Set());
    for (let year = startYear; year <= endYear; year++) {
      const active = new Set(nodes.filter(node => isActive(node, year)).map(node => node.id));
      const induced = new Set([...active].filter(id => activationCauses[id] === 'induced'));
      latestMetrics = metrics(nodes, active, induced);
      if (latestMetrics.functionalLoss >= threshold) {
        return { year, ...latestMetrics, activeThreats: [...active].sort(), domain,
          note: domain == null
            ? 'Functional-loss threshold reconstructed from propagated first-activation years.'
            : `Within-domain functional-loss threshold reconstructed after full-system propagation (${domain}).` };
      }
    }
    const active = new Set(nodes.filter(node => isActive(node, endYear)).map(node => node.id));
    return { year: endYear + 1, ...latestMetrics, activeThreats: [...active].sort(), domain,
      note: domain == null
        ? 'Functional-loss threshold was not reached within the activation-history horizon.'
        : `Within-domain functional-loss threshold was not reached within the activation-history horizon (${domain}).` };
  }

  /**
   * Nodes without turnYear activate absorbingly (first passage). A node with turnYear and
   * recoveryDrop recovers after its turn once its drive is at most (1 - recoveryDrop) times the
   * smaller of 1 and its drive at activation. Recovery is evaluated first each year, to a fixed
   * point. A recovered node can be induced again; its spontaneous activation happens at most once.
   * Dependency lags count from an upstream node's latest activation. The crossing year remains
   * the first year the threshold is reached; aboveThresholdAtEnd and backBelowYear need collectAll.
   */
  function simulate(options) {
    const { startYear, pressureYear, endYear, threshold, collectAll = false, collectTrace = false } = options;
    if (![startYear, pressureYear, endYear].every(Number.isInteger) || startYear > endYear) throw new Error('Invalid cascade time axis.');
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Invalid cascade threshold.');
    const nodes = prepare(options.nodes);
    const active = new Set(), induced = new Set();
    const firstActivationYears = Object.fromEntries(nodes.map(node => [node.id, endYear + 1]));
    const activationYears = { ...firstActivationYears };
    const recoveryYears = { ...firstActivationYears };
    const activeIntervals = Object.fromEntries(nodes.map(node => [node.id, []]));
    const activationCauses = {};
    const activationDrive = {};
    const spontaneousPassed = new Set();
    const recoverable = nodes.filter(node => node.turnYear != null && node.recoveryDrop != null);
    const recoverableIds = new Set(recoverable.map(node => node.id));
    const trace = [];
    let crossing = null;
    let latestMetrics = metrics(nodes, active, induced);
    let currentMetrics = latestMetrics;
    let backBelowYear = endYear + 1;
    const activate = (node, year, cause, driveValue) => {
      active.add(node.id);
      if (cause === 'induced') induced.add(node.id);
      activationYears[node.id] = year;
      if (firstActivationYears[node.id] > endYear) firstActivationYears[node.id] = year;
      if (!activationCauses[node.id]) activationCauses[node.id] = cause;
      if (recoverableIds.has(node.id)) activationDrive[node.id] = driveValue;
      activeIntervals[node.id].push([year, endYear + 1]);
    };
    for (let year = startYear; year <= endYear; year++) {
      let activeChanged = false;
      // Recovery waves: each nonempty wave removes a node, hence at most N waves.
      for (let wave = 0; recoverable.length && wave < nodes.length; wave++) {
        const recovering = recoverable.filter(node => active.has(node.id) && year > node.turnYear
          && drive(node, active, year, activationYears, pressureYear) <= (1 - node.recoveryDrop) * Math.min(1, activationDrive[node.id]));
        if (!recovering.length) break;
        for (const node of recovering) {
          active.delete(node.id); induced.delete(node.id);
          activeChanged = true;
          if (recoveryYears[node.id] > endYear) recoveryYears[node.id] = year;
          activeIntervals[node.id][activeIntervals[node.id].length - 1][1] = year;
          if (collectTrace) trace.push({ year, wave: wave + 1, target: node.id, cause: 'recovered', sources: [] });
        }
      }
      const spontaneous = [];
      for (const node of nodes) {
        if (node.spontaneousYear > year || spontaneousPassed.has(node.id)) continue;
        spontaneousPassed.add(node.id);
        if (!active.has(node.id)) spontaneous.push(node);
      }
      const spontaneousDrives = spontaneous.map(node => (recoverableIds.has(node.id) ? drive(node, active, year, activationYears, pressureYear) : null));
      spontaneous.forEach((node, index) => {
        activate(node, year, 'spontaneous', spontaneousDrives[index]);
        activeChanged = true;
        if (collectTrace) trace.push({ year, target: node.id, cause: 'spontaneous', sources: [] });
      });
      // Least fixed point: one annual step can contain multiple causal waves. No update-order bias.
      // Each nonempty wave adds a node, hence at most N waves. This is not a measured propagation lag.
      for (let wave = 0; wave < nodes.length; wave++) {
        const pending = [];
        for (const node of nodes) {
          if (active.has(node.id) || node.inducible === false) continue;
          const incoming = exposure(node, active, year, activationYears);
          if (incoming <= 0 || node.vulnerability <= 0) continue;
          const driveValue = pressureRatio(node, year, pressureYear) + node.vulnerability * incoming;
          if (driveValue >= 1) {
            pending.push({ node, driveValue, sources: node.dependencies.filter(edge => edge.weight > 0 && active.has(edge.id) && activationYears[edge.id] + (edge.lag || 0) <= year).map(edge => edge.id) });
          }
        }
        if (!pending.length) break;
        for (const { node, driveValue, sources } of pending) {
          activate(node, year, 'induced', driveValue);
          activeChanged = true;
          if (collectTrace) trace.push({ year, wave: wave + 1, target: node.id, cause: 'induced', sources });
        }
      }
      // The basket score changes only on activation or recovery. After first crossing its
      // snapshot is immutable; later scores are tracked only when nodes can recover.
      if (activeChanged && (!crossing || recoverable.length)) currentMetrics = metrics(nodes, active, induced);
      if (!crossing) latestMetrics = currentMetrics;
      if (!crossing && latestMetrics.functionalLoss >= threshold) {
        crossing = { year, ...latestMetrics, activeThreats: [...active].sort(), topDrivers: [...induced].sort(),
          activeDomains: new Set(nodes.filter(node => active.has(node.id)).map(node => node.domain)).size };
        if (!collectAll) break;
      } else if (crossing && backBelowYear > endYear && currentMetrics.functionalLoss < threshold) {
        backBelowYear = year;
      }
      if (active.size === nodes.length && !recoverable.length) break;
    }
    const aboveThresholdAtEnd = Boolean(crossing) && (!recoverable.length || currentMetrics.functionalLoss >= threshold);
    return { ...(crossing || { year: endYear + 1, ...latestMetrics, activeThreats: [...active].sort(), topDrivers: [...induced].sort(), activeDomains: new Set(nodes.filter(node => active.has(node.id)).map(node => node.domain)).size }),
      firstActivationYears, activationCauses, trace, recoveryYears, activeIntervals, aboveThresholdAtEnd, backBelowYear,
      note: crossing ? 'Functional-loss threshold after directed propagation; not completion of global collapse.' : 'Functional-loss threshold not crossed within the simulated horizon.' };
  }
  return Object.freeze({ clamp01, prepare, pressureRatio, exposure, drive, metrics, firstCrossingFromActivationYears, simulate });
});
