import * as THREE from 'three';
import { PADDLE_W, PADDLE_H, PADDLE_THICK } from '../Constants';

export function createPaddle(color: number, emissiveColor: number) {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_THICK, 16, 16, 1);
  const mat = new THREE.MeshStandardMaterial({
    color, metalness: 0.4, roughness: 0.2,
    emissive: emissiveColor, emissiveIntensity: 0.4,
    transparent: true, opacity: 0.25,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  group.add(mesh);

  const edgesGeo = new THREE.EdgesGeometry(geo);
  const edgesMat = new THREE.LineBasicMaterial({ color: emissiveColor, transparent: true, opacity: 0.95 });
  group.add(new THREE.LineSegments(edgesGeo, edgesMat));

  return group;
}
