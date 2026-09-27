// Model Diagnostics layout: a control card on top and tabs for the diagnostic groups, built from the
// existing blocks (they are moved, not copied, so every chart keeps its element and id). Before the
// diagnostics have run, the chart tabs show a short empty state instead of empty chart boxes.
// Layout only: no calculation or output changes.
(() => {
  'use strict';

  const TABS = [
    { id: 'sensitivity', label: 'Sensitivity', needsRun: true },
    { id: 'stress', label: 'Stress tests', needsRun: true },
    { id: 'distribution', label: 'Distribution', needsRun: true },
    { id: 'audit', label: 'Audit', needsRun: true },
    { id: 'model', label: 'How the model works', needsRun: false },
  ];
  const STORAGE_KEY = 'diagnosticsTab';
  let panels = {};

  function init() {
    const body = document.getElementById('scientificPanelBody');
    const run = document.getElementById('scientificAdditionalRunPanel');
    const sensBody = document.getElementById('exploratorySensBody');
    const expBody = document.getElementById('experimentalScientificBody');
    const head = body && body.querySelector('.scientific-panel-head');
    if (!body || !run || !sensBody || !expBody || !head) return;

    // Blocks of each tab, taken from their current places.
    const auditBox = document.getElementById('experimentalAuditBox');
    const auditCard = auditBox && auditBox.closest('.scientific-chart-card, .panel, div[style]');
    const summary = document.getElementById('experimentalSummaryBox');
    const distribution = document.getElementById('distributionDiagnosticsBlock');
    const sensIntro = sensBody.firstElementChild;
    const expIntro = expBody.firstElementChild;
    [sensIntro, expIntro].forEach(el => el && el.classList.add('diag-intro'));
    const modelNodes = [];
    for (let node = head; node; node = node.nextElementSibling) modelNodes.push(node);

    const view = document.createElement('div');
    view.className = 'diag-view';
    body.prepend(view);
    view.appendChild(run);

    const tabBar = document.createElement('div');
    tabBar.className = 'diag-tabs';
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Diagnostic groups');
    view.appendChild(tabBar);

    TABS.forEach(tab => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'diag-tab';
      button.id = `diagTab-${tab.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', `diagPanel-${tab.id}`);
      button.dataset.diagTab = tab.id;
      button.textContent = tab.label;
      tabBar.appendChild(button);

      const panel = document.createElement('div');
      panel.className = 'diag-panel';
      panel.id = `diagPanel-${tab.id}`;
      panel.dataset.diagPanel = tab.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      if (tab.needsRun) {
        panel.insertAdjacentHTML('beforeend', `<div class="diag-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 13h4l2-6 4 12 2-6h8"/></svg>
          <p class="diag-empty-title">These diagnostics have not been run yet</p>
          <p class="diag-empty-copy">They use the finished main run, take a short while, and do not change the clocks.</p>
          <button type="button" class="diag-empty-run">Run diagnostics</button>
        </div>`);
      }
      const content = document.createElement('div');
      content.className = 'diag-content';
      panel.appendChild(content);
      view.appendChild(panel);
      panels[tab.id] = { button, panel, content, tab };
    });

    const move = (tabId, nodes) => nodes.filter(Boolean).forEach(node => panels[tabId].content.appendChild(node));
    move('sensitivity', [...sensBody.children]);
    const expChildren = [...expBody.children].filter(el => el !== summary && el !== distribution);
    move('stress', expChildren);
    move('distribution', [distribution]);
    move('audit', [auditCard, summary]);
    move('model', modelNodes);
    // A two-column grid left with one card (SMAA, once the audit card moved out) spans the full width.
    panels.stress.content.querySelectorAll(':scope > div').forEach(grid => {
      if (grid.style.display === 'grid' && grid.children.length === 1) grid.classList.add('diag-single');
    });

    // The old wrappers are empty now.
    ['exploratorySensPanel', 'experimentalScientificPanel', 'scientificAdditionalZone'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.contains(view)) el.classList.add('diag-emptied');
    });

    tabBar.addEventListener('click', event => {
      const button = event.target.closest('[data-diag-tab]');
      if (button) show(button.dataset.diagTab, true);
    });
    tabBar.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const ids = TABS.map(t => t.id);
      const current = ids.findIndex(id => panels[id].button === document.activeElement);
      if (current < 0) return;
      const next = ids[(current + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
      show(next, true);
      panels[next].button.focus();
    });
    view.addEventListener('click', event => {
      if (!event.target.closest('.diag-empty-run')) return;
      const runButton = document.getElementById('diagBtn');
      if (runButton) runButton.click();
    });

    // The chart tabs switch from the empty state to the charts once a diagnostic step has started.
    const steps = document.getElementById('additionalCalcStepList');
    if (steps) new MutationObserver(updateEmptyStates).observe(steps, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    updateEmptyStates();

    let saved = null;
    try { saved = sessionStorage.getItem(STORAGE_KEY); } catch (error) { /* storage blocked */ }
    show(panels[saved] ? saved : TABS[0].id, false);

    window.addEventListener('beforeprint', () => Object.values(panels).forEach(p => { p.panel.hidden = false; }));
    window.addEventListener('afterprint', () => show(current, false));
    window.DiagnosticsView = { show: id => show(id, false) };
  }

  let current = null;
  function show(id, remember) {
    if (!panels[id]) return;
    current = id;
    Object.values(panels).forEach(({ button, panel, tab }) => {
      const active = tab.id === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
    });
    if (remember) {
      try { sessionStorage.setItem(STORAGE_KEY, id); } catch (error) { /* storage blocked */ }
    }
    // Charts drawn while their tab was hidden have no size yet.
    requestAnimationFrame(() => {
      try { if (typeof resizeScientificPanelCharts === 'function') resizeScientificPanelCharts(); } catch (error) { /* charts not ready */ }
    });
  }

  function updateEmptyStates() {
    const ran = [...document.querySelectorAll('#additionalCalcStepList .calc-step')].some(step => !step.classList.contains('calc-pending'));
    let changed = false;
    Object.values(panels).forEach(({ panel, tab }) => {
      if (!tab.needsRun) return;
      if (panel.classList.contains('is-empty') === !ran) return;
      panel.classList.toggle('is-empty', !ran);
      changed = true;
    });
    if (changed && ran) {
      requestAnimationFrame(() => {
        try { if (typeof resizeScientificPanelCharts === 'function') resizeScientificPanelCharts(); } catch (error) { /* charts not ready */ }
      });
    }
  }

  if (document.getElementById('scientificPanelBody')) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
