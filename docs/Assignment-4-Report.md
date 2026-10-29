# Assignment 4 - LuminaGarden Alpha

Kartik Patel | Safa Akbar | October 29, 2026

## Weekly development plan

Calendar planned against a tentative December 14, 2026 submission date supplied by the team. Alpha checkpoint: October 29–November 1. Weekly plan: November 2–December 13. Confirm the official deadline if it changes; preserve the final buffer week.

| Week / dates | Engineering | Assets | Integration / acceptance |
| --- | --- | --- | --- |
| 1 / Nov 2–8 | Stabilize the alpha loop and environment controls; profile on a second desktop GPU/browser; prototype basic shadows within budget. | Review existing soil, leaves, vein emission, and day/night palettes; correct readability and repetition defects. | Retest start, growth, wind, lighting, finish, and restart together. Keep or defer shadows based on measured visual benefit and FPS. |
| 2 / Nov 9–15 | Add a bounded movable light and controlled bending toward it; combine its deformation with wind without detaching organs. | Create a small procedural light marker; tune color/range presets and check plant/light readability. | Test simultaneous growth, wind, and light movement. Acceptance: repeatable seeds and five-plant limits still hold; lighting stays coherent. |
| 3 / Nov 16–22 | Add constrained Crystal Bloom, Spiral Vine, and Glowing Tree rule presets; connect a species selector to seed generation. | Build species-specific procedural leaves/petals and silhouettes; review palettes and record any new asset provenance. | Run every family through the same growth/wind/render pipeline. Test bounds, five-plant mixed gardens, and reset cleanup. |
| 4 / Nov 23–29 | Integrate species, wind, movable lighting, and shadows retained after profiling; exercise mixed five-plant gardens and long sessions. | Resolve inconsistent silhouettes, materials, light markers, and UI labels across species; audit asset provenance. | Produce a cross-feature test build. Acceptance: each family grows and sways coherently; no scene/light accumulation after repeated restart. |
| 5 / Nov 30–Dec 6 | Complete cross-feature integration and performance pass; resolve high-priority defects; freeze feature scope at the end of this week. | Finalize existing textures, palettes, and silhouettes; verify attribution and the consistency of all UI states. | Publish a release candidate on Vercel and test two desktop browsers. Feature freeze December 6; defer unstable optional work before the freeze. |
| 6 / Dec 7–13 | Bug fixes and regression checks only. Correct crashes, interaction defects, and performance regressions; no new features. | Polish existing asset/UI defects only; prepare final screenshots and documentation. No new feature assets. | Finalize README, PDF/release notes, and presentation/demo materials; verify hosted URL and restart flow. Submit on tentative December 14. No new features. |

Kartik: procedural geometry, wind shaders, and profiling. Safa: UI/environment controls, asset review, and documentation. Both: integration, visual review, and regression testing.

## Release notes

### New features

- Complete loop: Start Garden menu → empty active garden → completion summary → restart/menu. Finishing requires at least one plant and no unfinished growth.
- Wind slider drives a shared plant-space shader bend after instance placement; stems, leaves, petals, and flower centers move coherently during and after growth.
- Day/night slider changes background, fog, and scene lighting. Emission and bloom soften in daylight to preserve plant readability.
- Menu/resume pauses the experience clock. Restart restores defaults and releases old plants, lights, materials, and instance buffers.
- HUD shows plant count, growth stage, seed hash, height, and branch/leaf counts. The five-plant limit remains enforced across manual planting and diagnostics.
- Benchmark exports alpha version, wind/daylight, effective bloom strength, browser/GPU, viewport, frame times, draw calls, and triangles. Vercel configuration and CI checks are included.

### Bug fixes

- Camera drags that return to their starting point no longer count as planting clicks; pointer cancellation clears pending placement.
- Corrected daytime glow washout by attenuating emission and bloom as daylight increases.
- Guarded empty/unfinished completion and blocked conflicting controls during diagnostics. WebGL2 errors remain visible in the start menu.

### Known issues

- Wind is an analytic height-based deformation, not botanical physics: it does not preserve exact branch lengths or simulate inertia/collisions. Nearby foliage can overlap.
- Gardens are session-only; refresh resets them. Desktop WebGL2 is required; mobile/touch is outside the approved scope.
- Movable-light bending, additional species, and shadows remain scheduled work. Only the current five-plant workload is validated, not the original 15–20-plant target.
- Results are from Chrome on one Apple M2 GPU. Cross-browser/GPU coverage and shader-startup/performance headroom need further testing.

## Validation

7 unit tests and 6 Chrome browser tests pass. 1 plants: 59.5 FPS / 16.8 ms p95 / 23 calls, 3 plants: 60.0 FPS / 16.7 ms p95 / 33 calls, 5 plants: 60.0 FPS / 16.7 ms p95 / 43 calls. Slowest frame: 83.4 ms. Evidence: docs/alpha/benchmark-results.json. One browser/GPU and five plants do not validate the original 15–20-plant target.

## Links

Playable project: https://lumina-garden-zeta.vercel.app/

Production alpha verified: menu, planting, wind, day/night, maturation, completion, and clean restart. No browser/shader errors observed.

Source / README: https://github.com/KartikP12s/Lumina-Garden
