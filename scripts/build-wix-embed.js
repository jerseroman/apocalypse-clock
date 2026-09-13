const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist');
const outputFile = path.join(outputDir, 'wix-embed-v1.2.8.html');

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const inlineScript = relativePath => `<script>\n${read(relativePath).replace(/<\/script/gi, '<\\/script')}\n</script>`;

function replaceExactly(source, marker, replacement) {
  const first = source.indexOf(marker);
  if (first < 0 || source.indexOf(marker, first + marker.length) >= 0) {
    throw new Error(`Expected exactly one marker: ${marker}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + marker.length);
}

let html = read('index.html');
html = replaceExactly(html, '<link rel="stylesheet" href="./src/styles.css">', `<style>\n${read('src/styles.css')}\n</style>`);
html = replaceExactly(html, '<script src="./src/action-delegation.js"></script>', inlineScript('src/action-delegation.js'));
html = replaceExactly(html, '<script src="./vendor/echarts.bundle.js"></script>', inlineScript('vendor/echarts.bundle.js'));
html = replaceExactly(html, '<script src="./vendor/cytoscape.bundle.js"></script>', inlineScript('vendor/cytoscape.bundle.js'));
html = replaceExactly(html, '<script src="./src/cascade-model.js"></script>', inlineScript('src/cascade-model.js'));
html = replaceExactly(html, '<script src="./src/app.js"></script>', inlineScript('src/app.js'));
html = replaceExactly(html, '<script src="./src/aria-status.js"></script>', inlineScript('src/aria-status.js'));

const unresolvedLocalAssets = html.match(/(?:src|href)=["']\.\/(?:src|vendor)\//g) || [];
if (unresolvedLocalAssets.length) {
  throw new Error(`Unresolved local assets remain: ${unresolvedLocalAssets.length}`);
}
if (!html.includes('Model 1.2.8 · Data 1.9.0')) {
  throw new Error('Expected model and dataset identity is missing from the Wix bundle.');
}
if (!html.includes('id="cascadeMedianYear"') || !html.includes('id="cascadeHeadlineYear"')) {
  throw new Error('Expected paired P50/P90 horizon clocks are missing from the Wix bundle.');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, html, 'utf8');

const bytes = fs.statSync(outputFile).size;
const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex').toUpperCase();
console.log(`Wix bundle: ${outputFile}`);
console.log(`Bytes: ${bytes}`);
console.log(`SHA-256: ${sha256}`);
