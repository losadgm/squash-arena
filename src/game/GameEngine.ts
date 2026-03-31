import * as THREE from 'three';
import { ROOM_W, ROOM_H, ROOM_D, BALL_RADIUS, INITIAL_BALL_SPEED, MAX_BALL_SPEED, WIN_SCORE, PADDLE_MARGIN, PADDLE_W, PADDLE_H } from './Constants';
import { createRenderer } from './scene/createRenderer';
import { createCamera } from './scene/createCamera';
import { buildLighting } from './arena/buildLighting';
import { buildRoom, buildVaporwaveBackground } from './arena/buildRoom';
import { createPaddle } from './objects/createPaddle';
import { createBall } from './objects/createBall';
import { TrailEffect } from './objects/TrailEffect';
import { ParticleSystem } from './objects/ParticleSystem';
import { FlashEffect } from './objects/FlashEffect';
import { resetBall, moveBall } from './physics/physics';
import { checkPaddleCollision } from './physics/collision';
import { updateAI } from './ai/aiController';
import { InputHandler } from './input/inputHandler';
import { useGameStore } from '../store/useGameStore';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private playerPaddle!: THREE.Group;
  private opponentPaddle!: THREE.Group;
  private ball!: THREE.Mesh;
  private ballMat!: THREE.MeshStandardMaterial;
  private ballGlow!: THREE.PointLight;

  private ballDir = new THREE.Vector3(0, 0, 1);
  private ballSpeed = INITIAL_BALL_SPEED;
  private playerScore = 0;
  private opponentScore = 0;
  private gameRunning = false;

  // Cached scratch objects — never allocate in the hot loop
  private _glowColor = new THREE.Color();
  private _colorA = new THREE.Color(0x00e5ff);
  private _colorB = new THREE.Color(0xff3d71);

  private trailEffect!: TrailEffect;
  private particleSystem!: ParticleSystem;
  private flashEffect!: FlashEffect;
  private inputHandler!: InputHandler;

  private animationId: number = 0;
  private isDestroyed = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1e0540, 0.016);

    this.camera = createCamera();
    this.scene.add(this.camera);

    const { renderer, composer } = createRenderer(container, this.scene, this.camera);
    this.renderer = renderer;
    this.composer = composer;

    buildLighting(this.scene);
    buildVaporwaveBackground(this.scene);
    buildRoom(this.scene);

    this.playerPaddle = createPaddle(0x004d66, 0x00e5ff);
    this.playerPaddle.position.z = -(ROOM_D / 2) + PADDLE_MARGIN;
    this.scene.add(this.playerPaddle);

    this.opponentPaddle = createPaddle(0x661430, 0xff3d71);
    this.opponentPaddle.position.z = (ROOM_D / 2) - PADDLE_MARGIN;
    this.scene.add(this.opponentPaddle);

    const { ball, ballMat, ballGlow } = createBall();
    this.ball = ball;
    this.ballMat = ballMat;
    this.ballGlow = ballGlow;
    this.scene.add(this.ball);

    this.trailEffect = new TrailEffect(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);
    this.flashEffect = new FlashEffect(this.scene);

    this.inputHandler = new InputHandler((w, h) => this.onWindowResize(w, h));

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public startGame() {
    this.playerScore = 0;
    this.opponentScore = 0;
    useGameStore.getState().setScore(this.playerScore, this.opponentScore);
    this.gameRunning = true;
    this.ballSpeed = INITIAL_BALL_SPEED;
    resetBall(this.ball, this.ballDir, false);
    this.trailEffect.reset(this.ball.position);
    useGameStore.getState().setSpeed(0);
  }

  private score(who: 'player' | 'opponent') {
    if (who === 'player') {
      this.playerScore++;
      this.flashEffect.trigger(0x00e5ff, 0.3, 0.006);
    } else {
      this.opponentScore++;
      this.flashEffect.trigger(0xff3d71, 0.6, 0.02);
    }

    useGameStore.getState().setScore(this.playerScore, this.opponentScore);

    if (this.playerScore >= WIN_SCORE || this.opponentScore >= WIN_SCORE) {
      this.gameRunning = false;
      const won = this.playerScore >= WIN_SCORE;
      useGameStore.getState().setGameOver(won ? 'YOU WIN!' : 'YOU LOSE', won);
      return;
    }

    this.ballSpeed = INITIAL_BALL_SPEED;
    resetBall(this.ball, this.ballDir, who === 'opponent');
    this.trailEffect.reset(this.ball.position);
    useGameStore.getState().setSpeed(0);
  }

  private onWindowResize(w: number, h: number) {
    if (this.isDestroyed) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const dpr = this.renderer.getPixelRatio();
    this.composer.setSize(w * dpr, h * dpr);
  }

  private animate() {
    if (this.isDestroyed) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameRunning) {
      // Update player paddle
      const halfW = ROOM_W / 2 - PADDLE_W / 2;
      const halfH = ROOM_H / 2 - PADDLE_H / 2;
      const targetX = this.inputHandler.mouseNDC.x * halfW;
      const targetY = this.inputHandler.mouseNDC.y * halfH;

      this.playerPaddle.position.x += (targetX - this.playerPaddle.position.x) * 0.15;
      this.playerPaddle.position.y += (targetY - this.playerPaddle.position.y) * 0.15;
      this.playerPaddle.position.x = THREE.MathUtils.clamp(this.playerPaddle.position.x, -halfW, halfW);
      this.playerPaddle.position.y = THREE.MathUtils.clamp(this.playerPaddle.position.y, -halfH, halfH);

      // Update camera
      this.camera.position.x = this.playerPaddle.position.x * 0.05;
      this.camera.position.y = this.playerPaddle.position.y * 0.05;
      this.camera.position.z = -(ROOM_D / 2) - 8;
      this.camera.lookAt(0, 0, 0);

      // Update AI
      updateAI(this.opponentPaddle, this.ball, this.ballDir, this.ballSpeed);

      // Update ball
      moveBall(this.ball, this.ballDir, this.ballSpeed, (pos, color) => {
        this.particleSystem.spawn(pos, color);
      });

      // Check for goals and paddle collisions
      const goalResult = this.checkGoal();
      if (goalResult !== null) {
        this.score(goalResult ? 'opponent' : 'player');
      } else {
        this.ballSpeed = checkPaddleCollision(
          this.ball,
          this.ballDir,
          this.ballSpeed,
          this.playerPaddle,
          true,
          (pos, color) => this.particleSystem.spawn(pos, color)
        );
        this.ballSpeed = checkPaddleCollision(
          this.ball,
          this.ballDir,
          this.ballSpeed,
          this.opponentPaddle,
          false,
          (pos, color) => this.particleSystem.spawn(pos, color)
        );
        useGameStore.getState().setSpeed(((this.ballSpeed - INITIAL_BALL_SPEED) / (MAX_BALL_SPEED - INITIAL_BALL_SPEED)) * 100);
      }

      // Update trail and ball color — no allocations
      const t = (this.ball.position.z + ROOM_D / 2) / ROOM_D;
      this._glowColor.lerpColors(this._colorA, this._colorB, t);
      this.ballMat.emissive.copy(this._glowColor);
      this.ballGlow.color.copy(this._glowColor);
      this.trailEffect.update(this.ball.position, this._glowColor);
    }

    // Update flash effect
    this.flashEffect.update(this.camera.position);

    // Update particles
    this.particleSystem.update();

    // Rotate ball
    this.ball.rotation.x += 0.03;
    this.ball.rotation.y += 0.02;

    // Tilt paddles
    if (this.gameRunning) {
      const tiltX = (this.ball.position.x - this.playerPaddle.position.x) * 0.02;
      const tiltY = (this.ball.position.y - this.playerPaddle.position.y) * 0.02;
      this.playerPaddle.rotation.y = tiltX;
      this.playerPaddle.rotation.x = -tiltY;

      const oppTiltX = (this.ball.position.x - this.opponentPaddle.position.x) * 0.06;
      const oppTiltY = (this.ball.position.y - this.opponentPaddle.position.y) * 0.06;
      this.opponentPaddle.rotation.y = -oppTiltX;
      this.opponentPaddle.rotation.x = oppTiltY;
    }

    this.composer.render();
  }

  private checkGoal(): boolean | null {
    if (this.ball.position.z <= -(ROOM_D / 2) + BALL_RADIUS) {
      return true; // Opponent scores
    } else if (this.ball.position.z >= (ROOM_D / 2) - BALL_RADIUS) {
      return false; // Player scores
    }
    return null;
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationId);
    this.inputHandler.destroy();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
