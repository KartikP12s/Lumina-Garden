/** Shared analytic bend used by the GPU and the moving point lights. */
export function windOffset(height: number, elapsed: number, strength: number, phase: number): [number, number] {
  const h = Math.max(0, height), w = Math.max(0, Math.min(1, strength));
  return [
    w * 0.07 * (Math.sin(elapsed * 1.3 + phase) + 0.25 * Math.sin(elapsed * 2.6 + phase)) * h * h,
    w * 0.04 * Math.cos(elapsed * 0.9 + phase) * h * h,
  ];
}

export function environmentAt(daylight: number) {
  const day = Math.max(0, Math.min(1, daylight));
  return { day, hemisphere: 1.1 + day * 2.2, sun: 0.65 + day * 3.0, fog: 0.055 - day * 0.025 };
}
