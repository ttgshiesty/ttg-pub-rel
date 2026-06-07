import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    envDir: path.resolve(__dirname, '..'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: process.env.NODE_ENV !== 'production',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // Isolate the 10MB item database so it's cached independently
            if (id.includes('items-master.json') || id.includes('lib/itemDb'))
              return 'data-items';
            if (
              id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')
            )
              return 'vendor-react';
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            if (id.includes('node_modules/recharts')) return 'vendor-recharts';
            if (id.includes('node_modules/jspdf')) return 'vendor-jspdf';
            if (id.includes('node_modules/html2canvas'))
              return 'vendor-html2canvas';
            if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
             if (id.includes('pages/DashboardPage')) return 'page-dashboard';
            if (id.includes('pages/MarketplacePage')) return 'page-marketplace';
             if (id.includes('pages/BlueprintsPage')) return 'page-blueprints';
            if (id.includes('pages/StashPage')) return 'page-stash';
            if (id.includes('pages/LoadoutPage')) return 'page-loadout';
            if (id.includes('pages/SkillTreePage')) return 'page-skilltree';
            if (id.includes('pages/CodexPage')) return 'page-codex';
            if (id.includes('pages/RaidHistoryPage')) return 'page-raidhistory';
            if (id.includes('pages/StatTrendsPage')) return 'page-trends';
            if (id.includes('pages/MyProfilePage')) return 'page-profile';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
