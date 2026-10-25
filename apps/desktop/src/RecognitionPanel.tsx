import { useState } from 'react';
import { ScanEye, Settings2, RefreshCw, Pause, Play, X, FolderOpen } from 'lucide-react';
import type { RecognitionController, Rect, Settings } from './recognition';
import { augments, champions } from '../../../packages/engine';
export default function RecognitionPanel({ auto }: { auto: RecognitionController }) {
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [preview, setPreview] = useState<{ dataUrl: string; name: string } | null>(null);
  const [region, setRegion] = useState('candidate0');
  const [draft, setDraft] = useState<Settings | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draw, setDraw] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const settings = auto.settings;
  async function list() {
    const result = await auto.bridge?.listSources();
    if (result?.error) auto.notify(result.error);
    else if (result) setSources(result);
  }
  async function calibrate() {
    if (!auto.bridge || !settings) return;
    setBusy(true);
    try {
      const result = await auto.bridge.preview();
      if (result.error) {
        auto.notify(result.error);
        return;
      }
      setPreview(result);
      setDraft(structuredClone(settings));
    } catch {
      auto.notify('无法获取游戏窗口预览。');
    } finally {
      setBusy(false);
    }
  }
  function updateRect(r: Rect | null) {
    if (!draft) return;
    const next = structuredClone(draft);
    if (region.startsWith('candidate')) {
      if (r) next.candidates[Number(region.at(-1))] = r;
    } else next[region as 'championText' | 'selectedText' | 'selectedIcons'] = r;
    setDraft(next);
  }
  function point(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  }
  const regions = draft
    ? [
        ...draft.candidates.map((rect, i) => ({
          key: `candidate${i}`,
          rect,
          label: `候选 ${i + 1}`,
        })),
        { key: 'championText', rect: draft.championText, label: '英雄名称' },
        { key: 'selectedText', rect: draft.selectedText, label: '已选文字' },
        { key: 'selectedIcons', rect: draft.selectedIcons, label: '已选图标' },
      ]
    : [];
  return (
    <section className="panel recognition-panel">
      <div className="section-title">
        <ScanEye size={18} />
        <h2>自动识别</h2>
        <span className={`badge ${settings?.enabled ? 'teal' : 'amber'}`}>
          {auto.available ? (settings?.enabled ? '运行中' : '已暂停') : '桌面版可用'}
        </span>
      </div>
      {!auto.available ? (
        <p className="helper">请在 Windows 桌面程序中使用。本页浏览器预览保留手动功能。</p>
      ) : (
        <>
          <p className="helper">
            读取本机接口与游戏窗口，不移动鼠标或自动选择。错误识别可以在下方手动修改。
          </p>
          <div className="recognition-buttons">
            <button
              className="primary"
              disabled={!settings}
              onClick={() => auto.configure({ enabled: !settings?.enabled })}
            >
              {settings?.enabled ? <Pause size={14} /> : <Play size={14} />}{' '}
              {settings?.enabled ? '暂停自动读取' : '开启自动读取'}
            </button>
            <button
              className="secondary"
              disabled={!settings?.enabled || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await auto.bridge?.scan();
                  if (r?.error) auto.notify(r.error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <RefreshCw size={13} />
              {busy ? '识别中…' : '立即扫描'}
            </button>
          </div>
          <p className="recognition-status" aria-live="polite">
            {auto.packet?.message ?? '等待开启自动读取。'}
          </p>
          <p className="helper">
            阶段：{auto.packet?.phase ?? '未连接'} · 模式：
            {auto.packet?.queueId === 2400
              ? '海克斯大乱斗'
              : auto.packet?.queueId != null
                ? '其他模式'
                : settings?.allowUnverifiedMode
                  ? '由你确认'
                  : '待确认'}
          </p>
          {auto.ocr && (
            <p className="helper">
              最近窗口扫描：
              {new Date(auto.ocr.capturedAt).toLocaleTimeString('zh-CN', { hour12: false })}
              。连续两次稳定读数才写入。
            </p>
          )}
          <div className="recognition-locks">
            {(['hero', 'candidates', 'inventory', 'level'] as const).map(
              (field, i) =>
                auto.locks[
                  (['heroLocked', 'candidatesLocked', 'inventoryLocked', 'levelLocked'] as const)[i]
                ] && (
                  <button key={field} onClick={() => auto.release(field)}>
                    {['英雄', '候选', '装备', '等级'][i]}手动锁定 · 解除
                  </button>
                ),
            )}
            {auto.locks.selectedBlocked.map((id) => (
              <button key={id} onClick={() => auto.release('selected', id)}>
                不再添加 {augments.find((a) => a.id === id)?.name ?? id} · 取消
              </button>
            ))}
          </div>
          {auto.suggestions.length > 0 && (
            <details>
              <summary>最近识别建议</summary>
              {auto.suggestions.slice(0, 10).map((s, i) => (
                <p key={i}>
                  {s.field === 'hero'
                    ? champions.find((c) => c.id === s.id)?.name
                    : augments.find((a) => a.id === s.id)?.name}{' '}
                  · {Math.round(s.score * 100)}% 文字/图像匹配 ·{' '}
                  {s.accepted ? '等待稳定或已读取' : '需手动确认'}
                </p>
              ))}
            </details>
          )}
          <details>
            <summary>
              <Settings2 size={12} /> 连接与区域设置
            </summary>
            <div className="recognition-options">
              <button className="secondary" onClick={auto.directory}>
                <FolderOpen size={13} />
                选择客户端安装目录
              </button>
              <p className="helper">
                {settings?.directory
                  ? '已指定安装目录；连接凭据不展示也不写入日志。'
                  : '优先自动发现客户端；国服连接不可用时可以选择包含 lockfile 的安装目录。'}
              </p>
              <button className="secondary" onClick={list}>
                刷新游戏窗口
              </button>
              <select
                aria-label="识别窗口"
                value={settings?.sourceId ?? ''}
                onChange={(e) => auto.configure({ sourceId: e.target.value })}
              >
                <option value="">自动选择游戏窗口</option>
                {sources.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label>
                接口无法判断阶段时
                <select
                  aria-label="识别阶段"
                  value={settings?.scene ?? 'auto'}
                  onChange={(e) => auto.configure({ scene: e.target.value as Settings['scene'] })}
                >
                  <option value="auto">自动判断</option>
                  <option value="select">当前是选人阶段</option>
                  <option value="game">当前在游戏内</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={settings?.allowUnverifiedMode ?? false}
                  onChange={(e) => auto.configure({ allowUnverifiedMode: e.target.checked })}
                />
                接口无法确认时，我确认本局为海克斯大乱斗
              </label>
              <label>
                窗口扫描间隔
                <select
                  aria-label="扫描间隔"
                  value={settings?.interval ?? 4000}
                  onChange={(e) => auto.configure({ interval: Number(e.target.value) })}
                >
                  <option value={3000}>3 秒</option>
                  <option value={4000}>4 秒</option>
                  <option value={6000}>6 秒</option>
                  <option value={10000}>10 秒</option>
                </select>
              </label>
              <button className="secondary" disabled={busy || !settings} onClick={calibrate}>
                <ScanEye size={13} />
                预览与校准识别区域
              </button>
              <p className="helper">
                候选默认区域可调整。已选强化的图标行或文字区需要校准一次；只读取你划定的区域。最小化、独占全屏或窗口被遮挡时可能读不到。
              </p>
            </div>
          </details>
        </>
      )}
      {preview && draft && (
        <div className="modal-backdrop">
          <section
            className="calibration-modal"
            role="dialog"
            aria-modal="true"
            aria-label="识别区域校准"
          >
            <div className="section-title">
              <h2>拖拽框选：{regions.find((r) => r.key === region)?.label}</h2>
              <button
                className="icon-button"
                aria-label="关闭区域校准"
                onClick={() => setPreview(null)}
              >
                <X size={19} />
              </button>
            </div>
            <p className="helper">
              候选只框名称。已选图标行从第一个图标左沿到最后一个槽位右沿，勿包含候选区域。画面仅在本机显示。
            </p>
            <div className="calibration-toolbar">
              <select
                aria-label="校准区域类型"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {regions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
              <label>
                图标槽位
                <select
                  aria-label="已选图标槽位"
                  value={draft.slots}
                  onChange={(e) => setDraft({ ...draft, slots: Number(e.target.value) })}
                >
                  {[4, 5, 6, 8].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              {!region.startsWith('candidate') && (
                <button className="secondary" onClick={() => updateRect(null)}>
                  停用此区域
                </button>
              )}
            </div>
            <div className="calibration-scroll">
              <div className="calibration-image">
                <img src={preview.dataUrl} alt="本机游戏窗口预览" draggable={false} />
                <div
                  className="region-draw"
                  onPointerDown={(event) => {
                    const p = point(event);
                    setStart(p);
                    setDraw(null);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!start) return;
                    const p = point(event);
                    setDraw({
                      x: Math.min(start.x, p.x),
                      y: Math.min(start.y, p.y),
                      w: Math.abs(p.x - start.x),
                      h: Math.abs(p.y - start.y),
                    });
                  }}
                  onPointerUp={() => {
                    if (draw && draw.w >= 0.015 && draw.h >= 0.015) updateRect(draw);
                    setStart(null);
                    setDraw(null);
                  }}
                >
                  {regions.map(
                    (r) =>
                      r.rect && (
                        <div
                          key={r.key}
                          className={`calibration-rect ${r.key === region ? 'active' : ''}`}
                          style={{
                            left: `${r.rect.x * 100}%`,
                            top: `${r.rect.y * 100}%`,
                            width: `${r.rect.w * 100}%`,
                            height: `${r.rect.h * 100}%`,
                          }}
                        >
                          <span>{r.label}</span>
                        </div>
                      ),
                  )}
                  {draw && (
                    <div
                      className="calibration-rect active"
                      style={{
                        left: `${draw.x * 100}%`,
                        top: `${draw.y * 100}%`,
                        width: `${draw.w * 100}%`,
                        height: `${draw.h * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="calibration-actions">
              <button className="secondary" onClick={calibrate}>
                刷新预览
              </button>
              <button
                className="primary"
                onClick={async () => {
                  await auto.configure({
                    candidates: draft.candidates,
                    championText: draft.championText,
                    selectedText: draft.selectedText,
                    selectedIcons: draft.selectedIcons,
                    slots: draft.slots,
                  });
                  setPreview(null);
                  auto.notify('区域已保存；与候选重叠的已选区域会被停用，请核对设置。');
                }}
              >
                保存校准
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
