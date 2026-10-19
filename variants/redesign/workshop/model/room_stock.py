# The stock & purchasing Room (#108): a hospital supply room behind the House's ground-floor doorway_stock, in the rear wing.
# Run by build_house.py in its own namespace (Part, mat, the materials and the House's dimensions), which bakes it into its
# own lighting texture and exports it as room-stock.glb. Clean clinical whites, lit by ceiling panels, with one warm
# accent: the kraft cartons of a delivery. Its objects, by the page's conventions:
#   obj_procura   the workstation against the partition, its monitor screen_procura (Procura's screenshots)
#   obj_pims      the wall tablet where stock requests arrive, its screen screen_pims (PIMS's screenshots)
#   glow_stock_panels  the ceiling panels (dimmed at night)
#   glow_stock_lamp    the task lamp on the workstation (on day and night)
# Coordinates as in build_house.py: the Room runs from the back wall (y = YB + 0.4) to the wing's back wall, on the ground floor.

X0, X1 = -FX + 0.4, -0.5          # inside the wing's left wall to the partition with the records Room
Y0, Y1 = YB + 0.4, YW - 0.4       # the House's back wall to the wing's
DOOR_X = next(x for slug, x, st in DOORS if slug == 'stock')

WHITE = mat('clinic_white', None, color=(0.93, 0.94, 0.94), rough=0.9)  # smooth painted walls
VINYL = mat('vinyl', 'floor', 2.0, (0.8, 0.81, 0.81), 0.35, size=384)
STEEL = mat('steel', None, color=(0.62, 0.64, 0.66), rough=0.35, metal=1.0)
POWDER = mat('powder_white', None, color=(0.88, 0.89, 0.9), rough=0.5)
BIN = mat('bin', None, color=(0.86, 0.88, 0.9), rough=0.6)
BIN_BLUE = mat('bin_blue', None, color=(0.36, 0.5, 0.66), rough=0.6)  # the bins' labels
KRAFT = mat('kraft', None, color=(0.66, 0.5, 0.33), rough=0.95)
LAMINATE = mat('laminate', None, color=(0.9, 0.9, 0.89), rough=0.5)
SCREEN = mat('screen', None, color=(0.02, 0.02, 0.025), rough=0.2, emit=float(os.environ.get('SCREEN', 3.0)), emit_color=(0.85, 0.9, 1.0))  # lit, so it lights the desk in the bake; the page puts the screenshot on it
RUBBER = mat('rubber', None, color=(0.04, 0.04, 0.045), rough=0.9)
PANEL = mat('panel_light', None, color=(1, 1, 1), rough=0.5, emit=float(os.environ.get('PANEL', 24.0)), emit_color=(0.97, 0.98, 1.0))  # LED panels, cool white
PANEL['panel'] = True  # dimmed in the night bake (build_house.py)

room_parts = []


def part(name, parent=None, **kw):
    p = Part(name, **kw)
    room_parts.append((p, parent))
    return p


# --- the shell's inside: floor, ceiling, walls (the front wall's inner face round the doorway)
shell = part('stock_shell', weight=1.2)
shell.box(X0, X1, Y0, Y1, FL0 - 0.02, FL0, VINYL, keep=UP)
shell.box(X0, X1, Y0, Y1, CE0, CE0 + 0.02, WHITE, keep=DOWN)
shell.box(X0 - 0.02, X0, Y0, Y1, FL0, CE0, WHITE, keep=EAST)
shell.box(X1, X1 + 0.02, Y0, Y1, FL0, CE0, WHITE, keep=WEST)
shell.box(X0, X1, Y1, Y1 + 0.02, FL0, CE0, WHITE, keep=SOUTH)
walls_with_openings(shell, X0, X1, Y0 - 0.02, Y0, FL0, CE0, [(DOOR_X, OPEN_W, OPEN_H)], WHITE, keep=NORTH)
shell.box(X0, X1, Y0, Y0 + 0.012, FL0, FL0 + 0.1, STEEL, keep=NORTH)  # a steel kick plate along the walls
shell.box(X0, X0 + 0.012, Y0, Y1, FL0, FL0 + 0.1, STEEL, keep=EAST)
shell.box(X0, X1, Y1 - 0.012, Y1, FL0, FL0 + 0.1, STEEL, keep=SOUTH)

panels = part('glow_stock_panels', weight=1.0)
for x in (X0 + 1.5, (X0 + X1) / 2, X1 - 1.5):
    for y in (Y0 + 1.8, Y1 - 2.0):
        panels.box(x - 0.6, x + 0.6, y - 0.3, y + 0.3, CE0 - 0.02, CE0 - 0.015, PANEL, keep=DOWN)
        shell.box(x - 0.62, x + 0.62, y - 0.32, y + 0.32, CE0 - 0.015, CE0 - 0.01, POWDER, keep=DOWN)  # the panel's rim, behind it

# --- racking: powder-coated shelving with white bins and kraft cartons, along the back wall and the left wall
rack = part('stock_racking', weight=1.0)
boxes = part('stock_boxes', weight=1.0)
rr = np.random.default_rng(108)
SHELVES = (0.12, 0.62, 1.12, 1.62, 2.12)


def stock(x0, x1, y0, y1, along_x):
    """What sits on one shelf between (x0, y0) and (x1, y1): bins and cartons in a row, a gap here and there."""
    span = (x1 - x0) if along_x else (y1 - y0)
    depth = (y1 - y0) if along_x else (x1 - x0)
    t = 0.03
    while t < span - 0.2:
        w = rr.uniform(0.22, 0.42)
        if t + w > span - 0.03:
            break
        if rr.random() < 0.12:
            t += w * 0.7
            continue
        kraft = rr.random() < 0.3
        h = rr.uniform(0.2, 0.36) if kraft else rr.uniform(0.16, 0.26)
        d = depth * rr.uniform(0.75, 0.92)
        a, b = t, t + w
        if along_x:
            boxes.box(x0 + a, x0 + b, y1 - d, y1 - 0.02, z, z + h, KRAFT if kraft else BIN, top=z + h)
            if not kraft:
                boxes.box(x0 + a + 0.04, x0 + b - 0.04, y1 - d - 0.004, y1 - d, z + h * 0.45, z + h * 0.75, BIN_BLUE, keep=SOUTH)
        else:
            boxes.box(x0 + 0.02, x0 + d, y0 + a, y0 + b, z, z + h, KRAFT if kraft else BIN, top=z + h)
            if not kraft:
                boxes.box(x0 + d, x0 + d + 0.004, y0 + a + 0.04, y0 + b - 0.04, z + h * 0.45, z + h * 0.75, BIN_BLUE, keep=EAST)
        t = b + rr.uniform(0.02, 0.06)


def racking(x0, x1, y0, y1, bays, along_x):
    """Shelving from (x0, y0) to (x1, y1), its length along x (along_x) or y, in `bays` bays."""
    global z
    n = bays + 1
    for i in range(n):
        for back in (0, 1):
            if along_x:
                x = x0 + (x1 - x0) * i / bays
                y = y1 - 0.03 if back else y0 + 0.03
                rack.box(x - 0.025, x + 0.025, y - 0.025, y + 0.025, FL0, FL0 + 2.4, STEEL)
            else:
                y = y0 + (y1 - y0) * i / bays
                x = x0 + 0.03 if back else x1 - 0.03
                rack.box(x - 0.025, x + 0.025, y - 0.025, y + 0.025, FL0, FL0 + 2.4, STEEL)
    for s in SHELVES:
        z = FL0 + s
        rack.box(x0, x1, y0, y1, z - 0.03, z, POWDER)
        if s < 2.0 or rr.random() < 0.6:
            stock(x0, x1, y0, y1, along_x)


racking(X0 + 0.25, X1 - 0.35, Y1 - 0.6, Y1 - 0.02, 3, True)
racking(X0 + 0.02, X0 + 0.6, Y0 + 3.0, Y1 - 0.75, 2, False)

# --- the delivery: a platform trolley in the middle of the room, loaded with kraft cartons
trolley = part('stock_trolley', weight=1.1)
TX, TY = X0 + 3.6, Y0 + 3.6
trolley.box(TX - 0.5, TX + 0.5, TY - 0.32, TY + 0.32, FL0 + 0.16, FL0 + 0.2, STEEL)
trolley.box(TX - 0.48, TX + 0.48, TY - 0.3, TY + 0.3, FL0 + 0.2, FL0 + 0.205, RUBBER, keep=UP)
for dx in (-0.42, 0.42):
    for dy in (-0.25, 0.25):
        trolley.cyl(TX + dx, TY + dy, FL0, FL0 + 0.16, 0.06, RUBBER, seg=12)
for dy in (-0.3, 0.3):
    trolley.box(TX + 0.48, TX + 0.51, TY + dy - 0.015, TY + dy + 0.015, FL0 + 0.2, FL0 + 1.05, STEEL)
trolley.box(TX + 0.48, TX + 0.51, TY - 0.32, TY + 0.32, FL0 + 1.0, FL0 + 1.04, STEEL)
for (a, b, c, d, h0, h1) in ((-0.46, 0.0, -0.28, 0.06, 0.205, 0.55), (0.02, 0.44, -0.28, 0.28, 0.205, 0.48), (-0.46, 0.0, 0.08, 0.28, 0.205, 0.5),
                              (-0.4, -0.04, -0.24, 0.04, 0.55, 0.82), (0.06, 0.38, -0.22, 0.2, 0.48, 0.7)):
    trolley.box(TX + a, TX + b, TY + c, TY + d, FL0 + h0, FL0 + h1, KRAFT)

# --- Procura's workstation against the partition: a white desk, a monitor facing into the room, keyboard, mouse, a task chair
procura_root = empty('obj_procura', (0, 0, 0))  # at the origin, so its parts keep their world positions
desk = part('procura_desk', procura_root, weight=1.2)
DY = Y0 + 3.6  # the desk's middle, along the partition
desk.box(X1 - 0.78, X1 - 0.02, DY - 0.8, DY + 0.8, FL0 + 0.72, FL0 + 0.75, LAMINATE, bevel=0.004)
for dy in (-0.74, 0.74):
    desk.box(X1 - 0.72, X1 - 0.08, DY + dy - 0.02, DY + dy + 0.02, FL0, FL0 + 0.72, STEEL)
MZ = FL0 + 1.21  # the monitor's middle
desk.box(X1 - 0.26, X1 - 0.22, DY - 0.35, DY + 0.35, MZ - 0.23, MZ + 0.23, RUBBER)        # the monitor's body
desk.box(X1 - 0.22, X1 - 0.19, DY - 0.03, DY + 0.03, FL0 + 0.75, MZ - 0.1, STEEL)         # its neck
desk.box(X1 - 0.34, X1 - 0.12, DY - 0.12, DY + 0.12, FL0 + 0.75, FL0 + 0.76, STEEL)       # and foot
desk.box(X1 - 0.6, X1 - 0.44, DY - 0.24, DY + 0.24, FL0 + 0.75, FL0 + 0.77, RUBBER)       # keyboard
desk.box(X1 - 0.56, X1 - 0.48, DY + 0.34, DY + 0.4, FL0 + 0.75, FL0 + 0.78, RUBBER, bevel=0.01)  # mouse
desk.cyl(X1 - 1.15, DY, FL0, FL0 + 0.02, 0.28, RUBBER, seg=10)                           # the chair: base, column, seat, back
desk.cyl(X1 - 1.15, DY, FL0 + 0.02, FL0 + 0.44, 0.025, STEEL, seg=8)
desk.box(X1 - 1.38, X1 - 0.92, DY - 0.24, DY + 0.24, FL0 + 0.44, FL0 + 0.52, FABRIC, bevel=0.03, segments=3)
desk.box(X1 - 1.42, X1 - 1.36, DY - 0.22, DY + 0.22, FL0 + 0.6, FL0 + 1.05, FABRIC, bevel=0.025, segments=3)
lamp = part('glow_stock_lamp', procura_root)                                              # a task lamp at the desk's far end
desk.cyl(X1 - 0.2, DY + 0.62, FL0 + 0.75, FL0 + 0.77, 0.08, RUBBER, seg=12)
desk.cyl(X1 - 0.2, DY + 0.62, FL0 + 0.77, FL0 + 1.2, 0.008, STEEL, seg=6)
desk.box(X1 - 0.5, X1 - 0.2, DY + 0.61, DY + 0.63, FL0 + 1.19, FL0 + 1.21, STEEL)
desk.cyl(X1 - 0.52, DY + 0.62, FL0 + 1.1, FL0 + 1.2, 0.06, RUBBER, seg=12, r_top=0.03, caps=(False, True))
lamp.cyl(X1 - 0.52, DY + 0.62, FL0 + 1.095, FL0 + 1.1, 0.05, GLOW, seg=12)
quad(part('screen_procura', procura_root, weight=0.6), ((X1 - 0.265, DY + 0.33, MZ - 0.21), (X1 - 0.265, DY - 0.33, MZ - 0.21), (X1 - 0.265, DY - 0.33, MZ + 0.21), (X1 - 0.265, DY + 0.33, MZ + 0.21)), SCREEN)

# --- PIMS's wall tablet by the door, on the left wall, where stock requests arrive
TZ, TYc = FL0 + 1.45, Y0 + 1.5
pims_root = empty('obj_pims', (0, 0, 0))
tablet = part('pims_tablet', pims_root, weight=1.4)
tablet.box(X0, X0 + 0.03, TYc - 0.32, TYc + 0.32, TZ - 0.21, TZ + 0.21, RUBBER, bevel=0.008)
tablet.box(X0, X0 + 0.25, TYc - 0.2, TYc + 0.2, TZ - 0.52, TZ - 0.5, POWDER)                # a small shelf under it, with a scanner
tablet.box(X0 + 0.06, X0 + 0.18, TYc + 0.04, TYc + 0.14, TZ - 0.5, TZ - 0.42, RUBBER, bevel=0.01)
quad(part('screen_pims', pims_root, weight=0.6), ((X0 + 0.032, TYc - 0.3, TZ - 0.19), (X0 + 0.032, TYc + 0.3, TZ - 0.19), (X0 + 0.032, TYc + 0.3, TZ + 0.19), (X0 + 0.032, TYc - 0.3, TZ + 0.19)), SCREEN)

room_root = empty('room_stock', (0, 0, 0))
procura_root.parent = pims_root.parent = room_root
ROOMS['stock'] = [p.build(parent or room_root) for p, parent in room_parts] + [room_root, procura_root, pims_root]
