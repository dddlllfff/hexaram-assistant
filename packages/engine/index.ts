import { champions } from '../../content/champions';
import { augments } from '../../content/augments';
import type { Build, Session, Skill, Tag } from './types';
export { champions, augments };
export const allItems = [
  ...new Set([
    ...champions.flatMap((c) =>
      c.builds.flatMap((b) => [...b.items, ...b.starter, ...b.situational.map((s) => s.item)]),
    ),
    '死亡之舞',
    '凡性的提醒',
    '玛莫提乌斯之噬',
    '莫雷洛秘典',
    '女妖面纱',
    '冰霜之心',
  ]),
].sort((a, b) => a.localeCompare(b, 'zh-CN'));
export function freshSession(): Session {
  return {
    championId: 'Brand',
    selected: [],
    candidates: [],
    preference: 'steady',
    level: 3,
    ownedItems: [],
    threat: 'balanced',
    pinnedBuildId: null,
  };
}
export function sanitizeSession(raw: unknown): Session {
  const fallback = freshSession();
  if (!raw || typeof raw !== 'object') return fallback;
  const s = raw as Record<string, unknown>;
  const champion = champions.find((c) => c.id === s.championId) ?? champions[0];
  const ids = (v: unknown) =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter(
              (id): id is string => typeof id === 'string' && augments.some((a) => a.id === id),
            ),
          ),
        ].slice(0, 8)
      : [];
  const selected = ids(s.selected);
  return {
    championId: champion.id,
    selected,
    candidates: ids(s.candidates)
      .filter((id) => !selected.includes(id))
      .slice(0, 3),
    preference: ['steady', 'ceiling', 'fun'].includes(String(s.preference))
      ? (s.preference as Session['preference'])
      : 'steady',
    level:
      typeof s.level === 'number' && Number.isFinite(s.level)
        ? Math.max(3, Math.min(18, Math.floor(s.level)))
        : 3,
    ownedItems: Array.isArray(s.ownedItems)
      ? [
          ...new Set(
            s.ownedItems.filter((i): i is string => typeof i === 'string' && allItems.includes(i)),
          ),
        ].slice(0, 6)
      : [],
    threat: ['balanced', 'physical', 'magic', 'healing'].includes(String(s.threat))
      ? (s.threat as Session['threat'])
      : 'balanced',
    pinnedBuildId: champion.builds.some((b) => b.id === s.pinnedBuildId)
      ? String(s.pinnedBuildId)
      : null,
  };
}
export function compatible(id: string, session: Session): boolean {
  const augment = augments.find((a) => a.id === id);
  const champion = champions.find((c) => c.id === session.championId);
  if (!augment || !champion || augment.excludes?.some((id) => session.selected.includes(id)))
    return false;
  const available = new Set<Tag>([
    ...champion.tags,
    ...session.selected.flatMap((id) => augments.find((a) => a.id === id)?.tags ?? []),
  ]);
  // requires is any-of: shields OR healing qualify for Critical Healing.
  return !augment.requires || augment.requires.some((tag) => available.has(tag));
}
export function rankBuilds(session: Session) {
  const champion = champions.find((c) => c.id === session.championId) ?? champions[0];
  return champion.builds
    .map((build) => {
      let score = build.base;
      const reasons: string[] = [];
      for (const id of session.selected) {
        const augment = augments.find((a) => a.id === id);
        if (
          !augment ||
          !compatible(id, { ...session, selected: session.selected.filter((x) => x !== id) })
        )
          continue;
        const matches = augment.tags.filter((tag) => build.tags.includes(tag));
        if (matches.length) {
          score += matches.length * 9;
          reasons.push(`${augment.name}与${matches.map((t) => tagLabel[t]).join('、')}方向配合`);
        }
      }
      const ready =
        !build.id.endsWith('-crit') ||
        !build.tags.includes('spell') ||
        session.selected.includes('jeweled') ||
        champion.id === 'Garen';
      if (!ready) score -= 40;
      if (
        build.id.endsWith('-crit') &&
        build.tags.includes('spell') &&
        session.selected.includes('jeweled')
      )
        score += 28;
      score += session.ownedItems.filter((i) => build.items.includes(i)).length * 7;
      if (
        session.preference === 'steady' &&
        (build.tags.includes('tank') ||
          build.tags.includes('heal') ||
          build.tags.includes('shield'))
      )
        score += 7;
      if (session.preference === 'ceiling' && ready && build.tags.includes('crit')) score += 5;
      if (session.preference === 'fun' && build.base < 20 && ready) score += 10;
      return { build, score, reasons, ready };
    })
    .sort((a, b) => b.score - a.score || a.build.id.localeCompare(b.build.id));
}
export const tagLabel: Record<Tag, string> = {
  spell: '技能输出',
  attack: '普攻',
  crit: '暴击',
  haste: '技能急速',
  burn: '灼烧',
  tank: '承伤',
  heal: '治疗',
  shield: '护盾',
  control: '控制',
  dash: '位移',
  ultimate: '终极技能',
  onhit: '攻击特效',
};
export function recommend(session: Session) {
  const ranked = rankBuilds(session);
  const active = ranked.find((r) => r.build.id === session.pinnedBuildId) ?? ranked[0];
  const options = session.candidates
    .map((id) => {
      const augment = augments.find((a) => a.id === id)!;
      const valid = compatible(id, session);
      const after = rankBuilds({
        ...session,
        pinnedBuildId: null,
        selected: [...session.selected, id],
      });
      const matches = augment.tags.filter((tag) => active.build.tags.includes(tag));
      let score = Math.max(0, after[0].score - ranked[0].score) + matches.length * 8;
      if (id === 'donation') score += session.selected.length < 2 ? 15 : 8;
      if (session.preference === 'steady') score -= augment.risk * 5;
      else score += augment.risk * (session.preference === 'fun' ? 4 : 2);
      if (!valid) score = -999;
      const changes = after[0].build.id !== active.build.id;
      return {
        augment,
        score,
        valid,
        changes,
        nextBuild: after[0].build.name,
        reason: !valid
          ? '当前英雄与已选强化缺少所需触发机制，暂不建议。'
          : id === 'donation'
            ? '立即加快装备成型；没有额外机制门槛。'
            : matches.length
              ? `配合当前路线的${matches.map((t) => tagLabel[t]).join('、')}。`
              : `更偏向${after[0].build.name}，需要权衡已有装备投入。`,
      };
    })
    .sort((a, b) => b.score - a.score || a.augment.id.localeCompare(b.augment.id));
  const build = active.build;
  const items = [...build.items];
  let adaptation = '';
  if (session.threat !== 'balanced') {
    const defensive = build.tags.includes('tank');
    const replacement =
      session.threat === 'healing'
        ? defensive
          ? '荆棘之甲'
          : build.tags.includes('attack')
            ? '凡性的提醒'
            : '莫雷洛秘典'
        : session.threat === 'magic'
          ? defensive
            ? '自然之力'
            : build.tags.includes('attack')
              ? '玛莫提乌斯之噬'
              : '女妖面纱'
          : defensive
            ? '冰霜之心'
            : build.tags.includes('attack')
              ? '死亡之舞'
              : '中娅沙漏';
    if (!items.includes(replacement)) {
      const replaceIndex =
        session.threat === 'healing'
          ? items.findIndex((i) => i === '多米尼克领主的致意' || i === '虚空之杖')
          : -1;
      items[replaceIndex >= 0 ? replaceIndex : items.length - 1] = replacement;
    }
    adaptation = `${session.threat === 'healing' ? '敌方治疗较强' : session.threat === 'magic' ? '魔法伤害压力较大' : '物理伤害压力较大'}：考虑${replacement}。这是条件备选，不要求立即买出。`;
  }
  const foreign = session.ownedItems.filter(
    (i) => !items.includes(i) && !build.starter.includes(i),
  );
  const nextItem = items.find((i) => !session.ownedItems.includes(i));
  return {
    ranked,
    active,
    options,
    items,
    adaptation,
    foreign,
    nextItem,
    skills: skillOrder(build),
  };
}
export function skillOrder(build: Build): Skill[] {
  const counts: Record<Skill, number> = { Q: 0, W: 0, E: 0, R: 0 };
  const result: Skill[] = [];
  for (let level = 1; level <= 18; level++) {
    const ultimate = level === 6 || level === 11 || level === 16;
    const skill: Skill = ultimate
      ? 'R'
      : level <= 3
        ? build.opening[level - 1]
        : build.priority.find((s) => counts[s] < 5 && counts[s] < Math.ceil(level / 2))!;
    counts[skill]++;
    result.push(skill);
  }
  return result;
}
