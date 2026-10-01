// Left-hand section menu: one button per section of the page; the chosen section fills the right-hand
// side. The menu only shows and hides existing elements (marked with data-nav-section) and asks the
// existing charts to redraw after a switch, so no model output changes.
(() => {
  'use strict';

  // Menu names are the titles the page shows; the order is the owner's. Targets are existing elements.
  const SECTIONS = [
    // The conditional scenario opens together with the clocks. The validation notice is on every section.
    { id: 'horizon', label: 'Projected horizon', targets: ['#heroAbsoluteClock', '#conditionalScenario'] },
    { id: 'risk-horizons', label: 'Risk horizons', targets: ['.page > .priority-section-header', '#aggregateRow', '#advancedMethodBox', '#overviewStrip', '.page > .legend-row'] },
    { id: 'top-threats', label: 'Threats by Rank', targets: ['#climateBreakdownEnhancedCard', '#priorityRow'] },
    { id: 'network', label: 'Causal dependency network', targets: ['.main-grid > .content-col > .panel'] },
    { id: 'scientific', label: 'Model Diagnostics', targets: ['#scientificPanelShell'] },
    { id: 'sources', label: 'Source registry', targets: ['.page > .source-card'] },
    { id: 'console', label: 'Live calculation console', targets: ['#navConsoleCard'] },
    { id: 'contribution', label: 'Threat contribution ranking', targets: ['#contributionRankingCard'] },
    // Indicators, narrative and domain stress describe the same scenario result, so they open together.
    { id: 'scenario-overview', label: 'Scenario overview', targets: ['.page > .summary-strip', '.main-grid > .sidebar > .panel:nth-child(1)', '.main-grid > .sidebar > .panel:nth-child(2)'] },
    { id: 'register', label: 'Full threat register', targets: ['.page > .sec-label', '.page > .model-output-note', '.page > .tbl-wrap'] },
    { id: 'mission', label: 'Mission statement', targets: ['#heroMainCard'] },
  ];
  // Line icons of the menu items, keyed by section id: a 12 x 12 grid, 1 px strokes on half pixels.
  const ICONS = {
    horizon: '<circle cx="6" cy="6.5" r="4.5"/><path d="M6 6.5V4M4.5 1h3"/>',
    'risk-horizons': '<path d="M2.5 1.5h7M2.5 10.5h7M3.5 1.5 8.5 10.5M8.5 1.5 3.5 10.5"/>',
    'top-threats': '<path d="M1.5 3h9M1.5 6h6M1.5 9h3"/>',
    network: '<circle cx="2.5" cy="6" r="1.5"/><circle cx="9.5" cy="2.5" r="1.5"/><circle cx="9.5" cy="9.5" r="1.5"/><path d="M3.8 5.3 8.2 3.2M3.8 6.7l4.4 2.1"/>',
    scientific: '<path d="M.5 6.5h2.5l1.5-4 2 7 1.5-3h3.5"/>',
    sources: '<ellipse cx="6" cy="3" rx="4" ry="1.5"/><path d="M2 3v6c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5V3M2 6c0 .8 1.8 1.5 4 1.5s4-.7 4-1.5"/>',
    console: '<rect x="1.5" y="2" width="9" height="8" rx="1"/><path d="M3.5 4.5 5 6 3.5 7.5M6.5 7.5h2"/>',
    contribution: '<path d="M2.5 10.5v-4M5 10.5v-8M7.5 10.5v-5.5M10 10.5v-3"/>',
    'scenario-overview': '<rect x="1.5" y="1.5" width="4" height="4" rx=".5"/><rect x="6.5" y="1.5" width="4" height="2.5" rx=".5"/><rect x="6.5" y="5" width="4" height="5.5" rx=".5"/><rect x="1.5" y="6.5" width="4" height="4" rx=".5"/>',
    register: '<rect x="1.5" y="2" width="9" height="8" rx="1"/><path d="M1.5 4.5h9M1.5 7.5h9M4.5 2v8"/>',
    mission: '<circle cx="6" cy="6" r="4.5"/><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="6" r=".5"/>',
  };
  const icon = id => ICONS[id] ? `<svg class="section-nav-icon" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">${ICONS[id]}</svg>` : '';

  // The address #section-all shows every section at once, as the page looked before the menu.
  const WHOLE_PAGE = 'all';
  const GITHUB_URL = 'https://github.com/jerseroman/apocalypse-clock';
  // Public address shared by the Share button (the same one the mission statement's share menu uses).
  const SHARE_URL = 'https://jerseroman.github.io/apocalypse-clock/';
  const SHARE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>';
  const MAIL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>';
  const GITHUB_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  const HASH_PREFIX = '#section-';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Parts of a newly opened section appear one after another, this far apart (ms), at most this many.
  const STAGGER_MS = 40;
  const STAGGER_MAX = 6;
  let current = null;

  function init() {
    const page = document.querySelector('main.page');
    const calcConsole = document.getElementById('calcConsole');
    const heroBand = document.querySelector('.hero-band');
    if (!page || !calcConsole || !heroBand) return;

    // The calculation console gets its own card so that it can open on its own.
    const consoleCard = document.createElement('div');
    consoleCard.className = 'card nav-console-card';
    consoleCard.id = 'navConsoleCard';
    heroBand.after(consoleCard);
    consoleCard.appendChild(calcConsole);

    // The clocks and the conditional scenario share one window. Its chart spans the scenario's full width.
    const conditional = document.getElementById('conditionalScenario');
    const clocks = document.getElementById('heroAbsoluteClock');
    if (conditional && clocks) {
      const horizonWindow = document.createElement('div');
      horizonWindow.className = 'horizon-window';
      clocks.before(horizonWindow);
      horizonWindow.append(clocks, conditional);
      const chart = document.getElementById('conditionalCdfChart');
      const legend = document.getElementById('conditionalLegend');
      const grid = conditional.querySelector('.conditional-grid');
      if (chart && grid) grid.before(chart);
      if (legend && chart) chart.after(legend);
    }

    SECTIONS.forEach(section => {
      section.elements = section.targets.flatMap(selector => [...document.querySelectorAll(selector)]);
      section.elements.forEach(el => { el.dataset.navSection = section.id; });
    });

    // Large title of the open section, in the style of the page title.
    const title = document.createElement('h2');
    title.className = 'section-page-title';
    title.id = 'sectionPageTitle';
    // The title shares its row with the page search, which page-search.js adds on the right.
    const titleRow = document.createElement('div');
    titleRow.className = 'section-title-row';
    titleRow.appendChild(title);
    heroBand.before(titleRow);

    const empty = document.createElement('p');
    empty.className = 'nav-empty';
    empty.id = 'navEmpty';
    empty.hidden = true;
    empty.textContent = 'This section appears when the model calculation has finished.';
    heroBand.before(empty);

    const nav = document.createElement('nav');
    nav.className = 'section-nav';
    nav.setAttribute('aria-label', 'Page sections');
    const logo = document.querySelector('.header-logo');
    nav.innerHTML = `
      <div class="section-nav-brand">
        ${logo ? `<img src="${logo.getAttribute('src')}" alt="" width="44" height="44">` : ''}
        <div class="section-nav-brand-text"><h1 class="section-nav-title">Apocalypse Clock</h1></div>
      </div>
      <ul class="section-nav-list">
        ${SECTIONS.map(s => `<li><a class="section-nav-link" href="${HASH_PREFIX}${s.id}" data-nav-target="${s.id}">${icon(s.id)}<span>${s.label}</span></a></li>`).join('')}
      </ul>
      <div class="section-nav-social">${socialLinks()}</div>`;
    document.body.prepend(nav);
    buildPhoneDrawer(nav);
    const list = nav.querySelector('.section-nav-list');
    const indicator = document.createElement('li');
    indicator.className = 'section-nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    list.prepend(indicator);
    window.addEventListener('resize', () => moveIndicator(false));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { moveIndicator(false); fitMonitorLine(); });
    fitMonitorLine();
    const shareButton = nav.querySelector('#navShareButton');
    if (shareButton) shareButton.addEventListener('click', () => shareClock(shareButton));
    // The monitor line goes under the menu logo, the revision under the link buttons.
    const overline = document.querySelector('.site-header .header-overline');
    const revision = document.querySelector('.site-header .header-last-update');
    if (overline) nav.querySelector('.section-nav-brand-text').appendChild(overline);
    if (revision) (nav.querySelector('.section-nav-drawer') || nav).appendChild(revision);
    document.body.classList.add('has-section-nav');

    nav.addEventListener('click', event => {
      const link = event.target.closest('[data-nav-target]');
      if (!link) return;
      event.preventDefault();
      show(link.dataset.navTarget, true);
    });
    // Only hashes of this menu switch sections; other links such as href="#" are left alone.
    window.addEventListener('hashchange', () => {
      if (location.hash.startsWith(HASH_PREFIX)) show(location.hash.slice(HASH_PREFIX.length), false);
    });

    // A section that the app reveals later (for example the conditional scenario) replaces the note.
    const watcher = new MutationObserver(() => updateEmptyNote());
    SECTIONS.forEach(s => s.elements.forEach(el => watcher.observe(el, { attributes: true, attributeFilter: ['hidden', 'style'] })));

    // Printing and saving as PDF include every section.
    window.addEventListener('beforeprint', () => document.querySelectorAll('.nav-hidden').forEach(el => el.classList.remove('nav-hidden')));
    window.addEventListener('afterprint', () => show(current, false));

    // The page search opens sections through this.
    window.SectionNav = { sections: SECTIONS, show: id => show(id, true) };

    // The validation notice can be closed; it returns in the next browser session.
    const notice = document.querySelector('.page > .validation-notice');
    if (notice) {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem('validationNoticeHidden') === '1'; } catch (error) { /* storage blocked */ }
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'validation-notice-close';
      close.setAttribute('aria-label', 'Hide this notice');
      close.setAttribute('title', 'Hide this notice');
      close.textContent = '×';
      notice.prepend(close);
      const dismissNotice = event => {
        // Do not cancel pointerdown: removing the button during that event can
        // prevent the browser from completing the gesture as a click.
        if (event && event.type === 'click') {
          event.preventDefault();
          event.stopPropagation();
        }
        notice.classList.add('is-dismissed');
        close.setAttribute('aria-pressed', 'true');
        try { sessionStorage.setItem('validationNoticeHidden', '1'); } catch (error) { /* storage blocked */ }
      };
      // Use the completed activation event (click) for mouse, touch and keyboard.
      // Dismissing on pointerdown removes the target before some browsers/Wix
      // wrappers dispatch the corresponding click, producing inconsistent UX.
      close.addEventListener('click', dismissNotice);
      if (dismissed) notice.classList.add('is-dismissed');
    }

    const fromHash = location.hash.startsWith(HASH_PREFIX) ? location.hash.slice(HASH_PREFIX.length) : null;
    show(fromHash === WHOLE_PAGE || SECTIONS.some(s => s.id === fromHash) ? fromHash : SECTIONS[0].id, false);
  }

  // GitHub, Facebook and Perplexity buttons under the menu. Facebook and Perplexity use the same
  // addresses as the buttons in the mission statement.
  function socialLinks() {
    const facebook = document.querySelector('#missionActions a[href*="facebook.com"]');
    const perplexity = document.querySelector('#missionActions a[href*="perplexity.ai"]');
    const perplexityIcon = perplexity && perplexity.querySelector('img');
    const links = [
      { href: GITHUB_URL, label: 'GitHub', icon: GITHUB_ICON },
      facebook && { href: facebook.getAttribute('href'), label: 'Facebook', icon: '<span class="section-nav-letter" aria-hidden="true">f</span>' },
      perplexity && { href: perplexity.getAttribute('href'), label: 'Perplexity', icon: perplexityIcon ? `<img src="${perplexityIcon.getAttribute('src')}" alt="" width="16" height="16">` : '' },
    ].filter(Boolean);
    const mail = document.querySelector('#missionActions a[href^="mailto:"]');
    return links.map(link => `<a class="section-nav-social-link" href="${link.href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${link.icon}<span>${link.label}</span></a>`).join('')
      + `<button type="button" class="section-nav-social-link" id="navShareButton">${SHARE_ICON}<span>Share</span></button>`
      + (mail ? `<a class="section-nav-social-link" href="${mail.getAttribute('href')}">${MAIL_ICON}<span>Email</span></a>` : '');
  }

  // Share: the system share sheet where the browser has one, otherwise the address is copied.
  async function shareClock(button) {
    const label = button.querySelector('span');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Apocalypse Clock', url: SHARE_URL });
        return;
      }
      await navigator.clipboard.writeText(SHARE_URL);
      label.textContent = 'Link copied';
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      label.textContent = 'Copy failed';
    }
    setTimeout(() => { label.textContent = 'Share'; }, 1600);
  }

  function show(id, updateHash) {
    const section = SECTIONS.find(s => s.id === id);
    if (!section && id !== WHOLE_PAGE) return;
    const changed = current !== id;
    current = id;
    document.body.dataset.navCurrent = id;
    SECTIONS.forEach(s => s.elements.forEach(el => el.classList.toggle('nav-hidden', Boolean(section) && s !== section)));
    document.querySelectorAll('.section-nav-link').forEach(link => {
      const active = link.dataset.navTarget === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (updateHash && location.hash !== HASH_PREFIX + id) history.pushState(null, '', HASH_PREFIX + id);
    const title = document.getElementById('sectionPageTitle');
    if (title) {
      title.hidden = !section;
      title.textContent = section ? section.label : '';
    }
    updateEmptyNote();
    moveIndicator(changed);
    if (changed) {
      // Most browsers scroll the document element, but Wix's phone renderer
      // makes BODY its independent vertical scroller. Reset every applicable
      // container so a newly selected, shorter section never opens below its
      // content as an apparently blank page.
      try { window.scrollTo(0, 0); } catch (error) { /* embedded host may block it */ }
      const nativeDocument = window.document;
      [nativeDocument.scrollingElement, nativeDocument.documentElement, nativeDocument.body]
        .filter(Boolean)
        .forEach(element => { element.scrollTop = 0; });
      animateIn(section);
      // Charts drawn while their section was hidden have no size; redraw them now that it is shown.
      requestAnimationFrame(() => {
        try { if (typeof redrawAfterResize === 'function') redrawAfterResize(); } catch (error) { /* charts not ready yet */ }
      });
    }
  }

  // Phones: the menu items, link buttons and revision line sit in a drawer opened by a menu button.
  // On wider screens the drawer wrapper is display: contents, so the desktop menu is unchanged.
  function buildPhoneDrawer(nav) {
    const drawer = document.createElement('div');
    drawer.className = 'section-nav-drawer';
    drawer.id = 'sectionNavDrawer';
    [...nav.children].filter(el => !el.classList.contains('section-nav-brand')).forEach(el => drawer.appendChild(el));
    nav.appendChild(drawer);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'section-nav-toggle';
    toggle.setAttribute('aria-controls', 'sectionNavDrawer');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    nav.querySelector('.section-nav-brand').after(toggle);
    const setOpen = open => {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('nav-drawer-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = open
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    drawer.addEventListener('click', event => { if (event.target.closest('.section-nav-link')) setOpen(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) setOpen(false); });
  }

  // Spreads the monitor line under the menu title so both lines are equally wide.
  function fitMonitorLine() {
    const title = document.querySelector('.section-nav-title');
    const line = document.querySelector('.section-nav .header-overline');
    if (!title || !line || !line.textContent) return;
    line.style.letterSpacing = '0px';
    line.style.marginRight = '0px';
    const range = document.createRange();
    range.selectNodeContents(title);
    const target = range.getBoundingClientRect().width;
    range.selectNodeContents(line);
    const natural = range.getBoundingClientRect().width;
    const gaps = line.textContent.length - 1;
    if (!target || !natural || gaps < 1) return;
    const spacing = Math.max(0, (target - natural) / gaps);
    line.style.letterSpacing = `${spacing}px`;
    // Letter spacing also follows the last letter; pull it back so the line stays centred.
    line.style.marginRight = `${-spacing}px`;
  }

  // Moves the menu highlight to the active item; it glides there unless this is the first placement.
  function moveIndicator(animate) {
    const indicator = document.querySelector('.section-nav-indicator');
    const active = document.querySelector('.section-nav-link.is-active');
    if (!indicator) return;
    if (!active) { indicator.style.opacity = '0'; return; }
    const wasPlaced = indicator.classList.contains('is-placed');
    indicator.classList.toggle('no-glide', !animate || !wasPlaced || reducedMotion.matches);
    indicator.style.opacity = '1';
    indicator.style.height = `${active.offsetHeight}px`;
    indicator.style.transform = `translateY(${active.parentElement.offsetTop}px)`;
    indicator.classList.add('is-placed');
  }

  // The title and the visible parts of the new section fade and slide in, one after another.
  function animateIn(section) {
    if (reducedMotion.matches) return;
    // Only the title text moves; the search field beside it stays still.
    const title = document.getElementById('sectionPageTitle');
    const parts = [title, ...(section ? section.elements : [])].filter(el => el && el.getClientRects().length);
    parts.slice(0, STAGGER_MAX + 1).forEach((el, index) => {
      el.classList.remove('nav-enter');
      void el.offsetWidth;
      el.style.animationDelay = `${index * STAGGER_MS}ms`;
      el.classList.add('nav-enter');
      el.addEventListener('animationend', () => { el.classList.remove('nav-enter'); el.style.animationDelay = ''; }, { once: true });
    });
  }

  function updateEmptyNote() {
    const section = SECTIONS.find(s => s.id === current);
    const note = document.getElementById('navEmpty');
    if (!note) return;
    note.hidden = !section || section.elements.some(el => el.getClientRects().length > 0);
  }

  // Loaded after the page markup: run at once so the menu is in place before the heavy scripts load.
  if (document.querySelector('main.page')) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
