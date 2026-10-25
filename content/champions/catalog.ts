import type { Champion, Tag } from '../../packages/engine/types';
import catalog from '../catalog/champions.json';
import { profileRows } from './profiles';
import { makeBuild } from './archetypes';
import { seedChampions } from './seed';
const roleNames: Record<string, string> = {
  mage: '法师',
  marksman: '射手',
  tank: '坦克',
  support: '辅助',
  fighter: '战士',
  assassin: '刺客',
};
const members = (text: string, id: string) =>
  text.toLowerCase().split(' ').includes(id.toLowerCase());
const control =
  'Annie Galio TwistedFate XinZhao Urgot Leblanc Fiddlesticks Alistar Ryze Sion Soraka Tristana Warwick Nunu Ashe Jax Morgana Zilean Anivia Chogath Amumu Rammus Janna Karma Taric Veigar Swain Caitlyn Blitzcrank Malphite Maokai Renekton JarvanIV Elise Orianna MonkeyKing Brand LeeSin Vayne Skarner Heimerdinger Nidalee Udyr Poppy Gragas Pantheon Kennen Leona Malzahar Riven Shen Lux Ahri Volibear Rengar Varus Nautilus Sejuani Fiora Ziggs Lulu Draven Hecarim Darius Jayce Lissandra Diana Syndra AurelionSol Zoe Zyra Seraphine Gnar Zac Yasuo Velkoz Taliyah Camille Braum Jhin Jinx TahmKench Briar Senna Kled Ekko Qiyana Vi Aatrox Nami Azir Yuumi Thresh RekSai Ivern Kalista Bard Rakan Xayah Ornn Sylas Neeko Rell Pyke Vex Yone Ambessa Mel Sett Lillia Renata Aurora KSante Milio Hwei';
const dash =
  'Ahri Akali Akshan Alistar Ambessa Aatrox Aurora Azir Belveth Braum Briar Caitlyn Camille Corki Diana Ekko Elise Evelynn Ezreal Fiora Fizz Galio Gnar Gragas Graves Gwen Hecarim Irelia JarvanIV Jax Jayce Kalista Kassadin Katarina Kayn Khazix Kindred Kled KSante Leblanc LeeSin Leona Lissandra Lucian Malphite MasterYi MonkeyKing Naafiri Nautilus Nidalee Nilah Ornn Pantheon Poppy Pyke Qiyana Quinn Rakan RekSai Rell Renekton Rengar Riven Samira Sejuani Shen Shyvana Sylas Talon Tristana Tryndamere Urgot Vayne Vex Vi Viego Warwick XinZhao Yasuo Yone Yuumi Zac Zeri Zaahen';
const heal =
  'Alistar Bard Ivern Janna Kayle Milio Nami Nidalee Rakan Senna Seraphine Sona Soraka Taric Yuumi';
const shield =
  'Annie Ivern Janna Karma LeeSin Lulu Lux Milio Morgana Orianna Rakan Renata Senna Seraphine Shen Sona Taric Yuumi';
const burn =
  'Brand Cassiopeia Darius Fiddlesticks Gangplank Lillia Malzahar Mordekaiser Morgana Rumble Shaco Singed Swain Teemo Twitch Udyr Zyra';
const itemOverrides: Record<string, string[]> = {
  Azir: ['纳什之牙', '法师之靴', '兰德里的折磨', '灭世者的死亡之帽', '中娅沙漏', '虚空之杖'],
  Kayle: ['纳什之牙', '狂战士胫甲', '鬼索的狂暴之刃', '裂隙制造者', '灭世者的死亡之帽', '智慧末刃'],
  Vladimir: ['星界驱驰', '法师之靴', '裂隙制造者', '灭世者的死亡之帽', '中娅沙漏', '虚空之杖'],
  Mordekaiser: ['瑞莱的冰晶节杖', '水银之靴', '裂隙制造者', '兰德里的折磨', '振奋盔甲', '中娅沙漏'],
  Gwen: ['纳什之牙', '法师之靴', '裂隙制造者', '灭世者的死亡之帽', '中娅沙漏', '虚空之杖'],
  Fiddlesticks: ['残疫', '法师之靴', '兰德里的折磨', '中娅沙漏', '灭世者的死亡之帽', '虚空之杖'],
  AurelionSol: [
    '瑞莱的冰晶节杖',
    '法师之靴',
    '兰德里的折磨',
    '大天使之杖',
    '灭世者的死亡之帽',
    '虚空之杖',
  ],
  Gangplank: ['三相之力', '明朗之靴', '收集者', '无尽之刃', '多米尼克领主的致意', '饮血剑'],
  Jhin: ['收集者', '轻灵之靴', '无尽之刃', '疾射火炮', '多米尼克领主的致意', '饮血剑'],
  Samira: ['收集者', '狂战士胫甲', '无尽之刃', '饮血剑', '多米尼克领主的致意', '不朽盾弓'],
  Nilah: ['收集者', '狂战士胫甲', '无尽之刃', '饮血剑', '多米尼克领主的致意', '死亡之舞'],
  Hecarim: ['朔极之矛', '明朗之靴', '三相之力', '死亡之舞', '斯特拉克的挑战护手', '振奋盔甲'],
  Jax: ['三相之力', '水银之靴', '焚天', '斯特拉克的挑战护手', '死亡之舞', '振奋盔甲'],
  Fiora: ['贪欲九头蛇', '水银之靴', '三相之力', '死亡之舞', '斯特拉克的挑战护手', '振奋盔甲'],
  Camille: ['三相之力', '水银之靴', '贪欲九头蛇', '斯特拉克的挑战护手', '死亡之舞', '振奋盔甲'],
  Irelia: ['破败王者之刃', '水银之靴', '焚天', '斯特拉克的挑战护手', '死亡之舞', '智慧末刃'],
  Riven: ['朔极之矛', '明朗之靴', '星蚀', '死亡之舞', '斯特拉克的挑战护手', '黑色切割者'],
  Darius: ['挺进破坏者', '水银之靴', '斯特拉克的挑战护手', '亡者的板甲', '振奋盔甲', '死亡之舞'],
  Nasus: ['三相之力', '水银之靴', '冰霜之心', '振奋盔甲', '荆棘之甲', '斯特拉克的挑战护手'],
  Viego: ['破败王者之刃', '水银之靴', '焚天', '死亡之舞', '斯特拉克的挑战护手', '智慧末刃'],
  Kaisa: ['海妖杀手', '狂战士胫甲', '鬼索的狂暴之刃', '纳什之牙', '界弓', '中娅沙漏'],
};
const altPriority: Record<string, string> = {
  'TwistedFate-poke': 'QWE',
  'MissFortune-pokeadc': 'EQW',
  'Nasus-poke': 'EQW',
  'Varus-pokeadc': 'QEW',
  'Shaco-assassin': 'QEW',
  'Sona-poke': 'QWE',
  'Shyvana-poke': 'EWQ',
};
export const champions: Champion[] = catalog.map((row) => {
  const profile = profileRows.find((p) => p.id.toLowerCase() === row.id.toLowerCase());
  if (!profile) throw new Error(`Missing profile ${row.id}`);
  const seed = seedChampions.find((c) => c.id.toLowerCase() === row.id.toLowerCase());
  const builds = seed
    ? seed.builds.map((b) => ({
        ...b,
        items: [...b.items],
        starter: [...b.starter],
        evidence: 'editorial' as const,
        plan: profile.plan,
      }))
    : [makeBuild(row.id, profile.archetype, profile.priority, profile.plan)];
  if (!seed && profile.alternative)
    builds.push(
      makeBuild(
        row.id,
        profile.alternative,
        altPriority[`${row.id}-${profile.alternative}`] ?? profile.priority,
        profile.plan,
        true,
      ),
    );
  if (itemOverrides[row.id]) builds[0].items = [...itemOverrides[row.id]];
  if (row.id === 'Brand')
    builds[0].items = [
      '黯炎火炬',
      '法师之靴',
      '兰德里的折磨',
      '瑞莱的冰晶节杖',
      '虚空之杖',
      '中娅沙漏',
    ];
  if (row.id === 'Leona')
    builds[0].items = ['无终恨意', '水银之靴', '荆棘之甲', '深渊面具', '振奋盔甲', '兰顿之兆'];
  if (row.id === 'Malphite')
    builds[0].items = ['无终恨意', '铁板靴', '冰霜之心', '自然之力', '荆棘之甲', '兰顿之兆'];
  const mana = row.resource === '法力';
  for (const b of builds) {
    if (!mana) {
      b.items = b.items.map((i) =>
        i === '卢登的回声'
          ? '风暴狂涌'
          : i === '黯炎火炬'
            ? '兰德里的折磨'
            : i === '冰霜之心'
              ? '兰顿之兆'
              : i,
      );
      b.items = [...new Set(b.items)];
      for (const replacement of ['中娅沙漏', '自然之力', '灭世者的死亡之帽'])
        if (b.items.length && b.items.length < 6 && !b.items.includes(replacement))
          b.items.push(replacement);
      if (b.starter.some((i) => ['遗失的章节', '女神之泪'].includes(i)))
        b.starter = ['守护者法球', '速度之靴'];
    }
    if (b.id.endsWith('-crit') && b.tags.includes('spell') && row.id !== 'Garen')
      b.requiredAugments = ['jeweled'];
    if (row.id === 'Jayce') {
      b.skillMode = 'jayce';
      b.skillNote = '杰斯 R 自动升级，Q/W/E 各可升 6 级；不手动点 R。';
    }
    if (['Udyr', 'Aphelios'].includes(row.id)) {
      b.skillMode = 'manual';
      b.skillNote =
        row.id === 'Udyr'
          ? '四姿态特殊加点：法术承伤优先 R、W，物理普攻优先 Q、E；按觉醒与实际已点技能分配，不套普通终极技能表。'
          : '升级选择属性而非普通 Q/W/E；攻击力、攻速、穿甲按当前装备和实际面板调整。';
    }
    if (row.id === 'Yuumi') {
      b.skillCaps = { Q: 6, W: 4, E: 5 };
      b.skillNote = 'Q 可升 6 级；此表按主 E 副 Q 分配，结合实际已点技能调整。';
    }
    if (['Nidalee', 'Elise', 'Karma'].includes(row.id))
      b.skillNote = 'R 初始自动拥有一阶；表中 6/11/16 为后续手动升级。';
  }
  const tags = new Set<Tag>(
    seed?.tags ?? builds[0].tags.filter((t) => !['heal', 'shield', 'control', 'dash'].includes(t)),
  );
  if (members('Aphelios Belveth Evelynn Mordekaiser Nilah Quinn Shyvana Viego', row.id))
    tags.add('control');
  if (row.id === 'Nidalee') tags.delete('control');
  if (
    members(
      'Aatrox Briar Darius DrMundo Ekko Fiora Garen Gragas Illaoi Irelia Khazix KSante Maokai MasterYi Mordekaiser Nasus Nilah Nunu Olaf Renekton Rengar Sett Swain Sylas TahmKench Trundle Tryndamere Udyr Vladimir Volibear Warwick XinZhao Zac Locke',
      row.id,
    )
  )
    tags.add('heal');
  if (
    members(
      'Annie Blitzcrank Camille Diana Ekko Galio Garen Hwei JarvanIV Kaisa KSante Mordekaiser Nautilus Neeko Nilah Rell Riven Rumble Shen Sion TahmKench Udyr Urgot Vex Vi Viktor Volibear',
      row.id,
    )
  )
    tags.add('shield');
  for (const [list, tag] of [
    [control, 'control'],
    [dash, 'dash'],
    [heal, 'heal'],
    [shield, 'shield'],
    [burn, 'burn'],
  ] as const)
    if (members(list, row.id)) tags.add(tag);
  if (!['Udyr', 'Jayce'].includes(row.id)) tags.add('ultimate');
  if (row.id === 'Nidalee') tags.delete('control');
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    role: roleNames[row.roles[0]] ?? '战士',
    difficulty: row.difficulty >= 7 ? '较难' : row.difficulty >= 4 ? '适中' : '容易',
    initials: seed?.initials ?? row.name.slice(0, 1),
    tags: [...tags],
    builds,
    keywords: row.keywords,
    resource: row.resource,
    range: row.range,
    patch: row.patch,
    allySupport: members(heal, row.id) || members(shield, row.id),
    source: `https://game.gtimg.cn/images/lol/act/img/js/hero/${row.gameId}.js`,
  };
});
