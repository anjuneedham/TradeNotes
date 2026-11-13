/**
 * Display-only thinning of a long equity series so the page ships ~hundreds of points, not 10,000+. Keeps the first and last
 * point and, per bucket, the lowest and highest point (so peaks, troughs and drawdowns stay visible). `n` is the 1-based position
 * in the full series. All statistics are computed from the full series, never from this.
 */
export function downsampleCurve<T extends { cumulative: number }>(points: readonly T[], max = 400): (T & { n: number })[] {
  const len = points.length;
  if (len <= max) return points.map((p, i) => ({ ...p, n: i + 1 }));
  const keep = new Set<number>([0, len - 1]);
  const buckets = Math.max(1, Math.floor((max - 2) / 2));
  const size = Math.ceil(len / buckets);
  for (let start = 0; start < len; start += size) {
    let lo = start, hi = start;
    for (let i = start; i < Math.min(len, start + size); i++) {
      if (points[i].cumulative < points[lo].cumulative) lo = i;
      if (points[i].cumulative > points[hi].cumulative) hi = i;
    }
    keep.add(lo); keep.add(hi);
  }
  return [...keep].sort((a, b) => a - b).map((i) => ({ ...points[i], n: i + 1 }));
}
