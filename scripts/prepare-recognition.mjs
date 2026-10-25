import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const root = path.resolve('resources/recognition');
await fs.mkdir(path.join(root, 'models'), { recursive: true });
await fs.copyFile(
  require.resolve('tesseract.js/LICENSE.md'),
  path.join(root, 'LICENSE-Apache-2.0.txt'),
);
await fs.writeFile(
  path.join(root, 'NOTICE.txt'),
  'Offline OCR: Tesseract.js 6.0.1 and Tesseract.js-core, Apache-2.0.\nchi_sim and eng language data: https://github.com/naptha/tessdata (Apache-2.0).\nAugment icon templates: Riot Games assets via CommunityDragon 16.21. All game asset rights remain with their owners. Sources and hashes: icons.json.\n',
);
for (const language of ['chi_sim', 'eng']) {
  const model = require(`@tesseract.js-data/${language}`);
  await fs.copyFile(
    path.join(model.langPath, `${language}.traineddata.gz`),
    path.join(root, 'models', `${language}.traineddata.gz`),
  );
}
const iconRoot = path.join(root, 'icons');
await fs.mkdir(iconRoot, { recursive: true });
const source =
  'https://raw.communitydragon.org/16.21/plugins/rcp-be-lol-game-data/global/zh_cn/v1/cherry-augments.json';
const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('Cannot read icon manifest');
const rows = await response.json();
const pool = JSON.parse(await fs.readFile('content/catalog/augments.json', 'utf8')).filter(
  (a) => !a.key.startsWith('GoH_'),
);
const manifest = [];
let index = 0;
async function worker() {
  while (index < pool.length) {
    const a = pool[index++];
    const meta = rows.find((r) => r.id === a.gameId);
    if (!meta) throw new Error('Missing icon ' + a.gameId);
    const file = `${a.gameId}.png`,
      dest = path.join(iconRoot, file);
    let bytes;
    try {
      bytes = await fs.readFile(dest);
    } catch {}
    const url =
      'https://raw.communitydragon.org/16.21/plugins/rcp-be-lol-game-data/global/default/' +
      meta.augmentSmallIconPath.replace(/^\/lol-game-data\/assets\//i, '').toLowerCase();
    if (!bytes) {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`Icon HTTP ${r.status}: ${a.gameId}`);
      bytes = Buffer.from(await r.arrayBuffer());
      await fs.writeFile(dest, bytes);
    }
    if (bytes[0] !== 137 || bytes[1] !== 80) throw new Error('Invalid PNG ' + a.gameId);
    manifest.push({
      gameId: a.gameId,
      file,
      source: url,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
manifest.sort((a, b) => a.gameId - b.gameId);
await fs.writeFile(path.join(root, 'icons.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared offline Chinese/English OCR models and ${manifest.length} icon templates.`);
