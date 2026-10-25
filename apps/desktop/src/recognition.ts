import { useEffect, useRef, useState } from 'react';
import { freshControl, reconcile } from '../../../packages/recognition';
import type { Control, Observation } from '../../../packages/recognition';
import type { Session } from '../../../packages/engine/types';
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Settings {
  enabled: boolean;
  directory: string;
  sourceId: string;
  allowUnverifiedMode: boolean;
  scene: 'auto' | 'select' | 'game';
  interval: number;
  slots: number;
  candidates: Rect[];
  championText: Rect | null;
  selectedText: Rect | null;
  selectedIcons: Rect | null;
}
type Result<T> = T & { error?: string };
export interface Bridge {
  getSettings(): Promise<Result<Settings>>;
  configure(config: Partial<Settings>): Promise<Result<Settings>>;
  chooseDirectory(): Promise<Result<Settings>>;
  listSources(): Promise<Result<{ id: string; name: string }[]>>;
  preview(): Promise<
    Result<{ dataUrl: string; name: string; id: string; width: number; height: number }>
  >;
  scan(): Promise<Result<{ ok: boolean }>>;
  onObservation(callback: (packet: Observation) => void): () => void;
}
declare global {
  interface Window {
    hexaramRecognition?: Bridge;
  }
}
const KEY = 'hexaram.recognition.control.v1';
function loadControl(): Control {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return {
      ...freshControl(),
      heroLocked: raw?.heroLocked === true,
      candidatesLocked: raw?.candidatesLocked === true,
      inventoryLocked: raw?.inventoryLocked === true,
      levelLocked: raw?.levelLocked === true,
      selectedBlocked: Array.isArray(raw?.selectedBlocked)
        ? raw.selectedBlocked.filter((s: unknown) => typeof s === 'string').slice(0, 20)
        : [],
      matchId: typeof raw?.matchId === 'string' ? raw.matchId : undefined,
      matchStartedAt: Number.isFinite(raw?.matchStartedAt) ? raw.matchStartedAt : undefined,
    };
  } catch {
    return freshControl();
  }
}
export function useRecognition(
  state: Session,
  setState: (state: Session) => void,
  notify: (message: string) => void,
) {
  const current = useRef(state);
  current.current = state;
  const control = useRef<Control>(loadControl());
  const [settings, setSettings] = useState<Settings | null>(null);
  const [locks, setLocks] = useState(control.current);
  const [packet, setPacket] = useState<Observation | null>(null);
  const [ocr, setOcr] = useState<Observation | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof reconcile>['suggestions']>([]);
  const bridge = window.hexaramRecognition;
  function save() {
    setLocks({ ...control.current });
    try {
      const { stable, seen, enabled, ...persisted } = control.current;
      localStorage.setItem(KEY, JSON.stringify(persisted));
    } catch {}
  }
  useEffect(() => {
    if (!bridge) return;
    let alive = true;
    bridge
      .getSettings()
      .then((s) => {
        if (alive && !s.error) {
          setSettings(s);
          control.current.enabled = s.enabled;
          save();
        }
      })
      .catch(() => notify('自动读取连接失败，手动功能仍可用。'));
    const off = bridge.onObservation((event) => {
      if (!alive) return;
      setPacket(event);
      if (event.candidatesText || event.championText || event.selectedText || event.selectedIcons)
        setOcr(event);
      const result = reconcile(current.current, control.current, event);
      control.current = result.control;
      if (result.suggestions.length) setSuggestions(result.suggestions);
      if (result.applied.length) {
        current.current = result.session;
        setState(result.session);
        notify('自动更新：' + result.applied.join('、'));
        save();
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  async function configure(value: Partial<Settings>) {
    if (!bridge) return;
    const result = await bridge.configure(value);
    if (result.error) {
      notify(result.error);
      return;
    }
    setSettings(result);
    control.current.enabled = result.enabled;
    save();
  }
  function manual(field: 'hero' | 'candidates' | 'inventory' | 'level') {
    control.current = {
      ...control.current,
      [field === 'hero'
        ? 'heroLocked'
        : field === 'inventory'
          ? 'inventoryLocked'
          : field === 'level'
            ? 'levelLocked'
            : 'candidatesLocked']: true,
    };
    save();
  }
  function blockSelected(id: string) {
    control.current.selectedBlocked = [...new Set([...control.current.selectedBlocked, id])];
    save();
  }
  function release(field: 'hero' | 'candidates' | 'inventory' | 'level' | 'selected', id?: string) {
    if (field === 'selected')
      control.current.selectedBlocked = id
        ? control.current.selectedBlocked.filter((s) => s !== id)
        : [];
    else
      control.current = {
        ...control.current,
        [field === 'hero'
          ? 'heroLocked'
          : field === 'inventory'
            ? 'inventoryLocked'
            : field === 'level'
              ? 'levelLocked'
              : 'candidatesLocked']: false,
      };
    control.current.stable = {};
    save();
  }
  function reset() {
    control.current = {
      ...freshControl(),
      enabled: settings?.enabled ?? false,
      matchId: control.current.matchId,
    };
    save();
    void configure({ allowUnverifiedMode: false });
  }
  async function directory() {
    if (!bridge) return;
    const result = await bridge.chooseDirectory();
    if (result.error) notify(result.error);
    else setSettings(result);
  }
  return {
    available: !!bridge,
    settings,
    locks,
    packet,
    ocr,
    suggestions,
    configure,
    manual,
    blockSelected,
    release,
    reset,
    directory,
    bridge,
    notify,
  };
}
export type RecognitionController = ReturnType<typeof useRecognition>;
