import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['nexus-logo.svg'],
        manifest: {
          name: 'NEXUS ERP',
          short_name: 'NEXUS',
          description: 'Le Cœur Numérique de Votre Entreprise',
          theme_color: '#ffffff',
          icons: [
            {
              src: '/nexus-logo.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: '/nexus-logo.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: '/nexus-logo.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
