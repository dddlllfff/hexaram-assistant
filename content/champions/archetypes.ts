import type { Build, Skill, Tag } from '../../packages/engine/types';
type Archetype = {
  name: string;
  tags: Tag[];
  items: string[];
  starter?: string[];
  caution: string;
};
const magical = ['法师之靴', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'];
const armor = ['水银之靴', '无终恨意', '振奋盔甲', '荆棘之甲', '自然之力'];
export const archetypes: Record<string, Archetype> = {
  utility: {
    name: '功能支援',
    tags: ['haste', 'control'],
    items: ['舒瑞娅的战歌', '明朗之靴', '帝国指令', '救赎', '钢铁烈阳之匣', '米凯尔的祝福'],
    starter: ['班德尔玻璃镜', '仙女护符'],
    caution: '以技能急速、移速和主动保护支援团队；没有常规治疗护盾触发时，不套用月石或香炉路线。',
  },
  burst: {
    name: '技能爆发',
    tags: ['spell', 'haste'],
    items: ['卢登的回声', magical[0], '影焰', ...magical.slice(1)],
    caution: '等关键控制命中再交爆发，优先保证一轮技能的命中率。',
  },
  poke: {
    name: '远程消耗',
    tags: ['spell', 'haste'],
    items: ['卢登的回声', '法师之靴', '视界专注', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'],
    caution: '以安全命中和清线为主，不能用消耗装代替进场所需的生存条件。',
  },
  controlmage: {
    name: '控制法师',
    tags: ['spell', 'haste', 'control'],
    items: ['卢登的回声', '法师之靴', '影焰', '中娅沙漏', '灭世者的死亡之帽', '虚空之杖'],
    caution: '控制技能至少保留一项应对突进，避免只为清线交完技能。',
  },
  burn: {
    name: '灼烧消耗',
    tags: ['spell', 'burn', 'haste'],
    items: ['黯炎火炬', '法师之靴', '兰德里的折磨', '瑞莱的冰晶节杖', '虚空之杖', '中娅沙漏'],
    caution: '灼烧需要持续命中；冰杖是控制备选，不是所有持续伤害英雄都必须购买。',
  },
  battlemage: {
    name: '持续法术作战',
    tags: ['spell', 'haste', 'tank'],
    items: ['裂隙制造者', '法师之靴', '兰德里的折磨', '中娅沙漏', '灭世者的死亡之帽', '虚空之杖'],
    starter: ['守护者法球', '速度之靴'],
    caution: '持续作战需要站得住；被重伤或远程拉扯克制时先补合适的生存位。',
  },
  manamage: {
    name: '法力法师',
    tags: ['spell', 'haste'],
    items: ['时光之杖', '法师之靴', '大天使之杖', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'],
    starter: ['女神之泪', '遗失的章节'],
    caution: '法力叠层需要时间，大天使只列基础形态，不与炽天使之拥重复购买。',
  },
  cassio: {
    name: '毒牙持续输出',
    tags: ['spell', 'haste', 'burn'],
    items: [
      '时光之杖',
      '大天使之杖',
      '瑞莱的冰晶节杖',
      '兰德里的折磨',
      '灭世者的死亡之帽',
      '虚空之杖',
    ],
    starter: ['女神之泪', '遗失的章节'],
    caution: '卡西奥佩娅不能购买鞋子；E 持续施法时注意法力与中毒覆盖。',
  },
  apassassin: {
    name: '法术切入',
    tags: ['spell', 'dash'],
    items: ['巫妖之祸', '法师之靴', '影焰', '中娅沙漏', '灭世者的死亡之帽', '虚空之杖'],
    starter: ['守护者法球', '速度之靴'],
    caution: '先等待敌方控制与保护技能，法强切入不等于可以承担正面前排。',
  },
  apfront: {
    name: '半肉法术开团',
    tags: ['spell', 'tank', 'haste'],
    items: ['兰德里的折磨', '水银之靴', '裂隙制造者', '中娅沙漏', '振奋盔甲', '虚空之杖'],
    starter: ['守护者号角', '速度之靴'],
    caution: '己方缺前排时优先抗性；敌方伤害类型决定防装，不固定堆法强。',
  },
  tank: {
    name: '抗性前排',
    tags: ['tank', 'control'],
    items: ['无终恨意', ...armor.filter((i) => i !== '无终恨意'), '心之钢'],
    starter: ['守护者号角', '速度之靴'],
    caution: '心之钢只有能稳定近身叠层时才提前购买；默认先满足抗性与生存。',
  },
  healthtank: {
    name: '血量续航',
    tags: ['tank', 'heal'],
    items: ['心之钢', ...armor],
    starter: ['守护者号角', '速度之靴'],
    caution: '难以近身叠层时跳过心之钢，最大生命值伤害较多时优先抗性。',
  },
  hastefront: {
    name: '急速控制',
    tags: ['tank', 'control', 'haste'],
    items: ['无终恨意', '明朗之靴', '冰霜之心', '深渊面具', '荆棘之甲', '振奋盔甲'],
    starter: ['守护者号角', '速度之靴'],
    caution: '技能频率需要和生存平衡，无蓝英雄不要为了急速盲买法力装备。',
  },
  bruiser: {
    name: '半肉战士',
    tags: ['attack', 'spell', 'tank', 'haste'],
    items: ['焚天', '水银之靴', '黑色切割者', '斯特拉克的挑战护手', '死亡之舞', '振奋盔甲'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '先根据英雄触发方式选择核心装；无法接近敌人时，生存和移速比纯伤害更有用。',
  },
  juggernaut: {
    name: '重装持续输出',
    tags: ['attack', 'onhit', 'tank'],
    items: ['黑色切割者', '水银之靴', '斯特拉克的挑战护手', '死亡之舞', '荆棘之甲', '自然之力'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '优先稳定贴近与持续命中，特效触发频率以英雄技能的实际规则为准。',
  },
  meleeonhit: {
    name: '近战特效',
    tags: ['attack', 'onhit'],
    items: [
      '破败王者之刃',
      '水银之靴',
      '鬼索的狂暴之刃',
      '死亡之舞',
      '智慧末刃',
      '斯特拉克的挑战护手',
    ],
    starter: ['守护者战锤', '速度之靴'],
    caution: '没有持续普攻环境时先补生存，不为叠特效而在控制齐全时进场。',
  },
  assassin: {
    name: '穿甲切入',
    tags: ['spell', 'attack', 'dash'],
    items: ['幽梦之灵', '明朗之靴', '亵渎九头蛇', '夜之锋刃', '赛瑞尔达的怨恨', '公理圆弧'],
    starter: ['锯齿短匕', '速度之靴'],
    caution: '先消耗与等待保护技能，面对高护甲前排时不要照搬针对脆皮的爆发预期。',
  },
  critadc: {
    name: '暴击射手',
    tags: ['attack', 'crit'],
    items: ['育恩塔尔荒野箭', '狂战士胫甲', '无尽之刃', '幻影之舞', '多米尼克领主的致意', '饮血剑'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '优先持续普攻环境，穿甲与重伤装备按敌方阵容替换，不重复购买同组穿甲。',
  },
  onhitadc: {
    name: '攻速特效',
    tags: ['attack', 'onhit'],
    items: ['破败王者之刃', '狂战士胫甲', '鬼索的狂暴之刃', '卢安娜的飓风', '界弓', '饮血剑'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '卢安娜的飓风仅适用于远程英雄；技能触发特效的系数与上限需按英雄判断。',
  },
  casteradc: {
    name: '技能物理输出',
    tags: ['attack', 'spell', 'crit', 'haste'],
    items: ['夺萃之镰', '明朗之靴', '无尽之刃', '疾射火炮', '多米尼克领主的致意', '饮血剑'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '技能与普攻交替输出，不把所有物理技能都视为可以暴击或触发特效。',
  },
  pokeadc: {
    name: '穿甲消耗',
    tags: ['spell', 'haste'],
    items: ['魔宗', '明朗之靴', '幽梦之灵', '赛瑞尔达的怨恨', '夜之锋刃', '公理圆弧'],
    starter: ['女神之泪', '锯齿短匕'],
    caution: '魔宗需要法力资源和叠层时间；队伍缺持续输出时不要无条件走消耗路线。',
  },
  spellblade: {
    name: '咒刃技能流',
    tags: ['spell', 'attack', 'onhit', 'haste'],
    items: ['魔宗', '明朗之靴', '三相之力', '赛瑞尔达的怨恨', '朔极之矛', '饮血剑'],
    starter: ['女神之泪', '耀光'],
    caution: '咒刃有触发间隔，不重复买多件咒刃装备；强化改变伤害方式时再调整。',
  },
  critmelee: {
    name: '近战暴击',
    tags: ['attack', 'crit', 'dash'],
    items: ['破败王者之刃', '狂战士胫甲', '无尽之刃', '不朽盾弓', '死亡之舞', '多米尼克领主的致意'],
    starter: ['守护者战锤', '速度之靴'],
    caution: '近战暴击路线需要生存与进场条件；不朽盾弓与其他同组护盾装备避免冲突。',
  },
  healer: {
    name: '治疗护盾',
    tags: ['heal', 'shield', 'haste'],
    items: ['月石再生器', '明朗之靴', '救赎', '炽热香炉', '流水法杖', '米凯尔的祝福'],
    starter: ['班德尔玻璃镜', '仙女护符'],
    caution: '按己方普攻或技能输出选择增益，不为补齐六件而重复同类团队效果。',
  },
  spellcrit: {
    name: '技能暴击',
    tags: ['spell', 'crit', 'haste'],
    items: ['卢登的回声', '法师之靴', '影焰', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'],
    caution: '必须先获得技能暴击机制；普通暴击率不会自动让技能暴击。',
  },
  unreviewed: {
    name: '资料待核验',
    tags: [],
    items: [],
    caution: '该英雄尚未完成独立玩法编辑，暂不输出可能误导的装备或加点。',
  },
};
export function makeBuild(
  id: string,
  archetype: string,
  priority: string,
  plan: string,
  alternative = false,
): Build {
  const a = archetypes[archetype];
  if (!a) throw new Error(`Unknown archetype: ${archetype}`);
  return {
    id: `${id.toLowerCase()}-${archetype}`,
    name: a.name,
    subtitle: alternative ? '条件满足时的备选方向' : '围绕英雄机制的编辑建议',
    tags: a.tags,
    base: alternative ? 10 : 22,
    starter: a.starter ?? ['遗失的章节', '复用型药水'],
    items: [...a.items],
    priority: priority.split('') as [Skill, Skill, Skill],
    opening: ['Q', 'W', 'E'],
    plan,
    condition: alternative
      ? '需要相应强化、装备投入和输出环境；不要为未来尚未出现的强化提前转型。'
      : '不依赖特定稀有强化的基础方向，仍需按阵容与实际强化调整。',
    caution: a.caution,
    requiredAugments: archetype === 'spellcrit' ? ['jeweled'] : undefined,
    evidence: 'baseline',
    situational: a.tags.includes('tank')
      ? [
          { item: '自然之力', reason: '持续魔法伤害较多时考虑。' },
          { item: '兰顿之兆', reason: '敌方暴击普攻威胁明显时考虑。' },
        ]
      : a.tags.includes('attack')
        ? [
            { item: '凡性的提醒', reason: '重伤替换同组百分比穿甲位置，不与多米尼克重复。' },
            { item: '玛莫提乌斯之噬', reason: '魔法爆发妨碍持续输出时考虑。' },
          ]
        : [
            { item: '莫雷洛秘典', reason: '需要重伤且能稳定对英雄施加伤害时考虑。' },
            { item: '女妖面纱', reason: '关键控制会打断施法或阻止进场时考虑。' },
          ],
    ...(archetype === 'unreviewed' ? { skillMode: 'manual' as const, skillNote: plan } : {}),
  };
}
