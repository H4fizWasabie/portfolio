# Builds the House (the homepage's 3D outside and inside) and exports it as house-raw.glb plus house-light-raw.png and
# house-wet-raw.png. Run through build-house.sh, which compresses the glb with gltfpack and turns the two textures into
# house-light.webp and house-wet.webp.
#
# The House is a two-storey board-formed concrete villa on a plinth at the edge of a lake, after the mood of an
# overcast dusk: cool grey concrete and dark conifers outside, warm amber light inside. The look is stylised-real: simple
# forms in real materials (CC0 textures from Poly Haven, see textures/, and the concrete made here), lit by a bake in Cycles.
# The bake goes into a second UV set (TEXCOORD_1) as a lighting texture, which room.js applies as three's lightMap
# (irradiance, so it is stored as E / (pi * LIGHT_RANGE)); there are no dynamic lights. The outside is lit by a cool
# overcast sky (the CC0 HDRI below, only at bake time, white-balanced cooler) and the inside by warm lamps (LAMP and STRIP,
# two colours), so warm light spills out through the glass onto the terrace, the plinth edge and the cantilever's underside.
# The lake and the backdrop (mountain, mist) are not in the glb: room.js makes the water, build_backdrop.py renders the
# backdrop. A second bake, at night (a faint overcast glow, the lamps on), goes into house-light-night-raw.png beside the glb; the
# page swaps it in with the desk-lamp switch.
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
#   glow_*                      emissive parts (lamps, downlights, candle flames, LEDs); glow_<room>_panels, a
#                               Room's ceiling lights, are dimmed at night (NIGHT_PANELS)
#   trees, rocks                dark, unlit (vertex colours carry their shading); the page shows them with basic materials
#   trees_cards                 the near trees' branch cards: the same, with the branch texture cut out by its alpha
#   sheer                       the sheer curtains, baked like the rest; the page makes them see-through
#   poster_<step>               the How I work posters on the stair wall (requirements, build, measure): the page draws them
#   doorway_<slug>              empty on the sill of a Room's doorway, on the back wall, where Rooms attach
#                               (stock and records on the ground floor, ai and android upstairs)
#   door_<slug>                 the closed door leaf in that doorway (taken away once its Room is in)
#   obj_<project>, screen_<project>  in a Room's asset (room_<slug>.py): a project's object and its screen(s)
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
ONLY = os.environ.get('HOUSE_ROOMS', '').split(',') if os.environ.get('HOUSE_ROOMS') else None  # bake and export only these Rooms (e.g. ai), not the House
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
    grain = np.sin(2 * np.pi * (d / board * r.uniform(3, 6, nb)[row][:, None] + r.uniform(0, 1, nb)[row][:, None]) + 2.4 * field(260, 3))
    t = t * (1 + 0.008 * grain + 0.01 * field(40, 0.9))
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
            hole += (1 / (1 + np.exp((q - 0.031) / 0.0035))) * (0.55 - 0.09 * np.clip(dy / 0.031, -1, 1))  # the recess: darkest at the top, a lit lip below
            ring += np.exp(-((q - 0.047) / 0.011) ** 2)
            run += np.exp(-(dx / (0.02 + 0.006 * np.sin(dy * 40))) ** 2) * (dy > 0) * np.exp(-np.clip(dy, 0, None) / 0.32) * (dy < 0.7)
    t = t * (1 - np.clip(hole, 0, 1)) * (1 + 0.1 * ring) * (1 - 0.09 * np.clip(run, 0, 1) * (1 + 0.3 * field(2, 12)))
    t = t / t.mean() * 0.34  # dark, weathered concrete; the rain streaks are the wet bake's (they follow gravity, the tile does not)
    rgb = np.clip(np.stack([t * 0.985, t, t * 1.0], 2), 0, 1)
    out = np.ones((size, size, 4), np.float32)
    out[:, :, :3] = rgb[::-1]
    tex = bpy.data.images.new('board_formed', size, size)
    tex.pixels.foreach_set(out.ravel())
    tex.pack()
    tex.colorspace_settings.name = 'sRGB'
    return tex


BOARD_IMG = board_formed()


def image(name, rgba):
    """A packed image from an (h, w, 4) array whose first row is the top."""
    h, w, _ = rgba.shape
    img = bpy.data.images.new(name, w, h, alpha=True)
    img.pixels.foreach_set(np.ascontiguousarray(rgba[::-1], np.float32).ravel())
    img.pack()
    img.colorspace_settings.name = 'sRGB'
    return img


def branch_card(w=512, h=256):
    """A spruce branch seen from above, for the near trees' cards: the stem runs from the trunk (left) to the tip (right) along the
    middle, twigs leave it angled forward, longest near the trunk, and every twig and the stem carry short needles. Grey tones in
    the colour (the cards' vertex colours give the green and the light), the needles in the alpha."""
    r = np.random.default_rng(17)
    a, tone = np.zeros((h, w)), np.ones((h, w))
    yy, xx = np.mgrid[0:h, 0:w] + 0.5

    def seg(x0, y0, x1, y1, rad, t):
        i0, i1 = int(max(0, min(y0, y1) - rad - 2)), int(min(h, max(y0, y1) + rad + 3))
        j0, j1 = int(max(0, min(x0, x1) - rad - 2)), int(min(w, max(x0, x1) + rad + 3))
        if i0 >= i1 or j0 >= j1:
            return
        px, py = xx[i0:i1, j0:j1] - x0, yy[i0:i1, j0:j1] - y0
        dx, dy = x1 - x0, y1 - y0
        k = np.clip((px * dx + py * dy) / max(dx * dx + dy * dy, 1e-6), 0, 1)
        cov = np.clip(rad + 0.5 - np.hypot(px - k * dx, py - k * dy), 0, 1)
        sa = a[i0:i1, j0:j1]
        tone[i0:i1, j0:j1] = np.where(cov > sa, t, tone[i0:i1, j0:j1])
        a[i0:i1, j0:j1] = np.maximum(sa, cov)

    def needles(x0, y0, x1, y1, n_len, gap):
        L = math.hypot(x1 - x0, y1 - y0)
        ux, uy = (x1 - x0) / L, (y1 - y0) / L
        for s_ in np.arange(0, L, gap):
            for side in (-1, 1):
                ang = side * r.uniform(0.75, 1.15)
                c, sn = math.cos(ang), math.sin(ang)
                nx, ny = ux * c - uy * sn, ux * sn + uy * c
                ln = n_len * r.uniform(0.7, 1.15) * (1 - 0.5 * s_ / L)
                bx, by = x0 + ux * s_, y0 + uy * s_
                seg(bx, by, bx + nx * ln, by + ny * ln, r.uniform(0.6, 0.95), r.uniform(0.55, 1.0) * (0.75 + 0.25 * s_ / L))

    cy = h / 2
    tip = w - 14
    for t in np.linspace(0.03, 0.92, 22):
        x = 10 + t * (tip - 10)
        for side in (-1, 1):
            ang = side * r.uniform(0.6, 0.9)
            ln = (0.2 + 0.36 * (1 - t) ** 0.8) * h * r.uniform(0.85, 1.1)
            ex, ey = x + math.cos(ang) * ln, cy + math.sin(ang) * ln
            needles(x, cy, ex, ey, 13, 2.4)
            seg(x, cy, ex, ey, 1.0, 0.3)
    needles(10, cy, tip, cy, 13, 2.4)
    seg(6, cy, tip, cy, 1.6, 0.25)
    rgba = np.ones((h, w, 4))
    rgba[:, :, :3] = tone[:, :, None] * np.array((0.92, 1.0, 0.94))
    rgba[:, :, 3] = a
    return image('branch', rgba)


def print_art(w, h, seed, kind):
    """A framed print for the walls: 'ridges' is an ink-wash of misty ridgelines (the lake's own hills), 'fields' soft
    blocks of ochre and charcoal. Both on paper with a pale mat."""
    r = np.random.default_rng(seed)
    y, x = np.mgrid[0:h, 0:w] / h
    paper = np.array((0.9, 0.88, 0.84))
    img = np.broadcast_to(paper, (h, w, 3)).copy()
    def smooth_line(n, amp, fq):
        u = np.linspace(0, 1, w)
        return sum(amp / (k + 1) * np.sin(2 * np.pi * (fq * (k + 1) * u + r.uniform(0, 1))) for k in range(n))
    if kind == 'ridges':
        for i, (base, ink) in enumerate(((0.42, 0.72), (0.52, 0.55), (0.64, 0.36), (0.78, 0.18))):
            line = base + smooth_line(5, 0.06 + 0.02 * i, 0.6 + 0.3 * i)
            below = y > line[None, :]
            fade = np.clip((y - line[None, :]) / 0.25, 0, 1)
            col = np.array((0.16, 0.19, 0.2)) * (1 - ink) + paper * ink
            img = np.where(below[..., None], col * (1 - 0.25 * fade[..., None]) + paper * 0.25 * fade[..., None], img)
    else:
        img[:] = (0.8, 0.74, 0.62)
        for (y0, y1, c) in ((0.08, 0.5, (0.62, 0.42, 0.22)), (0.56, 0.92, (0.16, 0.16, 0.17))):
            edge = np.clip(np.minimum(y - y0, y1 - y) / 0.03, 0, 1) * np.clip(np.minimum(x - 0.08, (w / h - 0.08) - x) / 0.03, 0, 1)
            img = img * (1 - edge[..., None]) + np.array(c) * edge[..., None]
    img = img * (1 + 0.03 * r.normal(0, 1, (h, w, 1)))
    mat_w = 0.09
    inner = (np.minimum(np.minimum(x, w / h - x), np.minimum(y, 1 - y)) > mat_w)
    img = np.where(inner[..., None], img, np.array((0.93, 0.92, 0.89)))
    rgba = np.ones((h, w, 4))
    rgba[:, :, :3] = np.clip(img, 0, 1)
    return image('print_' + kind, rgba)


BRANCH_IMG = branch_card()


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
OAK_CLAD = mat('oak_clad', 'oak', 1.83, (0.62, 0.5, 0.4), 0.6)  # the battens outside, weathered lighter than the doors
OAK_FLOOR = mat('oak_floor', 'oak', 1.83, (0.5, 0.45, 0.4), 0.45)
PLASTER = mat('plaster', 'plaster', 2.0, (0.96, 0.94, 0.9), 0.95, size=256)
FLOOR = mat('floor', 'floor', 2.0, (0.5, 0.5, 0.5), 0.35, size=384)
TERRACE = mat('terrace', 'floor', 2.0, (0.36, 0.38, 0.38), 0.55, size=384)
GROUND = mat('ground', 'grass', 4.0, (0.2, 0.23, 0.2), 1.0, size=256)
ROCK = mat('rock', 'moss-rock', 1.6, (0.8, 0.85, 0.78), 0.95, size=256)
FOLIAGE = mat('foliage', None, color=(0.2, 0.24, 0.22), rough=1.0, double=True)  # trees: dark in the bake; in the page the vertex colours are all of it, unlit
FOLIAGE_CARD = mat('foliage_card', BRANCH_IMG, color=(0.2, 0.24, 0.22), rough=1.0, double=True)  # the near trees' branch cards: the same, through the branch's alpha
FOLIAGE_CARD.node_tree.links.new(next(n for n in FOLIAGE_CARD.node_tree.nodes if n.type == 'TEX_IMAGE').outputs['Alpha'], FOLIAGE_CARD.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
FRAME = mat('frame', None, color=(0.03, 0.032, 0.036), rough=0.45, metal=1.0)  # black steel
BRASS = mat('brass', None, color=(0.55, 0.4, 0.22), rough=0.35, metal=1.0)
FABRIC = mat('fabric', None, color=(0.2, 0.205, 0.2), rough=1.0)
FABRIC_PALE = mat('fabric_pale', None, color=(0.78, 0.74, 0.68), rough=1.0)
FABRIC_OAT = mat('fabric_oat', None, color=(0.6, 0.57, 0.52), rough=1.0)
SHEER = mat('sheer', None, color=(0.97, 0.95, 0.9), rough=1.0, double=True)  # the page shows it see-through
PRINT_RIDGES = mat('print_ridges', print_art(384, 256, 3, 'ridges'), 1.0, rough=0.9)
PRINT_FIELDS = mat('print_fields', print_art(256, 320, 4, 'fields'), 1.0, rough=0.9)
POSTER = mat('poster', image('poster', np.full((4, 4, 4), 1.0)), 1.0, (0.93, 0.92, 0.89), rough=0.9)  # paper; the page draws each poster onto it
GRAVEL = mat('gravel', 'floor', 1.2, (0.3, 0.31, 0.31), 0.95, size=384)
CHARCOAL = mat('charcoal', None, color=(0.05, 0.052, 0.055), rough=0.8)
CANVAS_DARK = mat('canvas_dark', None, color=(0.22, 0.27, 0.3), rough=0.9)  # book cloth
WARM = (1.0, 0.46, 0.14)
# Two lamp colours (linear rgb), the same in the bake and in the glb. LAMP is the deep amber of a 2700 K lamp as photographed
# (the page's tone mapping pales a bright amber): the downlights, shades and soffits. STRIP is a paler warm white, the LED
# strips that wash the walls and the floor, so the lobby has two colours of light, not one. Set here, not by Blackbody,
# whose colour at a given temperature changes between Blender versions (5.2's 2000 K has a fifth of this blue).
LAMP_RGB = (1.0, 0.363, 0.069)
STRIP_RGB = (1.0, 0.54, 0.18)
LAMP, STRIP = (tuple(c ** (1 / 2.2) for c in rgb) for rgb in (LAMP_RGB, STRIP_RGB))
GLOW = mat('glow', None, color=WARM, rough=0.5, emit=28.0, emit_color=LAMP)
GLOW_FLAME = mat('glow_flame', None, color=WARM, rough=0.5, emit=150.0, emit_color=LAMP)
GLOW_WASH = mat('glow_wash', None, color=WARM, rough=0.5, emit=float(os.environ.get('WASH', 5.0)), emit_color=STRIP)  # the strips along the ceiling that wash the back walls: kept low, so the downlights' pools show on them
GLOW_COVE = mat('glow_cove', None, color=WARM, rough=0.5, emit=float(os.environ.get('COVE', 10.0)), emit_color=STRIP)  # the strip behind the glass head of each floor: it washes the floor and spills out onto the terrace and the balcony
GLOW_SHADE = mat('glow_shade', None, color=WARM, rough=0.5, emit=9.0, emit_color=LAMP)  # a linen lampshade lit from inside
GLOW_SOFFIT = mat('glow_soffit', None, color=WARM, rough=0.5, emit=45.0, emit_color=LAMP)  # downlights under the cantilever
GLOW_SIDE = mat('glow_side', None, color=WARM, rough=0.5, emit=14.0, emit_color=LAMP)  # the strip at the head of each side window upstairs: it washes the curtain behind the glass
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
        self.face_uv = {}  # face -> its corners' uvs, for parts that map a texture by hand (branch cards, pictures); uv=False
        self.top = self.bm.faces.layers.float.new('top')    # per face: the height rain runs down from (a ledge), for the wet bake
        self.wetk = self.bm.faces.layers.float.new('wetk')  # per face: how much rain reaches it (1 in the open)

    def slot(self, material):
        if material not in self.slots:
            self.slots.append(material)
        return self.slots.index(material)

    def box(self, x0, x1, y0, y1, z0, z1, material, drop=(), keep=None, bevel=0.0, top=None, wet=1.0, segments=2):
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
            for f in bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=segments, affect='EDGES')['faces']:
                f.material_index = mi  # bevel gives its new faces slot 0: the part's first material, not the box's
                f[self.top] = z1 if top is None else top
                f[self.wetk] = wet
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
        if self.face_uv:
            uv = bm.loops.layers.uv.get('uv0') or bm.loops.layers.uv.new('uv0')
            for f, uvs in self.face_uv.items():
                for l, c in zip(f.loops, uvs):
                    l[uv].uv = c
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
YW = 19.6                   # the back of the rear wing behind it, where the Rooms are (outer face)
HX0, HX1, FX = 7.2, 7.4, 8.6   # inner half widths (ground, upstairs) and the concrete frame's outer half width
BAL = -1.4                  # the balcony's front edge
DOORS = [('stock', -3.8, 0), ('records', 1.0, 0), ('ai', -3.8, 1), ('android', 1.0, 1)]  # slug, x, storey
OPEN_W, OPEN_H = 0.65, 2.55  # half width and height of a doorway
WING_WIN = {0: (FL0 + 2.45, CE0 - 0.1), 1: (FL1 + 2.45, CE1 - 0.08)}  # sill and head of the Rooms' ribbon windows, per storey: over their furniture


def ribbon(x0, x1):
    """The ribbon window (centre, half width) in the back wall of a Room that runs from x0 to x1."""
    return (x0 + x1) / 2, (x1 - x0) / 2 - 0.3


WING_RIBBONS = [ribbon(-FX + 0.4, -0.5), ribbon(-0.3, 5.0)]  # the Rooms' spans: stock and ai on the left, records and android on the right
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
    for xc, hw, h in openings:  # the lintel keeps its underside: the tour walks under it
        part.box(xc - hw, xc + hw, y0, y1, z0 + h, z1, material, **{**kw, 'drop': [d for d in kw.get('drop', ()) if d != DOWN]})


def wall_with_windows(part, x0, x1, y0, y1, z0, z1, sill, head, windows, material, **kw):
    """A wall along x from z0 to z1 with windows (centre, half width) cut through it from sill to head."""
    part.box(x0, x1, y0, y1, z0, sill, material, **kw)
    walls_with_openings(part, x0, x1, y0, y1, sill, z1, [(xc, hw, head - sill) for xc, hw in windows], material, **kw)


# --- the ground: land with a shore, bake-only water
def shore(x):
    """Where the shore line runs (y) at this x: the House stands on a headland, the shore falling back either side."""
    return -3.6 + 0.021 * max(0.0, abs(x) - 10.8) ** 2 + 1.2 * noise.noise(Vector((x * 0.11, 3.0, 0.0)))


def land_height(x, y):
    s = shore(x)
    if abs(x) < 11.5 and y < YW + 1.9:
        return -0.4  # under the plinth
    bank = lerp(-0.55, TERR - 0.1, (y - s) / 2.6)
    rise = 0.03 * max(0.0, y - 22) + 0.0009 * max(0.0, abs(x) - 24) ** 2
    return bank + (rise if y > s + 2.6 else 0) + 0.07 * noise.noise(Vector((x * 0.12, y * 0.12, 1.0))) * (1 if y > s + 2 else 0.3)


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
    plinth.box(-10.5, 10.5, -3.6, YW + 1.0, za, zb, CONCRETE, drop=[DOWN, UP, NORTH], top=TERR)
plinth.box(-10.5, 10.5, -3.6, YW + 1.0, TERR, TERR + 0.002, TERRACE, keep=UP)

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
SIDE_WIN = (2.4, 10.2, FL1 + 0.55, CE1 - 0.3)  # the side window upstairs (y0, y1, z0, z1): glass 0.15 m into the wall, a curtain behind it
for sx in (-1, 1):
    a, b = sorted((sx * HX1, sx * FX))
    y0, y1, z0, z1 = SIDE_WIN
    house.box(a, b, BAL, y0, FL1, CE1, CONCRETE, drop=[UP, DOWN], top=ROOF)
    house.box(a, b, y1, YB + 0.4, FL1, CE1, CONCRETE, drop=[UP, DOWN, NORTH], top=ROOF)
    house.box(a, b, y0, y1, FL1, z0, CONCRETE, drop=[DOWN, NORTH, SOUTH], top=ROOF)  # under the sill: its top is the sill
    house.box(a, b, y0, y1, z1, CE1, CONCRETE, drop=[UP, NORTH, SOUTH], top=ROOF)    # over the head: its underside is the head
    house.box(*sorted((sx * HX1, sx * (FX - 0.6))), y0, y1, z0, z1, CONCRETE, keep=(sx, 0, 0), wet=0.2)  # the back of the recess
    # a pleated linen curtain drawn across it, lit from the strip above (side_glow), so the bake gives it a falloff
    for i, y in enumerate(np.arange(y0, y1 - 0.01, 0.13)):
        xc = FX - 0.55 + 0.035 * (i % 2)
        house.box(*sorted((sx * xc, sx * (xc + 0.01))), y, min(y + 0.13, y1), z0, z1 - 0.06, FABRIC_PALE, keep=(sx, 0, 0), wet=0)
# The step where the wing stands out past the ground storey: its face, clad like the rest (it was open into the Rooms)
for sx in (-1, 1):
    house.box(*sorted((sx * 7.6, sx * FX)), YB + 0.38, YB + 0.4, TERR, CE0, OAK_CLAD, keep=SOUTH, wet=0.3)
upper_doors = [(x, OPEN_W, OPEN_H) for slug, x, st in DOORS if st == 1]
walls_with_openings(house, -HX1, HX1, YB, YB + 0.4, FL1, CE1, upper_doors, CONCRETE, drop=[DOWN, UP, NORTH, SOUTH])
# The rear wing behind the back wall, two storeys, where the four Rooms are (each Room's asset holds its inside): its outside only
house.box(-FX, FX, YB + 0.4, YW - 0.4, TERR, ROOF, CONCRETE, drop=[DOWN, SOUTH, UP, NORTH], top=ROOF)
# its back wall, with a ribbon window high in each Room (WING_WIN), so the dusk shows in the Rooms
for z0, z1, st in ((TERR, FL1, 0), (FL1, ROOF, 1)):
    wall_with_windows(house, -FX, FX, YW - 0.4, YW, z0, z1, *WING_WIN[st], WING_RIBBONS, CONCRETE, drop=[SOUTH], top=ROOF)
# The roof, over the House and the wing: a parapet round its edge, gravel inside it, two flat rooflights
for a, b, c, d in ((-FX, FX, BAL, BAL + 0.25), (-FX, FX, YW - 0.25, YW), (-FX, -FX + 0.25, BAL, YW), (FX - 0.25, FX, BAL, YW)):
    house.box(a, b, c, d, ROOF, ROOF + 0.3, CONCRETE, drop=[DOWN])
house.box(-FX + 0.25, FX - 0.25, BAL + 0.25, YW - 0.25, ROOF, ROOF + 0.04, GRAVEL, keep=UP)
for x0, x1 in ((-5.6, -2.6), (-1.4, 1.6)):
    house.box(x0, x1, 6.2, 8.8, ROOF + 0.04, ROOF + 0.32, FRAME, drop=[DOWN])
# The stove's flue: a slim black steel pipe through the roof, with a cap
house.cyl(6.8, 4.2, ROOF + 0.3, ROOF + 2.0, 0.16, FRAME, seg=16, caps=(False, False))
house.cyl(6.8, 4.2, ROOF + 2.0, ROOF + 2.12, 0.24, FRAME, seg=16, r_top=0.2)
# The ground storey is clad in oak battens all round its sides (the wing's too), so the concrete upper floor sits on a
# timber base, with a dark shadow gap where the concrete starts
for sx in (-1, 1):
    for x, ya, yb, wet in ((7.6, YF, YB + 0.4, 0.3), (FX, YB + 0.4, YW, 1.0)):
        house.box(*sorted((sx * x, sx * (x + 0.02))), ya, yb, TERR, CE0 - 0.06, OAK_CLAD, keep=(sx, 0, 0), wet=wet)
        house.box(*sorted((sx * x, sx * (x + 0.01))), ya, yb, CE0 - 0.06, CE0, CHARCOAL, keep=(sx, 0, 0))
        for y in np.arange(ya + 0.1, yb - 0.05, 0.3):
            house.box(*sorted((sx * (x + 0.02), sx * (x + 0.06))), y - 0.022, y + 0.022, TERR, CE0 - 0.06, OAK_CLAD, drop=[UP, DOWN, (-sx, 0, 0)], wet=wet)
# A steel coping on the parapet, and two plant boxes on the roof towards the back
for a, b, c, d in ((-FX - 0.02, FX + 0.02, BAL - 0.02, BAL + 0.27), (-FX - 0.02, FX + 0.02, YW - 0.27, YW + 0.02), (-FX - 0.02, -FX + 0.27, BAL, YW), (FX - 0.27, FX + 0.02, BAL, YW)):
    house.box(a, b, c, d, ROOF + 0.3, ROOF + 0.34, FRAME, drop=[DOWN])
for x0, y0 in ((-4.5, 14.5), (2.0, 15.6)):
    house.box(x0, x0 + 1.4, y0, y0 + 0.9, ROOF + 0.04, ROOF + 0.85, FRAME, drop=[DOWN])
# A long window on each side upstairs, warm behind a sheer: a steel frame, the glass and a lit panel behind it
side_glow, side_glass = Part('glow_side', 1.0), Part('glass_side', 0)
for sx in (-1, 1):
    y0, y1, z0, z1 = SIDE_WIN
    xr = FX - 0.2  # the window's frame
    side_glow.box(*sorted((sx * (FX - 0.5), sx * (FX - 0.4))), y0, y1, z1 - 0.02, z1, GLOW_SIDE, keep=DOWN)  # hidden behind the head
    side_glass.box(*sorted((sx * (xr + 0.05), sx * (xr + 0.06))), y0, y1, z0, z1, GLASS, keep=(sx, 0, 0))
    third = (y1 - y0) / 3
    for a, b, c, d in ((y0, y1, z0, z0 + 0.05), (y0, y1, z1 - 0.05, z1), (y0, y0 + 0.05, z0, z1), (y1 - 0.05, y1, z0, z1), (y0 + third - 0.03, y0 + third + 0.03, z0, z1), (y1 - third - 0.03, y1 - third + 0.03, z0, z1)):
        house.box(*sorted((sx * xr, sx * (xr + 0.08))), a, b, c, d, FRAME, drop=[(-sx, 0, 0)])

# --- interior: floors, plaster, ceilings
inside = Part('house_interior', 1.1)
inside.box(-HX0, HX0, YF, YB, TERR, FL0, FLOOR, keep=UP)                           # ground floor (a slab of polished concrete)
inside.box(-HX0 + 0.02, HX0 - 0.02, YF, 7.4, CE0 - 0.03, CE0, OAK_MID, keep=DOWN)  # oak ceiling, round the stairwell
inside.box(-HX0 + 0.02, 5.5, 7.4, YB, CE0 - 0.03, CE0, OAK_MID, keep=DOWN)
inside.box(5.5, HX0 - 0.02, STAIR_TOP_Y, YB, CE0 - 0.03, CE0, OAK_MID, keep=DOWN)
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
# the Rooms' ribbon windows: glass set back in the wing's back wall, a steel frame with a mullion about every 1.2 m
glass_wing = Part('glass_wing', 0)
for sill, head in WING_WIN.values():
    for xc, hw in WING_RIBBONS:
        glass_wing.box(xc - hw, xc + hw, YW - 0.16, YW - 0.15, sill, head, GLASS, keep=NORTH)
        n = round(2 * hw / 1.2)
        for i in range(n + 1):
            x = xc - hw + 2 * hw * i / n
            frames.box(max(x - 0.03, xc - hw), min(x + 0.03, xc + hw), YW - 0.18, YW - 0.12, sill, head, FRAME)
        for z in (sill, head - 0.04):
            frames.box(xc - hw, xc + hw, YW - 0.18, YW - 0.12, z, z + 0.04, FRAME)
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


def chair(part_s, part_h, cx, cy, face, z=FL0, along_x=False):
    """A chair at (cx, cy) on the floor z, facing +y (face=1) or -y (face=-1), or along x with along_x: an upholstered seat
    on four oak legs, the back two rising to an oak rail."""
    def piece(part, a0, a1, b0, b1, z0, z1, m, **kw):  # a across the chair, b front to back, both from its centre
        if along_x:
            part.box(cx + b0, cx + b1, cy + a0, cy + a1, z0, z1, m, **kw)
        else:
            part.box(cx + a0, cx + a1, cy + b0, cy + b1, z0, z1, m, **kw)
    piece(part_s, -0.22, 0.22, -0.21, 0.21, z + 0.42, z + 0.48, FABRIC, bevel=0.025, segments=3)
    back = -face * 0.2
    piece(part_h, -0.21, 0.21, back - 0.012, back + 0.012, z + 0.64, z + 0.84, OAK, bevel=0.008)
    for a in (-0.19, 0.19):
        for b in (-0.18, 0.18):
            top = z + 0.84 if abs(b - back) < 0.05 else z + 0.42
            piece(part_h, a - 0.014, a + 0.014, b - 0.014, b + 0.014, z, top, OAK_DARK)


def picture(part, x0, x1, z0, z1, print_mat):
    """A framed print flat on the back wall (its texture fills the frame)."""
    y = YB - 0.05
    vs = [part.bm.verts.new(p) for p in ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))]
    f = part.bm.faces.new(vs)
    f.material_index = part.slot(print_mat)
    f[part.top], f[part.wetk] = z1, 1.0
    part.face_uv[f] = [(0, 0), (1, 0), (1, 1), (0, 1)]
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

def sofa(x0, x1, y0, y1, z, cloth, seats=3):
    """A low sofa facing -y (the lake): an oak plinth, one long seat cushion, `seats` back cushions, rounded arms."""
    fx.box(x0 + 0.05, x1 - 0.05, y0 + 0.08, y1 - 0.05, z, z + 0.1, OAK_DARK, bevel=0.01)
    furn.box(x0, x0 + 0.2, y0, y1, z + 0.1, z + 0.62, cloth, bevel=0.07, segments=4)
    furn.box(x1 - 0.2, x1, y0, y1, z + 0.1, z + 0.62, cloth, bevel=0.07, segments=4)
    furn.box(x0 + 0.2, x1 - 0.2, y1 - 0.3, y1, z + 0.1, z + 0.42, cloth, bevel=0.03)
    furn.box(x0 + 0.2, x1 - 0.2, y0 + 0.02, y1 - 0.28, z + 0.1, z + 0.44, cloth, bevel=0.05, segments=4)  # one long seat cushion
    w = (x1 - x0 - 0.4) / seats
    for i in range(seats):
        a = x0 + 0.2 + i * w
        furn.box(a + 0.005, a + w - 0.005, y1 - 0.3, y1 - 0.04, z + 0.4, z + 0.82, cloth, bevel=0.07, segments=4)    # back cushion


# the lounge, right: a low sofa facing the lake, a coffee table, a rug, a floor lamp
sofa(1.6, 5.2, 4.7, 5.95, FL0, FABRIC_OAT)
fx.box(2.4, 4.4, 2.8, 3.6, FL0 + 0.3, FL0 + 0.36, OAK_DARK, bevel=0.01)
fx.box(2.45, 2.5, 2.85, 2.9, FL0, FL0 + 0.3, FRAME)
fx.box(4.3, 4.35, 3.5, 3.55, FL0, FL0 + 0.3, FRAME)
fx.cyl(6.2, 2.4, FL0, FL0 + 1.55, 0.012, FRAME, seg=6)
fx.cyl(6.2, 2.4, FL0, FL0 + 0.02, 0.16, FRAME, seg=14)
glows.cyl(6.2, 2.4, FL0 + 1.35, FL0 + 1.7, 0.18, GLOW_SHADE, seg=20, r_top=0.15)
def console(z):
    """A slim oak console hung on the back wall between the two doors (they leave x -2.45..-0.35), a shadow gap under it,
    with a ceramic jar, two books and a small lamp."""
    fx.box(-2.2, -0.6, YB - 0.42, YB - 0.04, z + 0.3, z + 0.62, OAK_DARK, bevel=0.006)
    fx.box(-2.17, -0.63, YB - 0.4, YB - 0.04, z + 0.28, z + 0.3, CHARCOAL)
    fx.cyl(-1.95, YB - 0.22, z + 0.62, z + 0.9, 0.09, FABRIC_PALE, seg=16, r_top=0.06)
    fx.box(-1.55, -1.25, YB - 0.33, YB - 0.12, z + 0.62, z + 0.66, CANVAS_DARK, bevel=0.003)
    fx.box(-1.52, -1.28, YB - 0.31, YB - 0.14, z + 0.66, z + 0.69, FABRIC_OAT, bevel=0.003)
    fx.cyl(-0.85, YB - 0.22, z + 0.62, z + 0.64, 0.07, BRASS, seg=12)
    fx.cyl(-0.85, YB - 0.22, z + 0.64, z + 0.9, 0.008, BRASS, seg=6)
    glows.cyl(-0.85, YB - 0.22, z + 0.88, z + 1.06, 0.1, GLOW, seg=14, r_top=0.07)


console(FL0)
picture(fx, -2.15, -0.65, FL0 + 1.15, FL0 + 2.15, PRINT_RIDGES)
# sheer curtains, pleated, at both ends of the glazing on each floor and one drawn part way upstairs
sheer = Part('sheer', 0.9)


def curtain(x0, x1, z0, z1):
    n = int((x1 - x0) / 0.06)
    top, bot = [], []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        y = YF + 0.22 + 0.05 * math.sin(i * math.pi / 2)  # a pleat every 0.24 m
        bot.append(sheer.bm.verts.new((x, y, z0 + 0.02)))
        top.append(sheer.bm.verts.new((x, y, z1)))
    for i in range(n):
        f = sheer.bm.faces.new([bot[i], bot[i + 1], top[i + 1], top[i]])
        f.material_index = sheer.slot(SHEER)


for x0, x1 in ((-7.15, -5.75), (5.75, 7.15)):
    curtain(x0, x1, FL0, CE0 - 0.05)

# upstairs: sofa facing the glass, rug, desk with a lamp, a picture between the doors, curtains
sofa(-2.4, 1.4, 4.4, 5.65, FL1, FABRIC)
fx.box(-1.5, 0.5, 2.5, 3.3, FL1 + 0.28, FL1 + 0.34, OAK_DARK, bevel=0.01)
fx.box(-1.45, -1.4, 2.55, 2.6, FL1, FL1 + 0.28, FRAME)
fx.box(0.4, 0.45, 3.2, 3.25, FL1, FL1 + 0.28, FRAME)
fx.box(-7.2, -5.6, 7.6, 8.4, FL1 + 0.72, FL1 + 0.77, OAK, bevel=0.01)          # desk against the left wall
fx.box(-7.15, -7.1, 7.65, 7.7, FL1, FL1 + 0.72, FRAME)
fx.box(-5.65, -5.6, 8.3, 8.35, FL1, FL1 + 0.72, FRAME)
glows.cyl(-6.8, 8.0, FL1 + 0.77, FL1 + 1.12, 0.1, GLOW, seg=12, r_top=0.06)
fx.cyl(5.0, 2.4, FL1, FL1 + 1.5, 0.012, FRAME, seg=6)
fx.cyl(5.0, 2.4, FL1, FL1 + 0.02, 0.16, FRAME, seg=14)
glows.cyl(5.0, 2.4, FL1 + 1.3, FL1 + 1.65, 0.18, GLOW_SHADE, seg=20, r_top=0.15)
console(FL1)
picture(fx, -2.15, -0.65, FL1 + 1.15, FL1 + 2.15, PRINT_RIDGES)
picture(fx, -6.6, -5.6, FL1 + 0.9, FL1 + 2.15, PRINT_FIELDS)


# The stair wall: one plaster face the full height of the flight (below it the ground floor's wall, above it the upstairs one),
# and on it the three posters of How I work, each at eye height above its tread. The page draws what is on them (room.js).
STAIR_WALL = HX0 - 0.04
inside.box(STAIR_WALL, HX0 - 0.02, STAIR_Y0, STAIR_TOP_Y, FL0, CE1, PLASTER, keep=WEST)


def poster(step, yc, zc, w=0.7, h=0.95):
    """A framed poster on the stair wall (facing -x), centred at (yc, zc): its own object, poster_<step>, mapped 0..1."""
    part = Part(f'poster_{step}', 1.6)
    x, y0, y1, z0, z1 = STAIR_WALL - 0.03, yc - w / 2, yc + w / 2, zc - h / 2, zc + h / 2
    vs = [part.bm.verts.new(p) for p in ((x, y1, z0), (x, y0, z0), (x, y0, z1), (x, y1, z1))]
    f = part.bm.faces.new(vs)
    f.material_index = part.slot(POSTER)
    part.face_uv[f] = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for a, b, c, d in ((y0 - 0.025, y1 + 0.025, z1, z1 + 0.025), (y0 - 0.025, y1 + 0.025, z0 - 0.025, z0), (y0 - 0.025, y0, z0, z1), (y1, y1 + 0.025, z0, z1)):
        fx.box(STAIR_WALL - 0.045, STAIR_WALL, a, b, c, d, FRAME)
    doors.append(part)


def tread_top(y):
    return FL0 + RISE * (math.floor((y - STAIR_Y0) / GOING) + 1)


for step, yc in (('requirements', 7.1), ('build', 8.75), ('measure', 10.35)):
    poster(step, yc, tread_top(yc) + 1.4)
for x0, x1 in ((-7.35, -5.95), (-3.6, -2.5), (5.95, 7.35)):
    curtain(x0, x1, FL1, CE1 - 0.05)
# the balcony: a round table and two chairs
fx.cyl(-1.9, -0.3, FL1, FL1 + 0.72, 0.02, FRAME, seg=6)
fx.cyl(-1.9, -0.3, FL1 + 0.72, FL1 + 0.75, 0.42, FRAME, seg=20)
chair(furn, fx, -2.6, -0.3, 1, FL1, along_x=True)
chair(furn, fx, -1.2, -0.3, -1, FL1, along_x=True)

# the terrace: a low outdoor sofa and table right of the open door, a long oak bench on the left, a planter of grasses at the corner
sofa(2.8, 5.6, -2.3, -1.3, TERR, FABRIC)
fx.box(3.4, 5.0, -3.25, -2.65, TERR, TERR + 0.32, TERRACE, bevel=0.02, segments=3)
fx.box(-6.2, -3.4, -2.9, -2.45, TERR + 0.36, TERR + 0.42, OAK, bevel=0.01)
for x in (-5.95, -3.65):
    fx.box(x - 0.08, x + 0.08, -2.85, -2.5, TERR, TERR + 0.36, TERRACE)
fx.box(7.4, 10.2, -3.4, -2.2, TERR, TERR + 0.45, CONCRETE, drop=[DOWN])

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
# and over the balcony, under the roof's overhang: a row along it, one over the table
for x in (-5.4, -1.8, 1.8, 5.4):
    terrace_lights.cyl(x, -0.2, CE1 - 0.03, CE1, 0.06, GLOW_SOFFIT, seg=10, caps=(True, False))

parts = [land, plinth, house, inside, frames, stairs, furn, fx, sheer, glows, down, wash, cove, terrace_lights, glass_f, glass_u, glass_r, glass_wing, side_glow, side_glass]
objects = [p.build() for p in parts] + [d.build() for d in doors]

for slug, x, st in DOORS:
    empty(f'doorway_{slug}', (x, YB, FL1 if st else FL0))

# --- the Rooms behind the doorways (room_<slug>.py, run here so a Room and the House light each other), each its own asset
def quad(part, corners, material):
    """A flat face through four corners (bottom left, bottom right, top right, top left as seen from its front), mapped 0..1:
    a screen, whose picture the page puts on it."""
    f = part.bm.faces.new([part.bm.verts.new(c) for c in corners])
    f.material_index = part.slot(material)
    part.face_uv[f] = [(0, 0), (1, 0), (1, 1), (0, 1)]
    return f


def rod(part, a, b, r, material, seg=12, r_b=None):
    """A cylinder (a cone, with r_b) from point a to point b."""
    a, d = Vector(a), Vector(b) - Vector(a)
    before = set(part.bm.verts)
    part.cyl(0, 0, 0, d.length, r, material, seg=seg, r_top=r_b)
    q = d.to_track_quat('Z', 'Y' if abs(d.normalized().x) > 0.9 else 'X')  # turns +z onto d
    for v in set(part.bm.verts) - before:
        v.co = a + q @ v.co
    part.bm.normal_update()


def ring(part, centre, normal, R, r, material, seg=40, tube=8):
    """A torus round `normal` at `centre`: radius R, tube radius r."""
    q = Vector(normal).to_track_quat('Z', 'Y' if abs(Vector(normal).normalized().x) > 0.9 else 'X')
    rows = [[part.bm.verts.new(Vector(centre) + q @ Vector(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
             for b in np.linspace(0, 2 * math.pi, tube, endpoint=False)] for a in np.linspace(0, 2 * math.pi, seg, endpoint=False)]
    mi = part.slot(material)
    for i in range(seg):
        for j in range(tube):
            f = part.bm.faces.new((rows[i][j], rows[(i + 1) % seg][j], rows[(i + 1) % seg][(j + 1) % tube], rows[i][(j + 1) % tube]))
            f.material_index = mi
    part.bm.normal_update()


def turned(parts, centre, angle, make):
    """Runs make() and turns what it added to these parts by `angle` radians about the upright through centre (x, y)."""
    before = [set(p.bm.verts) for p in parts]
    make()
    c, s_ = math.cos(angle), math.sin(angle)
    for p, old in zip(parts, before):
        for v in set(p.bm.verts) - old:
            x, y = v.co.x - centre[0], v.co.y - centre[1]
            v.co.x, v.co.y = centre[0] + x * c - y * s_, centre[1] + x * s_ + y * c
        p.bm.normal_update()


ROOMS = {}
for room in ('stock', 'records', 'ai', 'android'):
    exec(open(os.path.join(here, f'room_{room}.py')).read())
ROOM_OBJS = {o for objs in ROOMS.values() for o in objs}

# --- boulders at the waterline and trees on the land
ROCK_SPECS = [(-9.8, -5.0, 1.5), (-13.6, -3.0, 1.0), (11.8, -5.0, 1.85), (14.8, -2.8, 1.05), (8.6, -5.4, 0.7), (-6.4, -5.8, 0.55), (-17.5, 0.0, 1.5), (19.5, 1.5, 1.7), (-24, 5.5, 1.3), (25, 6.5, 1.1), (16.5, -4.3, 0.55), (-7.8, -4.4, 0.45), (13.6, -4.1, 0.6), (-11.2, -5.9, 0.4)]


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
# Their shading per vertex (the page shows them unlit, over the moss-rock photograph): moss on what faces up, dark and wet at the
# waterline, darker underneath and in the hollows.
bm.normal_update()
for v in bm.verts:
    moss = lerp(0.0, 1.0, (v.normal.z - 0.25) / 0.45) * lerp(0.0, 1.0, (v.co.z - 0.2) / 0.3) * (0.7 + 0.6 * noise.noise(v.co * 1.7))
    k = lerp(0.42, 1.0, (v.co.z + 0.05) / 0.35) * lerp(0.55, 1.0, (v.normal.z + 0.6) / 0.8) * (0.85 + 0.3 * noise.noise(v.co * 2.3 + Vector((5, 0, 0))))
    rocks.colors[v] = tuple(k * lerp(g, m_, moss) for g, m_ in zip((0.9, 0.92, 0.95), (0.62, 0.95, 0.38)))
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


def card(part, base, tip_dir, length, droop, roll, colors):
    """A branch card (the branch texture, trunk end at u=0) from base, `length` along the horizontal tip_dir, its tip `droop` lower
    on a curve, turned `roll` radians about its own length so it shows from the side too. colors: at the trunk and at the tip."""
    side = Vector((-tip_dir.y, tip_dir.x, 0)) * (length * 0.25)
    axis = (tip_dir * length - Vector((0, 0, droop))).normalized()
    side = side * math.cos(roll) + axis.cross(side) * math.sin(roll)
    rows = []
    for t in (0.0, 0.5, 1.0):
        p = base + tip_dir * (length * t) - Vector((0, 0, droop * t ** 1.6))
        c = tuple(a + (b - a) * t for a, b in zip(*colors))
        rows.append(tree_ring(part, [p - side, p + side], [c, c]))
    for i, t in enumerate((0.0, 0.5)):
        f = part.bm.faces.new([rows[i][0], rows[i + 1][0], rows[i + 1][1], rows[i][1]])
        f.material_index = part.slot(FOLIAGE_CARD)
        part.face_uv[f] = [(t, 0.0), (t + 0.5, 0.0), (t + 0.5, 1.0), (t, 1.0)]


def tiers(part, x, y, z0, h, seed, bare, n, spread, flat, notch, wander, trunk_top=0.1, cards=None):
    """A tree as stacked, ragged skirts of foliage on a bare lower trunk: `bare` of the height is trunk, `n` skirts above it,
    `spread` their reach (of the height), `flat` how shallow each is, `notch` how deep the ragged edge cuts back (0..1) and
    `wander` how far a skirt strays off the trunk (of its reach). The outline is lopsided, and thins towards the tip.
    With `cards` (a part), the skirts shrink to a dark core and each carries a ring of drooping branch cards out to its full reach."""
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
        sh = (lean[0] * (zb - z0) / h + r.normal(0, wander * R), lean[1] * (zb - z0) / h + r.normal(0, wander * R))
        if cards:
            g = tone * (0.8 + 0.55 * t)
            nb = int(np.clip(5 + R * 1.6, 6, 11))
            for i in range(nb):
                a = r.uniform(0, 6.28) if t > 0.8 else 2 * math.pi * (i + r.uniform(-0.3, 0.3)) / nb
                card(cards, Vector((x + sh[0], y + sh[1], zb + th * 0.25)), Vector((math.cos(a), math.sin(a), 0)), R * r.uniform(0.85, 1.15),
                     th * r.uniform(0.6, 1.1), r.uniform(-0.9, 0.9), (tint(TREE, 0.45 * g, hue), tint(TREE, 1.45 * g * r.uniform(0.85, 1.15), hue)))
            R *= 0.5
            tone_k = 0.7
        else:
            tone_k = 1.0
        m = int(np.clip(10 + R * 2.0, 12, 20))
        a0 = r.uniform(0, 6.28)
        pts, topc, botc = [], [], []
        for i in range(m):
            a = a0 + 2 * math.pi * i / m + r.normal(0, 0.08)
            body = 1 + 0.22 * math.sin(2 * a + ph1) + 0.12 * math.sin(3 * a + ph2)
            rr = R * body * (r.uniform(0.9, 1.15) if i % 2 else r.uniform(notch, notch + 0.25))
            pts.append((x + sh[0] + rr * math.cos(a), y + sh[1] + rr * math.sin(a), zb - th * (0.15 + 0.55 * rr / R) + r.normal(0, 0.1 * th)))
            g = tone * tone_k * (0.8 + 0.55 * t) * r.uniform(0.8, 1.2)
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


def spruce(part, x, y, z0, h, seed, cards=None):
    r = np.random.default_rng(seed + 1)
    tiers(part, x, y, z0, h, seed, r.uniform(0.08, 0.2), int(9 + h / 6 + r.integers(0, 3)), r.uniform(0.11, 0.17), 0.14, 0.35, 0.08, cards=cards)


def fir(part, x, y, z0, h, seed, cards=None):
    """A broader fir: fewer, deeper skirts that droop further and stray a little off the trunk."""
    r = np.random.default_rng(seed + 1)
    tiers(part, x, y, z0, h, seed, r.uniform(0.1, 0.25), int(7 + h / 7 + r.integers(0, 3)), r.uniform(0.17, 0.23), 0.2, 0.45, 0.18, cards=cards)


trees = Part('trees', 0.0, smooth=181, uv=False)  # smooth all the way, so the vertices are shared and the file stays small
tree_cards = Part('trees_cards', 0.0, smooth=181, uv=False)  # the near trees' branches (uvs by hand)
NEAR = 70.0  # trees nearer the House than this (metres, centre to trunk) get branch cards; beyond it the fog leaves only their shape
tr = np.random.default_rng(23)
placed = []


def plant(x, y, h, kind=None):
    if abs(x) < 12.5 and y < YW + 3.5:
        return  # the House and its plinth
    z = land_height(x, y)
    if z < 0.0 or y < shore(x) + 2.0:
        return
    seed = len(placed) + 100
    kind = kind or tr.choice(['spruce', 'fir'], p=[0.65, 0.35])
    {'spruce': spruce, 'fir': fir}[kind](trees, x, y, z - 0.4, h, seed, tree_cards if math.hypot(x, y - 6) < NEAR else None)
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
print('trees:', len(placed), 'with cards:', sum(math.hypot(x, y - 6) < NEAR for x, y, h in placed), 'card vertices:', len(tree_cards.bm.verts))
trees.build()
tree_cards.build()

# --- grasses: tufts of thin blades, unlit like the trees (vertex colours), in the planter and along the shore by the plinth
grass = Part('trees_grass', 0.0, smooth=181, uv=False)
gr = np.random.default_rng(41)


def tuft(x, y, z, h, n=26):
    for _ in range(n):
        a, lean = gr.uniform(0, 6.28), gr.uniform(0.15, 0.6)
        hh = h * gr.uniform(0.6, 1.1)
        w = 0.012 + 0.01 * gr.random()
        bx, by = x + gr.normal(0, 0.06), y + gr.normal(0, 0.06)
        tx, ty = bx + math.cos(a) * lean * hh, by + math.sin(a) * lean * hh
        straw = gr.random() < 0.3  # some blades gone straw-coloured
        base = (0.012, 0.016, 0.01)
        tip = (0.09, 0.075, 0.035) if straw else (0.035, 0.05, 0.025)
        vs = tree_ring(grass, [(bx - w * math.sin(a), by + w * math.cos(a), z), (bx + w * math.sin(a), by - w * math.cos(a), z), (tx, ty, z + hh)], [base, base, tip])
        f = grass.bm.faces.new(vs)
        f.material_index = grass.slot(FOLIAGE)


for i in range(7):
    tuft(7.7 + i * 0.38 + gr.normal(0, 0.05), -2.8 + gr.normal(0, 0.18), TERR + 0.4, 0.75)
for _ in range(22):
    x = gr.uniform(10.7, 15.0)
    y = gr.uniform(shore(x) + 0.2, shore(x) + 4.0)
    if y < YW + 0.5:
        tuft(x, y, land_height(x, y) - 0.05, gr.uniform(0.5, 0.95), 20)
for _ in range(14):
    x = gr.uniform(-15.0, -10.7)
    y = gr.uniform(shore(x) + 0.2, shore(x) + 3.5)
    tuft(x, y, land_height(x, y) - 0.05, gr.uniform(0.45, 0.8), 18)
grass.build()

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

bake_objs = [o for o in scene.objects if o.type == 'MESH' and o not in ROOM_OBJS and not o.name.startswith(('glass_', 'glow_', 'trees', 'rocks', 'bake_'))]
def select(objs):
    for o in scene.objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def lightmap_uvs(objs):
    """A second UV set, 'lightmap', laid out over these objects together: one lighting texture's worth."""
    for o in objs:
        uvs = o.data.uv_layers
        lm = uvs.new(name='lightmap')
        uvs.active = lm
    select(objs)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode='OBJECT')
    # Texel density per object: the lawn and the roof, which are seen from far away, get fewer texels than the rooms.
    for o in objs:
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
    for o in objs:  # how big a texel of the lighting texture is on each object (centimetres)
        m = o.data
        m.calc_loop_triangles()
        uv = np.empty(len(m.loops) * 2, np.float32)
        m.uv_layers['lightmap'].data.foreach_get('uv', uv)
        uv = uv.reshape(-1, 2)
        ua = sum(abs(np.cross(uv[t.loops[1]] - uv[t.loops[0]], uv[t.loops[2]] - uv[t.loops[0]])) / 2 for t in m.loop_triangles)
        ma = sum(t.area for t in m.loop_triangles)
        print('texel %-18s %5.1f cm' % (o.name, 100 * math.sqrt(ma / max(ua * LIGHT_RES ** 2, 1e-9))))


lightmap_uvs(bake_objs)

# Overcast dusk: a soft, cool sky (a CC0 HDRI, white-balanced cooler) and the warm lamps of the House (LAMP and STRIP).
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

baked = set()


def lightmap_image(name):
    i = bpy.data.images.new(name, LIGHT_RES, LIGHT_RES, alpha=False, float_buffer=True)
    i.colorspace_settings.name = 'Non-Color'
    return i


def bake_into(objs, image):
    """Bakes the light falling on these objects into `image`, through their lighting UV set."""
    for m in {m for o in objs for m in o.data.materials}:
        n = m.node_tree.nodes.get('bake') or m.node_tree.nodes.new('ShaderNodeTexImage')
        n.name, n.image = 'bake', image
        m.node_tree.nodes.active = n
        baked.add(m)
    select(objs)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=12, margin_type='EXTEND', use_clear=True)
    px = np.empty(len(image.pixels), np.float32)
    image.pixels.foreach_get(px)
    assert px.reshape(-1, 4)[:, :3].max() > 0, f'{image.name} baked black: Cycles failed (out of GPU memory?)'  # Cycles only logs it


# Each Room bakes into its own lighting texture, in the same light, with its door open (the page takes the door away once the
# Room is in). Its ceiling panels (glow_<slug>_panels) light it by day; at night they are dimmed and its lamps and screens lead.
room_targets = {slug: [o for o in objs if o.type == 'MESH' and not o.name.startswith(('glow_', 'screen_', 'glass_'))] for slug, objs in ROOMS.items() if not ONLY or slug in ONLY}
for targets in room_targets.values():
    lightmap_uvs(targets)


def bake_all(suffix):
    house_img = None if ONLY else lightmap_image('lightmap' + suffix)
    if house_img:
        bake_into(bake_objs, house_img)
    imgs = {}
    for slug, targets in room_targets.items():
        door = bpy.data.objects[f'door_{slug}']
        door.hide_render = True
        imgs[slug] = lightmap_image(f'lightmap_{slug}{suffix}')
        bake_into(targets, imgs[slug])
        door.hide_render = False
    return house_img, imgs


img, room_imgs = bake_all('')
# Night: no bright sky, only a faint cool glow in the overcast; the House's lamps stay on and the Rooms' panels are dimmed
# (room.js NIGHT.panels must match).
NIGHT_SKY = float(os.environ.get('NIGHT_SKY', 0.04))  # of the day sky's radiance
gain.inputs[7].default_value = (*(SKY_LEVEL * NIGHT_SKY * np.array((0.7, 0.85, 1.25)) / sky_mean), 1)
panels = [(m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'], m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value) for m in materials.values() if m.get('panel')]
NIGHT_PANELS = 0.3  # of their day strength
for strength, day in panels:
    strength.default_value = day * NIGHT_PANELS
img_night, room_imgs_night = bake_all('_night')
for strength, day in panels:  # the glb carries the day's
    strength.default_value = day
select(bake_objs)

for o in glass_users:
    o.data.materials[0] = GLASS
for m in baked:
    m.node_tree.nodes.remove(m.node_tree.nodes['bake'])

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
    length = M('ADD', 1.0, M('MULTIPLY', noise((0.7, 0.7, 0.3), 2, 5.0), 4.5))            # how far each runs from its ledge
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
    algae = M('MULTIPLY', M('DIVIDE', M('ADD', M('SUBTRACT', 0.42, z.outputs['Z']), M('MULTIPLY', M('SUBTRACT', noise((2.5, 2.5, 4.0), 4, 23.0), 0.5), 0.45)), 0.4, clamp=True),
               M('MULTIPLY', M('SUBTRACT', 1.0, M('ABSOLUTE', nz_.outputs['Z'])), 3.0, clamp=True))  # green slime low on the plinth's walls, blotchy
    col = new('ShaderNodeCombineColor')
    put(col.inputs['Red'], damp)
    put(col.inputs['Green'], wear)
    put(col.inputs['Blue'], algae)
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
if not ONLY:
    bpy.ops.object.bake(type='EMIT', margin=12, margin_type='EXTEND', use_clear=True)
for o, ms in originals.items():
    for i, m in enumerate(ms):
        o.data.materials[i] = m

# Store irradiance for three: the baked value is a white surface's radiance (E / pi); keep it linear in 8 bits as sRGB.
# Damp concrete is darker and a worn corner paler, so that goes in here; the wet map is the concrete's roughness.
def pixels(image):
    px = np.empty(LIGHT_RES * LIGHT_RES * 4, np.float32)
    image.pixels.foreach_get(px)
    return px.reshape(LIGHT_RES, LIGHT_RES, 4)


def encode(rgb):
    v = np.clip(rgb / LIGHT_RANGE, 0, 1)
    v = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
    return np.round(v * 255).astype(np.uint8)[::-1]  # Blender's rows run bottom to top; images run top to bottom


def png(path, a):
    h, w, _ = a.shape
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


out_dir = os.path.dirname(out_glb)
if not ONLY:  # the House
    damp, wear, algae = (pixels(mimg)[:, :, i] for i in (0, 1, 2))
    print('damp: mean %.3f on concrete %.3f; wear mean %.4f' % (damp.mean(), damp[damp > 0.01].mean() if (damp > 0.01).any() else 0, wear.mean()))
    for image, path in ((img, out_light), (img_night, os.path.join(out_dir, 'house-light-night-raw.png'))):
        rgb = pixels(image)[:, :, :3]
        print('%s: mean %.3f p99 %.3f max %.3f' % (image.name, rgb.mean(), np.percentile(rgb, 99), rgb.max()))
        rgb = rgb * (1 - np.array((0.56, 0.53, 0.56)) * damp[:, :, None]) * (1 + 0.22 * wear[:, :, None])
        rgb = rgb * (1 - np.array((0.55, 0.3, 0.62)) * algae[:, :, None])  # the waterline's algae: darker, and green
        png(path, encode(rgb))
    wet = np.clip(0.9 - 0.52 * damp, 0, 1)  # roughness: 0.9 dry, 0.38 where it is damp
    png(out_wet, np.repeat(np.round(wet * 255).astype(np.uint8)[:, :, None], 3, 2)[::-1])
for suffix, imgs in (('', room_imgs), ('-night', room_imgs_night)):  # a Room's lighting textures: irradiance as for the House, without the weather
    for slug, rimg in imgs.items():
        rgb = pixels(rimg)[:, :, :3]
        print('room %s%s lightmap: mean %.3f p99 %.3f' % (slug, suffix, rgb.mean(), np.percentile(rgb, 99)))
        png(os.path.join(out_dir, f'room-{slug}-light{suffix}-raw.png'), encode(rgb))
if os.environ.get('HOUSE_MASK_PNG'):  # to look at where it is damp (red) and worn (green)
    png(os.environ['HOUSE_MASK_PNG'], np.round(np.clip(np.stack([damp, wear, np.zeros_like(damp)], 2), 0, 1) * 255).astype(np.uint8)[::-1])

# ---------------------------------------------------------------- export

bpy.data.objects.remove(water)
bpy.ops.object.select_all(action='DESELECT')
for o in list(scene.objects):
    if o.type in ('LIGHT',):
        bpy.data.objects.remove(o)



def export(path, objs):
    select(objs)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_image_format='WEBP', export_image_quality=82, export_texcoords=True,
                              export_normals=True, export_vertex_color='ACTIVE', export_materials='EXPORT', export_apply=True, export_cameras=False,
                              export_lights=False)


if not ONLY:
    export(out_glb, [o for o in scene.objects if o not in ROOM_OBJS])
for slug, objs in ((k, v) for k, v in ROOMS.items() if k in room_targets):  # beside house.glb: room-<slug>-raw.glb
    export(os.path.join(os.path.dirname(out_glb), f'room-{slug}-raw.glb'), objs)
