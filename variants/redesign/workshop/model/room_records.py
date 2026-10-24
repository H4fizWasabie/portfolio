# The records Room (#111): the dispensary behind the House's ground-floor doorway_records, beside the stock Room in the rear wing.
# Run by build_house.py like room_stock.py (whose materials it shares), baked into its own lighting texture and exported as
# room-records.glb. Cool, quiet and precise: pale sage walls, a long counter under the locked controlled-drugs cabinet, the
# register's terminal on the counter, dispensary shelving, a medicines fridge and a wall clock. Its objects:
#   obj_dd-drugs-register         the cabinet and the terminal beneath it; the terminal's screen_dd-drugs-register shows the
#                                 register's workflow outline (the page draws it: no interface or record is shown)
#   glow_records_panels           the ceiling panels (dimmed at night)
#   glow_records_strip, _fridge   the light under the cabinet and inside the fridge (on day and night)
# Coordinates as in build_house.py: from the stock Room's partition to x = X1, the House's back wall to the wing's.

X0, X1 = -0.3, 5.0
Y0, Y1 = YB + 0.4, YW - 0.4
DOOR_X = next(x for slug, x, st in DOORS if slug == 'records')

SAGE = mat('sage', None, color=(0.76, 0.81, 0.79), rough=0.9)            # the walls: a pale, cool sage
CUPBOARD = mat('cupboard', None, color=(0.6, 0.66, 0.66), rough=0.6)     # the counter's doors
CAB = mat('cd_cabinet', None, color=(0.84, 0.85, 0.85), rough=0.45, metal=0.3)  # powder-coated steel
LABEL_RED = mat('label_red', None, color=(0.62, 0.16, 0.13), rough=0.6)
BOX_GREEN = mat('box_green', None, color=(0.42, 0.6, 0.5), rough=0.7)
BOX_AMBER = mat('box_amber', None, color=(0.8, 0.6, 0.3), rough=0.7)
STRIP = mat('led_strip', None, color=(1, 1, 1), rough=0.5, emit=6.0, emit_color=(0.97, 0.98, 1.0))  # cool LED strips

room_parts = []


def part(name, parent=None, **kw):
    p = Part(name, **kw)
    room_parts.append((p, parent))
    return p


# --- the shell's inside
shell = part('records_shell', weight=1.2)
shell.box(X0, X1, Y0, Y1, FL0 - 0.02, FL0, VINYL, keep=UP)
shell.box(X0, X1, Y0, Y1, CE0, CE0 + 0.02, WHITE, keep=DOWN)
shell.box(X0 - 0.02, X0, Y0, Y1, FL0, CE0, SAGE, keep=EAST)
shell.box(X1, X1 + 0.02, Y0, Y1, FL0, CE0, SAGE, keep=WEST)
wall_with_windows(shell, X0, X1, Y1, Y1 + 0.02, FL0, CE0, *WING_WIN[0], [ribbon(X0, X1)], SAGE, keep=SOUTH)  # the ribbon window to the dusk
walls_with_openings(shell, X0, X1, Y0 - 0.02, Y0, FL0, CE0, [(DOOR_X, OPEN_W, OPEN_H)], SAGE, keep=NORTH)
for a, b, c, d, k in ((X0, X1, Y0, Y0 + 0.012, NORTH), (X0, X0 + 0.012, Y0, Y1, EAST), (X1 - 0.012, X1, Y0, Y1, WEST), (X0, X1, Y1 - 0.012, Y1, SOUTH)):
    shell.box(a, b, c, d, FL0, FL0 + 0.1, STEEL, keep=k)  # kick plates

panels = part('glow_records_panels', weight=1.0)
for x in (X0 + 1.4, X1 - 1.4):
    for y in (Y0 + 1.8, Y1 - 2.0):
        panels.box(x - 0.6, x + 0.6, y - 0.3, y + 0.3, CE0 - 0.02, CE0 - 0.015, PANEL, keep=DOWN)
        shell.box(x - 0.62, x + 0.62, y - 0.32, y + 0.32, CE0 - 0.015, CE0 - 0.01, POWDER, keep=DOWN)

# --- the counter along the back wall: cupboards with steel pulls, a white top
fit = part('records_counter', weight=1.1)
CX0, CX1, CY0 = X0 + 0.3, X1 - 1.3, Y1 - 0.65
TOP = FL0 + 0.92
fit.box(CX0, CX1, CY0 + 0.05, Y1, FL0, FL0 + 0.1, RUBBER)                       # the plinth, set back
fit.box(CX0, CX1, CY0, Y1, FL0 + 0.1, TOP - 0.04, CUPBOARD)
n = 6
for i in range(n):
    x = CX0 + (CX1 - CX0) * (i + 0.5) / n
    fit.box(x - (CX1 - CX0) / n / 2 + 0.004, x + (CX1 - CX0) / n / 2 - 0.004, CY0 - 0.006, CY0, FL0 + 0.12, TOP - 0.06, CUPBOARD, keep=SOUTH)
    fit.box(x - 0.12, x + 0.12, CY0 - 0.03, CY0 - 0.006, TOP - 0.16, TOP - 0.14, STEEL)
fit.box(CX0 - 0.01, CX1 + 0.01, CY0 - 0.03, Y1, TOP - 0.04, TOP, LAMINATE, bevel=0.004)
fit.cyl(CX0 + 0.9, CY0 - 0.35, FL0, FL0 + 0.02, 0.2, STEEL, seg=12)              # a stool at the counter
fit.cyl(CX0 + 0.9, CY0 - 0.35, FL0 + 0.02, FL0 + 0.64, 0.018, STEEL, seg=8)
fit.cyl(CX0 + 0.9, CY0 - 0.35, FL0 + 0.64, FL0 + 0.7, 0.17, RUBBER, seg=16)

# --- the register: the locked controlled-drugs cabinet on the wall, the terminal on the counter beneath it
reg_root = empty('obj_dd-drugs-register', (0, 0, 0))
reg = part('records_register', reg_root, weight=1.4)
KX = 2.0                                   # the cabinet's middle
KZ0, KZ1 = TOP + 0.55, TOP + 1.45
reg.box(KX - 0.42, KX + 0.42, Y1 - 0.36, Y1, KZ0, KZ1, CAB, bevel=0.006)        # the cabinet: a steel box with two doors
reg.box(KX - 0.001, KX + 0.001, Y1 - 0.362, Y1 - 0.36, KZ0 + 0.02, KZ1 - 0.02, RUBBER, keep=SOUTH)  # the doors' seam
for dx in (-0.07, 0.07):
    rod(reg, (KX + dx, Y1 - 0.36, KZ0 + 0.45), (KX + dx, Y1 - 0.38, KZ0 + 0.45), 0.018, STEEL)  # a lock on each door
reg.box(KX + 0.16, KX + 0.3, Y1 - 0.37, Y1 - 0.36, KZ0 + 0.52, KZ0 + 0.72, RUBBER)  # the keypad
reg.box(KX - 0.3, KX - 0.14, Y1 - 0.365, Y1 - 0.36, KZ1 - 0.14, KZ1 - 0.08, LABEL_RED, keep=SOUTH)  # its red label
TX = KX + 1.1                              # the terminal: an all-in-one on a stand, a keyboard, a scanner
MZ = TOP + 0.36
reg.box(TX - 0.3, TX + 0.3, Y1 - 0.3, Y1 - 0.26, MZ - 0.2, MZ + 0.2, RUBBER, bevel=0.004)
reg.box(TX - 0.03, TX + 0.03, Y1 - 0.26, Y1 - 0.2, TOP, MZ - 0.1, STEEL)
reg.box(TX - 0.12, TX + 0.12, Y1 - 0.34, Y1 - 0.14, TOP, TOP + 0.01, STEEL)
reg.box(TX - 0.22, TX + 0.22, Y1 - 0.6, Y1 - 0.45, TOP, TOP + 0.02, RUBBER)
reg.box(TX + 0.36, TX + 0.44, Y1 - 0.5, Y1 - 0.38, TOP, TOP + 0.03, RUBBER, bevel=0.008)
reg.box(TX + 0.38, TX + 0.42, Y1 - 0.47, Y1 - 0.41, TOP + 0.03, TOP + 0.15, RUBBER, bevel=0.006)
quad(part('screen_dd-drugs-register', reg_root, weight=0.6), ((TX - 0.28, Y1 - 0.301, MZ - 0.18), (TX + 0.28, Y1 - 0.301, MZ - 0.18), (TX + 0.28, Y1 - 0.301, MZ + 0.18), (TX - 0.28, Y1 - 0.301, MZ + 0.18)), SCREEN)
strip = part('glow_records_strip', reg_root)
strip.box(KX - 0.38, KX + 0.38, Y1 - 0.3, Y1 - 0.26, KZ0 - 0.006, KZ0 - 0.002, STRIP, keep=DOWN)

# --- dispensary shelving on the left wall: rows of small boxes of medicines, stripes of colour on white
shelf = part('records_shelving', weight=1.0)
packs = part('records_packs', weight=0.9)
rr = np.random.default_rng(111)
SY0, SY1 = Y0 + 1.7, Y1 - 1.1
for zs in (0.5, 0.86, 1.22, 1.58, 1.94, 2.3):
    z = FL0 + zs
    shelf.box(X0, X0 + 0.32, SY0, SY1, z - 0.02, z, POWDER)
    y = SY0 + 0.03
    while y < SY1 - 0.1:
        w = rr.uniform(0.05, 0.11)
        if rr.random() < 0.08:
            y += 0.12
            continue
        h, d = rr.uniform(0.09, 0.2), rr.uniform(0.12, 0.26)
        packs.box(X0 + 0.02, X0 + 0.02 + d, y, y + w, z, z + h, BIN, top=z + h)
        packs.box(X0 + 0.02 + d, X0 + 0.024 + d, y + 0.004, y + w - 0.004, z + h * 0.55, z + h * 0.8, [BIN_BLUE, BOX_GREEN, BOX_AMBER, BIN_BLUE][int(rr.integers(0, 4))], keep=EAST)
        y += w + rr.uniform(0.004, 0.02)
for y in (SY0, SY1):
    shelf.box(X0, X0 + 0.32, y - 0.02, y, FL0, FL0 + 2.4, POWDER)
shelf.box(X0, X0 + 0.32, SY0, SY1, FL0, FL0 + 0.12, POWDER)

# --- the medicines fridge on the right wall: white, a glass door, lit shelves of boxes inside
fridge = part('records_fridge', weight=1.0)
FY0, FY1, FZ = Y1 - 1.0, Y1 - 0.25, FL0 + 1.85
for a, b, c, d, e, f in ((X1 - 0.68, X1, FY0, FY1, FL0, FL0 + 0.12), (X1 - 0.68, X1, FY0, FY1, FZ - 0.08, FZ),            # its plinth and top,
                         (X1 - 0.68, X1, FY0, FY0 + 0.04, FL0, FZ), (X1 - 0.68, X1, FY1 - 0.04, FY1, FL0, FZ), (X1 - 0.04, X1, FY0, FY1, FL0, FZ)):  # sides and back
    fridge.box(a, b, c, d, e, f, POWDER)
for zs in (0.45, 0.8, 1.15, 1.5):
    fridge.box(X1 - 0.62, X1 - 0.06, FY0 + 0.05, FY1 - 0.05, FL0 + zs - 0.01, FL0 + zs, STEEL)
    for k in range(5):
        y = FY0 + 0.08 + k * 0.12
        packs.box(X1 - 0.5, X1 - 0.2, y, y + 0.09, FL0 + zs, FL0 + zs + 0.12 + 0.04 * (k % 2), [BIN, BOX_GREEN, BIN_BLUE][k % 3])
fridge.box(X1 - 0.705, X1 - 0.69, FY0 + 0.02, FY0 + 0.05, FL0 + 0.3, FZ - 0.3, STEEL)  # the handle
glass = part('glass_records_fridge', weight=0)
glass.box(X1 - 0.69, X1 - 0.68, FY0 + 0.04, FY1 - 0.04, FL0 + 0.12, FZ - 0.08, GLASS, keep=WEST)
light = part('glow_records_fridge')
light.box(X1 - 0.6, X1 - 0.1, FY0 + 0.08, FY1 - 0.08, FZ - 0.09, FZ - 0.085, STRIP, keep=DOWN)

# --- a wall clock beside the door, on the inside of the front wall
clock = part('records_clock', weight=1.0)
rod(clock, (DOOR_X + 1.6, Y0 + 0.01, FL0 + 2.45), (DOOR_X + 1.6, Y0 + 0.05, FL0 + 2.45), 0.17, POWDER, seg=32)
rod(clock, (DOOR_X + 1.6, Y0 + 0.05, FL0 + 2.45), (DOOR_X + 1.6, Y0 + 0.054, FL0 + 2.45), 0.15, WHITE, seg=32)
clock.box(DOOR_X + 1.595, DOOR_X + 1.605, Y0 + 0.055, Y0 + 0.06, FL0 + 2.45, FL0 + 2.57, RUBBER)
clock.box(DOOR_X + 1.6, DOOR_X + 1.69, Y0 + 0.055, Y0 + 0.06, FL0 + 2.445, FL0 + 2.455, RUBBER)

room_root = empty('room_records', (0, 0, 0))
reg_root.parent = room_root
ROOMS['records'] = [p.build(parent or room_root) for p, parent in room_parts] + [room_root, reg_root]
