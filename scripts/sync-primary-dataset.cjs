const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { config } = require(path.join(root, 'package.json'));
const datasetPath = path.join(root, config.primaryDataset);
const payload = fs.readFileSync(datasetPath, 'utf8').trim();

JSON.parse(payload);

for (const name of ['index.html', '404.html']) {
  const file = path.join(root, name);
  const html = fs.readFileSync(file, 'utf8');
  const next = html.replace(
    /(<script id="bundledSources" type="application\/json">)\s*[\s\S]*?\s*(<\/script>)/,
    (_match, open, close) => `${open}\n${payload}\n${close}`,
  );
  if (next === html) throw new Error(`${name}: bundledSources block was not updated`);
  fs.writeFileSync(file, next, 'utf8');
}

console.log(`Synchronized ${config.primaryDataset} into index.html and 404.html.`);
