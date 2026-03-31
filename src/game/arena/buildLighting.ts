import * as THREE from 'three';
import { ROOM_W, ROOM_D, ROOM_H } from '../Constants';

export function buildLighting(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.8);
  scene.add(ambientLight);

  const stripLight1 = new THREE.RectAreaLight(0x00e5ff, 3, ROOM_W * 0.8, 1);
  stripLight1.position.set(0, ROOM_H / 2 - 0.1, -ROOM_D * 0.15);
  stripLight1.lookAt(0, 0, -ROOM_D * 0.15);
  scene.add(stripLight1);

  const stripLight2 = new THREE.RectAreaLight(0x7c4dff, 3, ROOM_W * 0.8, 1);
  stripLight2.position.set(0, ROOM_H / 2 - 0.1, ROOM_D * 0.15);
  stripLight2.lookAt(0, 0, ROOM_D * 0.15);
  scene.add(stripLight2);
}
