import * as THREE from 'three';
import { BALL_RADIUS } from '../Constants';

/**
 * Circular buffer trail — no allocations per frame (no clone(), no unshift/pop).
 */
export class TrailEffect {
  private trailCount: number;
  private trailPositions: Float32Array;
  private trailGeo: THREE.BufferGeometry;
  private trailMat: THREE.ShaderMaterial;
  private trailHistory: THREE.Vector3[] = [];
  private trailMesh: THREE.Points;
  private head = 0; // index of the oldest slot (next to overwrite)

  constructor(scene: THREE.Scene, trailCount = 40) {
    this.trailCount = trailCount;
    this.trailPositions = new Float32Array(this.trailCount * 3);
    const trailSizes = new Float32Array(this.trailCount);

    for (let i = 0; i < this.trailCount; i++) {
      trailSizes[i] = BALL_RADIUS * 4 * (1 - i / this.trailCount);
      this.trailHistory.push(new THREE.Vector3());
    }

    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    this.trailMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x00e5ff) } },
      vertexShader: `
        attribute float size;
        varying float vIndex;
        void main(){
          vIndex = float(gl_VertexID) / ${this.trailCount.toFixed(1)};
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

    this.trailMesh = new THREE.Points(this.trailGeo, this.trailMat);
    this.trailMesh.frustumCulled = false;
    scene.add(this.trailMesh);
  }

  update(ballPosition: THREE.Vector3, glowColor: THREE.Color) {
    // Overwrite oldest slot with current position (circular buffer, no allocation)
    this.trailHistory[this.head].copy(ballPosition);
    this.head = (this.head + 1) % this.trailCount;

    // Write to buffer newest-first: head-1 is newest, head is oldest
    for (let i = 0; i < this.trailCount; i++) {
      const histIdx = (this.head - 1 - i + this.trailCount) % this.trailCount;
      this.trailPositions[i * 3]     = this.trailHistory[histIdx].x;
      this.trailPositions[i * 3 + 1] = this.trailHistory[histIdx].y;
      this.trailPositions[i * 3 + 2] = this.trailHistory[histIdx].z;
    }

    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailMat.uniforms.uColor.value.copy(glowColor);
  }

  reset(ballPosition: THREE.Vector3) {
    for (let i = 0; i < this.trailCount; i++) {
      this.trailHistory[i].copy(ballPosition);
    }
    this.head = 0;
  }
}
