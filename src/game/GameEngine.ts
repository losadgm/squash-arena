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
import { SoundEngine } from './audio/SoundEngine';
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

const HALF_PW = ROOM_W / 2 - PADDLE_W / 2;
const HALF_PH = ROOM_H / 2 - PADDLE_H / 2;
const SPEED_RANGE = MAX_BALL_SPEED - INITIAL_BALL_SPEED;
const SPEED_RANGE_INV = 1 / SPEED_RANGE;
const GOAL_NEAR = -(ROOM_D / 2) + BALL_RADIUS;
const GOAL_FAR = (ROOM_D / 2) - BALL_RADIUS;
const CAM_Z = -(ROOM_D / 2) - 8;
const ROOM_D_INV = 1 / ROOM_D;
const HALF_D = ROOM_D / 2;
const _lookAt = new THREE.Vector3(0, 0, 0);

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
  private lastSpeedPct = -1;

  private _glowColor = new THREE.Color();
  private _colorA = new THREE.Color(0x00e5ff);
  private _colorB = new THREE.Color(0xff3d71);

  private trailEffect!: TrailEffect;
  private particleSystem!: ParticleSystem;
  private flashEffect!: FlashEffect;
  private inputHandler!: InputHandler;
  private sound: SoundEngine;

  private animationId = 0;
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
    this.sound = new SoundEngine();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  startGame() {
    this.playerScore = 0;
    this.opponentScore = 0;
    this.lastSpeedPct = 0;
    useGameStore.getState().setScore(0, 0);
    this.gameRunning = true;
    this.ballSpeed = INITIAL_BALL_SPEED;
    resetBall(this.ball, this.ballDir, false);
    this.trailEffect.reset(this.ball.position);
    useGameStore.getState().setSpeed(0);
    this.sound.gameStart();
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
      this.sound.gameOver(won);
      useGameStore.getState().setGameOver(won ? 'YOU WIN!' : 'YOU LOSE', won);
      return;
    }

    this.sound.goal(who === 'player');
    this.ballSpeed = INITIAL_BALL_SPEED;
    this.lastSpeedPct = 0;
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

    const bp = this.ball.position;

    if (this.gameRunning) {
      const pp = this.playerPaddle.position;
      pp.x += (this.inputHandler.mouseNDC.x * HALF_PW - pp.x) * 0.15;
      pp.y += (this.inputHandler.mouseNDC.y * HALF_PH - pp.y) * 0.15;
      pp.x = THREE.MathUtils.clamp(pp.x, -HALF_PW, HALF_PW);
      pp.y = THREE.MathUtils.clamp(pp.y, -HALF_PH, HALF_PH);

      this.camera.position.x = pp.x * 0.05;
      this.camera.position.y = pp.y * 0.05;
      this.camera.position.z = CAM_Z;
      this.camera.lookAt(_lookAt);

      updateAI(this.opponentPaddle, this.ball, this.ballDir, this.ballSpeed);

      const speedNorm = (this.ballSpeed - INITIAL_BALL_SPEED) * SPEED_RANGE_INV;
      moveBall(this.ball, this.ballDir, this.ballSpeed, (pos, color) => {
        this.particleSystem.spawn(pos, color);
        this.sound.wallBounce(speedNorm);
      });

      if (bp.z <= GOAL_NEAR) {
        this.score('opponent');
      } else if (bp.z >= GOAL_FAR) {
        this.score('player');
      } else {
        let prev = this.ballSpeed;
        this.ballSpeed = checkPaddleCollision(
          this.ball, this.ballDir, this.ballSpeed,
          this.playerPaddle, true,
          (pos, color) => this.particleSystem.spawn(pos, color)
        );
        if (this.ballSpeed !== prev) this.sound.paddleHit(true, speedNorm);

        prev = this.ballSpeed;
        this.ballSpeed = checkPaddleCollision(
          this.ball, this.ballDir, this.ballSpeed,
          this.opponentPaddle, false,
          (pos, color) => this.particleSystem.spawn(pos, color)
        );
        if (this.ballSpeed !== prev) this.sound.paddleHit(false, speedNorm);

        const pct = Math.round((this.ballSpeed - INITIAL_BALL_SPEED) * SPEED_RANGE_INV * 100);
        if (pct !== this.lastSpeedPct) {
          this.lastSpeedPct = pct;
          useGameStore.getState().setSpeed(pct);
        }
      }

      const t = (bp.z + HALF_D) * ROOM_D_INV;
      this._glowColor.lerpColors(this._colorA, this._colorB, t);
      this.ballMat.emissive.copy(this._glowColor);
      this.ballGlow.color.copy(this._glowColor);
      this.trailEffect.update(bp, this._glowColor);
    }

    this.flashEffect.update(this.camera.position);
    this.particleSystem.update();

    this.ball.rotation.x += 0.03;
    this.ball.rotation.y += 0.02;

    if (this.gameRunning) {
      const ppPos = this.playerPaddle.position;
      this.playerPaddle.rotation.y = (bp.x - ppPos.x) * 0.02;
      this.playerPaddle.rotation.x = -(bp.y - ppPos.y) * 0.02;

      const opPos = this.opponentPaddle.position;
      this.opponentPaddle.rotation.y = -(bp.x - opPos.x) * 0.06;
      this.opponentPaddle.rotation.x = (bp.y - opPos.y) * 0.06;
    }

    this.composer.render();
  }

  destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationId);
    this.inputHandler.destroy();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.sound.destroy();
  }
}
