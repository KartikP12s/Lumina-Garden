# Mid-crit speaker notes - 4 slides / target 4:30

## Slide 1

Kartik | 0:00-0:25 (25 seconds).

LuminaGarden is a small interactive garden built with Three.js and TypeScript. Our three pillars are procedural generation, animation, and rendering. The alpha now has a complete loop: start, plant and shape the garden, finish, and restart. We'll focus on two challenges: coherent plant animation and the cost of glow.

Point briefly at the loop; keep the overview short.

---

## Slide 2

Kartik | 0:25-1:45 (80 seconds).

Our first challenge is making generated plants feel structured while they grow. Unconstrained random branches can look disconnected or implausible, while scaling a complete model makes every part appear at once. We generate a deterministic blueprint from the seed, with bounded height, five to eight branches, and three to five leaves per branch. Branch placement follows a golden-angle distribution.

The blueprint gives each segment and organ a start and end time. A clamped smoothstep turns overall growth progress into a local reveal amount. Fourteen trunk segments extend from their bases, then branches, leaves, and petals appear.

These are screenshots from the actual nine-second growth sequence. The same seed recreates the same blueprint, and generator tests check finite, bounded geometry across 300 seeds. The tradeoff is artistic control rather than botanical realism; the rules do not prevent every leaf intersection.

Point along the stage images, then hand over to Safa.

---

## Slide 3

Safa | 1:45-3:10 (85 seconds).

Adding wind makes the first challenge harder. If we rotate each leaf or branch independently, attachment points can separate, especially during growth. Our solution is one continuous deformation in plant-local coordinates. We first place an instance, then bend its resulting position using the same height-squared field as every other part. A vertex at the root has zero displacement, and higher vertices move farther. Each plant gets a seed-derived phase.

Growth still updates the instance transforms. Wind runs in the vertex shader, so mature plants can sway without uploading all their organ matrices again. We also transform normals using the deformation's inverse-transpose Jacobian so lighting follows the bend. Point-light anchors use the same analytic field on the CPU.

The screenshots show the same five-plant layout with still and strong wind. This is a cheap, coherent visual approximation: it does not model inertia or preserve exact branch lengths. Those are deliberate limitations, not physical-simulation claims.

---

## Slide 4

Safa | 3:10-4:30 (80 seconds).

The second challenge is producing convincing glow within a real-time budget. Emission makes a surface bright. A point light illuminates nearby soil. Bloom is a screen-space halo around bright pixels. The comparison switches bloom off and on while keeping emission. Day/night also adjusts emission and bloom to avoid the washed-out daytime result we found in visual review.

We measured actual animation-frame intervals with wind at seventy percent, daylight at fifteen percent, bloom enabled, and one point light per plant. Each level gets ten seconds of growth and warm-up followed by eight seconds of sampling. The table shows the measured averages and total draw calls, including post-processing. The slowest recorded frame was 83.4 milliseconds, so an average near sixty does not mean every frame met the target.

These results are specific to Chrome, this M2 GPU, and this viewport. Five plants do not validate the original twenty-plant target, and a sixty-FPS cap hides spare headroom. Our next work is broader profiling, light interaction, and plant families, with December seventh onward reserved for fixes and documentation.

Leave around thirty seconds of margin within the five-minute limit.

Rehearse with the deck. Keep the total under 5 minutes; the schedule/report are separate deliverables.
