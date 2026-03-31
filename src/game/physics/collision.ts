import * as THREE from 'three';
import { PADDLE_W, PADDLE_H, PADDLE_THICK, BALL_RADIUS, MAX_BALL_SPEED, SPEED_INCREASE } from '../Constants';

const THRESHOLD = PADDLE_THICK / 2 + BALL_RADIUS;
const HALF_W = PADDLE_W / 2 + BALL_RADIUS;
const HALF_H = PADDLE_H / 2 + BALL_RADIUS;
const HALF_PW = PADDLE_W / 2;
const HALF_PH = PADDLE_H / 2;
const _impactPos = new THREE.Vector3();

export function checkPaddleCollision(
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  ballSpeed: number,
  paddle: THREE.Group,
  isPlayer: boolean,
  spawnImpact: (pos: THREE.Vector3, color: number) => void
): number {
  const pz = paddle.position.z;
  const bz = ball.position.z;

  if (isPlayer) {
    if (bz - THRESHOLD > pz || bz + THRESHOLD < pz) return ballSpeed;
  } else {
    if (bz + THRESHOLD < pz || bz - THRESHOLD > pz) return ballSpeed;
  }

  const dx = ball.position.x - paddle.position.x;
  const dy = ball.position.y - paddle.position.y;

  if (Math.abs(dx) < HALF_W && Math.abs(dy) < HALF_H) {
    ballDir.z *= -1;
    ballDir.x += (dx / HALF_PW) * 0.4;
    ballDir.y += (dy / HALF_PH) * 0.3;
    ballDir.normalize();

    ballSpeed = Math.min(ballSpeed + SPEED_INCREASE, MAX_BALL_SPEED);

    ball.position.z = isPlayer ? pz + THRESHOLD + 0.01 : pz - THRESHOLD - 0.01;

    _impactPos.copy(ball.position);
    spawnImpact(_impactPos, isPlayer ? 0x00e5ff : 0xff3d71);
    return ballSpeed;
  }

  return ballSpeed;
}
