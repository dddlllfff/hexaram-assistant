import type { Augment, Tag } from '../../packages/engine/types';
import catalog from '../catalog/augments.json';
import { seedAugments } from './seed';
import { patchDescriptions, patchSource } from './patch-overrides';
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const extras: Record<string, Tag[]> = {
  bluebarrier: ['spell', 'shield'],
  flowofspirit: ['attack', 'onhit'],
  fruitify: ['heal'],
  giftofthedrowned: ['attack', 'spell'],
  handsoffthetalent: ['attack'],
  lichbrain: ['spell', 'tank'],
  lonelywarrior: ['tank', 'attack'],
  nomananoproblem: ['spell'],
  sound_barrier: ['shield'],
  ultimaterecursion: ['ultimate', 'haste'],
  arcaneaxiom: ['ultimate'],
  armoredimpact: ['tank', 'attack'],
  bees: ['spell', 'onhit'],
  brassblast: ['control'],
  crimsoncobalt: ['spell', 'haste'],
  doubletime: ['spell', 'haste'],
  enchantingbutterflies: ['heal', 'shield'],
  getjinxed: ['control'],
  heavyisthecrown: ['attack', 'spell'],
  jeweledbracelet: ['ultimate', 'crit'],
  recoil: ['spell'],
  salvation: ['tank', 'heal'],
  sapmagic: ['attack', 'heal'],
  stillhere: ['attack', 'spell', 'heal'],
  takeemdowndowndown: ['attack', 'spell', 'heal'],
  theboomandthebass: ['spell', 'attack'],
  ticklemonster: ['attack', 'onhit'],
  upgrade_stormsurge: ['spell'],
  weaponofdestiny: ['attack', 'spell'],
  bigshot: ['attack', 'crit'],
  bouncingbees: ['attack', 'onhit'],
  grouphug: ['heal', 'shield'],
  moshmonster: ['ultimate', 'tank'],
  thirdtimestheharm: ['attack', 'onhit'],
  totentanz: ['tank'],
  magicmissile: ['spell'],
  phenomenalevil: ['spell'],
  eureka: ['spell', 'haste'],
  archmage: ['spell'],
  firebrand: ['attack', 'burn'],
  twocolor: ['spell'],
  mysticpunch: ['attack', 'haste'],
  etherealweapon: ['spell', 'onhit'],
  scopedweapons: ['attack'],
  scopierweapons: ['attack'],
  scopiestweapons: ['attack'],
  deft: ['attack'],
  symphonyofwar: ['attack', 'onhit'],
  dualwield: ['attack', 'onhit'],
  lightningstrikes: ['attack', 'crit'],
  goliath: ['tank'],
  celestialbody: ['tank'],
  heavyhitter: ['tank', 'attack'],
  raidboss: ['tank'],
  guiltypleasure: ['control', 'heal'],
  courageofthecolossus: ['control', 'shield', 'tank'],
  windspeakersblessing: ['heal', 'shield'],
  sonata: ['heal', 'shield'],
  criticalhealing: ['heal', 'shield', 'crit'],
  spiritlink: ['heal', 'tank'],
  allforyou: ['heal', 'shield'],
  empoweredbythefaithful: ['heal', 'shield'],
  warlockjuicebox: ['spell', 'attack', 'heal'],
  recursion: ['haste'],
  infiniterecursion: ['haste'],
  ultimateawakening: ['ultimate', 'haste'],
  ultimaterevolution: ['ultimate'],
  itskillingtime: ['ultimate', 'spell'],
  outlawsgrit: ['dash', 'tank'],
  earthwake: ['dash'],
  dashing: ['dash', 'haste'],
};
function inferTags(text: string): Tag[] {
  const tags: Tag[] = [];
  for (const [pattern, tag] of [
    [/你的技能|技能会|法术强度|技能伤害/, 'spell'],
    [/攻击速度|攻击特效|普攻|普通攻击|你的攻击/, 'attack'],
    [/暴击/, 'crit'],
    [/技能急速|冷却时间/, 'haste'],
    [/灼烧/, 'burn'],
    [/额外生命值|最大生命值|护甲|魔法抗性/, 'tank'],
    [/你的治疗|为友军.*治疗|治疗和护盾|治疗或护盾/, 'heal'],
    [/你的护盾|为友军.*护盾|治疗和护盾|治疗或护盾/, 'shield'],
    [/终极技能/, 'ultimate'],
    [/攻击特效/, 'onhit'],
  ] as [RegExp, Tag][])
    if (pattern.test(text)) tags.push(tag);
  return tags;
}
export const augments: Augment[] = catalog
  .filter((row) => !row.key.startsWith('GoH_'))
  .map((row) => {
    const seed = seedAugments.find((a) => norm(a.english) === norm(row.english));
    const key = row.key.replace(/^ARAM_/i, '').toLowerCase();
    const patchDescription = patchDescriptions[row.key];
    const oldDescription =
      row.key === 'ARAM_Multishot'
        ? '指定技能命中任务完成后，获得额外飞弹。'
        : row.key === 'Snowbomb'
          ? '雪球二段增伤，命中后击飞目标并击退周边敌人。'
          : undefined;
    const description =
      patchDescription ??
      oldDescription ??
      (row.descriptionKey ? row.description : (seed?.description ?? row.description));
    const tags = seed?.tags ?? extras[key] ?? inferTags(description);
    const requires =
      ([
        'ultimaterecursion',
        'ultimateawakening',
        'ultimaterevolution',
        'arcaneaxiom',
        'itskillingtime',
        'jeweledbracelet',
        'moshmonster',
      ].includes(key)
        ? (['ultimate'] as Tag[])
        : undefined) ??
      seed?.requires ??
      (key === 'courageofthecolossus' || key === 'guiltypleasure'
        ? (['control'] as Tag[])
        : key === 'outlawsgrit'
          ? (['dash'] as Tag[])
          : key === 'criticalhealing' ||
              key === 'windspeakersblessing' ||
              key === 'empoweredbythefaithful'
            ? (['heal', 'shield'] as Tag[])
            : undefined);
    return {
      id: seed?.id ?? `augment-${row.gameId}`,
      gameId: row.gameId,
      key: row.key,
      name: row.name,
      english: row.english,
      tier: row.tier as Augment['tier'],
      description,
      descriptionKey: patchDescription
        ? `patch:${row.key}`
        : oldDescription
          ? `editorial:${row.key}`
          : row.descriptionKey,
      tags,
      requires,
      risk: seed?.risk ?? (row.key === 'Totentanz' ? 2 : 0),
      aliases: seed ? [seed.name, seed.english] : [],
      grants: ['infernalconduit', 'firebrand'].includes(key) ? ['burn'] : undefined,
      manaOnly: ['overflow', 'bluebarrier'].includes(key),
      caution:
        key === 'jeweledbracelet'
          ? '仅大招暴击，不等同于珠光护手，不能解锁所有技能的暴击流。'
          : key === 'giftofthedrowned'
            ? '生命转为穿甲会改变承伤投入，不适合继续按血量前排方案理解。'
            : key === 'nomananoproblem'
              ? '装备法力会被转化，原有的法力续航规划需要重新检查。'
              : key === 'ticklemonster'
                ? '装备攻击力会被转换，依赖攻击力系数的输出可能受损。'
                : key === 'totentanz'
                  ? '免死结束前若没有击杀或助攻会死亡，容错低。'
                  : undefined,
      rangedOnly: key === 'drawyoursword',
      allySupportOnly: [
        'allforyou',
        'windspeakersblessing',
        'empoweredbythefaithful',
        'enchantingbutterflies',
        'grouphug',
      ].includes(key),
      conflictsWithTags: key === 'backtobasics' ? ['ultimate'] : undefined,
      source: patchDescription
        ? patchSource
        : row.key === 'Snowbomb'
          ? 'https://wiki.leagueoflegends.com/en-us/ARAM%3A_Mayhem/Augments'
          : `https://raw.communitydragon.org/16.21/plugins/rcp-be-lol-game-data/global/zh_cn/v1/cherry-augments.json`,
      status:
        row.descriptionKey || patchDescription || oldDescription
          ? '静态资料已核对'
          : seed
            ? '待实战验证'
            : '机制待补充',
    };
  });
