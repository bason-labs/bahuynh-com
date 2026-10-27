// The hero's 3D microphone (AD-4): the only importer of three, framework-free.
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  SpotLight,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { DUST_COUNT, seedDust, stepDust } from "@/lib/dust";
import {
  IDLE_SPIN_PER_FRAME,
  decayVelocity,
  dragDelta,
  easeFollow,
  easeGlow,
  followTarget,
  idleBob,
  motionFlags,
  releaseVelocity,
  sceneParams,
  scrollOffsets,
} from "@/lib/micpose";

export type MicOptions = {
  reduced: boolean;
  /** Called once, after the first frame has been drawn. */
  onFirstFrame: () => void;
};

export type MicHandle = {
  /** Eases the live glow in or out. */
  setLive: (live: boolean) => void;
  /** The pointer over the hero, -1 to 1 from its centre to its edge; `null` (it left) keeps the last target. */
  setPointer: (nx: number | null, ny?: number) => void;
  /** Spins the mic by a horizontal drag of `dx` CSS px. */
  dragBy: (dx: number) => void;
  /** Ends a drag; the mic keeps turning at `lastDx` px per move, slowing to rest. */
  release: (lastDx: number) => void;
  setReduced: (reduced: boolean) => void;
  /** The grille's centre in CSS px from the canvas's top left corner. */
  grillePoint: () => { x: number; y: number };
  stop: () => void;
};

/** Read-only pose hook on `window.__micPose` (Q-0016-4). Angles in radians, heights in scene units. */
export type MicPose = {
  /** Animation frames advanced; on-demand draws do not count. */
  readonly frame: number;
  readonly live: boolean;
  /** The live glow, 0 (idle) to 1 (live). */
  readonly glow: number;
  readonly tilt: number;
  readonly idleYaw: number;
  readonly followYaw: number;
  readonly followPitch: number;
  readonly dragYaw: number;
  readonly scrollYaw: number;
  readonly scrollPitch: number;
  readonly scrollLift: number;
  /** Total rotation about the vertical axis. */
  readonly yaw: number;
  readonly pitch: number;
  readonly height: number;
  readonly restHeight: number;
  readonly cameraDistance: number;
  readonly dustCount: number;
  /** The y of every dust particle. */
  readonly dustY: number[];
  /** The mic head (grille) in viewport CSS px. */
  readonly rect: { x: number; y: number; width: number; height: number };
};

declare global {
  interface Window {
    __micPose?: MicPose;
  }
}

const TILT = 0.22;
const HEAD_ABOVE_RIG = 1.15;
const RING_IDLE = 0.4;
const SWITCH_GLOW = 3;
const RING_GLOW = 2;
const RED_LIGHT = 60;
const KEY_IDLE = 180;
const KEY_GLOW = 120;

/** Diamond wire mesh drawn as an alpha map for the grille. */
function meshTexture(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#fff";
  g.lineWidth = 5;
  const n = 22;
  for (let i = -n; i <= 2 * n; i++) {
    const o = (i * 512) / n;
    g.beginPath();
    g.moveTo(o, 0);
    g.lineTo(o + 512, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(o, 512);
    g.lineTo(o + 512, 0);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

function buildMic() {
  const mic = new Group();
  const chrome = new MeshPhysicalMaterial({ color: 0xd9d6d0, metalness: 1, roughness: 0.22, clearcoat: 0.4 });
  const grille = new Mesh(
    new SphereGeometry(1, 96, 64),
    new MeshPhysicalMaterial({
      color: 0xcfccc6,
      metalness: 1,
      roughness: 0.3,
      alphaMap: meshTexture(),
      alphaTest: 0.5,
      side: DoubleSide,
    }),
  );
  const inner = new Mesh(new SphereGeometry(0.95, 64, 48), new MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }));
  const foam = new Mesh(new SphereGeometry(0.7, 32, 24), new MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }));
  mic.add(inner, grille, foam);
  const band = new Mesh(new CylinderGeometry(0.9, 0.82, 0.32, 96, 1, true), chrome);
  band.position.y = -0.86;
  const bandCap = new Mesh(new TorusGeometry(0.86, 0.035, 16, 96), chrome);
  bandCap.rotation.x = Math.PI / 2;
  bandCap.position.y = -0.7;
  mic.add(band, bandCap);
  const profile = [
    [0.82, 0],
    [0.8, -0.15],
    [0.66, -0.9],
    [0.55, -2.2],
    [0.46, -3.4],
    [0.42, -3.62],
    [0.3, -3.7],
    [0, -3.72],
  ].map(([r, y]) => new Vector2(r, y));
  const body = new Mesh(
    new LatheGeometry(profile, 128),
    new MeshPhysicalMaterial({ color: 0x151517, metalness: 0.7, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.25 }),
  );
  body.position.y = -1.02;
  const foot = new Mesh(new TorusGeometry(0.47, 0.02, 12, 96), chrome);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = -4.3;
  const switchMaterial = new MeshStandardMaterial({ color: 0x330a05, emissive: 0xff4a2b, emissiveIntensity: 0, roughness: 0.4 });
  const switchKey = new Mesh(new BoxGeometry(0.16, 0.42, 0.08), switchMaterial);
  switchKey.position.set(0, -2.1, 0.66);
  switchKey.rotation.x = -0.1;
  const ringMaterial = new MeshStandardMaterial({ color: 0xff4a2b, emissive: 0xff4a2b, emissiveIntensity: RING_IDLE });
  const redRing = new Mesh(new TorusGeometry(0.6, 0.012, 8, 96), ringMaterial);
  redRing.rotation.x = Math.PI / 2;
  redRing.position.y = -1.55;
  mic.add(body, foot, switchKey, redRing);
  mic.position.y = HEAD_ABOVE_RIG;
  mic.rotation.z = -TILT;
  return { mic, grille, switchMaterial, ringMaterial };
}

export function startMic(canvas: HTMLCanvasElement, options: MicOptions): MicHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  try {
    return run(renderer, canvas, options);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

function run(renderer: WebGLRenderer, canvas: HTMLCanvasElement, options: MicOptions): MicHandle {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  const scene = new Scene();
  const environment = new PMREMGenerator(renderer);
  scene.environment = environment.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  environment.dispose();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);

  const { mic, grille, switchMaterial, ringMaterial } = buildMic();
  const rig = new Group();
  rig.add(mic);
  scene.add(rig);

  const key = new SpotLight(0xffe2b8, KEY_IDLE, 40, 0.5, 0.6, 1.6);
  key.position.set(1.5, 9, 6);
  key.target = mic;
  const rim = new DirectionalLight(0x9fd0ff, 2.2);
  rim.position.set(-6, 3, -6);
  const red = new PointLight(0xff4a2b, 0, 14, 1.5);
  red.position.set(2.5, -1.5, 4);
  scene.add(key, rim, red);

  const dustPositions = seedDust(DUST_COUNT, Math.random);
  const dustGeometry = new BufferGeometry();
  dustGeometry.setAttribute("position", new BufferAttribute(dustPositions, 3));
  const dust = new Points(
    dustGeometry,
    new PointsMaterial({ color: 0xffe9c4, size: 0.025, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  scene.add(dust);

  let reduced = options.reduced;
  let live = false;
  let flags = motionFlags(reduced);
  let params = sceneParams(canvas.clientWidth);
  let idleYaw = 0;
  let glow = 0;
  let followYaw = 0;
  let followPitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;
  let dragYaw = 0;
  let velocity = 0;
  let dragging = false;
  let scroll = { yaw: 0, pitch: 0, lift: 0 };
  let frame = 0;
  let bob = 0;
  let firstFrameDrawn = false;
  let onScreen = true;
  let raf = 0;
  const t0 = performance.now();

  const apply = () => {
    rig.rotation.set(followPitch + scroll.pitch, idleYaw + followYaw + dragYaw + scroll.yaw, 0);
    rig.position.y = params.restHeight + scroll.lift + bob;
    switchMaterial.emissiveIntensity = glow * SWITCH_GLOW;
    ringMaterial.emissiveIntensity = RING_IDLE + glow * RING_GLOW;
    red.intensity = glow * RED_LIGHT;
    key.intensity = KEY_IDLE + glow * KEY_GLOW;
    key.color.setRGB(1, 0.886 - 0.15 * glow, 0.722 - 0.25 * glow, SRGBColorSpace);
    camera.position.z = params.cameraDistance;
    dust.visible = flags.dust;
  };
  const draw = () => {
    apply();
    renderer.render(scene, camera);
    if (!firstFrameDrawn) {
      firstFrameDrawn = true;
      options.onFirstFrame();
    }
  };
  const tick = () => {
    frame++;
    if (!dragging) {
      velocity = decayVelocity(velocity);
      dragYaw += velocity;
      if (flags.idleTurn) idleYaw += IDLE_SPIN_PER_FRAME;
    }
    if (flags.follow) {
      followYaw = easeFollow(followYaw, targetYaw);
      followPitch = easeFollow(followPitch, targetPitch);
    }
    glow = easeGlow(glow, live ? 1 : 0);
    bob = flags.bob ? idleBob((performance.now() - t0) / 1000) : 0;
    if (flags.dust) {
      stepDust(dustPositions);
      dustGeometry.attributes.position.needsUpdate = true;
    }
    draw();
  };
  const loop = () => {
    tick();
    raf = requestAnimationFrame(loop);
  };
  /** Animate only while motion is on, the canvas is on screen and the tab is visible. */
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    const running = !reduced && onScreen && !document.hidden;
    canvas.dataset.running = String(running);
    if (running) raf = requestAnimationFrame(loop);
  };
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    params = sceneParams(w);
    draw();
  };

  const onScroll = () => {
    if (flags.scroll) scroll = scrollOffsets(window.scrollY, window.innerHeight);
  };
  /** Draws once when the loop is not running, so a drag or a switch still shows under reduced motion. */
  const drawIfStill = () => {
    if (!raf) draw();
  };

  const project = (point: Vector3) => {
    const p = point.clone().project(camera);
    return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight };
  };
  const grillePoint = () => {
    rig.updateMatrixWorld(true);
    return project(grille.getWorldPosition(new Vector3()));
  };

  window.__micPose = {
    get frame() {
      return frame;
    },
    get live() {
      return live;
    },
    get glow() {
      return glow;
    },
    tilt: TILT,
    get idleYaw() {
      return idleYaw;
    },
    get followYaw() {
      return followYaw;
    },
    get followPitch() {
      return followPitch;
    },
    get dragYaw() {
      return dragYaw;
    },
    get scrollYaw() {
      return scroll.yaw;
    },
    get scrollPitch() {
      return scroll.pitch;
    },
    get scrollLift() {
      return scroll.lift;
    },
    get yaw() {
      return rig.rotation.y;
    },
    get pitch() {
      return rig.rotation.x;
    },
    get height() {
      return rig.position.y;
    },
    get restHeight() {
      return params.restHeight;
    },
    get cameraDistance() {
      return params.cameraDistance;
    },
    get dustCount() {
      return dust.visible ? DUST_COUNT : 0;
    },
    get dustY() {
      return Array.from({ length: DUST_COUNT }, (_, i) => dustPositions[i * 3 + 1]);
    },
    get rect() {
      rig.updateMatrixWorld(true);
      const centre = grille.getWorldPosition(new Vector3());
      const c = project(centre);
      const edge = project(centre.clone().add(new Vector3(1, 0, 0)));
      const half = Math.abs(edge.x - c.x);
      const box = canvas.getBoundingClientRect();
      return { x: box.left + c.x - half, y: box.top + c.y - half, width: half * 2, height: half * 2 };
    },
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  visibility.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  resize();
  sync();

  return {
    setLive: (next) => {
      live = next;
      if (!raf) {
        glow = next ? 1 : 0;
        draw();
      }
    },
    setPointer: (nx, ny = 0) => {
      if (nx === null || !flags.follow) return;
      const target = followTarget(nx, ny);
      targetYaw = target.yaw;
      targetPitch = target.pitch;
    },
    dragBy: (dx) => {
      if (!flags.drag) return;
      dragging = true;
      velocity = 0;
      dragYaw += dragDelta(dx);
      drawIfStill();
    },
    release: (lastDx) => {
      dragging = false;
      velocity = reduced ? 0 : releaseVelocity(lastDx);
    },
    setReduced: (next) => {
      reduced = next;
      flags = motionFlags(next);
      bob = 0;
      if (next) {
        followYaw = followPitch = targetYaw = targetPitch = velocity = 0;
        glow = live ? 1 : 0;
        scroll = { yaw: 0, pitch: 0, lift: 0 };
      } else {
        onScroll();
      }
      sync();
      draw();
    },
    grillePoint,
    stop: () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      delete window.__micPose;
      delete canvas.dataset.running;
      dust.geometry.dispose();
      renderer.dispose();
    },
  };
}
