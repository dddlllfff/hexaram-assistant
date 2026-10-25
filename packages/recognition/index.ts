import { augments, champions, freshSession, sanitizeSession } from '../engine';
import championCatalog from '../../content/catalog/champions.json';
import itemCatalog from '../../content/catalog/items.json';
import type { Session } from '../engine/types';
export interface TextRead {
  text: string;
  confidence: number;
}
export interface Observation {
  instance: string;
  sequence: number;
  capturedAt: number;
  enabled: boolean;
  phase: string;
  queueId?: number;
  modeConfirmed?: boolean;
  matchId?: string;
  newSession?: boolean;
  championGameId?: number;
  championName?: string;
  championText?: TextRead;
  level?: number;
  itemIds?: number[];
  candidatesText?: TextRead[];
  selectedText?: TextRead;
  selectedIcons?: {
    gameId: number;
    score: number;
    margin: number;
    accepted: boolean;
    slot: number;
  }[];
  message?: string;
  sourceName?: string;
  gameTime?: number;
}
export interface Control {
  enabled: boolean;
  heroLocked: boolean;
  candidatesLocked: boolean;
  inventoryLocked: boolean;
  levelLocked: boolean;
  selectedBlocked: string[];
  seen: string;
  matchId?: string;
  lastPhase?: string;
  matchStartedAt?: number;
  stable: Record<string, { value: string; count: number; at: number }>;
}
export function freshControl(): Control {
  return {
    enabled: false,
    heroLocked: false,
    candidatesLocked: false,
    inventoryLocked: false,
    levelLocked: false,
    selectedBlocked: [],
    seen: '',
    stable: {},
  };
}
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9\u3400-\u9fff]/g, '');
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}
function matchNames(read: TextRead, rows: { id: string; names: string[] }[]) {
  const lines = read.text
    .split(/[\r\n；;|]/)
    .map(normalize)
    .filter(Boolean);
  const full = normalize(read.text);
  const candidates = rows
    .map((row) => {
      let best = 0;
      let exact = false;
      for (const name of row.names) {
        const n = normalize(name);
        if (n.length < 2) continue;
        for (const text of [...lines, full]) {
          if (n === text) {
            best = 1;
            exact = true;
          } else if (n.length >= 4 && text.length >= 4 && Math.abs(n.length - text.length) <= 1)
            best = Math.max(best, 1 - distance(n, text) / Math.max(n.length, text.length));
        }
      }
      return { id: row.id, score: best, exact };
    })
    .sort((a, b) => b.score - a.score);
  const best = candidates[0],
    margin = best ? best.score - (candidates[1]?.score ?? 0) : 0;
  if (!best || best.score < 0.6) return null;
  const accepted =
    (best.exact ? read.confidence >= 72 : read.confidence >= 85 && best.score >= 0.78) &&
    margin >= 0.12;
  return { ...best, margin, accepted };
}
const augmentNames = augments.map((a) => ({ id: a.id, names: [a.name, a.english] }));
const championNames = champions.map((c) => ({ id: c.id, names: [c.name, c.title, c.id] }));
export const matchAugment = (read: TextRead) => matchNames(read, augmentNames);
export const matchChampion = (read: TextRead) => matchNames(read, championNames);
function stable(control: Control, key: string, value: string, at: number) {
  const old = control.stable[key];
  const next = {
    value,
    count: old?.value === value && at - old.at <= 15000 ? old.count + 1 : 1,
    at,
  };
  control.stable[key] = next;
  return next.count >= 2;
}
export function reconcile(session: Session, old: Control, packet: Observation, now = Date.now()) {
  const control: Control = {
    ...old,
    selectedBlocked: [...old.selectedBlocked],
    stable: { ...old.stable },
  };
  let next = { ...session };
  const applied: string[] = [];
  const suggestions: { field: string; id: string; accepted: boolean; score: number }[] = [];
  const key = `${packet.instance}:${packet.sequence}`;
  const separator = old.seen.lastIndexOf(':');
  const oldInstance = old.seen.slice(0, separator);
  const oldSequence = Number(old.seen.slice(separator + 1));
  if (
    !old.enabled ||
    !packet.enabled ||
    old.seen === key ||
    (oldInstance === packet.instance && packet.sequence <= oldSequence) ||
    now - packet.capturedAt > 15000 ||
    packet.capturedAt > now + 2000
  )
    return { session, control: old, applied, suggestions };
  control.seen = key;
  if (packet.queueId !== 2400 && !(packet.queueId == null && packet.modeConfirmed))
    return { session, control, applied, suggestions };
  const started =
    packet.gameTime !== undefined ? packet.capturedAt - packet.gameTime * 1000 : undefined;
  const differentLiveMatch =
    packet.matchId == null &&
    started !== undefined &&
    old.matchStartedAt !== undefined &&
    Math.abs(started - old.matchStartedAt) > 45000;
  if (
    (packet.newSession && packet.phase === 'ChampSelect') ||
    (packet.matchId && old.matchId && packet.matchId !== old.matchId) ||
    differentLiveMatch
  ) {
    next = { ...freshSession(), championId: session.championId, preference: session.preference };
    Object.assign(control, freshControl(), { enabled: true, seen: key, matchId: packet.matchId });
    applied.push('新一局');
  }
  control.lastPhase = packet.phase;
  if (packet.matchId) control.matchId = packet.matchId;
  if (started !== undefined) control.matchStartedAt = started;
  const direct = packet.championGameId
    ? championCatalog.find((c) => c.gameId === packet.championGameId)?.id
    : undefined;
  const liveName = packet.championName?.replace(/^game_character_displayname_/i, '');
  const fromName = liveName
    ? champions.find((c) =>
        [c.id, c.name, c.title].some((n) => normalize(n) === normalize(liveName)),
      )?.id
    : undefined;
  const ocrHero = packet.championText ? matchChampion(packet.championText) : null;
  const hero = direct ?? fromName ?? (ocrHero?.accepted ? ocrHero.id : undefined);
  if (ocrHero) suggestions.push({ field: 'hero', ...ocrHero });
  if (!hero && (packet.championText || packet.championGameId || packet.championName))
    delete control.stable.hero;
  if (
    hero &&
    !control.heroLocked &&
    stable(control, 'hero', hero, packet.capturedAt) &&
    hero !== next.championId
  ) {
    next = { ...freshSession(), championId: hero, preference: next.preference };
    control.selectedBlocked = [];
    control.stable = { hero: control.stable.hero };
    applied.push('英雄');
  }
  if (
    packet.level &&
    !control.levelLocked &&
    packet.level >= 3 &&
    packet.level <= 18 &&
    stable(control, 'level', String(packet.level), packet.capturedAt) &&
    packet.level !== next.level
  ) {
    next.level = packet.level;
    applied.push('等级');
  }
  if (packet.itemIds && !control.inventoryLocked) {
    const items = [
      ...new Set(
        packet.itemIds
          .map((id) => itemCatalog.find((i) => i.id === id)?.name)
          .filter((x): x is string => !!x),
      ),
    ].slice(0, 6);
    const fingerprint = [...items].sort().join('|');
    if (
      stable(control, 'items', fingerprint, packet.capturedAt) &&
      fingerprint !== [...next.ownedItems].sort().join('|')
    ) {
      next.ownedItems = items;
      applied.push('装备');
    }
  }
  if (packet.candidatesText) {
    const reads = packet.candidatesText.map(matchAugment);
    reads.forEach((r) => {
      if (r) suggestions.push({ field: 'candidate', ...r });
    });
    const ids = reads.filter((r): r is NonNullable<typeof r> => !!r && r.accepted).map((r) => r.id);
    if (ids.length !== 3 || new Set(ids).size !== 3) delete control.stable.candidates;
    if (reads.some((r) => !!r) || packet.candidatesText.some((r) => r.confidence < 40))
      delete control.stable['empty-candidates'];
    // Only commit a complete, unambiguous three-card reading. Partial OCR never replaces a good set.
    if (
      ids.length === 3 &&
      new Set(ids).size === 3 &&
      !control.candidatesLocked &&
      stable(control, 'candidates', ids.join('|'), packet.capturedAt)
    ) {
      const filtered = ids.filter((id) => !next.selected.includes(id));
      if (filtered.length === 3 && filtered.join('|') !== next.candidates.join('|')) {
        next.candidates = filtered;
        applied.push('候选强化');
      }
    }
    if (
      reads.every((r) => !r) &&
      packet.candidatesText.every((r) => r.confidence >= 40) &&
      !control.candidatesLocked &&
      stable(control, 'empty-candidates', 'empty', packet.capturedAt) &&
      next.candidates.length
    ) {
      next.candidates = [];
      applied.push('候选已关闭');
    }
  }
  const detected: string[] = [];
  if (packet.selectedText) {
    for (const text of packet.selectedText.text.split(/[\r\n；;|]/)) {
      const hit = matchAugment({ text, confidence: packet.selectedText.confidence });
      if (hit) {
        suggestions.push({ field: 'selected', ...hit });
        if (hit.accepted) detected.push(hit.id);
      }
    }
  }
  for (const icon of packet.selectedIcons ?? []) {
    const augment = augments.find((a) => a.gameId === icon.gameId);
    if (augment && icon.accepted && icon.score >= 0.88 && icon.margin >= 0.055) {
      suggestions.push({ field: 'selected', id: augment.id, accepted: true, score: icon.score });
      detected.push(augment.id);
    }
  }
  if (packet.selectedText || packet.selectedIcons)
    for (const key of Object.keys(control.stable))
      if (key.startsWith('selected:') && !detected.includes(key.slice(9)))
        delete control.stable[key];
  for (const id of [...new Set(detected)]) {
    if (
      !control.selectedBlocked.includes(id) &&
      !next.selected.includes(id) &&
      stable(control, 'selected:' + id, id, packet.capturedAt) &&
      next.selected.length < 8
    ) {
      next.selected = [...next.selected, id];
      if (next.candidates.includes(id)) next.candidates = [];
      applied.push('已选强化');
    }
  }
  return { session: sanitizeSession(next), control, applied: [...new Set(applied)], suggestions };
}
