import { useEffect, useMemo, useState } from 'react';
import {
  Hexagon,
  Swords,
  Sparkles,
  BookOpen,
  RotateCcw,
  Search,
  Plus,
  X,
  ChevronRight,
  Check,
  Shield,
  ArrowUpRight,
  Package,
  Download,
  Info,
  Crosshair,
  Zap,
  Flag,
} from 'lucide-react';
import {
  allItems,
  augments,
  champions,
  freshSession,
  recommend,
  sanitizeSession,
  tagLabel,
  catalogManifest,
} from '../../../packages/engine';
import type { Session } from '../../../packages/engine/types';
import metadata from '../../../content/metadata.json';
import { useRecognition } from './recognition';
import RecognitionPanel from './RecognitionPanel';
const STORAGE = 'hexaram.session.v1';
function load() {
  try {
    return sanitizeSession(JSON.parse(localStorage.getItem(STORAGE) ?? 'null'));
  } catch {
    return freshSession();
  }
}
export default function App() {
  const [state, setState] = useState<Session>(load);
  const [tab, setTab] = useState('planner');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('全部');
  const [augmentSearch, setAugmentSearch] = useState('');
  const [tier, setTier] = useState('全部');
  const [notice, setNotice] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
      return Array.isArray(raw?.selected) &&
        raw.selected.some((id: unknown) => !augments.some((a) => a.id === id))
        ? '版本更新：旧记录中已移除或未收录的强化已清理，请核对本局实际选择。'
        : '';
    } catch {
      return '';
    }
  });
  const [resetting, setResetting] = useState(false);
  const [itemPicker, setItemPicker] = useState('');
  const auto = useRecognition(state, setState, setNotice);
  const champion = champions.find((c) => c.id === state.championId)!;
  const result = useMemo(() => recommend(state), [state]);
  const patch = (value: Partial<Session>) => {
    if (Object.hasOwn(value, 'level')) auto.manual('level');
    if (Object.hasOwn(value, 'ownedItems')) auto.manual('inventory');
    setState((s) => sanitizeSession({ ...s, ...value }));
  };
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
    } catch {
      setNotice('本地保存失败，本次仍可使用；关闭前请导出方案。');
    }
  }, [state]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const filtered = champions.filter(
    (c) =>
      (role === '全部' || c.role === role) &&
      `${c.name}${c.title}${c.id}${c.keywords ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredAugments = augments.filter(
    (a) =>
      (tier === '全部' || a.tier === tier) &&
      `${a.name}${a.english}${a.description}${a.aliases?.join('') ?? ''}`
        .toLowerCase()
        .includes(augmentSearch.toLowerCase()),
  );
  function changeChampion(id: string) {
    auto.manual('hero');
    setState((s) => ({ ...freshSession(), championId: id, preference: s.preference }));
    setNotice('已切换英雄，清空上一位英雄的强化与装备。');
  }
  function candidate(id: string) {
    auto.manual('candidates');
    if (state.candidates.includes(id))
      patch({ candidates: state.candidates.filter((x) => x !== id) });
    else if (state.candidates.length < 3) patch({ candidates: [...state.candidates, id] });
    else setNotice('候选区已满，请先移除一个候选。');
  }
  function select(id: string) {
    if (state.selected.length >= 8) {
      setNotice('当前种子版最多记录 8 个强化。');
      return;
    }
    auto.release('selected', id);
    patch({ selected: [...state.selected, id], candidates: [] });
    setNotice('已记录实际选择，本局流派、出装与加点已同步更新。');
  }
  function exportPlan() {
    const text = [
      `海克斯工坊 · ${champion.name}`,
      `知识库：${metadata.contentVersion}（国服静态资料 ${catalogManifest.patch}；实战未验证）`,
      `流派：${result.active.build.name}`,
      `已选：${state.selected.map((id) => augments.find((a) => a.id === id)?.name).join('、') || '无'}`,
      `出装：${result.items.join(' → ')}`,
      `加点：${result.active.build.skillMode === 'manual' ? result.active.build.skillNote : `主 ${result.active.build.priority[0]} 副 ${result.active.build.priority[1]}；${result.active.build.skillNote ?? '有 R 点 R'}`}`,
      `1–18 级：${result.skills.join(' / ')}`,
      '',
      result.active.build.plan,
      result.active.build.condition,
      result.active.build.caution,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `HexARAM-${champion.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">
            <Hexagon size={27} />
            <Sparkles size={13} />
          </div>
          <div>
            海克斯工坊<small>HEXARAM ASSISTANT</small>
          </div>
        </div>
        <div className="nav-label">你的随局助手</div>
        <button
          className={`nav ${tab === 'planner' ? 'active' : ''}`}
          onClick={() => setTab('planner')}
        >
          <Swords size={19} />
          对局规划<span>01</span>
        </button>
        <button
          className={`nav ${tab === 'library' ? 'active' : ''}`}
          onClick={() => setTab('library')}
        >
          <BookOpen size={19} />
          玩法知识库<span>02</span>
        </button>
        <div className="sidebar-note">
          <div className="online-dot" />
          本地规则引擎
          <p>
            无需登录 · 无需 AI 密钥
            <br />
            手动输入，随选随推荐
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className="windows-icon">⊞</span>
          <div>
            Windows 桌面版<small>v0.3.0-beta.1 · 自动识别测试版</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            工作台 <ChevronRight size={13} /> {tab === 'planner' ? '对局规划' : '玩法知识库'}
          </div>
          <div className="header-right">
            <span className="status-pill">
              <span className="online-dot" /> 离线可用
            </span>
            <button
              className="icon-button"
              title="知识库说明"
              onClick={() => setTab('library')}
              aria-label="知识库说明"
            >
              <Info size={18} />
            </button>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR NEXT GREAT BUILD</div>
              <h1>{tab === 'planner' ? '每一次选择，都有新思路。' : '一起完善每一种玩法。'}</h1>
              <p>
                {tab === 'planner'
                  ? '从英雄到海克斯，找到属于这局的流派。'
                  : '机制有依据，推荐有理由，版本状态公开。'}
              </p>
            </div>
            <button className="secondary" onClick={exportPlan}>
              <Download size={15} />
              导出本局方案
            </button>
          </div>
          <div className="version-banner">
            <Info size={15} />
            <span>
              国服静态资料 {catalogManifest.patch}：{champions.length} 位英雄 / {augments.length}{' '}
              个可命名强化。客户端文本 {catalogManifest.descriptions}{' '}
              个，其余已补充机制摘要；配置池不等于当局可刷名单，推荐仍待实战验证。
            </span>
            <button onClick={() => setTab('library')}>
              查看说明 <ArrowUpRight size={13} />
            </button>
          </div>
          {tab === 'library' ? (
            <>
              <section className="panel library-intro">
                <div className="section-title">
                  <BookOpen size={19} />
                  <h2>知识库与验证状态</h2>
                  <span className="badge amber">待实战验证</span>
                </div>
                <p>
                  内容版本 {metadata.contentVersion} · 整理日期 {metadata.updatedAt}
                  。官方国服资料与 Data Dragon 已核对到 {catalogManifest.patch}
                  ；推荐来自原创编辑规则，不代表国服统计胜率或逐英雄实测结论。
                </p>
                <div className="library-grid">
                  <div>
                    <h3>英雄与流派</h3>
                    <p>
                      {champions.length} 位英雄 /{' '}
                      {champions.reduce((n, c) => n + c.builds.length, 0)}{' '}
                      套编辑路线；特殊加点英雄单独处理，每位英雄都有独立打法提示。
                    </p>
                  </div>
                  <div>
                    <h3>海克斯机制</h3>
                    <p>
                      {augments.length} 个可命名强化，客户端文本 {catalogManifest.descriptions}{' '}
                      个，其余从官方公告和人工核对补充摘要；已排除 5
                      条系统事件技能记录。动态数值以游戏内为准。
                    </p>
                  </div>
                  <div>
                    <h3>如何贡献</h3>
                    <p>
                      在 content/ 中补充规则，附来源、适用版本和实测记录，通过 GitHub Pull Request
                      参与。
                    </p>
                  </div>
                </div>
                <p className="muted">
                  基础名称来自腾讯官方资料，强化配置与中文机制来自 CommunityDragon
                  16.21。组合线索：Data: arammayhem.com（CC BY
                  4.0），来源未确认比赛补丁与地区，不能当成当前国服强度依据。OP.GG
                  保留站外攻略入口，未批量复制其数据。
                </p>
                <div className="reference-links">
                  <a
                    href="https://op.gg/zh-cn/lol/modes/aram-mayhem"
                    target="_blank"
                    rel="noreferrer"
                  >
                    OP.GG 海克斯专页 ↗
                  </a>
                  <a href="https://arammayhem.com/data/" target="_blank" rel="noreferrer">
                    Data: arammayhem.com · CC BY 4.0 ↗
                  </a>
                  <a
                    href="https://lolalytics.com/lol/tierlist/aram/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LoLalytics 普通乱斗参考 ↗
                  </a>
                </div>
              </section>
              <section className="panel">
                <div className="section-title">
                  <Sparkles size={19} />
                  <h2>强化速查</h2>
                  <span className="count">{augments.length}</span>
                </div>
                <div className="search-box">
                  <Search size={16} />
                  <input
                    aria-label="知识库搜索"
                    placeholder="搜索中文名、英文名或机制…"
                    value={augmentSearch}
                    onChange={(e) => setAugmentSearch(e.target.value)}
                  />
                </div>
                <div className="library-augments">
                  {filteredAugments.map((a) => (
                    <div className="library-entry" key={a.id}>
                      <span
                        className={`tier ${a.tier === '棱彩' ? 'prism' : a.tier === '黄金' ? 'gold' : 'silver'}`}
                      >
                        {a.tier}
                      </span>
                      <div>
                        <strong>{a.name}</strong>
                        <small>{a.english}</small>
                        <p>{a.description}</p>
                        <small>
                          {a.status} ·{' '}
                          {a.descriptionKey?.startsWith('patch:')
                            ? '官方公告机制摘要'
                            : a.descriptionKey?.startsWith('editorial:')
                              ? '人工核对摘要'
                              : '客户端文本摘要，动态数值以游戏内为准'}
                        </small>
                        {a.caution && <p className="warning">{a.caution}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {!filteredAugments.length && <p className="empty">没有找到匹配的强化。</p>}
              </section>
            </>
          ) : (
            <div className="workspace">
              <div className="input-column">
                <RecognitionPanel auto={auto} />
                <section className="panel champion-panel">
                  <div className="section-title">
                    <span className="step">01</span>
                    <h2>选择你的英雄</h2>
                    <span className="count">{champions.length}</span>
                  </div>
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="搜索英雄"
                      placeholder="搜索英雄名 / 称号 / 英文名"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="filters">
                    {['全部', '法师', '射手', '坦克', '辅助', '战士', '刺客'].map((r) => (
                      <button
                        key={r}
                        className={role === r ? 'chosen' : ''}
                        onClick={() => setRole(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="champion-grid">
                    {filtered.map((c) => (
                      <button
                        key={c.id}
                        aria-pressed={c.id === champion.id}
                        className={`champion ${c.id === champion.id ? 'selected' : ''}`}
                        onClick={() => {
                          if (c.id !== champion.id) changeChampion(c.id);
                        }}
                      >
                        <span className={`portrait role-${c.role}`}>{c.initials}</span>
                        <strong>{c.name}</strong>
                        <small>{c.role}</small>
                        {c.id === champion.id && <Check className="champion-check" size={12} />}
                      </button>
                    ))}
                  </div>
                  {!filtered.length && <div className="empty">暂未收录该英雄，试试其他名字。</div>}
                  <div className="champion-summary">
                    <Crosshair size={17} />
                    <span>
                      {champion.title}
                      <small>
                        {champion.difficulty}上手 · {champion.builds.length} 种玩法方向
                      </small>
                    </span>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <span className="step">02</span>
                    <h2>记录本局强化</h2>
                    <span className="count">{state.selected.length} / 8</span>
                  </div>
                  <p className="helper">已选强化用于规划；候选仅用于比较。</p>
                  <div className="selected-list">
                    {state.selected.length ? (
                      state.selected.map((id) => {
                        const a = augments.find((x) => x.id === id)!;
                        return (
                          <div className="selected-augment" key={id}>
                            <Sparkles size={14} />
                            <span>{a.name}</span>
                            <button
                              aria-label={`移除已选${a.name}`}
                              onClick={() => {
                                auto.blockSelected(id);
                                patch({ selected: state.selected.filter((x) => x !== id) });
                              }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty compact">还没选强化？先看看英雄的保底路线。</div>
                    )}
                  </div>
                  <div className="divider" />
                  <div className="search-box">
                    <Search size={16} />
                    <input
                      aria-label="搜索海克斯"
                      placeholder="搜索并加入本轮候选…"
                      value={augmentSearch}
                      onChange={(e) => setAugmentSearch(e.target.value)}
                    />
                  </div>
                  <div className="filters">
                    {['全部', '白银', '黄金', '棱彩'].map((t) => (
                      <button
                        key={t}
                        className={tier === t ? 'chosen' : ''}
                        onClick={() => setTier(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="augment-list">
                    {filteredAugments.map((a) => (
                      <div
                        className={`augment-row ${state.candidates.includes(a.id) ? 'in-candidate' : ''}`}
                        key={a.id}
                      >
                        <span
                          className={`augment-symbol ${a.tier === '棱彩' ? 'prism' : a.tier === '黄金' ? 'gold' : 'silver'}`}
                        >
                          <Hexagon size={19} />
                        </span>
                        <div>
                          <strong>{a.name}</strong>
                          <small>
                            {a.tier} ·{' '}
                            {a.tags
                              .slice(0, 2)
                              .map((t) => tagLabel[t])
                              .join(' / ') || '经济'}
                          </small>
                        </div>
                        <button
                          aria-label={`${state.candidates.includes(a.id) ? '移除候选' : '添加候选'}${a.name}`}
                          disabled={state.selected.includes(a.id)}
                          onClick={() => candidate(a.id)}
                        >
                          {state.selected.includes(a.id) ? (
                            <Check size={15} />
                          ) : state.candidates.includes(a.id) ? (
                            <X size={15} />
                          ) : (
                            <Plus size={15} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  {!filteredAugments.length && (
                    <p className="empty">未找到强化，请核对名称或切换稀有度。</p>
                  )}
                </section>
                <section className="panel preferences">
                  <div className="section-title">
                    <Flag size={17} />
                    <h2>本局偏好</h2>
                  </div>
                  <div className="segmented">
                    {(
                      [
                        ['steady', '稳健成型'],
                        ['ceiling', '追求上限'],
                        ['fun', '娱乐尝试'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        className={state.preference === key ? 'chosen' : ''}
                        onClick={() => patch({ preference: key })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="field">
                    当前等级
                    <select
                      aria-label="当前等级"
                      value={state.level}
                      onChange={(e) => patch({ level: Number(e.target.value) })}
                    >
                      {Array.from({ length: 16 }, (_, i) => (
                        <option key={i} value={i + 3}>
                          {i + 3} 级
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    敌方主要压力
                    <select
                      aria-label="敌方主要压力"
                      value={state.threat}
                      onChange={(e) => patch({ threat: e.target.value as Session['threat'] })}
                    >
                      <option value="balanced">暂不指定</option>
                      <option value="physical">物理伤害</option>
                      <option value="magic">魔法伤害</option>
                      <option value="healing">治疗较强</option>
                    </select>
                  </label>
                  <button className="reset-button" onClick={() => setResetting(true)}>
                    <RotateCcw size={14} />
                    开始新一局
                  </button>
                </section>
              </div>
              <div className="recommend-column">
                <section className="build-hero">
                  <div className="hero-top">
                    <span className="live-label">
                      <span className="online-dot" />
                      本局玩法方案
                    </span>
                    <span className="hero-mode">
                      {state.pinnedBuildId ? '手动锁定' : '自动规划'}
                    </span>
                  </div>
                  <div className="build-title">
                    <div>
                      <p>
                        {champion.name} <span>/ {champion.title}</span>
                      </p>
                      <h2>{result.active.build.name}</h2>
                      <p className="build-subtitle">{result.active.build.subtitle}</p>
                    </div>
                    <div className="hero-emblem">
                      <Hexagon size={94} strokeWidth={0.7} />
                      <Swords size={37} />
                    </div>
                  </div>
                  <div className="build-tags">
                    {result.active.build.tags.map((t) => (
                      <span key={t}>{tagLabel[t]}</span>
                    ))}
                  </div>
                  <div className="build-reason">
                    <Zap size={15} />
                    <span>
                      {result.active.reasons[0] ?? '尚未投入强化，先沿英雄基础路线准备。'}
                    </span>
                  </div>
                </section>
                <section className="panel source-panel">
                  <div className="section-title">
                    <BookOpen size={18} />
                    <h2>本英雄资料与依据</h2>
                    <span className="badge amber">
                      {result.active.build.evidence === 'editorial' ? '编辑路线' : '基础编辑建议'}
                    </span>
                  </div>
                  <p className="helper">
                    国服静态资料 {champion.patch} · 不使用 Worlds
                    职业赛事数据估计海克斯表现。基础方向仍需结合当前强化、阵容和实际操作调整。
                  </p>
                  <div className="reference-links">
                    <a
                      href={`https://op.gg/zh-cn/lol/modes/aram-mayhem/${champion.id === 'MonkeyKing' ? 'wukong' : champion.id.toLowerCase()}/build`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      OP.GG 本英雄海克斯攻略 ↗
                    </a>
                    <a
                      href={`https://lolalytics.com/lol/${champion.id.toLowerCase()}/aram/build/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      普通 ARAM 对照（不同模式）↗
                    </a>
                  </div>
                </section>
                <section className="panel candidate-panel">
                  <div className="section-title">
                    <span className="step">03</span>
                    <h2>这轮怎么选？</h2>
                    <span className="count">{state.candidates.length} / 3</span>
                    {state.candidates.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => {
                          auto.manual('candidates');
                          patch({ candidates: [] });
                        }}
                      >
                        清空候选
                      </button>
                    )}
                  </div>
                  {!result.options.length ? (
                    <div className="candidate-empty">
                      <Sparkles size={27} />
                      <strong>把游戏里的选项加入候选区</strong>
                      <p>比较当前收益、流派配合与转型条件，再记录你的选择。</p>
                    </div>
                  ) : (
                    <div className="candidate-cards">
                      {result.options.map((o, i) => (
                        <article
                          key={o.augment.id}
                          className={`candidate-card ${i === 0 && o.valid ? 'best' : ''}`}
                        >
                          <div className="candidate-head">
                            <span
                              className={`tier ${o.augment.tier === '棱彩' ? 'prism' : o.augment.tier === '黄金' ? 'gold' : 'silver'}`}
                            >
                              {o.augment.tier}
                            </span>
                            <span className="candidate-rank">
                              {!o.valid ? '缺少条件' : i === 0 ? '优先考虑' : '备选思路'}
                            </span>
                            <button
                              className="remove-candidate"
                              aria-label={`移除候选${o.augment.name}`}
                              onClick={() => candidate(o.augment.id)}
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <h3>{o.augment.name}</h3>
                          <p className="augment-description">{o.augment.description}</p>
                          <p className="candidate-reason">{o.reason}</p>
                          {o.augment.caution && <p className="warning">{o.augment.caution}</p>}
                          {o.changes && o.valid && (
                            <small className="transition">
                              {state.pinnedBuildId ? '解锁自动规划后可评估' : '选后倾向'}：
                              {o.nextBuild}
                            </small>
                          )}
                          <button
                            className={i === 0 && o.valid ? 'primary' : 'secondary'}
                            onClick={() => select(o.augment.id)}
                          >
                            {o.valid ? '我选这个' : '仍然记录'}
                            <ChevronRight size={14} />
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                  <p className="footnote">
                    按当前输入进行机制匹配；排序不代表胜率。可自由选择，方案随实际选择更新。
                  </p>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <Package size={18} />
                    <h2>装备路线</h2>
                    <span className="badge teal">随强化更新</span>
                  </div>
                  <div className="next-item">
                    <span>下一件优先考虑</span>
                    <strong>
                      {result.nextItem ??
                        (result.items.length
                          ? '路线已完成，按实际局势调整'
                          : '该英雄装备路线尚未核验')}
                    </strong>
                    <small>
                      {result.nextItemInfo
                        ? `总价 ${result.nextItemInfo.total} 金币 · 静态资料价`
                        : '按路线顺序推荐'}
                    </small>
                  </div>
                  {result.components.length > 0 && (
                    <p className="helper">
                      合成组件：{result.components.join(' + ')}
                      。这里只展示配方，购买顺序仍需结合当前金币；未假定组件已在背包中。
                    </p>
                  )}
                  <div className="item-route">
                    {result.items.map((item, i) => (
                      <button
                        key={item}
                        aria-label={`${state.ownedItems.includes(item) ? '取消拥有' : '标记拥有'}${item}`}
                        aria-pressed={state.ownedItems.includes(item)}
                        className={`item ${state.ownedItems.includes(item) ? 'owned' : ''}`}
                        onClick={() => {
                          if (!state.ownedItems.includes(item) && state.ownedItems.length >= 6)
                            setNotice('已记录 6 件装备，请先移除一件。');
                          else
                            patch({
                              ownedItems: state.ownedItems.includes(item)
                                ? state.ownedItems.filter((x) => x !== item)
                                : [...state.ownedItems, item],
                            });
                        }}
                      >
                        <span className="item-icon">
                          {state.ownedItems.includes(item) ? (
                            <Check size={20} />
                          ) : (
                            <span>{item.slice(0, 1)}</span>
                          )}
                        </span>
                        <small>{i + 1 < 10 ? `0${i + 1}` : i + 1}</small>
                        <strong>{item}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="helper">
                    点击装备标记已拥有。出门装：{result.active.build.starter.join(' + ')}。
                  </p>
                  <div className="owned-input">
                    <select
                      aria-label="添加已有装备"
                      value={itemPicker}
                      onChange={(e) => setItemPicker(e.target.value)}
                    >
                      <option value="">记录路线外的已有装备…</option>
                      {allItems
                        .filter((i) => !state.ownedItems.includes(i))
                        .map((i) => (
                          <option key={i}>{i}</option>
                        ))}
                    </select>
                    <button
                      className="secondary"
                      disabled={!itemPicker}
                      onClick={() => {
                        if (state.ownedItems.length >= 6)
                          setNotice('最多记录 6 件装备，请先移除一件。');
                        else {
                          patch({ ownedItems: [...state.ownedItems, itemPicker] });
                          setItemPicker('');
                        }
                      }}
                    >
                      添加
                    </button>
                  </div>
                  {state.ownedItems.length > 0 && (
                    <div className="owned-list">
                      {state.ownedItems.map((i) => (
                        <button
                          key={i}
                          onClick={() =>
                            patch({ ownedItems: state.ownedItems.filter((x) => x !== i) })
                          }
                        >
                          {i}
                          <X size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                  {result.foreign.length > 0 && (
                    <p className="warning">
                      已有 {result.foreign.join('、')} 不在当前路线。先评估投入成本，无需立即卖出。
                    </p>
                  )}
                  {result.adaptation && (
                    <p className="adaptation">
                      <Shield size={15} />
                      {result.adaptation}
                    </p>
                  )}
                  <details>
                    <summary>查看条件备选装备</summary>
                    {result.active.build.situational.map((s) => (
                      <p key={s.item}>
                        <strong>{s.item}</strong>：{s.reason}
                      </p>
                    ))}
                  </details>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <ArrowUpRight size={18} />
                    <h2>技能加点</h2>
                    <span className="skill-priority">
                      {result.active.build.skillMode === 'manual'
                        ? '特殊机制单独处理'
                        : `主 ${result.active.build.priority[0]} · 副 ${result.active.build.priority[1]} · ${result.active.build.skillMode === 'jayce' ? 'R 自动升级' : '有 R 点 R'}`}
                    </span>
                  </div>
                  <div className="skill-next">
                    <strong>
                      {!result.skills.length
                        ? '查看特殊加点说明'
                        : state.level >= 18
                          ? '已达 18 级'
                          : `升到 ${state.level + 1} 级：点 ${result.skills[state.level]}`}
                    </strong>
                    <span>默认此前按本路线加点；转型后按实际已点技能调整。</span>
                  </div>
                  {result.active.build.skillNote && (
                    <p className="adaptation">{result.active.build.skillNote}</p>
                  )}
                  <div className="skill-grid">
                    {result.skills.map((s, i) => (
                      <div
                        key={i}
                        className={`${s === 'R' ? 'ultimate' : ''} ${i + 1 === state.level + 1 ? 'next' : ''} ${i + 1 <= state.level ? 'past' : ''}`}
                      >
                        <small>{i + 1}</small>
                        <strong>{s}</strong>
                      </div>
                    ))}
                  </div>
                </section>
                {result.communityHints.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <Sparkles size={18} />
                      <h2>社区组合线索</h2>
                      <span className="badge amber">非强度排名</span>
                    </div>
                    <p className="helper">
                      Data: arammayhem.com · CC BY
                      4.0。原始组合未核实当前国服补丁，不计入推荐分数；先核对机制再尝试。
                    </p>
                    <div className="community-hints">
                      {result.communityHints.map((h) => (
                        <a key={h.url} href={h.url} target="_blank" rel="noreferrer">
                          {h.matched.map((a) => a.name).join(' + ')} ↗
                        </a>
                      ))}
                    </div>
                  </section>
                )}
                <section className="panel alternatives">
                  <div className="section-title">
                    <Swords size={18} />
                    <h2>其他玩法与成型条件</h2>
                    {state.pinnedBuildId && (
                      <button
                        className="text-button"
                        onClick={() => patch({ pinnedBuildId: null })}
                      >
                        恢复自动规划
                      </button>
                    )}
                  </div>
                  <p className="helper">
                    可以手动锁定路线；候选排序仍参考可行方向，锁定路线不会自动切换。
                  </p>
                  {result.ranked.map((r) => (
                    <button
                      className={`build-option ${result.active.build.id === r.build.id ? 'active' : ''}`}
                      key={r.build.id}
                      onClick={() => patch({ pinnedBuildId: r.build.id })}
                    >
                      <div>
                        <strong>{r.build.name}</strong>
                        <span>
                          {!r.ready
                            ? '等待关键机制'
                            : result.active.build.id === r.build.id
                              ? '当前路线'
                              : '可尝试'}
                        </span>
                        <p>{r.build.condition}</p>
                      </div>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  <div className="strategy-note">
                    <h3>这局怎么打</h3>
                    <p>{result.active.build.plan}</p>
                    <h3>需要留意</h3>
                    <p>{result.active.build.caution}</p>
                    {!result.active.ready && (
                      <p className="warning">此路线的关键机制尚未满足，建议先保持基础出装。</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}
          <footer>
            HexARAM · 为每一局的新可能而造
            <span>独立社区项目，与 Riot Games / 腾讯无隶属关系。</span>
          </footer>
        </div>
      </main>
      {notice && (
        <div role="status" className="toast">
          <Info size={16} />
          {notice}
        </div>
      )}
      {resetting && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
            <RotateCcw size={25} />
            <h2 id="reset-title">开始新一局？</h2>
            <p>清空本局强化、候选和装备，保留当前英雄与偏好。</p>
            <div>
              <button className="secondary" autoFocus onClick={() => setResetting(false)}>
                继续本局
              </button>
              <button
                className="primary"
                onClick={() => {
                  auto.reset();
                  setState((s) => ({
                    ...freshSession(),
                    championId: s.championId,
                    preference: s.preference,
                  }));
                  setResetting(false);
                  setNotice('已开始新一局。');
                }}
              >
                清空并开始
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
