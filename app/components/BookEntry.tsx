"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

// ─── Easings ──────────────────────────────────────────────────────────────────
function easeOutCubic(t: number)   { return 1 - Math.pow(1 - t, 3); }
function easeOutQuint(t: number)   { return 1 - Math.pow(1 - t, 5); }
function easeInQuart(t: number)    { return t * t * t * t; }
function easeInOutCubic(t: number) { return t < 0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function easeInOutQuart(t: number) { return t < 0.5 ? 8*t*t*t*t : 1-Math.pow(-2*t+2,4)/2; }

function fixColorSpace(tex: THREE.Texture | null | undefined) {
  if (!tex) return;
  if ("colorSpace" in tex) (tex as any).colorSpace = "srgb";
  else                     (tex as any).encoding   = 3001;
  tex.needsUpdate = true;
}

// ─── Camera tween ─────────────────────────────────────────────────────────────
function tweenCamera(
  camera: THREE.PerspectiveCamera,
  toEye: THREE.Vector3,
  lookAtTarget: THREE.Vector3,
  ms: number,
  ease: (t: number) => number,
  onDone?: () => void
): () => void {
  const fromEye    = camera.position.clone();
  const dir        = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const fromLookAt = camera.position.clone().add(dir.multiplyScalar(5));
  const t0         = performance.now();
  let   rafId      = 0;
  let   cancelled  = false;
  const tmpPos     = new THREE.Vector3();
  const tmpLookAt  = new THREE.Vector3();

  function tick() {
    if (cancelled) return;
    const raw = Math.min((performance.now() - t0) / ms, 1);
    const e   = ease(raw);
    tmpPos.lerpVectors(fromEye, toEye, e);
    tmpLookAt.lerpVectors(fromLookAt, lookAtTarget, e);
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLookAt);
    if (raw < 1) { rafId = requestAnimationFrame(tick); }
    else         { onDone?.(); }
  }
  rafId = requestAnimationFrame(tick);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

// ─── Star sprite ──────────────────────────────────────────────────────────────
function makeStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const cv   = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx  = cv.getContext("2d")!;
  const cx   = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0,    "rgba(255,248,225,1)");
  grad.addColorStop(0.35, "rgba(255,240,190,0.7)");
  grad.addColorStop(1,    "rgba(255,220,140,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(cv);
}

function createStarField(scene: THREE.Scene, count = 340): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r     = 16 + Math.random() * 8;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pos[i*3+1] = r * Math.cos(phi);
    pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: makeStarTexture(), size: 0.20, sizeAttenuation: true,
    transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "descending" | "idle" | "opening" | "diving" | "flash" | "done";

interface BookEntryProps {
  gltfScene: THREE.Group;
  onDone: () => void;
}

// ─── Butterfly path helper (supports multiple unique paths) ───────────────────
function getButterflyPosition(t: number, bookY: number, index: number): THREE.Vector3 {
  const offsets = [
    { rx: 2.2, rz: 1.6, ry: 0.55, speed: 0.38, yOffset: 0.9, phase: 0 },
    { rx: 1.8, rz: 2.0, ry: 0.40, speed: 0.45, yOffset: 1.2, phase: 2 },
    { rx: 2.5, rz: 1.2, ry: 0.60, speed: 0.30, yOffset: 0.6, phase: 4 },
  ];
  const cfg = offsets[index % offsets.length];
  const x  = cfg.rx * Math.sin(t * cfg.speed + cfg.phase);
  const z  = cfg.rz * Math.sin(t * cfg.speed * 0.5 + cfg.phase) * Math.cos(t * cfg.speed * 0.5) * 2;
  const y  = bookY + cfg.yOffset + cfg.ry * Math.sin(t * 0.55 + cfg.phase);
  return new THREE.Vector3(x, y, z);
}

// ─── Zoltraak Portal Wipe ────────────────────────────────────────────────────
interface ZoltraakPortalProps {
  active: boolean;
  holdMs?: number;
  openMs?: number;
  lineColor?: string;
  bgColor?: string;
  onComplete?: () => void;
}

// ─── Zoltraak Portal Wipe ────────────────────────────────────────────────────
function ZoltraakPortal({
  active, holdMs = 180, openMs = 500,
  lineColor = "#ffffff", bgColor = "#000000", onComplete,
} : ZoltraakPortalProps) {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    doneRef.current = false;
    const cv  = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const t0 = performance.now();
    const LINE_H = 3, GLOW_H = 28;

    function draw(now: number) {
      const elapsed = now - t0;
      const W = cv.width, H = cv.height, midY = H / 2;

      if (elapsed < holdMs) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);
        const glowGrad = ctx.createLinearGradient(0, midY - GLOW_H, 0, midY + GLOW_H);
        glowGrad.addColorStop(0,    "rgba(255,255,255,0)");
        glowGrad.addColorStop(0.45, "rgba(255,255,255,0.18)");
        glowGrad.addColorStop(0.5,  "rgba(255,255,255,0.55)");
        glowGrad.addColorStop(0.55, "rgba(255,255,255,0.18)");
        glowGrad.addColorStop(1,    "rgba(255,255,255,0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, midY - GLOW_H, W, GLOW_H * 2);
        ctx.fillStyle = lineColor;
        ctx.fillRect(0, midY - LINE_H / 2, W, LINE_H);
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const raw = Math.min((elapsed - holdMs) / openMs, 1);
      const e   = raw * raw * raw * raw;
      const travel = e * (H / 2 + GLOW_H + 4);
      ctx.clearRect(0, 0, W, H);
      const topBarBottom = midY - travel;
      if (topBarBottom > 0) { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, topBarBottom); }
      const botBarTop = midY + travel;
      if (botBarTop < H) { ctx.fillStyle = bgColor; ctx.fillRect(0, botBarTop, W, H - botBarTop); }
      if (topBarBottom > -GLOW_H * 2) {
        const edgeY = topBarBottom;
        const gg = ctx.createLinearGradient(0, edgeY - GLOW_H, 0, edgeY + LINE_H);
        gg.addColorStop(0, "rgba(255,255,255,0)"); gg.addColorStop(0.7, "rgba(255,255,255,0.25)"); gg.addColorStop(1, lineColor);
        ctx.fillStyle = gg; ctx.fillRect(0, edgeY - GLOW_H, W, GLOW_H + LINE_H);
      }
      if (botBarTop < H + GLOW_H * 2) {
        const edgeY = botBarTop;
        const gg = ctx.createLinearGradient(0, edgeY - LINE_H, 0, edgeY + GLOW_H);
        gg.addColorStop(0, lineColor); gg.addColorStop(0.3, "rgba(255,255,255,0.25)"); gg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = gg; ctx.fillRect(0, edgeY - LINE_H, W, GLOW_H + LINE_H);
      }
      if (raw < 1) { rafRef.current = requestAnimationFrame(draw); }
      else { ctx.clearRect(0, 0, W, H); if (!doneRef.current) { doneRef.current = true; onComplete?.(); } }
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [active, holdMs, openMs, lineColor, bgColor, onComplete]);

  return (
    <canvas ref={cvRef} style={{
      position: "fixed", inset: 0, zIndex: 300,
      pointerEvents: "none", display: active ? "block" : "none",
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function BookEntry({ gltfScene, onDone }: BookEntryProps) {
  const mountRef       = useRef<HTMLDivElement>(null);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const onDoneRef      = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const veilRef        = useRef<HTMLDivElement>(null);
  const [mounted,    setMounted]    = useState(true);
  const [wipeActive, setWipeActive] = useState(false);
  const [phase,      setPhase]      = useState<Phase>("descending");
  const phaseRef                    = useRef<Phase>("descending");
  phaseRef.current                  = phase;

  const builtRef = useRef(false);

  const sceneRef = useRef<{
    renderer:        THREE.WebGLRenderer;
    camera:          THREE.PerspectiveCamera;
    controls:        OrbitControls;
    scene:           THREE.Scene;
    bookGroup:       THREE.Object3D | null;
    stars:           THREE.Points | null;
    butterflies:     { group: THREE.Group; mixer: THREE.AnimationMixer | null }[] | null;
    butterflyLight:  THREE.PointLight | null;
    butterflyOpacity: number;
    rafId:           number;
    clock:           THREE.Clock;
    descentStart:    number;
    isDescending:    boolean;
    descentFrom:     number;
    descentTo:       number;
    droneAngle:      number;
    droneRadius:     number;
    droneHeight:     number;
    openStart:       number;
    isOpening:       boolean;
    t:               number;
  } | null>(null);

  // ── Build scene once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (builtRef.current) return;
    const el = mountRef.current;
    if (!el || !gltfScene) return;
    builtRef.current = true;

    if (veilRef.current) {
      veilRef.current.style.opacity    = "1";
      veilRef.current.style.transition = "none";
    }

    // ── Renderer ──────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, powerPreference: "high-performance",
    });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFShadowMap; // PCFSoftShadowMap is deprecated in newer releases
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    if ("outputColorSpace" in renderer) (renderer as any).outputColorSpace = "srgb";
    else                               (renderer as any).outputEncoding    = 3001;
    renderer.setClearColor(0x020810, 1);
    el.appendChild(renderer.domElement);

    const DRONE_RADIUS_START  = 9.0;
    const DRONE_HEIGHT_START  = 3.5;
    const DRONE_SETTLE_RADIUS = 6.5;
    const DRONE_SETTLE_HEIGHT = 2.2;

    // ── Camera ────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.01, 200);
    camera.position.set(0, DRONE_HEIGHT_START, DRONE_RADIUS_START);
    
    // We start the lookTarget fairly low so the empty pedestal is firmly in view as the book drops in.
    const START_LOOK_Y = 1.5;
    camera.lookAt(0, START_LOOK_Y, 0);

    // ── Scene ─────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020810);
    scene.fog = new THREE.FogExp2(0x020810, 0.038);

    // ── Controls ──────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.enablePan       = false;
    controls.minDistance     = 3;
    controls.maxDistance     = 12;
    controls.maxPolarAngle   = Math.PI * 0.52;
    controls.autoRotate      = false;
    controls.autoRotateSpeed = 0.5;
    controls.target.set(0, 0.3, 0);
    controls.enabled         = false;
    controls.update();

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffeedd, 0.4));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1);
    key.position.set(3, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 25;
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top   =  4;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8899bb, 0.22);
    fill.position.set(-4, 2, -4);
    scene.add(fill);

    // ── Pedestal ──────────────────────────────────────────────────────────
    const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x0d0a07, roughness: 0.2,  metalness: 0.85 });
    const goldMat     = new THREE.MeshStandardMaterial({ color: 0xc9933a, roughness: 0.08, metalness: 1.0  });
    const darkMat     = new THREE.MeshStandardMaterial({ color: 0x090705, roughness: 0.45, metalness: 0.5  });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.28, 0.045, 96), darkMat);
    base.position.y = -0.72; base.receiveShadow = true; scene.add(base);
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.07, 96), pedestalMat);
    t1.position.y = -0.685; t1.receiveShadow = true; scene.add(t1);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.15, 0.05, 96), pedestalMat);
    t2.position.y = -0.615; t2.receiveShadow = true; scene.add(t2);
    const t3 = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.92, 0.035, 96), pedestalMat);
    t3.position.y = -0.58; t3.receiveShadow = true; scene.add(t3);

    const makeGoldRing = (radius: number, y: number) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 20, 120), goldMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; scene.add(ring);
    };
    makeGoldRing(1.27, -0.72);
    makeGoldRing(1.15, -0.648);
    makeGoldRing(0.92, -0.593);
    makeGoldRing(0.82, -0.563);

    // ── Ripple rings ──────────────────────────────────────────────────────
    type RingData = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number };
    const ripples: RingData[] = [1.4, 2.0, 2.7, 3.5].map((r, i) => {
      const mat  = new THREE.MeshBasicMaterial({ color: 0x30dcb9, side: THREE.DoubleSide, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r, 80), mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = -0.78; scene.add(mesh);
      return { mesh, mat, ph: i * (Math.PI * 2 / 4) };
    });

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.78;
    ground.receiveShadow = true; scene.add(ground);

    // ── Stars ─────────────────────────────────────────────────────────────
    const stars = createStarField(scene, 340);

    // ── Book ──────────────────────────────────────────────────────────────
    const book = gltfScene.clone(true);
    book.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: any) => {
        if (!m) return;
        fixColorSpace(m.map); fixColorSpace(m.emissiveMap);
        if (m.normalMap)    m.normalMap.needsUpdate    = true;
        if (m.roughnessMap) m.roughnessMap.needsUpdate = true;
        if (m.metalnessMap) m.metalnessMap.needsUpdate = true;
        m.needsUpdate = true;
      });
    });

    const bb     = new THREE.Box3().setFromObject(book);
    const center = bb.getCenter(new THREE.Vector3());
    const size   = bb.getSize(new THREE.Vector3());
    const sc     = 1.55 / Math.max(size.x, size.y, size.z);
    book.scale.setScalar(sc);
    book.position.x = -center.x * sc;
    book.position.z = -center.z * sc;

    const PEDESTAL_TOP = -0.562;
    const bookHalfH    = (size.y * sc) / 2;
    
    const DESCENT_TO   = PEDESTAL_TOP + bookHalfH + 0.04;
    // Fix: initialize it safely out-of-frame to prevent the "teleport flash".
    const DESCENT_FROM = DESCENT_TO + 9.0;
    
    book.position.y = DESCENT_FROM; 
    scene.add(book);

    const DESCENT_DURATION_MS = 3200;

    // ── Butterfly point light ──────────────────────────────────────────────
    const butterflyLight = new THREE.PointLight(0xb8e0ff, 0, 3.5);
    scene.add(butterflyLight);

    // ── Load multiple butterflies asynchronously ───────────────────────────
    const butterfliesList: { group: THREE.Group; mixer: THREE.AnimationMixer | null }[] = [];

    new GLTFLoader().load(
      "/models/butterfly_animated.glb",
      (gltf) => {
        const numButterflies = 3;
        
        for (let i = 0; i < numButterflies; i++) {
          const bf = SkeletonUtils.clone(gltf.scene);
          // slight size variation
          bf.scale.setScalar(0.18 + Math.random() * 0.04);
          
          bf.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (!mesh.isMesh) return;
            if (mesh.material) {
              // Safe material clone mapping to handle both single and multiple materials (arrays)
              if (Array.isArray(mesh.material)) {
                mesh.material = mesh.material.map(m => m.clone());
              } else {
                mesh.material = mesh.material.clone();
              }
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((m: any) => {
                if (m.map) fixColorSpace(m.map);
                m.transparent = true;
                m.opacity = 0;
                m.needsUpdate = true;
              });
            }
          });
          
          scene.add(bf);
          
          let mixer = null;
          if (gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(bf);
            gltf.animations.forEach((clip) => { 
              const action = mixer!.clipAction(clip);
              action.play();
              // Offset animation start so they don't flap in exact sync
              action.time = Math.random() * clip.duration;
            });
          }
          butterfliesList.push({ group: bf, mixer });
        }
      },
      undefined,
      (err) => { console.warn("Butterfly GLB failed to load:", err); }
    );

    const clock = new THREE.Clock();

    const droneLookAt  = new THREE.Vector3(0, START_LOOK_Y, 0);
    let   droneAngle   = 0;
    let   droneRadius  = DRONE_RADIUS_START;
    let   droneHeight  = DRONE_HEIGHT_START;

    let stableFrameCount    = 0;
    const STABLE_FRAMES_REQ = 6;     
    let   veilFading        = false;
    const VEIL_FADE_MS      = 800;

    let   descentArmed      = false;
    let   descentArmTime    = 0;

    let   bfOpacity         = 0;
    let   bfFadeStarted     = false;

    // Bound butterfliesList directly in the initialization to avoid any asynchronous race conditions.
    sceneRef.current = {
      renderer, camera, controls, scene,
      bookGroup: book, stars,
      butterflies: butterfliesList, butterflyLight,
      butterflyOpacity: 0,
      rafId: 0, clock,
      descentStart:  0,
      isDescending:  false,
      descentFrom:   DESCENT_FROM,
      descentTo:     DESCENT_TO,
      droneAngle:    0,
      droneRadius:   DRONE_RADIUS_START,
      droneHeight:   DRONE_HEIGHT_START,
      openStart: 0,
      isOpening: false,
      t: 0,
    };

    // Precompile shaders before the loop to avoid stutter when the book drops into the scene
    renderer.compile(scene, camera);

    // ── Render loop ───────────────────────────────────────────────────────
    function animate() {
      const r   = sceneRef.current!;
      r.rafId   = requestAnimationFrame(animate);
      const dt  = clock.getDelta();
      r.t      += dt;
      const t   = r.t;
      const now = performance.now();

      if (r.butterflies) {
        r.butterflies.forEach(b => { if (b.mixer) b.mixer.update(dt); });
      }

      // ── Ripple rings ──────────────────────────────────────────────────
      ripples.forEach(({ mesh, mat, ph }) => {
        const a = (Math.sin(t * 1.1 + ph) + 1) / 2;
        mat.opacity = a * 0.22;
        const s = 1 + a * 0.18;
        mesh.scale.set(s, 1, s);
      });

      if (r.stars) r.stars.rotation.y = t * 0.012;

      // ── VEIL PHASE A: Frame stabilization ─────────────
      if (stableFrameCount < STABLE_FRAMES_REQ) {
        stableFrameCount++;
        // Maintain fixed look position while stabilized behind the veil
        droneLookAt.set(0, START_LOOK_Y, 0);
        camera.lookAt(droneLookAt);

        if (stableFrameCount === STABLE_FRAMES_REQ) {
          veilFading = true;
          const veilEl = veilRef.current;
          if (veilEl) {
            veilEl.style.transition = `opacity ${VEIL_FADE_MS}ms cubic-bezier(0.16,1,0.3,1)`;
            veilEl.style.opacity    = "0";
          }
          // The moment the veil begins fading out, trigger the descent.
          descentArmed   = false; 
          descentArmTime = now + 50;
        }
      }

      // ── VEIL PHASE B: Trigger the descent ─
      if (stableFrameCount >= STABLE_FRAMES_REQ && !descentArmed && now >= descentArmTime) {
        descentArmed = true;
        r.descentStart = now;
        r.isDescending = true;
      }

      // ── Descent ───────────────────────────────────────────────────────
      if (r.isDescending && r.bookGroup) {
        const elapsed = now - r.descentStart;
        if (elapsed >= 0) {
          const raw   = Math.min(elapsed / DESCENT_DURATION_MS, 1);
          const eased = easeOutQuint(raw);
          const bookY = r.descentFrom + (r.descentTo - r.descentFrom) * eased;
          r.bookGroup.position.y = bookY;

          droneAngle  += dt * 0.22;
          droneRadius  = DRONE_RADIUS_START + (DRONE_SETTLE_RADIUS - DRONE_RADIUS_START) * eased;
          droneHeight  = DRONE_HEIGHT_START + (DRONE_SETTLE_HEIGHT - DRONE_HEIGHT_START) * eased;
          r.droneAngle  = droneAngle;
          r.droneRadius = droneRadius;
          r.droneHeight = droneHeight;

          camera.position.set(
            Math.sin(droneAngle) * droneRadius,
            droneHeight,
            Math.cos(droneAngle) * droneRadius,
          );
          
          // Gently pan down tracking the book dropping into place.
          const lookY = START_LOOK_Y * (1 - eased) + 0.3 * eased;
          droneLookAt.set(0, lookY, 0);
          camera.lookAt(droneLookAt);

          if (raw >= 1) {
            r.bookGroup.position.y = r.descentTo;
            r.isDescending         = false;
            controls.target.copy(droneLookAt);
            controls.update();
            controls.enabled    = true;
            controls.autoRotate = true;
            setPhase("idle");
          }
        } else {
          // pre-descent lock gaze
          camera.lookAt(droneLookAt);
        }
      }

      // ── Butterflies movement & fade ──────────────────────────────────────
      const currentPhase = phaseRef.current;
      const bookRestingY = r.descentTo;

      if (r.butterflies && r.butterflies.length > 0) {
        const shouldBeVisible = (currentPhase === "idle");
        const shouldFadeIn    = shouldBeVisible  && !bfFadeStarted;
        const shouldFadeOut   = !shouldBeVisible && bfOpacity > 0 && currentPhase === "opening";

        if (shouldFadeIn) { bfFadeStarted = true; }

        if (bfFadeStarted && currentPhase === "idle") {
          bfOpacity = Math.min(1, bfOpacity + dt * 0.55);
        } else if (shouldFadeOut) {
          bfOpacity = Math.max(0, bfOpacity - dt * 2.5);
        }

        const centroid = new THREE.Vector3();

        r.butterflies.forEach((bfData, index) => {
          bfData.group.traverse((n: any) => {
            if (n.isMesh && n.material) {
              const mats = Array.isArray(n.material) ? n.material : [n.material];
              mats.forEach((m: any) => { if (m) m.opacity = bfOpacity; });
            }
          });

          const bfPos = getButterflyPosition(t, bookRestingY, index);
          bfData.group.position.copy(bfPos);
          centroid.add(bfPos);

          const bfNext = getButterflyPosition(t + 0.06, bookRestingY, index);
          const dir3   = new THREE.Vector3().subVectors(bfNext, bfPos).normalize();
          if (dir3.lengthSq() > 0.0001) {
            bfData.group.lookAt(bfPos.clone().add(dir3));
          }
        });

        // Compute group centroid to keep the light somewhat centered between them
        centroid.divideScalar(r.butterflies.length);

        if (butterflyLight) {
          butterflyLight.position.copy(centroid);
          butterflyLight.intensity = bfOpacity * (0.35 + 0.15 * Math.sin(t * 3.2));
        }
      }

      // ── Open / dive ───────────────────────────────────────────────────
      if (r.isOpening && r.bookGroup) {
        const raw = Math.min((now - r.openStart) / 950, 1);
        const e   = easeInOutCubic(raw);
        r.bookGroup.rotation.x = THREE.MathUtils.degToRad(-75 * e);
        r.bookGroup.rotation.z = THREE.MathUtils.degToRad(-2  * e);
        r.bookGroup.position.y = r.descentTo + e * 0.28;

        if (raw >= 1) {
          r.isOpening = false;
          setPhase("diving");
          controls.autoRotate = false;
          controls.enabled    = false;

          const bookCenterY  = r.descentTo + 0.28;
          const bookPos    = new THREE.Vector3(0, bookCenterY, 0);
          const camPos     = camera.position.clone();
          const camToBook  = bookPos.clone().sub(camPos).normalize();

          const PULL_DIST    = 2.0;
          const PIERCE_DIST  = 0.4;
          const frontEye     = bookPos.clone().sub(camToBook.clone().multiplyScalar(PULL_DIST));
          const frontLookAt  = bookPos.clone();
          const insideEye    = bookPos.clone().add(camToBook.clone().multiplyScalar(PIERCE_DIST));
          const insideLookAt = bookPos.clone().add(camToBook.clone().multiplyScalar(PIERCE_DIST + 0.8));

          const cancel1 = tweenCamera(camera, frontEye, frontLookAt, 520, easeInOutQuart, () => {
            const cancel2 = tweenCamera(camera, insideEye, insideLookAt, 420, easeInQuart, () => {
              setPhase("flash");
              setWipeActive(true);
            });
            cancelTweenRef.current = cancel2;
          });
          cancelTweenRef.current = cancel1;
        }
      }

      if (currentPhase === "idle") controls.update();

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      cancelTweenRef.current?.();
      cancelAnimationFrame(sceneRef.current?.rafId ?? 0);
      ro.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      builtRef.current = false;
      if (veilRef.current) {
        veilRef.current.style.transition = "none";
        veilRef.current.style.opacity    = "1";
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltfScene]);

  // ─── Click → raycast ─────────────────────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (phaseRef.current !== "idle") return;
    const r = sceneRef.current;
    if (!r?.bookGroup) return;

    const rect  = e.currentTarget.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, r.camera);
    if (ray.intersectObject(r.bookGroup, true).length === 0) return;

    r.controls.autoRotate = false;
    setPhase("opening");
    r.openStart = performance.now();
    r.isOpening = true;
  }, []);

  const handleWipeComplete = useCallback(() => {
    onDoneRef.current();
    setTimeout(() => setMounted(false), 80);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        9999,
        background:    "#020810",
        pointerEvents: "auto",
      }}
      onClick={handleClick}
    >
      <div style={{
        position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 90% 70% at 50% 55%, rgba(10,22,42,0.92) 0%, #020810 75%)",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(1,3,10,0.85) 100%)",
      }} />

      <div ref={mountRef} style={{ position: "absolute", inset: 0, zIndex: 2 }} />

      {phase === "idle" && (
        <div style={{
          position: "absolute", bottom: "9vh", left: 0, right: 0, zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
          pointerEvents: "none",
          animation: "hintAppear 1.4s cubic-bezier(0.22,1,0.36,1) forwards",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ animation: "chevFloat 2.2s ease-in-out infinite" }}>
            <polyline points="2,5 8,11 14,5"
              stroke="rgba(255,210,120,0.9)" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p style={{
            margin: 0,
            fontFamily:    "'Palatino Linotype', Palatino, Georgia, serif",
            fontSize:      "clamp(0.58rem, 1vw, 0.72rem)",
            color:         "rgba(255,240,190,0.78)",
            letterSpacing: "0.45em",
            textTransform: "uppercase",
            animation:     "tapPulse 3s ease-in-out infinite",
          }}>Tap the book to enter</p>
        </div>
      )}

      {(phase === "descending" || phase === "idle") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPhase("flash");
            setWipeActive(true);
          }}
          style={{
            position: "absolute", top: "1.5rem", right: "1.8rem", zIndex: 200,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,249,238,0.38)",
            borderRadius: "6px", padding: "0.38rem 1rem",
            fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
            fontSize: "clamp(0.55rem, 0.85vw, 0.67rem)",
            letterSpacing: "0.18em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.22s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = "rgba(48,220,185,0.08)";
            e.currentTarget.style.color       = "rgba(255,249,238,0.75)";
            e.currentTarget.style.borderColor = "rgba(48,220,185,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color       = "rgba(255,249,238,0.38)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
          }}
        >Skip →</button>
      )}

      <ZoltraakPortal
        active={wipeActive}
        bgColor="#000000"
        lineColor="#ffffff"
        holdMs={180}
        openMs={500}
        onComplete={handleWipeComplete}
      />

      <div
        ref={veilRef}
        style={{
          position:      "absolute",
          inset:         0,
          zIndex:        50,
          background:    "#020810",
          opacity:       1,
          transition:    "none",
          pointerEvents: "none",
          willChange:    "opacity",
        }}
      />

      <style>{`
        @keyframes tapPulse {
          0%,100% { opacity: .78; }
          50%      { opacity: .42; }
        }
        @keyframes chevFloat {
          0%,100% { transform: translateY(0);   opacity: .9; }
          50%      { transform: translateY(5px); opacity: .45; }
        }
        @keyframes hintAppear {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}