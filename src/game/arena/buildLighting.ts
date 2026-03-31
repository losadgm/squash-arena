import * as THREE from 'three';
import { ROOM_W, ROOM_D, ROOM_H } from '../Constants';

export function buildLighting(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0x1a1a3e, 0.8));

  const strip1 = new THREE.RectAreaLight(0x00e5ff, 3, ROOM_W * 0.8, 1);
  strip1.position.set(0, ROOM_H / 2 - 0.1, -ROOM_D * 0.15);
  strip1.lookAt(0, 0, -ROOM_D * 0.15);
  scene.add(strip1);

  const strip2 = new THREE.RectAreaLight(0x7c4dff, 3, ROOM_W * 0.8, 1);
  strip2.position.set(0, ROOM_H / 2 - 0.1, ROOM_D * 0.15);
  strip2.lookAt(0, 0, ROOM_D * 0.15);
  scene.add(strip2);
}
