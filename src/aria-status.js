/*!
 * Apocalypse Clock — https://jerseroman.github.io/apocalypse-clock/
 * (c) 2026 Apocalypse Clock project authors. See LICENSE.
 */
(function(){
  window.announceStatus = function(message){
    var el = document.getElementById('ariaLive');
    if (el) el.textContent = String(message || '');
  };
})();
