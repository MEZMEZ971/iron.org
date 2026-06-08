function trunc6(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(6));
}

function mapTrunc6(obj, keys) {
  const out = { ...obj };
  for (const key of keys) {
    if (out[key] !== undefined && out[key] !== null) {
      out[key] = trunc6(out[key]);
    }
  }
  return out;
}

module.exports = { trunc6, mapTrunc6 };
