import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env.API_KEY even in a Vite environment
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});