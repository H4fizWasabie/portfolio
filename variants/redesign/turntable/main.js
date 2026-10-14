import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { initGalleries } from '../gallery.js';

initGalleries();

const stage = document.querySelector('[data-stage]');
const dataEl = document.getElementById('stage-data');
if (stage && dataEl) {
  try { start(JSON.parse(dataEl.textContent)); } catch (e) { console.warn('Turntable unavailable, showing still image.', e); }
}

function start({ root, projects }) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const color = n => new THREE.Color(css.getPropertyValue(n).trim());

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  stage.prepend(renderer.domElement);
  stage.classList.add('is-live');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, color('--deep'), 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(key);

  const body = new THREE.MeshStandardMaterial({ color: color('--device'), roughness: 0.45, metalness: 0.15 });
  const bezel = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6 });

  // Turntable: a plinth with a signal-orange rim marking the front.
  const table = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.75, 0.32, 96), new THREE.MeshStandardMaterial({ color: color('--plinth'), roughness: 0.8 }));
  plinth.receiveShadow = true;
  table.add(plinth);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.68, 0.035, 8, 160), new THREE.MeshStandardMaterial({ color: color('--signal'), roughness: 0.5 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.16;
  table.add(rim);
  scene.add(table);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.17;
  shadow.receiveShadow = true;
  scene.add(shadow);

  const box = (w, h, d, r, mat) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const screenMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  // Each device returns { group, screen } where screen is a plane facing +z in device space.
  const devices = {
    laptop() {
      const g = new THREE.Group();
      const base = box(3.2, 0.12, 2.15, 0.05, body);
      base.position.y = 0.06;
      const hinge = new THREE.Group();
      hinge.position.set(0, 0.12, -1.05);
      hinge.rotation.x = -0.28;
      const lid = box(3.2, 2.08, 0.08, 0.05, body);
      lid.position.y = 1.04;
      const glass = box(3.08, 1.96, 0.01, 0.004, bezel);
      glass.position.set(0, 1.04, 0.045);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9 * 860 / 1360), screenMat());
      screen.position.set(0, 1.06, 0.052);
      hinge.add(lid, glass, screen);
      g.add(base, hinge);
      return { group: g, screen };
    },
    phone() {
      const g = new THREE.Group();
      const stand = box(0.9, 0.5, 0.7, 0.08, body);
      stand.position.set(0, 0.25, -0.15);
      const tilt = new THREE.Group();
      tilt.position.set(0, 0.12, 0.1);
      tilt.rotation.x = -0.18;
      const shell = box(1.1, 2.3, 0.09, 0.14, body);
      shell.position.y = 1.15;
      const glass = box(1.04, 2.24, 0.01, 0.004, bezel);
      glass.position.set(0, 1.15, 0.045);
      tilt.add(glass);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0 * 2560 / 1152), screenMat());
      screen.position.set(0, 1.15, 0.052);
      tilt.add(shell, screen);
      g.add(stand, tilt);
      return { group: g, screen };
    },
    tablet() {
      const g = new THREE.Group();
      const easel = box(2.2, 0.16, 0.9, 0.06, body);
      easel.position.set(0, 0.08, -0.1);
      const tilt = new THREE.Group();
      tilt.position.set(0, 0.16, 0.2);
      tilt.rotation.x = -0.3;
      const shell = box(2.6, 1.9, 0.08, 0.12, body);
      shell.position.y = 0.95;
      const glass = box(2.52, 1.82, 0.01, 0.004, bezel);
      glass.position.set(0, 0.95, 0.04);
      tilt.add(glass);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.44, 1.74), screenMat());
      screen.position.set(0, 0.95, 0.047);
      tilt.add(shell, screen);
      g.add(easel, tilt);
      return { group: g, screen };
    }
  };

  const kinds = ['laptop', 'phone', 'tablet'];
  const slots = {};
  kinds.forEach((k, i) => {
    const d = devices[k]();
    const angle = (i / kinds.length) * Math.PI * 2;
    d.group.position.set(Math.sin(angle) * 2.2, 0.16, Math.cos(angle) * 2.2);
    d.group.rotation.y = angle;
    d.angle = angle;
    table.add(d.group);
    slots[k] = d;
  });

  // Screens: real screenshots, or a drawn workflow outline that says what it is.
  const loader = new THREE.TextureLoader();
  const textures = new Map();
  const outline = p => {
    const c = document.createElement('canvas');
    c.width = 1120; c.height = 800;
    const x = c.getContext('2d');
    x.fillStyle = css.getPropertyValue('--sweep').trim(); x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#222529';
    x.font = '600 56px Unbounded, sans-serif'; x.fillText(p.title, 72, 130);
    x.font = '500 30px Figtree, sans-serif'; x.fillStyle = '#555b63'; x.fillText('Workflow outline, not a screenshot', 72, 186);
    p.steps.forEach((s, i) => {
      const y = 290 + i * 120;
      x.fillStyle = css.getPropertyValue('--signal').trim();
      x.beginPath(); x.arc(100, y - 12, 26, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fbfbfa'; x.font = '700 28px Figtree, sans-serif'; x.textAlign = 'center'; x.fillText(String(i + 1), 100, y - 2);
      x.textAlign = 'left'; x.fillStyle = '#222529'; x.font = '500 40px Figtree, sans-serif'; x.fillText(s, 150, y);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const texture = p => {
    if (!textures.has(p.slug)) {
      const t = p.screen ? loader.load(`${root}static/${p.screen}`, () => { needsFrame = true; }) : outline(p);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      textures.set(p.slug, t);
    }
    return textures.get(p.slug);
  };

  // Rotation state: target follows the active chapter, drag adds a temporary offset.
  let current = projects[0], turn = reduced ? 0 : -0.9, target = 0, drag = 0, needsFrame = true, swapAt = 0;
  const caption = stage.querySelector('[data-caption]');
  const show = p => {
    const slot = slots[p.device];
    const prev = slot.screen.material.map;
    current = p;
    caption.textContent = p.disclosure;
    // Shortest rotation that brings this device's front to the camera.
    const want = -slot.angle;
    target = turn + Math.atan2(Math.sin(want - turn), Math.cos(want - turn));
    const next = texture(p);
    if (prev && prev !== next && !reduced) swapAt = performance.now();
    slot.screen.material.map = next;
    slot.screen.material.needsUpdate = true;
    needsFrame = true;
  };
  // Prime every device with its first project so no screen is blank.
  for (const k of kinds) {
    const p = projects.find(x => x.device === k);
    slots[k].screen.material.map = texture(p);
  }
  show(projects[0]);

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const narrow = innerWidth <= 860;
    camera.position.set(0, narrow ? 3.4 : 3.9, narrow ? 10.8 : 13);
    camera.lookAt(0, 1.15, 0);
    camera.updateProjectionMatrix();
    needsFrame = true;
  };
  new ResizeObserver(resize).observe(stage);

  // Chapters drive the table: whichever chapter crosses the middle of the viewport is active.
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) show(projects[+e.target.dataset.chapter]);
  }, { rootMargin: matchMedia('(max-width: 860px)').matches ? '-62% 0px -28% 0px' : '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-chapter]').forEach(c => io.observe(c));

  // Drag to spin; release springs back to the active device. Tap the front screen to open it.
  const canvas = renderer.domElement;
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, drag, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 4) down.moved = true;
    drag = down.drag + dx / 160;
    needsFrame = true;
  });
  const ray = new THREE.Raycaster();
  canvas.addEventListener('pointerup', e => {
    if (down && !down.moved) {
      const r = canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObject(slots[current.device].screen)[0];
      if (hit) location.href = `${root}work/${current.slug}/`;
    }
    down = null;
  });
  canvas.addEventListener('pointercancel', () => { down = null; });

  // Render only while something is moving, and only while the stage is on screen.
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) needsFrame = true; }).observe(stage);
  const loop = now => {
    requestAnimationFrame(loop);
    if (!visible) return;
    if (!down) drag *= reduced ? 0 : 0.88;
    const goal = target + drag;
    const step = reduced ? goal - turn : (goal - turn) * 0.08;
    const swapping = swapAt && now - swapAt < 380;
    if (Math.abs(step) < 1e-4 && Math.abs(drag) < 1e-4 && !swapping && !needsFrame) return;
    turn += step;
    table.rotation.y = turn;
    // Screen swap: a brief dip to dark so the content change reads as a change.
    const k = swapping ? Math.abs((now - swapAt) / 190 - 1) : 1;
    slots[current.device].screen.material.color.setScalar(0.15 + 0.85 * k);
    if (!swapping) swapAt = 0;
    renderer.render(scene, camera);
    needsFrame = false;
  };
  requestAnimationFrame(loop);
}
