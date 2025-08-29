import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    command === 'serve' &&
    componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.supabase\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'beree-512x512.png', 'beree-192x192.png'],
      manifest: {
        name: 'Bérée 365 - Lisez la Bible en un an',
        short_name: 'Bérée 365',
        description: 'Application de suivi de lecture de la Bible en un an',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'lifestyle', 'books'],
        icons: [
          {
            src: 'beree-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'beree-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ],
        shortcuts: [
          {
            name: "Lecture du jour",
            short_name: "Aujourd'hui",
            description: "Accéder à la lecture du jour",
            url: "/reading",
            icons: [{ src: "beree-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Tableau de bord",
            short_name: "Dashboard",
            description: "Voir mes statistiques de lecture",
            url: "/dashboard",
            icons: [{ src: "beree-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
