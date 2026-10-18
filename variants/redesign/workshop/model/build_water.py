# Makes water-normal-raw.png, the lake's ripple map: a 512 px tile (it repeats exactly) of small waves on still water, as a normal map
# (red = x, green = z of the lake, blue up). Nothing in it is a photograph: filtered noise with a wave-like spectrum (power falling
# with spatial frequency, nothing coarser than 3 waves to the tile and nothing finer than a pixel can show), slopes taken in
# the frequency domain so the edges meet. room.js stretches it across the lake and drifts two scales of it against each other.
# Run through build-house.sh (which turns the png into water-normal.webp):  blender -b --python build_water.py -- out.png
# (Blender only supplies numpy.)
import struct
import sys
import zlib

import numpy as np

out = sys.argv[sys.argv.index('--') + 1]
N = 512
rng = np.random.default_rng(31)
f = np.fft.fftfreq(N) * N
kx, ky = np.meshgrid(f, f)
k = np.hypot(kx, ky)
k[0, 0] = 1
spec = np.fft.fft2(rng.normal(0, 1, (N, N))) * k ** -1.5 * (k > 3) * np.exp(-(k / 60) ** 2) * (0.7 + 0.3 * np.abs(ky / k))
gx = np.real(np.fft.ifft2(1j * kx * spec))
gy = np.real(np.fft.ifft2(1j * ky * spec))
s = 0.32 / np.sqrt((gx ** 2 + gy ** 2).mean())  # the slopes' spread
n = np.stack([-gx * s, -gy * s, np.ones((N, N))], 2)
n = n / np.linalg.norm(n, axis=2, keepdims=True)
rows = np.round((n * 0.5 + 0.5) * 255).astype(np.uint8)


def png(path, a):
    h, w, _ = a.shape
    raw = b''.join(b'\x00' + a[y].tobytes() for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


png(out, rows)
