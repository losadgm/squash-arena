import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

import {
  ROOM_W, ROOM_H, ROOM_D,
  PADDLE_W, PADDLE_H, PADDLE_THICK, PADDLE_MARGIN,
  BALL_RADIUS, INITIAL_BALL_SPEED, MAX_BALL_SPEED, SPEED_INCREASE,
  AI_SPEED, AI_REACTION_DIST, WIN_SCORE
} from './Constants';

import { useGameStore } from '../store/useGameStore';

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;

  private animationId: number = 0;
  private isDestroyed = false;

  private gameRunning = false;
  private playerScore = 0;
  private opponentScore = 0;
  private ballSpeed = INITIAL_BALL_SPEED;
  private ballDir = new THREE.Vector3(0, 0, 1);
  private mouseNDC = new THREE.Vector2(0, 0);

  // Objects
  private playerPaddle!: THREE.Group;
  private opponentPaddle!: THREE.Group;
  private ball!: THREE.Mesh;
  private ballMat!: THREE.MeshStandardMaterial;
  private ballGlow!: THREE.PointLight;

  // Trails
  private TRAIL_COUNT = 40;
  private trailPositions!: Float32Array;
  private trailGeo!: THREE.BufferGeometry;
  private trailMat!: THREE.ShaderMaterial;
  private trailHistory: THREE.Vector3[] = [];

  // Particles
  private particles: THREE.Mesh[] = [];
  private particleGeo = new THREE.SphereGeometry(0.06, 8, 8);

  // Flash
  private flashAlpha = 0;
  private flashColor = new THREE.Color();
  private flashMat!: THREE.MeshBasicMaterial;
  private flashMesh!: THREE.Mesh;

  constructor(container: HTMLElement) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050510, 0.018);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, -(ROOM_D / 2) - 8);
    this.camera.lookAt(0, 0, 0);

    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
      samples: 8,
      type: THREE.HalfFloatType
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2, 1.0, 0.35 // Higher threshold & strength for stable glow
    );
    this.composer.addPass(bloomPass);

    const smaaPass = new SMAAPass();
    this.composer.addPass(smaaPass);

    this.initLighting();
    this.initRoom();
    this.initPaddles();
    this.initBall();
    this.initFlash();

    this.onWindowResize = this.onWindowResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('mousemove', this.onMouseMove);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private initLighting() {
    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.8);
    this.scene.add(ambientLight);

    const stripLight1 = new THREE.RectAreaLight(0x00e5ff, 3, ROOM_W * 0.8, 1);
    stripLight1.position.set(0, ROOM_H / 2 - 0.1, -ROOM_D * 0.15);
    stripLight1.lookAt(0, 0, -ROOM_D * 0.15);
    this.scene.add(stripLight1);

    const stripLight2 = new THREE.RectAreaLight(0x7c4dff, 3, ROOM_W * 0.8, 1);
    stripLight2.position.set(0, ROOM_H / 2 - 0.1, ROOM_D * 0.15);
    stripLight2.lookAt(0, 0, ROOM_D * 0.15);
    this.scene.add(stripLight2);

  }

  private initRoom() {
    const group = new THREE.Group();

    // Floor
    const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 32, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a, metalness: 0.7, roughness: 0.3,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -ROOM_H / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 16, 32);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x060614, metalness: 0.8, roughness: 0.4,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = ROOM_H / 2;
    group.add(ceil);

    // Sidewalls
    const sideGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_H, 32, 16);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x08081e, metalness: 0.6, roughness: 0.4,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });

    const leftWall = new THREE.Mesh(sideGeo, sideMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -ROOM_W / 2;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(sideGeo, sideMat.clone());
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = ROOM_W / 2;
    group.add(rightWall);

    const backGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H, 16, 16);
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xff3d71, metalness: 0.5, roughness: 0.6,
      transparent: true, opacity: 0.15,
      emissive: 0xff3d71, emissiveIntensity: 0.15,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    });
    const backWall = new THREE.Mesh(backGeo, backMat);
    backWall.position.z = ROOM_D / 2;
    group.add(backWall);

    const frontMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, metalness: 0.5, roughness: 0.6,
      transparent: true, opacity: 0.08,
      emissive: 0x00e5ff, emissiveIntensity: 0.1,
    });
    const frontWall = new THREE.Mesh(backGeo.clone(), frontMat);
    frontWall.rotation.y = Math.PI;
    frontWall.position.z = -ROOM_D / 2;
    group.add(frontWall);

    // Custom rectangular grid clipped to arena floor (ROOM_W × ROOM_D)
    {
      const gridY = -ROOM_H / 2 + 0.12;
      const cellSize = ROOM_D / 40;
      const nZ = Math.round(ROOM_D / cellSize); // 40 cells along depth
      const nX = Math.round(ROOM_W / cellSize); // 20 cells along width
      const gridVerts: number[] = [];
      // Lines parallel to X axis (one per Z step)
      for (let i = 0; i <= nZ; i++) {
        const z = -ROOM_D / 2 + i * cellSize;
        gridVerts.push(-ROOM_W / 2, gridY, z, ROOM_W / 2, gridY, z);
      }
      // Lines parallel to Z axis (one per X step)
      for (let i = 0; i <= nX; i++) {
        const x = -ROOM_W / 2 + i * (ROOM_W / nX);
        gridVerts.push(x, gridY, -ROOM_D / 2, x, gridY, ROOM_D / 2);
      }
      const gridGeo = new THREE.BufferGeometry();
      gridGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridVerts), 3));
      const gridMat = new THREE.LineBasicMaterial({
        color: 0x2d2d8e, transparent: true, opacity: 0.8,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      group.add(new THREE.LineSegments(gridGeo, gridMat));
    }

    // Edges
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.6,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const edgeGeo = new THREE.BufferGeometry();
    const e = 0.05;
    const hw = ROOM_W / 2 - e, hh = ROOM_H / 2 - e, hd = ROOM_D / 2 - e;
    const edgeVerts = new Float32Array([
      -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd,
      hw, -hh, hd, -hw, -hh, hd, -hw, -hh, hd, -hw, -hh, -hd,
      -hw, hh, -hd, hw, hh, -hd, hw, hh, -hd, hw, hh, hd,
      hw, hh, hd, -hw, hh, hd, -hw, hh, hd, -hw, hh, -hd,
      -hw, -hh, -hd, -hw, hh, -hd, hw, -hh, -hd, hw, hh, -hd,
      hw, -hh, hd, hw, hh, hd, -hw, -hh, hd, -hw, hh, hd,
    ]);
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgeVerts, 3));
    group.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // Center line — placed above grid Y to prevent occlusion by grid perpendicular lines
    const centerLineMat = new THREE.LineBasicMaterial({
      color: 0x7c4dff, transparent: true, opacity: 0.4,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const clGeo = new THREE.BufferGeometry();
    clGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -hw, -hh + 0.2, 0, hw, -hh + 0.2, 0
    ]), 3));
    group.add(new THREE.LineSegments(clGeo, centerLineMat));

    this.scene.add(group);
  }

  private createPaddle(color: number, emissiveColor: number) {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(PADDLE_W, PADDLE_H, PADDLE_THICK, 16, 16, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: color, metalness: 0.4, roughness: 0.2,
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

  private initPaddles() {
    this.playerPaddle = this.createPaddle(0x004d66, 0x00e5ff);
    this.playerPaddle.position.z = -(ROOM_D / 2) + PADDLE_MARGIN;
    this.scene.add(this.playerPaddle);

    this.opponentPaddle = this.createPaddle(0x661430, 0xff3d71);
    this.opponentPaddle.position.z = (ROOM_D / 2) - PADDLE_MARGIN;
    this.scene.add(this.opponentPaddle);
  }

  private initBall() {
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.3, roughness: 0.1,
      emissive: 0xffffff, emissiveIntensity: 0.8,
    });
    this.ball = new THREE.Mesh(ballGeo, this.ballMat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);

    this.ballGlow = new THREE.PointLight(0xffffff, 3, 8);
    this.ball.add(this.ballGlow);

    this.trailPositions = new Float32Array(this.TRAIL_COUNT * 3);
    const trailSizes = new Float32Array(this.TRAIL_COUNT);
    for (let i = 0; i < this.TRAIL_COUNT; i++) {
      trailSizes[i] = BALL_RADIUS * 4 * (1 - i / this.TRAIL_COUNT);
      this.trailHistory.push(new THREE.Vector3());
    }
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));

    this.trailMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x00e5ff) } },
      vertexShader: `
        attribute float size;
        varying float vIndex;
        void main(){
          vIndex = float(gl_VertexID) / ${this.TRAIL_COUNT.toFixed(1)};
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vIndex;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          if(d > 0.5) discard;
          float alpha = (1.0 - vIndex) * smoothstep(0.5, 0.1, d) * 0.5;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const trailMesh = new THREE.Points(this.trailGeo, this.trailMat);
    this.scene.add(trailMesh);
  }

  private initFlash() {
    const flashGeo = new THREE.PlaneGeometry(ROOM_W * 2, ROOM_H * 2);
    this.flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    this.flashMesh = new THREE.Mesh(flashGeo, this.flashMat);
    this.flashMesh.position.z = -(ROOM_D / 2) + 2;
    this.scene.add(this.flashMesh);
  }

  private spawnImpact(position: THREE.Vector3, color: number) {
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
      const p = new THREE.Mesh(this.particleGeo, mat);
      p.position.copy(position);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      p.userData = { vel, life: 1.0 };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  private updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life -= 0.025;
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.position.add(p.userData.vel);
      (p.material as THREE.Material).opacity = p.userData.life;
      p.scale.setScalar(p.userData.life);
    }
  }

  private triggerFlash(color: number) {
    this.flashAlpha = 0.6;
    this.flashColor.set(color);
    this.flashMat.color.copy(this.flashColor);
  }

  private resetBall(towardsPlayer: boolean) {
    this.ball.position.set(0, 0, 0);
    this.ballSpeed = INITIAL_BALL_SPEED;

    const angle = (Math.random() - 0.5) * 0.6;
    const yAngle = (Math.random() - 0.5) * 0.4;
    const zDir = towardsPlayer ? -1 : 1;
    this.ballDir.set(Math.sin(angle), Math.sin(yAngle), zDir).normalize();

    for (let i = 0; i < this.TRAIL_COUNT; i++) {
      this.trailHistory[i].copy(this.ball.position);
    }

    useGameStore.getState().setSpeed(0);
  }

  private score(who: 'player' | 'opponent') {
    if (who === 'player') {
      this.playerScore++;
      this.triggerFlash(0x00e5ff);
    } else {
      this.opponentScore++;
      this.triggerFlash(0xff3d71);
    }

    useGameStore.getState().setScore(this.playerScore, this.opponentScore);

    if (this.playerScore >= WIN_SCORE || this.opponentScore >= WIN_SCORE) {
      this.gameRunning = false;
      const won = this.playerScore >= WIN_SCORE;
      useGameStore.getState().setGameOver(won ? 'YOU WIN!' : 'YOU LOSE', won);
      return;
    }

    this.resetBall(who === 'opponent');
  }

  private checkPaddleCollision(paddle: THREE.Group, isPlayer: boolean) {
    const pz = paddle.position.z;
    const bz = this.ball.position.z;
    const threshold = PADDLE_THICK / 2 + BALL_RADIUS;

    if (isPlayer) {
      if (bz - threshold > pz) return false;
      if (bz + threshold < pz) return false;
    } else {
      if (bz + threshold < pz) return false;
      if (bz - threshold > pz) return false;
    }

    const dx = this.ball.position.x - paddle.position.x;
    const dy = this.ball.position.y - paddle.position.y;
    const halfW = PADDLE_W / 2 + BALL_RADIUS;
    const halfH = PADDLE_H / 2 + BALL_RADIUS;

    if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      this.ballDir.z *= -1;
      this.ballDir.x += (dx / (PADDLE_W / 2)) * 0.4;
      this.ballDir.y += (dy / (PADDLE_H / 2)) * 0.3;
      this.ballDir.normalize();

      this.ballSpeed = Math.min(this.ballSpeed + SPEED_INCREASE, MAX_BALL_SPEED);
      useGameStore.getState().setSpeed(((this.ballSpeed - INITIAL_BALL_SPEED) / (MAX_BALL_SPEED - INITIAL_BALL_SPEED)) * 100);

      if (isPlayer) {
        this.ball.position.z = pz + threshold + 0.01;
      } else {
        this.ball.position.z = pz - threshold - 0.01;
      }

      this.spawnImpact(this.ball.position.clone(), isPlayer ? 0x00e5ff : 0xff3d71);
      return true;
    }
    return false;
  }

  private updateAI() {
    const paddle = this.opponentPaddle;
    const halfW = ROOM_W / 2 - PADDLE_W / 2;
    const halfH = ROOM_H / 2 - PADDLE_H / 2;

    if (this.ballDir.z > 0 && this.ball.position.z > -AI_REACTION_DIST) {
      const dx = this.ball.position.x - paddle.position.x;
      const dy = this.ball.position.y - paddle.position.y;
      const jitter = (Math.random() - 0.5) * 0.03;
      const speed = AI_SPEED * (0.7 + this.ballSpeed / MAX_BALL_SPEED * 0.3);

      paddle.position.x += Math.sign(dx + jitter) * Math.min(Math.abs(dx), speed);
      paddle.position.y += Math.sign(dy + jitter) * Math.min(Math.abs(dy), speed);
    } else {
      paddle.position.x += (0 - paddle.position.x) * 0.02;
      paddle.position.y += (0 - paddle.position.y) * 0.02;
    }

    paddle.position.x = THREE.MathUtils.clamp(paddle.position.x, -halfW, halfW);
    paddle.position.y = THREE.MathUtils.clamp(paddle.position.y, -halfH, halfH);
  }

  private onMouseMove(e: MouseEvent) {
    this.mouseNDC.x = -((e.clientX / window.innerWidth) * 2 - 1);
    this.mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  private onWindowResize() {
    if (this.isDestroyed) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const dpr = this.renderer.getPixelRatio();
    this.composer.setSize(w * dpr, h * dpr);
  }

  public startGame() {
    this.playerScore = 0;
    this.opponentScore = 0;
    useGameStore.getState().setScore(this.playerScore, this.opponentScore);
    this.gameRunning = true;
    this.resetBall(false);
  }

  private animate() {
    if (this.isDestroyed) return;
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameRunning) {
      const halfW = ROOM_W / 2 - PADDLE_W / 2;
      const halfH = ROOM_H / 2 - PADDLE_H / 2;
      const targetX = this.mouseNDC.x * halfW;
      const targetY = this.mouseNDC.y * halfH;

      this.playerPaddle.position.x += (targetX - this.playerPaddle.position.x) * 0.15;
      this.playerPaddle.position.y += (targetY - this.playerPaddle.position.y) * 0.15;
      this.playerPaddle.position.x = THREE.MathUtils.clamp(this.playerPaddle.position.x, -halfW, halfW);
      this.playerPaddle.position.y = THREE.MathUtils.clamp(this.playerPaddle.position.y, -halfH, halfH);

      this.camera.position.x = this.playerPaddle.position.x * 0.05;
      this.camera.position.y = this.playerPaddle.position.y * 0.05;
      this.camera.position.z = -(ROOM_D / 2) - 8;
      this.camera.lookAt(0, 0, 0);

      this.updateAI();

      this.ball.position.x += this.ballDir.x * this.ballSpeed;
      this.ball.position.y += this.ballDir.y * this.ballSpeed;
      this.ball.position.z += this.ballDir.z * this.ballSpeed;

      const wallLimitX = ROOM_W / 2 - BALL_RADIUS;
      const wallLimitY = ROOM_H / 2 - BALL_RADIUS;

      if (this.ball.position.x <= -wallLimitX) {
        this.ball.position.x = -wallLimitX;
        this.ballDir.x = Math.abs(this.ballDir.x);
        this.spawnImpact(this.ball.position.clone(), 0x7c4dff);
      } else if (this.ball.position.x >= wallLimitX) {
        this.ball.position.x = wallLimitX;
        this.ballDir.x = -Math.abs(this.ballDir.x);
        this.spawnImpact(this.ball.position.clone(), 0x7c4dff);
      }

      if (this.ball.position.y <= -wallLimitY) {
        this.ball.position.y = -wallLimitY;
        this.ballDir.y = Math.abs(this.ballDir.y);
        this.spawnImpact(this.ball.position.clone(), 0x7c4dff);
      } else if (this.ball.position.y >= wallLimitY) {
        this.ball.position.y = wallLimitY;
        this.ballDir.y = -Math.abs(this.ballDir.y);
        this.spawnImpact(this.ball.position.clone(), 0x7c4dff);
      }

      this.checkPaddleCollision(this.playerPaddle, true);
      this.checkPaddleCollision(this.opponentPaddle, false);

      if (this.ball.position.z <= -(ROOM_D / 2) + BALL_RADIUS) {
        this.score('opponent');
      } else if (this.ball.position.z >= (ROOM_D / 2) - BALL_RADIUS) {
        this.score('player');
      }

      const t = (this.ball.position.z + ROOM_D / 2) / ROOM_D;
      const glowColor = new THREE.Color().lerpColors(
        new THREE.Color(0x00e5ff),
        new THREE.Color(0xff3d71),
        t
      );
      this.ballMat.emissive.copy(glowColor);
      this.ballGlow.color.copy(glowColor);
      this.trailMat.uniforms.uColor.value.copy(glowColor);

      this.trailHistory.unshift(this.ball.position.clone());
      this.trailHistory.pop();
      for (let i = 0; i < this.TRAIL_COUNT; i++) {
        this.trailPositions[i * 3] = this.trailHistory[i].x;
        this.trailPositions[i * 3 + 1] = this.trailHistory[i].y;
        this.trailPositions[i * 3 + 2] = this.trailHistory[i].z;
      }
      this.trailGeo.attributes.position.needsUpdate = true;
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.02;
      this.flashMat.opacity = Math.max(0, this.flashAlpha);
      this.flashMesh.position.copy(this.camera.position);
      this.flashMesh.position.z += 1;
      this.flashMesh.lookAt(this.camera.position);
    }

    this.updateParticles();

    this.ball.rotation.x += 0.03;
    this.ball.rotation.y += 0.02;

    if (this.gameRunning) {
      const tiltX = (this.ball.position.x - this.playerPaddle.position.x) * 0.02;
      const tiltY = (this.ball.position.y - this.playerPaddle.position.y) * 0.02;
      this.playerPaddle.rotation.y = tiltX;
      this.playerPaddle.rotation.x = -tiltY;

      this.opponentPaddle.rotation.y = -tiltX * 0.5;
      this.opponentPaddle.rotation.x = tiltY * 0.5;
    }

    this.composer.render();
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('mousemove', this.onMouseMove);
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
