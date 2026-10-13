import * as THREE from 'three';
import { generatePlant, growthAt, type PlantBlueprint, type Organ } from './generator';

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

  constructor(seed: number, position: THREE.Vector3, born: number) {
    this.blueprint = generatePlant(seed);
    this.born = born;
    const color = new THREE.Color().setHSL(this.blueprint.hue, 0.64, 0.55);
    const petalColor = new THREE.Color().setHSL(this.blueprint.hue, 0.4, 0.75);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.5), emissive: color, emissiveIntensity: 0.28, roughness: 0.75 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.05, roughness: 0.42, side: THREE.DoubleSide });
    // GLSL emission varies along each leaf: a quieter base and luminous tip/vein.
    leafMaterial.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 vLeafUV;\n' + shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvLeafUV = uv;');
      shader.fragmentShader = 'varying vec2 vLeafUV;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float vein = exp(-abs(vLeafUV.x - 0.5) * 16.0);
        totalEmissiveRadiance *= 0.38 + 0.72 * pow(vLeafUV.y, 1.6) + 0.34 * vein;`);
    };
    leafMaterial.customProgramCacheKey = () => 'lumina-leaf-emission-v1';
    const petalMaterial = new THREE.MeshStandardMaterial({ color: petalColor, emissive: petalColor, emissiveIntensity: 1.65, roughness: 0.3, side: THREE.DoubleSide });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#fff4d2', emissive: '#fff4d2', emissiveIntensity: 2.2 });
    const seedMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.0 });
    this.materials = [stemMaterial, leafMaterial, petalMaterial, coreMaterial, seedMaterial];
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

  update(elapsed: number, lightsOn: boolean, duration: number): void {
    this.progress = Math.max(0, Math.min(1, (elapsed - this.born) / duration));
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
