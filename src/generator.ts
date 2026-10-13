/** Pure seeded rules. No renderer, Math.random(), or wall-clock dependency. */
export type Vec3 = readonly [number, number, number];
export interface Segment { from: Vec3; to: Vec3; radius: number; start: number; end: number }
export interface Organ { position: Vec3; direction: Vec3; length: number; width: number; start: number; end: number }
export interface PlantBlueprint {
  seed: number; height: number; hue: number; branchCount: number;
  stems: Segment[]; leaves: Organ[]; petals: Organ[]; flower: Vec3;
}
export const MAX_PLANTS = 5;
export const GROWTH_SECONDS = 9;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(value: string): number {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function growthAt(progress: number, start: number, end: number): number {
  const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function growthStage(progress: number): string {
  if (progress < 0.12) return 'Sprout';
  if (progress < 0.38) return 'Stem';
  if (progress < 0.62) return 'Branches';
  if (progress < 0.88) return 'Leaves';
  if (progress < 1) return 'Bloom';
  return 'Mature';
}

export function generatePlant(seed: number): PlantBlueprint {
  const random = seededRandom(seed);
  const height = 1.85 + random() * 1.05;
  const hue = 0.35 + random() * 0.43;
  const branchCount = 5 + Math.floor(random() * 4);
  const lean = (random() - 0.5) * 0.32;
  const phase = random() * Math.PI * 2;
  const stems: Segment[] = [], leaves: Organ[] = [], petals: Organ[] = [];
  const trunkAt = (t: number): Vec3 => [lean * t + Math.sin(t * 3 + phase) * 0.05 * t, height * t, Math.cos(t * 2 + phase) * 0.075 * t];
  // Segments extend from their bases in order, instead of scaling the whole plant.
  const trunkSteps = 14;
  for (let i = 0; i < trunkSteps; i++) {
    const t = i / trunkSteps;
    stems.push({ from: trunkAt(t), to: trunkAt((i + 1) / trunkSteps), radius: 0.047 * (1 - t * 0.66), start: t * 0.30, end: (i + 1) / trunkSteps * 0.30 + 0.06 });
  }
  for (let b = 0; b < branchCount; b++) {
    const t = 0.24 + b / (branchCount - 1) * 0.53;
    const origin = trunkAt(t);
    const angle = phase + b * 2.399963 + (random() - 0.5) * 0.35;
    const length = (0.65 + random() * 0.27) * (1.2 - t * 0.55);
    const rise = 0.3 + random() * 0.22;
    const at = (u: number): Vec3 => [origin[0] + Math.cos(angle) * length * u, origin[1] + rise * u + 0.12 * u * u, origin[2] + Math.sin(angle) * length * u];
    const start = 0.33 + t * 0.13;
    for (let j = 0; j < 5; j++) {
      stems.push({ from: at(j / 5), to: at((j + 1) / 5), radius: 0.026 * (1 - j / 5 * 0.65), start: start + j * 0.028, end: start + (j + 1) * 0.028 + 0.018 });
    }
    const leafCount = 3 + Math.floor(random() * 3);
    for (let l = 0; l < leafCount; l++) {
      const u = 0.35 + l / (leafCount - 1) * 0.65;
      const side = l % 2 === 0 ? 1 : -1;
      const a = angle + side * (0.55 + random() * 0.38);
      leaves.push({ position: at(u), direction: [Math.cos(a), 0.5 + random() * 0.5, Math.sin(a)], length: 0.32 + random() * 0.19, width: 0.10 + random() * 0.065, start: 0.63 + t * 0.10 + u * 0.035, end: 0.84 + u * 0.03 });
    }
  }
  const flower = trunkAt(1);
  const petalCount = 7 + Math.floor(random() * 3);
  for (let p = 0; p < petalCount; p++) {
    const a = phase + p / petalCount * Math.PI * 2;
    petals.push({ position: flower, direction: [Math.cos(a), 0.15 + random() * 0.3, Math.sin(a)], length: 0.35 + random() * 0.10, width: 0.10 + random() * 0.025, start: 0.85 + p * 0.005, end: 0.98 });
  }
  return { seed: seed >>> 0, height, hue, branchCount, stems, leaves, petals, flower };
}

/** Stable evenly spaced positions for the demo/benchmark; never more than five. */
export const GARDEN_POSITIONS: readonly Vec3[] = [
  [-1.45, 0, 0.50], [1.45, 0, -0.30], [0.15, 0, -2.05], [-2.50, 0, -1.65], [1.70, 0, 1.90],
];
