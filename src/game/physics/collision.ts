import * as THREE from 'three';
import { PADDLE_W, PADDLE_H, PADDLE_THICK, BALL_RADIUS, MAX_BALL_SPEED, SPEED_INCREASE } from '../Constants';

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
  const threshold = PADDLE_THICK / 2 + BALL_RADIUS;

  if (isPlayer) {
    if (bz - threshold > pz) return ballSpeed;
    if (bz + threshold < pz) return ballSpeed;
  } else {
    if (bz + threshold < pz) return ballSpeed;
    if (bz - threshold > pz) return ballSpeed;
  }

  const dx = ball.position.x - paddle.position.x;
  const dy = ball.position.y - paddle.position.y;
  const halfW = PADDLE_W / 2 + BALL_RADIUS;
  const halfH = PADDLE_H / 2 + BALL_RADIUS;

  if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
    ballDir.z *= -1;
    ballDir.x += (dx / (PADDLE_W / 2)) * 0.4;
    ballDir.y += (dy / (PADDLE_H / 2)) * 0.3;
    ballDir.normalize();

    ballSpeed = Math.min(ballSpeed + SPEED_INCREASE, MAX_BALL_SPEED);

    if (isPlayer) {
      ball.position.z = pz + threshold + 0.01;
    } else {
      ball.position.z = pz - threshold - 0.01;
    }

    spawnImpact(ball.position.clone(), isPlayer ? 0x00e5ff : 0xff3d71);
    return ballSpeed;
  }

  return ballSpeed;
}
