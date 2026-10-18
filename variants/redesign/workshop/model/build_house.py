# Builds the House (the homepage's 3D outside and inside) and exports it as house-raw.glb plus house-light-raw.png and
# house-wet-raw.png. Run through build-house.sh, which compresses the glb with gltfpack and turns the two textures into
# house-light.webp and house-wet.webp.
#
# The House is a two-storey board-formed concrete villa on a plinth at the edge of a lake, after the mood of an
# overcast dusk: cool grey concrete and dark conifers outside, warm amber light inside. The look is stylised-real: simple
# forms in real materials (CC0 textures from Poly Haven, see textures/, and the concrete made here), lit by a bake in Cycles.
# The bake goes into a second UV set (TEXCOORD_1) as a lighting texture, which room.js applies as three's lightMap
# (irradiance, so it is stored as E / (pi * LIGHT_RANGE)); there are no dynamic lights. The outside is lit by a cool
# overcast sky (the CC0 HDRI below, only at bake time, white-balanced cooler) and the inside by lamps at 2700 K (a Blackbody
# node), so warm light spills out through the glass onto the terrace, the plinth edge and the cantilever's underside.
# The lake and the backdrop (mountain, mist) are not in the glb: room.js makes the water, build_backdrop.py renders the
# backdrop. A night bake (ticket #110) would swap in a second lighting texture.
#
# The concrete (board_formed) is poured, board-formed concrete made here: boards with their own tone and a faint grain, seams, an
# even grid of recessed tie holes and the runoff below them, pores. A second bake in UV set 2 finds where rain runs down from
# ledges, where the waterline keeps the plinth wet and where corners wear; it darkens the lighting texture there and becomes
# house-wet.webp, which room.js uses as the concrete's roughness map, so the live material catches the sky where it is damp.
#
# Textures (textures/*.jpg) are CC0 maps from Poly Haven (polyhaven.com/license), resized and colour-adjusted:
#   moss-rock mossy_rock, oak oak_veneer_01, plaster white_plaster_02, floor concrete_floor_01 (greyscale), grass grass_ground,
#   concrete-pores rough_concrete (greyscale; the pitting in the concrete is its high-pass).
# The sky at bake time is the HDRI kloofendal_overcast_puresky (Poly Haven, CC0, 2k); build-house.sh fetches it into a cache
# and passes it in HOUSE_HDRI. It is not shipped.
#
# Conventions the page relies on (workshop/room.js):
#   land, plinth, house, ...    the lit, baked structure (the lighting texture is applied to every mesh that has TEXCOORD_1)
#   glass_*                     transparent, never casts shadows; no lighting texture
#   glow_*                      emissive parts (lamps, downlights, candle flames); they brighten at night
#   trees, rocks                dark, unlit (vertex colours carry their shading); the page shows them with basic materials
#   doorway_<slug>              empty on the sill of a Room's doorway, on the back wall, where Rooms attach
#                               (stock and records on the ground floor, ai and android upstairs)
#   door_<slug>                 the closed door leaf in that doorway (a Room's asset replaces it)
#   balcony                     empty on the upstairs balcony floor, where the teaching stop looks
#
# Coordinates: Blender Z up, the lake in front at y < 0, the front of the House on the plane y=1 facing -y, the back wall
# on y=12. The water is at z=0. (glTF: x, z, -y, so the House's front faces +z and its depth runs along -z.)
import math
import os
import struct
import sys
import zlib

import bmesh
import bpy
import numpy as np
from mathutils import Vector, noise

here = os.path.dirname(os.path.abspath(__file__))
out_glb = sys.argv[sys.argv.index('--') + 1]
out_light = sys.argv[sys.argv.index('--') + 2]
out_wet = sys.argv[sys.argv.index('--') + 3]
hdri = os.environ['HOUSE_HDRI']
draft = bool(os.environ.get('HOUSE_DRAFT'))  # quick bake for iterating on the shape
LIGHT_RES = int(os.environ.get('HOUSE_RES', 512 if draft else 2048))  # the texture is shipped at this size (build-house.sh only softens the bake noise a little)
SAMPLES = int(os.environ.get('HOUSE_SAMPLES', 24 if draft else 512))
LIGHT_RANGE = 4.0  # the texture holds white-surface radiance divided by this; room.js multiplies by pi * LIGHT_RANGE

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- textures


def blur(a, s):
    """A gaussian blur that wraps, so a tile stays a tile."""
    f = np.fft.fftfreq(a.shape[0])[:, None] ** 2 + np.fft.fftfreq(a.shape[1])[None, :] ** 2
    return np.real(np.fft.ifft2(np.fft.fft2(a) * np.exp(-2 * (np.pi * s) ** 2 * f)))


TILE = 3.6  # metres: the concrete's tile, a multiple of the boards (0.15) and of the tie-hole grid (1.2 by 0.6)


def pores(size):
    """The pitting of real concrete: the high-pass of a CC0 photograph's luminance (textures/concrete-pores.jpg), at the size asked."""
    img = bpy.data.images.load(os.path.join(here, 'textures', 'concrete-pores.jpg'))
    img.colorspace_settings.name = 'Non-Color'
    img.scale(size, size)
    px = np.empty(size * size * 4, np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    d = px.reshape(size, size, 4)[:, :, 1].astype(np.float64)[::-1]
    d = d - blur(d, size / 20)
    return d / d.std()


def board_formed(size=1536, tile=TILE, board=0.15, tie=(1.2, 0.6)):
    """Board-formed concrete as one tile of `tile` metres, made here (not a photograph). Boards of `board` m in butt-jointed
    lengths, each with its own tone and a faint grain imprint running along it, a hairline seam with a pale fin along each,
    cloudy staining, the pitting of real concrete and a few blowholes, and round recessed tie holes in an even grid (`tie`
    metres across and down, on a board's middle) with a pale chamfer and a runoff below each."""
    r = np.random.default_rng(7)
    ppm = size / tile
    ax = (np.arange(size) + 0.5) / ppm
    y, x = ax[:, None], ax[None, :]
    nb = round(tile / board)
    fy, fx = np.fft.fftfreq(size)[:, None], np.fft.fftfreq(size)[None, :]

    def field(sx, sy=None):  # wrapping noise of unit spread, smoothed by sx pixels along x and sy along y
        sy = sx if sy is None else sy
        n = np.real(np.fft.ifft2(np.fft.fft2(r.normal(0, 1, (size, size))) * np.exp(-2 * np.pi ** 2 * ((sx * fx) ** 2 + (sy * fy) ** 2))))
        return n / n.std()

    row = (np.floor(y / board).astype(int) % nb)[:, 0]
    seg_tone, butt = np.zeros((nb, size)), np.zeros((nb, size))
    for k in range(nb):  # each row of boards is two or three lengths, butted together somewhere along it
        n = int(r.integers(2, 4))
        while True:
            cuts = np.sort(r.uniform(0, tile, n))
            if np.diff(np.r_[cuts, cuts[0] + tile]).min() > 0.9:
                break
        seg_tone[k] = r.normal(0, 0.04, n)[np.searchsorted(cuts, ax) % n]
        butt[k] = np.exp(-(np.abs((ax[None, :] - cuts[:, None] + tile / 2) % tile - tile / 2).min(0) / 0.0018) ** 2)
    d = y % board
    t = 1 + seg_tone[row] + 0.03 * (0.5 - d / board) * r.uniform(0.4, 1.6, nb)[row][:, None]  # each board a touch lighter at its top (the form's lower board bleeds)
    t = t + 0.05 * field(60) + 0.05 * field(220) + 0.015 * field(1.0)
    # the grain the planks leave: wavy lines along each board, a little different on every one
    grain = np.sin(2 * np.pi * (d / board * r.uniform(5, 12, nb)[row][:, None] + r.uniform(0, 1, nb)[row][:, None]) + 2.4 * field(260, 3))
    t = t * (1 + 0.018 * grain + 0.014 * field(40, 0.9))
    # pitting: two copies of the photograph's high-pass at different scales and turns, so no repeat shows
    p = np.tile(pores(size // 4), (4, 4)) + np.roll(np.rot90(np.tile(pores(size // 3), (3, 3))), (211, 97), (0, 1))
    t = t * (1 + 0.035 * p)
    # a seam between boards: a hairline, with a pale fin just above it; butt joints are hairlines too
    seam = np.exp(-(d / 0.0025) ** 2) + np.exp(-((d - board) / 0.0025) ** 2)
    t = t * (1 - 0.26 * seam) * (1 + 0.05 * np.exp(-((d - 0.009) / 0.004) ** 2)) * (1 - 0.14 * butt[row])
    # blowholes
    for _ in range(220):
        cx, cy, rad = r.uniform(0, tile, 2).tolist() + [r.uniform(0.003, 0.009)]
        dx = (x - cx + tile / 2) % tile - tile / 2
        dy = (y - cy + tile / 2) % tile - tile / 2
        t = t * (1 - r.uniform(0.15, 0.35) * np.exp(-((dx ** 2 + dy ** 2) / rad ** 2) ** 1.2))
    hole, ring, run = np.zeros((size, size)), np.zeros((size, size)), np.zeros((size, size))
    for i in range(round(tile / tie[1])):
        for j in range(round(tile / tie[0])):
            cx = (j + 0.5) * tie[0]
            cy = (np.floor((i + 0.5) * tie[1] / board) + 0.5) * board  # mid-board
            dx = (x - cx + tile / 2) % tile - tile / 2
            dy = (y - cy + tile / 2) % tile - tile / 2
            q = np.sqrt(dx ** 2 + dy ** 2)
            hole += (1 / (1 + np.exp((q - 0.031) / 0.0035))) * (0.66 - 0.1 * np.clip(dy / 0.031, -1, 1))  # the recess: darkest at the top, a lit lip below
            ring += np.exp(-((q - 0.047) / 0.011) ** 2)
            run += np.exp(-(dx / (0.02 + 0.006 * np.sin(dy * 40))) ** 2) * (dy > 0) * np.exp(-np.clip(dy, 0, None) / 0.32) * (dy < 0.7)
    t = t * (1 - np.clip(hole, 0, 1)) * (1 + 0.1 * ring) * (1 - 0.17 * np.clip(run, 0, 1) * (1 + 0.3 * field(2, 12)))
    t = t * (1 + 0.035 * field(5, 200))  # streaks of damp run down, long and faint
    t = t / t.mean() * 0.44
    rgb = np.clip(np.stack([t * 0.985, t, t * 1.0], 2), 0, 1)
    out = np.ones((size, size, 4), np.float32)
    out[:, :, :3] = rgb[::-1]
    tex = bpy.data.images.new('board_formed', size, size)
    tex.pixels.foreach_set(out.ravel())
    tex.pack()
    tex.colorspace_settings.name = 'sRGB'
    return tex


BOARD_IMG = board_formed()


# ---------------------------------------------------------------- materials

materials = {}


def mat(name, tex=None, tile=2.0, color=(1, 1, 1), rough=0.8, metal=0.0, emit=0.0, emit_color=(1, 1, 1), double=False, size=0, world=False):
    if name in materials:
        return materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.use_backface_culling = not double
    m['tile'] = tile
    if world:
        m['world'] = True  # its first UV set follows the world (boards and tie holes line up across faces), not each face
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    linear = [c ** 2.2 for c in color]
    if tex:
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = tex if isinstance(tex, bpy.types.Image) else bpy.data.images.load(os.path.join(here, 'textures', tex + '.jpg'))
        if size:  # the glb carries the texture at this size
            node.image.scale(size, size)
            node.image.pack()
        node.image.colorspace_settings.name = 'sRGB'
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs[0].default_value = 1
        mix.inputs[7].default_value = (*linear, 1)
        nt.links.new(node.outputs['Color'], mix.inputs[6])
        nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = (*linear, 1)
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*[c ** 2.2 for c in emit_color], 1)
        bsdf.inputs['Emission Strength'].default_value = emit
    materials[name] = m
    return m


CONCRETE = mat('concrete', BOARD_IMG, TILE, (1.0, 1.0, 1.0), 0.9, world=True)
ROOF_CONCRETE = mat('roof', BOARD_IMG, TILE, (0.8, 0.8, 0.8), 0.95, world=True)
OAK = mat('oak', 'oak', 1.83, (0.78, 0.7, 0.62), 0.5)
OAK_DARK = mat('oak_dark', 'oak', 1.83, (0.42, 0.34, 0.28), 0.5)
OAK_MID = mat('oak_mid', 'oak', 1.83, (0.62, 0.54, 0.46), 0.5)
OAK_FLOOR = mat('oak_floor', 'oak', 1.83, (0.5, 0.45, 0.4), 0.45)
PLASTER = mat('plaster', 'plaster', 2.0, (0.96, 0.94, 0.9), 0.95, size=256)
FLOOR = mat('floor', 'floor', 2.0, (0.5, 0.5, 0.5), 0.35, size=384)
TERRACE = mat('terrace', 'floor', 2.0, (0.36, 0.38, 0.38), 0.55, size=384)
GROUND = mat('ground', 'grass', 4.0, (0.2, 0.23, 0.2), 1.0, size=256)
ROCK = mat('rock', 'moss-rock', 1.6, (0.8, 0.85, 0.78), 0.95, size=256)
FOLIAGE = mat('foliage', None, color=(0.2, 0.24, 0.22), rough=1.0, double=True)  # trees: dark in the bake; in the page the vertex colours are all of it, unlit
FRAME = mat('frame', None, color=(0.03, 0.032, 0.036), rough=0.45, metal=1.0)  # black steel
BRASS = mat('brass', None, color=(0.55, 0.4, 0.22), rough=0.35, metal=1.0)
FABRIC = mat('fabric', None, color=(0.2, 0.205, 0.2), rough=1.0)
FABRIC_PALE = mat('fabric_pale', None, color=(0.78, 0.74, 0.68), rough=1.0)
CANVAS = mat('canvas', None, color=(0.7, 0.67, 0.62), rough=0.9)
CANVAS_DARK = mat('canvas_dark', None, color=(0.22, 0.27, 0.3), rough=0.9)
CHARCOAL = mat('charcoal', None, color=(0.05, 0.052, 0.055), rough=0.8)
WARM = (1.0, 0.46, 0.14)
# Blender's Blackbody node is paler than the CIE colour at the same temperature (its 2700 K is a pale peach), and the tone
# mapping in the page pales a bright amber further: 2000 K in the node is the deep amber of a 2700 K lamp as photographed.
LAMP_K = float(os.environ.get('LAMP_K', 2000))
LAMP_RGB = (1.0, 0.363, 0.069)  # what the node gives at LAMP_K (measured, linear rgb): the glb carries it as the emission colour, the bake drives the same emission from the node
LAMP = tuple(c ** (1 / 2.2) for c in LAMP_RGB)
GLOW = mat('glow', None, color=WARM, rough=0.5, emit=28.0, emit_color=LAMP)
GLOW_FLAME = mat('glow_flame', None, color=WARM, rough=0.5, emit=150.0, emit_color=LAMP)
GLOW_WASH = mat('glow_wash', None, color=WARM, rough=0.5, emit=8.0, emit_color=LAMP)  # the strips along the ceiling that wash the back walls
GLOW_COVE = mat('glow_cove', None, color=WARM, rough=0.5, emit=float(os.environ.get('COVE', 10.0)), emit_color=LAMP)  # the strip behind the glass head of each floor: it washes the floor and spills out onto the terrace and the balcony
GLOW_SOFFIT = mat('glow_soffit', None, color=WARM, rough=0.5, emit=45.0, emit_color=LAMP)  # downlights under the cantilever
GLASS = bpy.data.materials.new('glass')
GLASS.use_nodes = True
g = GLASS.node_tree.nodes['Principled BSDF']
g.inputs['Base Color'].default_value = (0.72, 0.85, 0.9, 1)
g.inputs['Roughness'].default_value = 0.04
g.inputs['Alpha'].default_value = 0.18
GLASS.surface_render_method = 'BLENDED'
GLASS.use_backface_culling = False

# ---------------------------------------------------------------- geometry


class Part:
    """Geometry that becomes one object; faces carry their own material and the first UV set is box-projected (unless uv=False)."""

    def __init__(self, name, weight=1.0, vcol=None, smooth=False, uv=True):
        self.name, self.weight, self.vcol, self.smooth, self.uv = name, weight, vcol, smooth, uv
        self.bm = bmesh.new()
        self.slots = []
        self.colors = {}  # vertex -> rgb, for parts whose shading is painted per vertex (the trees)
        self.top = self.bm.faces.layers.float.new('top')    # per face: the height rain runs down from (a ledge), for the wet bake
        self.wetk = self.bm.faces.layers.float.new('wetk')  # per face: how much rain reaches it (1 in the open)

    def slot(self, material):
        if material not in self.slots:
            self.slots.append(material)
        return self.slots.index(material)

    def box(self, x0, x1, y0, y1, z0, z1, material, drop=(), keep=None, bevel=0.0, top=None, wet=1.0):
        """An axis-aligned box. drop: face normals that are never seen; keep: only these normals are made; top: where rain
        starts running down its sides (its own top by default); wet: how much rain reaches it."""
        bm = self.bm
        verts = bmesh.ops.create_cube(bm, size=1)['verts']
        for v in verts:
            v.co.x = x1 if v.co.x > 0 else x0
            v.co.y = y1 if v.co.y > 0 else y0
            v.co.z = z1 if v.co.z > 0 else z0
        faces = {f for v in verts for f in v.link_faces}
        mi = self.slot(material)
        for f in faces:
            f.material_index = mi
            f[self.top] = z1 if top is None else top
            f[self.wetk] = wet
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=2, affect='EDGES')
            return self
        gone = [f for f in faces if (keep is not None and tuple(round(c) for c in f.normal) != tuple(keep)) or tuple(round(c) for c in f.normal) in [tuple(d) for d in drop]]
        if gone:
            bmesh.ops.delete(bm, geom=gone, context='FACES')
        return self

    def cyl(self, cx, cy, z0, z1, r, material, seg=14, r_top=None, caps=(True, True)):
        """An upright cylinder (or cone, with r_top)."""
        bm = self.bm
        res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r_top is None else r_top, depth=z1 - z0)
        mi = self.slot(material)
        for v in res['verts']:
            v.co += Vector((cx, cy, (z0 + z1) / 2))
        gone = []
        for f in {f for v in res['verts'] for f in v.link_faces}:
            f.material_index = mi
            if (abs(f.normal.z) > 0.99) and ((f.normal.z > 0 and not caps[1]) or (f.normal.z < 0 and not caps[0])):
                gone.append(f)
        if gone:
            bmesh.ops.delete(bm, geom=gone, context='FACES')
        return self

    def prism_yz(self, pts, x0, x1, material):
        """A polygon in the (y, z) plane (a stair stringer, say) extruded from x0 to x1."""
        bm = self.bm
        a = [bm.verts.new((x0, y, z)) for y, z in pts]
        b = [bm.verts.new((x1, y, z)) for y, z in pts]
        mi = self.slot(material)
        fs = [bm.faces.new(a[::-1]), bm.faces.new(b)] + [bm.faces.new((a[i], a[(i + 1) % len(a)], b[(i + 1) % len(a)], b[i])) for i in range(len(a))]
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        for f in fs:
            f.material_index = mi
        return self

    def build(self, parent=None):
        bm = self.bm
        uv = bm.loops.layers.uv.new('uv0') if self.uv else None
        face_rng = np.random.default_rng(zlib.crc32(self.name.encode()))
        for f in (bm.faces if self.uv else ()):
            ax = max(range(3), key=lambda i: abs(f.normal[i]))
            m = self.slots[f.material_index]
            tile = m['tile'] if 'tile' in m else 1.0
            ou, ov = face_rng.random(2)
            for l in f.loops:
                c = l.vert.co
                u, v = (c.y, c.z) if ax == 0 else (c.x, c.z) if ax == 1 else (c.x, c.y)
                if 'world' in m:  # the same grid on every face: u runs along the wall, v up it (z = TERR is a board's edge)
                    l[uv].uv = ((u + 0.6) / tile, (v - (1.0 if ax != 2 else 0.0)) / tile)
                else:
                    l[uv].uv = (u / tile + ou, v / tile + ov)
        ledge, wetk = bm.loops.layers.float.new('ledge'), bm.loops.layers.float.new('wetk')  # for the wet bake: how far below its ledge each corner is
        for f in bm.faces:
            top = f[self.top] or max(v.co.z for v in f.verts)
            for l in f.loops:
                l[ledge] = max(0.0, top - l.vert.co.z)
                l[wetk] = f[self.wetk] or 1.0
        if self.vcol or self.colors:
            lay = bm.loops.layers.float_color.new('Col')
            for f in bm.faces:
                for l in f.loops:
                    l[lay] = (*(self.vcol(l.vert.co) if self.vcol else self.colors.get(l.vert, (0.02, 0.02, 0.02))), 1.0)
        if self.smooth:
            for f in bm.faces:
                f.smooth = True
            for e in bm.edges:
                if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(self.smooth if self.smooth is not True else 40):
                    e.smooth = False
        else:
            for f in bm.faces:
                f.smooth = False
        mesh = bpy.data.meshes.new(self.name)
        bm.to_mesh(mesh)
        bm.free()
        for m in self.slots:
            mesh.materials.append(m)
        if 'Col' in mesh.color_attributes:  # the exporter writes the active, rendered colour attribute as COLOR_0
            mesh.color_attributes.active_color = mesh.color_attributes['Col']
            mesh.color_attributes.render_color_index = mesh.color_attributes.find('Col')
        o = bpy.data.objects.new(self.name, mesh)
        o['weight'] = self.weight
        scene.collection.objects.link(o)
        o.parent = parent
        return o


def empty(name, loc, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location, e.rotation_euler = loc, rot
    scene.collection.objects.link(e)
    return e


def lerp(a, b, t):
    return a + (b - a) * min(1, max(0, t))


# Dimensions
TERR = 1.0                  # terrace and plinth top
FL0, CE0 = 1.05, 4.05       # ground floor: floor top and ceiling
FL1, CE1 = 4.65, 7.45       # upstairs
ROOF = 8.05                 # roof top
YF = 1.0                    # the glass line at the front
YB = 12.0                   # the back wall's inner face
HX0, HX1, FX = 7.2, 7.4, 8.6   # inner half widths (ground, upstairs) and the concrete frame's outer half width
BAL = -1.4                  # the balcony's front edge
DOORS = [('stock', -3.8, 0), ('records', 1.0, 0), ('ai', -3.8, 1), ('android', 1.0, 1)]  # slug, x, storey
OPEN_W, OPEN_H = 0.65, 2.55  # half width and height of a doorway
STAIR_X0, STAIR_X1, STAIR_Y0, RISE, GOING = 5.7, 7.2, 6.0, 0.18, 0.27
NORTH, SOUTH, EAST, WEST, UP, DOWN = (0, 1, 0), (0, -1, 0), (1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1)
STAIR_TOP_Y = STAIR_Y0 + 19 * GOING  # the 20th riser lands on the upstairs floor here


def walls_with_openings(part, x0, x1, y0, y1, z0, z1, openings, material, **kw):
    """A wall along x with rectangular openings (centre, half width, height from z0) cut through it."""
    cuts, x = [], x0
    for xc, hw, h in sorted(openings):
        cuts.append((x, xc - hw))
        x = xc + hw
    cuts.append((x, x1))
    for a, b in cuts:
        part.box(a, b, y0, y1, z0, z1, material, **kw)
    for xc, hw, h in openings:
        part.box(xc - hw, xc + hw, y0, y1, z0 + h, z1, material, **kw)


# --- the ground: land with a shore, bake-only water
def shore(x):
    """Where the shore line runs (y) at this x: the House stands on a headland, the shore falling back either side."""
    return -3.6 + 0.021 * max(0.0, abs(x) - 10.8) ** 2 + 1.2 * noise.noise(Vector((x * 0.11, 3.0, 0.0)))


def land_height(x, y):
    s = shore(x)
    if abs(x) < 11.5 and y < 16.5:
        return -0.4  # under the plinth
    bank = lerp(-0.55, TERR - 0.1, (y - s) / 2.6)
    rise = 0.03 * max(0.0, y - 22) + 0.0009 * max(0.0, abs(x) - 24) ** 2
    return bank + (rise if y > s + 2.6 else 0) + 0.12 * noise.noise(Vector((x * 0.17, y * 0.17, 1.0))) * (1 if y > s + 2 else 0.3)


land = Part('land', 0.1, vcol=lambda c: (lerp(0.4, 1.0, (c.z + 0.5) * 1.1) * (0.75 + 0.5 * noise.noise(Vector((c.x * 0.05, c.y * 0.05, 4.0)))),) * 3)
XS = sorted(set(np.arange(-96, 97, 4.0)) | set(np.arange(-40, 40.1, 1.5)) | {-10.6, 10.6})
REL = [-1.5, -0.5, 0.0, 0.7, 1.5, 2.6, 4.0, 6.0, 9.0, 13.0, 20.0, 32.0, 48.0, 70.0, 100.0, 130.0]  # rows run back from the shore line
grid = {}
for xi, x in enumerate(XS):
    for ri, rel in enumerate(REL):
        y = shore(x) + rel
        grid[xi, ri] = land.bm.verts.new((x, y, land_height(x, y)))
mi = land.slot(GROUND)
for xi in range(len(XS) - 1):
    for ri in range(len(REL) - 1):
        f = land.bm.faces.new([grid[xi, ri], grid[xi + 1, ri], grid[xi + 1, ri + 1], grid[xi, ri + 1]])
        f.material_index = mi

# --- plinth: board-formed walls into the water, wet near the waterline, and the terrace on top
def wet(c):
    t = lerp(0.5, 1.0, (c.z + 0.1) / 0.9)
    return (t, t, t * 1.02)


plinth = Part('plinth', 1.4, vcol=wet)
for za, zb in ((-1.2, -0.4), (-0.4, 0.0), (0.0, 0.4), (0.4, TERR)):
    plinth.box(-10.5, 10.5, -3.6, 15.5, za, zb, CONCRETE, drop=[DOWN, UP, NORTH], top=TERR)
plinth.box(-10.5, 10.5, -3.6, 15.5, TERR, TERR + 0.002, TERRACE, keep=UP)

# --- the House: ground floor, the cantilevered upper frame, the chimney
house = Part('house', 1.8)
# Ground floor: two concrete side walls, the back wall with its doorways, glazing line further down
for sx in (-1, 1):
    a, b = sorted((sx * 7.6, sx * HX0))
    house.box(a, b, YF, YB + 0.4, TERR, CE0, CONCRETE, drop=[DOWN, UP, NORTH], wet=0.3)  # under the overhang: sheltered
ground_doors = [(x, OPEN_W, OPEN_H) for slug, x, st in DOORS if st == 0]
walls_with_openings(house, -7.6, 7.6, YB, YB + 0.4, TERR, CE0, ground_doors, CONCRETE, drop=[DOWN, UP, NORTH, SOUTH])
# The upper frame: slab (with the stairwell cut out), roof slab, side walls, back wall; it overhangs the glass by 2.4 m
house.box(-FX, FX, BAL, 7.4, CE0, FL1, CONCRETE, drop=[UP], top=ROOF)  # the sides run flush up to the roof's edge
house.box(-FX, 5.5, 7.4, YB + 0.4, CE0, FL1, CONCRETE, drop=[UP], top=ROOF)
house.box(7.2, FX, 7.4, YB + 0.4, CE0, FL1, CONCRETE, drop=[UP], top=ROOF)
house.box(5.5, 7.2, STAIR_TOP_Y, YB + 0.4, CE0, FL1, CONCRETE, drop=[UP])
house.box(-FX, FX, BAL, YB + 0.4, CE1, ROOF, CONCRETE)
for sx in (-1, 1):
    a, b = sorted((sx * HX1, sx * FX))
    house.box(a, b, BAL, YB + 0.4, FL1, CE1, CONCRETE, drop=[UP, DOWN, NORTH], top=ROOF)
upper_doors = [(x, OPEN_W, OPEN_H) for slug, x, st in DOORS if st == 1]
walls_with_openings(house, -HX1, HX1, YB, YB + 0.4, FL1, CE1, upper_doors, CONCRETE, drop=[DOWN, UP, NORTH, SOUTH])
# The chimney tower, with a cap
house.box(6.0, 8.2, 3.0, 5.4, ROOF, 11.2, CONCRETE, drop=[DOWN])
house.box(5.9, 8.3, 2.9, 5.5, 11.2, 11.4, ROOF_CONCRETE, drop=[DOWN])
house.box(6.5, 7.7, 3.5, 4.9, 11.4, 11.41, CHARCOAL, keep=UP)

# --- interior: floors, plaster, ceilings
inside = Part('house_interior', 1.1)
inside.box(-HX0, HX0, YF, YB, TERR, FL0, FLOOR, keep=UP)                           # ground floor (a slab of polished concrete)
inside.box(-HX0 + 0.02, HX0 - 0.02, YF, YB, CE0 - 0.03, CE0, OAK_MID, keep=DOWN)   # oak ceiling
for sx in (-1, 1):
    a, b = sorted((sx * HX0, sx * (HX0 - 0.02)))
    inside.box(a, b, YF, YB, FL0, CE0, PLASTER, keep=(-sx, 0, 0))                    # plaster side walls
walls_with_openings(inside, -HX0, HX0, YB - 0.02, YB, FL0, CE0, ground_doors, PLASTER, keep=SOUTH)
# upstairs: oak boards over the slab, round the stairwell
inside.box(-HX1, HX1, YF, 7.4, FL1, FL1 + 0.02, OAK_FLOOR, keep=UP)
inside.box(-HX1, 5.5, 7.4, YB, FL1, FL1 + 0.02, OAK_FLOOR, keep=UP)
inside.box(7.2, HX1, 7.4, YB, FL1, FL1 + 0.02, OAK_FLOOR, keep=UP)
inside.box(5.5, 7.2, STAIR_TOP_Y, YB, FL1, FL1 + 0.02, OAK_FLOOR, keep=UP)
inside.box(-HX1, HX1, YF, YB, CE1 - 0.03, CE1, OAK_MID, keep=DOWN)
for sx in (-1, 1):
    a, b = sorted((sx * HX1, sx * (HX1 - 0.02)))
    inside.box(a, b, YF, YB, FL1, CE1, PLASTER, keep=(-sx, 0, 0))
walls_with_openings(inside, -HX1, HX1, YB - 0.02, YB, FL1, CE1, upper_doors, PLASTER, keep=SOUTH)

# --- glazing: black steel frames, glass; a sliding door stands open in the middle of each floor
frames = Part('frames', 0.6)
glass_f = Part('glass_front', 0)
glass_u = Part('glass_upper', 0)
glass_r = Part('glass_rail', 0)
SLOT = 1.2  # half width of the open sliding door


def glaze(frame, glass, z0, z1, half):
    """A glazed front on the plane y=YF between the floor z0 and the head z1: mullions every 3.6 m, one pane slid
    beside the open door in front of its neighbour."""
    xs = [-half, -3.6, -SLOT, SLOT, 3.6, half]
    for x in xs:
        frame.box(x - 0.04, x + 0.04, YF - 0.06, YF + 0.06, z0, z1, FRAME)
    frame.box(-half, half, YF - 0.06, YF + 0.06, z1 - 0.1, z1, FRAME, drop=[UP])
    frame.box(-half, -SLOT, YF - 0.05, YF + 0.05, z0, z0 + 0.08, FRAME)
    frame.box(SLOT, half, YF - 0.05, YF + 0.05, z0, z0 + 0.08, FRAME)
    for a, b, y in ((-half, -3.6, YF), (-3.6, -SLOT, YF), (SLOT, 3.6, YF - 0.09), (3.6, half, YF)):
        glass.box(a + 0.04, b - 0.04, y - 0.01, y + 0.01, z0 + 0.08, z1 - 0.1, GLASS, keep=SOUTH)
    # the sliding pane's own frame
    frame.box(SLOT + 0.0, 3.6, YF - 0.1, YF - 0.08, z0 + 0.08, z0 + 0.14, FRAME)
    frame.box(SLOT, 3.6, YF - 0.1, YF - 0.08, z1 - 0.16, z1 - 0.1, FRAME)
    frame.box(SLOT, SLOT + 0.06, YF - 0.1, YF - 0.08, z0 + 0.08, z1 - 0.1, FRAME)


glaze(frames, glass_f, FL0, CE0, HX0)
glaze(frames, glass_u, FL1, CE1, HX1)
# door frames inside, on the doorways
for slug, x, st in DOORS:
    z0 = FL1 if st else FL0
    frames.box(x - OPEN_W - 0.04, x - OPEN_W + 0.01, YB - 0.055, YB - 0.04, z0, z0 + OPEN_H + 0.04, FRAME, drop=[DOWN])
    frames.box(x + OPEN_W - 0.01, x + OPEN_W + 0.04, YB - 0.055, YB - 0.04, z0, z0 + OPEN_H + 0.04, FRAME, drop=[DOWN])
    frames.box(x - OPEN_W - 0.04, x + OPEN_W + 0.04, YB - 0.055, YB - 0.04, z0 + OPEN_H, z0 + OPEN_H + 0.04, FRAME, drop=[DOWN])
# the balcony's frameless glass rail with a slim steel cap
for a, b in ((-HX1, -3.7), (-3.7, -0.0), (0.0, 3.7), (3.7, HX1)):
    glass_r.box(a + 0.02, b - 0.02, BAL - 0.01, BAL + 0.01, FL1 + 0.12, FL1 + 1.1, GLASS, keep=SOUTH)
frames.box(-HX1, HX1, BAL - 0.03, BAL + 0.03, FL1 + 1.1, FL1 + 1.14, FRAME)
frames.box(-HX1, HX1, BAL - 0.04, BAL + 0.04, FL1, FL1 + 0.12, FRAME, drop=[DOWN])
# the stairwell's rail
for (a, b, y0, y1) in ((5.5, 5.5, 7.4, STAIR_TOP_Y),):
    glass_r.box(5.48, 5.5, y0, y1, FL1 + 0.12, FL1 + 1.05, GLASS)
    frames.box(5.47, 5.53, y0, y1, FL1 + 1.05, FL1 + 1.09, FRAME)
glass_r.box(5.5, 7.2, 7.38, 7.4, FL1 + 0.12, FL1 + 1.05, GLASS)
frames.box(5.47, 7.2, 7.37, 7.43, FL1 + 1.05, FL1 + 1.09, FRAME)

# --- the staircase: oak treads cantilevered from the right wall on one slim steel stringer
stairs = Part('stairs', 1.1)
for i in range(20):
    y = STAIR_Y0 + i * GOING
    z = FL0 + RISE * (i + 1)
    stairs.box(STAIR_X0, STAIR_X1, y - 0.02, y + GOING + 0.02, z - 0.05, z, OAK, bevel=0.012)
stairs.prism_yz([(STAIR_Y0, FL0), (STAIR_Y0, FL0 + 0.12), (STAIR_TOP_Y + GOING, FL1 - 0.06), (STAIR_TOP_Y + GOING, FL1 - 0.3)], STAIR_X0 - 0.01, STAIR_X0 + 0.04, FRAME)

# --- doors: closed dark oak leaves in their doorways, with a brass pull
doors = []
for slug, x, st in DOORS:
    z0 = FL1 if st else FL0
    leaf = Part(f'door_{slug}', 1.1)
    leaf.box(x - OPEN_W + 0.03, x + OPEN_W - 0.03, YB + 0.2, YB + 0.26, z0, z0 + OPEN_H - 0.03, OAK_DARK)
    leaf.box(x + OPEN_W - 0.22, x + OPEN_W - 0.2, YB + 0.14, YB + 0.2, z0 + 0.95, z0 + 1.55, BRASS)
    doors.append(leaf)
    # oak cladding round each door, a warm wall
    wall = Part(f'house_panel_{slug}', 1.1)
    walls_with_openings(wall, x - OPEN_W - 0.7, x + OPEN_W + 0.7, YB - 0.04, YB - 0.02, z0, z0 + 2.95, [(x, OPEN_W, OPEN_H)], OAK_DARK, keep=SOUTH)
    doors.append(wall)

# --- furniture
furn = Part('furniture', 1.1, smooth=True)
fx = Part('furniture_hard', 1.1)


def chair(part_s, part_h, cx, cy, face):
    """A dining chair at (cx, cy) whose back is on the side opposite `face` (+1 faces +y)."""
    z = FL0
    part_s.box(cx - 0.22, cx + 0.22, cy - 0.22, cy + 0.22, z + 0.43, z + 0.48, FABRIC, bevel=0.012)
    part_s.box(cx - 0.22, cx + 0.22, cy - face * 0.22 - 0.03, cy - face * 0.22 + 0.03, z + 0.48, z + 0.9, FABRIC, bevel=0.012)
    for dx in (-0.19, 0.19):
        for dy in (-0.19, 0.19):
            part_h.box(cx + dx - 0.015, cx + dx + 0.015, cy + dy - 0.015, cy + dy + 0.015, z, z + 0.43, FRAME)


def picture(part, x0, x1, z0, z1):
    """A framed canvas flat on the back wall."""
    part.box(x0, x1, YB - 0.05, YB - 0.025, z0, z1, CANVAS, keep=SOUTH)
    part.box(x0, x1, YB - 0.055, YB - 0.05, z0, z0 + (z1 - z0) * 0.38, CANVAS_DARK, keep=SOUTH)  # a dark band, like a horizon
    for a, b, c, d in ((x0 - 0.03, x1 + 0.03, z1, z1 + 0.03), (x0 - 0.03, x1 + 0.03, z0 - 0.03, z0), (x0 - 0.03, x0, z0, z1), (x1, x1 + 0.03, z0, z1)):
        part.box(a, b, YB - 0.06, YB - 0.02, c, d, FRAME)


# the dining table, left, by the glass, with candles and two pendants
fx.box(-5.7, -2.5, 2.9, 4.1, FL0 + 0.72, FL0 + 0.77, OAK, bevel=0.01)
for x in (-5.5, -2.7):
    for y in (3.05, 3.95):
        fx.box(x - 0.03, x + 0.03, y - 0.03, y + 0.03, FL0, FL0 + 0.72, FRAME)
for x in (-5.2, -4.4, -3.6, -2.9):
    chair(furn, fx, x, 2.5, 1)
    chair(furn, fx, x, 4.5, -1)
for x in (-5.0, -4.1, -3.2):  # candles
    fx.cyl(x, 3.5, FL0 + 0.77, FL0 + 0.89, 0.018, FABRIC_PALE, seg=8)
glows = Part('glow_lamps', 1.3)
for x in (-5.0, -4.1, -3.2):
    glows.cyl(x, 3.5, FL0 + 0.89, FL0 + 0.93, 0.012, GLOW_FLAME, seg=6, r_top=0.003)
for x in (-4.6, -3.4):  # pendants
    fx.cyl(x, 3.5, FL0 + 2.3, CE0 - 0.03, 0.006, FRAME, seg=5)
    fx.cyl(x, 3.5, FL0 + 2.0, FL0 + 2.3, 0.16, FRAME, seg=16, r_top=0.05, caps=(False, True))
    glows.cyl(x, 3.5, FL0 + 1.99, FL0 + 2.0, 0.14, GLOW, seg=16)

# the lounge, right: a low sofa facing the lake, a coffee table, a rug, a floor lamp
furn.box(1.6, 5.2, 4.7, 5.95, FL0 + 0.05, FL0 + 0.45, FABRIC, bevel=0.04)       # base and seat
furn.box(1.6, 5.2, 5.55, 5.95, FL0 + 0.45, FL0 + 0.88, FABRIC, bevel=0.04)      # back
furn.box(1.6, 2.0, 4.7, 5.95, FL0 + 0.45, FL0 + 0.68, FABRIC, bevel=0.04)       # arms
furn.box(4.8, 5.2, 4.7, 5.95, FL0 + 0.45, FL0 + 0.68, FABRIC, bevel=0.04)
fx.box(2.4, 4.4, 2.8, 3.6, FL0 + 0.3, FL0 + 0.36, OAK_DARK, bevel=0.01)
fx.box(2.45, 2.5, 2.85, 2.9, FL0, FL0 + 0.3, FRAME)
fx.box(4.3, 4.35, 3.5, 3.55, FL0, FL0 + 0.3, FRAME)
fx.cyl(6.2, 2.4, FL0, FL0 + 1.55, 0.012, FRAME, seg=6)
fx.cyl(6.2, 2.4, FL0, FL0 + 0.02, 0.16, FRAME, seg=14)
glows.cyl(6.2, 2.4, FL0 + 1.35, FL0 + 1.7, 0.18, GLOW, seg=16)
# a low shelf between the two doors, a picture over it
fx.box(-1.9, -0.1, 11.5, 11.98, FL0, FL0 + 0.55, OAK_DARK)
picture(fx, -1.7, -0.3, FL0 + 1.0, FL0 + 2.1)
# curtains, pale, at both ends of the glazing
for x0 in (-7.15, 6.35):
    furn.box(x0, x0 + 0.8, YF + 0.12, YF + 0.3, FL0, CE0 - 0.05, FABRIC_PALE, bevel=0.02)

# upstairs: sofa facing the glass, rug, desk with a lamp, a picture between the doors, curtains
furn.box(-2.4, 1.4, 4.4, 5.65, FL1 + 0.05, FL1 + 0.45, FABRIC, bevel=0.04)
furn.box(-2.4, 1.4, 5.25, 5.65, FL1 + 0.45, FL1 + 0.88, FABRIC, bevel=0.04)
furn.box(-2.4, -2.0, 4.4, 5.65, FL1 + 0.45, FL1 + 0.68, FABRIC, bevel=0.04)
furn.box(1.0, 1.4, 4.4, 5.65, FL1 + 0.45, FL1 + 0.68, FABRIC, bevel=0.04)
fx.box(-1.5, 0.5, 2.5, 3.3, FL1 + 0.28, FL1 + 0.34, OAK_DARK, bevel=0.01)
fx.box(-1.45, -1.4, 2.55, 2.6, FL1, FL1 + 0.28, FRAME)
fx.box(0.4, 0.45, 3.2, 3.25, FL1, FL1 + 0.28, FRAME)
fx.box(-7.2, -5.6, 7.6, 8.4, FL1 + 0.72, FL1 + 0.77, OAK, bevel=0.01)          # desk against the left wall
fx.box(-7.15, -7.1, 7.65, 7.7, FL1, FL1 + 0.72, FRAME)
fx.box(-5.65, -5.6, 8.3, 8.35, FL1, FL1 + 0.72, FRAME)
glows.cyl(-6.8, 8.0, FL1 + 0.77, FL1 + 1.12, 0.1, GLOW, seg=12, r_top=0.06)
fx.cyl(5.0, 2.4, FL1, FL1 + 1.5, 0.012, FRAME, seg=6)
fx.cyl(5.0, 2.4, FL1, FL1 + 0.02, 0.16, FRAME, seg=14)
glows.cyl(5.0, 2.4, FL1 + 1.3, FL1 + 1.65, 0.18, GLOW, seg=16)
picture(fx, -2.9, -0.9, FL1 + 1.0, FL1 + 2.15)
for x0 in (-7.25, 6.45):
    furn.box(x0, x0 + 0.8, YF + 0.12, YF + 0.3, FL1, CE1 - 0.05, FABRIC_PALE, bevel=0.02)
# the balcony: a round table and two chairs
fx.cyl(-1.9, -0.3, FL1, FL1 + 0.72, 0.02, FRAME, seg=6)
fx.cyl(-1.9, -0.3, FL1 + 0.72, FL1 + 0.75, 0.42, FRAME, seg=20)
for dx in (-0.7, 0.7):
    cx = -1.9 + dx
    furn.box(cx - 0.22, cx + 0.22, -0.52, -0.08, FL1 + 0.43, FL1 + 0.48, FABRIC, bevel=0.012)
    furn.box(cx + math.copysign(0.2, dx) - 0.03, cx + math.copysign(0.2, dx) + 0.03, -0.52, -0.08, FL1 + 0.48, FL1 + 0.9, FABRIC, bevel=0.012)

# ceiling downlights (a grid inside, a row under the overhang), strips washing the back walls
down = Part('glow_downlights', 1.3)
for z, ce in ((FL0, CE0), (FL1, CE1)):
    for x in (-6.0, -3.0, 0.0, 3.0, 6.0):
        for y in (3.0, 6.0, 9.0):
            down.cyl(x, y, ce - 0.045, ce - 0.03, 0.055, GLOW, seg=10)
wash = Part('glow_wash', 1.3)
for ce in (CE0, CE1):
    wash.box(-6.8, 6.8, YB - 0.38, YB - 0.1, ce - 0.045, ce - 0.03, GLOW_WASH, keep=DOWN)
cove = Part('glow_cove', 1.3)
for ce in (CE0, CE1):
    cove.box(-6.8, 6.8, YF + 0.25, YF + 0.5, ce - 0.045, ce - 0.03, GLOW_COVE, keep=DOWN)
terrace_lights = Part('glow_soffit', 1.0)
# soffit lights under the cantilever: its underside is the slab's bottom (z=CE0) beyond the glass
for x in np.arange(-6.3, 6.4, 1.8):
    for y in (-0.6, 0.2):
        terrace_lights.cyl(x, y, CE0 - 0.03, CE0, 0.06, GLOW_SOFFIT, seg=10, caps=(True, False))

parts = [land, plinth, house, inside, frames, stairs, furn, fx, glows, down, wash, cove, terrace_lights, glass_f, glass_u, glass_r]
objects = [p.build() for p in parts] + [d.build() for d in doors]

for slug, x, st in DOORS:
    empty(f'doorway_{slug}', (x, YB, FL1 if st else FL0))
empty('balcony', (0, -0.2, FL1))

# --- boulders at the waterline and trees on the land
ROCK_SPECS = [(-9.8, -5.0, 1.5), (-13.6, -3.0, 1.0), (11.8, -5.0, 1.85), (14.8, -2.8, 1.05), (8.6, -5.4, 0.7), (-6.4, -5.8, 0.55), (-17.5, 0.0, 1.5), (19.5, 1.5, 1.7), (-24, 5.5, 1.3), (25, 6.5, 1.1), (16.5, -4.3, 0.55)]


rocks = Part('rocks', 0.0, smooth=True)
bm = rocks.bm
mi = rocks.slot(ROCK)
for x, y, r in ROCK_SPECS:
    s = Vector((rng.uniform(1.0, 1.4), rng.uniform(0.8, 1.15), rng.uniform(0.55, 0.75)))
    seed = rng.uniform(0, 100)
    res = bmesh.ops.create_icosphere(bm, subdivisions=3 if r >= 1.4 else 2, radius=1.0)
    for v in res['verts']:
        p = v.co.copy()
        n = noise.noise(p * 1.3 + Vector((seed, 0, 0))) * 0.35 + noise.noise(p * 3.1 + Vector((0, seed, 0))) * 0.12
        v.co = Vector((p.x * s.x, p.y * s.y, p.z * s.z)) * r * (1 + n) + Vector((x, y, r * 0.1))
        v.co.z = max(v.co.z, -0.4)
    for f in {f for v in res['verts'] for f in v.link_faces}:
        f.material_index = mi
rocks.build()


# Trees are real geometry in two kinds, painted per vertex (lit from above, dark underneath and inside) and shown unlit
# in the page, so the fog does the distance: spruces (tiers of drooping, ragged skirts) and broader firs.
# Every one differs in height, spread and tone.
TREE = (0.0085, 0.0125, 0.0115)  # the foliage's colour (linear)
BARK = (0.02, 0.018, 0.017)


def tint(base, k, hue=0.0):
    return (base[0] * k * (1 - hue), base[1] * k, base[2] * k * (1 + hue))


def tree_ring(part, pts, colors):
    """Vertices for a list of points, coloured; returns them."""
    vs = [part.bm.verts.new(p) for p in pts]
    for v, c in zip(vs, colors):
        part.colors[v] = c
    return vs


def tree_face(part, vs):
    f = part.bm.faces.new(vs)
    f.material_index = part.slot(FOLIAGE)
    return f


def trunk(part, x, y, z0, z1, r0, r1, lean, seg=6, color=BARK):
    ring0 = tree_ring(part, [(x + r0 * math.cos(2 * math.pi * i / seg), y + r0 * math.sin(2 * math.pi * i / seg), z0) for i in range(seg)], [tint(color, 0.7)] * seg)
    ring1 = tree_ring(part, [(x + lean[0] + r1 * math.cos(2 * math.pi * i / seg), y + lean[1] + r1 * math.sin(2 * math.pi * i / seg), z1) for i in range(seg)], [color] * seg)
    for i in range(seg):
        tree_face(part, [ring0[i], ring0[(i + 1) % seg], ring1[(i + 1) % seg], ring1[i]])


def tiers(part, x, y, z0, h, seed, bare, n, spread, flat, notch, wander, trunk_top=0.1):
    """A tree as stacked, ragged skirts of foliage on a bare lower trunk: `bare` of the height is trunk, `n` skirts above it,
    `spread` their reach (of the height), `flat` how shallow each is, `notch` how deep the ragged edge cuts back (0..1) and
    `wander` how far a skirt strays off the trunk (of its reach). The outline is lopsided, and thins towards the tip."""
    r = np.random.default_rng(seed)
    tone, hue = r.uniform(0.75, 1.3), r.uniform(-0.06, 0.1)
    lean = (r.normal(0, 0.02) * h, r.normal(0, 0.02) * h)
    rmax = h * spread * r.uniform(0.85, 1.15)
    trunk(part, x, y, z0, z0 + h * (bare + trunk_top), 0.12 + h * 0.008, 0.07, (lean[0] * 0.3, lean[1] * 0.3))
    ph1, ph2 = r.uniform(0, 6.28, 2)
    for k in range(n):
        t = k / (n - 1)
        zb = z0 + h * (bare + (0.9 - bare) * t ** 0.95)
        th = h * flat * (1 - 0.45 * t)
        R = (rmax * (1 - t) ** 0.8 + 0.25) * r.uniform(0.8, 1.15)
        m = int(np.clip(10 + R * 2.0, 12, 20))
        sh = (lean[0] * (zb - z0) / h + r.normal(0, wander * R), lean[1] * (zb - z0) / h + r.normal(0, wander * R))
        a0 = r.uniform(0, 6.28)
        pts, topc, botc = [], [], []
        for i in range(m):
            a = a0 + 2 * math.pi * i / m + r.normal(0, 0.08)
            body = 1 + 0.22 * math.sin(2 * a + ph1) + 0.12 * math.sin(3 * a + ph2)
            rr = R * body * (r.uniform(0.9, 1.15) if i % 2 else r.uniform(notch, notch + 0.25))
            pts.append((x + sh[0] + rr * math.cos(a), y + sh[1] + rr * math.sin(a), zb - th * (0.15 + 0.55 * rr / R) + r.normal(0, 0.1 * th)))
            g = tone * (0.8 + 0.55 * t) * r.uniform(0.8, 1.2)
            topc.append(tint(TREE, 1.15 * g, hue))
            botc.append(tint(TREE, 0.45 * g, hue))
        top = tree_ring(part, pts, topc)
        bot = tree_ring(part, pts, botc)
        apex = part.bm.verts.new((x + sh[0] * 0.8, y + sh[1] * 0.8, zb + th * 1.3))
        part.colors[apex] = tint(TREE, 1.55 * tone * (0.8 + 0.5 * t), hue)
        inner = part.bm.verts.new((x + sh[0], y + sh[1], zb + th * 0.05))
        part.colors[inner] = tint(TREE, 0.15 * tone, hue)
        for i in range(m):
            tree_face(part, [apex, top[i], top[(i + 1) % m]])
            tree_face(part, [inner, bot[(i + 1) % m], bot[i]])


def spruce(part, x, y, z0, h, seed):
    r = np.random.default_rng(seed + 1)
    tiers(part, x, y, z0, h, seed, r.uniform(0.08, 0.2), int(9 + h / 6 + r.integers(0, 3)), r.uniform(0.11, 0.17), 0.14, 0.35, 0.08)


def fir(part, x, y, z0, h, seed):
    """A broader fir: fewer, deeper skirts that droop further and stray a little off the trunk."""
    r = np.random.default_rng(seed + 1)
    tiers(part, x, y, z0, h, seed, r.uniform(0.1, 0.25), int(7 + h / 7 + r.integers(0, 3)), r.uniform(0.17, 0.23), 0.2, 0.45, 0.18)


trees = Part('trees', 0.0, smooth=181, uv=False)  # smooth all the way, so the vertices are shared and the file stays small
tr = np.random.default_rng(23)
placed = []


def plant(x, y, h, kind=None):
    if abs(x) < 12.5 and y < 19:
        return  # the House and its plinth
    z = land_height(x, y)
    if z < 0.0 or y < shore(x) + 2.0:
        return
    seed = len(placed) + 100
    kind = kind or tr.choice(['spruce', 'fir'], p=[0.65, 0.35])
    {'spruce': spruce, 'fir': fir}[kind](trees, x, y, z - 0.4, h, seed)
    placed.append((x, y, h))


# the trees that frame the House, in two groups either side, then a scatter in clusters where the density noise is high and
# gaps where it is low; the forest on the hill beyond is painted in the backdrop
for x, y, h, kind in [(-14.5, 5.5, 13, 'spruce'), (-17.5, 9, 16, 'fir'), (-12.8, 13, 12, 'spruce'), (-19.5, 4, 10, 'fir'), (-16, 15, 15, 'spruce'), (-21.5, 12, 17, 'spruce'),
                      (14.8, 4.5, 12, 'fir'), (17.5, 8.5, 15, 'spruce'), (13.5, 12.5, 13, 'spruce'), (19.5, 3.0, 9, 'fir'), (16.5, 15.5, 15, 'spruce'), (22, 11, 14, 'fir')]:
    plant(x, y, h, kind)
for gx in np.arange(-78, 79, 6.0):
    for gy in np.arange(3, 64, 6.0):
        x, y = gx + tr.uniform(-2.5, 2.5), gy + tr.uniform(-2.5, 2.5)
        d = 0.5 + 0.8 * noise.noise(Vector((x * 0.045, y * 0.045, 7.0))) + 0.4 * noise.noise(Vector((x * 0.13, y * 0.13, 2.0)))
        h = (9 + 0.12 * y + tr.uniform(0, 7)) * (0.7 + 0.5 * min(1.0, d))
        if y < shore(x) + 7:
            h *= 0.55  # scrub at the water's edge
        if d < 0.55 or any((x - px) ** 2 + (y - py) ** 2 < (0.14 * (h + ph)) ** 2 for px, py, ph in placed):
            continue  # a gap in the forest, or no room beside a neighbour
        plant(x, y, h)
print('trees:', len(placed))
trees.build()

# bake-only water: a dark plane so the bounce off the lake is dark rather than the world's sky
water = bpy.data.objects.new('bake_water', bpy.data.meshes.new('bake_water'))
bmw = bmesh.new()
bmesh.ops.create_grid(bmw, x_segments=1, y_segments=1, size=400)
bmw.to_mesh(water.data)
bmw.free()
wm = bpy.data.materials.new('bake_water')
wm.use_nodes = True
wm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.015, 0.02, 0.022, 1)
water.data.materials.append(wm)
scene.collection.objects.link(water)

# ---------------------------------------------------------------- lighting texture (UV set 2) and bake

bake_objs = [o for o in scene.objects if o.type == 'MESH' and not o.name.startswith(('glass_', 'glow_', 'trees', 'rocks', 'bake_'))]
for o in bake_objs:
    uvs = o.data.uv_layers
    lm = uvs.new(name='lightmap')
    uvs.active = lm
for o in scene.objects:
    o.select_set(False)
for o in bake_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = bake_objs[0]
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.average_islands_scale()
bpy.ops.object.mode_set(mode='OBJECT')
# Texel density per object: the lawn and the roof, which are seen from far away, get fewer texels than the rooms.
for o in bake_objs:
    d = o.data.uv_layers['lightmap'].data
    pts = np.empty(len(d) * 2, np.float32)
    d.foreach_get('uv', pts)
    pts = pts.reshape(-1, 2)
    pts = (pts - pts.mean(0)) * float(o.get('weight', 1.0)) + pts.mean(0)
    d.foreach_set('uv', pts.ravel())
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.pack_islands(margin=0.008, rotate=False)
bpy.ops.object.mode_set(mode='OBJECT')
for o in bake_objs:  # how big a texel of the lighting texture is on each object (centimetres)
    m = o.data
    m.calc_loop_triangles()
    uv = np.empty(len(m.loops) * 2, np.float32)
    m.uv_layers['lightmap'].data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    ua = sum(abs(np.cross(uv[t.loops[1]] - uv[t.loops[0]], uv[t.loops[2]] - uv[t.loops[0]])) / 2 for t in m.loop_triangles)
    ma = sum(t.area for t in m.loop_triangles)
    print('texel %-18s %5.1f cm' % (o.name, 100 * math.sqrt(ma / max(ua * LIGHT_RES ** 2, 1e-9))))

# Overcast dusk: a soft, cool sky (a CC0 HDRI, white-balanced cooler) and the warm lamps of the House (a Blackbody node).
SKY_LEVEL = float(os.environ.get('SKY', 2.0))  # the sky's mean radiance above the horizon
SKY_TINT = (0.96, 1.0, 1.06)                  # its white balance: cool against the 2700 K lamps, the feel of 6000-6500 K daylight at dusk
sky_img = bpy.data.images.load(hdri)
sky_img.colorspace_settings.name = 'Linear Rec.709'
sw, sh = sky_img.size
px = np.empty(sw * sh * 4, np.float32)
sky_img.pixels.foreach_get(px)
up = px.reshape(sh, sw, 4)[sh // 2:, :, :3]  # Blender's rows run bottom to top: the upper half is the sky
wts = np.cos(np.linspace(0, np.pi / 2, up.shape[0]))
sky_mean = (up * wts[:, None, None]).sum((0, 1)) / (wts.sum() * sw)
print('sky: mean %s, gain to %s' % (sky_mean.round(3), (SKY_LEVEL * np.array(SKY_TINT) / sky_mean).round(3)))
world = bpy.data.worlds.new('sky')
world.use_nodes = True
nt = world.node_tree
bg = nt.nodes['Background']
env = nt.nodes.new('ShaderNodeTexEnvironment')
env.image = sky_img
gain = nt.nodes.new('ShaderNodeMix')
gain.data_type = 'RGBA'
gain.blend_type = 'MULTIPLY'
gain.inputs[0].default_value = 1
gain.inputs[7].default_value = (*(SKY_LEVEL * np.array(SKY_TINT) / sky_mean), 1)
ramp = nt.nodes.new('ShaderNodeValToRGB')  # below the horizon it is dark water and forest
ramp.color_ramp.elements[0].position = 0.4
ramp.color_ramp.elements[0].color = (0.06, 0.06, 0.06, 1)
ramp.color_ramp.elements[1].position = 0.5
ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
coord = nt.nodes.new('ShaderNodeTexCoord')
sep = nt.nodes.new('ShaderNodeSeparateXYZ')
ground = nt.nodes.new('ShaderNodeMix')
ground.data_type = 'RGBA'
ground.blend_type = 'MULTIPLY'
ground.inputs[0].default_value = 1
nt.links.new(coord.outputs['Generated'], sep.inputs[0])
nt.links.new(sep.outputs['Z'], ramp.inputs[0])
nt.links.new(env.outputs['Color'], gain.inputs[6])
nt.links.new(gain.outputs[2], ground.inputs[6])
nt.links.new(ramp.outputs['Color'], ground.inputs[7])
nt.links.new(ground.outputs[2], bg.inputs['Color'])
bg.inputs['Strength'].default_value = 1.0
scene.world = world
lamp_nodes = []
for m in materials.values():
    if m.name.startswith('glow'):
        bb = m.node_tree.nodes.new('ShaderNodeBlackbody')
        bb.inputs['Temperature'].default_value = LAMP_K
        m.node_tree.links.new(bb.outputs['Color'], m.node_tree.nodes['Principled BSDF'].inputs['Emission Color'])
        lamp_nodes.append((m, bb))

scene.render.engine = 'CYCLES'
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 8
scene.cycles.diffuse_bounces = 6
scene.cycles.use_adaptive_sampling = False
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
            break
except Exception as e:  # CPU is just slower
    print('bake on CPU:', e)

img = bpy.data.images.new('lightmap', LIGHT_RES, LIGHT_RES, alpha=False, float_buffer=True)
img.colorspace_settings.name = 'Non-Color'
baked = set()
for o in bake_objs:
    for m in o.data.materials:
        baked.add(m)
for m in baked:
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = img
    n.name = 'bake'
    m.node_tree.nodes.active = n
# Glass lets light through while baking
clear = bpy.data.materials.new('clear')
clear.use_nodes = True
nt = clear.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
tr = nt.nodes.new('ShaderNodeBsdfTransparent')
outn = nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(tr.outputs[0], outn.inputs[0])
glass_users = [o for o in scene.objects if o.type == 'MESH' and o.name.startswith('glass_')]
for o in glass_users:
    o.data.materials[0] = clear

bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=12, margin_type='EXTEND', use_clear=True)

for o in glass_users:
    o.data.materials[0] = GLASS
for m in baked:
    m.node_tree.nodes.remove(m.node_tree.nodes['bake'])
for m, bb in lamp_nodes:  # the glb carries the emission colour that Blackbody gave, as a plain value
    m.node_tree.nodes.remove(bb)

# Where the concrete is damp or worn, found in the same UV set: red is damp (rain running down from each ledge in streaks of
# varying length, the waterline on the plinth, pools on the roof), green is wear (a pale chip along every convex corner).
def mask_material():
    m = bpy.data.materials.new('mask')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
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

    geo = new('ShaderNodeNewGeometry')

    def noise(stretch, detail=3, at=0.0):  # 3D noise of the world position; stretch (x, y, z) per metre
        mp = new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = stretch
        mp.inputs['Location'].default_value = (at, at * 0.7, at * 1.3)
        nt.links.new(geo.outputs['Position'], mp.inputs['Vector'])
        nz = new('ShaderNodeTexNoise')
        nz.noise_dimensions = '3D'
        nz.inputs['Scale'].default_value = 1.0
        nz.inputs['Detail'].default_value = detail
        nz.inputs['Roughness'].default_value = 0.55
        nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
        return nz.outputs['Fac']

    def attr(name):
        a = new('ShaderNodeAttribute')
        a.attribute_name = name
        return a.outputs['Fac']

    ledge, wetk = attr('ledge'), attr('wetk')
    streak = M('MULTIPLY', M('SUBTRACT', noise((6, 6, 0.55), 3), 0.5), 7.0, clamp=True)    # fine across (about 15 cm), long down, and only some of the wall
    length = M('ADD', 0.6, M('MULTIPLY', noise((0.7, 0.7, 0.3), 2, 5.0), 3.5))            # how far each runs from its ledge
    reach = M('POWER', 0.2, M('DIVIDE', ledge, length))
    lip = M('MULTIPLY', M('POWER', 0.02, M('DIVIDE', ledge, 0.22)), 0.55)                    # a drip band just under the edge
    z = new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], z.inputs[0])
    nz_ = new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], nz_.inputs[0])
    upright = M('MULTIPLY', M('SUBTRACT', 1.0, M('ABSOLUTE', nz_.outputs['Z'])), 4.0, clamp=True)  # rain runs down walls; undersides and tops are another matter
    rain = M('MULTIPLY', M('MULTIPLY', M('MAXIMUM', M('MULTIPLY', streak, reach), lip), wetk), upright)
    water_line = M('DIVIDE', M('ADD', M('SUBTRACT', 0.55, z.outputs['Z']), M('MULTIPLY', M('SUBTRACT', noise((1.5, 1.5, 3.0), 3, 9.0), 0.5), 0.5)), 0.55, clamp=True)
    up = M('MULTIPLY', M('SUBTRACT', nz_.outputs['Z'], 0.7), 3.3, clamp=True)                  # roofs hold pools and stains
    pool = M('MULTIPLY', M('MULTIPLY', M('SUBTRACT', noise((0.7, 0.7, 0.7), 4, 17.0), 0.42), 3.0, clamp=True), up)
    damp = M('MAXIMUM', M('MAXIMUM', rain, M('MULTIPLY', water_line, 0.85)), M('MULTIPLY', pool, 0.6))
    bevel = new('ShaderNodeBevel')
    bevel.inputs['Radius'].default_value = 0.045
    bevel.samples = 10
    dot = new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    nt.links.new(bevel.outputs['Normal'], dot.inputs[0])
    nt.links.new(geo.outputs['Normal'], dot.inputs[1])
    wear = M('MULTIPLY', M('MULTIPLY', M('SUBTRACT', 1.0, dot.outputs['Value']), 14.0, clamp=True), M('ADD', 0.3, noise((22, 22, 22), 4, 3.0)), clamp=True)
    col = new('ShaderNodeCombineColor')
    put(col.inputs['Red'], damp)
    put(col.inputs['Green'], wear)
    emit = new('ShaderNodeEmission')
    nt.links.new(col.outputs['Color'], emit.inputs['Color'])
    out = new('ShaderNodeOutputMaterial')
    nt.links.new(emit.outputs[0], out.inputs[0])
    return m


MASK = mask_material()
BLACK = bpy.data.materials.new('mask_black')
BLACK.use_nodes = True
BLACK.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0, 0, 0, 1)
mimg = bpy.data.images.new('mask', LIGHT_RES, LIGHT_RES, alpha=False, float_buffer=True)
mimg.colorspace_settings.name = 'Non-Color'
for m in (MASK, BLACK):
    n = m.node_tree.nodes.new('ShaderNodeTexImage')
    n.image = mimg
    n.name = 'bake'
    m.node_tree.nodes.active = n
originals = {o: list(o.data.materials) for o in bake_objs}
for o, ms in originals.items():
    for i, m in enumerate(ms):
        o.data.materials[i] = MASK if m in (CONCRETE, ROOF_CONCRETE) else BLACK
scene.cycles.samples = min(SAMPLES, 96)
bpy.ops.object.bake(type='EMIT', margin=12, margin_type='EXTEND', use_clear=True)
for o, ms in originals.items():
    for i, m in enumerate(ms):
        o.data.materials[i] = m

# Store irradiance for three: the baked value is a white surface's radiance (E / pi); keep it linear in 8 bits as sRGB.
# Damp concrete is darker and a worn corner paler, so that goes in here; the wet map is the concrete's roughness.
px = np.empty(LIGHT_RES * LIGHT_RES * 4, np.float32)
img.pixels.foreach_get(px)
rgb = px.reshape(LIGHT_RES, LIGHT_RES, 4)[:, :, :3]
print('lightmap: mean %.3f p99 %.3f max %.3f' % (rgb.mean(), np.percentile(rgb, 99), rgb.max()))
px = np.empty(LIGHT_RES * LIGHT_RES * 4, np.float32)
mimg.pixels.foreach_get(px)
damp, wear = (px.reshape(LIGHT_RES, LIGHT_RES, 4)[:, :, i] for i in (0, 1))
print('damp: mean %.3f on concrete %.3f; wear mean %.4f' % (damp.mean(), damp[damp > 0.01].mean() if (damp > 0.01).any() else 0, wear.mean()))
rgb = rgb * (1 - np.array((0.40, 0.37, 0.41)) * damp[:, :, None]) * (1 + 0.22 * wear[:, :, None])
v = np.clip(rgb / LIGHT_RANGE, 0, 1)
v = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
rows = (np.round(v * 255).astype(np.uint8))[::-1]  # Blender's rows run bottom to top; images run top to bottom
wet = np.clip(0.9 - 0.52 * damp, 0, 1)             # roughness: 0.9 dry, 0.38 where it is damp
wet_rows = np.repeat(np.round(wet * 255).astype(np.uint8)[:, :, None], 3, 2)[::-1]


def png(path, a):
    h, w, _ = a.shape
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


png(out_light, rows)
png(out_wet, wet_rows)
if os.environ.get('HOUSE_MASK_PNG'):  # to look at where it is damp (red) and worn (green)
    png(os.environ['HOUSE_MASK_PNG'], np.round(np.clip(np.stack([damp, wear, np.zeros_like(damp)], 2), 0, 1) * 255).astype(np.uint8)[::-1])

# ---------------------------------------------------------------- export

bpy.data.objects.remove(water)
bpy.ops.object.select_all(action='DESELECT')
for o in list(scene.objects):
    if o.type in ('LIGHT',):
        bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=out_glb, export_format='GLB', export_image_format='WEBP', export_image_quality=82, export_texcoords=True,
                          export_normals=True, export_vertex_color='ACTIVE', export_materials='EXPORT', export_apply=True, export_cameras=False,
                          export_lights=False)
