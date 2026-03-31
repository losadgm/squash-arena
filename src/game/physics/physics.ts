import * as THREE from 'three';
import { ROOM_W, ROOM_H, ROOM_D, BALL_RADIUS } from '../Constants';

export interface Room {
  width: number;
  height: number;
  depth: number;
}

export function resetBall(
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  towardsPlayer: boolean
) {
  ball.position.set(0, 0, 0);

  const angle = (Math.random() - 0.5) * 0.6;
  const yAngle = (Math.random() - 0.5) * 0.4;
  const zDir = towardsPlayer ? -1 : 1;
  ballDir.set(Math.sin(angle), Math.sin(yAngle), zDir).normalize();
}

export function moveBall(
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  ballSpeed: number,
  spawnImpact: (pos: THREE.Vector3, color: number) => void
): boolean {
  ball.position.x += ballDir.x * ballSpeed;
  ball.position.y += ballDir.y * ballSpeed;
  ball.position.z += ballDir.z * ballSpeed;

  const wallLimitX = ROOM_W / 2 - BALL_RADIUS;
  const wallLimitY = ROOM_H / 2 - BALL_RADIUS;

  if (ball.position.x <= -wallLimitX) {
    ball.position.x = -wallLimitX;
    ballDir.x = Math.abs(ballDir.x);
    spawnImpact(ball.position.clone(), 0xcc00ff);
  } else if (ball.position.x >= wallLimitX) {
    ball.position.x = wallLimitX;
    ballDir.x = -Math.abs(ballDir.x);
    spawnImpact(ball.position.clone(), 0xcc00ff);
  }

  if (ball.position.y <= -wallLimitY) {
    ball.position.y = -wallLimitY;
    ballDir.y = Math.abs(ballDir.y);
    spawnImpact(ball.position.clone(), 0xcc00ff);
  } else if (ball.position.y >= wallLimitY) {
    ball.position.y = wallLimitY;
    ballDir.y = -Math.abs(ballDir.y);
    spawnImpact(ball.position.clone(), 0xcc00ff);
  }

  // Check for goals
  if (ball.position.z <= -(ROOM_D / 2) + BALL_RADIUS) {
    return true; // Opponent scores
  } else if (ball.position.z >= (ROOM_D / 2) - BALL_RADIUS) {
    return false; // Player scores (false means player, not opponent)
  }

  return null as any; // No score
}
