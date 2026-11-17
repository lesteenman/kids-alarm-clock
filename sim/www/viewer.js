// 3D view: loads the parts listed in models/sim-scene.json (STL or 3MF) and
// lights the diffuser from the 12 LED colours. With no parts listed it shows
// a placeholder clock, so the sim works before any model exists.
//
// This is an approximation: it shows where the light comes from and how the
// shell looks, not how a specific PLA diffuser really scatters light.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const ROOMS = {
  day:     { ambient: 1.0,  background: 0xd9d4ca, sun: 2.2 },
  evening: { ambient: 0.35, background: 0x5a4a3a, sun: 0.5 },
  dark:    { ambient: 0.04, background: 0x050608, sun: 0.0 },
};

// Placeholder clock, in model units (mm, Z up, front facing -Y).
const PLACEHOLDER = {
  leds: { count: 12, center: [0, -6, 55], radius: 17.5, right: [1, 0, 0], up: [0, 0, 1],
          front: [0, -1, 0], startAngleDeg: 0, clockwise: true, spread: 14 },
};

export async function createViewer(container, sceneUrl) {
  const config = await fetch(sceneUrl).then((r) => r.json()).catch(() => ({ parts: [] }));
  const baseUrl = new URL('.', new URL(sceneUrl, location.href));

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 1, 5000);
  camera.position.set(90, 110, 260);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 50, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7f70, 1);
  const sun = new THREE.DirectionalLight(0xfff3e0, 1);
  sun.position.set(-150, 300, 200);
  scene.add(hemi, sun);

  // Cabinet top + wall.
  const surfaceMat = new THREE.MeshStandardMaterial({ color: 0xb08a62, roughness: 0.8 });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(700, 400), surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 1 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), wallMat);
  wall.position.set(0, 250, -120);
  scene.add(surface, wall);

  // Model root: model coordinates are mm; rotate Z-up models to three.js Y-up.
  const model = new THREE.Group();
  if ((config.upAxis || 'z') === 'z') model.rotation.x = -Math.PI / 2;
  scene.add(model);

  const parts = config.parts || [];
  const usingPlaceholder = parts.length === 0;
  const diffusers = []; // meshes whose vertices get LED colours
  if (usingPlaceholder) {
    buildPlaceholder(model, diffusers);
  } else {
    for (const part of parts) await loadPart(model, part, baseUrl, diffusers);
  }
  const ledCfg = { ...PLACEHOLDER.leds, ...(usingPlaceholder ? {} : config.leds || {}) };
  const ledPositions = ringPositions(ledCfg);

  // Light spill on the surroundings: one light just in front of the diffuser.
  const spill = new THREE.PointLight(0xffffff, 0, 600, 1.6);
  const c = ledCfg.center, f = ledCfg.front;
  spill.position.set(c[0] + f[0] * 25, c[1] + f[1] * 25, c[2] + f[2] * 25);
  model.add(spill);

  model.updateMatrixWorld(true);
  for (const d of diffusers) prepareDiffuser(d, ledPositions);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.45, 0.4, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let room = ROOMS.dark;
  let leds = new Uint8Array(ledPositions.length * 3);
  let ledsDirty = true;

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  function applyRoom() {
    hemi.intensity = 1.2 * room.ambient;
    sun.intensity = room.sun;
    scene.background = new THREE.Color(room.background);
    ledsDirty = true;
  }
  applyRoom();

  function updateLeds() {
    const n = ledPositions.length;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < n; i++) { r += leds[i * 3]; g += leds[i * 3 + 1]; b += leds[i * 3 + 2]; }
    const total = (r + g + b) / (255 * 3 * n);
    if (total > 0) spill.color.setRGB(r / (r + g + b), g / (r + g + b), b / (r + g + b));
    spill.intensity = total * 2500;
    for (const d of diffusers) colourDiffuser(d, leds, room.ambient);
  }

  function render() {
    if (ledsDirty) { updateLeds(); ledsDirty = false; }
    controls.update();
    composer.render();
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  return {
    ledCount: ledPositions.length,
    usingPlaceholder,
    setLeds(bytes) {
      if (bytes.length !== leds.length || bytes.some((v, i) => v !== leds[i])) {
        leds = Uint8Array.from(bytes);
        ledsDirty = true;
      }
    },
    setRoom(name) { room = ROOMS[name] || ROOMS.dark; applyRoom(); },
  };
}

function ringPositions(cfg) {
  if (Array.isArray(cfg.positions)) return cfg.positions.map((p) => new THREE.Vector3(...p));
  const center = new THREE.Vector3(...cfg.center);
  const right = new THREE.Vector3(...cfg.right).normalize();
  const up = new THREE.Vector3(...cfg.up).normalize();
  const out = [];
  for (let i = 0; i < cfg.count; i++) {
    const deg = cfg.startAngleDeg + (cfg.clockwise ? 1 : -1) * (360 * i) / cfg.count;
    const a = THREE.MathUtils.degToRad(deg);
    out.push(center.clone()
      .addScaledVector(right, Math.sin(a) * cfg.radius)
      .addScaledVector(up, Math.cos(a) * cfg.radius));
  }
  out.spread = cfg.spread;
  return out;
}

function buildPlaceholder(model, diffusers) {
  const shell = new THREE.MeshStandardMaterial({ color: 0xf2c6d0, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(45, 45, 32, 64), shell);
  body.position.set(0, 10, 55); // axis along Y
  const base = new THREE.Mesh(new THREE.BoxGeometry(70, 40, 10), shell);
  base.position.set(0, 10, 5);
  const face = new THREE.Mesh(new THREE.CircleGeometry(39, 96, 0, Math.PI * 2), null);
  face.rotation.x = Math.PI / 2; // face -Y
  face.position.set(0, -6.2, 55);
  model.add(body, base, face);
  diffusers.push({ mesh: face, spread: PLACEHOLDER.leds.spread, base: new THREE.Color(0xf4f1e8) });
}

async function loadPart(model, part, baseUrl, diffusers) {
  const url = new URL(part.file, baseUrl).href;
  let object;
  try {
    if (/\.stl$/i.test(part.file)) {
      object = new THREE.Mesh(await new STLLoader().loadAsync(url), null);
    } else if (/\.3mf$/i.test(part.file)) {
      object = await new ThreeMFLoader().loadAsync(url);
    } else {
      console.warn('Unsupported model file (use .stl or .3mf):', part.file);
      return;
    }
  } catch (e) {
    console.warn('Could not load', part.file, e);
    return;
  }
  const isDiffuser = part.role === 'diffuser';
  object.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    if (isDiffuser) {
      diffusers.push({ mesh: o, spread: part.spread, base: new THREE.Color(part.color || '#f4f1e8') });
    } else if (part.color || !o.material) {
      o.material = new THREE.MeshStandardMaterial({ color: part.color || '#dddddd', roughness: 0.6 });
    }
  });
  model.add(object);
}

// Per diffuser vertex: weights to each LED (in the mesh's own coordinates).
function prepareDiffuser(d, ledPositions) {
  const geom = d.mesh.geometry;
  const pos = geom.attributes.position;
  const spread = d.spread || ledPositions.spread || 14;
  const inv = new THREE.Matrix4().copy(d.mesh.matrixWorld).invert();
  const modelToWorld = d.mesh.parent ? findModelRoot(d.mesh).matrixWorld : new THREE.Matrix4();
  const local = ledPositions.map((p) => p.clone().applyMatrix4(modelToWorld).applyMatrix4(inv));
  const n = local.length;
  d.weights = new Float32Array(pos.count * n);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    for (let j = 0; j < n; j++) {
      const dist = v.distanceTo(local[j]) / spread;
      d.weights[i * n + j] = 1 / (1 + dist * dist * dist);
    }
  }
  d.ledCount = n;
  d.colors = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
  geom.setAttribute('color', d.colors);
  d.mesh.material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
}

function findModelRoot(o) {
  while (o.parent && o.parent.type !== 'Scene') o = o.parent;
  return o;
}

const GLOW_GAIN = 1.4;
function colourDiffuser(d, leds, ambient) {
  const n = d.ledCount, arr = d.colors.array, w = d.weights;
  const br = d.base.r * ambient * 0.8, bg = d.base.g * ambient * 0.8, bb = d.base.b * ambient * 0.8;
  for (let i = 0; i < arr.length / 3; i++) {
    let r = 0, g = 0, b = 0;
    for (let j = 0; j < n; j++) {
      const k = w[i * n + j];
      r += k * leds[j * 3]; g += k * leds[j * 3 + 1]; b += k * leds[j * 3 + 2];
    }
    arr[i * 3] = br + (r / 255) * GLOW_GAIN * 0.35;
    arr[i * 3 + 1] = bg + (g / 255) * GLOW_GAIN * 0.35;
    arr[i * 3 + 2] = bb + (b / 255) * GLOW_GAIN * 0.35;
  }
  d.colors.needsUpdate = true;
}
