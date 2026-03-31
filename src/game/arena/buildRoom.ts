import * as THREE from 'three';
import { ROOM_W, ROOM_H, ROOM_D } from '../Constants';

// Vaporwave palette
const VP_GRID = 0xcc00ff;
const VP_EDGES = 0xff44cc;

export function buildVaporwaveBackground(scene: THREE.Scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0d0221');
  grad.addColorStop(0.45, '#1e0540');
  grad.addColorStop(0.75, '#4a0066');
  grad.addColorStop(1, '#7a0050');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  scene.background = new THREE.CanvasTexture(canvas);
}

// Creates a vaporwave wall texture: gradient bg + grid scanlines
function makeWallTex(wPx: number, hPx: number, cols: number, rows: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d')!;

  // Gradient base: deep purple top → magenta-purple bottom
  const grad = ctx.createLinearGradient(0, 0, 0, hPx);
  grad.addColorStop(0, '#0d0221');
  grad.addColorStop(0.6, '#1e0440');
  grad.addColorStop(1, '#3a0055');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, wPx, hPx);

  // Grid lines
  const cellW = wPx / cols;
  const cellH = hPx / rows;

  ctx.strokeStyle = 'rgba(204, 0, 255, 0.25)';
  ctx.lineWidth = 1;
  for (let x = cellW; x < wPx; x += cellW) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, hPx); ctx.stroke();
  }
  for (let y = cellH; y < hPx; y += cellH) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wPx, y); ctx.stroke();
  }

  // Faint horizontal highlight bands near bottom (vaporwave sun effect)
  for (let i = 0; i < 4; i++) {
    const y = hPx * (0.75 + i * 0.065);
    ctx.strokeStyle = `rgba(255, 68, 204, ${0.18 - i * 0.04})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(wPx, y); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function buildRoom(scene: THREE.Scene) {
  const group = new THREE.Group();

  // Floor
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0d0221, metalness: 0.7, roughness: 0.3,
    emissive: 0x1a0035, emissiveIntensity: 0.3,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -ROOM_H / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling — textured
  const ceilTex = makeWallTex(512, 256, 16, 8);
  const ceilGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 1, 1);
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex, metalness: 0.6, roughness: 0.5,
    emissive: 0x1a0035, emissiveIntensity: 0.25,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const ceil = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = ROOM_H / 2;
  group.add(ceil);

  // Sidewalls — textured (ROOM_D wide × ROOM_H tall → 40 cols × 12 rows)
  const sideTex = makeWallTex(512, 192, 40, 12);
  const sideGeo = new THREE.PlaneGeometry(ROOM_D, ROOM_H, 1, 1);
  const sideMat = new THREE.MeshStandardMaterial({
    map: sideTex, metalness: 0.5, roughness: 0.5,
    emissive: 0x1a0035, emissiveIntensity: 0.3,
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

  // Back wall (opponent — hot pink glow)
  const backGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_H, 1, 1);
  const backMat = new THREE.MeshStandardMaterial({
    color: 0xff3d71, metalness: 0.5, roughness: 0.6,
    transparent: true, opacity: 0.15,
    emissive: 0xff3d71, emissiveIntensity: 0.5,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  const backWall = new THREE.Mesh(backGeo, backMat);
  backWall.position.z = ROOM_D / 2;
  group.add(backWall);

  // Front wall (player — cyan glow)
  const frontMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff, metalness: 0.5, roughness: 0.6,
    transparent: true, opacity: 0.08,
    emissive: 0x00e5ff, emissiveIntensity: 0.3,
  });
  const frontWall = new THREE.Mesh(backGeo.clone(), frontMat);
  frontWall.rotation.y = Math.PI;
  frontWall.position.z = -ROOM_D / 2;
  group.add(frontWall);

  // Floor grid — clipped inside walls
  {
    const gridY = -ROOM_H / 2 + 0.01;
    const cellSize = ROOM_D / 40;
    const nZ = Math.round(ROOM_D / cellSize);
    const nX = Math.round(ROOM_W / cellSize);
    const eps = 0.08;
    const xMin = -ROOM_W / 2 + eps, xMax = ROOM_W / 2 - eps;
    const zMin = -ROOM_D / 2 + eps, zMax = ROOM_D / 2 - eps;
    const gridVerts: number[] = [];

    for (let i = 1; i < nZ; i++) {
      const z = -ROOM_D / 2 + i * cellSize;
      gridVerts.push(xMin, gridY, z, xMax, gridY, z);
    }
    for (let i = 1; i < nX; i++) {
      const x = -ROOM_W / 2 + i * (ROOM_W / nX);
      gridVerts.push(x, gridY, zMin, x, gridY, zMax);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridVerts), 3));
    const gridLines = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({
      color: VP_GRID, transparent: true, opacity: 0.65,
      depthTest: false, depthWrite: false,
    }));
    gridLines.renderOrder = 1;
    group.add(gridLines);

    // Midfield net — same style as paddles: thin box + translucent fill + edges outline
    const netH = ROOM_H * 0.18;
    const netW = xMax - xMin;
    const netThick = 0.08;
    const netGeo = new THREE.BoxGeometry(netW, netH, netThick);

    const netFillMat = new THREE.MeshStandardMaterial({
      color: VP_GRID, emissive: VP_GRID, emissiveIntensity: 0.4,
      metalness: 0.4, roughness: 0.2,
      transparent: true, opacity: 0.5,
      depthWrite: false,
    });
    const netMesh = new THREE.Mesh(netGeo, netFillMat);
    netMesh.position.set(0, -ROOM_H / 2 + netH / 2, 0);
    netMesh.renderOrder = -1;
    group.add(netMesh);

    const netEdges = new THREE.LineSegments(new THREE.EdgesGeometry(netGeo),
      new THREE.LineBasicMaterial({ color: VP_GRID, transparent: true, opacity: 0.95 }));
    netEdges.position.copy(netMesh.position);
    group.add(netEdges);
  }

  // Arena edge lines — e=0 so they sit exactly on the walls, depthTest:false to stay visible
  const edgeMat = new THREE.LineBasicMaterial({
    color: VP_EDGES, transparent: true, opacity: 0.85,
    depthTest: false, depthWrite: false,
  });
  const edgeGeo = new THREE.BufferGeometry();
  const hw = ROOM_W / 2, hh = ROOM_H / 2, hd = ROOM_D / 2;
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    -hw, -hh, -hd, hw, -hh, -hd, hw, -hh, -hd, hw, -hh, hd,
    hw, -hh, hd, -hw, -hh, hd, -hw, -hh, hd, -hw, -hh, -hd,
    -hw, hh, -hd, hw, hh, -hd, hw, hh, -hd, hw, hh, hd,
    hw, hh, hd, -hw, hh, hd, -hw, hh, hd, -hw, hh, -hd,
    -hw, -hh, -hd, -hw, hh, -hd, hw, -hh, -hd, hw, hh, -hd,
    hw, -hh, hd, hw, hh, hd, -hw, -hh, hd, -hw, hh, hd,
  ]), 3));
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  scene.add(group);
}
