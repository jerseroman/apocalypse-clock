/*!
 * Apocalypse Clock — https://www.apocalypseclock.com/
 * (c) 2026 Apocalypse Clock project authors. See LICENSE.
 */
(function installActionDelegation(){
  if (window.__AC_ACTIONS_INIT__) return;
  window.__AC_ACTIONS_INIT__ = true;
  function closeShareMenu(){ const d=document.getElementById('shareDropdown'); if(d) d.style.display='none'; }
  function toggleShareMenu(event){
    if (event) event.preventDefault();
    if (typeof buildShareLinks === 'function') buildShareLinks();
    const d=document.getElementById('shareDropdown');
    if(d) d.style.display = d.style.display === 'block' ? 'none' : 'block';
  }
  function toggleMissionMore(){
    const btn=document.getElementById('missionToggle');
    const more=document.getElementById('missionMore');
    if(!btn || !more) return;
    const open = more.style.display !== 'none';
    more.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Read more' : 'Read less';
    btn.setAttribute('aria-expanded', String(!open));
  }
  function toggleBlock(bodyId, arrowId){
    const b=document.getElementById(bodyId);
    const a=arrowId ? document.getElementById(arrowId) : null;
    if(!b) return;
    const open=b.style.display !== 'none';
    b.style.display = open ? 'none' : 'block';
    if(a) a.textContent = open ? '▶ Show' : '▼ Hide';
    if(!open && typeof resizeScientificCharts === 'function') setTimeout(resizeScientificCharts,80);
  }
  async function copyShareLink(btn){
    try { await navigator.clipboard.writeText('https://www.apocalypseclock.com'); }
    catch(e) { console.warn('Clipboard copy failed', e); }
    if(btn){ btn.textContent='✓ Copied!'; setTimeout(()=>{btn.textContent='⧉ Copy link'; closeShareMenu();},800); }
  }
  function runAction(action, el, event){
    if(action) {
      event.preventDefault();
      if(action === 'toggle-mission-more') return toggleMissionMore();
      if(action === 'toggle-share-menu') return toggleShareMenu(event);
      if(action === 'close-share-menu') return closeShareMenu();
      if(action === 'copy-share-link') return copyShareLink(el);
      if(action === 'export-json' && typeof exportClockJSON === 'function') return exportClockJSON();
      if(action === 'export-csv' && typeof exportClockCSV === 'function') return exportClockCSV();
      if(action === 'print-page') return window.print();
      if(action === 'run-all' && typeof runAll === 'function') return runAll();
      if(action === 'toggle-weibull-extra') {
        const d=document.getElementById('weibullExtraRows');
        const b=document.getElementById('weibullShowMoreBtn');
        if(!d || !b) return;
        const hidden = b.getAttribute('data-hidden-count') || '';
        const open=d.style.display !== 'none';
        d.style.display = open ? 'none' : 'block';
        b.textContent = open ? `Show ${hidden} more threats ▾` : 'Show less ▴';
        return;
      }
      if(action === 'rerun-advanced' && typeof _rerunAdvanced === 'function') return _rerunAdvanced(Number(el.getAttribute('data-year')));
    }
    const collapseTarget = el && el.getAttribute && el.getAttribute('data-collapse-target');
    if(collapseTarget && typeof toggleCollapse === 'function') { event.preventDefault(); return toggleCollapse(collapseTarget); }
    const blockTarget = el && el.getAttribute && el.getAttribute('data-toggle-block');
    if(blockTarget) { event.preventDefault(); return toggleBlock(blockTarget, el.getAttribute('data-toggle-arrow')); }
  }
  document.addEventListener('click', function(event){
    const el = event.target.closest('[data-action],[data-collapse-target],[data-toggle-block]');
    if(!el) return;
    runAction(el.getAttribute('data-action'), el, event);
  });
  document.addEventListener('keydown', function(event){
    if(event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target.closest('[data-action],[data-collapse-target],[data-toggle-block]');
    if(!el) return;
    runAction(el.getAttribute('data-action'), el, event);
  });
})();
