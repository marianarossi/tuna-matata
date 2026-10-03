import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tuna Matata',
        short_name: 'Tuna Matata',
        description: 'Estoque, receitas, cardápio da semana e lista de compras.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f7fb',
        theme_color: '#1b4f9c',
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: {
    // O Firebase sozinho já passa de 500 kB; não é problema para este app.
    chunkSizeWarningLimit: 900,
  },
  test: {
    passWithNoTests: true,
  },
});
