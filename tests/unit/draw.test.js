import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draw } from '../../functions/_draw.js';

const ids = (n) => Array.from({ length: n }, (_, i) => 'p' + i);
function check(m, people, excl = []) {
  assert.ok(m, 'expected a draw');
  const giftees = Object.values(m);
  assert.equal(Object.keys(m).length, people.length);
  assert.equal(new Set(giftees).size, people.length, 'each person gets exactly one santa');
  for (const p of people) { assert.ok(m[p]); assert.notEqual(m[p], p, 'never yourself'); }
  for (const [a, b] of excl) { assert.notEqual(m[a], b); assert.notEqual(m[b], a); }
}

test('valid derangement for sizes 2..60, many times', () => {
  for (let n = 2; n <= 60; n++) for (let k = 0; k < 30; k++) check(draw(ids(n)), ids(n));
});

test('respects couple exclusions', () => {
  const p = ids(8); const ex = [['p0', 'p1'], ['p2', 'p3'], ['p4', 'p5'], ['p6', 'p7']];
  for (let k = 0; k < 500; k++) check(draw(p, ex), p, ex);
});

test('dense exclusions fall back to matching and still succeed', () => {
  // p0 may only give to p1, p1 only to p2, p2 only to p0 among a 4-person set with heavy bans
  const p = ids(4);
  const ex = [['p0', 'p2'], ['p0', 'p3'], ['p1', 'p3']];
  for (let k = 0; k < 200; k++) check(draw(p, ex), p, ex);
});

test('impossible rules return null', () => {
  assert.equal(draw(ids(3), [['p0', 'p1'], ['p0', 'p2']]), null);
});

test('every giftee is reachable (distribution sanity)', () => {
  const p = ids(5); const seen = new Set();
  for (let k = 0; k < 400; k++) seen.add(draw(p).p0);
  assert.deepEqual([...seen].sort(), ['p1', 'p2', 'p3', 'p4']);
});
