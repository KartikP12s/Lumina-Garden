export type SessionPhase = 'menu' | 'active' | 'complete';

/** A completed garden contains at least one plant and no unfinished growth. */
export function canFinish(progress: readonly number[]): boolean {
  return progress.length > 0 && progress.every(p => p >= 1);
}
