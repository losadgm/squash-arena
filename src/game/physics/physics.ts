import * as THREE from 'three';
import { ROOM_W, ROOM_H, ROOM_D, BALL_RADIUS } from '../Constants';

const WALL_X = ROOM_W / 2 - BALL_RADIUS;
const WALL_Y = ROOM_H / 2 - BALL_RADIUS;
const GOAL_NEAR = -(ROOM_D / 2) + BALL_RADIUS;
const GOAL_FAR = (ROOM_D / 2) - BALL_RADIUS;
const _impactPos = new THREE.Vector3();

export function resetBall(
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  towardsPlayer: boolean
) {
  ball.position.set(0, 0, 0);
  const angle = (Math.random() - 0.5) * 0.6;
  const yAngle = (Math.random() - 0.5) * 0.4;
  ballDir.set(Math.sin(angle), Math.sin(yAngle), towardsPlayer ? -1 : 1).normalize();
}

export function moveBall(
  ball: THREE.Mesh,
  ballDir: THREE.Vector3,
  ballSpeed: number,
  spawnImpact: (pos: THREE.Vector3, color: number) => void
): boolean {
  const pos = ball.position;
  pos.x += ballDir.x * ballSpeed;
  pos.y += ballDir.y * ballSpeed;
  pos.z += ballDir.z * ballSpeed;

  if (pos.x <= -WALL_X) {
    pos.x = -WALL_X;
    ballDir.x = Math.abs(ballDir.x);
    _impactPos.copy(pos);
    spawnImpact(_impactPos, 0xcc00ff);
  } else if (pos.x >= WALL_X) {
    pos.x = WALL_X;
    ballDir.x = -Math.abs(ballDir.x);
    _impactPos.copy(pos);
    spawnImpact(_impactPos, 0xcc00ff);
  }

  if (pos.y <= -WALL_Y) {
    pos.y = -WALL_Y;
    ballDir.y = Math.abs(ballDir.y);
    _impactPos.copy(pos);
    spawnImpact(_impactPos, 0xcc00ff);
  } else if (pos.y >= WALL_Y) {
    pos.y = WALL_Y;
    ballDir.y = -Math.abs(ballDir.y);
    _impactPos.copy(pos);
    spawnImpact(_impactPos, 0xcc00ff);
  }

  if (pos.z <= GOAL_NEAR) return true;
  if (pos.z >= GOAL_FAR) return false;
  return null as any;
}
