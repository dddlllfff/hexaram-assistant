import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allItems,
  augments,
  champions,
  compatible,
  freshSession,
  rankBuilds,
  recommend,
  sanitizeSession,
  skillOrder,
} from '../packages/engine';
test('candidate preview never changes committed route', () => {
  const state = freshSession();
  assert.equal(
    recommend(state).active.build.id,
    recommend({ ...state, candidates: ['jeweled'] }).active.build.id,
  );
  assert.equal(recommend({ ...state, selected: ['jeweled'] }).active.build.id, 'brand-crit');
});
test('crit alone does not unlock ability critical strikes', () => {
  const ranked = rankBuilds({ ...freshSession(), selected: ['critical', 'critcast'] });
  assert.equal(ranked.find((r) => r.build.id === 'brand-crit')?.ready, false);
  assert.equal(ranked[0].build.id, 'brand-burn');
});
test('augment mechanics are checked; healing OR shielding is sufficient', () => {
  assert.equal(compatible('colossus', freshSession()), true);
  assert.equal(compatible('outlaw', freshSession()), false);
  assert.equal(compatible('outlaw', { ...freshSession(), championId: 'Ahri' }), true);
  assert.equal(compatible('criticalheal', { ...freshSession(), championId: 'Lux' }), true);
  assert.equal(compatible('criticalheal', { ...freshSession(), championId: 'Ashe' }), false);
  assert.equal(compatible('missing', freshSession()), false);
});
test('owned equipment advances next item; removes no investments on pivot', () => {
  const initial = recommend(freshSession());
  const owned = [initial.items[0]];
  assert.equal(recommend({ ...freshSession(), ownedItems: owned }).nextItem, initial.items[1]);
  const pivot = recommend({
    ...freshSession(),
    championId: 'Lux',
    pinnedBuildId: 'lux-support',
    ownedItems: ['无尽之刃'],
  });
  assert.deepEqual(pivot.foreign, ['无尽之刃']);
});
test('manual route lock is honored and unlock restores automatic planning', () => {
  const s = { ...freshSession(), selected: ['jeweled'] };
  assert.equal(recommend({ ...s, pinnedBuildId: 'brand-burn' }).active.build.id, 'brand-burn');
  assert.equal(recommend(s).active.build.id, 'brand-crit');
});
test('threat adaptation keeps six unique items and avoids duplicate armor penetration items', () => {
  for (const champion of champions)
    for (const threat of ['balanced', 'physical', 'magic', 'healing'] as const) {
      const r = recommend({ ...freshSession(), championId: champion.id, threat });
      assert.equal(r.items.length, 6);
      assert.equal(new Set(r.items).size, 6);
      for (const item of r.items) assert.ok(allItems.includes(item), item);
      assert.ok(!(r.items.includes('凡性的提醒') && r.items.includes('多米尼克领主的致意')));
    }
});
test('skill sequences respect standard, six-rank, automatic-R and manual mechanics', () => {
  for (const c of champions)
    for (const b of c.builds) {
      const order = skillOrder(b);
      if (b.skillMode === 'manual') {
        assert.equal(order.length, 0);
        assert.ok(b.skillNote);
        continue;
      }
      assert.equal(order.length, 18);
      const count = { Q: 0, W: 0, E: 0, R: 0 };
      order.forEach((skill, i) => {
        assert.ok(skill, b.id);
        count[skill]++;
        if (skill === 'R') assert.ok(b.skillMode !== 'jayce' && [6, 11, 16].includes(i + 1));
        else
          assert.ok(
            count[skill] <= (b.skillMode === 'jayce' ? 6 : (b.skillCaps?.[skill] ?? 5)) &&
              count[skill] <= Math.ceil((i + 1) / 2),
            b.id,
          );
      });
      assert.deepEqual(
        count,
        b.skillMode === 'jayce'
          ? { Q: 6, W: 6, E: 6, R: 0 }
          : c.id === 'Yuumi'
            ? { Q: 6, W: 4, E: 5, R: 3 }
            : { Q: 5, W: 5, E: 5, R: 3 },
      );
    }
});
test('persisted input is sanitized, deduplicated and clamped', () => {
  const s = sanitizeSession({
    championId: 'unknown',
    selected: ['jeweled', 'jeweled', 'unknown'],
    candidates: ['jeweled', 'infernal'],
    level: 99,
    ownedItems: ['死亡之舞', 'unknown'],
    pinnedBuildId: 'lux-support',
  });
  assert.deepEqual(s.selected, ['jeweled']);
  assert.deepEqual(s.candidates, ['infernal']);
  assert.equal(s.level, 18);
  assert.equal(s.pinnedBuildId, null);
  assert.deepEqual(s.ownedItems, ['死亡之舞']);
  assert.deepEqual(sanitizeSession(null), freshSession());
});
test('each hero has a complete baseline without invented alternative routes', () => {
  assert.equal(new Set(augments.map((a) => a.id)).size, augments.length);
  assert.equal(new Set(champions.map((c) => c.id)).size, champions.length);
  for (const c of champions) {
    assert.ok(c.builds.length >= 1);
    for (const b of c.builds) {
      assert.equal(b.items.length, 6);
      assert.ok(b.condition && b.caution && b.plan);
    }
  }
});
