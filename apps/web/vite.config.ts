import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], publicDir: 'public', server: { port: 5173 }, build: { rollupOptions: { output: { manualChunks: { three: ['three', '@react-three/fiber'] } } } } });
