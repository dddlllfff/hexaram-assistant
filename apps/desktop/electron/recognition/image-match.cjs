function feature(bitmap) {
  const values = [];
  let sum = 0,
    square = 0;
  for (let i = 0; i < bitmap.length; i += 4) {
    const gray = (bitmap[i] * 0.114 + bitmap[i + 1] * 0.587 + bitmap[i + 2] * 0.299) / 255;
    values.push(gray);
    sum += gray;
    square += gray * gray;
  }
  const mean = sum / values.length;
  const variance = square / values.length - mean * mean;
  const norm = Math.sqrt(values.reduce((s, x) => s + (x - mean) ** 2, 0));
  return { vector: values.map((x) => (x - mean) / (norm || 1)), variance };
}
function similarity(a, b) {
  if (a.variance < 0.0008 || b.variance < 0.0008 || a.vector.length !== b.vector.length) return 0;
  return Math.max(
    0,
    a.vector.reduce((s, x, i) => s + x * b.vector[i], 0),
  );
}
function rankIcon(featureValue, templates) {
  const rows = templates
    .map((t) => ({ gameId: t.gameId, score: similarity(featureValue, t.feature) }))
    .sort((a, b) => b.score - a.score);
  const best = rows[0];
  if (!best) return null;
  const margin = best.score - (rows[1]?.score ?? 0);
  return { ...best, margin, accepted: best.score >= 0.88 && margin >= 0.055 };
}
module.exports = { feature, similarity, rankIcon };
