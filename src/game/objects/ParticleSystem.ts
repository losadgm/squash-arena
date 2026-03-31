import * as THREE from 'three';

const MAX_PARTICLES = 500;

export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private matArr: Float32Array;
  private colorArr: Float32Array;
  private vels = new Float32Array(MAX_PARTICLES * 3);
  private lives = new Float32Array(MAX_PARTICLES);
  private baseColors = new Float32Array(MAX_PARTICLES * 3);
  private count = 0;
  private _color = new THREE.Color();

  constructor(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(0.06, 5, 4);
    const mat = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 3), 3
    );
    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.matArr = this.mesh.instanceMatrix.array as Float32Array;
    this.colorArr = (this.mesh.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array;
  }

  spawn(position: THREE.Vector3, color: number) {
    this._color.set(color);
    const { r, g, b } = this._color;

    for (let i = 0; i < 20; i++) {
      if (this.count >= MAX_PARTICLES) break;
      const idx = this.count++;
      const i16 = idx * 16;
      const i3 = idx * 3;

      this.lives[idx] = 1.0;
      this.vels[i3] = (Math.random() - 0.5) * 0.3;
      this.vels[i3 + 1] = (Math.random() - 0.5) * 0.3;
      this.vels[i3 + 2] = (Math.random() - 0.5) * 0.3;
      this.baseColors[i3] = r;
      this.baseColors[i3 + 1] = g;
      this.baseColors[i3 + 2] = b;

      this.matArr[i16] = 1; this.matArr[i16 + 1] = 0; this.matArr[i16 + 2] = 0; this.matArr[i16 + 3] = 0;
      this.matArr[i16 + 4] = 0; this.matArr[i16 + 5] = 1; this.matArr[i16 + 6] = 0; this.matArr[i16 + 7] = 0;
      this.matArr[i16 + 8] = 0; this.matArr[i16 + 9] = 0; this.matArr[i16 + 10] = 1; this.matArr[i16 + 11] = 0;
      this.matArr[i16 + 12] = position.x; this.matArr[i16 + 13] = position.y; this.matArr[i16 + 14] = position.z; this.matArr[i16 + 15] = 1;

      this.colorArr[i3] = r;
      this.colorArr[i3 + 1] = g;
      this.colorArr[i3 + 2] = b;
    }

    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  update() {
    const m = this.matArr;
    const c = this.colorArr;
    let alive = 0;

    for (let i = 0; i < this.count; i++) {
      const life = this.lives[i] - 0.025;
      if (life <= 0) continue;

      const i16 = i * 16;
      const i3 = i * 3;
      const a16 = alive * 16;
      const a3 = alive * 3;

      const px = m[i16 + 12] + this.vels[i3];
      const py = m[i16 + 13] + this.vels[i3 + 1];
      const pz = m[i16 + 14] + this.vels[i3 + 2];

      this.lives[alive] = life;

      if (alive !== i) {
        this.vels[a3] = this.vels[i3];
        this.vels[a3 + 1] = this.vels[i3 + 1];
        this.vels[a3 + 2] = this.vels[i3 + 2];
        this.baseColors[a3] = this.baseColors[i3];
        this.baseColors[a3 + 1] = this.baseColors[i3 + 1];
        this.baseColors[a3 + 2] = this.baseColors[i3 + 2];
      }

      m[a16] = m[a16 + 5] = m[a16 + 10] = life;
      m[a16 + 1] = 0; m[a16 + 2] = 0; m[a16 + 3] = 0;
      m[a16 + 4] = 0; m[a16 + 6] = 0; m[a16 + 7] = 0;
      m[a16 + 8] = 0; m[a16 + 9] = 0; m[a16 + 11] = 0;
      m[a16 + 12] = px; m[a16 + 13] = py; m[a16 + 14] = pz; m[a16 + 15] = 1;

      c[a3] = this.baseColors[a3] * life;
      c[a3 + 1] = this.baseColors[a3 + 1] * life;
      c[a3 + 2] = this.baseColors[a3 + 2] * life;

      alive++;
    }

    this.count = alive;
    this.mesh.count = alive;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }
}
