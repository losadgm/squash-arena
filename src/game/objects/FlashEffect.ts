import * as THREE from 'three';
import { ROOM_W, ROOM_H, ROOM_D } from '../Constants';

export class FlashEffect {
  private flashAlpha: number = 0;
  private decayRate: number = 0.02;
  private flashColor: THREE.Color = new THREE.Color();
  private flashMat: THREE.MeshBasicMaterial;
  private flashMesh: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    const flashGeo = new THREE.PlaneGeometry(ROOM_W * 2, ROOM_H * 2);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.flashMesh.position.z = -(ROOM_D / 2) + 2;
    scene.add(this.flashMesh);
  }

  trigger(color: number, alpha = 0.6, decayRate = 0.02) {
    this.flashAlpha = alpha;
    this.decayRate = decayRate;
    this.flashColor.set(color);
    this.flashMat.color.copy(this.flashColor);
  }

  update(cameraPos: THREE.Vector3) {
    if (this.flashAlpha > 0) {
      this.flashAlpha -= this.decayRate;
      this.flashMat.opacity = Math.max(0, this.flashAlpha);
      this.flashMesh.position.copy(cameraPos);
      this.flashMesh.position.z += 1;
      this.flashMesh.lookAt(cameraPos);
    }
  }
}
