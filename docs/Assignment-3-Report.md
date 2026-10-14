# LuminaGarden - Assignment 3 progress report

Kartik Patel | Safa Akbar | October 13, 2026

## Plan vs. reality

The Assignment 2 MVP focused on one procedural plant type: clicking the ground to plant a seed, varying its height/branching/color, showing staged growth, and rendering emissive materials with one colored point light per plant and basic bloom. These core features are implemented in the Three.js/TypeScript prototype.

A raycast places a seed at the clicked ground position. Seeded rules control height, branch angles/count, leaf placement, and color within defined ranges; entering the same seed reproduces the same geometry. Growth takes nine seconds. Stem segments extend from their bases, followed by branches, leaves, and petals, rather than scaling a completed plant as one object.

Custom GLSL strengthens leaf emission along the vein and toward the tip. Colored point lights illuminate the soil, while bloom creates the halo around bright surfaces. Separate bloom and light toggles demonstrate their contributions. Repeated geometry uses instancing, and mature plants stop updating their growth transforms.

The prototype starts with three examples and caps the garden at five plants to keep this submission focused. This changes the original 15-20-plant performance workload. Wind, movable lights, day/night, multiple species, and shadows remain deferred, as planned for the MVP. Clear/reset was added for repeated testing. A seeded random generator, HTML controls, and a shared growth clock replace the proposed simplex-noise, lil-gui, and GSAP libraries.

## Verification and performance

The production build, four generator tests, and three Chrome browser tests passed. Checks covered deterministic geometry across 300 seeds, click planting, growth stages, the five-plant cap, rendering controls, camera dragging, benchmark cancellation, and WebGL2 failure handling.

<!-- benchmark:start -->
Local stress test: 10 seconds growth/warm-up, then 8 seconds measured per level; bloom 0.65 and one point light per plant.

1 plant(s): 60.0 average FPS; 16.7 ms p95 frame time; 23 draw calls.

3 plant(s): 60.0 average FPS; 16.8 ms p95 frame time; 33 draw calls.

5 plant(s): 60.0 average FPS; 16.7 ms p95 frame time; 43 draw calls.

Measured on an Apple M2 GPU in Chrome 155.0.0.0, with a 1086 x 430 canvas and pixel ratio 1. FPS uses animation-frame intervals, not GPU timer queries. The measured workloads stayed near 60 FPS; this does not guarantee performance on other devices or at other resolutions. The five-plant cap does not validate the original 15-20-plant target. Raw data: docs/benchmark-results.json.
<!-- benchmark:end -->

<!-- pagebreak -->

## AI utility

ChatGPT/Codex coding assistance was useful for structuring procedural rules, drafting the leaf emission GLSL, connecting the rendering pipeline, and implementing controls and tests. It reduced the amount of initial scaffolding that had to be written manually. The generated code still needed compiler checks, browser testing, and visual review. Ground visibility and explanation-overlay placement required adjustment after reviewing the running scene.

The technical specification proposed Stable Diffusion/Midjourney asset references and Claude/ChatGPT shader assistance. For this build, OpenAI image generation produced the bundled ground texture; its prompt and provenance are recorded in public/textures/PROVENANCE.md. Stable Diffusion, Midjourney, and Claude were not used for this implementation. Plants and background remain procedural. Runtime LLM naming was optional and remains deferred.

AI was most useful as a starting point for code and the texture, rather than as a substitute for verification. Debugging and visual tuning added work, but no manual-versus-AI timing baseline was tracked, so the net time saved cannot be quantified. The performance numbers are measured results; the productivity assessment is qualitative.

## Roadmap to final

1. Profile more desktop browsers/GPUs and normal viewport sizes; optimize bloom resolution, shader warm-up, and point-light cost.
2. Add wind sway with coherent stem/leaf motion, then a movable light and controlled bending.
3. Add day/night, basic shadows, and the planned Crystal Bloom, Spiral Vine, and Glowing Tree families.
4. Refine branch intersections, color ranges, texture repetition, and camera framing. Weather and falling petals remain stretch goals.
5. Record the required 2-3 minute walkthrough and stress test, upload it to YouTube/Vimeo, and add its link to this report.

## Deliverables and links

Live playable build (Vercel): https://lumina-garden-zeta.vercel.app/

Public source repository: https://github.com/KartikP12s/Lumina-Garden

README with build instructions: https://github.com/KartikP12s/Lumina-Garden/blob/main/README.md

Video link (YouTube/Vimeo): TO BE ADDED after recording and upload.

The planned video will show the application running in real time, explain planting/growth and glow using voiceover or text overlays, and demonstrate the one/three/five-plant stress test. The video deliverable is pending and is not represented as complete.

Local run: npm ci, then npm run dev. Production build: npm run build, then npm run preview. Requires Node.js 22.12+ and desktop WebGL2; no API key is needed. The repository's README contains the full instructions.
