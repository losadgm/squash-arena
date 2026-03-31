import * as THREE from 'three';
import { ROOM_W, ROOM_H } from '../Constants';

export class FlashEffect {
  private alpha = 0;
  private decay = 0.02;
  private mat: THREE.MeshBasicMaterial;
  private mesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(ROOM_W * 2, ROOM_H * 2);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    scene.add(this.mesh);
  }

  trigger(color: number, alpha = 0.6, decay = 0.02) {
    this.alpha = alpha;
    this.decay = decay;
    this.mat.color.set(color);
  }

  update(cameraPos: THREE.Vector3) {
    if (this.alpha <= 0) return;
    this.alpha -= this.decay;
    this.mat.opacity = Math.max(0, this.alpha);
    this.mesh.position.copy(cameraPos);
    this.mesh.position.z += 1;
    this.mesh.lookAt(cameraPos);
  }
}
