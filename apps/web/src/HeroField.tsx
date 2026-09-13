import { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { LineSegments } from 'three';

function Field() {
  const ref = useRef<LineSegments>(null); const { invalidate } = useThree();
  useEffect(() => { const update = () => { if (ref.current) ref.current.rotation.y = scrollY / innerHeight * 0.08; invalidate(); }; addEventListener('scroll', update, { passive: true }); addEventListener('pointermove', update, { passive: true }); return () => { removeEventListener('scroll', update); removeEventListener('pointermove', update); }; }, [invalidate]);
  const points = Array.from({ length: 900 }, (_, i) => i % 3 === 0 ? i % 30 - 15 : i % 3 === 1 ? Math.floor(i / 30) % 15 - 7 : Math.sin(i * 0.08) * 0.5);
  return <lineSegments ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(points), 3]} count={300} itemSize={3} /></bufferGeometry><lineBasicMaterial color="#C6FF4A" transparent opacity={0.35} /></lineSegments>;
}
export default function HeroField() {
  const [enabled, setEnabled] = useState(false); const [active, setActive] = useState(true); const poster = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; setEnabled(innerWidth >= 900 && !reduced && !!document.createElement('canvas').getContext('webgl')); }, []);
  useEffect(() => { const c = poster.current; if (!c || enabled) return; const x = c.getContext('2d'); if (!x) return; c.width = c.clientWidth * devicePixelRatio; c.height = c.clientHeight * devicePixelRatio; x.scale(devicePixelRatio, devicePixelRatio); x.strokeStyle = 'rgba(198,255,74,.35)'; for (let y = 20; y < c.clientHeight; y += 28) { x.beginPath(); for (let p = 0; p < c.clientWidth; p += 24) x.lineTo(p, y + Math.sin(p * 0.025 + y * 0.03) * 12); x.stroke(); } }, [enabled]);
  useEffect(() => { if (!enabled) return; const target = document.querySelector('.hero-poster'); if (!target) return; const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 }); observer.observe(target); return () => observer.disconnect(); }, [enabled]);
  return enabled ? <Canvas className="hero-poster" frameloop={active ? 'demand' : 'never'} dpr={[1, 1.5]} camera={{ position: [0, 0, 12] }}><Field /></Canvas> : <canvas className="hero-poster" ref={poster} aria-hidden="true" />;
}
