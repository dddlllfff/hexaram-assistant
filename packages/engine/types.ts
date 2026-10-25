export type Tag =
  | 'spell'
  | 'attack'
  | 'crit'
  | 'haste'
  | 'burn'
  | 'tank'
  | 'heal'
  | 'shield'
  | 'control'
  | 'dash'
  | 'ultimate'
  | 'onhit';
export type Skill = 'Q' | 'W' | 'E' | 'R';
export type Preference = 'steady' | 'ceiling' | 'fun';
export interface Build {
  id: string;
  name: string;
  subtitle: string;
  tags: Tag[];
  base: number;
  starter: string[];
  items: string[];
  situational: { item: string; reason: string }[];
  priority: [Skill, Skill, Skill];
  opening: [Skill, Skill, Skill];
  plan: string;
  condition: string;
  caution: string;
  requiredAugments?: string[];
  skillMode?: 'standard' | 'jayce' | 'manual';
  skillNote?: string;
  skillCaps?: Partial<Record<Skill, number>>;
  evidence?: 'editorial' | 'baseline';
}
export interface Champion {
  id: string;
  name: string;
  title: string;
  role: string;
  difficulty: string;
  initials: string;
  tags: Tag[];
  builds: Build[];
  keywords?: string;
  resource?: string;
  range?: number;
  patch?: string;
  source?: string;
  allySupport?: boolean;
}
export interface Augment {
  id: string;
  name: string;
  english: string;
  tier: '白银' | '黄金' | '棱彩';
  description: string;
  tags: Tag[];
  requires?: Tag[];
  excludes?: string[];
  risk: number;
  source: string;
  status: '待实战验证' | '静态资料已核对' | '机制待补充';
  gameId?: number;
  key?: string;
  aliases?: string[];
  grants?: Tag[];
  manaOnly?: boolean;
  rangedOnly?: boolean;
  conflictsWithTags?: Tag[];
  descriptionKey?: string;
  caution?: string;
  allySupportOnly?: boolean;
}
export interface Session {
  championId: string;
  selected: string[];
  candidates: string[];
  preference: Preference;
  level: number;
  ownedItems: string[];
  threat: 'balanced' | 'physical' | 'magic' | 'healing';
  pinnedBuildId: string | null;
}
