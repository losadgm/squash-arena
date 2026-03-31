import * as THREE from 'three';
import { ROOM_D } from '../Constants';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, -(ROOM_D / 2) - 8);
  camera.lookAt(0, 0, 0);
  return camera;
}
