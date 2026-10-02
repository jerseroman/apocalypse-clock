const fs = require('node:fs');

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/patch-wix-custom-element.js <current-apocalypse-clock.js> <output.js>');
}

const source = fs.readFileSync(sourcePath, 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const navMatch = indexHtml.match(/<nav class="footer-links footer-threat-links"[\s\S]*?<\/nav>/);
if (!navMatch) throw new Error('The GitHub source does not contain the threat-page footer links.');

const htmlAssignment = /const CLOCK_HTML = ("(?:\\.|[^"\\])*");/;
const htmlMatch = source.match(htmlAssignment);
if (!htmlMatch) throw new Error('The supplied Wix custom-element source has no CLOCK_HTML document.');

let appHtml = JSON.parse(htmlMatch[1]);
if (appHtml.includes('footer-threat-links')) {
  throw new Error('The Wix custom-element source already contains threat-page links; refusing to duplicate them.');
}
const utilityNav = '<nav class="footer-links" aria-label="Footer links">';
if ((appHtml.match(/<nav class="footer-links" aria-label="Footer links">/g) || []).length !== 1) {
  throw new Error('Expected exactly one existing four-link footer in the Wix custom element.');
}
const threatCount = (navMatch[0].match(/<a href="https:\/\/www\.apocalypseclock\.com\//g) || []).length;
if (threatCount !== 23) throw new Error(`Expected 23 threat-page links, found ${threatCount}.`);

appHtml = appHtml.replace(utilityNav, `${navMatch[0]}\n  ${utilityNav}`);
const encodedHtml = JSON.stringify(appHtml).replace(/<\/script/gi, '<\\/script');
const patchedSource = source.replace(htmlAssignment, () => `const CLOCK_HTML = ${encodedHtml};`);
fs.writeFileSync(outputPath, patchedSource, 'utf8');

console.log(JSON.stringify({
  outputPath,
  sourceCharacters: patchedSource.length,
  threatPageLinks: threatCount,
  existingUtilityLinks: 4,
}, null, 2));
