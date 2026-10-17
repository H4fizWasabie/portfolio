# Builds the Workshop diorama and exports it as workshop.glb.
# Run through build.sh, which also compresses the export with gltfpack.
#
# Conventions the page relies on (workshop/main.js):
#   obj_<slug>      empty grouping everything that belongs to a project (selectable)
#   screen_<slug>   plane with upright UVs, textured with a real screenshot by the page
#   glass_*         transparent, never casts shadows
#   glow_*          emissive parts that brighten in night mode
#   lamp_head       where the page puts the desk-lamp light
# Ambient occlusion is baked into vertex colours with Cycles so the clay reads as lit
# without shipping lightmap textures.
import math
import sys

import bmesh
import bpy
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

materials = {}


def mat(hexcolor, rough=0.85, metal=0.0, alpha=1.0, emit=0.0):
    key = (hexcolor, rough, metal, alpha, emit)
    if key in materials:
        return materials[key]
    m = bpy.data.materials.new(f'm_{hexcolor}_{rough}_{metal}_{alpha}_{emit}')
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    rgb = [int(hexcolor[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c ** 2.2 for c in rgb] + [1]
    bsdf.inputs['Base Color'].default_value = lin
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if emit:
        bsdf.inputs['Emission Color'].default_value = lin
        bsdf.inputs['Emission Strength'].default_value = emit
    materials[key] = m
    return m


def finish(o, material, parent, bevel, cuts=0, cull=()):
    if cuts:
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.subdivide(number_cuts=cuts)
        bpy.ops.object.mode_set(mode='OBJECT')
    if cull:  # faces the camera can never see (it stays in front of the room) are not shipped
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if any(f.normal.dot(Vector(n)) > 0.9 for n in cull)], context='FACES')
        bm.to_mesh(o.data)
        bm.free()
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
    bpy.ops.object.shade_smooth_by_angle()
    o.parent = parent
    return o


def M(spec):
    return spec if isinstance(spec, bpy.types.Material) else mat(spec)


def box(name, size, loc, material, parent=None, rot=(0, 0, 0), bevel=0.015, cuts=0, cull=()):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, M(material), parent, bevel, cuts, cull)


def cyl(name, r, depth, loc, material, parent=None, rot=(0, 0, 0), verts=32, bevel=0.008, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.object
    o.name = name
    return finish(o, M(material), parent, bevel)


def rod(name, a, b, r, material, parent=None, verts=12):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = cyl(name, r, d.length, (a + b) / 2, material, parent, verts=verts, bevel=0)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return o


def sphere(name, r, loc, material, parent=None, scale=(1, 1, 1), rot=(0, 0, 0), seg=(24, 12)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, rotation=rot, segments=seg[0], ring_count=seg[1])
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o, M(material), parent, 0)


def screen(slug, w, h, loc, parent):
    # A plane rotated +90deg about X faces -Y (towards the viewer) with upright UVs.
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=(math.pi / 2, 0, 0))
    o = bpy.context.object
    o.name = f'screen_{slug}'
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat('1d2025', 0.3))
    o.parent = parent
    return o


def group(name, loc, rz=0.0, parent=None, rot=None):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.rotation_euler = rot or (0, 0, rz)
    scene.collection.objects.link(e)
    e.parent = parent
    return e


# Palette: pale oak floor, soft white walls, warm desk, matte graphite metal.
WALL, WALL_SIDE, TRIM = 'e7e9e4', 'dde1db', 'f3f3ef'
FLOOR, RUG = 'd8cbb4', 'b7c2bd'
OAK = 'c9a57f'
METAL = mat('3b4149', 0.4, 0.6)
STEEL = mat('9aa1a8', 0.35, 0.7)
WHITE, PALE, INK = 'eff0ec', 'd9ddd7', '2a2f36'
CARD, CARD_DARK, TAPE = 'c9a67b', 'b8956b', 'd8bf95'
GLASS = mat('b9cfd6', 0.08, 0.0, alpha=0.22)
LABEL = 'f7f6f1'

# Room: floor, back wall and a left wall with a window.
room = group('room', (0, 0, 0))
BOTTOM, BACK, LEFT, RIGHT = (0, 0, -1), (0, 1, 0), (-1, 0, 0), (1, 0, 0)
box('floor', (8.4, 6.4, 0.2), (0, 0, -0.1), FLOOR, room, bevel=0, cuts=30, cull=(BOTTOM, BACK, LEFT, RIGHT))
box('wall_back', (8.4, 0.2, 3.6), (0, 3.1, 1.8), WALL, room, bevel=0, cuts=16, cull=(BOTTOM, BACK, LEFT, RIGHT))
win_y0, win_y1, win_z0, win_z1 = 0.25, 2.05, 1.0, 2.65
for name, ys, zs in [('wall_left_low', (-3.2, 3.2), (0, win_z0)), ('wall_left_high', (-3.2, 3.2), (win_z1, 3.6)),
                     ('wall_left_front', (-3.2, win_y0), (win_z0, win_z1)), ('wall_left_back', (win_y1, 3.2), (win_z0, win_z1))]:
    box(name, (0.2, ys[1] - ys[0], zs[1] - zs[0]), (-4.1, sum(ys) / 2, sum(zs) / 2), WALL_SIDE, room, bevel=0, cuts=8, cull=(LEFT,))
box('skirting_back', (8.2, 0.03, 0.1), (0, 2.985, 0.05), TRIM, room, bevel=0)
box('skirting_left', (0.03, 6.2, 0.1), (-3.985, 0, 0.05), TRIM, room, bevel=0)
box('rug', (3.4, 2.5, 0.02), (0.4, 0.55, 0.011), RUG, room, bevel=0.008, cuts=12)

window = group('window', (-4.0, (win_y0 + win_y1) / 2, (win_z0 + win_z1) / 2), parent=room)
ww, wh = win_y1 - win_y0, win_z1 - win_z0
for name, size, loc in [('frame_top', (0.12, ww + 0.12, 0.07), (0, 0, wh / 2)), ('frame_bottom', (0.12, ww + 0.12, 0.07), (0, 0, -wh / 2)),
                        ('frame_front', (0.12, 0.07, wh), (0, -ww / 2, 0)), ('frame_back', (0.12, 0.07, wh), (0, ww / 2, 0)),
                        ('frame_mid', (0.08, 0.05, wh), (0, 0, 0))]:
    box(name, size, loc, TRIM, window, bevel=0.01)
box('sill', (0.24, ww + 0.3, 0.05), (0.08, 0, -wh / 2 - 0.04), TRIM, window, bevel=0.01)
box('glass_window', (0.01, ww, wh), (-0.02, 0, 0), GLASS, window, bevel=0)
for i in range(9):  # blinds, half drawn
    box(f'blind_{i}', (0.09, ww - 0.04, 0.012), (0.09, 0, wh / 2 - 0.08 - i * 0.07), WHITE, window, rot=(0.0, 0.5, 0), bevel=0)
rod('blind_cord', (0.12, ww / 2 - 0.12, wh / 2 - 0.05), (0.12, ww / 2 - 0.12, -0.2), 0.004, PALE, window, verts=6)

# Desk along the back wall.
desk = group('desk', (0.6, 2.3, 0))
box('desk_top', (4.2, 1.1, 0.06), (0, 0, 1.0), OAK, desk, bevel=0.012, cuts=8)
for i, (x, y) in enumerate([(-2.0, -0.47), (2.0, -0.47), (-2.0, 0.47), (2.0, 0.47)]):
    box(f'desk_leg{i}', (0.05, 0.05, 0.97), (x, y, 0.485), METAL, desk, bevel=0.008)
for x in (-2.0, 2.0):
    box(f'desk_foot{x}', (0.05, 0.99, 0.04), (x, 0, 0.02), METAL, desk, bevel=0.008)
box('desk_rail', (4.0, 0.03, 0.08), (0, 0.47, 0.9), METAL, desk, bevel=0.005)

# Office chair.
chair = group('chair', (0.55, 1.35, 0), rz=0.25)
for i in range(5):
    a = i * 2 * math.pi / 5
    rod(f'chair_spoke{i}', (0, 0, 0.1), (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.07), 0.022, METAL, chair)
    sphere(f'chair_wheel{i}', 0.035, (math.cos(a) * 0.3, math.sin(a) * 0.3, 0.035), INK, chair)
cyl('chair_lift', 0.03, 0.42, (0, 0, 0.32), STEEL, chair, verts=16, bevel=0)
box('chair_seat', (0.52, 0.5, 0.09), (0, 0, 0.56), '56616d', chair, bevel=0.04)
rod('chair_spine', (0, 0.22, 0.52), (0, 0.27, 0.95), 0.02, METAL, chair)
box('chair_back', (0.48, 0.07, 0.5), (0, 0.29, 1.02), '56616d', chair, rot=(-0.1, 0, 0), bevel=0.035)

# Pinboard and a name sign on the back wall.
board = group('pinboard', (-0.25, 2.975, 2.15))
box('board', (1.6, 0.03, 0.9), (0, 0, 0), 'cdb995', board, bevel=0.01)
for i, (x, z, c, r) in enumerate([(-0.5, 0.17, LABEL, -0.08), (-0.05, 0.22, 'f1e3b6', 0.05), (0.42, 0.14, LABEL, 0.02),
                                  (-0.38, -0.2, 'cfe0e6', 0.06), (0.18, -0.18, LABEL, -0.04)]):
    box(f'note{i}', (0.3, 0.008, 0.28), (x, -0.02, z), c, board, rot=(0, r, 0), bevel=0)
    sphere(f'pin{i}', 0.018, (x, -0.03, z + 0.11), 'c4442e', board)
sign = group('sign', (1.95, 2.975, 2.25))
box('sign_plate', (1.25, 0.04, 0.42), (0, 0, 0), WHITE, sign, bevel=0.015)
bpy.ops.object.text_add(location=(0, -0.025, -0.06), rotation=(math.pi / 2, 0, 0))
txt = bpy.context.object
txt.data.body = 'Hafiz Jamali'
txt.data.size = 0.17
txt.data.extrude = 0.008
txt.data.resolution_u = 3
txt.data.align_x = 'CENTER'
bpy.ops.object.convert(target='MESH')
txt.name = 'sign_text'
txt.data.materials.append(mat(INK))
txt.parent = sign

# Theoses: monitor on the desk, keyboard, and the home server under the desk.
theoses = group('obj_theoses', (0.45, 2.5, 1.03))
box('mon_foot', (0.42, 0.26, 0.018), (0, 0.06, 0.009), STEEL, theoses, bevel=0.008)
box('mon_arm', (0.06, 0.04, 0.42), (0, 0.11, 0.22), STEEL, theoses, bevel=0.01)
box('mon_panel', (1.5, 0.035, 0.88), (0, 0.06, 0.68), INK, theoses, bevel=0.012)
screen('theoses', 1.46, 1.46 * 860 / 1360, (0, 0.0415, 0.68), theoses)
box('keyboard', (0.84, 0.26, 0.025), (0, -0.46, 0.013), WHITE, theoses, bevel=0.01)
for r in range(4):
    box(f'keys{r}', (0.78, 0.045, 0.006), (0, -0.54 + r * 0.055, 0.028), PALE, theoses, bevel=0)
box('mouse', (0.07, 0.11, 0.03), (0.58, -0.45, 0.015), WHITE, theoses, bevel=0.03)
server = group('server', (1.6, -0.05, -1.03), parent=theoses)
box('server_case', (0.3, 0.5, 0.48), (0, 0, 0.24), '3a3f46', server, bevel=0.02)
for i in range(5):
    box(f'server_vent{i}', (0.2, 0.005, 0.012), (0, -0.252, 0.36 - i * 0.03), '23272c', server, bevel=0)
box('glow_server', (0.04, 0.006, 0.015), (0.08, -0.253, 0.08), mat('5fd38b', 0.4, emit=2.0), server, bevel=0)

# MAP: phone on a charging stand.
map_ = group('obj_map', (1.5, 2.2, 1.03), rz=-0.4)
cyl('charger', 0.11, 0.025, (0, 0.04, 0.0125), WHITE, map_, bevel=0.008)
box('cradle', (0.22, 0.09, 0.2), (0, 0.06, 0.1), WHITE, map_, rot=(-0.3, 0, 0), bevel=0.03)
tilt = group('phone_tilt', (0, 0.03, 0.04), parent=map_, rot=(-0.28, 0, 0))
box('phone_body', (0.33, 0.03, 0.7), (0, 0, 0.35), INK, tilt, bevel=0.045)
screen('map', 0.3, 0.3 * 2560 / 1152 * 0.98, (0, -0.0155, 0.35), tilt)

# Desk lamp (the night-mode light) and a mug.
lamp = group('lamp', (2.35, 2.6, 1.03), rz=-0.6)
cyl('lamp_base', 0.13, 0.03, (0, 0, 0.015), INK, lamp, bevel=0.008)
rod('lamp_arm1', (0, 0, 0.03), (0.0, -0.12, 0.62), 0.015, INK, lamp)
rod('lamp_arm2', (0.0, -0.12, 0.62), (0.0, -0.5, 0.72), 0.015, INK, lamp)
head = group('lamp_head', (0.0, -0.55, 0.69), parent=lamp, rot=(0.5, 0, 0))
cyl('lamp_shade', 0.13, 0.16, (0, 0, 0), INK, head, verts=24, r2=0.05)
sphere('glow_bulb', 0.04, (0, 0, -0.06), mat('fff1d6', 0.3, emit=1.5), head)
mug = group('mug', (-0.35, 2.0, 1.03))
cyl('mug_body', 0.055, 0.11, (0, 0, 0.055), '3d5bd6', mug, bevel=0.006)
bpy.ops.mesh.primitive_torus_add(major_radius=0.035, minor_radius=0.01, location=(0.065, 0, 0.06), rotation=(math.pi / 2, 0, 0))
finish(bpy.context.object, mat('3d5bd6'), mug, 0).name = 'mug_handle'

# Yen: a small companion robot at the end of the desk.
yen = group('obj_yen', (-1.05, 2.45, 1.03), rz=0.45)
box('yen_body', (0.3, 0.26, 0.2), (0, 0, 0.13), WHITE, yen, bevel=0.07)
yen_head = group('yen_head_pivot', (0, 0, 0.25), parent=yen)
box('yen_head', (0.34, 0.28, 0.24), (0, 0, 0.12), WHITE, yen_head, bevel=0.09)
box('yen_face', (0.26, 0.01, 0.15), (0, -0.142, 0.12), INK, yen_head, bevel=0.04)
eyes = group('yen_eyes', (0, -0.147, 0.125), parent=yen_head)
for x in (-0.06, 0.06):
    sphere(f'glow_yen_eye{x}', 0.028, (x, 0, 0), mat('9fb4ff', 0.3, emit=2.5), eyes, scale=(1, 0.4, 1))
rod('yen_antenna', (0.07, 0, 0.24), (0.09, 0, 0.37), 0.009, PALE, yen_head, verts=8)
sphere('yen_tip', 0.026, (0.09, 0, 0.385), '3d5bd6', yen_head)
for side, x in (('l', -0.165), ('r', 0.165)):
    arm = group(f'yen_arm_{side}', (x, 0, 0.2), parent=yen)
    box(f'yen_arm_{side}_mesh', (0.05, 0.07, 0.14), (0, 0, -0.06), WHITE, arm, bevel=0.022)
for x in (-0.09, 0.09):
    cyl(f'yen_wheel{x}', 0.05, 0.04, (x, 0, 0.05), INK, yen, rot=(0, math.pi / 2, 0), bevel=0.01)

# DD Drugs Register: a locked drug safe with the register and a pen on top.
dd = group('obj_dd-drugs-register', (-2.6, 2.4, 0), rz=0.25)
SAFE = mat('8e979e', 0.45, 0.45)
# Panels meet without overlapping, so the baked lighting does not read their joins as shadow.
for x in (-0.345, 0.345):
    box(f'safe_side{x}', (0.05, 0.66, 0.78), (x, 0, 0.39), SAFE, dd, bevel=0.012, cuts=3)
box('safe_top', (0.636, 0.66, 0.05), (0, 0, 0.755), SAFE, dd, bevel=0.008, cuts=3)
box('safe_bottom', (0.636, 0.66, 0.05), (0, 0, 0.025), SAFE, dd, bevel=0.008, cuts=3)
box('safe_back', (0.636, 0.05, 0.676), (0, 0.305, 0.39), SAFE, dd, bevel=0.008, cuts=3)
box('safe_shelf', (0.64, 0.56, 0.02), (0, 0.02, 0.4), mat('7c858c', 0.5, 0.4), dd, bevel=0)
for i, (x, z, c) in enumerate([(-0.18, 0.41, LABEL), (-0.04, 0.41, 'cfe0e6'), (0.12, 0.41, LABEL), (-0.12, 0.05, 'cfe0e6'), (0.08, 0.05, LABEL)]):
    box(f'safe_vials{i}', (0.12, 0.18, 0.14), (x, 0.0, z + 0.07), c, dd, bevel=0.01)
door = group('safe_hinge', (-0.31, -0.335, 0), parent=dd)
box('safe_door', (0.62, 0.02, 0.66), (0.31, 0, 0.39), mat('9aa3aa', 0.4, 0.5), door, bevel=0.012)
cyl('safe_dial', 0.07, 0.03, (0.39, -0.02, 0.47), INK, door, rot=(math.pi / 2, 0, 0), bevel=0.006)
rod('safe_handle', (0.13, -0.025, 0.5), (0.13, -0.025, 0.3), 0.014, STEEL, door)
box('safe_plate', (0.22, 0.004, 0.06), (0.39, -0.012, 0.62), LABEL, door, bevel=0)
box('ledger_cover', (0.5, 0.36, 0.035), (0, 0.02, 0.8), '4d6b5f', dd, rot=(0, 0, 0.12), bevel=0.008)
box('ledger_pages', (0.48, 0.33, 0.025), (0.004, 0.02, 0.8), LABEL, dd, rot=(0, 0, 0.12), bevel=0.004)
rod('pen', (-0.2, -0.22, 0.83), (0.12, -0.26, 0.83), 0.01, INK, dd, verts=10)

# PIMS: a clinic supply cabinet with glass doors and labelled bins.
pims = group('obj_pims', (-3.7, -1.25, 0), rz=math.pi / 2)
for x in (-0.735, 0.735):
    box(f'cab_side{x}', (0.03, 0.55, 1.95), (x, 0.0, 0.975), WHITE, pims, bevel=0.006, cuts=3)
box('cab_top', (1.53, 0.57, 0.04), (0, 0.0, 1.975), WHITE, pims, bevel=0.008, cuts=3)
box('cab_floor', (1.44, 0.55, 0.04), (0, 0.0, 0.12), WHITE, pims, bevel=0.004)
box('cab_back', (1.4, 0.02, 1.85), (0, 0.24, 1.02), PALE, pims, bevel=0)
box('cab_plinth', (1.46, 0.5, 0.1), (0, 0.0, 0.05), '3a3f46', pims, bevel=0.01)
for k, z in enumerate((0.38, 0.86, 1.34, 1.8)):
    box(f'cab_shelf{k}', (1.38, 0.48, 0.025), (0, -0.01, z), PALE, pims, bevel=0)
bins = ['b9d3da', 'e6d6b5', 'cfdcc8']
for k, z in enumerate((0.38, 0.86, 1.34)):
    for b, x in enumerate((-0.44, 0.0, 0.44)):
        h = 0.26 - 0.04 * ((k + b) % 2)
        box(f'bin{k}{b}', (0.38, 0.4, h), (x, -0.02, z + 0.0125 + h / 2), bins[(k + b) % 3], pims, bevel=0.02)
        box(f'bin_label{k}{b}', (0.16, 0.004, 0.05), (x, -0.223, z + 0.0125 + h * 0.55), LABEL, pims, bevel=0)
for side, hx in (('l', -0.71), ('r', 0.71)):
    hinge = group(f'cab_hinge_{side}', (hx, -0.285, 0), parent=pims)
    d = 1 if side == 'l' else -1  # each door reaches from its hinge towards the middle
    box(f'glass_cab_door_{side}', (0.7, 0.012, 1.84), (d * 0.35, 0, 1.02), GLASS, hinge, bevel=0)
    for z in (0.11, 1.93):
        box(f'cab_door_frame_{side}{z}', (0.7, 0.02, 0.04), (d * 0.35, -0.005, z), WHITE, hinge, bevel=0.005)
    rod(f'cab_handle_{side}', (d * 0.665, -0.025, 1.2), (d * 0.665, -0.025, 0.95), 0.008, STEEL, hinge, verts=8)
box('cab_cross_v', (0.06, 0.006, 0.18), (0, -0.276, 1.93 + 0.0), mat('3aa36b'), pims, bevel=0)
box('cab_cross_h', (0.18, 0.006, 0.06), (0, -0.276, 1.93), mat('3aa36b'), pims, bevel=0)

# Procura: a hand trolley of deliveries with a tablet showing the stock screen.
procura = group('obj_procura', (2.6, 0.0, 0), rz=-0.45)
for x in (-0.3, 0.3):
    rod(f'trolley_rail{x}', (x, 0.22, 0.06), (x, 0.3, 1.25), 0.02, METAL, procura)
    cyl(f'trolley_wheel{x}', 0.1, 0.06, (x + (0.05 if x > 0 else -0.05), 0.26, 0.1), INK, procura, rot=(0, math.pi / 2, 0), bevel=0.01)
rod('trolley_grip', (-0.3, 0.3, 1.25), (0.3, 0.3, 1.25), 0.022, METAL, procura)
rod('trolley_axle', (-0.36, 0.26, 0.1), (0.36, 0.26, 0.1), 0.012, STEEL, procura)
box('trolley_nose', (0.66, 0.34, 0.02), (0, 0.05, 0.02), METAL, procura, bevel=0.005)
for i, (w, h, x, rz, c) in enumerate([(0.62, 0.36, 0.0, 0.0, CARD), (0.56, 0.32, 0.02, 0.05, CARD_DARK), (0.5, 0.28, -0.02, -0.06, CARD)]):
    z = [0.03, 0.39, 0.71][i]
    box(f'parcel{i}', (w, 0.4, h), (x, 0.03, z + h / 2), c, procura, rot=(0, 0, rz), bevel=0.012)
    box(f'parcel_tape{i}', (w + 0.004, 0.08, 0.004), (x, 0.03, z + h + 0.001), TAPE, procura, rot=(0, 0, rz), bevel=0)
    box(f'parcel_label{i}', (0.18, 0.004, 0.11), (x - w * 0.18, -0.172, z + h * 0.5), LABEL, procura, rot=(0, 0, rz), bevel=0)
stand = group('tablet_tilt', (0.0, 0.08, 0.99), parent=procura, rot=(-0.45, 0, 0))
box('tablet_body', (0.58, 0.025, 0.4), (0, 0, 0.2), INK, stand, bevel=0.025)
screen('procura', 0.54, 0.54 * 860 / 1360, (0, -0.0135, 0.2), stand)

# 89lab: camera on a tripod aimed at the desk, a ring light and a floor microphone.
lab = group('obj_89lab', (-1.95, -0.35, 0), rz=-0.55)
head_z = 1.35
for i in range(3):
    a = i * 2 * math.pi / 3 + 0.5
    rod(f'tripod_leg{i}', (0, 0, head_z - 0.08), (math.cos(a) * 0.42, math.sin(a) * 0.42, 0.0), 0.016, METAL, lab, verts=10)
rod('tripod_column', (0, 0, head_z - 0.25), (0, 0, head_z), 0.022, METAL, lab, verts=12)
box('camera_body', (0.34, 0.2, 0.22), (0, 0, head_z + 0.13), INK, lab, bevel=0.03)
box('camera_grip', (0.08, 0.2, 0.2), (0.17, -0.0, head_z + 0.13), '22262c', lab, bevel=0.03)
cyl('camera_lens', 0.08, 0.18, (0, 0.18, head_z + 0.12), '22262c', lab, rot=(math.pi / 2, 0, 0), bevel=0.01)
cyl('glass_lens', 0.062, 0.005, (0, 0.273, head_z + 0.12), GLASS, lab, rot=(math.pi / 2, 0, 0), bevel=0)
cyl('ring_base', 0.16, 0.025, (0.6, 0.1, 0.0125), METAL, lab, bevel=0.006)
rod('ring_pole', (0.6, 0.1, 0.02), (0.6, 0.1, 1.38), 0.014, METAL, lab)
bpy.ops.mesh.primitive_torus_add(major_radius=0.26, minor_radius=0.032, location=(0.6, 0.12, 1.62), rotation=(math.pi / 2 - 0.1, 0, 0))
finish(bpy.context.object, mat('fbfaf4', 0.4, emit=1.2), lab, 0).name = 'glow_ring'
cyl('mic_base', 0.13, 0.02, (-0.55, 0.15, 0.01), METAL, lab, bevel=0.005)
rod('mic_pole', (-0.55, 0.15, 0.02), (-0.55, 0.15, 1.05), 0.012, METAL, lab)
rod('mic_boom', (-0.55, 0.15, 1.05), (-0.35, 0.45, 1.18), 0.01, METAL, lab)
cyl('mic_body', 0.035, 0.16, (-0.33, 0.48, 1.18), INK, lab, rot=(1.2, 0, 0.6), verts=16, bevel=0.01)

# Plant to the right of the desk.
plant = group('plant', (3.45, 2.45, 0))
cyl('pot', 0.2, 0.42, (0, 0, 0.21), 'b86a52', plant, verts=32, r2=0.25, bevel=0.01)
cyl('soil', 0.23, 0.02, (0, 0, 0.41), '5a4636', plant, verts=32, bevel=0)
for i in range(9):
    a = i * 2 * math.pi / 9
    tiltv = 0.45 + 0.15 * (i % 3)
    hgt = 0.75 + 0.15 * (i % 4)
    sphere(f'leaf{i}', 0.17, (math.cos(a) * 0.17, math.sin(a) * 0.17, 0.42 + hgt * 0.6), ['5f7f55', '6f9363', '557349'][i % 3],
           plant, scale=(0.45, 0.16, 1.4), rot=(math.sin(a) * tiltv, -math.cos(a) * tiltv, a))

# The room carries on to the right: a reading corner under a framed portrait for the About
# section, and a small writing desk with a phone and a letter tray for Contact. The page flies
# the camera here as the visitor scrolls (room.js: SECTION views). Names the page relies on:
#   screen_portrait   the framed photo, textured by the page
#   floorlamp_head    where the page puts the second night light
#   glow_bulb_floor   dim by day like glow_bulb
box('floor_annex', (7.2, 6.4, 0.2), (7.8, 0, -0.1), FLOOR, room, bevel=0, cuts=18, cull=(BOTTOM, BACK, LEFT))
box('wall_back_annex', (7.2, 0.2, 3.6), (7.8, 3.1, 1.8), WALL, room, bevel=0, cuts=10, cull=(BOTTOM, BACK, LEFT))
box('skirting_back_annex', (7.2, 0.03, 0.1), (7.8, 2.985, 0.05), TRIM, room, bevel=0)
box('rug_annex', (2.6, 1.9, 0.02), (6.2, 1.35, 0.011), 'c9bda6', room, bevel=0.008, cuts=4)

# About: a framed portrait, small frames, a shelf of books and an armchair.
about = group('about', (6.0, 2.975, 0))
box('frame_outer', (1.02, 0.025, 1.27), (0, -0.0125, 1.75), INK, about, bevel=0.01)
box('frame_mat', (0.9, 0.01, 1.15), (0, -0.028, 1.75), LABEL, about, bevel=0)
screen('portrait', 0.72, 0.9, (0, -0.034, 1.75), about)
box('plaque', (0.34, 0.01, 0.07), (0, -0.005, 1.02), WHITE, about, bevel=0)
for i, (z, c) in enumerate([(2.05, 'cfe0e6'), (1.4, 'e6d6b5')]):
    box(f'minor_frame{i}', (0.42, 0.02, 0.52), (-1.0, -0.01, z), INK, about, bevel=0.008)
    box(f'minor_mat{i}', (0.36, 0.008, 0.46), (-1.0, -0.022, z), LABEL, about, bevel=0)
    box(f'minor_art{i}', (0.22, 0.008, 0.26), (-1.0, -0.028, z), c, about, bevel=0)
box('shelf_board', (1.1, 0.22, 0.035), (1.15, -0.11, 1.45), OAK, about, bevel=0.008)
for i, (x, h, c) in enumerate([(-0.4, 0.26, '3d5bd6'), (-0.32, 0.3, 'e6d6b5'), (-0.23, 0.24, '4d6b5f'), (-0.14, 0.28, 'c4442e')]):
    box(f'shelf_book{i}', (0.07, 0.17, h), (1.15 + x, -0.1, 1.4675 + h / 2), c, about, rot=(0, 0, 0), bevel=0.004)
cyl('shelf_pot', 0.07, 0.12, (1.15 + 0.2, -0.1, 1.4675 + 0.06), 'b86a52', about, verts=20, r2=0.085, bevel=0.004)
for i in range(4):
    a = i * math.pi / 2
    sphere(f'shelf_leaf{i}', 0.05, (1.35 + math.cos(a) * 0.04, -0.1 + math.sin(a) * 0.04, 1.4675 + 0.2), '5f7f55', about, scale=(0.5, 0.2, 1.5),
           rot=(math.sin(a) * 0.5, -math.cos(a) * 0.5, a), seg=(10, 6))
box('shelf_frame', (0.4, 0.02, 0.5), (1.15, -0.01, 2.15), INK, about, bevel=0.008)
box('shelf_frame_mat', (0.34, 0.008, 0.44), (1.15, -0.022, 2.15), LABEL, about, bevel=0)
box('shelf_frame_art', (0.2, 0.008, 0.24), (1.15, -0.028, 2.15), 'cdb995', about, bevel=0)

armchair = group('armchair', (5.9, 1.55, 0), rz=0.5)
SAGE, SAGE_LIGHT = '86a097', 'a3b9b0'
for x in (-0.33, 0.33):
    for y in (-0.27, 0.27):
        box(f'chair_leg{x}{y}', (0.05, 0.05, 0.14), (x, y, 0.07), '6b5a48', armchair, bevel=0.006)
    box(f'arm{x}', (0.15, 0.7, 0.36), (x * 1.3, 0.0, 0.34), SAGE, armchair, bevel=0.05)
box('armchair_seat', (0.66, 0.66, 0.2), (0, 0.0, 0.24), SAGE, armchair, bevel=0.04)
box('armchair_cushion', (0.6, 0.58, 0.1), (0, -0.03, 0.39), SAGE_LIGHT, armchair, bevel=0.04)
box('armchair_back', (0.9, 0.16, 0.66), (0, 0.32, 0.5), SAGE, armchair, rot=(-0.14, 0, 0), bevel=0.05)

side = group('sidetable', (6.95, 2.3, 0))
cyl('side_top', 0.24, 0.04, (0, 0, 0.56), OAK, side, verts=32, bevel=0.006)
cyl('side_leg', 0.025, 0.54, (0, 0, 0.27), METAL, side, verts=12, bevel=0)
cyl('side_foot', 0.17, 0.02, (0, 0, 0.01), METAL, side, verts=24, bevel=0.005)
for i, (w, c, rz) in enumerate([(0.3, '4d6b5f', 0.2), (0.27, 'e6d6b5', -0.15), (0.24, '3d5bd6', 0.1)]):
    box(f'side_book{i}', (w, 0.2, 0.04), (0.0, 0.0, 0.58 + 0.02 + i * 0.04), c, side, rot=(0, 0, rz), bevel=0.004)
cup = group('side_mug', (0.0, 0.0, 0.7), parent=side)
cyl('side_mug_body', 0.045, 0.09, (0, 0, 0.045), 'f1e3b6', cup, bevel=0.005)

floorlamp = group('floorlamp', (7.6, 2.55, 0))
cyl('floorlamp_base', 0.16, 0.03, (0, 0, 0.015), INK, floorlamp, verts=24, bevel=0.006)
rod('floorlamp_pole', (0, 0, 0.03), (0, 0, 1.5), 0.016, INK, floorlamp)
cyl('floorlamp_shade', 0.2, 0.3, (0, 0, 1.62), 'f1e3b6', floorlamp, verts=24, r2=0.14, bevel=0.005)
sphere('glow_bulb_floor', 0.05, (0, 0, 1.62), mat('fff1d6', 0.3, emit=1.5), floorlamp, seg=(14, 8))
group('floorlamp_head', (0, 0, 1.62), parent=floorlamp)

# Contact: a writing desk with a phone, a letter tray and a mailbox on the wall above it.
cdesk = group('contact_desk', (9.4, 2.5, 0))
box('cdesk_top', (1.7, 0.8, 0.05), (0, 0, 0.95), OAK, cdesk, bevel=0.012, cuts=4)
for x, y in [(-0.8, -0.34), (0.8, -0.34), (-0.8, 0.34), (0.8, 0.34)]:
    box(f'cdesk_leg{x}{y}', (0.05, 0.05, 0.925), (x, y, 0.4625), METAL, cdesk, bevel=0.006)
box('cdesk_rail', (1.6, 0.03, 0.08), (0, 0.34, 0.85), METAL, cdesk, bevel=0.005)
RED = 'c4442e'
phone = group('desk_phone', (-0.45, -0.02, 0.975), parent=cdesk, rz=0.25)
box('phone_base', (0.3, 0.24, 0.08), (0, 0, 0.04), RED, phone, bevel=0.03)
cyl('phone_dial', 0.065, 0.012, (0, -0.05, 0.088), 'f7f6f1', phone, verts=24, bevel=0.002)
box('phone_cradle_l', (0.05, 0.05, 0.05), (-0.11, 0.05, 0.105), RED, phone, bevel=0.01)
box('phone_cradle_r', (0.05, 0.05, 0.05), (0.11, 0.05, 0.105), RED, phone, bevel=0.01)
box('handset_mid', (0.3, 0.05, 0.035), (0, 0.05, 0.14), RED, phone, bevel=0.015)
box('handset_ear', (0.085, 0.075, 0.06), (-0.13, 0.05, 0.12), RED, phone, bevel=0.025)
box('handset_mouth', (0.085, 0.075, 0.06), (0.13, 0.05, 0.12), RED, phone, bevel=0.025)
rod('phone_cord', (0.14, 0.1, 0.03), (0.3, 0.3, 0.012), 0.008, INK, phone, verts=6)
tray = group('letter_tray', (0.25, 0.1, 0.975), parent=cdesk, rz=-0.1)
for k in range(2):
    z = 0.015 + k * 0.17
    box(f'tray_floor{k}', (0.36, 0.28, 0.02), (0, 0, z), METAL, tray, bevel=0.004)
    box(f'tray_back{k}', (0.36, 0.02, 0.1), (0, 0.13, z + 0.05), METAL, tray, bevel=0.004)
    for x in (-0.17, 0.17):
        box(f'tray_side{k}{x}', (0.02, 0.28, 0.1), (x, 0, z + 0.05), METAL, tray, bevel=0.004)
    for j in range(3 - k):
        box(f'envelope{k}{j}', (0.3, 0.2, 0.012), (0.005 * j, 0.0, z + 0.016 + j * 0.013), ['f7f6f1', 'ede2c8', 'dfe8e6'][(j + k) % 3], tray, rot=(0, 0, 0.05 * (j - 1)), bevel=0)
for k in range(2):
    box(f'tray_post{k}', (0.02, 0.02, 0.17), (-0.17 if k else 0.17, 0.13, 0.095), METAL, tray, bevel=0.004)
box('envelope_front', (0.3, 0.2, 0.008), (-0.1, -0.25, 0.979), 'f7f6f1', cdesk, rot=(0, 0, 0.35), bevel=0)
box('envelope_flap', (0.3, 0.1, 0.01), (-0.1, -0.2, 0.983), 'ede2c8', cdesk, rot=(0, 0, 0.35), bevel=0)
sphere('envelope_seal', 0.022, (-0.115, -0.265, 0.985), RED, cdesk, scale=(1, 1, 0.5), seg=(12, 6))
pens = group('pen_cup', (0.7, 0.18, 0.975), parent=cdesk)
cyl('pen_cup_body', 0.05, 0.1, (0, 0, 0.05), '3d5bd6', pens, bevel=0.004)
rod('pen_a', (0, 0, 0.06), (0.02, 0.01, 0.2), 0.008, INK, pens, verts=8)
rod('pen_b', (0, 0, 0.06), (-0.03, 0.0, 0.18), 0.008, RED, pens, verts=8)
mailbox = group('mailbox', (0.0, 0.0, 1.8), parent=cdesk)
box('mailbox_body', (0.5, 0.14, 0.32), (0, 0.46, 0), '3d5bd6', mailbox, bevel=0.04)
box('mailbox_slot', (0.32, 0.006, 0.03), (0, 0.386, 0.06), '1f2a66', mailbox, bevel=0)
box('mailbox_flag', (0.04, 0.02, 0.14), (0.28, 0.46, 0.0), RED, mailbox, bevel=0.006)
box('mailbox_letter', (0.26, 0.012, 0.18), (0, 0.375, 0.02), 'f7f6f1', mailbox, rot=(0, 0, 0.1), bevel=0)
stool = group('stool', (9.0, 1.5, 0))
cyl('stool_seat', 0.22, 0.06, (0, 0, 0.58), '6b5a48', stool, verts=32, bevel=0.012)
for i in range(3):
    a = i * 2 * math.pi / 3 + 0.4
    rod(f'stool_leg{i}', (math.cos(a) * 0.15, math.sin(a) * 0.15, 0.56), (math.cos(a) * 0.26, math.sin(a) * 0.26, 0.0), 0.016, METAL, stool, verts=8)
box('stool_ring', (0.3, 0.3, 0.012), (0, 0, 0.25), METAL, stool, bevel=0)

# Apply modifiers, then bake ambient occlusion into a colour attribute on every mesh.
meshes = [o for o in scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.convert(target='MESH')
for o in meshes:
    o.data.color_attributes.new('Color', 'BYTE_COLOR', 'CORNER')
    o.data.color_attributes.active_color_name = 'Color'

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 96
scene.world = bpy.data.worlds.new('w')
scene.world.light_settings.distance = 0.55
glass = [o for o in meshes if o.name.startswith(('glass_', 'screen_', 'glow_'))]
for o in glass:
    o.hide_render = True  # glass, screens and lights do not occlude
bake = [o for o in meshes if o not in glass]
bpy.ops.object.select_all(action='DESELECT')
for o in bake:
    o.select_set(True)
bpy.context.view_layer.objects.active = bake[0]
# Bake with the doors open: their inner faces and the shelves behind them get seen open.
openings = {'safe_hinge': -1.75, 'cab_hinge_l': -1.9, 'cab_hinge_r': 1.9}
for name, angle in openings.items():
    scene.objects[name].rotation_euler[2] = angle
bpy.context.view_layer.update()
bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
for name in openings:
    scene.objects[name].rotation_euler[2] = 0
for o in glass:
    o.hide_render = False
    o.data.color_attributes.remove(o.data.color_attributes['Color'])

for o in meshes:  # only screens need texture coordinates
    if not o.name.startswith('screen_'):
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_vertex_color='ACTIVE')
print('exported', out, len(meshes), 'meshes')
