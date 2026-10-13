# Assignment 3 demo

The generated recording is `artifacts/LuminaGarden-Assignment3-Demo.webm`.
The included recording was verified at 2 minutes 45.52 seconds, at
1440 x 1080 and 25 capture frames per second. The app's FPS is measured
independently by the live benchmark. It is actual browser capture; timing
can vary slightly with startup and browser overhead. It includes a real
mouse click on the ground before the guided walkthrough. No voiceover is
needed because the guided demo provides explanatory text overlays.

The recording script is `scripts/record-demo.mjs`. Run `npm run build` and
`npm run record:demo` with Google Chrome installed. Generated videos are
excluded from Git. Benchmark JSON and the initial screenshot are retained
under `docs/` as evidence.

## Walkthrough timing

The recording starts with about 15 seconds of initial scene, clearing the
garden, clicking the soil, and watching one plant grow. The following
timestamps are relative to the start of the **150-second guided demo**:

| Time | On-screen proof |
| --- | --- |
| 0–10s | Vertical-slice explanation and empty garden |
| 10–30s | Sprout, stem segments, branches, leaves, and petals |
| 30–52s | Different seeds generate different structures and colors |
| 52–61s | Bloom off: emission stays, halo disappears |
| 61–69s | Bloom on: halo returns |
| 69–77s | Plant lights off: ground illumination disappears |
| 77–82s | Lights restored; stress-test method explained |
| 82–100s | One plant: 10s warm-up/growth, 8s measurement |
| 100–118s | Three plants: 10s warm-up/growth, 8s measurement |
| 118–136s | Five plants: 10s warm-up/growth, 8s measurement |
| 136–150s | Actual results and remaining final-project features |

The test stays within the requested five-plant cap. It demonstrates the
maximum permitted workload; it does not spawn 20 plants or claim to find
the machine's absolute maximum. If FPS stays near 60, report that instead
of forcing or faking an FPS drop.

## Upload and submission

1. Open the recording and check legibility, duration, and complete stress
   results. If your browser cannot play WebM, use Chrome or convert it to
   MP4 with an installed video converter.
2. Upload the recording to your own YouTube or Vimeo account. Choose a
   visibility setting that lets the instructor view it (e.g., unlisted).
3. Copy the actual video URL into `docs/SUBMISSION.md` and the report source.
4. Add the verified live deployment URL, regenerate the PDF with
   `npm run report`, and submit those links along with the public repo URL.

No YouTube/Vimeo upload has been performed by the project or recording
script. A local recording is not a hosted video link.
