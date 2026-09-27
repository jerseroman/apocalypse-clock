// Page search: a search field on the right of the section title. It finds a keyword in the text of every section, lists
// the matches by section, and on choice opens the section, opens any collapsed part around the match,
// scrolls to it and highlights it. It reads the page only; no model output changes.
(() => {
  'use strict';

  const MAX_PER_SECTION = 3;
  const MAX_RESULTS = 12;
  const SKIP = 'script, style, svg, select, option, noscript, .section-nav, .page-search, iframe';
  let results = [];
  let activeIndex = -1;
  let timer = 0;

  function init() {
    const page = document.querySelector('main.page');
    if (!page || !window.SectionNav) return;
    const bar = document.createElement('div');
    bar.className = 'page-search';
    bar.innerHTML = `
      <div class="page-search-box" role="search">
        <svg class="page-search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input type="search" id="pageSearchInput" placeholder="Search threats, sections, parameters…" autocomplete="off" aria-label="Search the page" aria-controls="pageSearchResults" aria-expanded="false">
        <kbd class="page-search-key" aria-hidden="true">Ctrl K</kbd>
      </div>
      <ul class="page-search-results" id="pageSearchResults" role="listbox" hidden></ul>`;
    const titleRow = document.querySelector('.section-title-row');
    if (titleRow) titleRow.appendChild(bar); else page.prepend(bar);

    const input = bar.querySelector('input');
    const list = bar.querySelector('ul');
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => render(input.value), 150);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!results.length) return;
        activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        markActive();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (results.length) choose(results[Math.max(0, activeIndex)]);
      } else if (event.key === 'Escape') {
        close();
      }
    });
    list.addEventListener('mousedown', event => {
      const item = event.target.closest('[data-result]');
      if (!item) return;
      event.preventDefault();
      choose(results[Number(item.dataset.result)]);
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    input.addEventListener('focus', () => { if (input.value.trim().length >= 2) render(input.value); });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  // Every text node inside a section, with the section it belongs to.
  function search(query) {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const bySection = new Map();
    const walker = document.createTreeWalker(document.querySelector('main.page'), NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.toLowerCase().includes(needle) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const holder = node.parentElement.closest('[data-nav-section]');
      if (!holder) continue;
      const sectionId = holder.dataset.navSection;
      const text = node.nodeValue.trim().toLowerCase();
      // Whole-text matches (a title or a name) first, then matches at the start, then the rest.
      // The threat card or table row a match sits in names where it is.
      const card = node.parentElement.closest('[data-threat-card]');
      let row = card ? null : node.parentElement.closest('tr');
      while (row && !row.querySelector('.threat-title-text')) row = row.parentElement.closest('tr');
      const context = card ? card.getAttribute('aria-label').replace(/ threat card$/, '') : row ? row.querySelector('.threat-title-text').textContent.trim() : '';
      // A threat's own card or row first, then whole-text matches, then matches at the start, then the rest.
      const score = context && context.toLowerCase() === needle ? -1 : text === needle ? 0 : text.startsWith(needle) ? 1 : 2;
      if (!bySection.has(sectionId)) bySection.set(sectionId, []);
      bySection.get(sectionId).push({ node, sectionId, score, context, offset: node.nodeValue.toLowerCase().indexOf(needle), length: needle.length });
    }
    const found = [];
    window.SectionNav.sections.forEach(section => {
      const matches = bySection.get(section.id);
      if (!matches) return;
      matches.map((m, i) => ({ ...m, i })).sort((a, b) => a.score - b.score || a.i - b.i).slice(0, MAX_PER_SECTION)
        .forEach(m => found.push({ ...m, total: matches.length }));
    });
    return found.slice(0, MAX_RESULTS);
  }

  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function snippet(result) {
    const text = result.node.nodeValue.replace(/\s+/g, ' ');
    const raw = result.node.nodeValue;
    const lead = raw.slice(0, result.offset).replace(/\s+/g, ' ');
    const start = Math.max(0, lead.length - 40);
    const hitStart = lead.length;
    const hitEnd = hitStart + result.length;
    const end = Math.min(text.length, hitEnd + 60);
    return `${start > 0 ? '…' : ''}${escapeHtml(text.slice(start, hitStart))}<mark>${escapeHtml(text.slice(hitStart, hitEnd))}</mark>${escapeHtml(text.slice(hitEnd, end))}${end < text.length ? '…' : ''}`;
  }

  function render(query) {
    const input = document.getElementById('pageSearchInput');
    const list = document.getElementById('pageSearchResults');
    results = search(query);
    activeIndex = results.length ? 0 : -1;
    if (query.trim().length < 2) { close(); return; }
    const label = id => (window.SectionNav.sections.find(s => s.id === id) || {}).label || id;
    list.innerHTML = results.length
      ? results.map((r, i) => `<li role="option" id="pageSearchResult${i}" data-result="${i}"><span class="page-search-section">${escapeHtml(label(r.sectionId))}${r.context ? ` · ${escapeHtml(r.context)}` : ''}${r.total > 1 ? ` · ${r.total} matches` : ''}</span><span class="page-search-snippet">${snippet(r)}</span></li>`).join('')
      : '<li class="page-search-none">No matches on the page.</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    markActive();
  }

  function markActive() {
    const list = document.getElementById('pageSearchResults');
    [...list.querySelectorAll('[data-result]')].forEach((item, i) => item.classList.toggle('is-active', i === activeIndex));
    const input = document.getElementById('pageSearchInput');
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `pageSearchResult${activeIndex}`);
    else input.removeAttribute('aria-activedescendant');
  }

  function close() {
    const list = document.getElementById('pageSearchResults');
    const input = document.getElementById('pageSearchInput');
    if (!list) return;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  // Opens whatever keeps the match hidden: a collapsed threat card, a closed block or panel.
  function reveal(element) {
    // A match in a hidden Model Diagnostics tab opens that tab first.
    const diagPanel = element.closest('[data-diag-panel]');
    if (diagPanel && diagPanel.hidden && window.DiagnosticsView) window.DiagnosticsView.show(diagPanel.dataset.diagPanel);
    for (let el = element; el && el !== document.body; el = el.parentElement) {
      if (el.matches('.climate-feature-card.is-collapsed')) {
        const toggle = el.querySelector('[data-threat-action="toggle-collapse"]');
        if (toggle) toggle.click();
      } else if (el.matches('details:not([open])')) {
        el.open = true;
      } else if (el.matches('.collapse-body:not(.open)')) {
        const header = document.querySelector(`[data-collapse-target="${el.id.replace(/-body$/, '')}"]`);
        if (header) header.click();
      } else if (el.id === 'scientificPanelBody' && el.hidden) {
        const toggle = document.getElementById('scientificPanelToggle');
        if (toggle) toggle.click();
      } else if (el.id && el.style.display === 'none') {
        const header = document.querySelector(`[data-toggle-block="${el.id}"]`);
        if (header) header.click();
      }
    }
  }

  function choose(result) {
    if (!result) return;
    close();
    window.SectionNav.show(result.sectionId);
    const element = result.node.parentElement;
    reveal(element);
    requestAnimationFrame(() => {
      const range = document.createRange();
      const offset = Math.min(result.offset, result.node.length);
      range.setStart(result.node, offset);
      range.setEnd(result.node, Math.min(offset + result.length, result.node.length));
      const rect = range.getBoundingClientRect();
      const top = rect.height ? rect.top + window.scrollY - 140 : element.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      if (window.CSS && CSS.highlights && window.Highlight) {
        CSS.highlights.set('page-search', new Highlight(range));
        setTimeout(() => CSS.highlights.delete('page-search'), 4000);
      }
      element.classList.add('page-search-flash');
      setTimeout(() => element.classList.remove('page-search-flash'), 2200);
    });
  }

  // Loaded after the page markup: run at once so the menu is in place before the heavy scripts load.
  if (document.querySelector('main.page')) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
