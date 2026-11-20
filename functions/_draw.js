// Draw logic: assign each participant exactly one giftee, never themselves,
// never an excluded partner. Prefers one big cycle (no A<->B swaps); falls back
// to any valid assignment via randomized bipartite matching.

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cryptoRandom() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 4294967296;
}

// ids: array of member ids; excluded: Set of "a|b" strings (both directions added by caller or here)
export function draw(ids, exclusionPairs = [], rnd = cryptoRandom) {
  const n = ids.length;
  if (n < 2) return null;
  const banned = new Set();
  for (const [a, b] of exclusionPairs) { banned.add(a + '|' + b); banned.add(b + '|' + a); }
  const ok = (s, g) => s !== g && !banned.has(s + '|' + g);

  // 1) single cycle
  for (let attempt = 0; attempt < 400; attempt++) {
    const order = shuffle(ids, rnd);
    let good = true;
    for (let i = 0; i < n; i++) if (!ok(order[i], order[(i + 1) % n])) { good = false; break; }
    if (good) {
      const m = {};
      for (let i = 0; i < n; i++) m[order[i]] = order[(i + 1) % n];
      return m;
    }
  }
  // 2) any derangement respecting exclusions (Kuhn's algorithm, random order)
  const santas = shuffle(ids, rnd);
  const owner = {}; // giftee -> santa
  const tryAssign = (s, seen) => {
    for (const g of shuffle(ids, rnd)) {
      if (!ok(s, g) || seen.has(g)) continue;
      seen.add(g);
      if (owner[g] === undefined || tryAssign(owner[g], seen)) { owner[g] = s; return true; }
    }
    return false;
  };
  for (const s of santas) if (!tryAssign(s, new Set())) return null;
  const m = {};
  for (const g of Object.keys(owner)) m[owner[g]] = g;
  return m;
}
