/* Canonical scenario topology. It is shared by calculations and the network view.
 * A declared pathway is conditional, not a deterministic second failure.
 * Mechanism review does not calibrate its coefficient or lag.
 */
(function (root, factory) {
  const graph = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = graph;
  if (root) root.ApocalypseCausalGraph = graph;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Keys are targets; values are upstream pressures. The former JSON topology
  // is retained here except for the unreviewed direct geopolitics -> climate
  // edge. Other unreviewed pathways remain explicitly provisional assumptions.
  const upstreamByTarget = Object.freeze({
    ai: ['bioengineered', 'cyber', 'geopolitics', 'supply'],
    amr: ['geopolitics', 'pandemics'],
    authoritarian: ['economic', 'epistemic', 'geopolitics'],
    autonomousw: ['ai', 'geopolitics', 'nuclear'],
    biodiversity: ['climate', 'pollution', 'soils', 'water'],
    bioengineered: ['ai', 'geopolitics', 'pandemics'],
    climate: ['biodiversity', 'soils', 'water'],
    cyber: ['ai', 'geopolitics', 'supply'],
    debt: ['economic', 'geopolitics', 'supply'],
    displacement: ['climate', 'geopolitics', 'soils', 'water'],
    economic: ['cyber', 'geopolitics', 'supply'],
    epistemic: ['ai', 'authoritarian'],
    fragmentation_gov: ['authoritarian', 'epistemic', 'geopolitics'],
    geopolitics: ['ai', 'nuclear', 'pandemics', 'supply'],
    minerals: ['geopolitics', 'supply', 'water'],
    nuclear: ['ai', 'autonomousw', 'geopolitics'],
    oceans: ['climate'],
    pandemics: ['amr', 'geopolitics', 'supply'],
    pollution: ['biodiversity'],
    soils: ['biodiversity', 'climate', 'water'],
    space: ['ai', 'cyber', 'geopolitics'],
    supply: ['climate', 'cyber', 'geopolitics', 'minerals', 'oceans'],
    water: ['biodiversity', 'climate', 'geopolitics', 'soils'],
  });

  const eventGated = new Set(['nuclear', 'bioengineered', 'pandemics', 'autonomousw']);

  // Mechanism descriptions and source IDs transferred from dataset 1.9.0's
  // reviewed_edges records. These are mechanism reviews, not fitted effects.
  const reviewed = Object.freeze({
    'climate>water': ['Persistent climatic deficits reduce dependable basin water availability.', 'Storage, demand reduction, diversified supplies and treatment.', 'unccd_aridity_2024'],
    'climate>soils': ['Aridification degrades productive land functions and can cause nonlinear ecosystem responses.', 'Soil conservation and adaptive agronomy.', 'unccd_aridity_2024'],
    'climate>oceans': ['Warming-driven stratification reduces nutrient support; food-web effects amplify at higher trophic levels.', 'Regional ecological responses and fisheries management.', 'lotze_marine_foodweb_2019'],
    'climate>biodiversity': ['Changing physical conditions threaten persistence and renewal of characteristic biota.', 'Ecological redundancy, refugia and adaptation.', 'keith_ecosystem_collapse_2013'],
    'water>soils': ['Persistent moisture deficits impair vegetation and productive soil functions.', 'Moisture conservation and carefully managed irrigation.', 'unccd_aridity_2024'],
    'water>biodiversity': ['Loss of the hydrological regime prevents maintenance of water-dependent ecosystem biota.', 'Environmental flows and hydrological restoration.', 'keith_ecosystem_collapse_2013'],
    'biodiversity>water': ['Loss of flow regulation and filtration weakens usable-water provision.', 'Engineered storage and treatment; catchment restoration.', 'ipbes_bba_2026'],
    'biodiversity>soils': ['Loss of ecological interactions impairs resource capture and nutrient recycling.', 'Functional redundancy and restoration.', 'keith_ecosystem_collapse_2013'],
    'pollution>biodiversity': ['Pollution contributes to degradation of ecological functions.', 'Source controls and ecosystem recovery capacity.', 'ipbes_bba_2026'],
    'biodiversity>pollution': ['Lost ecological filtration and microbial waste processing reduce pollution-control capacity.', 'Engineered treatment and source reduction.', 'ipbes_bba_2026'],
    'biodiversity>climate': ['Loss of ecological climate regulation weakens buffering.', 'Emission reductions and protection of remaining functions.', 'ipbes_bba_2026'],
    'water>minerals': ['Water infrastructure constraints limit mineral development and processing capacity.', 'Recycling water, alternative supplies and diversified locations.', 'iea_minerals_2026'],
    'oceans>supply': ['Loss of marine food production disrupts food-provision chains; trade, dietary substitution and aquaculture are potential buffers, not guaranteed complete replacement.', '', 'fao_sofia_2026'],
  });

  const ids = Object.keys(upstreamByTarget);
  const idSet = new Set(ids);
  const edges = [];
  for (const target of ids) {
    const sources = upstreamByTarget[target];
    if (new Set(sources).size !== sources.length) throw new Error(`Duplicate upstream on ${target}.`);
    for (const upstream of sources) {
      if (!idSet.has(upstream) || upstream === target) throw new Error(`Invalid causal edge ${upstream} -> ${target}.`);
      const review = reviewed[`${upstream}>${target}`];
      // Removing the disputed climate edge does not silently increase the
      // three surviving coefficients from 0.25 to 1/3.
      const weight = target === 'climate' ? 0.25 : 1 / sources.length;
      edges.push(Object.freeze({
        upstream, target, weight, lag: 1,
        propagates: !eventGated.has(target),
        reviewed: Boolean(review),
        mechanism: review?.[0] || '',
        buffer: review?.[1] || '',
        sourceIds: Object.freeze(review?.[2] ? [review[2]] : []),
      }));
    }
  }
  for (const key of Object.keys(reviewed)) {
    if (!edges.some(edge => `${edge.upstream}>${edge.target}` === key)) throw new Error(`Reviewed edge is absent: ${key}.`);
  }

  function forTarget(id) {
    if (!idSet.has(id)) throw new Error(`Unknown causal-graph target: ${id}.`);
    const incoming = edges.filter(edge => edge.target === id);
    return {
      deps: incoming.map(edge => edge.upstream),
      dependency_weights: Object.fromEntries(incoming.map(edge => [edge.upstream, edge.weight])),
      dependency_lags: Object.fromEntries(incoming.map(edge => [edge.upstream, edge.lag])),
      functional_inducible: !eventGated.has(id),
    };
  }

  return Object.freeze({ ids: Object.freeze(ids), edges: Object.freeze(edges), forTarget });
});
