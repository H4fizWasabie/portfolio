# The AI & automation Room (#112): a studio behind the House's upstairs doorway_ai, over the stock Room in the rear wing.
# Run by build_house.py like room_stock.py (whose materials it shares), baked into its own lighting texture and exported as
# room-ai.glb. Grey acoustic walls under linear ceiling lights. Its objects:
#   obj_theoses   a desk with three monitors (screen_theoses, _left, _right: Theoses's screenshots) and the home server rack
#   obj_89lab     the recording corner: camera on a tripod in a ring light, a microphone on a boom over a small desk, acoustic
#                 panels, and the pipeline's display on the back wall (screen_89lab: its workflow outline, drawn by the page)
#   obj_yen       a puck with a light ring on a console beside a laptop (screen_yen) and a phone (screen_yen_phone); both show
#                 Yen's architecture outline, drawn by the page
#   glow_ai_panels                 the ceiling spots (dimmed at night)
#   glow_ai_bars                   the linear ceiling lights over each corner and the middle (on day and night)
#   glow_ai_ring, _leds, _puck     the ring light, the server's lights and the puck's ring (on day and night)
#   glow_ai_lamp, _yen_lamp        the task lamp on Theoses's desk and the linen lamp on Yen's console (on day and night)
# Coordinates as in build_house.py: upstairs, from the wing's left wall to the partition, the House's back wall to the wing's.

X0, X1 = -FX + 0.4, -0.5
Y0, Y1 = YB + 0.4, YW - 0.4
F = FL1 + 0.02  # the floor, level with the House's oak boards
DOOR_X = next(x for slug, x, st in DOORS if slug == 'ai')

ACOUSTIC = mat('acoustic', None, color=(0.42, 0.43, 0.44), rough=1.0)        # grey felt on the walls
STUDIO_FLOOR = mat('studio_floor', None, color=(0.34, 0.34, 0.35), rough=0.55)
STUDIO_CEIL = mat('studio_ceiling', None, color=(0.3, 0.305, 0.31), rough=1.0)
LED_GREEN = mat('led_green', None, color=(0.2, 1.0, 0.4), rough=0.5, emit=10.0, emit_color=(0.35, 1.0, 0.55))
LED_BLUE = mat('led_blue', None, color=(0.4, 0.6, 1.0), rough=0.5, emit=8.0, emit_color=(0.45, 0.65, 1.0))
SPOT = mat('spot_light', None, color=(1, 1, 1), rough=0.5, emit=float(os.environ.get('SPOT', 160.0)), emit_color=(1.0, 0.89, 0.81))  # small downlights, a near-neutral 5000 K (not glow_: no 2000 K Blackbody)
SPOT['panel'] = True  # dimmed in the night bake

room_parts = []


def part(name, parent=None, **kw):
    p = Part(name, **kw)
    room_parts.append((p, parent))
    return p


# --- the shell's inside
shell = part('ai_shell', weight=1.2)
shell.box(X0, X1, Y0, Y1, F - 0.02, F, STUDIO_FLOOR, keep=UP)
shell.box(X0, X1, Y0, Y1, CE1, CE1 + 0.02, STUDIO_CEIL, keep=DOWN)
shell.box(X0 - 0.02, X0, Y0, Y1, F, CE1, ACOUSTIC, keep=EAST)
shell.box(X1, X1 + 0.02, Y0, Y1, F, CE1, ACOUSTIC, keep=WEST)
shell.box(X0, X1, Y1, Y1 + 0.02, F, CE1, ACOUSTIC, keep=SOUTH)
walls_with_openings(shell, X0, X1, Y0 - 0.02, Y0, F, CE1, [(DOOR_X, OPEN_W, OPEN_H)], ACOUSTIC, keep=NORTH)

spots = part('glow_ai_panels', weight=1.0)
for x, y in ((-6.6, 17.6), (-4.6, 17.6), (-1.8, 17.2), (-1.8, 15.2), (-7.2, 14.7), (-5.0, 14.2), (-3.0, 13.6)):
    spots.cyl(x, y, CE1 - 0.03, CE1, 0.08, SPOT, seg=14, caps=(True, False))
BAR = mat('bar_light', None, color=(1, 1, 1), rough=0.5, emit=float(os.environ.get('BAR', 70.0)), emit_color=(1.0, 0.89, 0.81))  # linear ceiling lights, 5000 K
bars = part('glow_ai_bars', weight=1.0)  # not _panels: on day and night, so the Room still reads at night
for x0, x1, y0, y1 in ((-6.4, -4.8, 18.6, 18.68), (-1.74, -1.66, 15.8, 17.0), (-7.64, -7.56, 14.0, 15.4), (-5.4, -3.0, 15.56, 15.64)):  # Theoses, 89lab, Yen, the middle
    bars.box(x0, x1, y0, y1, CE1 - 0.04, CE1, BAR)

# --- Theoses: a dark oak desk on the back wall with three monitors, a task chair, and the home server rack beside it
th_root = empty('obj_theoses', (0, 0, 0))
desk = part('theoses_desk', th_root, weight=1.2)
screens = part('screen_theoses', th_root, weight=0.6)
side_l = part('screen_theoses_left', th_root, weight=0.5)
side_r = part('screen_theoses_right', th_root, weight=0.5)
DX, TOP = -5.6, F + 0.74
desk.box(DX - 1.1, DX + 1.1, Y1 - 0.8, Y1 - 0.02, TOP - 0.04, TOP, OAK_DARK, bevel=0.006)
for x in (DX - 1.04, DX + 1.04):
    desk.box(x - 0.025, x + 0.025, Y1 - 0.74, Y1 - 0.08, F, TOP - 0.04, FRAME)
MZ = TOP + 0.42


def monitor(screen_part, x):
    desk.box(x - 0.32, x + 0.32, Y1 - 0.3, Y1 - 0.26, MZ - 0.19, MZ + 0.19, RUBBER, bevel=0.004)
    desk.box(x - 0.03, x + 0.03, Y1 - 0.26, Y1 - 0.2, TOP, MZ - 0.1, STEEL)
    desk.box(x - 0.13, x + 0.13, Y1 - 0.34, Y1 - 0.14, TOP, TOP + 0.01, STEEL)
    quad(screen_part, ((x - 0.3, Y1 - 0.301, MZ - 0.17), (x + 0.3, Y1 - 0.301, MZ - 0.17), (x + 0.3, Y1 - 0.301, MZ + 0.17), (x - 0.3, Y1 - 0.301, MZ + 0.17)), SCREEN)


monitor(screens, DX)
turned([desk, side_l], (DX - 0.66, Y1 - 0.28), math.radians(24), lambda: monitor(side_l, DX - 0.66))  # the side screens turn in
turned([desk, side_r], (DX + 0.66, Y1 - 0.28), math.radians(-24), lambda: monitor(side_r, DX + 0.66))
desk.box(DX - 0.24, DX + 0.24, Y1 - 0.62, Y1 - 0.46, TOP, TOP + 0.02, RUBBER)            # keyboard, mouse, a mug
desk.box(DX + 0.34, DX + 0.42, Y1 - 0.58, Y1 - 0.5, TOP, TOP + 0.03, RUBBER, bevel=0.01)
desk.cyl(DX - 0.6, Y1 - 0.58, TOP, TOP + 0.1, 0.04, FABRIC_PALE, seg=14)
LX0 = DX + 1.02                                                                            # a task lamp at the desk's right end, its head out past the right monitor
desk.cyl(LX0, Y1 - 0.15, TOP, TOP + 0.02, 0.08, RUBBER, seg=12)
desk.cyl(LX0, Y1 - 0.15, TOP + 0.02, TOP + 0.55, 0.008, STEEL, seg=6)
rod(desk, (LX0, Y1 - 0.15, TOP + 0.55), (LX0 - 0.07, Y1 - 0.6, TOP + 0.5), 0.008, STEEL)
desk.cyl(LX0 - 0.07, Y1 - 0.6, TOP + 0.4, TOP + 0.5, 0.06, RUBBER, seg=12, r_top=0.03, caps=(False, True))
part('glow_ai_lamp', th_root).cyl(LX0 - 0.07, Y1 - 0.6, TOP + 0.395, TOP + 0.4, 0.05, GLOW_FLAME, seg=12)
desk.cyl(DX, Y1 - 1.25, F, F + 0.02, 0.28, RUBBER, seg=10)                                # the chair: base, column, seat, back
desk.cyl(DX, Y1 - 1.25, F + 0.02, F + 0.45, 0.025, STEEL, seg=8)
desk.box(DX - 0.25, DX + 0.25, Y1 - 1.5, Y1 - 1.0, F + 0.45, F + 0.53, FABRIC, bevel=0.03, segments=3)
desk.box(DX - 0.23, DX + 0.23, Y1 - 1.58, Y1 - 1.5, F + 0.6, F + 1.12, FABRIC, bevel=0.025, segments=3)
# the rack: a black cabinet, its servers' fronts in steel with a row of lights each
RX0, RX1, RY = X0 + 0.08, X0 + 0.68, Y1 - 0.66
desk.box(RX0, RX1, RY, Y1 - 0.02, F, F + 1.25, CHARCOAL, bevel=0.006)
leds = part('glow_ai_leds', th_root)
for i, (z0, h) in enumerate(((0.12, 0.17), (0.32, 0.08), (0.43, 0.08), (0.54, 0.17), (0.74, 0.08), (0.88, 0.25))):
    desk.box(RX0 + 0.05, RX1 - 0.05, RY - 0.01, RY, F + z0, F + z0 + h, FRAME, keep=SOUTH)
    for k in range(3 if i % 2 else 5):
        x = RX0 + 0.09 + k * 0.035
        leds.box(x, x + 0.012, RY - 0.014, RY - 0.01, F + z0 + h - 0.03, F + z0 + h - 0.018, LED_GREEN if (i + k) % 4 else LED_BLUE, keep=SOUTH)

# --- 89lab: the recording corner by the partition: a small desk with a microphone on a boom, the presenter's stool against the
# acoustic panels, a camera on a tripod inside a ring light facing it, and the pipeline's display on the back wall
lab_root = empty('obj_89lab', (0, 0, 0))
lab = part('lab_corner', lab_root, weight=1.2)
LX, LY = -1.7, 16.4   # the desk's middle
lab.box(LX - 0.3, LX + 0.3, LY - 0.8, LY + 0.8, TOP - 0.04, TOP, OAK_DARK, bevel=0.006)
for y in (LY - 0.74, LY + 0.74):
    lab.box(LX - 0.25, LX + 0.25, y - 0.02, y + 0.02, F, TOP - 0.04, FRAME)
lab.box(LX - 0.06, LX + 0.06, LY + 0.5, LY + 0.62, TOP, TOP + 0.04, FRAME)               # the boom's clamp, arm and microphone
rod(lab, (LX, LY + 0.56, TOP + 0.04), (LX + 0.05, LY + 0.3, TOP + 0.5), 0.01, FRAME)
rod(lab, (LX + 0.05, LY + 0.3, TOP + 0.5), (LX + 0.32, LY + 0.02, TOP + 0.36), 0.01, FRAME)
rod(lab, (LX + 0.32, LY + 0.02, TOP + 0.26), (LX + 0.32, LY + 0.02, TOP + 0.4), 0.032, CHARCOAL, seg=16)
lab.cyl(LX + 0.85, LY, F, F + 0.02, 0.22, RUBBER, seg=12)                                  # the stool
lab.cyl(LX + 0.85, LY, F + 0.02, F + 0.6, 0.02, STEEL, seg=8)
lab.cyl(LX + 0.85, LY, F + 0.6, F + 0.67, 0.18, FABRIC, seg=16)
for i in range(3):                                                                          # acoustic panels behind it
    for j in range(2):
        y, z = LY - 0.95 + i * 0.64, F + 0.95 + j * 0.64
        lab.box(X1 - 0.05, X1, y, y + 0.6, z, z + 0.6, FABRIC, bevel=0.012)
CX, CZ = LX - 1.35, F + 1.3                                                                 # the camera on its tripod, looking at the stool
lab.box(CX - 0.06, CX + 0.06, LY - 0.08, LY + 0.08, CZ - 0.06, CZ + 0.06, CHARCOAL, bevel=0.01)
rod(lab, (CX + 0.06, LY, CZ), (CX + 0.16, LY, CZ), 0.035, RUBBER, seg=16)
rod(lab, (CX, LY, CZ - 0.06), (CX, LY, F + 0.75), 0.012, FRAME)
for a in (0, 2.1, 4.2):
    rod(lab, (CX, LY, F + 0.78), (CX + 0.42 * math.cos(a), LY + 0.42 * math.sin(a), F), 0.01, FRAME)
ring_light = part('glow_ai_ring', lab_root)
ring(ring_light, (CX + 0.12, LY, CZ), (1, 0, 0), 0.24, 0.022, STRIP)
rod(lab, (CX + 0.12, LY, CZ - 0.26), (CX + 0.04, LY, CZ - 0.08), 0.008, FRAME)
quad(part('screen_89lab', lab_root, weight=0.6), ((-2.35, Y1 - 0.051, F + 1.3), (-1.15, Y1 - 0.051, F + 1.3), (-1.15, Y1 - 0.051, F + 1.98), (-2.35, Y1 - 0.051, F + 1.98)), SCREEN)
lab.box(-2.38, -1.12, Y1 - 0.05, Y1, F + 1.27, F + 2.01, RUBBER, bevel=0.004)

# --- Yen: a console on the left wall with a laptop, the puck and a phone on a stand, all showing the same thing
yen_root = empty('obj_yen', (0, 0, 0))
yen = part('yen_console', yen_root, weight=1.3)
YY0, YY1 = 13.9, 15.5
yen.box(X0, X0 + 0.6, YY0, YY1, TOP - 0.04, TOP, OAK_DARK, bevel=0.006)
for y in (YY0 + 0.06, YY1 - 0.06):
    for x in (X0 + 0.06, X0 + 0.54):
        yen.box(x - 0.02, x + 0.02, y - 0.02, y + 0.02, F, TOP - 0.04, FRAME)
LTY = 14.47                                                                                 # the laptop: base, and its lid upright
yen.box(X0 + 0.25, X0 + 0.55, LTY - 0.17, LTY + 0.17, TOP, TOP + 0.015, STEEL, bevel=0.003)
yen.box(X0 + 0.23, X0 + 0.245, LTY - 0.17, LTY + 0.17, TOP + 0.01, TOP + 0.235, STEEL, bevel=0.003)
quad(part('screen_yen', yen_root, weight=0.6), ((X0 + 0.246, LTY - 0.155, TOP + 0.025), (X0 + 0.246, LTY + 0.155, TOP + 0.025), (X0 + 0.246, LTY + 0.155, TOP + 0.222), (X0 + 0.246, LTY - 0.155, TOP + 0.222)), SCREEN)
PX, PY = X0 + 0.38, 14.9                                                                    # the puck, its ring of light round the top
yen.cyl(PX, PY, TOP, TOP + 0.026, 0.055, CHARCOAL, seg=24)
yen.cyl(PX, PY, TOP + 0.026, TOP + 0.034, 0.045, FABRIC, seg=24)
ring(part('glow_ai_puck', yen_root), (PX, PY, TOP + 0.027), (0, 0, 1), 0.05, 0.005, LED_BLUE, seg=32, tube=6)
yen.cyl(X0 + 0.3, YY1 - 0.14, TOP, TOP + 0.02, 0.07, FRAME, seg=14)                        # a small linen lamp at the console's far end
yen.cyl(X0 + 0.3, YY1 - 0.14, TOP + 0.02, TOP + 0.3, 0.008, FRAME, seg=6)
part('glow_ai_yen_lamp', yen_root).cyl(X0 + 0.3, YY1 - 0.14, TOP + 0.26, TOP + 0.44, 0.11, GLOW_SHADE, seg=20, r_top=0.09)
PHY = 15.17                                                                                 # the phone, upright on a little stand
yen.box(X0 + 0.3, X0 + 0.42, PHY - 0.045, PHY + 0.045, TOP, TOP + 0.02, FRAME)
yen.box(X0 + 0.32, X0 + 0.33, PHY - 0.038, PHY + 0.038, TOP + 0.02, TOP + 0.18, RUBBER, bevel=0.003)
quad(part('screen_yen_phone', yen_root, weight=0.5), ((X0 + 0.331, PHY - 0.034, TOP + 0.028), (X0 + 0.331, PHY + 0.034, TOP + 0.028), (X0 + 0.331, PHY + 0.034, TOP + 0.172), (X0 + 0.331, PHY - 0.034, TOP + 0.172)), SCREEN)

room_root = empty('room_ai', (0, 0, 0))
th_root.parent = lab_root.parent = yen_root.parent = room_root
ROOMS['ai'] = [p.build(parent or room_root) for p, parent in room_parts] + [room_root, th_root, lab_root, yen_root]
