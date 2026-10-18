import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { isNight } from './theme.js';
// The House and the project-page object viewer, loaded by main.js once the page has painted (it is most of the bytes).

const params = new URLSearchParams(location.search);
const still = params.get('still'); // render-stills.cjs: "poster", "poster-phone"
const reduced = !!still || matchMedia('(prefers-reduced-motion: reduce)').matches;
// Same query as the stacked hero in style.css: the room sits above the copy, not beside it.
const stackedQuery = matchMedia('(max-width: 899px), (orientation: portrait)');
const stacked = () => still === 'poster-phone' || (!still && stackedQuery.matches);

// Lighting presets of the project-page viewer: every value fades between day (0) and night (1).
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

if (still) document.documentElement.classList.add('still');

// gltfpack nests each mesh under the node that carries its Blender name.
const tag = (o, prefix) => [o, o.parent].some(p => p && p.name.startsWith(prefix));

function renderer() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!still });
  // The room is a full-screen background, so phones render it at a lighter pixel ratio.
  r.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
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

// ---------------------------------------------------------------------------------------------------------
// The House. house.glb (build_house.py) is a two-storey concrete villa on a plinth by a lake, inside and out, with its
// lighting baked into house-light.webp (a second UV set), so the page has no lights to run; house-wet.webp, on the same
// UV set, is the concrete's roughness (damp where rain runs down it and at the waterline, so it catches the sky there).
// What it does not hold: the sky with its mountain in the mist is the backdrop plate (build_backdrop.py) on the sky dome,
// and the lake is a mirror of the scene (a Reflector) rippled by a small normal map, so the warm windows run down the
// water. The scroll glides the camera along one path with a stop for every [data-stop] element of the page.

// build_house.py stores the baked irradiance as E / (pi * LIGHT_RANGE); three's lightMap wants E.
const LIGHT_SCALE = Math.PI * 4.0;
// The plate (build_backdrop.py): its columns run from az0 to az1 degrees either side of straight ahead (towards -z), its
// rows from el1 at the top down to el0. mist is the horizon's colour, which the fog fades the land and the lake into.
const BACKDROP = { az0: -50, az1: 50, el0: -6, el1: 34 };
const SKY = { mist: 0x667a82, zenith: 0x56646c };
const PHONE_OY = 0.17; // phones: the subject sits above the card at the bottom of the screen

// Where the camera rests, in glTF axes (x right, y up, z towards the lake; the House's depth runs along -z). A stop's
// data-look names one (page.cjs). pos and at: the camera and what it looks at; hfov: horizontal field of view in
// degrees; off: on wide screens how far the picture is pushed right of the panel, as a share of the screen's width; exp:
// exposure. A stop with near names a node of the House (doorway_<slug>, balcony): the camera stands from that far away
// and looks at it plus look. .phone overrides on phones, where the card sits at the bottom and up lifts the picture
// clear of it (a share of the screen's height). via lists waypoints (pos, at: in the House's axes) the camera passes on its way
// to that stop from the one before, to keep the path clear of walls and slabs.
// Up the oak stairs on the right of the ground floor (treads climb 0.18 m per 0.27 m along -z from z=-6), with the eye 1.7 m above a tread.
const STAIRS = [{ pos: [4.6, 2.8, -3.4], at: [6.45, 3.6, -7] }, { pos: [6.45, 2.78, -6.2], at: [6.45, 4.4, -9.5] }, { pos: [6.45, 4.5, -8.8], at: [6.4, 6.3, -12] }, { pos: [6.4, 6.4, -11.2], at: [2, 6.2, -6] }];
// A poster on the stair wall (poster_<step>): the camera stands on the flight about 1.6 m above the tread, back down the stairs
// from it, and looks at it across the treads; dy lowers it (the second keeps under the slab's edge, which it has just passed).
const poster = (step, dy = 0.12) => ({ near: `poster_${step}`, from: [-1.42, dy, 1.15], look: [0, -0.02, 0], hfov: 58, off: 0.12, exp: 1.1, phone: { hfov: 50, up: 0.26, from: [-1.42, dy, 1.3] } });
const doorway = (slug, from) => ({ near: `doorway_${slug}`, from, look: [0, 1.3, 0], hfov: 62, off: 0.12, exp: 1.1, phone: { hfov: 44, up: 0.28, from: [from[0] * 0.5, from[1], from[2] - 3] } });
// The Rooms: each its own asset (room-<slug>.glb, lit by room-<slug>-light.webp, model/room_<slug>.py) behind the House's
// doorway_<slug>, fetched once the visitor is a Room away; then its door is taken away. A Room's project objects are obj_<slug>
// (a click opens the case study) and their screens screen_<slug>, which show the project's screenshots from its stops in the page.
const ROOMS = { stock: ['procura', 'pims'] };
// Through the stock Room's doorway (x -3.8, 1.3 m wide, 2.55 m high): its middle, a step either side of the wall.
const STOCK_DOOR = [{ pos: [-3.8, 2.6, -11.0], at: [-3.8, 2.4, -16] }, { pos: [-3.8, 2.65, -13.0], at: [-1.5, 2.2, -16] }];
// A stop in a Room: where the camera stands and what it looks at (a project's object), in the House's axes.
const roomStop = (pos, at, phone = {}) => ({ pos, at, hfov: 58, off: 0.12, exp: 1.15, phone: { hfov: 46, up: 0.26, ...phone } });
const STOPS = {
  hero: { pos: [4, 2.0, 41], at: [-1, 7.5, -4], hfov: 52, off: 0.22, exp: 1.0, phone: { pos: [2.5, 2.2, 38], at: [0, 8, -4], hfov: 33, up: 0.22 } },
  door: { pos: [0, 2.2, 4.2], at: [0, 2.6, -8], hfov: 66, off: 0.12, exp: 1.2, phone: { pos: [0, 2.2, 5.5], hfov: 42, up: 0.26 } },
  stock: { ...doorway('stock', [3.4, 1.8, 10.5]), via: [{ pos: [0, 2.5, -1.4], at: [-2.4, 2.4, -12] }] }, // in through the middle of the open door
  // The stock Room: Procura's workstation against the partition, PIMS's tablet on the wall by the door.
  'procura-1': { ...roomStop([-3.6, 2.75, -14.2], [-0.9, 2.0, -16.2]), via: STOCK_DOOR },
  'procura-2': roomStop([-2.4, 2.6, -17.9], [-0.9, 2.1, -15.8]),
  'procura-3': roomStop([-2.05, 2.3, -16.0], [-0.77, 2.26, -16.0]),
  'procura-4': roomStop([-4.8, 2.95, -13.4], [-2.0, 1.8, -17.0]),
  'pims-1': roomStop([-5.4, 2.7, -15.8], [-7.8, 2.25, -14.3]),
  'pims-2': roomStop([-5.6, 2.6, -12.9], [-8.2, 2.2, -14.8]),
  'pims-3': roomStop([-7.0, 2.52, -13.9], [-8.17, 2.5, -13.9]),
  'pims-4': roomStop([-1.6, 2.9, -18.1], [-6.0, 1.9, -14.2]),
  records: { ...doorway('records', [-2.6, 1.8, 10.5]), via: [{ pos: [-3.8, 2.65, -13.0], at: [-3.8, 2.4, -8] }, { pos: [-3.8, 2.6, -11.0], at: [-1.5, 2.4, -6] }] }, // back out of the stock Room's doorway
  // Up the stairs one poster at a time (How I work, on the stair wall), then on up to the first floor.
  requirements: poster('requirements'),
  build: poster('build', -0.6),
  measure: poster('measure'),
  ai: { ...doorway('ai', [3.4, 1.7, 10.5]), via: STAIRS.slice(3) },
  android: doorway('android', [-2.6, 1.7, 10.5]),
  teach: { near: 'balcony', from: [0, 1.75, -4.6], look: [-1.8, 0.9, 6], hfov: 62, off: 0.12, exp: 1.1, phone: { hfov: 52, up: 0.2 } },
  end: { via: [{ pos: [0.3, 6.5, 2.8], at: [0, 6, 20] }], pos: [18, 17, 62], at: [0, 4, -8], hfov: 38, off: 0, up: 0.2, exp: 1.0, phone: { pos: [14, 13, 52], at: [0, 4, -8], hfov: 30 } }
};

// The sky dome: the backdrop plate by direction, mist below and around it, a darker overcast above it.
function skyDome(plate) {
  const c = hex => new THREE.Color(hex);
  const rad = d => THREE.MathUtils.degToRad(d);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { plate: { value: plate }, mist: { value: c(SKY.mist) }, zenith: { value: c(SKY.zenith) }, az: { value: new THREE.Vector2(rad(BACKDROP.az0), rad(BACKDROP.az1)) }, el: { value: new THREE.Vector2(rad(BACKDROP.el0), rad(BACKDROP.el1)) } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D plate; uniform vec3 mist, zenith; uniform vec2 az, el;
varying vec3 d;
void main(){
  float a = atan(d.x, -d.z), e = asin(clamp(d.y, -1.0, 1.0));
  if (abs(a) > 1.5708) a = a > 0.0 ? 3.14159 - a : -3.14159 - a; // behind the camera's lake the same far shore, mirrored
  vec2 uv = vec2((a - az.x) / (az.y - az.x), 1.0 - (e - el.x) / (el.y - el.x));
  vec3 c = texture2D(plate, clamp(uv, 0.001, 0.999)).rgb;
  if (e > el.y) c = mix(c, zenith, smoothstep(0.0, 1.0, (e - el.y) / (1.57 - el.y)));
  if (e < el.x) c = mist;
  if (abs(a) > az.y) c = mix(c, mist, smoothstep(0.0, 0.35, abs(a) - az.y));
  gl_FragColor = vec4(c, 1.0);
#include <colorspace_fragment>
}`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), m);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}
// Trees, dark and unlit: the vertex colours carry the shading, a leafy mottling in world space breaks it up, mist lies on the ground
// beneath them, and the fog does the distance. The near trees' branch cards bring their branch texture (map), cut out by its alpha.
function foliageMaterial(map) {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, map, alphaTest: map ? 0.45 : 0 });
  m.onBeforeCompile = s => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLeaf;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeaf = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vLeaf;
float leaf3(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float leafNoise(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(leaf3(i), leaf3(i + vec3(1, 0, 0)), f.x), mix(leaf3(i + vec3(0, 1, 0)), leaf3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(leaf3(i + vec3(0, 0, 1)), leaf3(i + vec3(1, 0, 1)), f.x), mix(leaf3(i + vec3(0, 1, 1)), leaf3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`).replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= 0.4 + 1.2 * (leafNoise(vLeaf * 0.8) * 0.35 + leafNoise(vLeaf * 2.6) * 0.3 + leafNoise(vLeaf * 8.0) * 0.35);
  diffuseColor.rgb = mix(diffuseColor.rgb, fogColor, 0.55 * exp(-max(vLeaf.y, 0.0) / 2.2));`);
  };
  return m;
}
// What metal and glass reflect: the same sky.
function skyEnvironment(r, plate) {
  const s = new THREE.Scene();
  s.add(skyDome(plate));
  const pmrem = new THREE.PMREMGenerator(r);
  const env = pmrem.fromScene(s, 0.02, 1, 1000).texture;
  pmrem.dispose();
  return env;
}
// Glass shows the sky's reflection over whatever is behind it, and tints that a little.
function glassMaterial(env) {
  const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x05080a, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.12, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.4 });
  m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <premultiplied_alpha_fragment>', ''); };
  return m;
}

// The lake: a dark mountain lake. A planar reflection of the scene (a Reflector) at reduced resolution, pushed about by a small tiling ripple
// normal map (water-normal.webp, from build_water.py): two layers, stretched across the lake and drifting slowly against each other, so a
// window's light runs down the water in long, smooth, softly broken streaks. A few taps blur the reflection down the picture. Fresnel
// keeps it dark when looked down on and mirror-like at a low angle.
const WATER = {
  name: 'LakeShader',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, tRipple: { value: null }, time: { value: 0 }, deep: { value: new THREE.Color(0x020507) }, fogColor: { value: new THREE.Color(SKY.mist) }, fogDensity: { value: 0 } },
  vertexShader: `uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
void main(){ vUv = textureMatrix * vec4(position, 1.0); vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tRipple; uniform float time, fogDensity; uniform vec3 deep, fogColor;
varying vec4 vUv; varying vec3 vWorld;
void main(){
  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 view = toCam / dist;
  // Ripples: rows across the lake (the map is stretched along x), two scales drifting in different directions. Far away they are smaller
  // than a pixel and only shimmer, so they fade.
  vec2 w = vWorld.xz;
  vec2 a = texture2D(tRipple, w * vec2(0.07, 0.34) + vec2(time * 0.004, time * 0.009)).xy - 0.5;
  vec2 b = texture2D(tRipple, w * vec2(0.17, 0.83) + vec2(-time * 0.006, time * 0.013) + 0.37).xy - 0.5;
  vec2 n = (a + 0.6 * b) * 2.0 / (1.0 + dist * 0.012);
  vec2 p = vUv.xy / vUv.w + vec2(n.x * 0.003, n.y * 0.038);
  vec3 refl = vec3(0.0);
  float sum = 0.0;
  for (int i = -6; i <= 6; i++) {
    float wt = exp(-float(i * i) / 16.0);
    refl += wt * texture2D(tDiffuse, p + vec2(0.0, float(i) * 0.006)).rgb;
    sum += wt;
  }
  refl /= sum;
  float f = 0.04 + 0.96 * pow(1.0 - max(view.y, 0.0), 5.0);
  vec3 c = mix(deep, refl * vec3(0.62, 0.66, 0.67), clamp(f * 1.15, 0.0, 1.0));
  float fogF = 1.0 - exp(-fogDensity * fogDensity * dist * dist);
  c = mix(c, fogColor, fogF);
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`
};

// The How I work posters on the stair wall: step, then a line drawing of it, drawn in the page's own type onto each poster
// (poster_<step> in the glb is blank paper, mapped 0..1, under the baked light).
const POSTERS = { requirements: ['Requirements', 1], build: ['Build', 2], measure: ['Measure', 3] };
function drawPoster(mesh, step, aniso) {
  const [word, n] = POSTERS[step];
  return document.fonts.load('700 40px Schibsted').catch(() => {}).then(() => {
    const W = 512, H = 695, c = document.createElement('canvas');
    c.width = 512; c.height = 1024; // drawn at the poster's own proportions
    const g = c.getContext('2d');
    g.scale(1, 1024 / H);
    const ink = '#1f252c', cobalt = '#2f4fd0';
    g.fillStyle = '#efede7'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5b646d'; g.font = '600 26px Schibsted, sans-serif';
    g.fillText('How I work', 44, 66);
    g.textAlign = 'right'; g.fillText(`${n} / 3`, W - 44, 66); g.textAlign = 'left';
    g.strokeStyle = cobalt; g.fillStyle = cobalt; g.lineWidth = 7; g.lineJoin = g.lineCap = 'round';
    const box = (x, y, w, h) => { g.beginPath(); g.roundRect(x, y, w, h, 10); g.stroke(); };
    const arrow = (x0, y0, x1, y1) => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 16 * Math.cos(a - 0.5), y1 - 16 * Math.sin(a - 0.5)); g.lineTo(x1 - 16 * Math.cos(a + 0.5), y1 - 16 * Math.sin(a + 0.5)); g.closePath(); g.fill(); };
    if (step === 'requirements') { // a workflow mapped out: steps and where they lead
      box(56, 180, 120, 80); box(336, 180, 120, 80); box(196, 330, 120, 80); box(56, 430, 120, 80); box(336, 430, 120, 80);
      arrow(176, 220, 326, 220); arrow(396, 260, 300, 324); arrow(212, 410, 150, 424); arrow(300, 410, 366, 424);
    } else if (step === 'build') { // parts put together, one on another
      box(96, 400, 320, 110); box(136, 290, 240, 110); box(186, 180, 140, 110);
      g.beginPath(); g.moveTo(256, 180); g.lineTo(256, 150); g.stroke();
    } else { // a line that rises, read off its points
      g.strokeStyle = ink; g.lineWidth = 5;
      g.beginPath(); g.moveTo(64, 160); g.lineTo(64, 520); g.lineTo(456, 520); g.stroke();
      g.strokeStyle = cobalt; g.lineWidth = 7;
      const pts = [[100, 470], [180, 430], [260, 445], [340, 330], [420, 220]];
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); }
    }
    g.fillStyle = ink;
    let size = 84;
    do { g.font = `700 ${size}px Schibsted, sans-serif`; size -= 2; } while (g.measureText(word).width > W - 88);
    g.fillText(word, 44, H - 58);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.anisotropy = aniso;
    mesh.material = mesh.material.clone();
    mesh.material.map = t;
    mesh.material.color.setScalar(1);
    Object.assign(mesh.material, { emissiveMap: t, emissiveIntensity: 0.22 }); // a little light of its own, so the paper is not all lamp-amber
    mesh.material.emissive.setScalar(1);
  });
}

// The last pass, on the tone-mapped picture: a colour grade (shadows a touch cool, the lamplit highlights a touch warm, a soft
// S-curve), a vignette centred on the subject (centre: where the camera's axis lands, which the panel pushes off-centre) and on
// desktop a faint, fixed film grain.
const GRADE = {
  name: 'GradeShader',
  uniforms: { tDiffuse: { value: null }, center: { value: new THREE.Vector2(0.5, 0.5) }, aspect: { value: 1 }, vignette: { value: 0.22 }, grain: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 center; uniform float aspect, vignette, grain;
varying vec2 vUv;
void main(){
  vec4 t = texture2D(tDiffuse, vUv);
  vec3 c = t.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c *= mix(vec3(0.97, 0.995, 1.03), vec3(1.035, 1.0, 0.95), smoothstep(0.15, 0.75, l));
  c = mix(c, c * c * (3.0 - 2.0 * c), 0.22);
  vec2 q = (vUv - center) * vec2(aspect, 1.0);
  c *= 1.0 - vignette * smoothstep(0.35, 1.25, length(q));
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  c += n * grain * (0.35 + l * (1.0 - l) * 2.6);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), t.a);
}`
};

function startHouse(stage, { root }) {
  const noRoom = () => document.documentElement.removeAttribute('data-room'); // back to the static page
  let r;
  try { r = renderer(); } catch { noRoom(); return; } // No WebGL: poster image and index links remain.
  r.shadowMap.enabled = false; // the lighting is baked
  r.toneMapping = THREE.NeutralToneMapping;
  const canvas = r.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 900);
  scene.fog = new THREE.FogExp2(SKY.mist, 0.0075);
  // The picture is rendered in linear light, the windows' glow blooms (desktop), then tone mapping and the grade (GRADE).
  const coarse = matchMedia('(pointer: coarse)').matches;
  const composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  if (!coarse) composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.55, 1.4));
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GRADE);
  grade.uniforms.grain.value = coarse ? 0 : 0.03;
  composer.addPass(grade);

  let house = null, dress = null, anisotropy = 1;
  const rooms = {}, roomScenes = [], screens = [];
  // A Room, once: its asset dressed like the House, its screens given their screenshots, its door taken away.
  function fetchRoom(slug) {
    return (rooms[slug] ||= Promise.all([loader.loadAsync(`${root}static/room-${slug}.glb`), textures.loadAsync(`${root}static/room-${slug}-light.webp`)]).then(([g, light]) => {
      light.colorSpace = THREE.SRGBColorSpace;
      light.flipY = false;
      light.channel = 1;
      dress(g.scene, light, 1);
      g.scene.traverse(o => {
        const name = [o, o.parent].find(p => p?.name.startsWith('screen_'))?.name;
        if (!o.isMesh || !name) return;
        const slug = name.slice(7);
        const shots = [...document.querySelectorAll(`[data-project="${slug}"] .stop-shots img`)].map(img => {
          const t = textures.load(img.getAttribute('src'), () => { dirty = true; });
          Object.assign(t, { colorSpace: THREE.SRGBColorSpace, flipY: false, anisotropy });
          return t;
        });
        o.material = new THREE.MeshBasicMaterial({ map: shots[0], color: 0xe8e8e8 });
        Object.assign(o.userData, { slug, shots, shown: 0 });
        screens.push(o);
      });
      scene.add(g.scene);
      g.scene.updateMatrixWorld(true);
      house.getObjectByName(`door_${slug}`).visible = false;
      roomScenes.push(g.scene);
      dirty = true;
      return g.scene;
    }).catch(err => console.warn(`The ${slug} Room failed to load.`, err)));
  }
  // At a project's screens stop (<slug>-3) its screen shows each of its screenshots in turn; elsewhere the first.
  function turnScreens(now) {
    for (const o of screens) {
      const { slug, shots } = o.userData;
      const want = tour?.here === `${slug}-3` ? Math.floor(now / 2600) % shots.length : 0;
      if (want !== o.userData.shown) { o.userData.shown = want; o.material.map = shots[want]; dirty = true; }
    }
  }
  // A click on a project's object opens its case study.
  const picker = new THREE.Raycaster();
  function pick(e) {
    if (!roomScenes.length) return null;
    const b = canvas.getBoundingClientRect();
    picker.setFromCamera(new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), camera);
    let o = picker.intersectObjects(roomScenes, true)[0]?.object;
    while (o && !o.name.startsWith('obj_')) o = o.parent;
    return o ? o.name.slice(4) : null;
  }
  canvas.addEventListener('click', e => { const slug = pick(e); if (slug) location.href = `${root}work/${slug}/`; });
  canvas.addEventListener('pointermove', e => { canvas.style.cursor = pick(e) ? 'pointer' : ''; }, { passive: true });

  let nodes = {}, loaded = false, dirty = true, size = [1, 1], tour = null, lastNow = 0, lake = null, dome = null;
  const shift = { x: 0, y: 0 }, shiftGoal = { x: 0, y: 0 };
  const aim = new THREE.Vector3(); // what the camera looks at
  const setGoal = (g, jump) => { Object.assign(shiftGoal, g); if (jump) Object.assign(shift, g); };

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textures = new THREE.TextureLoader();
  Promise.all([loader.loadAsync(`${root}static/house.glb`), ...['house-light', 'backdrop', 'house-wet', 'water-normal'].map(f => textures.loadAsync(`${root}static/${f}.webp`))]).then(([gltf, light, plate, wet, ripple]) => {
    for (const t of [light, plate]) { t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; }
    light.channel = wet.channel = 1; // both follow the second UV set (the baked lighting's layout)
    wet.flipY = false;
    ripple.wrapS = ripple.wrapT = THREE.RepeatWrapping;
    ripple.anisotropy = 4;
    plate.generateMipmaps = false;
    plate.minFilter = THREE.LinearFilter;
    const env = skyEnvironment(r, plate), glass = glassMaterial(env), aniso = Math.min(8, r.capabilities.getMaxAnisotropy());
    dome = skyDome(plate);
    scene.add(dome);
    // Materials for the House or a Room (its own lighting texture): baked light, glass, foliage, glows, the wet concrete.
    dress = (root, light, glow = 2) => root.traverse(o => {
      if (!o.isMesh) return;
      if (tag(o, 'glass_')) { o.material = glass; o.renderOrder = 2; return; }
      const m = o.material;
      if (tag(o, 'trees')) { o.material = foliageMaterial(m.map); if (m.map) m.map.anisotropy = aniso; return; }
      if (tag(o, 'rocks')) { o.material = new THREE.MeshBasicMaterial({ map: m.map, color: 0x6a746c, vertexColors: true }); return; } // unlit; the vertex colours carry the moss and the wet waterline
      if (tag(o, 'sheer')) { Object.assign(m, { transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide }); o.renderOrder = 1; } // sheer curtains: the light comes through
      if (tag(o, 'glow_')) { o.material = m.clone(); o.material.emissiveIntensity = tag(o, 'glow_lamps') ? 0.9 : glow; return; }
      if (m.map) m.map.anisotropy = aniso;
      if (m.name === 'concrete' || m.name === 'roof') { m.roughnessMap = wet; m.roughness = 1; m.envMap = env; m.envMapIntensity = 1.5; } // house-wet.webp is its roughness: damp where it rained and at the waterline, so it shines there
      if (o.geometry.attributes.uv1) { m.lightMap = light; m.lightMapIntensity = LIGHT_SCALE; }
      if (m.metalness > 0.5) { m.envMap = env; m.envMapIntensity = 0.5; }
      if (m.name === 'floor' || m.name === 'terrace' || m.name === 'vinyl') { m.envMap = env; m.envMapIntensity = 0.3; }
    });
    dress(gltf.scene, light);
    house = gltf.scene;
    anisotropy = aniso;
    scene.add(gltf.scene);
    for (const name of ['doorway_stock', 'doorway_records', 'doorway_ai', 'doorway_android', 'balcony']) nodes[name] = gltf.scene.getObjectByName(name);
    for (const step of Object.keys(POSTERS)) {
      const o = gltf.scene.getObjectByName(`poster_${step}`);
      nodes[`poster_${step}`] = { getWorldPosition: v => new THREE.Box3().setFromObject(o).getCenter(v) };
      o.traverse(m => { if (m.isMesh) drawPoster(m, step, aniso).then(() => { dirty = true; }); });
    }
    // Beyond the land that was modelled the ground carries on, dark, into the mist.
    const far = new THREE.Mesh(new THREE.PlaneGeometry(1800, 700), new THREE.MeshBasicMaterial({ color: 0x1d2420 }));
    far.rotation.x = -Math.PI / 2;
    far.position.set(0, 0.85, -490);
    scene.add(far);
    lake = new Reflector(new THREE.PlaneGeometry(2400, 2400), { color: 0x777777, textureWidth: 512, textureHeight: 512, clipBias: 0.003, shader: WATER, multisample: 0 });
    lake.material.uniforms.fogDensity.value = scene.fog.density;
    lake.material.uniforms.tRipple.value = ripple;
    lake.rotation.x = -Math.PI / 2;
    scene.add(lake);
    gltf.scene.updateMatrixWorld(true);
    if (params.has('probe')) window.houseProbe = () => Promise.all(Object.keys(ROOMS).map(fetchRoom)).then(() => probePath([gltf.scene, ...roomScenes])); // publish-test: is the tour's path clear?
    loaded = true;
    stage.classList.add('is-live');
    stage.prepend(canvas);
    resize();
    land();
    dirty = true;
  }).catch(err => { noRoom(); console.warn('The House failed to load; showing the still image.', err); });

  // Walks the tour's path (this layout's) in small steps through the House and reports where it is not clear: a step that
  // crosses a surface (a wall, floor, ceiling, door or pane of glass), or a surface nearer than CLEAR, which the camera's near
  // plane would cut. The path starts in open air over the lake, so a path that crosses nothing is never inside anything.
  // (The camera eases after the path, a little behind it; CLEAR leaves room for that.)
  function probePath(roots) {
    const CLEAR = 0.15, N = 6000;
    const solids = [];
    const shown = o => { let v = o.visible; o.traverseAncestors(a => { v &&= a.visible; }); return v; }; // a Room's door, taken away, is not in the way
    for (const root of roots) root.traverse(o => { if (o.isMesh && shown(o) && !['trees', 'rocks', 'land'].some(t => tag(o, t))) solids.push(o); });
    const box = new THREE.Box3();
    for (const o of solids) box.expandByObject(o);
    box.expandByScalar(1);
    const sides = solids.map(o => o.material.side);
    for (const o of solids) o.material.side = THREE.DoubleSide; // a surface counts from either side
    const ray = new THREE.Raycaster(), dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(d => new THREE.Vector3(...d));
    const name = o => [o, o.parent].find(p => p.name && !/^mesh_/i.test(p.name))?.name || o.name;
    const leg = u => { const k = u * tour.along; let i = 0; while (i < tour.n - 1 && tour.knots[i + 1] <= k) i++; return `${tour.els[i].el?.dataset.look.slice(1) || 'hero'} → ${tour.els[i + 1].el.dataset.look.slice(1)}`; };
    const problems = [];
    let prev = tour.pos.getPoint(0);
    for (let i = 1; i <= N; i++) {
      const u = i / N, p = tour.pos.getPoint(u), step = p.clone().sub(prev), len = step.length();
      if (box.containsPoint(p) || box.containsPoint(prev)) {
        ray.set(prev, step.normalize());
        ray.far = len;
        const crossed = ray.intersectObjects(solids, false)[0];
        if (crossed) problems.push(`${leg(u)}: crosses ${name(crossed.object)} at ${p.toArray().map(v => v.toFixed(2))}`);
        ray.far = CLEAR;
        for (const d of dirs) {
          ray.set(p, d);
          const near = ray.intersectObjects(solids, false)[0];
          if (near) { problems.push(`${leg(u)}: ${near.distance.toFixed(2)} m from ${name(near.object)} at ${p.toArray().map(v => v.toFixed(2))}`); break; }
        }
      }
      prev = p;
    }
    solids.forEach((o, i) => { o.material.side = sides[i]; });
    return [...new Set(problems)];
  }

  // One view of a stop: where the camera stands, what it looks at, its lens and where the picture sits.
  function viewOf(name) {
    const phone = stacked();
    const t = { ...STOPS[name], ...(phone && STOPS[name].phone) };
    let pos, at;
    if (t.near) {
      const n = nodes[t.near].getWorldPosition(new THREE.Vector3());
      pos = n.clone().add(new THREE.Vector3(...t.from));
      at = n.clone().add(new THREE.Vector3(...t.look));
    } else {
      pos = new THREE.Vector3(...t.pos);
      at = new THREE.Vector3(...t.at);
    }
    const via = (t.via || []).map(w => ({ pos: new THREE.Vector3(...w.pos), at: new THREE.Vector3(...w.at) }));
    return { pos, target: at, via, hfov: t.hfov || 50, exp: t.exp || 1, ox: phone ? 0 : t.off || 0, oy: t.up ?? (phone ? PHONE_OY : 0) };
  }
  function lens(hfov) {
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / camera.aspect));
  }
  function frame() {
    camera.setViewOffset(size[0], size[1], -shift.x, shift.y, size[0], size[1]);
    grade.uniforms.center.value.set(0.5 + shift.x / size[0], 0.5 + shift.y / size[1]);
    dirty = true;
  }
  function place(v) { // a view at once
    camera.position.copy(v.pos);
    aim.copy(v.target);
    camera.lookAt(aim);
    lens(v.hfov);
    r.toneMappingExposure = v.exp;
    setGoal({ x: v.ox * size[0], y: v.oy * size[1] }, true);
    frame();
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height || !loaded) return;
    r.setSize(width, height, false);
    composer.setPixelRatio(r.getPixelRatio());
    composer.setSize(width, height);
    grade.uniforms.aspect.value = width / height;
    lake?.getRenderTarget().setSize(Math.round(width * r.getPixelRatio() * 0.6), Math.round(height * r.getPixelRatio() * 0.6)); // the lake's mirror needs less than the picture
    size = [width, height];
    camera.aspect = width / height;
    setTour();
    if (!tour) place(viewOf('hero'));
    frame();
  }
  new ResizeObserver(resize).observe(stage);

  // The whole page is the House. Every stop of the page (page.cjs) names what the camera shows (data-look) and
  // is tied to the scroll position where the browser's own scroll snapping rests that element (measure), so the
  // panel and the view arrive together. Reduced motion, ?still= and no WebGL keep the static page.
  const html = document.documentElement;
  const nav = document.querySelector('.site-nav');
  let snap = true;
  function setTour() {
    // Not while the room is still or reduced (the head script has the layout ready, or leaves the static one).
    if (still || reduced || !loaded) return;
    const phone = stacked();
    html.dataset.room = phone ? 'phone' : 'wide';
    history.scrollRestoration = 'manual';
    const els = [null, ...document.querySelectorAll('[data-stop]')].map(el => ({ el }));
    const views = els.map(({ el }) => viewOf(el ? el.dataset.look.slice(1) : 'hero'));
    // One path through every stop, and through the waypoints that lead to it; knots[i] is where stop i sits along it.
    const knots = [], pos = [], at = [];
    for (const v of views) {
      for (const w of v.via) { pos.push(w.pos); at.push(w.at); }
      knots.push(pos.length);
      pos.push(v.pos);
      at.push(v.target);
    }
    const curve = pts => new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    tour = { pos: curve(pos), target: curve(at), views, els, knots, along: pos.length - 1, n: views.length - 1, keys: tour?.keys, here: tour?.here,
      doors: Object.keys(ROOMS).map(slug => [slug, els.findIndex(({ el }) => el?.dataset.look === `@${slug}`)]) };
    measure();
  }
  // The scroll position at which each stop rests, from the page's own layout: where scroll snapping
  // puts its element (top, less its scroll-margin).
  function measure() {
    if (!tour) return;
    const vh = innerHeight, y0 = scrollY, max = html.scrollHeight - vh;
    const top = el => el.getBoundingClientRect().top + y0;
    const keys = tour.els.map(({ el }) => (!el ? 0 : top(el) - parseFloat(getComputedStyle(el).scrollMarginTop)));
    for (let i = 1; i < keys.length; i++) keys[i] = Math.min(Math.max(keys[i], keys[i - 1] + 1), Math.max(max, keys[i - 1] + 1));
    tour.keys = keys;
    nav && html.style.setProperty('--nav-h', `${nav.offsetHeight}px`);
    snap = true;
  }
  // The browser jumps to a hash link (#contact) while fonts and images are still arriving, and the
  // sections move afterwards; so land on it again once the layout is final, unless the visitor has
  // already scrolled or pressed something.
  let moved = false;
  for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(ev, () => { moved = true; }, { once: true, passive: true });
  const land = () => {
    const el = !moved && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) { el.scrollIntoView(); snap = true; }
  };
  new ResizeObserver(measure).observe(document.body);
  addEventListener('load', () => { measure(); land(); });
  document.fonts?.ready.then(() => { measure(); land(); });
  // The camera rests at each stop for the outer part of a segment and travels in the middle, which is
  // where one panel has gone and the next has not yet arrived.
  const hold = f => THREE.MathUtils.smoothstep(f, 0.35, 0.65);
  const tourPos = new THREE.Vector3(), tourAim = new THREE.Vector3();
  // Where the scroll is along the stops: the stop before it (i) and how far on to the next (f).
  function along() {
    const { keys, n } = tour;
    let i = 0;
    while (i < n - 1 && scrollY >= keys[i + 1]) i++;
    return [i, THREE.MathUtils.clamp((scrollY - keys[i]) / (keys[i + 1] - keys[i]), 0, 1)];
  }
  // A Room away from its doorway stop, start fetching it (from the scroll itself, so a slow first frame cannot hold it up).
  function fetchNear() {
    if (!tour?.keys) return;
    const [i, f] = along();
    for (const [slug, at] of tour.doors) if (at >= 0 && i + f >= at - 1.5) fetchRoom(slug);
  }
  function stepTour(dt) {
    const { views, knots } = tour;
    const [i, f] = along();
    fetchNear();
    const g = hold(f);
    const u = (knots[i] + (knots[i + 1] - knots[i]) * g) / tour.along;
    tour.pos.getPoint(u, tourPos);
    tour.target.getPoint(u, tourAim);
    const from = views[i], to = views[i + 1];
    tour.here = (g < 0.5 ? tour.els[i] : tour.els[i + 1]).el?.dataset.look.slice(1) || 'hero';
    setGoal({ x: (from.ox + (to.ox - from.ox) * g) * size[0], y: (from.oy + (to.oy - from.oy) * g) * size[1] }, snap);
    // Easing towards the path, not jumping onto it, is what makes the scroll feel filmed.
    const a = snap ? 1 : 1 - Math.pow(0.9, dt / 16.7);
    const hfov = from.hfov + (to.hfov - from.hfov) * g;
    const moving = camera.position.distanceToSquared(tourPos) + aim.distanceToSquared(tourAim) > 1e-6;
    camera.position.lerp(tourPos, a);
    aim.lerp(tourAim, a);
    camera.lookAt(aim);
    lens(hfov);
    r.toneMappingExposure = from.exp + (to.exp - from.exp) * g; // the eye adjusts to the daylight outside and the lights inside
    frame();
    snap = false;
    stage.closest('.bench').classList.toggle('is-touring', i + f > 0.35);
    return moving;
  }

  addEventListener('scroll', () => {
    if (loaded) fetchNear();
    const y = scrollY;
    if (Math.abs(y - lastY) > 6) { html.classList.toggle('nav-away', y > lastY && y > 120); lastY = y; }
  }, { passive: true });
  let lastY = scrollY;

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; dirty = true; }).observe(stage);
  const loop = now => {
    requestAnimationFrame(loop);
    if (!visible || !loaded) return;
    lake.material.uniforms.time.value = still ? 11 : now / 1000; // the ripples drift while the page tours (it renders every frame then); reduced motion and stills keep them still
    const dt = Math.min(250, lastNow ? now - lastNow : 16); // a long frame (slow GPU) moves the camera as far as its time, not less
    lastNow = now;
    if (shift.x !== shiftGoal.x || shift.y !== shiftGoal.y) {
      const k = 1 - Math.pow(0.92, dt / 16.7); // by time, not by frame, so slow devices arrive as soon as fast ones
      if (reduced || (Math.abs(shiftGoal.x - shift.x) < 0.5 && Math.abs(shiftGoal.y - shift.y) < 0.5)) Object.assign(shift, shiftGoal);
      else { shift.x += (shiftGoal.x - shift.x) * k; shift.y += (shiftGoal.y - shift.y) * k; }
      frame();
    }
    if (tour && stepTour(dt)) dirty = true;
    turnScreens(now);
    if (!dirty) return;
    composer.render();
    dirty = false;
    if (still) html.dataset.ready = '1';
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

const bench = document.querySelector('[data-stage]');
if (bench) startHouse(bench, { root: JSON.parse(document.getElementById('bench-data').textContent).root });
const viewer = document.querySelector('[data-object]');
if (viewer) startObject(viewer);
