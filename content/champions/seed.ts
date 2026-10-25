import type { Champion, Build, Tag, Skill } from '../../packages/engine/types';
function build(
  id: string,
  name: string,
  subtitle: string,
  tags: Tag[],
  items: string[],
  priority: [Skill, Skill, Skill],
  options: Partial<Build> = {},
): Build {
  return {
    id,
    name,
    subtitle,
    tags,
    items,
    priority,
    opening: ['Q', 'W', 'E'],
    base: 20,
    starter: ['守护者号角', '速度之靴'],
    situational: [
      { item: '自然之力', reason: '承受较多持续魔法伤害时考虑，输出位需权衡伤害损失。' },
      { item: '荆棘之甲', reason: '前排承受普攻并需要限制治疗时考虑。' },
    ],
    plan: '围绕主要属性完成核心装备，再按对面威胁调整生存装。',
    condition: '没有关键海克斯也能按基础路线发挥作用。',
    caution: '根据对局调整，不建议仅为等待尚未出现的强化而提前转型。',
    ...options,
  };
}
const mage = (id: string, priority: [Skill, Skill, Skill], dot = false) =>
  build(
    id,
    dot ? '灼烧消耗' : '技能爆发',
    dot ? '持续命中，扩大灼烧与冷却收益' : '把技能命中转化为稳定伤害',
    ['spell', 'haste', ...(dot ? ['burn' as Tag] : [])],
    dot
      ? ['黯炎火炬', '兰德里的折磨', '法师之靴', '中娅沙漏', '灭世者的死亡之帽', '虚空之杖']
      : ['卢登的回声', '法师之靴', '影焰', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'],
    priority,
    {
      starter: ['遗失的章节', '速度之靴'],
      situational: [
        { item: '莫雷洛秘典', reason: '敌方治疗明显、且你能稳定施加伤害时考虑。' },
        { item: '女妖面纱', reason: '需要防止关键控制打断输出时考虑。' },
      ],
    },
  );
const spellcrit = (id: string, priority: [Skill, Skill, Skill]) =>
  build(
    id,
    '技能暴击',
    '获得技能暴击机制后再投入暴击属性',
    ['spell', 'crit', 'haste'],
    ['卢登的回声', '法师之靴', '影焰', '灭世者的死亡之帽', '虚空之杖', '中娅沙漏'],
    priority,
    {
      base: 8,
      starter: ['遗失的章节', '速度之靴'],
      condition: '优先确认已获得珠光护手等技能暴击机制；这份保守装备路线仍以法强为主。',
      caution: '普通暴击率不会自动让技能暴击；不要直接照搬普攻英雄的暴击装备。',
    },
  );
const tank = (id: string, priority: [Skill, Skill, Skill]) =>
  build(
    id,
    '控制前排',
    '先站得住，再反复控制创造空间',
    ['tank', 'control', 'shield'],
    ['心之钢', '水银之靴', '无终恨意', '振奋盔甲', '荆棘之甲', '自然之力'],
    priority,
    {
      plan: '先满足承伤需求，再用控制与护盾形成多轮团战收益。',
      caution: '心之钢需要可靠的近身叠层环境；难以接近敌人时，优先抗性装。',
    },
  );
const marksman = (id: string, priority: [Skill, Skill, Skill]) =>
  build(
    id,
    '暴击射手',
    '保持普攻距离，逐步提高持续输出',
    ['attack', 'crit'],
    ['无尽之刃', '狂战士胫甲', '幻影之舞', '多米尼克领主的致意', '饮血剑', '疾射火炮'],
    priority,
    {
      starter: ['守护者战锤', '速度之靴'],
      situational: [
        { item: '凡性的提醒', reason: '敌方治疗强时替换穿甲位置；避免与同类穿甲装备重复。' },
        { item: '玛莫提乌斯之噬', reason: '魔法爆发使你无法持续普攻时，权衡替换一件输出装。' },
      ],
    },
  );
const onhit = (id: string, priority: [Skill, Skill, Skill]) =>
  build(
    id,
    '攻速特效',
    '提高普攻频率，叠加攻击特效收益',
    ['attack', 'onhit'],
    ['破败王者之刃', '狂战士胫甲', '鬼索的狂暴之刃', '卢安娜的飓风', '界弓', '饮血剑'],
    priority,
    {
      base: 17,
      starter: ['守护者战锤', '速度之靴'],
      caution: '特效触发机制需要按英雄和强化逐项验证，不假定所有技能都触发普攻特效。',
    },
  );
const support = (id: string, priority: [Skill, Skill, Skill]) =>
  build(
    id,
    '治疗护盾',
    '提高团队续航，围绕关键队友打团',
    ['heal', 'shield', 'haste'],
    ['月石再生器', '明朗之靴', '救赎', '炽热香炉', '流水法杖', '米凯尔的祝福'],
    priority,
    {
      starter: ['女神之泪', '班德尔玻璃镜'],
      plan: '先保障法力和治疗频率，再按队友输出类型选择团队增益。',
      situational: [
        { item: '米凯尔的祝福', reason: '关键队友容易被可解除控制限制时考虑。' },
        { item: '流水法杖', reason: '队伍中技能输出英雄较多时考虑。' },
      ],
    },
  );
export const seedChampions: Champion[] = [
  {
    id: 'Brand',
    name: '布兰德',
    title: '复仇焰魂',
    role: '法师',
    difficulty: '适中',
    initials: '火',
    tags: ['spell', 'burn', 'control', 'ultimate'],
    builds: [mage('brand-burn', ['W', 'E', 'Q'], true), spellcrit('brand-crit', ['W', 'E', 'Q'])],
  },
  {
    id: 'Lux',
    name: '拉克丝',
    title: '光辉女郎',
    role: '法师',
    difficulty: '容易',
    initials: '光',
    tags: ['spell', 'control', 'shield', 'ultimate'],
    builds: [
      mage('lux-mage', ['E', 'Q', 'W']),
      support('lux-support', ['W', 'E', 'Q']),
      spellcrit('lux-crit', ['E', 'Q', 'W']),
    ],
  },
  {
    id: 'Morgana',
    name: '莫甘娜',
    title: '堕落天使',
    role: '法师',
    difficulty: '容易',
    initials: '暗',
    tags: ['spell', 'burn', 'control', 'shield', 'ultimate'],
    builds: [
      mage('morgana-burn', ['W', 'Q', 'E'], true),
      support('morgana-support', ['E', 'Q', 'W']),
    ],
  },
  {
    id: 'Ahri',
    name: '阿狸',
    title: '九尾妖狐',
    role: '法师',
    difficulty: '适中',
    initials: '狐',
    tags: ['spell', 'control', 'dash', 'ultimate'],
    builds: [mage('ahri-mage', ['Q', 'W', 'E']), spellcrit('ahri-crit', ['Q', 'W', 'E'])],
  },
  {
    id: 'Malphite',
    name: '墨菲特',
    title: '熔岩巨兽',
    role: '坦克',
    difficulty: '容易',
    initials: '岩',
    tags: ['spell', 'tank', 'control', 'dash', 'ultimate'],
    builds: [
      tank('malphite-tank', ['Q', 'E', 'W']),
      {
        ...mage('malphite-ap', ['Q', 'E', 'W']),
        base: 16,
        name: '法强开团',
        caution: '爆发高但容错低，队伍缺前排时优先考虑承伤路线。',
      },
    ],
  },
  {
    id: 'Leona',
    name: '蕾欧娜',
    title: '曙光女神',
    role: '坦克',
    difficulty: '适中',
    initials: '曙',
    tags: ['tank', 'control', 'dash', 'shield', 'ultimate'],
    builds: [
      tank('leona-tank', ['W', 'E', 'Q']),
      build(
        'leona-haste',
        '急速控制',
        '缩短基础技能间隔，争取更多轮控制',
        ['tank', 'control', 'haste'],
        ['无终恨意', '明朗之靴', '冰霜之心', '深渊面具', '荆棘之甲', '振奋盔甲'],
        ['W', 'Q', 'E'],
        { base: 18 },
      ),
    ],
  },
  {
    id: 'Ashe',
    name: '艾希',
    title: '寒冰射手',
    role: '射手',
    difficulty: '容易',
    initials: '冰',
    tags: ['attack', 'crit', 'control', 'ultimate'],
    builds: [marksman('ashe-crit', ['Q', 'W', 'E']), onhit('ashe-onhit', ['Q', 'W', 'E'])],
  },
  {
    id: 'Jinx',
    name: '金克丝',
    title: '暴走萝莉',
    role: '射手',
    difficulty: '适中',
    initials: '爆',
    tags: ['attack', 'crit', 'control', 'ultimate'],
    builds: [
      marksman('jinx-crit', ['Q', 'W', 'E']),
      {
        ...onhit('jinx-onhit', ['Q', 'W', 'E']),
        base: 10,
        caution: '特效路线为实验备选；没有明确强化配合时优先暴击路线。',
      },
    ],
  },
  {
    id: 'KogMaw',
    name: '克格莫',
    title: '深渊巨口',
    role: '射手',
    difficulty: '适中',
    initials: '渊',
    tags: ['attack', 'onhit', 'spell', 'ultimate'],
    builds: [
      { ...onhit('kog-onhit', ['W', 'Q', 'E']), base: 24 },
      {
        ...mage('kog-ap', ['E', 'Q', 'W']),
        base: 12,
        name: '法强消耗',
        caution: '依赖技能命中与法力管理，缺乏普攻环境时再考虑转向。',
      },
    ],
  },
  {
    id: 'Sona',
    name: '娑娜',
    title: '琴瑟仙女',
    role: '辅助',
    difficulty: '容易',
    initials: '琴',
    tags: ['spell', 'heal', 'shield', 'control', 'ultimate'],
    builds: [
      support('sona-support', ['W', 'Q', 'E']),
      { ...mage('sona-ap', ['Q', 'W', 'E']), base: 10, name: '法强消耗' },
    ],
  },
  {
    id: 'Lulu',
    name: '璐璐',
    title: '仙灵女巫',
    role: '辅助',
    difficulty: '适中',
    initials: '灵',
    tags: ['spell', 'shield', 'control', 'ultimate'],
    builds: [
      support('lulu-support', ['E', 'W', 'Q']),
      {
        ...onhit('lulu-onhit', ['E', 'W', 'Q']),
        base: 5,
        name: '特效娱乐',
        condition: '仅在普攻强化和输出环境都较好时尝试；会明显降低团队保护投入。',
      },
    ],
  },
  {
    id: 'Garen',
    name: '盖伦',
    title: '德玛西亚之力',
    role: '战士',
    difficulty: '容易',
    initials: '剑',
    tags: ['attack', 'spell', 'tank', 'crit', 'ultimate'],
    builds: [
      build(
        'garen-fighter',
        '半肉战士',
        '贴近后排输出，同时保持承伤能力',
        ['attack', 'spell', 'tank'],
        ['挺进破坏者', '水银之靴', '黑色切割者', '斯特拉克的挑战护手', '亡者的板甲', '自然之力'],
        ['E', 'Q', 'W'],
      ),
      {
        ...marksman('garen-crit', ['E', 'Q', 'W']),
        base: 8,
        name: '暴击旋风',
        caution: '以 E 技能的实际暴击交互为前提；近战全输出容错低，优先保留生存位。',
      },
    ],
  },
];
