// Home page Velo bridge for the Apocalypse Clock Custom Element.
$w.onReady(function () {
  const clock = $w('#apocalypseClock');
  clock.setAttribute('integration', 'wix-velo');
  clock.setAttribute('model-version', '1.2.9');
  clock.setAttribute('dataset-version', '1.9.0');
});
