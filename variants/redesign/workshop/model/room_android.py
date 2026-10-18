# The Android Room (#113): a lounge corner behind the House's upstairs doorway_android, over the records Room in the rear wing.
# Run by build_house.py like room_stock.py (whose materials it shares), baked into its own lighting texture and exported as
# room-android.glb. Warm and everyday: plaster walls, oak boards, a rug, an armchair under a floor lamp, a bookcase, a print.
# Its objects:
#   obj_map             the side table by the armchair with MAP on its phone stand (screen_map: MAP's screenshots)
#   glow_android_panels the two ceiling lights (off at night)
#   glow_android_lamp   the floor lamp's shade (on day and night)
# Coordinates as in build_house.py: upstairs, from the partition with the AI Room to x = X1, the House's back wall to the wing's.

X0, X1 = -0.3, 5.0
Y0, Y1 = YB + 0.4, YW - 0.4
F = FL1 + 0.02
DOOR_X = next(x for slug, x, st in DOORS if slug == 'android')

RUST = mat('fabric_rust', None, color=(0.52, 0.3, 0.2), rough=1.0)        # the armchair's wool
RUG = mat('rug', None, color=(0.66, 0.6, 0.5), rough=1.0)
BOOKS = [mat(f'book_{i}', None, color=c, rough=0.8) for i, c in enumerate(((0.32, 0.36, 0.42), (0.62, 0.55, 0.42), (0.45, 0.22, 0.18), (0.82, 0.8, 0.74), (0.24, 0.3, 0.26)))]

room_parts = []


def part(name, parent=None, **kw):
    p = Part(name, **kw)
    room_parts.append((p, parent))
    return p


# --- the shell's inside
shell = part('android_shell', weight=1.2)
shell.box(X0, X1, Y0, Y1, F - 0.02, F, OAK_FLOOR, keep=UP)
shell.box(X0, X1, Y0, Y1, CE1, CE1 + 0.02, PLASTER, keep=DOWN)
shell.box(X0 - 0.02, X0, Y0, Y1, F, CE1, PLASTER, keep=EAST)
shell.box(X1, X1 + 0.02, Y0, Y1, F, CE1, PLASTER, keep=WEST)
shell.box(X0, X1, Y1, Y1 + 0.02, F, CE1, PLASTER, keep=SOUTH)
walls_with_openings(shell, X0, X1, Y0 - 0.02, Y0, F, CE1, [(DOOR_X, OPEN_W, OPEN_H)], PLASTER, keep=NORTH)
for a, b, c, d, k in ((X0, X1, Y0, Y0 + 0.015, NORTH), (X0, X0 + 0.015, Y0, Y1, EAST), (X1 - 0.015, X1, Y0, Y1, WEST), (X0, X1, Y1 - 0.015, Y1, SOUTH)):
    shell.box(a, b, c, d, F, F + 0.08, OAK_DARK, keep=k)  # skirting

FLUSH = mat('glow_flush', None, color=WARM, rough=0.5, emit=float(os.environ.get('FLUSH', 40.0)), emit_color=LAMP)  # round opal ceiling lights
FLUSH['panel'] = True  # off in the night bake
lights = part('glow_android_panels', weight=1.0)
for x, y in ((1.6, 14.6), (3.0, 17.0)):
    lights.cyl(x, y, CE1 - 0.06, CE1, 0.32, FLUSH, seg=28, caps=(True, False))

# --- the corner: a rug, the armchair facing the door, the floor lamp behind it, a print above
soft = part('android_soft', weight=1.1, smooth=True)
hard = part('android_hard', weight=1.1)
soft.box(1.0, 4.4, 15.4, 18.5, F, F + 0.012, RUG)
soft.box(1.06, 4.34, 15.46, 18.44, F + 0.012, F + 0.014, FABRIC_OAT, keep=UP)
furn, fx = soft, hard  # sofa() builds into these (the House's own furniture parts are built by now)
sofa(2.9, 3.9, 17.1, 18.05, F, RUST, seats=1)
hard.cyl(4.4, 18.6, F, F + 0.02, 0.17, FRAME, seg=14)
hard.cyl(4.4, 18.6, F, F + 1.5, 0.012, FRAME, seg=6)
lamp = part('glow_android_lamp')
lamp.cyl(4.4, 18.6, F + 1.3, F + 1.65, 0.2, GLOW_SHADE, seg=20, r_top=0.16)
quad(hard, ((2.9, Y1 - 0.012, F + 1.35), (3.7, Y1 - 0.012, F + 1.35), (3.7, Y1 - 0.012, F + 2.35), (2.9, Y1 - 0.012, F + 2.35)), PRINT_FIELDS)
for a, b, c, d in ((2.87, 3.73, F + 2.35, F + 2.38), (2.87, 3.73, F + 1.32, F + 1.35), (2.87, 2.9, F + 1.35, F + 2.35), (3.7, 3.73, F + 1.35, F + 2.35)):
    hard.box(a, b, Y1 - 0.03, Y1, c, d, FRAME)

# --- a bookcase on the left wall, oak, its shelves of books
rr = np.random.default_rng(113)
BY0, BY1 = 14.4, 17.4
for z in (0.0, 0.4, 0.8, 1.2, 1.6, 2.0):
    hard.box(X0, X0 + 0.32, BY0, BY1, F + z, F + z + 0.025, OAK)
for y in (BY0, BY1 - 0.025, (BY0 + BY1) / 2):
    hard.box(X0, X0 + 0.32, y, y + 0.025, F, F + 2.025, OAK)
for z in (0.4, 0.8, 1.2, 1.6):
    y = BY0 + 0.04
    while y < BY1 - 0.12:
        if abs(y - (BY0 + BY1) / 2) < 0.05:
            y += 0.06
            continue
        w, h = rr.uniform(0.02, 0.05), rr.uniform(0.2, 0.33)
        if rr.random() < 0.1:
            y += 0.15
            continue
        hard.box(X0 + 0.04, X0 + 0.04 + rr.uniform(0.17, 0.24), y, y + w, F + z + 0.025, F + z + 0.025 + h, BOOKS[int(rr.integers(0, len(BOOKS)))])
        y += w + 0.003

# --- MAP: a round oak side table by the armchair, the phone upright on its stand, facing the room
map_root = empty('obj_map', (0, 0, 0))
side = part('map_table', map_root, weight=1.4)
SX, SY, ST = 2.3, 17.6, F + 0.56
side.cyl(SX, SY, ST - 0.03, ST, 0.26, OAK, seg=28)
side.cyl(SX, SY, F + 0.02, ST - 0.03, 0.025, OAK_DARK, seg=10)
side.cyl(SX, SY, F, F + 0.02, 0.18, OAK_DARK, seg=20)
side.box(SX - 0.05, SX + 0.05, SY - 0.03, SY + 0.05, ST, ST + 0.012, FRAME, bevel=0.003)  # the stand
side.box(SX - 0.012, SX + 0.012, SY + 0.012, SY + 0.03, ST + 0.012, ST + 0.09, FRAME)
side.box(SX - 0.038, SX + 0.038, SY - 0.004, SY + 0.004, ST + 0.012, ST + 0.172, RUBBER, bevel=0.003)  # the phone
quad(part('screen_map', map_root, weight=0.6), ((SX - 0.034, SY - 0.0045, ST + 0.016), (SX + 0.034, SY - 0.0045, ST + 0.016), (SX + 0.034, SY - 0.0045, ST + 0.168), (SX - 0.034, SY - 0.0045, ST + 0.168)), SCREEN)
side.cyl(SX + 0.13, SY - 0.06, ST, ST + 0.09, 0.038, FABRIC_PALE, seg=14)  # a cup

room_root = empty('room_android', (0, 0, 0))
map_root.parent = room_root
ROOMS['android'] = [p.build(parent or room_root) for p, parent in room_parts] + [room_root, map_root]
