import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { initGalleries } from '../gallery.js';
import { initDemos } from '../demos.js';
import { initBrief } from './brief.js';
import { isNight, toggleTheme } from './theme.js';

initGalleries();
initDemos();
initBrief();

const params = new URLSearchParams(location.search);
const still = params.get('still'); // render-stills.cjs: "poster" or a project slug
const reduced = !!still || matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
// Same query as the stacked hero in style.css: the room sits above the copy, not beside it.
const stackedQuery = matchMedia('(max-width: 899px), (orientation: portrait)');
const stacked = () => !still && stackedQuery.matches;
// CSS tokens use light-dark(), so resolve them through a real element.
const cssColor = name => {
  const probe = document.body.appendChild(document.createElement('i'));
  probe.style.color = `var(${name})`;
  const c = new THREE.Color(getComputedStyle(probe).color);
  probe.remove();
  return c;
};
const accent = cssColor('--cobalt');
addEventListener('themechange', () => accent.copy(cssColor('--cobalt')));

// Lighting presets: every value fades between day (0) and night (1).
const ROOM = {
  day: { exposure: 1.08, sky: 0xffffff, ground: 0xcfc6b8, hemi: 1.15, sunColor: 0xfff0d8, sun: 2.6, fillColor: 0xe6eeff, fill: 0.75, lamp: 0, lampGlow: 0, screen: 1 },
  night: { exposure: 0.95, sky: 0x7d8aa8, ground: 0x1d2126, hemi: 0.35, sunColor: 0x9fb0ff, sun: 0.55, fillColor: 0x6f7d99, fill: 0.12, lamp: 30, lampGlow: 4, screen: 0.85 }
};
const OBJECT = {
  day: { exposure: 1.08, ground: 0xcfc6b8, hemi: 1.3, keyColor: 0xfff0d8, key: 2.4, fill: 0.6, shade: 0.16, screen: 1 },
  night: { exposure: 1, ground: 0x2a3038, hemi: 0.95, keyColor: 0xdfe6ff, key: 2, fill: 0.45, shade: 0.35, screen: 0.85 }
};
const mix = (preset, t) => Object.fromEntries(Object.keys(preset.day).map(k => {
  const a = preset.day[k], b = preset.night[k];
  return [k, k.endsWith('olor') || k === 'sky' || k === 'ground' ? new THREE.Color(a).lerp(new THREE.Color(b), t) : a + (b - a) * t];
}));

// Fades a 0..1 day/night value towards the current theme; calls onChange while it moves.
function nightFader(onChange) {
  let t = isNight() ? 1 : 0, goal = t, last = 0;
  addEventListener('themechange', () => { goal = isNight() ? 1 : 0; last = 0; onChange(t); });
  return now => {
    if (t === goal) return t;
    const dt = last ? now - last : 16;
    last = now;
    t = reduced ? goal : goal > t ? Math.min(goal, t + dt / 700) : Math.max(goal, t - dt / 700);
    onChange(t);
    return t;
  };
}
const SCREENS = { theoses: 'theoses-report.webp', map: 'map-home-demo.webp', procura: 'procura-inventory.webp' };
// Parts of a project that sit apart from it and should not steer framing.
const OFF_FRAME = new Set(['server']);
// Per-object camera adjustments: distance multiplier and extra turn around the vertical axis.
// The overview looks from azimuth ~0.7 rad; these turn each close-up towards the object's front.
const VIEW = { procura: { yaw: -0.55 }, pims: { yaw: 0.45 }, 'dd-drugs-register': { yaw: -0.3 }, theoses: { yaw: -0.35 }, map: { yaw: -0.5, dist: 1.15 }, yen: { yaw: -0.2, dist: 1.3 } };

if (still) document.documentElement.classList.add('still');

// gltfpack nests each mesh under the node that carries its Blender name.
const tag = (o, prefix) => [o, o.parent].some(p => p && p.name.startsWith(prefix));

function renderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!still });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.domElement.setAttribute('aria-hidden', 'true');
  return r;
}

// Loads the room and prepares materials: shadows, glass, glowing parts, real screens.
function loadRoom(root, onTexture) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(`${root}static/workshop.glb`).then(gltf => {
    const room = gltf.scene;
    const glows = [], screens = [];
    room.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      if (tag(o, 'glass_')) {
        o.material = o.material.clone();
        Object.assign(o.material, { transparent: true, depthWrite: false });
        o.castShadow = false;
      }
      if (tag(o, 'glow_')) {
        o.userData.glow = true;
        o.castShadow = false;
        o.material = o.material.clone();
        // The desk-lamp bulb is off by day; everything else that glows just brightens at night.
        const base = o.material.emissiveIntensity;
        // The ring light rests dim and switches on when 89lab is opened.
        o.userData.glowRange = tag(o, 'glow_bulb') ? [0.05, base * 4] : tag(o, 'glow_ring') ? [0.15, 0.6] : [base, base * 3];
        o.userData.boost = 0;
        glows.push(o);
      }
      const screen = [o, o.parent].find(p => p && p.name.startsWith('screen_'));
      if (screen && SCREENS[screen.name.slice(7)]) {
        const t = new THREE.TextureLoader().load(`${root}static/${SCREENS[screen.name.slice(7)]}`, onTexture);
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = false;
        t.anisotropy = 8;
        o.material = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
        o.castShadow = false;
        o.userData.bright = screen.name === 'screen_map' ? 0.3 : 1; // the phone sleeps until opened
        screens.push(o);
      }
    });
    const groups = {};
    room.traverse(o => { if (o.name.startsWith('obj_')) groups[o.name.slice(4)] = o; });
    for (const [slug, g] of Object.entries(groups)) {
      g.traverse(o => {
        if (!o.isMesh) return;
        o.userData.slug = slug;
        if (!o.userData.glow && o.material.emissive) o.material = o.material.clone();
      });
    }
    // Materials follow day/night (tint) plus per-part extras set by animations (refresh).
    let night = 0, screenLevel = 1;
    const refresh = () => {
      for (const o of glows) o.material.emissiveIntensity = o.userData.glowRange[0] + (o.userData.glowRange[1] - o.userData.glowRange[0]) * night + o.userData.boost;
      for (const o of screens) o.material.color.setScalar(screenLevel * o.userData.bright);
    };
    const tint = (t, screen) => { night = t; screenLevel = screen; refresh(); };
    return { room, groups, tint, refresh };
  });
}

// First mesh at or under a named node (gltfpack puts meshes one level down).
function meshUnder(scope, name) {
  let found = null;
  scope.getObjectByName(name)?.traverse(o => { if (!found && o.isMesh) found = o; });
  return found;
}

// What each object does when it is opened; k runs 0..1 (eased), now is the frame time.
function opener(scope, slug) {
  const keep = name => { const o = scope.getObjectByName(name); return o && { o, x: o.rotation.x, y: o.rotation.y, z: o.rotation.z }; };
  switch (slug) {
    case 'dd-drugs-register': { const d = keep('safe_hinge'); return d && (k => { d.o.rotation.y = d.y - 1.75 * k; }); }
    case 'pims': {
      const l = keep('cab_hinge_l'), r = keep('cab_hinge_r');
      return l && r && (k => { l.o.rotation.y = l.y - 1.9 * k; r.o.rotation.y = r.y + 1.9 * k; });
    }
    case 'procura': { const t = keep('tablet_tilt'); return t && (k => { t.o.rotation.x = t.x + 0.3 * k; }); }
    case 'yen': { const a = keep('yen_arm_r'); return a && ((k, now) => { a.o.rotation.z = a.z + k * (2.3 + 0.35 * Math.sin(now / 140)); }); }
    case '89lab': { const ring = meshUnder(scope, 'glow_ring'); return ring && (k => { ring.userData.boost = 2.6 * k; }); }
    case 'map': { const phone = meshUnder(scope, 'screen_map'); return phone && (k => { phone.userData.bright = 0.3 + 0.7 * k; }); }
    case 'theoses': { const led = meshUnder(scope, 'glow_server'); return led && ((k, now) => { led.userData.boost = k * (1.5 + 1.5 * Math.sin(now / 90)); }); }
  }
  return null;
}
// Projects whose open state keeps moving (waving, blinking) need every frame while open.
const LIVELY = new Set(['yen', 'theoses']);
const easeOutBack = t => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Small signs of life: Yen looks at the cursor and blinks, the plant sways, dust floats
// in the window light by day. Returns update(now, night), called at ~30fps while visible.
function roomLife(scene, room, camera, canvas) {
  const head = room.getObjectByName('yen_head_pivot');
  const eyes = room.getObjectByName('yen_eyes');
  const plant = room.getObjectByName('plant');
  const plantRest = plant.rotation.clone();
  const pointer = { x: 0, y: 0, active: false };
  if (fine) {
    addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      pointer.active = true;
    });
    document.addEventListener('pointerleave', () => { pointer.active = false; });
  }
  // Dust: a few motes along the sunbeam from the window to the floor patch.
  const from = new THREE.Vector3(-3.9, 1.85, -1.15), to = new THREE.Vector3(-1.2, 0.05, -1.25);
  const count = 70, base = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const p = from.clone().lerp(to, Math.random());
    base.set([p.x + (Math.random() - 0.5) * 0.5, p.y + (Math.random() - 0.5) * 0.9, p.z + (Math.random() - 0.5) * 1.6], i * 3);
    seed[i] = Math.random() * 1000;
  }
  const dot = document.createElement('canvas');
  dot.width = dot.height = 32;
  const g = dot.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, map: new THREE.CanvasTexture(dot), color: 0xfff1d6, transparent: true, depthWrite: false, opacity: 0 }));
  scene.add(dust);

  const headPos = new THREE.Vector3();
  let nextBlink = performance.now() + 2500;
  const look = { x: 0, y: 0 };
  return (now, night) => {
    // Yen follows the cursor; on touch screens it glances around now and then.
    head.getWorldPosition(headPos);
    const h = headPos.project(camera);
    const want = pointer.active
      ? { x: -THREE.MathUtils.clamp((pointer.x - h.x) * 1.8, -0.8, 0.8), y: -THREE.MathUtils.clamp((pointer.y - h.y) * 0.9, -0.3, 0.3) }
      : { x: 0.45 * Math.sin(now / 2600) * Math.max(0, Math.sin(now / 5200)), y: 0 };
    look.x += (want.x - look.x) * 0.12;
    look.y += (want.y - look.y) * 0.12;
    head.rotation.y = look.x;
    head.rotation.x = look.y;
    if (now > nextBlink) nextBlink = now + 2600 + Math.random() * 2600;
    eyes.scale.y = nextBlink - now < 120 ? 0.12 : 1;
    plant.rotation.z = plantRest.z + 0.018 * Math.sin(now / 1700);
    plant.rotation.x = plantRest.x + 0.012 * Math.sin(now / 2300);
    const pos = geo.attributes.position;
    for (let i = 0; i < count; i++) {
      const t = now / 1000 + seed[i];
      pos.setXYZ(i, base[i * 3] + 0.08 * Math.sin(t * 0.3), base[i * 3 + 1] + 0.1 * Math.sin(t * 0.21), base[i * 3 + 2] + 0.08 * Math.cos(t * 0.27));
    }
    pos.needsUpdate = true;
    dust.material.opacity = 0.6 * (1 - night);
    dust.visible = night < 1;
  };
}

// Bounding box of a project, ignoring parts that live elsewhere in the room.
function frameBox(group) {
  const box = new THREE.Box3();
  group.updateWorldMatrix(true, true);
  for (const c of group.children) if (!OFF_FRAME.has(c.name)) box.expandByObject(c);
  return box;
}

const bench = document.querySelector('[data-stage]');
const benchData = document.getElementById('bench-data');
if (bench && benchData) startBench(bench, JSON.parse(benchData.textContent));
const viewer = document.querySelector('[data-object]');
if (viewer) startObject(viewer);

function startBench(stage, { root, projects }) {
  const bySlug = Object.fromEntries(projects.map(p => [p.slug, p]));
  const order = projects.map(p => p.slug);
  let r;
  try { r = renderer(); } catch { return; } // No WebGL: poster image and index links remain.
  const canvas = r.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const home = { pos: new THREE.Vector3(9.6, 7.9, 11.2), target: new THREE.Vector3(0.2, 0.55, 0.1) };

  // Daylight comes in low through the window; a soft fill keeps the desk readable.
  // At night the window light turns to moonlight and the desk lamp takes over.
  const hemi = new THREE.HemisphereLight();
  const sun = new THREE.DirectionalLight();
  sun.position.set(-13, 8.5, 1.2);
  sun.target.position.set(-1, 0, -1.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight();
  fill.position.set(8, 10, 10);
  // The desk lamp: a warm spot on the desk plus a soft glow around the shade.
  const lamp = new THREE.SpotLight(0xffd6a0, 0, 7, 0.95, 0.65, 1.4);
  lamp.target.position.set(0.4, 1.03, -2.1);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0005;
  const lampGlow = new THREE.PointLight(0xffc68a, 0, 5, 1.5);
  scene.add(hemi, fill, lamp, lamp.target, lampGlow);
  let tint = () => {};
  const light = t => {
    const m = mix(ROOM, t);
    r.toneMappingExposure = m.exposure;
    hemi.color.copy(m.sky); hemi.groundColor.copy(m.ground); hemi.intensity = m.hemi;
    sun.color.copy(m.sunColor); sun.intensity = m.sun;
    fill.color.copy(m.fillColor); fill.intensity = m.fill;
    lamp.intensity = m.lamp; lampGlow.intensity = m.lampGlow;
    tint(t, m.screen);
    nightT = t;
    dirty = true;
  };
  const fade = nightFader(light);

  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, {
    enableDamping: true, dampingFactor: 0.08, enableZoom: false, enablePan: false, enableRotate: fine,
    minPolarAngle: 0.7, maxPolarAngle: 1.25, minAzimuthAngle: -0.3, maxAzimuthAngle: 1.5
  });
  camera.position.copy(home.pos);
  controls.target.copy(home.target);
  if (!fine) canvas.style.touchAction = 'pan-y';

  let groups = {}, switcher = null, dirty = true, flight = null, active = null, hovered = null;
  let refresh = () => {}, life = null, intro = null, nightT = 0, lastNow = 0, lastAmbient = 0;
  const openers = {}, open = {};
  loadRoom(root, () => { dirty = true; }).then(({ room, groups: g, tint: t, refresh: rf }) => {
    groups = g;
    tint = t;
    refresh = rf;
    for (const slug of order) {
      const f = opener(room, slug);
      if (f) { openers[slug] = f; open[slug] = 0; }
    }
    if (!reduced) life = roomLife(scene, room, camera, canvas);
    scene.add(room);
    switcher = room.getObjectByName('lamp');
    switcher.traverse(o => { if (o.isMesh && !o.userData.glow) o.material = o.material.clone(); });
    room.getObjectByName('lamp_head').getWorldPosition(lamp.position);
    lampGlow.position.copy(lamp.position).add(new THREE.Vector3(0, -0.15, 0));
    // Night stills are dusk, so objects far from the desk lamp still read on a small card.
    light(isNight() ? (still ? 0.65 : 1) : 0);
    stage.classList.add('is-live');
    stage.prepend(canvas);
    hint.hidden = fine || !!still;
    resize();
    if (tour) hint.textContent = fine ? 'Scroll to walk through the room, or click anything to open it' : 'Scroll for a tour, or tap anything';
    if (still && still !== 'poster') fly(still, true);
    else if (location.hash.slice(1) in bySlug) select(location.hash.slice(1), true);
    else if (!reduced) buildIn(room);
    dirty = true;
  }).catch(err => console.warn('Workshop model failed to load; showing the still image.', err));

  // On wide screens the hero is full-bleed: the room is shifted right of the headline,
  // and slides back to centre while a project is open.
  const shiftFor = width => (!still && !stacked() ? width * 0.15 : 0);
  let size = [1, 1], shift = 0, shiftGoal = 0;
  function frame() {
    camera.setViewOffset(size[0], size[1], -shift, 0, size[0], size[1]);
    dirty = true;
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    r.setSize(width, height, false);
    size = [width, height];
    camera.aspect = width / height;
    // Narrow stages keep the whole room in frame; the full-bleed hero leaves air around it.
    // Stacked stages are only a little wider than tall, so they need more than the stills' 30.
    camera.fov = width / height < 1.15 ? 38 : still ? 30 : stacked() ? 36 : 34;
    shiftGoal = active ? 0 : shiftFor(width);
    if (!flight) shift = shiftGoal;
    frame();
    setTour();
  }
  new ResizeObserver(resize).observe(stage);

  // Scrolling flies the camera through the room, resting at each project, then pulling back
  // before the page carries on. Wide screens pin the whole hero and set each project's name
  // beside it; stacked screens (phones) pin the room at the top while a caption per project
  // scrolls up beneath it. Reduced motion and stills keep the bench as it was.
  const tourBox = document.querySelector('[data-tour]');
  const card = stage.parentElement.querySelector('[data-tour-card]');
  const cardField = name => card.querySelector(`[data-t=${name}]`);
  cardField('open').addEventListener('click', () => select(cardField('open').dataset.slug));
  const stepList = stage.parentElement.querySelector('[data-steps]');
  stepList.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) select(b.dataset.open); });
  let tour = null, shown = -1, openedAt = 0;
  function setTour() {
    const on = !still && !reduced && !!groups[order[0]];
    tourBox.classList.toggle('is-on', on && !stacked());
    tourBox.classList.toggle('is-steps', on && stacked());
    if (!on) {
      if (tour) { tour = null; card.classList.add('is-away'); stage.closest('.bench').classList.remove('is-touring'); stage.classList.remove('is-pinned'); if (!active) fly(home); }
      return;
    }
    history.scrollRestoration = 'manual'; // Back closes a project; it must not also scroll the tour
    const out = { pos: home.pos.clone().sub(home.target).multiplyScalar(1.3).add(home.target), target: home.target };
    const views = [home, ...order.map(viewFor), out];
    const curve = key => new THREE.CatmullRomCurve3(views.map(v => v[key]), false, 'centripetal');
    tour = { pos: curve('pos'), target: curve('target'), n: views.length - 1, steps: stacked() };
    if (tour.steps) { card.classList.add('is-away'); stage.closest('.bench').classList.remove('is-touring'); } else stage.classList.remove('is-pinned');
    tourBox.style.setProperty('--segments', tour.n);
  }
  // The camera rests at each stop for the outer part of a segment and travels in the middle.
  const hold = f => THREE.MathUtils.smoothstep(f, 0.3, 0.7);
  const tourPos = new THREE.Vector3(), tourAim = new THREE.Vector3();
  function stepTour(dt) {
    let s;
    if (tour.steps) {
      // A project's stop is reached when its caption's middle crosses the reading line, just
      // below the middle of the space under the room.
      const list = stepList.getBoundingClientRect();
      s = THREE.MathUtils.clamp((innerHeight * 0.72 - list.top) / stepList.firstElementChild.offsetHeight + 0.5, 0, tour.n);
      stage.classList.toggle('is-pinned', stage.getBoundingClientRect().top < 1);
    } else {
      const box = tourBox.getBoundingClientRect();
      s = THREE.MathUtils.clamp(-box.top / (box.height - innerHeight), 0, 1) * tour.n;
    }
    const i = Math.min(Math.floor(s), tour.n - 1), u = i + hold(s - i);
    tour.pos.getPoint(u / tour.n, tourPos);
    tour.target.getPoint(u / tour.n, tourAim);
    shiftGoal = shiftFor(size[0]) * Math.max(0, 1 - u);
    // Easing towards the path, not jumping onto it, is what makes the scroll feel filmed.
    const a = 1 - Math.pow(0.9, dt / 16.7);
    const moving = camera.position.distanceToSquared(tourPos) + controls.target.distanceToSquared(tourAim) > 1e-6;
    camera.position.lerp(tourPos, a);
    controls.target.lerp(tourAim, a);
    camera.lookAt(controls.target);
    // The caption names the project the camera is resting on; it changes while hidden.
    hint.hidden = s > 0.2;
    if (tour.steps) return moving;
    const near = Math.round(s), p = bySlug[order[near - 1]];
    if (p && near !== shown) {
      shown = near;
      cardField('count').textContent = `${String(near).padStart(2, '0')} / ${String(order.length).padStart(2, '0')}`;
      cardField('object').textContent = p.object;
      cardField('title').textContent = p.title;
      cardField('summary').textContent = p.summary;
      cardField('open').dataset.slug = p.slug;
    }
    card.classList.toggle('is-away', !p || Math.abs(s - near) > 0.32);
    stage.closest('.bench').classList.toggle('is-touring', s > 0.35);
    return moving;
  }
  addEventListener('scroll', () => { if (tour && active && Math.abs(scrollY - openedAt) > 160) back(); }, { passive: true });

  // Highlight in the accent colour; glowing parts keep their own light.
  function highlight(slug, on) {
    const target = slug === 'lamp' ? switcher : groups[slug];
    if (!target) return;
    target.traverse(o => {
      if (!o.isMesh || o.userData.glow || !o.material.emissive) return;
      o.material.emissive.copy(on ? accent : new THREE.Color(0));
      o.material.emissiveIntensity = on ? 0.32 : 1;
    });
    dirty = true;
  }

  // First view: each object lights up in turn, so phones without hover learn what is clickable.
  // First load: the room builds itself, furniture landing back to front with a small bounce;
  // then each object lights up in turn so phones without hover learn what is clickable.
  function buildIn(room) {
    const pieces = room.children.filter(c => c.name !== 'room').sort((a, b) => a.position.z - b.position.z);
    for (const p of pieces) {
      p.userData.restY = p.position.y;
      p.userData.restScale = p.scale.clone();
      p.scale.setScalar(0.0001);
    }
    intro = { t0: performance.now() + 200, pieces };
  }
  // The sweep names each object as it lights up, slow enough to read.
  function sweep() {
    const all = [...order, 'lamp'];
    all.forEach((slug, i) => {
      setTimeout(() => { if (!active && hovered !== slug) { highlight(slug, true); if (!hovered) tipOver(slug); } }, 150 + i * 450);
      setTimeout(() => { if (!active && hovered !== slug) highlight(slug, false); }, 150 + i * 450 + 600);
    });
    setTimeout(() => { if (!hovered) tip.hidden = true; }, 150 + all.length * 450 + 150);
  }
  function stepIntro(now) {
    let done = true;
    intro.pieces.forEach((p, i) => {
      const t = THREE.MathUtils.clamp((now - intro.t0 - i * 80) / 650, 0, 1);
      if (t < 1) done = false;
      p.position.y = p.userData.restY + (1 - easeOutBack(t)) * 1.4;
      p.scale.copy(p.userData.restScale).multiplyScalar(Math.max(0.0001, Math.min(1, t * 1.6)));
    });
    if (done) { intro = null; sweep(); }
  }

  const tip = stage.querySelector('[data-tip]');
  const hint = stage.querySelector('[data-hint]');
  const label = slug => (slug === 'lamp' ? (isNight() ? 'Turn the lights on' : 'Turn the lights off') : bySlug[slug].title);
  // Places the tip just above an object, for when there is no cursor to follow.
  const above = new THREE.Vector3();
  function tipOver(slug) {
    const box = slug === 'lamp' ? new THREE.Box3().setFromObject(switcher) : frameBox(groups[slug]);
    box.getCenter(above).setY(box.max.y).project(camera);
    tip.textContent = label(slug);
    tip.hidden = false;
    tip.style.transform = `translate(${((above.x + 1) / 2) * size[0]}px, ${((1 - above.y) / 2) * size[1]}px) translate(-50%, -130%)`;
  }
  const ray = new THREE.Raycaster();
  const pick = e => {
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...Object.values(groups), switcher].filter(Boolean), true).find(h => !tag(h.object, 'glass_'));
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) if (o === switcher) return 'lamp';
    return hit.object.userData.slug;
  };
  canvas.addEventListener('pointermove', e => {
    if (!fine || e.buttons) return;
    const slug = pick(e) || null;
    if (slug !== hovered) {
      highlight(hovered, false);
      if (slug !== active) highlight(slug, true);
      hovered = slug;
    }
    canvas.style.cursor = slug ? 'pointer' : tour && !active ? '' : 'grab';
    tip.hidden = !slug;
    if (slug) {
      const rect = stage.getBoundingClientRect();
      tip.textContent = label(slug);
      tip.style.transform = `translate(${e.clientX - rect.left + 14}px, ${e.clientY - rect.top + 14}px)`;
    }
  });
  canvas.addEventListener('pointerleave', () => { highlight(hovered, false); hovered = null; tip.hidden = true; });

  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const slug = pick(e);
    if (slug === 'lamp') { toggleTheme(); tip.hidden = hint.hidden = true; } else if (slug) select(slug); else if (active) back();
  });

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function viewFor(slug) {
    const box = frameBox(groups[slug]);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const tune = VIEW[slug] || {};
    const dir = home.pos.clone().sub(home.target).normalize().applyAxisAngle(camera.up, tune.yaw || 0);
    const wide = !still && !stacked();
    // Wide screens: shift the object left of the drawer. Stacked: the drawer sits below the room.
    const target = center.clone().add(new THREE.Vector3().crossVectors(camera.up, dir).normalize().multiplyScalar(wide ? size * 0.35 : 0));
    const fit = size / 2 / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2); // distance that fits the object
    const dist = fit * (still ? 0.9 : 1.6) * (tune.dist || 1);
    return { pos: target.clone().add(dir.multiplyScalar(dist)), target };
  }
  function fly(to, instant) {
    const v = typeof to === 'string' ? viewFor(to) : to;
    flight = { from: { pos: camera.position.clone(), target: controls.target.clone() }, to: v, t0: performance.now(), ms: instant || reduced ? 0 : 1000 };
    dirty = true;
  }

  const drawer = document.querySelector('[data-drawer]');
  const f = name => drawer.querySelector(`[data-f=${name}]`);
  const steps = [...drawer.querySelectorAll('[data-step]')];
  let lastTrigger = null;
  // Opening an object adds one history entry, so the browser's Back closes it instead of
  // leaving the site; moving between objects replaces that entry. fromHistory: Back/Forward.
  let pushed = false;
  function select(slug, fromHistory) {
    const p = bySlug[slug];
    if (!p || !groups[slug]) return;
    if (!fromHistory) {
      if (active) history.replaceState(null, '', `#${slug}`);
      else { history.pushState(null, '', `#${slug}`); pushed = true; }
    }
    if (!active) lastTrigger = document.activeElement;
    highlight(active, false);
    highlight(hovered, false);
    tip.hidden = hint.hidden = true;
    active = slug;
    shiftGoal = 0;
    openedAt = scrollY;
    card.classList.add('is-away');
    stage.closest('.bench').classList.add('is-inside');
    fly(slug);
    f('category').textContent = p.category;
    f('title').textContent = p.title;
    f('summary').textContent = p.summary;
    f('description').textContent = p.description;
    f('link').href = `${root}work/${p.slug}/`;
    const fig = f('figure');
    fig.replaceChildren();
    if (p.image) {
      fig.append(Object.assign(document.createElement('img'), { src: `${root}static/${p.image}`, alt: `${p.title} screen with fictional sample data` }));
    } else {
      const ol = document.createElement('ol');
      for (const s of p.steps) ol.append(Object.assign(document.createElement('li'), { textContent: s }));
      fig.append(ol);
    }
    fig.append(Object.assign(document.createElement('figcaption'), { textContent: p.image ? p.disclosure : 'Workflow outline, not a screenshot' }));
    fig.classList.toggle('is-phone', p.image === 'map-home-demo.webp');
    const i = order.indexOf(slug);
    steps.forEach(b => {
      const to = bySlug[order[(i + +b.dataset.step + order.length) % order.length]];
      b.dataset.to = to.slug;
      b.querySelector('span').textContent = to.title;
    });
    drawer.hidden = false;
    stage.classList.add('has-drawer');
    document.querySelectorAll('[data-pick]').forEach(a => a.toggleAttribute('aria-current', a.dataset.pick === slug));
    if (!drawer.contains(document.activeElement)) drawer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function back(fromHistory) {
    if (!active) return;
    if (!fromHistory && pushed) { pushed = false; history.back(); return; } // popstate finishes closing
    if (!fromHistory) history.replaceState(null, '', location.pathname + location.search);
    pushed = false;
    highlight(active, false);
    active = null;
    shiftGoal = shiftFor(size[0]);
    stage.closest('.bench').classList.remove('is-inside');
    drawer.hidden = true;
    stage.classList.remove('has-drawer');
    if (tour) flight = null; else fly(home); // the tour eases back onto its path
    document.querySelectorAll('[data-pick]').forEach(a => a.removeAttribute('aria-current'));
    if (lastTrigger && lastTrigger.matches('[data-pick]')) lastTrigger.focus({ preventScroll: true });
  }
  addEventListener('popstate', () => {
    const slug = location.hash.slice(1);
    if (slug in bySlug) select(slug, true); else back(true);
  });
  drawer.querySelector('[data-close]').addEventListener('click', () => back());
  steps.forEach(b => b.addEventListener('click', () => select(b.dataset.to)));
  addEventListener('keydown', e => {
    if (!active || e.target.closest('input, textarea, select')) return;
    if (e.key === 'Escape') back();
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (step) { e.preventDefault(); steps.find(b => +b.dataset.step === step).click(); }
  });
  document.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', e => {
    if (!groups[a.dataset.pick]) return; // model not loaded: follow the link
    e.preventDefault();
    if (stacked() && !tour) stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    select(a.dataset.pick);
  }));

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }).observe(stage);
  controls.addEventListener('change', () => { dirty = true; });
  const loop = now => {
    requestAnimationFrame(loop);
    if (!visible) return;
    if (flight) {
      const t = flight.ms ? Math.min(1, (now - flight.t0) / flight.ms) : 1;
      const k = ease(t);
      camera.position.lerpVectors(flight.from.pos, flight.to.pos, k);
      controls.target.lerpVectors(flight.from.target, flight.to.target, k);
      dirty = true;
      if (t === 1) flight = null;
    }
    if (shift !== shiftGoal) {
      shift = reduced || Math.abs(shiftGoal - shift) < 0.5 ? shiftGoal : shift + (shiftGoal - shift) * 0.08;
      frame();
    }
    const dt = Math.min(64, lastNow ? now - lastNow : 16);
    lastNow = now;
    controls.enabled = !tour || !!active;
    if (tour && !active && !flight) { if (stepTour(dt)) dirty = true; } else if (controls.update()) dirty = true;
    fade(now);
    if (intro) { stepIntro(now); dirty = true; }
    // Opening and closing the active object.
    let moved = false;
    for (const slug in openers) {
      const goal = slug === active ? 1 : 0;
      if (open[slug] === goal) continue;
      open[slug] = reduced ? goal : goal > open[slug] ? Math.min(goal, open[slug] + dt / 650) : Math.max(goal, open[slug] - dt / 650);
      openers[slug](easeInOut(open[slug]), now);
      moved = true;
    }
    // Ambient life and anything that keeps moving while open, at about 30fps.
    if (life && !document.hidden && now - lastAmbient > 33) {
      lastAmbient = now;
      life(now, nightT);
      for (const slug of LIVELY) if (openers[slug]) openers[slug](easeInOut(open[slug]), now);
      moved = true;
    }
    if (moved) { refresh(); dirty = true; }
    if (!dirty) return;
    r.render(scene, camera);
    dirty = false;
    if (still && !flight) document.documentElement.dataset.ready = '1';
  };
  requestAnimationFrame(loop);
}

// Case pages: the project's object on its own, turned by dragging sideways.
function startObject(box) {
  const slug = box.dataset.object;
  const root = box.dataset.root;
  let r;
  try { r = renderer(); } catch { return; }
  const canvas = r.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  const hemi = new THREE.HemisphereLight(0xffffff);
  const key = new THREE.DirectionalLight();
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
  const fill = new THREE.DirectionalLight(0xe6eeff);
  fill.position.set(4, 3, 2);
  scene.add(hemi, key, fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial());
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const turntable = new THREE.Group();
  scene.add(turntable);
  let dirty = true, spin = reduced ? 0 : -0.7, aim = 0, tint = () => {};
  const light = t => {
    const m = mix(OBJECT, t);
    r.toneMappingExposure = m.exposure;
    hemi.groundColor.copy(m.ground); hemi.intensity = m.hemi;
    key.color.copy(m.keyColor); key.intensity = m.key;
    fill.intensity = m.fill;
    floor.material.opacity = m.shade;
    tint(t, m.screen);
    dirty = true;
  };
  const fade = nightFader(light);
  light(isNight() ? 1 : 0);
  loadRoom(root, () => { dirty = true; }).then(({ groups, tint: t }) => {
    tint = t;
    light(isNight() ? 1 : 0);
    const g = groups[slug];
    if (!g) return;
    const obj = g.clone(true);
    obj.children.filter(c => OFF_FRAME.has(c.name)).forEach(c => obj.remove(c));
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(obj);
    const c = b.getCenter(new THREE.Vector3());
    obj.position.set(-c.x, -b.min.y, -c.z);
    turntable.add(obj);
    const size = b.getSize(new THREE.Vector3());
    const fit = size.length() / 2 / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2);
    // Tall objects (the phone on its stand) need more room above them at this camera tilt.
    camera.position.set(0, size.y / 2, 0).add(new THREE.Vector3(0, 0.45, 1).normalize().multiplyScalar(fit * (size.y > size.x ? 1.05 : 0.85)));
    camera.lookAt(0, size.y / 2, 0);
    box.classList.add('is-live');
    box.prepend(canvas);
    resize();
  }).catch(err => console.warn('Object view unavailable; showing the still image.', err));

  function resize() {
    const { width, height } = box.getBoundingClientRect();
    if (!width || !height) return;
    r.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(box);

  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, aim }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (down) { aim = down.aim + (e.clientX - down.x) / 120; dirty = true; } });
  canvas.addEventListener('pointerup', () => { down = null; });
  canvas.addEventListener('pointercancel', () => { down = null; });

  const loop = now => {
    requestAnimationFrame(loop);
    fade(now);
    const step = reduced ? aim - spin : (aim - spin) * 0.08;
    if (Math.abs(step) > 1e-4) { spin += step; dirty = true; }
    if (!dirty) return;
    turntable.rotation.y = spin;
    r.render(scene, camera);
    dirty = false;
  };
  requestAnimationFrame(loop);
}
