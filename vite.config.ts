import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

const APP_VERSION = process.env.npm_package_version || '2.4.0';
const BUILD_TIME = new Date().toISOString();
const BUILD_ID = process.env.BUILD_ID || process.env.VITE_APP_BUILD_ID || `v${APP_VERSION}-${Date.now()}`;

export default defineConfig(({ command }) => {
  return {
    base: process.env.CAPACITOR_BUILD ? './' : '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'generate-version-file',
        buildStart() {
          try {
            const publicDir = path.resolve(__dirname, 'public');
            if (!fs.existsSync(publicDir)) {
              fs.mkdirSync(publicDir, { recursive: true });
            }
            const versionPayload = {
              version: APP_VERSION,
              buildId: BUILD_ID,
              builtAt: BUILD_TIME,
            };
            fs.writeFileSync(
              path.join(publicDir, 'version.json'),
              JSON.stringify(versionPayload, null, 2)
            );
          } catch (err) {
            console.warn('[Vite build] Could not write public/version.json:', err);
          }
        },
      },
    ],
    define: {
      __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
      __APP_VERSION__: JSON.stringify(APP_VERSION),
      __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIME),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      ws: false,
      watch: {
        ignored: ['**/ios/**', '**/android/**', '**/dist/**'],
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
  };
});
