import * as THREE from 'three';
import { generatePlant, growthAt, type PlantBlueprint, type Organ } from './generator';
import { windOffset } from './environment';

const up = new THREE.Vector3(0, 1, 0);
const dummy = new THREE.Object3D();
const v = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2]);
const stemGeometry = new THREE.CylinderGeometry(1, 1.15, 1, 7, 1);
const coreGeometry = new THREE.IcosahedronGeometry(0.13, 1);
const seedGeometry = new THREE.IcosahedronGeometry(0.075, 1);

function leafGeometry(): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  // Organic tapered surface, rooted at y=0 and curved along its long axis.
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const width = Math.pow(Math.sin(Math.PI * t), 0.85);
    for (let j = 0; j < 3; j++) {
      const s = j - 1;
      positions.push(s * width, t, 0.22 * Math.sin(t * Math.PI) - Math.abs(s) * 0.10 * width);
      uvs.push(j / 2, t);
    }
  }
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j;
    indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}
const organGeometry = leafGeometry();

export class GrowingPlant {
  readonly blueprint: PlantBlueprint;
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  readonly born: number;
  progress = 0;
  private readonly stems: THREE.InstancedMesh;
  private readonly leaves: THREE.InstancedMesh;
  private readonly petals: THREE.InstancedMesh;
  private readonly core: THREE.Mesh;
  private readonly seedMesh: THREE.Mesh;
  private readonly materials: THREE.MeshStandardMaterial[];
  private complete = false;
  private readonly wind = { time: { value: 0 }, strength: { value: 0 }, phase: { value: 0 } };
  private readonly coreScale = { value: 1 };
  private readonly seedScale = { value: 1 };
  private readonly daylight = { value: 0 };

  constructor(seed: number, position: THREE.Vector3, born: number) {
    this.blueprint = generatePlant(seed);
    this.born = born;
    const color = new THREE.Color().setHSL(this.blueprint.hue, 0.64, 0.55);
    const petalColor = new THREE.Color().setHSL(this.blueprint.hue, 0.4, 0.75);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.5), emissive: color, emissiveIntensity: 0.28, roughness: 0.75 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.05, roughness: 0.42, side: THREE.DoubleSide });
    const petalMaterial = new THREE.MeshStandardMaterial({ color: petalColor, emissive: petalColor, emissiveIntensity: 1.65, roughness: 0.3, side: THREE.DoubleSide });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#fff4d2', emissive: '#fff4d2', emissiveIntensity: 2.2 });
    const seedMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 });
    this.materials = [stemMaterial, leafMaterial, petalMaterial, coreMaterial, seedMaterial];
    this.wind.phase.value = (seed % 997) / 997 * Math.PI * 2;
    this.materials.forEach((material, index) => {
      const origin = index === 3 ? v(this.blueprint.flower) : index === 4 ? new THREE.Vector3(0, 0.075, 0) : new THREE.Vector3();
      const localScale = index === 3 ? this.coreScale : index === 4 ? this.seedScale : { value: 1 };
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, { uWindTime: this.wind.time, uWindStrength: this.wind.strength, uWindPhase: this.wind.phase, uWindOrigin: { value: origin }, uWindScale: localScale, uDaylight: this.daylight });
        shader.fragmentShader = 'uniform float uDaylight;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(1.0, 0.32, uDaylight);');
        shader.vertexShader = `
          uniform float uWindTime, uWindStrength, uWindPhase, uWindScale;
          uniform vec3 uWindOrigin;
          vec2 luminaWind() {
            return uWindStrength * vec2(
              0.07 * (sin(uWindTime * 1.3 + uWindPhase) + 0.25 * sin(uWindTime * 2.6 + uWindPhase)),
              0.04 * cos(uWindTime * 0.9 + uWindPhase));
          }
          vec3 luminaBend(vec3 p) { p.xz += luminaWind() * pow(max(p.y, 0.0), 2.0); return p; }
        ` + shader.vertexShader;
        // Apply one deformation AFTER instance placement. Attached organs share the
        // same plant-space field, rather than rotating disconnected meshes.
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace(
          'mvPosition = modelViewMatrix * mvPosition;',
          'mvPosition.xyz = (luminaBend(mvPosition.xyz * uWindScale + uWindOrigin) - uWindOrigin) / uWindScale;\nmvPosition = modelViewMatrix * mvPosition;'));
        // Inverse-transpose Jacobian of x+=kx*y², z+=kz*y² keeps lighting coherent.
        shader.vertexShader = shader.vertexShader.replace('#include <defaultnormal_vertex>', THREE.ShaderChunk.defaultnormal_vertex.replace(
          'transformedNormal = normalMatrix * transformedNormal;', `
          vec3 windLocal = position;
          #ifdef USE_INSTANCING
            windLocal = (instanceMatrix * vec4(windLocal, 1.0)).xyz;
          #endif
          windLocal = windLocal * uWindScale + uWindOrigin;
          transformedNormal.y -= dot(2.0 * max(windLocal.y, 0.0) * luminaWind(), transformedNormal.xz);
          transformedNormal = normalMatrix * transformedNormal;`));
        if (index === 1) {
          shader.vertexShader = 'varying vec2 vLeafUV;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvLeafUV = uv;');
          shader.fragmentShader = 'varying vec2 vLeafUV;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            float vein = exp(-abs(vLeafUV.x - 0.5) * 16.0);
            totalEmissiveRadiance *= 0.38 + 0.72 * pow(vLeafUV.y, 1.6) + 0.34 * vein;`);
        }
      };
      material.customProgramCacheKey = () => index === 1 ? 'lumina-wind-leaf-v2' : 'lumina-wind-v2';
    });
    this.stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, this.blueprint.stems.length);
    this.leaves = new THREE.InstancedMesh(organGeometry, leafMaterial, this.blueprint.leaves.length);
    this.petals = new THREE.InstancedMesh(organGeometry, petalMaterial, this.blueprint.petals.length);
    for (const mesh of [this.stems, this.leaves, this.petals]) {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Bounds change during reveal; five small plants make uncullable groups cheap.
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.core.position.copy(v(this.blueprint.flower));
    this.seedMesh = new THREE.Mesh(seedGeometry, seedMaterial);
    this.seedMesh.position.y = 0.075;
    this.light = new THREE.PointLight(color, 0, 3.8, 2);
    this.light.position.copy(v(this.blueprint.flower)).multiplyScalar(0.65);
    this.group.add(this.core, this.seedMesh, this.light);
    this.group.position.copy(position);
    this.update(0, true, 9);
  }

  update(elapsed: number, lightsOn: boolean, duration: number, windStrength = 0, daylight = 0): void {
    this.progress = Math.max(0, Math.min(1, (elapsed - this.born) / duration));
    this.wind.time.value = elapsed;
    this.wind.strength.value = windStrength;
    this.daylight.value = daylight;
    const flower = this.blueprint.flower;
    const height = flower[1] * 0.65;
    const offset = windOffset(height, elapsed, windStrength, this.wind.phase.value);
    this.light.position.set(flower[0] * 0.65 + offset[0], height, flower[2] * 0.65 + offset[1]);
    this.light.intensity = lightsOn ? growthAt(this.progress, 0.05, 0.85) * 9 : 0;
    if (this.complete) return;
    this.blueprint.stems.forEach((s, i) => {
      const g = growthAt(this.progress, s.start, s.end);
      const from = v(s.from), direction = v(s.to).sub(from);
      dummy.position.copy(from).addScaledVector(direction, g * 0.5);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(s.radius * Math.max(g, 0.001), direction.length() * Math.max(g, 0.00001), s.radius * Math.max(g, 0.001));
      dummy.updateMatrix(); this.stems.setMatrixAt(i, dummy.matrix);
    });
    this.stems.instanceMatrix.needsUpdate = true;
    this.revealOrgans(this.leaves, this.blueprint.leaves);
    this.revealOrgans(this.petals, this.blueprint.petals);
    this.core.scale.setScalar(Math.max(0.00001, growthAt(this.progress, 0.82, 0.96)));
    this.seedMesh.scale.setScalar(1 - growthAt(this.progress, 0.08, 0.25) * 0.85);
    this.coreScale.value = this.core.scale.x;
    this.seedScale.value = this.seedMesh.scale.x;
    this.complete = this.progress >= 1;
  }

  private revealOrgans(mesh: THREE.InstancedMesh, organs: Organ[]): void {
    organs.forEach((o, i) => {
      const g = Math.max(0.00001, growthAt(this.progress, o.start, o.end));
      dummy.position.copy(v(o.position));
      dummy.quaternion.setFromUnitVectors(up, v(o.direction).normalize());
      dummy.scale.set(o.width * g, o.length * g, o.length * g);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.stems.dispose(); this.leaves.dispose(); this.petals.dispose();
    this.materials.forEach(m => m.dispose());
    this.light.dispose();
  }
}
