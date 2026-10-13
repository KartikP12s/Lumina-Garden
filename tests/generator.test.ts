import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePlant, growthAt, growthStage, hashSeed, MAX_PLANTS, GARDEN_POSITIONS } from '../src/generator.ts';

test('a seed reproduces the entire geometry; different seeds produce variation', () => {
  assert.deepEqual(generatePlant(hashSeed('2026')), generatePlant(hashSeed('2026')));
  assert.notDeepEqual(generatePlant(hashSeed('2026')), generatePlant(hashSeed('2027')));
});

test('many seeds produce finite geometry within the declared bounds', () => {
  for (let seed = 0; seed < 300; seed++) {
    const p = generatePlant(seed);
    assert.ok(p.height >= 1.85 && p.height <= 2.90);
    assert.ok(p.branchCount >= 5 && p.branchCount <= 8);
    assert.ok(p.hue >= 0.35 && p.hue <= 0.78);
    assert.equal(p.stems.length, 14 + p.branchCount * 5);
    assert.ok(p.leaves.length >= p.branchCount * 3 && p.leaves.length <= p.branchCount * 5);
    for (const s of p.stems) {
      assert.ok([...s.from, ...s.to, s.radius, s.start, s.end].every(Number.isFinite));
      assert.ok(s.radius > 0 && s.end > s.start && s.start >= 0 && s.end <= 1);
      assert.ok(Math.hypot(...s.to.map((n, i) => n - s.from[i])) > 0);
    }
    for (const o of [...p.leaves, ...p.petals]) {
      assert.ok([...o.position, ...o.direction, o.length, o.width].every(Number.isFinite));
      assert.ok(o.length > 0 && o.width > 0);
      assert.ok(o.start > 0.62 && o.end <= 1 && o.end > o.start);
    }
  }
});

test('growth stays clamped, monotonic, and follows the specified stage order', () => {
  assert.equal(growthAt(-1, 0.2, 0.4), 0);
  assert.equal(growthAt(2, 0.2, 0.4), 1);
  let previous = 0;
  for (let t = 0; t <= 100; t++) {
    const value = growthAt(t / 100, 0.2, 0.4);
    assert.ok(value >= previous); previous = value;
  }
  assert.deepEqual([0, 0.2, 0.4, 0.7, 0.9, 1].map(growthStage), ['Sprout', 'Stem', 'Branches', 'Leaves', 'Bloom', 'Mature']);
});

test('benchmark layouts respect the five-plant cap and avoid seed overlap', () => {
  assert.equal(MAX_PLANTS, 5); assert.equal(GARDEN_POSITIONS.length, 5);
  GARDEN_POSITIONS.forEach((a, i) => {
    assert.ok(Math.hypot(a[0], a[2]) <= 4.4);
    GARDEN_POSITIONS.slice(i + 1).forEach(b => assert.ok(Math.hypot(a[0] - b[0], a[2] - b[2]) >= 1.2));
  });
});
