
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to avoid TypeScript error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // CRITICAL FOR GITHUB PAGES / NETLIFY:
    // This ensures assets are loaded via relative paths, preventing white screens on deployment.
    base: './', 
    define: {
      // This ensures process.env.API_KEY is replaced with the actual value during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // Disable sourcemaps for production to save space
      minify: 'esbuild',
      chunkSizeWarningLimit: 1600,
    },
    server: {
      port: 3000
    }
  };
});
