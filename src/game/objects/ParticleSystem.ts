import * as THREE from 'three';

const MAX_PARTICLES = 500;

/**
 * Particle system backed by a single InstancedMesh — zero per-frame allocations,
 * one draw call. Dead particles are compacted to the front so `mesh.count` stays
 * accurate without holes.
 */
export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private vels       = new Float32Array(MAX_PARTICLES * 3);
  private lives      = new Float32Array(MAX_PARTICLES);
  private baseColors = new Float32Array(MAX_PARTICLES * 3);
  private count      = 0;

  // Scratch objects — never allocate in hot path
  private _mat   = new THREE.Matrix4();
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
  }

  spawn(position: THREE.Vector3, color: number) {
    this._color.set(color);
    const { r, g, b } = this._color;

    for (let i = 0; i < 20; i++) {
      if (this.count >= MAX_PARTICLES) break;
      const idx = this.count++;

      this.lives[idx]        = 1.0;
      this.vels[idx * 3]     = (Math.random() - 0.5) * 0.3;
      this.vels[idx * 3 + 1] = (Math.random() - 0.5) * 0.3;
      this.vels[idx * 3 + 2] = (Math.random() - 0.5) * 0.3;
      this.baseColors[idx * 3]     = r;
      this.baseColors[idx * 3 + 1] = g;
      this.baseColors[idx * 3 + 2] = b;

      // Identity matrix with translation = position
      this._mat.identity();
      this._mat.elements[12] = position.x;
      this._mat.elements[13] = position.y;
      this._mat.elements[14] = position.z;
      this.mesh.setMatrixAt(idx, this._mat);
      this.mesh.setColorAt!(idx, this._color);
    }

    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  update() {
    let alive = 0;

    for (let i = 0; i < this.count; i++) {
      const life = this.lives[i] - 0.025;
      if (life <= 0) continue;

      // Fetch matrix, update position + uniform scale (no rotation needed)
      this.mesh.getMatrixAt(i, this._mat);
      const e = this._mat.elements;
      e[12] += this.vels[i * 3];
      e[13] += this.vels[i * 3 + 1];
      e[14] += this.vels[i * 3 + 2];
      e[0] = e[5] = e[10] = life;   // uniform scale = life

      // Compact into alive slot
      this.lives[alive]            = life;
      this.vels[alive * 3]         = this.vels[i * 3];
      this.vels[alive * 3 + 1]     = this.vels[i * 3 + 1];
      this.vels[alive * 3 + 2]     = this.vels[i * 3 + 2];
      this.baseColors[alive * 3]   = this.baseColors[i * 3];
      this.baseColors[alive * 3+1] = this.baseColors[i * 3+1];
      this.baseColors[alive * 3+2] = this.baseColors[i * 3+2];

      this.mesh.setMatrixAt(alive, this._mat);

      // Fade color to black as life decreases
      this._color.setRGB(
        this.baseColors[alive * 3]     * life,
        this.baseColors[alive * 3 + 1] * life,
        this.baseColors[alive * 3 + 2] * life,
      );
      this.mesh.setColorAt!(alive, this._color);

      alive++;
    }

    this.count = alive;
    this.mesh.count = alive;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }
}
