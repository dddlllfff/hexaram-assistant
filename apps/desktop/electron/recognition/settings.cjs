const rect = (x, y, w, h) => ({ x, y, w, h });
const defaults = {
  enabled: false,
  directory: '',
  sourceId: '',
  allowUnverifiedMode: false,
  scene: 'auto',
  interval: 4000,
  slots: 4,
  candidates: [
    rect(0.14, 0.28, 0.22, 0.12),
    rect(0.39, 0.28, 0.22, 0.12),
    rect(0.64, 0.28, 0.22, 0.12),
  ],
  championText: null,
  selectedText: null,
  selectedIcons: null,
};
function validRect(r) {
  return (
    !!r &&
    ['x', 'y', 'w', 'h'].every((k) => Number.isFinite(r[k])) &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.w >= 0.015 &&
    r.h >= 0.015 &&
    r.x + r.w <= 1 + Number.EPSILON &&
    r.y + r.h <= 1 + Number.EPSILON
  );
}
function overlap(a, b) {
  return (
    a &&
    b &&
    Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) &&
    Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y)
  );
}
function sanitizeConfig(input = {}) {
  const s = { ...defaults, ...input };
  s.enabled = input.enabled === true;
  s.allowUnverifiedMode = input.allowUnverifiedMode === true;
  s.scene = ['auto', 'select', 'game'].includes(input.scene) ? input.scene : 'auto';
  s.sourceId = typeof input.sourceId === 'string' ? input.sourceId.slice(0, 100) : '';
  s.directory = typeof input.directory === 'string' ? input.directory.slice(0, 512) : '';
  s.interval = Math.max(3000, Math.min(15000, Number(input.interval) || 4000));
  s.slots = [4, 5, 6, 8].includes(input.slots) ? input.slots : 4;
  s.candidates =
    Array.isArray(input.candidates) &&
    input.candidates.length === 3 &&
    input.candidates.every(validRect)
      ? input.candidates
      : defaults.candidates;
  s.selectedText = validRect(input.selectedText) ? input.selectedText : null;
  s.championText = validRect(input.championText) ? input.championText : null;
  s.selectedIcons = validRect(input.selectedIcons) ? input.selectedIcons : null;
  for (const key of ['selectedText', 'selectedIcons'])
    if (s.candidates.some((r) => overlap(r, s[key]))) s[key] = null;
  return s;
}
module.exports = { defaults, sanitizeConfig, validRect, overlap };
