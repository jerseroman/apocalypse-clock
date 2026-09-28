// Apocalypse Clock 1.5.0 - Wix Velo page bridge
$w.onReady(function () {
  const headerCtaButton = $w("#headerCtaButton");
  if (headerCtaButton && typeof headerCtaButton.hide === "function") {
    headerCtaButton.hide();
  }
  const clock = $w("#apocalypseClock");
  clock.setAttribute("integration", "wix-velo");
  clock.setAttribute("model-version", "1.5.0");
  clock.setAttribute("dataset-version", "1.9.0");
});
