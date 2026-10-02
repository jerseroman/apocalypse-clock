const fs = require('node:fs');
const crypto = require('node:crypto');

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/patch-wix-mobile-embed.js <current-wix-mobile.html> <output.html>');
}

const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const navMatch = indexHtml.match(/<nav class="footer-links footer-threat-links"[\s\S]*?<\/nav>/);
if (!navMatch) throw new Error('The GitHub source does not contain the threat-page footer links.');

const sourceMatch = sourceHtml.match(/const mobileDocument = \[\r?\n([\s\S]*?)\r?\n      \]\.join\('\\n'\);/);
if (!sourceMatch) throw new Error('The supplied Wix mobile embed does not contain its expected srcdoc array.');

const sourceLines = JSON.parse(`[${sourceMatch[1]}]`);
let mobileDocument = sourceLines.join('\n');
const utilityNavLabel = 'Footer links';
if ((mobileDocument.match(/class="footer-links footer-threat-links"/g) || []).length !== 0) {
  throw new Error('The Wix mobile source already contains threat-page links; refusing to duplicate them.');
}
const utilityLabelIndex = mobileDocument.indexOf(utilityNavLabel);
const utilityNavStart = mobileDocument.lastIndexOf('<nav', utilityLabelIndex);
if (utilityLabelIndex < 0 || utilityNavStart < 0 || (mobileDocument.match(/Footer links/g) || []).length !== 1) {
  throw new Error('Expected exactly one existing four-link footer in the Wix mobile document.');
}

// The Wix-hosted srcdoc is itself one JavaScript-string-escaped HTML layer.
// Keep the same escaped-attribute convention while inserting the markup.
const escapedThreatNav = navMatch[0]
  .replaceAll('"', '\\"')
  .replace(/\r?\n/g, '\\n');
mobileDocument = mobileDocument.slice(0, utilityNavStart) + `${escapedThreatNav}\\n  ` + mobileDocument.slice(utilityNavStart);
const mobileSha256 = crypto.createHash('sha256').update(mobileDocument).digest('hex');
const encodedLines = mobileDocument
  .split('\n')
  .map(line => JSON.stringify(line).replace(/<\/script/gi, '<\\/script'))
  .join(',\n        ');
const replacement = `const mobileDocument = [\n        ${encodedLines}\n      ].join('\\n');`;

let html = sourceHtml.replace(sourceMatch[0], replacement);
const metaPattern = /(<meta name="apocalypse-clock-mobile-source-sha256" content=")[^"]+(">)/;
if (!metaPattern.test(html)) throw new Error('The Wix mobile source hash metadata is missing.');
html = html.replace(metaPattern, `$1${mobileSha256}$2`);

const linkCount = (navMatch[0].match(/<a href="https:\/\/www\.apocalypseclock\.com\//g) || []).length;
if (linkCount !== 23) throw new Error(`Expected 23 threat-page links in the new footer nav; found ${linkCount}.`);
fs.writeFileSync(outputPath, html, 'utf8');

console.log(JSON.stringify({
  outputPath,
  bytes: Buffer.byteLength(html),
  mobileDocumentCharacters: mobileDocument.length,
  mobileSourceSha256: mobileSha256,
  threatPageLinks: 23,
  existingUtilityLinks: 4,
}, null, 2));
