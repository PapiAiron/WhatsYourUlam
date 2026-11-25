import * as THREE from 'three';
import {
  createClayTexture,
  createTableLinenTexture,
  createWeaveTexture,
  createWoodTexture,
} from './proceduralTextures';

export type DioramaZone = 'overview' | 'palayok' | 'bowl' | 'basket';
export type DishPreset = 'adobo' | 'sinigang' | 'tinola' | 'munggo';

export interface ZoneMeta {
  id: DioramaZone;
  title: string;
  subtitle: string;
  costTag: string;
  cameraPos: [number, number, number];
  target: [number, number, number];
}

export const DIORAMA_ZONES: Record<DioramaZone, ZoneMeta> = {
  overview: {
    id: 'overview',
    title: 'Filipino Home Kitchen',
    subtitle: 'Plan meals by pack price, stovetop gear, and fresh trip windows.',
    costTag: '₱5,000 · 14 days · 4 people',
    cameraPos: [3.85, 2.75, 4.35],
    target: [0, 0.42, 0],
  },
  palayok: {
    id: 'palayok',
    title: 'Clay Palayok & Kalan',
    subtitle: 'One-pot stews simmered on a single burner with shared spices.',
    costTag: '₱138 / household pot',
    cameraPos: [-1.15, 1.95, 2.35],
    target: [-1.05, 0.55, -0.35],
  },
  bowl: {
    id: 'bowl',
    title: 'Served Meal Bowl',
    subtitle: 'Exact serving cost per plate from real pack fractions.',
    costTag: '₱34 / serving',
    cameraPos: [0.65, 1.45, 2.55],
    target: [0.15, 0.25, 0.85],
  },
  basket: {
    id: 'basket',
    title: 'Palengke Market Bayong',
    subtitle: 'Pack-aware grocery trips timed to refrigerator & room shelf life.',
    costTag: 'Zero wasted greens',
    cameraPos: [2.45, 1.75, 2.1],
    target: [1.35, 0.45, -0.25],
  },
};

export const DISH_COLORS: Record<
  DishPreset,
  { broth: number; meat: number; label: string; price: string }
> = {
  adobo: {
    broth: 0x5c2b14,
    meat: 0x7b3d1e,
    label: 'Chicken Adobo',
    price: '₱148 / meal',
  },
  sinigang: {
    broth: 0xc26c3b,
    meat: 0x9b5a3c,
    label: 'Pork Sinigang',
    price: '₱176 / meal',
  },
  tinola: {
    broth: 0xd49a2a,
    meat: 0xcaa36b,
    label: 'Tinolang Manok',
    price: '₱132 / meal',
  },
  munggo: {
    broth: 0x6f7f38,
    meat: 0x48582d,
    label: 'Ginisang Munggo',
    price: '₱84 / meal',
  },
};

export interface BuiltDioramaScene {
  root: THREE.Group;
  steamMeshes: THREE.Mesh[];
  brothMesh: THREE.Mesh;
  dishChunks: THREE.Mesh[];
  emberMat: THREE.MeshStandardMaterial;
  interactables: THREE.Object3D[];
  dispose: () => void;
}

export function buildKitchenDiorama(maxAniso: number): BuiltDioramaScene {
  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const woodTex = track(createWoodTexture(maxAniso));
  const clayTex = track(createClayTexture(maxAniso));
  const weaveTex = track(createWeaveTexture(maxAniso));
  const linenTex = track(createTableLinenTexture(maxAniso));

  const clayMat = track(
    new THREE.MeshStandardMaterial({
      map: clayTex,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const darkClayMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6f2d14,
      roughness: 0.85,
      metalness: 0.05,
    })
  );
  const woodMat = track(
    new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.58,
      metalness: 0.04,
    })
  );
  const weaveMat = track(
    new THREE.MeshStandardMaterial({
      map: weaveTex,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const ceramicMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfffbf3,
      roughness: 0.22,
      metalness: 0.05,
    })
  );
  const brassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd49a2a,
      roughness: 0.28,
      metalness: 0.82,
    })
  );
  const mossMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x48582d,
      roughness: 0.55,
      metalness: 0.03,
    })
  );
  const emberMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a140d,
      emissive: new THREE.Color(0xe65c1c),
      emissiveIntensity: 1.4,
      roughness: 0.9,
    })
  );

  // Ground Kitchen Countertop Slab + Tablecloth Runner
  const tableGeo = track(new THREE.CylinderGeometry(3.4, 3.55, 0.24, 48));
  const tableMat = track(
    new THREE.MeshStandardMaterial({
      map: linenTex,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.y = -0.12;
  tableMesh.receiveShadow = true;
  root.add(tableMesh);

  const rimGeo = track(new THREE.TorusGeometry(3.42, 0.055, 12, 64));
  const rimMesh = new THREE.Mesh(rimGeo, woodMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = -0.02;
  rimMesh.receiveShadow = true;
  root.add(rimMesh);

  // 1. PALAYOK & KALAN STOVE GROUP
  const palayokGroup = new THREE.Group();
  palayokGroup.position.set(-1.05, 0, -0.35);
  palayokGroup.userData.zone = 'palayok';

  // Kalan clay stove base
  const kalanPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.52, 0.26),
    new THREE.Vector2(0.6, 0.36),
    new THREE.Vector2(0.54, 0.38),
    new THREE.Vector2(0.45, 0.24),
    new THREE.Vector2(0.0, 0.24),
  ];
  const kalanGeo = track(new THREE.LatheGeometry(kalanPts, 28));
  const kalanMesh = new THREE.Mesh(kalanGeo, darkClayMat);
  kalanMesh.castShadow = true;
  kalanMesh.receiveShadow = true;
  palayokGroup.add(kalanMesh);

  // Glowing charcoal embers inside kalan
  const emberGeo = track(new THREE.DodecahedronGeometry(0.11, 0));
  for (let i = 0; i < 4; i += 1) {
    const ember = new THREE.Mesh(emberGeo, emberMat);
    const ang = (i / 4) * Math.PI * 2;
    ember.position.set(Math.cos(ang) * 0.16, 0.26, Math.sin(ang) * 0.16);
    palayokGroup.add(ember);
  }

  // Palayok rounded clay pot body
  const potPts = [
    new THREE.Vector2(0.0, 0.28),
    new THREE.Vector2(0.36, 0.3),
    new THREE.Vector2(0.58, 0.52),
    new THREE.Vector2(0.54, 0.76),
    new THREE.Vector2(0.42, 0.88),
    new THREE.Vector2(0.48, 0.94),
    new THREE.Vector2(0.43, 0.95),
  ];
  const potGeo = track(new THREE.LatheGeometry(potPts, 32));
  const potMesh = new THREE.Mesh(potGeo, clayMat);
  potMesh.castShadow = true;
  potMesh.receiveShadow = true;
  palayokGroup.add(potMesh);

  // Side lug handles
  const lugGeo = track(new THREE.TorusGeometry(0.1, 0.032, 10, 18, Math.PI));
  for (const side of [-1, 1]) {
    const lug = new THREE.Mesh(lugGeo, darkClayMat);
    lug.position.set(side * 0.53, 0.72, 0);
    lug.rotation.z = side * -Math.PI / 2;
    lug.castShadow = true;
    palayokGroup.add(lug);
  }

  // Tilted Palayok Lid + Wooden Knob
  const lidGroup = new THREE.Group();
  lidGroup.position.set(0.06, 0.96, -0.04);
  lidGroup.rotation.z = -0.18;
  const lidPts = [
    new THREE.Vector2(0.45, 0),
    new THREE.Vector2(0.36, 0.1),
    new THREE.Vector2(0.16, 0.17),
    new THREE.Vector2(0.0, 0.19),
  ];
  const lidGeo = track(new THREE.LatheGeometry(lidPts, 28));
  const lidMesh = new THREE.Mesh(lidGeo, clayMat);
  lidMesh.castShadow = true;
  lidGroup.add(lidMesh);

  const knobGeo = track(new THREE.CylinderGeometry(0.06, 0.045, 0.11, 14));
  const knobMesh = new THREE.Mesh(knobGeo, woodMat);
  knobMesh.position.y = 0.22;
  knobMesh.castShadow = true;
  lidGroup.add(knobMesh);
  palayokGroup.add(lidGroup);

  // Steam wisps
  const steamGeo = track(new THREE.SphereGeometry(0.08, 12, 12));
  const steamMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfffbf3,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
    })
  );
  const steamMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const puff = new THREE.Mesh(steamGeo, steamMat);
    puff.position.set(-0.15 + (i % 2) * 0.14, 1.15 + i * 0.18, 0.08);
    puff.scale.setScalar(0.7 + i * 0.18);
    palayokGroup.add(puff);
    steamMeshes.push(puff);
  }
  root.add(palayokGroup);

  // 2. SERVED MEAL BOWL & BANIG PLACEMAT GROUP
  const bowlGroup = new THREE.Group();
  bowlGroup.position.set(0.15, 0, 0.85);
  bowlGroup.userData.zone = 'bowl';

  const matGeo = track(new THREE.CylinderGeometry(0.82, 0.84, 0.024, 36));
  const placemat = new THREE.Mesh(matGeo, weaveMat);
  placemat.position.y = 0.012;
  placemat.receiveShadow = true;
  bowlGroup.add(placemat);

  const bowlPts = [
    new THREE.Vector2(0.0, 0.025),
    new THREE.Vector2(0.28, 0.025),
    new THREE.Vector2(0.46, 0.16),
    new THREE.Vector2(0.55, 0.36),
    new THREE.Vector2(0.52, 0.38),
    new THREE.Vector2(0.42, 0.18),
    new THREE.Vector2(0.0, 0.14),
  ];
  const bowlGeo = track(new THREE.LatheGeometry(bowlPts, 32));
  const bowlMesh = new THREE.Mesh(bowlGeo, ceramicMat);
  bowlMesh.castShadow = true;
  bowlMesh.receiveShadow = true;
  bowlGroup.add(bowlMesh);

  // Dish broth surface
  const brothGeo = track(new THREE.CylinderGeometry(0.47, 0.45, 0.04, 28));
  const brothMat = track(
    new THREE.MeshStandardMaterial({
      color: DISH_COLORS.adobo.broth,
      roughness: 0.16,
      metalness: 0.05,
    })
  );
  const brothMesh = new THREE.Mesh(brothGeo, brothMat);
  brothMesh.position.y = 0.27;
  bowlGroup.add(brothMesh);

  // Steamed white rice mound + dish meat/veg pieces
  const riceGeo = track(new THREE.SphereGeometry(0.23, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58));
  const riceMesh = new THREE.Mesh(riceGeo, ceramicMat);
  riceMesh.position.set(-0.14, 0.22, 0.04);
  riceMesh.castShadow = true;
  bowlGroup.add(riceMesh);

  const chunkMat = track(
    new THREE.MeshStandardMaterial({
      color: DISH_COLORS.adobo.meat,
      roughness: 0.45,
    })
  );
  const chunkGeo = track(new THREE.DodecahedronGeometry(0.09, 1));
  const dishChunks: THREE.Mesh[] = [];
  const chunkPositions: [number, number, number][] = [
    [0.16, 0.31, -0.06],
    [0.22, 0.3, 0.14],
    [0.08, 0.31, 0.18],
  ];
  for (const pos of chunkPositions) {
    const ch = new THREE.Mesh(chunkGeo, chunkMat);
    ch.position.set(...pos);
    ch.castShadow = true;
    bowlGroup.add(ch);
    dishChunks.push(ch);
  }

  // Green leaf garnish + wooden spoon
  const garnishGeo = track(new THREE.BoxGeometry(0.14, 0.018, 0.06));
  const garnish = new THREE.Mesh(garnishGeo, mossMat);
  garnish.position.set(0.12, 0.36, 0.04);
  garnish.rotation.y = 0.5;
  bowlGroup.add(garnish);

  const spoonHandleGeo = track(new THREE.CylinderGeometry(0.02, 0.025, 0.58, 10));
  const spoonHandle = new THREE.Mesh(spoonHandleGeo, woodMat);
  spoonHandle.position.set(0.45, 0.24, 0.32);
  spoonHandle.rotation.z = 1.05;
  spoonHandle.rotation.y = -0.35;
  spoonHandle.castShadow = true;
  bowlGroup.add(spoonHandle);
  root.add(bowlGroup);

  // 3. ACACIA CHOPPING BOARD + PRODUCE
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-0.75, 0, 1.05);
  boardGroup.rotation.y = 0.28;
  boardGroup.userData.zone = 'bowl';

  const boardGeo = track(new THREE.BoxGeometry(0.95, 0.05, 0.62));
  const board = new THREE.Mesh(boardGeo, woodMat);
  board.position.y = 0.025;
  board.castShadow = true;
  board.receiveShadow = true;
  boardGroup.add(board);

  // Red onion + tomato + kalabasa wedge
  const onionMat = track(new THREE.MeshStandardMaterial({ color: 0x7b2d3b, roughness: 0.42 }));
  const onion = new THREE.Mesh(track(new THREE.SphereGeometry(0.1, 16, 14)), onionMat);
  onion.scale.set(1, 0.85, 1);
  onion.position.set(-0.22, 0.13, -0.08);
  onion.castShadow = true;
  boardGroup.add(onion);

  const squashMat = track(new THREE.MeshStandardMaterial({ color: 0xd49a2a, roughness: 0.5 }));
  const squash = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16, 1, false, 0, Math.PI * 0.7)),
    squashMat
  );
  squash.position.set(0.14, 0.11, 0.05);
  squash.rotation.x = Math.PI / 2;
  squash.castShadow = true;
  boardGroup.add(squash);

  const knifeBlade = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.36, 0.008, 0.09)),
    track(new THREE.MeshStandardMaterial({ color: 0xd7dde2, metalness: 0.88, roughness: 0.2 }))
  );
  knifeBlade.position.set(0.04, 0.058, -0.18);
  knifeBlade.rotation.y = -0.12;
  knifeBlade.castShadow = true;
  boardGroup.add(knifeBlade);
  root.add(boardGroup);

  // 4. PALENGKE BAYONG BASKET & BRASS SCALE GROUP
  const basketGroup = new THREE.Group();
  basketGroup.position.set(1.35, 0, -0.25);
  basketGroup.rotation.y = -0.4;
  basketGroup.userData.zone = 'basket';

  const basketGeo = track(new THREE.CylinderGeometry(0.46, 0.36, 0.56, 20));
  const basketMesh = new THREE.Mesh(basketGeo, weaveMat);
  basketMesh.position.y = 0.28;
  basketMesh.castShadow = true;
  basketMesh.receiveShadow = true;
  basketGroup.add(basketMesh);

  // Basket handle arch
  const handleGeo = track(new THREE.TorusGeometry(0.36, 0.025, 8, 24, Math.PI));
  const handleMesh = new THREE.Mesh(handleGeo, woodMat);
  handleMesh.position.y = 0.56;
  handleMesh.castShadow = true;
  basketGroup.add(handleMesh);

  // Fresh greens popping out
  const leafGeo = track(new THREE.ConeGeometry(0.14, 0.36, 8));
  for (let i = 0; i < 4; i += 1) {
    const leaf = new THREE.Mesh(leafGeo, mossMat);
    leaf.position.set(-0.14 + i * 0.09, 0.62 + (i % 2) * 0.04, -0.05 + (i % 2) * 0.1);
    leaf.rotation.z = (i - 1.5) * 0.24;
    leaf.castShadow = true;
    basketGroup.add(leaf);
  }

  // Rice paper bag beside basket
  const sackGeo = track(new THREE.BoxGeometry(0.32, 0.42, 0.2));
  const sackMat = track(new THREE.MeshStandardMaterial({ color: 0xf7f1e5, roughness: 0.85 }));
  const sack = new THREE.Mesh(sackGeo, sackMat);
  sack.position.set(-0.56, 0.21, 0.25);
  sack.rotation.y = 0.3;
  sack.castShadow = true;
  basketGroup.add(sack);

  // Brass market scale beside basket
  const scaleBase = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.22, 0.16, 18)), brassMat);
  scaleBase.position.set(-0.08, 0.08, 0.68);
  scaleBase.castShadow = true;
  basketGroup.add(scaleBase);

  const scalePan = new THREE.Mesh(track(new THREE.CylinderGeometry(0.24, 0.18, 0.04, 20)), brassMat);
  scalePan.position.set(-0.08, 0.28, 0.68);
  scalePan.castShadow = true;
  basketGroup.add(scalePan);

  const scaleStem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 10)), brassMat);
  scaleStem.position.set(-0.08, 0.2, 0.68);
  basketGroup.add(scaleStem);

  root.add(basketGroup);

  return {
    root,
    steamMeshes,
    brothMesh,
    dishChunks,
    emberMat,
    interactables: [palayokGroup, bowlGroup, boardGroup, basketGroup],
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
