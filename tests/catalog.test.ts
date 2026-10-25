import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  augments,
  champions,
  compatible,
  freshSession,
  itemGroups,
  recommend,
  sanitizeSession,
  skillOrder,
} from '../packages/engine';
import itemCatalog from '../content/catalog/items.json';
import manifest from '../content/catalog/manifest.json';
test('CN roster and usable augment pool match pinned source coverage', () => {
  assert.equal(champions.length, manifest.champions);
  assert.equal(champions.length, 173);
  assert.equal(augments.length, manifest.augments - 5);
  assert.equal(augments.length, 244);
  assert.equal(augments.filter((a) => a.status === '机制待补充').length, 0);
  assert.ok(augments.every((a) => a.source && a.description && a.gameId));
  assert.ok(!augments.some((a) => a.key?.startsWith('GoH_')));
});
test('removed 26.21 augments cannot remain active in restored sessions', () => {
  for (const id of ['critcast', 'interest', 'ourheal'])
    assert.ok(!augments.some((a) => a.id === id));
  assert.deepEqual(
    sanitizeSession({ ...freshSession(), selected: ['interest', 'jeweled'] }).selected,
    ['jeweled'],
  );
});
test('all routes use current purchasable items and compatible item groups', () => {
  const available = new Set(itemCatalog.map((i) => i.name));
  for (const c of champions)
    for (const b of c.builds) {
      for (const item of [...b.items, ...b.starter, ...b.situational.map((i) => i.item)])
        assert.ok(available.has(item), `${c.id}/${b.id}: ${item}`);
      for (const group of itemGroups)
        assert.ok(
          b.items.filter((i) => group.includes(i)).length <= 1,
          `${c.id}/${b.id} conflicting group`,
        );
    }
});
test('situational replacements preserve item group restrictions for every hero', () => {
  for (const c of champions)
    for (const threat of ['physical', 'magic', 'healing'] as const) {
      const r = recommend({ ...freshSession(), championId: c.id, threat });
      for (const group of itemGroups)
        assert.ok(r.items.filter((i) => group.includes(i)).length <= 1, c.id + ':' + threat);
    }
});
test('resource, range and native triggers are not inferred from benefit tags', () => {
  assert.equal(compatible('overflow', { ...freshSession(), championId: 'Vladimir' }), false);
  const draw = augments.find((a) => a.rangedOnly)!;
  assert.equal(compatible(draw.id, { ...freshSession(), championId: 'Garen' }), false);
  assert.equal(compatible(draw.id, { ...freshSession(), championId: 'Ashe' }), true);
  const controlAugment = augments.find((a) => a.tags.includes('control') && !a.requires)!;
  assert.equal(
    compatible('colossus', {
      ...freshSession(),
      championId: 'Olaf',
      selected: [controlAugment.id],
    }),
    false,
  );
});
test('ultimate-only critical strikes do not unlock ordinary skill critical builds', () => {
  const bracelet = augments.find((a) => a.key === 'JeweledBracelet')!;
  const r = recommend({ ...freshSession(), selected: [bracelet.id] });
  assert.equal(r.ranked.find((b) => b.build.id === 'brand-crit')?.ready, false);
});
test('special champions avoid fabricated ordinary skill orders and illegal boots', () => {
  assert.equal(
    skillOrder(champions.find((c) => c.id === 'Jayce')!.builds[0]).filter((s) => s === 'R').length,
    0,
  );
  for (const id of ['Aphelios', 'Udyr'])
    assert.deepEqual(skillOrder(champions.find((c) => c.id === id)!.builds[0]), []);
  assert.ok(
    champions
      .find((c) => c.id === 'Cassiopeia')!
      .builds.every((b) => !b.items.some((i) => /靴|鞋/.test(i))),
  );
});
test('self healing does not satisfy ally-support-only mechanics', () => {
  assert.equal(compatible('criticalheal', { ...freshSession(), championId: 'Vladimir' }), true);
  const group = augments.find((a) => a.key === 'GroupHug')!;
  assert.equal(compatible(group.id, { ...freshSession(), championId: 'Vladimir' }), false);
  assert.equal(compatible(group.id, { ...freshSession(), championId: 'Sona' }), true);
});
test('utility supports and stance heroes do not receive unrelated trigger recommendations', () => {
  const zilean = champions.find((c) => c.id === 'Zilean')!;
  assert.ok(!zilean.builds[0].items.includes('月石再生器'));
  const ultimate = augments.find((a) => a.key === 'UltimateRecursion')!;
  for (const championId of ['Udyr', 'Jayce'])
    assert.equal(compatible(ultimate.id, { ...freshSession(), championId }), false);
});
