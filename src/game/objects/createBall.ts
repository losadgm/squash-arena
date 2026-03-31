import * as THREE from 'three';
import { BALL_RADIUS } from '../Constants';

export function createBall() {
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.3, roughness: 0.1,
    emissive: 0xffffff, emissiveIntensity: 0.8,
  });
  const ball = new THREE.Mesh(ballGeo, ballMat);
  ball.castShadow = true;

  const ballGlow = new THREE.PointLight(0xffffff, 3, 8);
  ball.add(ballGlow);

  return { ball, ballMat, ballGlow };
}
