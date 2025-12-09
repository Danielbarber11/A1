import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    // CRITICAL FOR GITHUB PAGES:
    // This ensures assets are loaded via relative paths (e.g. "./assets/...")
    // so the app works in a subfolder (https://username.github.io/repo-name/).
    base: './', 
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1600,
    },
    server: {
      port: 3000
    }
  };
});