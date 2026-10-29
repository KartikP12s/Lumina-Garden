# Two-person recording script - about 2 minutes 45 seconds

Speakers: Kartik Patel and Safa Akbar. You can swap the speaking parts.
One person can operate the website while both provide narration.

## Before recording

- Open https://lumina-garden-zeta.vercel.app/ and refresh to start with the
  three example plants. Use a desktop browser and keep the tab visible.
- Choose a window size/zoom that keeps the garden, controls, and performance
  results readable. Check this once before starting the recording.
- Keep Bloom and Plant lights on, with Bloom intensity at 0.65.
- Use the manual controls for this walkthrough. The script's timings include
  the approximately 54-second stress test.
- The timestamps are targets. Pause briefly to let the viewer see growth and
  rendering changes. Read the actual FPS results from your own recording.

## 0:00-0:15 - Kartik: introduction

On screen: Show the starting garden and gently drag to orbit. Return to the
original camera with View.

"Hi, we're Kartik and Safa. Our project is LuminaGarden, an interactive
bioluminescent garden built using Three.js and TypeScript. This prototype
focuses on procedural plant generation, staged growth, and real-time glow."

## 0:15-0:40 - Safa: click planting and staged growth

On screen: Click Clear garden, enter 2026 in Seed, then click an open spot
on the soil. Let the full nine-second growth animation finish. Keep the
growth-stage panel visible.

"I'll clear the garden, enter a seed, and click the soil. You can see the
sprout develop into a stem, followed by branches, leaves, and petals.
Each part appears in sequence over about nine seconds, instead of scaling
a finished plant all at once."

## 0:40-1:00 - Kartik: procedural variation

On screen: Enter 2027 and click Plant a seed. Wait for growth. Select the
first and second plant cards to compare their height and branch/leaf counts.

"Now I'm planting another seed. Different seeds change the height, branch
structure, leaf placement, and color within controlled ranges. Reusing the
same seed reproduces the same geometry. The panel lets us inspect the
plant's height, branches, leaves, and growth stage."

## 1:00-1:20 - Safa: emission, bloom, and point lights

On screen: Toggle Bloom off, pause, and turn it back on. Toggle Plant lights
off, pause, and restore them. Point at the halo and the soil illumination.

"These leaves use emissive materials. Switching bloom off removes the soft
halo; switching it back on restores it. Plant lights are separate: turning
them off removes colored illumination from the soil, while the plant itself
stays bright."

## 1:20-1:38 - Kartik: start the stress test

On screen: Open Performance lab and click Run stress test at about 1:20.
Keep the scene and benchmark status visible. The test replaces the current
garden and starts with one plant.

"This test compares one, three, and five plants. Each level gets ten seconds
for growth and warm-up, then eight seconds of measured frames. Bloom and
one colored point light per plant stay enabled."

## 1:38-1:56 - Safa: AI use while three plants are tested

On screen: Let the test continue automatically at three plants. Point at
the FPS and draw-call counters without changing the camera or window size.

"While the three-plant level runs, AI assistance helped us draft the
generation rules and shader code. We also included an AI-generated ground
texture. We checked the output with compiler checks, browser tests, and
visual review."

## 1:56-2:14 - Kartik: maximum permitted workload

On screen: Keep recording the five-plant level. Show the 5 / 5 counter and
the measured-frame status. Let the test finish without skipping ahead.

"Now the test has reached five plants, the maximum allowed in this
prototype. Repeated geometry uses instancing to reduce draw calls. This
demonstrates our permitted workload, but does not validate Assignment 2's
original fifteen-to-twenty-plant target."

## 2:14-2:30 - Safa: read the actual results

On screen: Show the completed results table. Scroll just enough to show
all three rows. Replace the bracketed values below with the displayed FPS.

"The results show average frame rates of [one-plant FPS], [three-plant FPS],
and [five-plant FPS]. Draw calls increase as the garden gets larger. These
results apply to this device and viewport."

If your results are all close to 60, you can instead say:

"On this device, all three workloads stayed around sixty frames per second.
Draw calls increase as the garden gets larger. This meets our target for
this five-plant test, although performance can differ on other devices."

## 2:30-2:45 - Kartik and Safa: remaining work

On screen: Return attention to the five-plant garden; use View if needed.

Kartik:

"Our MVP demonstrates click planting, procedural variation, staged growth,
emission, colored lights, and bloom."

Safa:

"For the final submission, we plan to add wind, movable lighting, day/night,
additional plant families, and further performance testing. Thank you."

## After recording

Check that the video is 2-3 minutes, both voices are audible, and the full
stress-test results are visible. If FPS does not drop, report the observed
result rather than claiming a drop or an absolute hardware limit.

Upload to YouTube or Vimeo, then add its URL to docs/Assignment-3-Report.md
and docs/SUBMISSION.md. Run npm run report to update the PDF.
