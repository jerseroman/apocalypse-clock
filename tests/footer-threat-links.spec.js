const { test, expect } = require('@playwright/test');

const threatPages = [
  ['Climate Breakdown', 'climatebreakdown'],
  ['Geopolitical Escalation', 'geopoliticalescalation'],
  ['Advanced AI Destabilizer', 'advancedaidestabilizer'],
  ['Space Infrastructure Disruption', 'spaceinfrastructuredisruption'],
  ['Mass Displacement', 'massdisplacement'],
  ['Biodiversity Loss', 'biodiversityloss'],
  ['Freshwater Stress', 'freshwaterstress'],
  ['Nuclear Conflict', 'nuclearconflict'],
  ['Pandemic & Biosecurity', 'pandemicbiosecurity'],
  ['Ocean Degradation', 'oceandegradation'],
  ['Authoritarian Drift', 'authoritariandrift'],
  ['Global Governance Fragmentation', 'globalgovernancefragmentation'],
  ['Engineered Biological Event', 'engineeredbiologicalevent'],
  ['Debt / Financial Contagion', 'debtfinancialcontagion'],
  ['Antimicrobial Resistance', 'antimicrobialresistance'],
  ['Systemic Cyberattacks', 'systemiccyberattacks'],
  ['Epistemic Breakdown', 'epistemicbreakdown'],
  ['Economic Fracture', 'economicfracture'],
  ['Energy & Supply Chains', 'energysupplychains'],
  ['Soil & Food System', 'soilfoodsystem'],
  ['Autonomous Weapons Escalation', 'autonomousweaponsescalation'],
  ['Toxic Pollution & PFAS', 'toxicpollutionpfas'],
  ['Critical Minerals Bottleneck', 'criticalmineralsbottleneck'],
];

test('footer links all 23 existing Wix threat subpages above the existing utility links', async ({ page }) => {
  await page.goto('/index.html');

  const threatNav = page.locator('.footer-threat-links');
  await expect(threatNav).toHaveAttribute('aria-label', 'Threat pages');
  await expect(threatNav.locator('a')).toHaveCount(threatPages.length);

  for (const [name, slug] of threatPages) {
    await expect(threatNav.getByRole('link', { name, exact: true }))
      .toHaveAttribute('href', `https://www.apocalypseclock.com/${slug}`);
  }

  await expect(page.locator('.footer-links[aria-label="Footer links"] a')).toHaveCount(4);
  const threatNavBox = await threatNav.boundingBox();
  const utilityNavBox = await page.locator('.footer-links[aria-label="Footer links"]').boundingBox();
  expect(threatNavBox).not.toBeNull();
  expect(utilityNavBox).not.toBeNull();
  expect(threatNavBox.y + threatNavBox.height).toBeLessThanOrEqual(utilityNavBox.y + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
