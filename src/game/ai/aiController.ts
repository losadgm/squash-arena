import * as THREE from 'three';
import { ROOM_W, ROOM_H, PADDLE_W, PADDLE_H, AI_SPEED, AI_REACTION_DIST, MAX_BALL_SPEED } from '../Constants';

export function updateAI(
  paddle: THREE.Group,
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  ballSpeed: number
) {
  const halfW = ROOM_W / 2 - PADDLE_W / 2;
  const halfH = ROOM_H / 2 - PADDLE_H / 2;

  if (ballDir.z > 0 && ball.position.z > -AI_REACTION_DIST) {
    const dx = ball.position.x - paddle.position.x;
    const dy = ball.position.y - paddle.position.y;
    const jitter = (Math.random() - 0.5) * 0.03;
    const speed = AI_SPEED * (0.7 + ballSpeed / MAX_BALL_SPEED * 0.3);

    paddle.position.x += Math.sign(dx + jitter) * Math.min(Math.abs(dx), speed);
    paddle.position.y += Math.sign(dy + jitter) * Math.min(Math.abs(dy), speed);
  } else {
    paddle.position.x += (0 - paddle.position.x) * 0.02;
    paddle.position.y += (0 - paddle.position.y) * 0.02;
  }

  paddle.position.x = THREE.MathUtils.clamp(paddle.position.x, -halfW, halfW);
  paddle.position.y = THREE.MathUtils.clamp(paddle.position.y, -halfH, halfH);
}
