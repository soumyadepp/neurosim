export function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = a.length;
  let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    num += da * db; va += da * da; vb += db * db;
  }
  return va > 0 && vb > 0 ? num / Math.sqrt(va * vb) : 0;
}

/**
 * Node-by-node Pearson correlation of a row-major samples-by-nodes series.
 */
export function correlationMatrix(series: Float64Array, samples: number, nodes: number): Float64Array {
  const mean = new Float64Array(nodes), sd = new Float64Array(nodes);
  for (let t = 0; t < samples; t++) for (let i = 0; i < nodes; i++) mean[i] += series[t * nodes + i];
  for (let i = 0; i < nodes; i++) mean[i] /= samples;
  const z = new Float64Array(samples * nodes);
  for (let t = 0; t < samples; t++) {
    for (let i = 0; i < nodes; i++) {
      const d = series[t * nodes + i] - mean[i];
      z[t * nodes + i] = d;
      sd[i] += d * d;
    }
  }
  for (let i = 0; i < nodes; i++) sd[i] = Math.sqrt(sd[i]);
  const out = new Float64Array(nodes * nodes);
  for (let i = 0; i < nodes; i++) {
    out[i * nodes + i] = 1;
    for (let j = i + 1; j < nodes; j++) {
      let s = 0;
      for (let t = 0; t < samples; t++) s += z[t * nodes + i] * z[t * nodes + j];
      const r = sd[i] > 0 && sd[j] > 0 ? s / (sd[i] * sd[j]) : 0;
      out[i * nodes + j] = r;
      out[j * nodes + i] = r;
    }
  }
  return out;
}

export function upperTriangle(m: ArrayLike<number>, n: number): Float64Array {
  const out = new Float64Array((n * (n - 1)) / 2);
  let k = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out[k++] = m[i * n + j];
  return out;
}

export function upperTriangleR(a: ArrayLike<number>, b: ArrayLike<number>, n: number): number {
  return pearson(upperTriangle(a, n), upperTriangle(b, n));
}

export function meanUpperTriangle(m: ArrayLike<number>, n: number): number {
  const u = upperTriangle(m, n);
  let s = 0;
  for (const v of u) s += v;
  return u.length ? s / u.length : 0;
}

function ranks(values: ArrayLike<number>): number[] {
  const order = Array.from(values, (v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let k = 0; k < order.length; ) {
    let end = k;
    while (end + 1 < order.length && order[end + 1][0] === order[k][0]) end++;
    const rank = (k + end) / 2;
    for (let m = k; m <= end; m++) out[order[m][1]] = rank;
    k = end + 1;
  }
  return out;
}

/**
 * Spearman rank correlation, with tied values sharing their average rank.
 */
export function spearman(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return pearson(ranks(a), ranks(b));
}
