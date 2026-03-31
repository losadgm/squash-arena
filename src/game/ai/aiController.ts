import * as THREE from 'three';
import { ROOM_W, ROOM_H, PADDLE_W, PADDLE_H, AI_SPEED, AI_REACTION_DIST, MAX_BALL_SPEED } from '../Constants';

const HALF_W = ROOM_W / 2 - PADDLE_W / 2;
const HALF_H = ROOM_H / 2 - PADDLE_H / 2;
const INV_MAX_SPEED = 1 / MAX_BALL_SPEED;

export function updateAI(
  paddle: THREE.Group,
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  ballSpeed: number
) {
  const pos = paddle.position;

  if (ballDir.z > 0 && ball.position.z > -AI_REACTION_DIST) {
    const dx = ball.position.x - pos.x;
    const dy = ball.position.y - pos.y;
    const jitter = (Math.random() - 0.5) * 0.03;
    const speed = AI_SPEED * (0.7 + ballSpeed * INV_MAX_SPEED * 0.3);

    pos.x += Math.sign(dx + jitter) * Math.min(Math.abs(dx), speed);
    pos.y += Math.sign(dy + jitter) * Math.min(Math.abs(dy), speed);
  } else {
    pos.x *= 0.98;
    pos.y *= 0.98;
  }

  pos.x = THREE.MathUtils.clamp(pos.x, -HALF_W, HALF_W);
  pos.y = THREE.MathUtils.clamp(pos.y, -HALF_H, HALF_H);
}
