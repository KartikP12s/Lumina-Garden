import assert from 'node:assert/strict';
import test from 'node:test';
import { windOffset, environmentAt } from '../src/environment.ts';
import { canFinish } from '../src/session.ts';

test('wind stays rooted, is deterministic, and shares an analytic height field', () => {
  assert.ok(windOffset(0, 3, 1, 0.2).every(n => n === 0));
  assert.ok(windOffset(2, 3, 0, 0.2).every(n => n === 0));
  assert.deepEqual(windOffset(2, 3, 0.5, 0.2), windOffset(2, 3, 0.5, 0.2));
  const a = windOffset(1, 3, 1, 0.2), b = windOffset(2, 3, 1, 0.2);
  assert.deepEqual(b, a.map(n => n * 4));
  for (let t = 0; t < 200; t++) {
    const offset = windOffset(2.9, t / 10, 1, t / 20);
    assert.ok(offset.every(Number.isFinite));
    assert.ok(Math.abs(offset[0]) <= 0.07 * 1.25 * 2.9 ** 2);
    assert.ok(Math.abs(offset[1]) <= 0.04 * 2.9 ** 2);
  }
});

test('environment is clamped and transitions monotonically from night to day', () => {
  assert.deepEqual(environmentAt(-1), environmentAt(0));
  assert.deepEqual(environmentAt(2), environmentAt(1));
  assert.ok(environmentAt(1).sun > environmentAt(0).sun);
  assert.ok(environmentAt(1).hemisphere > environmentAt(0).hemisphere);
});

test('empty and partly grown gardens cannot be finished', () => {
  assert.equal(canFinish([]), false);
  assert.equal(canFinish([0.99]), false);
  assert.equal(canFinish([1, 0.5]), false);
  assert.equal(canFinish([1]), true);
  assert.equal(canFinish([1, 1, 1, 1, 1]), true);
});
