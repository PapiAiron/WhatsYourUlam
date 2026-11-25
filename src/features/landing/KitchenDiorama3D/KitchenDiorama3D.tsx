import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import clsx from 'clsx';
import {
  buildKitchenDiorama,
  DIORAMA_ZONES,
  DISH_COLORS,
  type DioramaZone,
  type DishPreset,
} from './sceneBuilder';
import styles from './KitchenDiorama3D.module.css';

interface KitchenDiorama3DProps {
  className?: string;
}

export function KitchenDiorama3D({ className }: KitchenDiorama3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<DioramaZone>('overview');
  const [dish, setDish] = useState<DishPreset>('adobo');
  const [sceneReady, setSceneReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);

  const desiredTargetRef = useRef<{
    cam: THREE.Vector3;
    target: THREE.Vector3;
    transitioning: boolean;
  }>({
    cam: new THREE.Vector3(...DIORAMA_ZONES.overview.cameraPos),
    target: new THREE.Vector3(...DIORAMA_ZONES.overview.target),
    transitioning: false,
  });

  const dishRef = useRef<DishPreset>(dish);
  dishRef.current = dish;

  const selectZone = (next: DioramaZone) => {
    setZone(next);
    const meta = DIORAMA_ZONES[next];
    desiredTargetRef.current.cam.set(...meta.cameraPos);
    desiredTargetRef.current.target.set(...meta.target);
    desiredTargetRef.current.transitioning = true;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let rafId = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let built: ReturnType<typeof buildKitchenDiorama> | null = null;
    let envTarget: THREE.WebGLRenderTarget | null = null;
    let pmrem: THREE.PMREMGenerator | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let onPointerDown: ((e: PointerEvent) => void) | null = null;
    let onPointerUp: ((e: PointerEvent) => void) | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });

      const gl = renderer.getContext();
      if (!gl) {
        throw new Error('WebGL context unavailable');
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = debugInfo
        ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
        : '';
      const isSoftwareGl = /SwiftShader|llvmpipe|Software Rasterizer/i.test(rendererStr);

      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
      );
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.04;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth || 640, container.clientHeight || 460);

      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const bgHex = 0xf7f1e5;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.Fog(bgHex, 8.5, 16);

      pmrem = new THREE.PMREMGenerator(renderer);
      envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.62;

      const camera = new THREE.PerspectiveCamera(
        40,
        (container.clientWidth || 640) / (container.clientHeight || 460),
        0.1,
        40
      );
      camera.position.set(...DIORAMA_ZONES.overview.cameraPos);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enablePan = false;
      controls.minDistance = 2.1;
      controls.maxDistance = 7.4;
      controls.minPolarAngle = 0.42;
      controls.maxPolarAngle = Math.PI / 2 - 0.08;
      controls.target.set(...DIORAMA_ZONES.overview.target);

      // Warm key directional light + cool sky fill + stove ember glow
      const hemi = new THREE.HemisphereLight(0xfffbf3, 0xc6b699, 0.85);
      scene.add(hemi);

      const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.15);
      keyLight.position.set(4.5, 6.5, 3.8);
      if (!isSoftwareGl) {
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 1;
        keyLight.shadow.camera.far = 16;
        keyLight.shadow.camera.left = -4;
        keyLight.shadow.camera.right = 4;
        keyLight.shadow.camera.top = 4;
        keyLight.shadow.camera.bottom = -4;
        keyLight.shadow.bias = -0.0005;
      }
      scene.add(keyLight);

      const emberLight = new THREE.PointLight(0xff7733, 0.9, 2.4);
      emberLight.position.set(-1.05, 0.35, -0.35);
      scene.add(emberLight);

      const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      built = buildKitchenDiorama(maxAniso);
      scene.add(built.root);

      // Raycast click to focus zone
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let downX = 0;
      let downY = 0;

      onPointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
        desiredTargetRef.current.transitioning = false;
      };

      onPointerUp = (e: PointerEvent) => {
        if (!renderer || !built) return;
        const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (dist > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(built.interactables, true);
        if (hits.length > 0) {
          let obj: THREE.Object3D | null = hits[0].object;
          while (obj && !obj.userData.zone) {
            obj = obj.parent;
          }
          const clickedZone = obj?.userData?.zone as DioramaZone | undefined;
          if (clickedZone) {
            selectZone(clickedZone);
          }
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (!entry || !renderer) return;
          const w = Math.max(240, Math.round(entry.contentRect.width));
          const h = Math.max(240, Math.round(entry.contentRect.height));
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        });
        resizeObserver.observe(container);
      }

      let elapsed = 0;
      let prevTime = performance.now();
      let frameCount = 0;

      const animate = (now: number) => {
        if (disposed || !renderer || !controls || !built) return;
        const dt = Math.min(0.05, (now - prevTime) / 1000);
        prevTime = now;
        elapsed += dt;

        // Sync active dish colors in bowl
        const preset = DISH_COLORS[dishRef.current];
        const brothMat = built.brothMesh.material as THREE.MeshStandardMaterial;
        brothMat.color.setHex(preset.broth);
        if (built.dishChunks[0]) {
          const cMat = built.dishChunks[0].material as THREE.MeshStandardMaterial;
          cMat.color.setHex(preset.meat);
        }

        if (!prefersReducedMotion) {
          built.steamMeshes.forEach((puff, idx) => {
            const cycle = (elapsed * 0.42 + idx * 0.25) % 1;
            puff.position.y = 1.05 + cycle * 0.65;
            puff.position.x = -0.1 + Math.sin(elapsed * 1.4 + idx) * 0.06;
            puff.scale.setScalar(0.65 + cycle * 0.55);
            (puff.material as THREE.MeshStandardMaterial).opacity =
              Math.sin(cycle * Math.PI) * 0.34;
          });

          built.emberMat.emissiveIntensity = 1.2 + Math.sin(elapsed * 3.1) * 0.25;
          emberLight.intensity = 0.8 + Math.sin(elapsed * 3.1) * 0.16;
        }

        if (desiredTargetRef.current.transitioning) {
          const lerpAlpha = 1 - Math.exp(-5.5 * dt);
          camera.position.lerp(desiredTargetRef.current.cam, lerpAlpha);
          controls.target.lerp(desiredTargetRef.current.target, lerpAlpha);
          if (
            camera.position.distanceTo(desiredTargetRef.current.cam) < 0.03 &&
            controls.target.distanceTo(desiredTargetRef.current.target) < 0.02
          ) {
            desiredTargetRef.current.transitioning = false;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        frameCount += 1;
        if (frameCount === 1) {
          setSceneReady(true);
        }
        rafId = window.requestAnimationFrame(animate);
      };

      rafId = window.requestAnimationFrame(animate);
    } catch {
      if (renderer?.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      setFallbackMode(true);
    }

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      if (renderer?.domElement) {
        if (onPointerDown) renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        if (onPointerUp) renderer.domElement.removeEventListener('pointerup', onPointerUp);
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
      controls?.dispose();
      built?.dispose();
      envTarget?.dispose();
      pmrem?.dispose();
      renderer?.dispose();
    };
  }, []);

  const activeZone = DIORAMA_ZONES[zone];
  const activeDish = DISH_COLORS[dish];

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div
        ref={mountRef}
        className={styles.canvasMount}
        aria-label="Interactive 3D Filipino kitchen scene showing clay palayok pot, served meal bowl, chopping board, and market basket"
      />

      {fallbackMode && (
        <div className={styles.fallbackCard}>
          <span className={styles.zoneTag}>3D Preview Unavailable</span>
          <p>WebGL is disabled in this browser. Your meal planner remains fully interactive below.</p>
        </div>
      )}

      {!fallbackMode && !sceneReady && (
        <div className={styles.loadingChip}>Setting the table...</div>
      )}

      {/* Top inspection chip (no backdrop-filter over WebGL) */}
      <div className={styles.inspectCard}>
        <div className={styles.inspectTop}>
          <span className={styles.zoneTag}>{activeZone.costTag}</span>
          <span className={styles.dishTag}>
            {activeDish.label} · {activeDish.price}
          </span>
        </div>
        <strong className={styles.inspectTitle}>{activeZone.title}</strong>
        <p className={styles.inspectSub}>{activeZone.subtitle}</p>
      </div>

      {/* Collapsible bottom dock (<= 14% viewport height) */}
      <div className={styles.dockWrap}>
        <button
          type="button"
          className={styles.dockToggle}
          onClick={() => setDockOpen((v) => !v)}
          aria-expanded={dockOpen}
        >
          {dockOpen ? 'Hide camera & dish view' : 'Kitchen camera & dish view'}
        </button>

        {dockOpen && (
          <div className={styles.dockBar}>
            <div className={styles.btnGroup} role="group" aria-label="Camera views">
              {(['overview', 'palayok', 'bowl', 'basket'] as DioramaZone[]).map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => selectZone(z)}
                  className={clsx(styles.dockBtn, zone === z && styles.dockBtnActive)}
                >
                  {z === 'overview'
                    ? 'Kitchen'
                    : z === 'palayok'
                      ? 'Palayok'
                      : z === 'bowl'
                        ? 'Meal Bowl'
                        : 'Bayong'}
                </button>
              ))}
            </div>

            <div className={styles.btnGroup} role="group" aria-label="Sample dish in bowl">
              {(['adobo', 'sinigang', 'tinola', 'munggo'] as DishPreset[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDish(d);
                    selectZone('bowl');
                  }}
                  className={clsx(styles.dishBtn, dish === d && styles.dishBtnActive)}
                >
                  {DISH_COLORS[d].label.split(' ')[1] || DISH_COLORS[d].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
