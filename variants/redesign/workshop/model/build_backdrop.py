# Renders the House's backdrop plate (backdrop-raw.png) in Cycles: one broad mountain flank under a thick blanket of low cloud above a distant forest, in
# an overcast dusk, as seen from across the lake. room.js maps the plate onto the sky dome by azimuth and elevation: columns run
# from AZ0 to AZ1 degrees (0 = straight ahead, towards -z in glTF), rows from EL1 (top) down to EL0. The camera is an
# equirectangular panorama limited to exactly that window, so the mapping is the plate's own.
# The scene: a heightfield mountain (one long slope climbing to the right, ridged noise for the gullies that run downslope) at 2-8 km;
# below the tree line it is forest, and nearer than 2.3 km every tree is a real (simple) conifer, tens of thousands of them as one
# mesh; above it heath and bare rock by slope. Cloud is a real volume: a thick layer that hides the upper mountain, with a ragged base,
# thin bands of mist lying on the slopes; and a haze over the land and the trees that thickens with distance (aerial perspective, in their shaders). The light is the overcast
# HDRI (Poly Haven kloofendal_overcast_puresky, CC0, see build_house.py), which the camera itself does not see: it sees a plain
# grey sky, so the plate ends in the colour the dome carries on with above and around it.
# Run through build-house.sh (which turns the png into backdrop.webp):  blender -b --python build_backdrop.py -- out.png
# The constants below are repeated in room.js (BACKDROP, SKY.mist and SKY.zenith). HOUSE_DRAFT=1 renders small, on the CPU.
import math
import os
import struct
import sys
import zlib

import bpy
import numpy as np

out = sys.argv[sys.argv.index('--') + 1]
hdri = os.environ['HOUSE_HDRI']
draft = bool(os.environ.get('HOUSE_DRAFT'))
AZ0, AZ1, EL0, EL1 = -50.0, 50.0, -6.0, 34.0
PPD = 20.48  # pixels per degree, both ways: 2048 px across, the most a texture may be
W, H = round((AZ1 - AZ0) * PPD), round((EL1 - EL0) * PPD)
DIV = int(os.environ.get('PLATE_DIV', 2 if draft else 1))  # render smaller while iterating
W, H = W // DIV, H // DIV
SAMPLES = int(os.environ.get('BACKDROP_SAMPLES', 24 if draft else 128))
MIST = np.array((0.40, 0.478, 0.51))    # sRGB of the mist at the horizon: also the fog colour in room.js (SKY.mist)
SKYC = (0.53, 0.58, 0.61)             # the overcast the camera sees, and the clouds are lit to match
EYE = 2.0                                # the camera's height above the lake, metres

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- noise (numpy, so the same field gives the mesh and the tree positions)


def _hash(ix, iy, seed):
    h = (ix.astype(np.int64) * 374761393 + iy.astype(np.int64) * 668265263 + seed * 1442695041) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)).astype(np.float64) / 4294967295.0


def gnoise(x, y, seed):
    """Smooth gradient noise in about [-1, 1] at points (x, y)."""
    xi, yi = np.floor(x), np.floor(y)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * xf * (xf * (xf * 6 - 15) + 10), yf * yf * yf * (yf * (yf * 6 - 15) + 10)

    def corner(cx, cy):
        a = _hash(xi + cx, yi + cy, seed) * 2 * math.pi
        return np.cos(a) * (xf - cx) + np.sin(a) * (yf - cy)

    top = corner(0, 0) * (1 - u) + corner(1, 0) * u
    bot = corner(0, 1) * (1 - u) + corner(1, 1) * u
    return (top * (1 - v) + bot * v) * 1.4


def fbm(x, y, seed, octaves=6, gain=0.5, ridged=False, turn=0.7):
    total, amp, norm = 0.0, 1.0, 0.0
    c, s = math.cos(turn), math.sin(turn)
    for k in range(octaves):
        n = gnoise(x, y, seed + k)
        n = (1 - np.abs(n)) ** 2 * 2 - 1 if ridged else n
        total = total + amp * n
        norm += amp
        x, y = (c * x - s * y) * 2.03 + 17.3, (s * x + c * y) * 2.03 - 9.1
        amp *= gain
    return total / norm


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def height(x, y):
    """The land at ground position (x, y) in metres (y runs away from the camera): forested foothills, then one broad mountain flank
    that climbs to the right and on up into the cloud, its face towards us furrowed by gullies that run downslope."""
    crest = 500 + 3600 * ss(-9000, 6000, x) ** 1.3                                                # one long slope, highest on the right
    crest = crest * (0.9 + 0.2 * (fbm(x / 5200, y / 5200, 3, 2) * 0.5 + 0.5))                         # not one smooth ramp
    face = ss(600, 5200, y) ** 1.15                                                                  # rises steadily away from us, its top lost in cloud
    gully = 0.55 * fbm(x / 640 + 0.4 * fbm(x / 1500, y / 1500, 40, 3), y / 2200, 11, 6, 0.42, ridged=True) + 0.45 * fbm(x / 1100, y / 2400, 12, 4, 0.45)   # ridges and gullies that run downslope (stretched along y)
    mountain = crest * face * (0.94 + 0.12 * gully)
    fine = fbm(x / 170, y / 300, 51, 5, 0.5, ridged=True)                                           # small gullies and knolls on every slope
    mountain = mountain + crest * face * 0.012 * fine
    hills = (0.045 * np.clip(y - 300, 0, None) + 70 * (fbm(x / 700, y / 700, 21, 5) + 0.4)) * ss(250, 700, y)  # forested foothills, rising away from the shore
    return np.maximum(0.0, hills + mountain)


# ---------------------------------------------------------------- the scene

world = bpy.data.worlds.new('sky')
world.use_nodes = True
nt = world.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = bpy.data.images.load(hdri)
light = nt.nodes.new('ShaderNodeBackground')
light.inputs['Strength'].default_value = float(os.environ.get('BACKDROP_SKY', 0.55))
# what the camera sees: the overcast
paint = nt.nodes.new('ShaderNodeBackground')
paint.inputs['Color'].default_value = (*[c ** 2.2 for c in SKYC], 1)
paint.inputs['Strength'].default_value = 1.0
cam_ray = nt.nodes.new('ShaderNodeLightPath')
pick = nt.nodes.new('ShaderNodeMixShader')
out_w = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(env.outputs['Color'], light.inputs['Color'])
nt.links.new(cam_ray.outputs['Is Camera Ray'], pick.inputs[0])
nt.links.new(light.outputs[0], pick.inputs[1])
nt.links.new(paint.outputs[0], pick.inputs[2])
nt.links.new(pick.outputs[0], out_w.inputs['Surface'])
scene.world = world

cam_data = bpy.data.cameras.new('plate')
cam_data.type = 'PANO'
cam_data.panorama_type = 'EQUIRECTANGULAR'
cam_data.longitude_min, cam_data.longitude_max = math.radians(AZ0), math.radians(AZ1)
cam_data.latitude_min, cam_data.latitude_max = math.radians(EL0), math.radians(EL1)
cam_data.clip_start, cam_data.clip_end = 1.0, 40000.0
cam = bpy.data.objects.new('plate', cam_data)
cam.location = (0, 0, EYE)
cam.rotation_euler = (math.pi / 2, 0, 0)  # looks along +y with z up
scene.collection.objects.link(cam)
scene.camera = cam


def node_helpers(nt):
    new = nt.nodes.new

    def put(sock, v):
        if isinstance(v, bpy.types.NodeSocket):
            nt.links.new(v, sock)
        else:
            sock.default_value = v

    def M(op, a, b=None, clamp=False):
        n = new('ShaderNodeMath')
        n.operation, n.use_clamp = op, clamp
        put(n.inputs[0], a)
        if b is not None:
            put(n.inputs[1], b)
        return n.outputs[0]

    def step(v, lo, hi):  # smoothstep between lo and hi (numbers or sockets)
        n = new('ShaderNodeMapRange')
        n.interpolation_type = 'SMOOTHSTEP'
        n.clamp = True
        put(n.inputs['Value'], v)
        put(n.inputs['From Min'], lo)
        put(n.inputs['From Max'], hi)
        return n.outputs['Result']

    def noise(pos, stretch, detail=4, rough=0.55, at=0.0):
        mp = new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = stretch
        mp.inputs['Location'].default_value = (at, at * 0.7, at * 1.3)
        nt.links.new(pos, mp.inputs['Vector'])
        nz = new('ShaderNodeTexNoise')
        nz.noise_dimensions = '3D'
        nz.inputs['Detail'].default_value = detail
        nz.inputs['Roughness'].default_value = rough
        nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
        return nz.outputs['Fac']

    def mixc(a, b, t):
        n = new('ShaderNodeMix')
        n.data_type = 'RGBA'
        put(n.inputs[0], t)
        put(n.inputs[6], a)
        put(n.inputs[7], b)
        return n.outputs[2]

    return new, put, M, step, noise, mixc


def lin(c):
    return (*[x ** 2.2 for x in c], 1)


HAZE_D = float(os.environ.get('BACKDROP_HAZE_D', 11000.0))  # metres over which the air takes away most of a thing's colour


def veil(nt, surface):
    """The shader `surface` seen through the air: the further away, the more it becomes the mist (paler higher up)."""
    new = nt.nodes.new
    d = new('ShaderNodeCameraData')
    f = new('ShaderNodeMath')
    f.operation, f.use_clamp = 'DIVIDE', True
    nt.links.new(d.outputs['View Distance'], f.inputs[0])
    f.inputs[1].default_value = HAZE_D
    f2 = new('ShaderNodeMath')  # (d / D) ** 0.8: a little steeper near, the air being thicker low down
    f2.operation = 'POWER'
    nt.links.new(f.outputs[0], f2.inputs[0])
    f2.inputs[1].default_value = 0.8
    mist = new('ShaderNodeEmission')
    pz = new('ShaderNodeNewGeometry')
    sz = new('ShaderNodeSeparateXYZ')
    nt.links.new(pz.outputs['Position'], sz.inputs[0])
    lift = new('ShaderNodeMapRange')
    lift.clamp = True
    nt.links.new(sz.outputs['Z'], lift.inputs['Value'])
    lift.inputs['From Min'].default_value, lift.inputs['From Max'].default_value = 0.0, 1400.0
    mix = new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    nt.links.new(lift.outputs['Result'], mix.inputs[0])
    mix.inputs[6].default_value = lin(MIST)
    mix.inputs[7].default_value = lin((0.53, 0.6, 0.63))
    nt.links.new(mix.outputs[2], mist.inputs['Color'])
    out = new('ShaderNodeMixShader')
    nt.links.new(f2.outputs[0], out.inputs[0])
    nt.links.new(surface, out.inputs[1])
    nt.links.new(mist.outputs[0], out.inputs[2])
    return out.outputs[0]


# --- the land: mesh on a polar grid (fine in angle, geometric in distance)
TH = np.radians(np.arange(-72, 72.01, 0.07 if not draft else 0.2))
R = 300.0 * (9000.0 / 300.0) ** (np.arange(0, 1.0001, 1 / (520 if not draft else 200)))
RR, TT = np.meshgrid(R, TH, indexing='ij')
GX, GY = RR * np.sin(TT), RR * np.cos(TT)
GZ = height(GX, GY)
nr, nc = RR.shape
verts = np.stack([GX, GY, GZ], -1).reshape(-1, 3)
idx = np.arange(nr * nc).reshape(nr, nc)
quads = np.stack([idx[:-1, :-1], idx[:-1, 1:], idx[1:, 1:], idx[1:, :-1]], -1).reshape(-1, 4)
mesh = bpy.data.meshes.new('land')
mesh.from_pydata(verts.tolist(), [], quads.tolist())
mesh.shade_smooth()
land = bpy.data.objects.new('land', mesh)
scene.collection.objects.link(land)

m = bpy.data.materials.new('land')
m.use_nodes = True
nt = m.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
new, put, M, step, noise, mixc = node_helpers(nt)
geo = new('ShaderNodeNewGeometry')
pos = geo.outputs['Position']
zz = new('ShaderNodeSeparateXYZ')
nt.links.new(pos, zz.inputs[0])
nn = new('ShaderNodeSeparateXYZ')
nt.links.new(geo.outputs['Normal'], nn.inputs[0])
slope = M('SUBTRACT', 1.0, nn.outputs['Z'])
rock = step(M('ADD', M('ADD', slope, M('MULTIPLY', M('SUBTRACT', noise(pos, (0.01, 0.01, 0.01), 4), 0.5), 0.45)), M('MULTIPLY', M('DIVIDE', zz.outputs['Z'], 4000.0), 0.35)), 0.2, 0.42)
tree_line = M('ADD', 640.0, M('MULTIPLY', M('SUBTRACT', noise(pos, (0.0007, 0.0007, 0.0007), 2, at=3.0), 0.5), 420.0))
forest = M('SUBTRACT', 1.0, step(zz.outputs['Z'], M('SUBTRACT', tree_line, 90.0), M('ADD', tree_line, 60.0)))
canopy = noise(pos, (0.045, 0.045, 0.045), 5, 0.6, 6.0)  # tree crowns at this distance
c_forest = mixc(lin((0.1, 0.17, 0.15)), lin((0.045, 0.075, 0.065)), M('MULTIPLY', M('SUBTRACT', canopy, 0.3), 2.0, clamp=True))
c_heath = mixc(mixc(lin((0.4, 0.42, 0.32)), lin((0.14, 0.16, 0.11)), M('MULTIPLY', noise(pos, (0.004, 0.004, 0.008), 5, 0.6, 1.0), 1.8, clamp=True)), lin((0.3, 0.25, 0.17)), M('MULTIPLY', M('SUBTRACT', noise(pos, (0.0016, 0.0016, 0.0024), 4, 0.6, 21.0), 0.5), 2.2, clamp=True))  # heath, in patches of darker and of bracken-brown
c_rock = mixc(lin((0.42, 0.42, 0.42)), lin((0.2, 0.2, 0.205)), M('MULTIPLY', noise(pos, (0.012, 0.012, 0.0028), 4, 0.6, 2.0), 1.7, clamp=True))  # streaked down the face
col = mixc(mixc(c_heath, c_rock, rock), c_forest, M('MULTIPLY', forest, M('SUBTRACT', 1.0, M('MULTIPLY', rock, 0.6))))
bsdf = new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = 1.0
nt.links.new(col, bsdf.inputs['Base Color'])
mout = new('ShaderNodeOutputMaterial')
nt.links.new(veil(nt, bsdf.outputs[0]), mout.inputs[0])
mesh.materials.append(m)

# --- the forest nearer than 2.3 km: every tree a simple conifer (four ragged skirts), all in one mesh
rng = np.random.default_rng(5)
pts = []
r = 330.0
while r < (2300.0 if not draft else 1600.0):
    s = 9.0 + r * 0.0042  # spacing grows with distance: a tree is a few pixels there, and its neighbours overlap
    n = int(2 * math.radians(70) * r / s)
    th = rng.uniform(-math.radians(70), math.radians(70), n)
    rr = r + rng.uniform(0, s, n)
    pts.append(np.stack([rr * np.sin(th), rr * np.cos(th)], 1))
    r += s
pts = np.concatenate(pts)
x, y = pts[:, 0], pts[:, 1]
z = height(x, y)
line = 640.0 + 420.0 * (fbm(x / 1400, y / 1400, 3 + 0, 2) * 0.5)  # the same tree line as the material (close enough: the noise differs, the line is ragged anyway)
dz = 4.0
slope_ok = np.hypot(height(x + dz, y) - z, height(x, y + dz) - z) / dz < 0.75
dens = fbm(x / 260, y / 260, 77, 4) * 0.5 + 0.5  # clearings and thin stands
keep = (z < line) & slope_ok & (dens > 0.22) & (z > 3)
x, y, z = x[keep], y[keep], z[keep]
T = len(x)
tall = rng.uniform(15, 32, T) * (1 - 0.3 * ss(300, 800, z))
rad = tall * rng.uniform(0.14, 0.22, T)
lean = rng.normal(0, 0.025, (T, 2)) * tall[:, None]
seg = 8
ang = np.arange(seg) * 2 * math.pi / seg
rot = rng.uniform(0, 6.28, (T, 1))
ring = np.stack([np.cos(ang[None] + rot), np.sin(ang[None] + rot)], -1)  # (T, seg, 2)
TIERS = ((0.06, 1.0, 0.46), (0.28, 0.8, 0.68), (0.48, 0.58, 0.85), (0.66, 0.38, 1.0))  # a spruce: skirts getting shorter up the trunk (height of the skirt's edge, its radius, its tip)


def tier(zr, rf, zt):
    r_ = (rad * rf)[:, None] * (1 + 0.24 * rng.uniform(-1, 1, (T, seg)))        # ragged skirts, no two alike
    base = np.stack([x[:, None] + ring[:, :, 0] * r_ + lean[:, :1] * zr, y[:, None] + ring[:, :, 1] * r_ + lean[:, 1:] * zr, (z + tall * zr)[:, None] + tall[:, None] * 0.035 * rng.uniform(-1, 1, (T, seg))], -1)
    apex = np.stack([x + lean[:, 0] * zt, y + lean[:, 1] * zt, z + tall * zt], -1)[:, None]
    return np.concatenate([base, apex], 1)  # (T, seg + 1, 3)


tv = np.concatenate([tier(*t_) for t_ in TIERS], 1).reshape(-1, 3)  # (T * len(TIERS) * (seg + 1), 3)
per = len(TIERS) * (seg + 1)
tri = []
for t_ in range(len(TIERS)):
    o = t_ * (seg + 1)
    for i in range(seg):
        tri.append([o + i, o + (i + 1) % seg, o + seg])
tri = np.array(tri)[None] + (np.arange(T) * per)[:, None, None]
tmesh = bpy.data.meshes.new('trees')
tmesh.from_pydata(tv.tolist(), [], tri.reshape(-1, 3).tolist())
tone = rng.uniform(0.55, 1.5, T) * (0.8 + 0.4 * ss(0, 500, z))
colors = np.repeat(tone[:, None], per, 1)
under = np.array([t_ * (seg + 1) + i for t_ in range(len(TIERS)) for i in range(seg)])
colors[:, under] *= 0.6  # darker underneath, lighter at the tips (the apexes)
base = np.array((0.032, 0.058, 0.047))
ca = tmesh.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
rgba = np.concatenate([colors.reshape(-1, 1) * base[None] * (1 + 0.25 * rng.uniform(-1, 1, (T * per, 1)) * np.array((1.0, 0.2, 0.1))[None]), np.ones((T * per, 1))], 1)
ca.data.foreach_set('color', rgba.ravel().astype(np.float32))
trees = bpy.data.objects.new('trees', tmesh)
scene.collection.objects.link(trees)
tm = bpy.data.materials.new('trees')
tm.use_nodes = True
tnt = tm.node_tree
tb = tnt.nodes['Principled BSDF']
tb.inputs['Roughness'].default_value = 1.0
tcol = tnt.nodes.new('ShaderNodeAttribute')
tcol.attribute_name = 'Col'
tnt.links.new(tcol.outputs['Color'], tb.inputs['Base Color'])
tnt.links.new(veil(tnt, tb.outputs[0]), tnt.nodes['Material Output'].inputs[0])
tmesh.materials.append(tm)
print('trees:', T)

# --- cloud: a real volume (a box over the mountain) with a thick layer high up, ragged below, and thin bands of mist on the slopes
box = bpy.data.objects.new('cloud', bpy.data.meshes.new('cloud'))
bpy.context.scene.collection.objects.link(box)
bx = [(-9500, 900, 150), (9500, 900, 150), (9500, 9200, 150), (-9500, 9200, 150), (-9500, 900, 4200), (9500, 900, 4200), (9500, 9200, 4200), (-9500, 9200, 4200)]
box.data.from_pydata(bx, [], [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
cm = bpy.data.materials.new('cloud')
cm.use_nodes = True
nt = cm.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
new, put, M, step, noise, mixc = node_helpers(nt)
geo = new('ShaderNodeNewGeometry')
pos = geo.outputs['Position']
zz = new('ShaderNodeSeparateXYZ')
nt.links.new(pos, zz.inputs[0])
z = zz.outputs['Z']
big = noise(pos, (0.00035, 0.00035, 0.0009), 5, 0.6, 2.0)  # large masses
base_z = M('ADD', float(os.environ.get('CLOUD_BASE', 1100.0)), M('MULTIPLY', M('SUBTRACT', big, 0.5), 500.0))
layer = step(z, base_z, M('ADD', base_z, 260.0))
fluff = M('ADD', 0.55, M('MULTIPLY', noise(pos, (0.0011, 0.0011, 0.0016), 6, 0.62, 8.0), 0.9))
dens_cloud = M('MULTIPLY', M('MULTIPLY', layer, fluff), float(os.environ.get('CLOUD_DENS', 0.004)))
band_a = M('MULTIPLY', step(noise(pos, (0.0007, 0.0007, 0.004), 5, 0.6, 14.0), 0.5, 0.68), M('POWER', 2.718, M('MULTIPLY', M('DIVIDE', M('MULTIPLY', M('SUBTRACT', z, 520.0), M('SUBTRACT', z, 520.0)), 28000.0), -1.0)))
band_b = M('MULTIPLY', step(noise(pos, (0.0006, 0.0006, 0.005), 5, 0.6, 31.0), 0.52, 0.7), M('POWER', 2.718, M('MULTIPLY', M('DIVIDE', M('MULTIPLY', M('SUBTRACT', z, 250.0), M('SUBTRACT', z, 250.0)), 9000.0), -1.0)))
band_c = M('MULTIPLY', step(noise(pos, (0.0009, 0.0009, 0.006), 5, 0.6, 47.0), 0.56, 0.72), M('POWER', 2.718, M('MULTIPLY', M('DIVIDE', M('MULTIPLY', M('SUBTRACT', z, 880.0), M('SUBTRACT', z, 880.0)), 22000.0), -1.0)))
dens = M('ADD', dens_cloud, M('MULTIPLY', M('ADD', M('ADD', band_a, M('MULTIPLY', band_b, 0.8)), M('MULTIPLY', band_c, 1.2)), float(os.environ.get('BAND_DENS', 0.0007))))
vs = new('ShaderNodeVolumeScatter')
vs.inputs['Color'].default_value = (0.9, 0.94, 0.97, 1)
vs.inputs['Anisotropy'].default_value = 0.4
put(vs.inputs['Density'], dens)
vout = new('ShaderNodeOutputMaterial')
nt.links.new(vs.outputs[0], vout.inputs['Volume'])
box.data.materials.append(cm)
box.visible_shadow = False

# ---------------------------------------------------------------- render
scene.render.engine = 'CYCLES'
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = W, H, 100
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 6
scene.cycles.volume_bounces = 3
scene.cycles.volume_max_steps = 256
scene.cycles.volume_step_rate = float(os.environ.get('PLATE_STEP', 1.0))
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = float(os.environ.get('BACKDROP_EXPOSURE', 0.0))
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '16'
raw = out + '.render.png'
scene.render.filepath = raw
gpu = False
if not draft or os.environ.get('PLATE_GPU'):
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        for kind in ('OPTIX', 'CUDA'):
            prefs.compute_device_type = kind
            prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type == kind]
            if gpus:
                for d in prefs.devices:
                    d.use = d.type == kind
                scene.cycles.device = 'GPU'
                gpu = True
                break
    except Exception as e:  # CPU is just slower
        print('render on CPU:', e)
print('plate %dx%d, %d samples, %s' % (W, H, SAMPLES, 'GPU' if gpu else 'CPU'))
bpy.ops.render.render(write_still=True)

# ---------------------------------------------------------------- finish: the plate must end in the colours the dome carries on with
im = bpy.data.images.load(raw)
im.colorspace_settings.name = 'Non-Color'  # already display-referred (the Standard view transform)
px = np.empty(W * H * 4, np.float32)
im.pixels.foreach_get(px)
img = px.reshape(H, W, 4)[::-1, :, :3].astype(np.float64)  # top row first
az = AZ0 + (np.arange(W) + 0.5) * (AZ1 - AZ0) / W
el = EL1 - (np.arange(H) + 0.5) * (EL1 - EL0) / H
E = el[:, None]
x01 = (az - AZ0) / (AZ1 - AZ0)


def mixc(a, b, t):
    return a * (1 - t[..., None]) + b * t[..., None]


B = lambda c: np.broadcast_to(c, (H, W, 3))
img = mixc(img, B(MIST), ss(1.2, -0.4, E) * np.ones((1, W)))                    # below the horizon it is all mist
edge = ss(0.8, 1.0, np.abs(x01 * 2 - 1))[None]                                  # at the sides, mist near the ground and overcast above it (the dome carries on from there)
k = ss(0, 5, E)[..., None]
side = np.broadcast_to(MIST[None, None, :] * (1 - k) + np.array(SKYC)[None, None, :] * k, (H, W, 3))
img = mixc(img, side, np.broadcast_to(edge * 0.9, (H, W)))
img = img + (np.random.default_rng(3).random(img.shape) - 0.5) * (1.6 / 255)  # dither against banding in the smooth mist
rows = np.round(np.clip(img, 0, 1) * 255).astype(np.uint8)


def png(path, arr):
    h, w, _ = arr.shape
    data = b''.join(b'\x00' + arr[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(data, 6)) + chunk(b'IEND', b''))


png(out, rows)
os.remove(raw)
