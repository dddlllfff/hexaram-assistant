import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { freshSession, augments } from '../packages/engine';
import { freshControl, reconcile, matchAugment } from '../packages/recognition';
import type { Observation } from '../packages/recognition';
const require = createRequire(import.meta.url);
const {
  parseLockfile,
  parseCommandLine,
  getLocalJson,
  pollLcu,
  pollLive,
} = require('../apps/desktop/electron/recognition/transport.cjs');
const { sanitizeConfig } = require('../apps/desktop/electron/recognition/settings.cjs');
const { feature, rankIcon } = require('../apps/desktop/electron/recognition/image-match.cjs');
const packet = (sequence: number, values: Partial<Observation> = {}): Observation => ({
  instance: 'fixture',
  sequence,
  capturedAt: 100000 + sequence * 2000,
  enabled: true,
  phase: 'InProgress',
  queueId: 2400,
  ...values,
});
const feed = (
  state: ReturnType<typeof freshSession>,
  control: ReturnType<typeof freshControl>,
  p: Observation,
) => reconcile(state, control, p, p.capturedAt);
const enabled = () => ({ ...freshControl(), enabled: true });
test('OCR dictionary matching rejects weak, incomplete and unrelated text', () => {
  assert.equal(matchAugment({ text: '珠 光 护 手', confidence: 94 })?.id, 'jeweled');
  assert.equal(matchAugment({ text: '珠光护手', confidence: 30 })?.accepted, false);
  assert.equal(matchAugment({ text: '随便一些说明文字', confidence: 99 }), null);
  assert.equal(matchAugment({ text: '珠光', confidence: 99 }), null);
});
test('hero and three candidates require separate stable observations; candidates never become selected', () => {
  const s = freshSession(),
    c = enabled();
  const input = {
    championGameId: 22,
    candidatesText: ['珠光护手', '炼狱导管', '捐赠'].map((text) => ({ text, confidence: 96 })),
  };
  const first = feed(s, c, packet(1, input));
  assert.equal(first.session.championId, s.championId);
  const second = feed(first.session, first.control, packet(2, input));
  assert.equal(second.session.championId, 'Ashe');
  const third = feed(second.session, second.control, packet(3, input));
  assert.equal(third.session.candidates.length, 3);
  assert.equal(third.session.selected.length, 0);
});
test('duplicate, out-of-order and stale packets cannot manufacture stability', () => {
  const first = feed(freshSession(), enabled(), packet(2, { championGameId: 22 }));
  const duplicate = feed(first.session, first.control, packet(2, { championGameId: 22 }));
  assert.equal(duplicate.session.championId, 'Brand');
  const old = feed(first.session, first.control, packet(1, { championGameId: 22 }));
  assert.equal(old.session.championId, 'Brand');
  const stale = reconcile(first.session, first.control, packet(3, { championGameId: 22 }), 1000000);
  assert.equal(stale.session.championId, 'Brand');
});
test('normal ARAM and unknown unconfirmed modes never update manual inputs', () => {
  for (const queueId of [450, undefined]) {
    const p = packet(1, {
      queueId,
      modeConfirmed: queueId === 450,
      championGameId: 22,
      newSession: true,
      phase: 'ChampSelect',
    });
    const s = { ...freshSession(), selected: ['jeweled'] };
    const r = feed(s, enabled(), p);
    assert.deepEqual(r.session, s);
  }
});
test('manual hero lock and deleted-augment suppression survive continuing scans', () => {
  let s = freshSession(),
    c = { ...enabled(), heroLocked: true, selectedBlocked: ['jeweled'] };
  for (let sequence = 1; sequence <= 3; sequence++) {
    const r = feed(
      s,
      c,
      packet(sequence, {
        championGameId: 22,
        selectedText: { text: '珠光护手\n炼狱导管', confidence: 96 },
      }),
    );
    s = r.session;
    c = r.control;
  }
  assert.equal(s.championId, 'Brand');
  assert.deepEqual(s.selected, ['infernal']);
});
test('partial candidate reads never overwrite a complete manually corrected set', () => {
  const s = { ...freshSession(), candidates: ['jeweled', 'infernal', 'donation'] };
  let c = enabled();
  for (let sequence = 1; sequence <= 3; sequence++) {
    const r = feed(
      s,
      c,
      packet(sequence, {
        candidatesText: [
          { text: '珠光护手', confidence: 99 },
          { text: '?', confidence: 10 },
          { text: '?', confidence: 10 },
        ],
      }),
    );
    c = r.control;
    assert.deepEqual(r.session.candidates, s.candidates);
  }
});
test('selected icon readings only append actual stable choices and clear their old candidate round', () => {
  const gameId = augments.find((a) => a.id === 'infernal')!.gameId!;
  const s = { ...freshSession(), candidates: ['jeweled', 'infernal', 'donation'] };
  const input = { selectedIcons: [{ gameId, score: 0.98, margin: 0.2, accepted: true, slot: 0 }] };
  const first = feed(s, enabled(), packet(1, input));
  assert.equal(first.session.selected.length, 0);
  const second = feed(first.session, first.control, packet(2, input));
  assert.deepEqual(second.session.selected, ['infernal']);
  assert.deepEqual(second.session.candidates, []);
});
test('a new match clears correction locks and old choices but retains player preference', () => {
  const s = { ...freshSession(), selected: ['jeweled'], preference: 'fun' as const };
  const c = {
    ...enabled(),
    heroLocked: true,
    candidatesLocked: true,
    selectedBlocked: ['infernal'],
    matchId: 'old',
  };
  const r = feed(s, c, packet(1, { phase: 'ChampSelect', newSession: true, matchId: 'new' }));
  assert.equal(r.session.preference, 'fun');
  assert.deepEqual(r.session.selected, []);
  assert.equal(r.control.heroLocked, false);
  assert.deepEqual(r.control.selectedBlocked, []);
});
test('shared icons and blank slots are withheld instead of guessed', () => {
  const bytes = Buffer.alloc(24 * 24 * 4);
  for (let p = 0; p < 24 * 24; p++) {
    bytes[p * 4] = p % 2 ? 230 : 20;
    bytes[p * 4 + 1] = p % 3 ? 190 : 30;
    bytes[p * 4 + 2] = p % 5 ? 90 : 240;
    bytes[p * 4 + 3] = 255;
  }
  const f = feature(bytes);
  const result = rankIcon(f, [
    { gameId: 1, feature: f },
    { gameId: 2, feature: f },
  ]);
  assert.equal(result.accepted, false);
  const blank = feature(Buffer.alloc(24 * 24 * 4));
  assert.equal(rankIcon(blank, [{ gameId: 1, feature: f }]).accepted, false);
});

test('a missed selected reading breaks continuity instead of combining unrelated frames', () => {
  const selectedText = { text: '珠光护手', confidence: 96 };
  const first = feed(freshSession(), enabled(), packet(1, { selectedText }));
  const miss = feed(
    first.session,
    first.control,
    packet(2, { selectedText: { text: '', confidence: 0 } }),
  );
  const retry = feed(miss.session, miss.control, packet(3, { selectedText }));
  assert.deepEqual(retry.session.selected, []);
  const confirmed = feed(retry.session, retry.control, packet(4, { selectedText }));
  assert.deepEqual(confirmed.session.selected, ['jeweled']);
});

test('local game time detects a new match without an available LCU connection', () => {
  const c = { ...enabled(), matchStartedAt: 0, heroLocked: true, selectedBlocked: ['jeweled'] };
  const r = feed(
    { ...freshSession(), selected: ['jeweled'] },
    c,
    packet(1, { matchId: undefined, gameTime: 5 }),
  );
  assert.deepEqual(r.session.selected, []);
  assert.equal(r.control.heroLocked, false);
});
test('calibration rejects out-of-bounds and candidate/selected overlap', () => {
  const settings = sanitizeConfig({
    selectedText: { x: 0.15, y: 0.29, w: 0.2, h: 0.1 },
    selectedIcons: { x: 0.95, y: 0.95, w: 0.2, h: 0.2 },
    slots: 100,
    interval: 1,
  });
  assert.equal(settings.selectedText, null);
  assert.equal(settings.selectedIcons, null);
  assert.equal(settings.slots, 4);
  assert.equal(settings.interval, 3000);
});
test('local transport exposes only allowed read routes and validates connection files', async () => {
  assert.deepEqual(parseLockfile('LeagueClient:1:12345:fixture-token:https'), {
    port: 12345,
    password: 'fixture-token',
  });
  assert.equal(parseLockfile('broken'), null);
  assert.equal(parseLockfile('Client:1:99999:fixture:https'), null);
  assert.deepEqual(parseCommandLine('--app-port=12345 --remoting-auth-token=fixture-token'), {
    port: 12345,
    password: 'fixture-token',
  });
  await assert.rejects(getLocalJson(12345, '/lol-champ-select/v1/session/accept', 'fixture-token'));
});
test('LCU emits only the local selected champion and game metadata', async () => {
  const get = async (_port: number, route: string) => ({
    status: 200,
    data: route.endsWith('gameflow-phase')
      ? 'ChampSelect'
      : route === '/lol-gameflow/v1/session'
        ? { gameData: { queue: { id: 2400 }, gameId: 123 } }
        : {
            localPlayerCellId: 2,
            myTeam: [
              { cellId: 1, championId: 1, summonerName: 'other-fixture' },
              { cellId: 2, championId: 22, summonerName: 'local-fixture' },
            ],
          },
  });
  const result = await pollLcu({ port: 12345, password: 'fixture' }, get);
  assert.equal(result.championGameId, 22);
  assert.equal(result.queueId, 2400);
  assert.ok(!JSON.stringify(result).includes('fixture'));
});
test('Live Client adapter does not emit account names or other players', async () => {
  const get = async (_port: number, route: string) => ({
    status: 200,
    data: route.endsWith('activeplayer')
      ? { level: 11 }
      : route.endsWith('activeplayername')
        ? 'local-fixture'
        : route.endsWith('gamestats')
          ? { gameTime: 200 }
          : [
              { summonerName: 'other-fixture', championName: 'Annie', items: [] },
              {
                summonerName: 'local-fixture',
                championName: 'Ashe',
                level: 11,
                items: [{ itemID: 3031 }],
              },
            ],
  });
  const result = await pollLive(get);
  assert.equal(result.championName, 'Ashe');
  assert.deepEqual(result.itemIds, [3031]);
  assert.ok(!JSON.stringify(result).includes('fixture'));
});
