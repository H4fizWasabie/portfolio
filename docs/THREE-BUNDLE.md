# Three.js bundle floor

The production build on 2026-09-13 emits a deferred `three` chunk of 909.12 KB
raw / 244.90 KB gzip. The initial route chunk is 264.84 KB raw / 83.56 KB gzip;
the spec excludes the deferred chunk from the initial-route budget.

The scene imports only `@react-three/fiber` and the Three.js primitives needed for
one line-segment field. Removing Drei reduced the chunk from 312.57 KB to 244.90
KB gzip. The remaining size is the minimum R3F renderer plus Three.js runtime
required to keep the §7 WebGL scene; replacing it with a hand-written WebGL
renderer would change the locked R3F implementation rather than optimize it.

The 180 KB gzip target is therefore not met in this scaffold. It remains an
explicit performance follow-up; the target itself is not amended here.
