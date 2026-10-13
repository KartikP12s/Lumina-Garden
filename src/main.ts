import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GrowingPlant } from './plant';
import { GARDEN_POSITIONS, GROWTH_SECONDS, MAX_PLANTS, growthStage, hashSeed } from './generator';
import './style.css';

const leafIcon = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 27V14M16 21C6 21 6 10 6 10c10 0 10 11 10 11Zm0-6C16 5 26 5 26 5c0 10-10 10-10 10Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="LuminaGarden home">${leafIcon}<span>Lumina<span class="brand-light">Garden</span><small>A LITTLE LIGHT. A LITTLE LIFE.</small></span></a>
    <div class="project-tag"><span class="status-dot"></span> INTERACTIVE GRAPHICS LAB <span class="divider">/</span> PROTOTYPE 03</div>
    <button id="help" class="quiet-button">How to grow <span>↗</span></button>
  </header>
  <main>
    <aside class="sidebar">
      <div class="eyebrow">YOUR SMALL, LIVING WORLD</div>
      <h1>Plant. Grow.<br><em>Illuminate.</em></h1>
      <p class="intro">A garden grown from simple rules.<br>Every seed has a story of its own.</p>
      <section class="seed-section" aria-label="Plant controls">
        <div class="section-label"><span>01 — PLANT A SEED</span><span class="tiny-leaf">✳</span></div>
        <div class="species-card">${leafIcon}<div><strong>Lumina bloom</strong><small>Procedural plant · one shared rule set</small></div><span class="species-dot"></span></div>
        <label for="seed">Seed <span>Same seed, same plant.</span></label>
        <input id="seed" type="text" value="2029" maxlength="64" autocomplete="off" spellcheck="false" />
        <button id="plant" class="primary-button"><span>＋</span> Plant a seed <span class="shortcut">P</span></button>
        <p class="control-note">Or click an open spot in the garden.</p>
      </section>
      <section class="render-section" aria-label="Rendering controls">
        <div class="section-label"><span>02 — SEE THE LIGHT</span></div>
        <label class="toggle-row" for="bloom"><div>Bloom <small>A soft halo around bright surfaces</small></div><input id="bloom" type="checkbox" checked role="switch" /></label>
        <label class="toggle-row" for="lights"><div>Plant lights <small>Colored light falling onto the soil</small></div><input id="lights" type="checkbox" checked role="switch" /></label>
        <label class="slider-label" for="glow">Bloom intensity <output id="glow-value">0.65</output></label>
        <input id="glow" type="range" min="0" max="1.5" step="0.05" value="0.65" />
      </section>
      <section class="specimen-section" aria-label="Selected plant">
        <div class="section-label"><span>03 — UNDER THE SURFACE</span></div>
        <div id="specimen" class="specimen"></div>
      </section>
      <div class="sidebar-bottom"><span>BUILT FROM RULES, ROOTED IN LIGHT.</span><small>Kartik Patel & Safa Akbar</small></div>
    </aside>
    <section class="garden-panel" aria-label="Interactive 3D garden">
      <div class="garden-heading"><div><span class="eyebrow">THE GARDEN</span><h2>A quiet place to begin.</h2></div><div class="live-pill"><span class="status-dot"></span> LIVE SCENE</div></div>
      <div id="viewport" tabindex="0" role="application" aria-label="3D garden. Click the ground or press P to plant. Drag to orbit; scroll to zoom.">
        <div id="loading">Preparing the garden…</div>
        <div class="scene-caption"><span class="scene-cross">＋</span><span>SEED → SPROUT → STEM → BRANCHES → LEAVES</span></div>
        <div id="tooltip" class="ground-tooltip" hidden>Plant here ＋</div>
        <div id="notice" class="notice" role="status" aria-live="polite"></div>
        <div class="viewport-tools"><span><i class="mouse-icon"></i> Click to plant</span><span>Drag to explore</span><span>Scroll to zoom</span><button id="camera-home" class="quiet-button" title="Return camera to the initial view">↺ View</button></div>
        <div id="demo-overlay" class="demo-overlay" hidden><span id="demo-chapter"></span><h3 id="demo-title"></h3><p id="demo-text"></p><div class="demo-progress"><i id="demo-progress"></i></div></div>
      </div>
      <div class="garden-strip"><div><span class="status-dot"></span><strong id="plant-count">3 / 5</strong><span>plants in your garden</span></div><button id="clear" class="quiet-button">Clear garden <span>↺</span></button></div>
      <div class="plant-list" id="plant-list" aria-label="Plants in this garden"></div>
      <details class="lab" id="lab"><summary><span>↗ &nbsp; Performance lab</span><span class="lab-metrics"><b id="fps">—</b> FPS <span>·</span> <b id="draw-calls">—</b> DRAW CALLS</span></summary><div class="lab-body">
        <p>Measure 1 → 3 → 5 plants with bloom and one light per plant. Ten seconds of growth and warm-up, then eight seconds of measured frames per level. The garden stays at five plants or fewer.</p>
        <div class="lab-actions"><button id="benchmark" class="secondary-button">Run stress test</button><button id="download" class="quiet-button" disabled>Export results ↓</button><button id="tour" class="quiet-button">150-second guided demo ↗</button><button id="stop" class="quiet-button" hidden>Stop demo / test</button></div>
        <p id="benchmark-status" role="status">Target: 60 FPS. Measurements depend on your browser, GPU, and viewport.</p>
        <div id="benchmark-results"></div>
      </div></details>
      <footer class="garden-footer"><span>PROCEDURAL GEOMETRY <i>·</i> STAGED GROWTH <i>·</i> EMISSIVE LIGHT</span><span>THREE.JS / WEBGL2</span></footer>
    </section>
  </main>
  <dialog id="help-dialog"><button id="close-help" class="dialog-close" aria-label="Close help">×</button><div class="eyebrow">A SMALL FIELD GUIDE</div><h2>Give a seed<br>a place to grow.</h2><p>Click an open spot on the soil, or use <strong>Plant a seed</strong>. Nine seconds later, a sprout becomes a stem, branches unfold, and leaves and petals emerge.</p><p>Each seed sets its height, branching, leaves, and color. Reuse a seed to reproduce its geometry. This garden holds up to <strong>five plants</strong>.</p><p>Drag to orbit. Scroll to zoom. Switch bloom and plant lights off and on to see the rendering layers. The performance lab measures the same scene at one, three, and five plants.</p><button id="help-done" class="primary-button">Back to the garden ↗</button></dialog>
`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const viewport = el('viewport');
const seedInput = el<HTMLInputElement>('seed');
const bloomInput = el<HTMLInputElement>('bloom');
const lightsInput = el<HTMLInputElement>('lights');
const plantButton = el<HTMLButtonElement>('plant');

interface BenchmarkRow { plants: number; averageFps: number; p95FrameMs: number; minFps: number; drawCalls: number; triangles: number; frames: number; measuredSeconds: number }
interface BenchmarkReport { capturedAt: string; userAgent: string; gpu: string; viewport: { width: number; height: number }; pixelRatio: number; bloom: boolean; lightsPerPlant: number; growthSeconds: number; targetFps: number; sampleSeconds: number; warmupSeconds: number; results: BenchmarkRow[] }

async function startGarden() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 is unavailable. Open this page in a desktop browser with hardware acceleration enabled.');
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.info.autoReset = false;
  canvas.setAttribute('aria-hidden', 'true');
  viewport.prepend(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1718');
  scene.fog = new THREE.FogExp2('#0b1718', 0.055);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
  const home = () => { camera.position.set(8.5, 7.3, 10.5); controls.target.set(0, 0.8, 0); controls.update(); };
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 6; controls.maxDistance = 19;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI * 0.47;
  controls.enablePan = false;
  home();
  el('camera-home').onclick = home;
  scene.add(new THREE.HemisphereLight('#9dced0', '#25372d', 1.6));
  const ambient = new THREE.DirectionalLight('#d1e1df', 2.0);
  ambient.position.set(-4, 8, 4); scene.add(ambient);

  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#b8c9b9', roughness: 1 });
  // AI texture is optional to initialization: its provenance is documented with the asset.
  const textureURL = `${import.meta.env.BASE_URL}textures/garden-soil.png`;
  new THREE.TextureLoader().load(textureURL, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3); texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    soilMaterial.map = texture; soilMaterial.needsUpdate = true;
  }, undefined, () => { /* Ground remains functional without the optional asset. */ });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5.0, 96), soilMaterial);
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.9, 0.33, 96), new THREE.MeshStandardMaterial({ color: '#152320', roughness: 0.94 }));
  plinth.position.y = -0.17; scene.add(plinth);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.02, 0.018, 6, 96), new THREE.MeshBasicMaterial({ color: '#667c65' }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.015; scene.add(rim);

  // Deterministic, instanced surface stones. No individual mesh allocation per stone.
  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#536358', roughness: 1 }), 100);
  const stoneDummy = new THREE.Object3D();
  for (let i = 0; i < 100; i++) {
    const a = i * 2.39996, r = 1.0 + Math.sqrt(i / 100) * 3.65;
    const s = 0.025 + (i % 7) * 0.006;
    stoneDummy.position.set(Math.cos(a) * r, 0.014, Math.sin(a) * r);
    stoneDummy.rotation.set(i, i * 0.7, i * 0.2); stoneDummy.scale.set(s * 1.4, s * 0.55, s);
    stoneDummy.updateMatrix(); stones.setMatrixAt(i, stoneDummy.matrix);
  }
  scene.add(stones);
  const cursor = new THREE.Mesh(new THREE.RingGeometry(0.19, 0.22, 40), new THREE.MeshBasicMaterial({ color: '#b7e4a5', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
  cursor.rotation.x = -Math.PI / 2; cursor.visible = false; scene.add(cursor);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.55, 0.92);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  const resize = () => {
    const { width, height } = viewport.getBoundingClientRect();
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height); composer.setSize(width, height);
  };
  new ResizeObserver(resize).observe(viewport); resize();
  const plants: GrowingPlant[] = [];
  let selected: GrowingPlant | undefined;
  let elapsed = 0, lastTime = performance.now(), lastUi = 0;
  let recentFrames: number[] = [], lastCalls = 0, lastTriangles = 0;
  let benchmarkSamples: number[] | null = null;
  let benchmarkReport: BenchmarkReport | null = null;
  let busy = false, cancelRun: AbortController | null = null;
  let tourStart: number | null = null, tourIndex = -1;
  let noticeTimer: ReturnType<typeof setTimeout>;
  const notify = (message: string) => {
    el('notice').textContent = message; el('notice').classList.add('visible');
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el('notice').classList.remove('visible'), 3500);
  };
  const updateUi = () => {
    const full = plants.length >= MAX_PLANTS;
    plantButton.disabled = full || busy;
    el('plant-count').textContent = `${plants.length} / ${MAX_PLANTS}`;
    el('plant-list').innerHTML = plants.length ? plants.map((plant, i) => `<button class="plant-card ${selected === plant ? 'selected' : ''}" data-index="${i}" aria-label="Inspect plant ${i + 1}" aria-pressed="${selected === plant}"><span class="plant-number">0${i + 1}</span><span class="plant-color" style="--plant-color:hsl(${plant.blueprint.hue * 360} 60% 65%)">${leafIcon}</span><span><strong>Lumina ${String(i + 1).padStart(2, '0')}</strong><small>${growthStage(plant.progress)}</small></span><span class="plant-card-progress">${Math.round(plant.progress * 100)}<small>%</small></span></button>`).join('') : '<p class="empty-garden">An open patch of possibility. Plant your first seed.</p>';
    if (selected) {
      const bp = selected.blueprint;
      el('specimen').innerHTML = `<div class="specimen-title"><strong>Lumina ${String(plants.indexOf(selected) + 1).padStart(2, '0')}</strong><span>${growthStage(selected.progress)}</span></div><div class="growth-track"><i style="width:${selected.progress * 100}%"></i></div><dl><div><dt>Seed hash</dt><dd>${bp.seed}</dd></div><div><dt>Height</dt><dd>${bp.height.toFixed(2)} units</dd></div><div><dt>Branches / leaves</dt><dd>${bp.branchCount} / ${bp.leaves.length}</dd></div><div><dt>Growth</dt><dd>${Math.round(selected.progress * 100)}%</dd></div></dl>`;
    } else el('specimen').innerHTML = '<p>Plant a seed to inspect the rules that make it unique.</p>';
    if (recentFrames.length) el('fps').textContent = String(Math.round(1000 / (recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length)));
    el('draw-calls').textContent = String(lastCalls);
  };
  el('plant-list').onclick = e => {
    const card = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-index]');
    if (card) { selected = plants[Number(card.dataset.index)]; updateUi(); }
  };
  const isOpen = (p: THREE.Vector3) => p.length() <= 4.4 && !plants.some(plant => plant.group.position.distanceTo(p) < 1.2);
  const addPlant = (p: THREE.Vector3, seed: string, mature = false) => {
    if (plants.length >= MAX_PLANTS) { notify('Five plants is a full garden. Clear it to start again.'); return false; }
    if (!isOpen(p)) { notify('Give your seed a little more room to grow.'); return false; }
    const plant = new GrowingPlant(hashSeed(seed), p, elapsed - (mature ? GROWTH_SECONDS : 0));
    plants.push(plant); scene.add(plant.group); selected = plant;
    updateUi(); return true;
  };
  const advanceSeed = () => {
    const n = Number(seedInput.value);
    if (Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER) seedInput.value = String(n + 1);
  };
  const plantNext = () => {
    if (busy) return;
    const seed = seedInput.value.trim();
    if (!seed) { notify('Enter a seed first. A number or a word works.'); seedInput.focus(); return; }
    const pos = GARDEN_POSITIONS.map(p => new THREE.Vector3(...p)).find(isOpen);
    if (pos && addPlant(pos, seed)) { advanceSeed(); notify('A seed takes root. Watch it grow over nine seconds.'); }
    else notify(plants.length >= MAX_PLANTS ? 'Your garden is full: five plants.' : 'Click an open spot on the soil to plant.');
  };
  plantButton.onclick = plantNext;
  viewport.onkeydown = e => { if (e.key.toLowerCase() === 'p') { e.preventDefault(); plantNext(); } };
  const clearGarden = () => { plants.forEach(p => p.dispose()); plants.length = 0; selected = undefined; updateUi(); };
  el('clear').onclick = () => { if (!busy) { clearGarden(); notify('A fresh start. Plant a new possibility.'); } };
  bloomInput.onchange = () => { bloom.enabled = bloomInput.checked; };
  el<HTMLInputElement>('glow').oninput = e => { bloom.strength = Number((e.target as HTMLInputElement).value); el('glow-value').textContent = bloom.strength.toFixed(2); };

  const raycaster = new THREE.Raycaster();
  const groundPoint = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObject(ground)[0];
    return hit ? new THREE.Vector3(hit.point.x, 0, hit.point.z) : null;
  };
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', e => { if (e.button === 0) down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || e.button !== 0) { down = null; return; }
    down = null;
    if (busy) return;
    const p = groundPoint(e), seed = seedInput.value.trim();
    if (!seed) { notify('Enter a seed before planting.'); return; }
    if (p && addPlant(p, seed)) { advanceSeed(); notify('Seed planted. Sprout → stem → branches → leaves.'); }
  });
  canvas.addEventListener('pointermove', e => {
    const p = groundPoint(e), valid = p && isOpen(p) && plants.length < MAX_PLANTS && !busy;
    cursor.visible = Boolean(valid);
    el('tooltip').hidden = !valid;
    canvas.style.cursor = valid ? 'crosshair' : 'grab';
    if (valid && p) {
      cursor.position.set(p.x, 0.025, p.z);
      const rect = viewport.getBoundingClientRect();
      el('tooltip').style.left = `${e.clientX - rect.left + 15}px`;
      el('tooltip').style.top = `${e.clientY - rect.top - 38}px`;
    }
  });
  canvas.addEventListener('pointerleave', () => { cursor.visible = false; el('tooltip').hidden = true; down = null; });

  const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  });
  const setBusy = (value: boolean) => {
    busy = value;
    for (const id of ['benchmark', 'tour', 'clear']) el<HTMLButtonElement>(id).disabled = value;
    for (const id of ['bloom', 'lights', 'glow', 'seed']) el<HTMLInputElement>(id).disabled = value;
    el('stop').hidden = !value; updateUi();
  };
  const gpuExtension = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = gpuExtension ? String(gl.getParameter(gpuExtension.UNMASKED_RENDERER_WEBGL)) : 'Not exposed by browser';
  const renderResults = () => {
    const rows = benchmarkReport?.results ?? [];
    el('benchmark-results').innerHTML = rows.length ? `<table><thead><tr><th>Plants</th><th>Avg FPS</th><th>p95 frame</th><th>Draw calls</th><th>60 FPS target</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.plants} / 5</td><td>${r.averageFps.toFixed(1)}</td><td>${r.p95FrameMs.toFixed(1)} ms</td><td>${r.drawCalls}</td><td>${r.averageFps >= 59 ? 'Near target' : 'Below target'}</td></tr>`).join('')}</tbody></table>` : '';
  };
  const runBenchmark = async (signal: AbortSignal) => {
    bloomInput.checked = true; bloom.enabled = true; lightsInput.checked = true;
    bloom.strength = 0.65; el<HTMLInputElement>('glow').value = '0.65'; el('glow-value').textContent = '0.65';
    benchmarkReport = { capturedAt: new Date().toISOString(), userAgent: navigator.userAgent, gpu, viewport: { width: canvas.clientWidth, height: canvas.clientHeight }, pixelRatio: renderer.getPixelRatio(), bloom: true, lightsPerPlant: 1, growthSeconds: GROWTH_SECONDS, targetFps: 60, sampleSeconds: 8, warmupSeconds: 10, results: [] };
    el<HTMLButtonElement>('download').disabled = true; renderResults();
    for (const count of [1, 3, 5]) {
      clearGarden();
      for (let i = 0; i < count; i++) addPlant(new THREE.Vector3(...GARDEN_POSITIONS[i]), String(2026 + i));
      el('benchmark-status').textContent = `${count} plant${count > 1 ? 's' : ''}: growing and warming up for 10 seconds…`;
      await wait(10000, signal);
      benchmarkSamples = [];
      el('benchmark-status').textContent = `${count} plant${count > 1 ? 's' : ''}: measuring actual frames for 8 seconds…`;
      await wait(8000, signal);
      const samples = benchmarkSamples; benchmarkSamples = null;
      if (!samples.length) throw new Error('No visible frames were measured. Keep this browser tab visible during the test.');
      const sorted = [...samples].sort((a, b) => a - b);
      const ms = samples.reduce((a, b) => a + b, 0);
      benchmarkReport.results.push({ plants: count, averageFps: samples.length / ms * 1000, p95FrameMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))], minFps: 1000 / Math.max(...samples), drawCalls: lastCalls, triangles: lastTriangles, frames: samples.length, measuredSeconds: ms / 1000 });
      renderResults();
    }
    el<HTMLButtonElement>('download').disabled = false;
    el('benchmark-status').textContent = 'Complete. Export the measurements with browser, GPU, viewport, and rendering settings.';
    return benchmarkReport;
  };
  el('benchmark').onclick = async () => {
    if (busy) return;
    cancelRun = new AbortController(); setBusy(true);
    try { await runBenchmark(cancelRun.signal); }
    catch (error) { el('benchmark-status').textContent = error instanceof DOMException && error.name === 'AbortError' ? 'Test stopped. Run again to collect a complete result.' : String(error); }
    finally { benchmarkSamples = null; setBusy(false); cancelRun = null; }
  };
  el('download').onclick = () => {
    if (!benchmarkReport) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(benchmarkReport, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'lumina-garden-benchmark.json'; a.click(); URL.revokeObjectURL(url);
  };
  el('stop').onclick = () => { cancelRun?.abort(); };
  document.addEventListener('visibilitychange', () => {
    // Background throttling cannot be a valid stress-test sample.
    if (document.hidden && busy) { cancelRun?.abort(); notify('Test stopped because the tab was hidden. Keep it visible to measure performance.'); }
    lastTime = performance.now(); recentFrames = [];
  });
  const chapters = [
    { at: 0, title: 'A garden grown from rules.', text: 'LuminaGarden · Kartik Patel & Safa Akbar. The Assignment 3 vertical slice: seeded plant geometry, staged growth, emissive materials, colored lights, and bloom.' },
    { at: 10, title: '01 / A seed takes root.', text: 'One seed becomes a sprout. Fourteen stem segments extend from their bases in sequence; the whole plant is never scaled as a single object.' },
    { at: 20, title: 'Branches first. Leaves next.', text: 'Branch angles follow a golden-angle distribution. Length, height, branch count, leaf placement, and color vary inside constrained ranges.' },
    { at: 30, title: '02 / Same rules, different seeds.', text: 'A second seed produces a different height, structure, and hue. Entering the same seed again reproduces the same geometry.' },
    { at: 42, title: 'Light lives in the leaves.', text: 'The custom leaf GLSL strengthens emission along the central vein and toward the tip. Repeated stems, leaves, and petals use instanced geometry.' },
    { at: 52, title: '03 / Bloom switched off.', text: 'The leaves still emit light, and colored point lights still illuminate the soil. Without post-processing, the soft halo disappears.' },
    { at: 61, title: 'Bloom switched on.', text: 'UnrealBloomPass extracts bright pixels and blurs them into a halo. OutputPass applies tone mapping and color-space conversion.' },
    { at: 69, title: 'Plant lights switched off.', text: 'The glowing materials remain visible. Colored light on the ground fades because each plant’s point light is disabled.' },
    { at: 77, title: '04 / Measure the real scene.', text: 'The stress test compares one, three, and five plants. Bloom stays enabled and each plant has its own point light. The maximum is five plants.' },
    { at: 96, title: 'One → three → five plants.', text: 'Each level gets ten seconds for growth and shader warm-up, followed by eight seconds of measured animation frames. The live lab shows the actual results.' },
    { at: 115, title: 'Five plants. Five colored lights.', text: 'This is the requested workload limit. Frame time and draw calls expose the cost of bloom and additional lights. Results are specific to this GPU and viewport.' },
    { at: 138, title: 'The vertical slice, end to end.', text: 'Click-to-plant, repeatable procedural variation, staged growth, GLSL emission, colored point lights, and bloom are implemented. Wind, movable lights, species, and shadows remain for the final.' },
  ];
  const runTour = async () => {
    if (busy) return;
    cancelRun = new AbortController(); const signal = cancelRun.signal;
    setBusy(true); home(); clearGarden(); document.body.classList.add('demo-mode');
    el<HTMLDetailsElement>('lab').open = true;
    el('demo-overlay').hidden = false; tourStart = performance.now(); tourIndex = -1;
    bloom.enabled = true; bloomInput.checked = true; lightsInput.checked = true;
    try {
      await wait(10000, signal); addPlant(new THREE.Vector3(...GARDEN_POSITIONS[0]), '2026');
      await wait(20000, signal); addPlant(new THREE.Vector3(...GARDEN_POSITIONS[1]), '2027');
      await wait(12000, signal); addPlant(new THREE.Vector3(...GARDEN_POSITIONS[2]), '2028');
      await wait(10000, signal); bloom.enabled = false; bloomInput.checked = false;
      await wait(9000, signal); bloom.enabled = true; bloomInput.checked = true;
      await wait(8000, signal); lightsInput.checked = false;
      await wait(8000, signal); lightsInput.checked = true;
      await wait(5000, signal); await runBenchmark(signal);
      await wait(14000, signal);
      notify('Guided demo complete. Benchmark results are ready to export.');
    } catch (error) {
      el('benchmark-status').textContent = error instanceof DOMException && error.name === 'AbortError' ? 'Guided demo stopped.' : String(error);
    } finally {
      tourStart = null; benchmarkSamples = null; el('demo-overlay').hidden = true; document.body.classList.remove('demo-mode'); setBusy(false); cancelRun = null;
    }
  };
  el('tour').onclick = runTour;
  const animate = (now: number) => {
    const frameMs = now - lastTime; lastTime = now;
    if (!document.hidden) {
      elapsed += frameMs / 1000;
      if (frameMs > 0) { recentFrames.push(frameMs); if (recentFrames.length > 120) recentFrames.shift(); benchmarkSamples?.push(frameMs); }
    }
    plants.forEach(p => p.update(elapsed, lightsInput.checked, GROWTH_SECONDS));
    controls.update(); renderer.info.reset(); composer.render();
    lastCalls = renderer.info.render.calls; lastTriangles = renderer.info.render.triangles;
    if (tourStart !== null) {
      const seconds = (now - tourStart) / 1000;
      const index = chapters.findLastIndex(c => c.at <= seconds);
      if (index !== tourIndex) {
        tourIndex = index; el('demo-chapter').textContent = `LUMINA GARDEN / ASSIGNMENT 03 · ${String(index + 1).padStart(2, '0')} / ${chapters.length}`;
        el('demo-title').textContent = chapters[index].title; el('demo-text').textContent = chapters[index].text;
      }
      el('demo-progress').style.width = `${Math.min(100, seconds / 150 * 100)}%`;
    }
    if (now - lastUi > 250) { updateUi(); lastUi = now; }
    requestAnimationFrame(animate);
  };
  for (let i = 0; i < 3; i++) addPlant(new THREE.Vector3(...GARDEN_POSITIONS[i]), String(2026 + i), true);
  requestAnimationFrame(animate);
  el('loading').remove(); updateUi();
  // Read-only diagnostics for smoke tests and captured evidence; no external service.
  Object.defineProperty(window, '__lumina', { value: {
    get plantCount() { return plants.length; },
    get growingCount() { return plants.filter(p => p.progress < 1).length; },
    get seeds() { return plants.map(p => p.blueprint.seed); },
    get benchmark() { return benchmarkReport; },
    get busy() { return busy; },
    get gpu() { return gpu; },
    get pointLights() { return plants.length; },
    get bloomEnabled() { return bloom.enabled; },
  } });
}

const dialog = el<HTMLDialogElement>('help-dialog');
el('help').onclick = () => dialog.showModal();
el('close-help').onclick = el('help-done').onclick = () => dialog.close();
startGarden().catch(error => {
  el('loading').innerHTML = `<strong>The garden couldn’t start.</strong><p></p>`;
  el('loading').querySelector('p')!.textContent = error instanceof Error ? error.message : String(error);
  plantButton.disabled = true;
  for (const id of ['benchmark', 'tour', 'clear', 'camera-home']) el<HTMLButtonElement>(id).disabled = true;
  console.error(error);
});
