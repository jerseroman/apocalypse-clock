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
    return clamp01(node.pressureRatio * Math.pow(1 + node.growth, Math.max(0, year - pressureYear)));
  }

  function exposure(node, active, year, activationYears) {
    return clamp01(node.dependencies.reduce((sum, edge) => sum + (active.has(edge.id) && (!activationYears || activationYears[edge.id] + (edge.lag || 0) <= year) ? edge.weight : 0), 0));
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
   */
  function firstCrossingFromActivationYears(options) {
    const { startYear, endYear, threshold, activationYears, activationCauses = {}, domain = null } = options;
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

    let latestMetrics = metrics(nodes, new Set(), new Set());
    for (let year = startYear; year <= endYear; year++) {
      const active = new Set(nodes.filter(node => (activationYears[node.id] ?? endYear + 1) <= year).map(node => node.id));
      const induced = new Set([...active].filter(id => activationCauses[id] === 'induced'));
      latestMetrics = metrics(nodes, active, induced);
      if (latestMetrics.functionalLoss >= threshold) {
        return { year, ...latestMetrics, activeThreats: [...active].sort(), domain,
          note: domain == null
            ? 'Functional-loss threshold reconstructed from propagated first-activation years.'
            : `Within-domain functional-loss threshold reconstructed after full-system propagation (${domain}).` };
      }
    }
    const active = new Set(nodes.filter(node => (activationYears[node.id] ?? endYear + 1) <= endYear).map(node => node.id));
    return { year: endYear + 1, ...latestMetrics, activeThreats: [...active].sort(), domain,
      note: domain == null
        ? 'Functional-loss threshold was not reached within the activation-history horizon.'
        : `Within-domain functional-loss threshold was not reached within the activation-history horizon (${domain}).` };
  }

  function simulate(options) {
    const { startYear, pressureYear, endYear, threshold, collectAll = false, collectTrace = false } = options;
    if (![startYear, pressureYear, endYear].every(Number.isInteger) || startYear > endYear) throw new Error('Invalid cascade time axis.');
    if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error('Invalid cascade threshold.');
    const nodes = prepare(options.nodes);
    const active = new Set(), induced = new Set();
    const firstActivationYears = Object.fromEntries(nodes.map(node => [node.id, endYear + 1]));
    const activationCauses = {};
    const trace = [];
    let crossing = null;
    let latestMetrics = metrics(nodes, active, induced);
    for (let year = startYear; year <= endYear; year++) {
      let activeChanged = false;
      for (const node of nodes) {
        if (!active.has(node.id) && node.spontaneousYear <= year) {
          active.add(node.id);
          activeChanged = true;
          firstActivationYears[node.id] = year;
          activationCauses[node.id] = 'spontaneous';
          if (collectTrace) trace.push({ year, target: node.id, cause: 'spontaneous', sources: [] });
        }
      }
      // Least fixed point: one annual step can contain multiple causal waves. No update-order bias.
      // Each nonempty wave adds a node, hence at most N waves. This is not a measured propagation lag.
      for (let wave = 0; wave < nodes.length; wave++) {
        const pending = [];
        for (const node of nodes) {
          if (active.has(node.id) || node.inducible === false) continue;
          const incoming = exposure(node, active, year, firstActivationYears);
          if (incoming <= 0 || node.vulnerability <= 0) continue;
          if (pressureRatio(node, year, pressureYear) + node.vulnerability * incoming >= 1) {
            pending.push({ node, sources: node.dependencies.filter(edge => edge.weight > 0 && active.has(edge.id) && firstActivationYears[edge.id] + (edge.lag || 0) <= year).map(edge => edge.id) });
          }
        }
        if (!pending.length) break;
        for (const { node, sources } of pending) {
          active.add(node.id); induced.add(node.id);
          activeChanged = true;
          firstActivationYears[node.id] = year;
          activationCauses[node.id] = 'induced';
          if (collectTrace) trace.push({ year, wave: wave + 1, target: node.id, cause: 'induced', sources });
        }
      }
      // The basket score changes only on activation. After first crossing its
      // snapshot is immutable; collectAll needs later node times, not new scores.
      if (!crossing && activeChanged) latestMetrics = metrics(nodes, active, induced);
      if (!crossing && latestMetrics.functionalLoss >= threshold) {
        crossing = { year, ...latestMetrics, activeThreats: [...active].sort(), topDrivers: [...induced].sort(),
          activeDomains: new Set(nodes.filter(node => active.has(node.id)).map(node => node.domain)).size };
        if (!collectAll) break;
      }
      if (active.size === nodes.length) break;
    }
    return { ...(crossing || { year: endYear + 1, ...latestMetrics, activeThreats: [...active].sort(), topDrivers: [...induced].sort(), activeDomains: new Set(nodes.filter(node => active.has(node.id)).map(node => node.domain)).size }),
      firstActivationYears, activationCauses, trace,
      note: crossing ? 'Functional-loss threshold after directed propagation; not completion of global collapse.' : 'Functional-loss threshold not crossed within the simulated horizon.' };
  }
  return Object.freeze({ clamp01, prepare, pressureRatio, exposure, metrics, firstCrossingFromActivationYears, simulate });
});
