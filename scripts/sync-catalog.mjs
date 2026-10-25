import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const patch = '16.21';
const version = '16.21.1';
const base = `https://raw.communitydragon.org/${patch}`;
const urls = {
  cn: 'https://game.gtimg.cn/images/lol/act/img/js/heroList/hero_list.js',
  champions: `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/champion.json`,
  items: `https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/item.json`,
  augments: `${base}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/cherry-augments.json`,
  english: `${base}/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json`,
  pools: `${base}/plugins/rcp-be-lol-game-data/global/zh_cn/v1/augment-lists.json`,
  strings: `${base}/game/zh_cn/data/menu/en_us/lol.stringtable.json`,
  community: 'https://arammayhem.com/data/v1/index.json',
  combos: 'https://arammayhem.com/data/v1/latest/combos.json',
};
const sources = {};
const data = {};
for (const [key, url] of Object.entries(urls)) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
  const text = await response.text();
  data[key] = JSON.parse(text);
  sources[key] = { url, sha256: createHash('sha256').update(text).digest('hex') };
  console.log(`Fetched ${key}`);
}
if (data.cn.version !== patch)
  throw new Error(`CN version changed to ${data.cn.version}; review patch before importing`);
if (data.community.license.name !== 'CC BY 4.0')
  throw new Error('Community dataset license changed; review before importing');
const clean = (value) =>
  value
    .replace(/<br\s*\/?\s*>/gi, '；')
    .replace(/<[^>]*>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '〔机制随游戏内说明〕')
    .replace(/@[^@]+@/g, '〔游戏内数值〕')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/；+/g, '；')
    .trim();
const champions = data.cn.hero.map((hero) => {
  const dd = Object.values(data.champions.data).find((c) => String(c.key) === hero.heroId);
  if (!dd) throw new Error(`Missing champion metadata ${hero.alias}`);
  return {
    id: dd.id,
    gameId: Number(hero.heroId),
    name: hero.title,
    title: hero.name,
    keywords: hero.keywords,
    roles: hero.roles,
    difficulty: Number(hero.difficulty),
    tags: dd.tags,
    resource: dd.partype,
    range: dd.stats.attackrange,
    patch,
  };
});
const allStrings = data.strings.entries;
const pool = data.pools.find((p) => p.modeName === 'KIWI');
if (!pool) throw new Error('ARAM Mayhem KIWI pool missing');
const augments = pool.augmentList.map((p) => {
  const key = p.split('/').at(-1).toLowerCase();
  const row = data.augments.find((a) => a.augmentNameId.toLowerCase() === key);
  const en = data.english.find((a) => a.id === row?.id);
  if (!row || !en) throw new Error(`Augment catalog missing ${p}`);
  const names = Object.keys(allStrings).filter(
    (k) => k.endsWith('_name') && allStrings[k] === row.nameTRA,
  );
  const stem = key.replace(/^aram_/, '');
  const candidates = [
    ...new Set([
      `kiwi_${key}`,
      `kiwi_${stem}`,
      `kiwi_aram_${stem}`,
      `kiwi_augment_${stem}`,
      ...names
        .map((k) => k.slice(0, -5))
        .sort((a, b) => Number(b.startsWith('kiwi_')) - Number(a.startsWith('kiwi_'))),
      `augment_${stem}`,
      `cherry_${stem}`,
    ]),
  ];
  let description = '',
    descriptionKey = '';
  for (const prefix of candidates) {
    for (const suffix of ['_summary', '_tooltipsummary', '_tooltip', '_desc']) {
      const k = prefix + suffix;
      if (allStrings[k]) {
        description = clean(allStrings[k]);
        descriptionKey = k;
        break;
      }
    }
    if (description) break;
  }
  return {
    gameId: row.id,
    key: row.augmentNameId,
    name: row.nameTRA,
    english: en.nameTRA,
    tier: { kSilver: '白银', kGold: '黄金', kPrismatic: '棱彩' }[row.rarity],
    description: description || '客户端机制文本尚未解析，请核对游戏内说明。',
    descriptionKey,
    patch,
    pool: 'KIWI',
    availability: 'configured-not-live-verified',
  };
});
const items = Object.entries(data.items.data)
  .filter(([, i]) => i.gold.purchasable && i.maps['12'])
  .map(([id, i]) => ({
    id: Number(id),
    name: i.name,
    total: i.gold.total,
    tags: i.tags,
    from: (i.from ?? []).map(Number),
    into: (i.into ?? []).map(Number),
    description: clean(i.description),
  }));
const combos = data.combos.rows.map((c) => ({
  championId: c.championId,
  augments: c.augmentNames.map((a) => a.en),
  url: c.url,
}));
const output = path.resolve('content/catalog');
await fs.mkdir(output, { recursive: true });
for (const [name, rows] of Object.entries({ champions, augments, items, combos }))
  await fs.writeFile(path.join(output, `${name}.json`), JSON.stringify(rows, null, 2) + '\n');
await fs.writeFile(
  path.join(output, 'manifest.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      patch,
      dataDragonVersion: version,
      generatedAt: new Date().toISOString(),
      cnFileTime: data.cn.fileTime,
      champions: champions.length,
      augments: augments.length,
      descriptions: augments.filter((a) => a.descriptionKey).length,
      community: {
        attribution: 'Data: arammayhem.com',
        license: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        url: 'https://arammayhem.com/data/',
        patch: null,
        scope: 'community combination references only; not CN current-patch statistics',
      },
      sources,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    champions: champions.length,
    augments: augments.length,
    descriptions: augments.filter((a) => a.descriptionKey).length,
    items: items.length,
    combos: combos.length,
  }),
);
