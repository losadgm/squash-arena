import * as THREE from 'three';
import { BALL_RADIUS } from '../Constants';

export class TrailEffect {
  private count: number;
  private positions: Float32Array;
  private geo: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;
  private history: THREE.Vector3[] = [];
  private head = 0;

  constructor(scene: THREE.Scene, count = 40) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      sizes[i] = BALL_RADIUS * 4 * (1 - i / count);
      this.history.push(new THREE.Vector3());
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x00e5ff) } },
      vertexShader: `
        attribute float size;
        varying float vIndex;
        void main(){
          vIndex = float(gl_VertexID) / ${count.toFixed(1)};
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vIndex;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if(d > 0.5) discard;
          float alpha = (1.0 - vIndex) * smoothstep(0.5, 0.1, d) * 0.5;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Points(this.geo, this.mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
  }

  update(ballPosition: THREE.Vector3, glowColor: THREE.Color) {
    this.history[this.head].copy(ballPosition);
    this.head = (this.head + 1) % this.count;

    const p = this.positions;
    const h = this.history;
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const v = h[(this.head - 1 - i + n) % n];
      const o = i * 3;
      p[o] = v.x;
      p[o + 1] = v.y;
      p[o + 2] = v.z;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.mat.uniforms.uColor.value.copy(glowColor);
  }

  reset(ballPosition: THREE.Vector3) {
    for (let i = 0; i < this.count; i++) {
      this.history[i].copy(ballPosition);
    }
    this.head = 0;
  }
}
