import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Base path. GitHub Pages serves a project site from /<repo>/, so CI derives the
 * base from GITHUB_REPOSITORY ("owner/repo"). Locally the app runs from "/".
 * BASE_PATH overrides both, which lets a local build mimic the Pages layout.
 */
function resolveBase(): string {
  if (process.env.BASE_PATH) return process.env.BASE_PATH;
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  return repo ? `/${repo}/` : '/';
}

/** The Content Security Policy from the build brief. Injected into production HTML only,
 * because the Vite dev server relies on inline styles and websocket connections. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'coldboot-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      );
    },
  };
}

const base = resolveBase();

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    // Identifies the exact deploy in content reports: version plus the commit CI built from.
    __BUILD_ID__: JSON.stringify(`${process.env.npm_package_version ?? '1.0.0'}+${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icons/*.png', 'icons/*.ico', 'icons/*.svg'],
      manifest: {
        name: 'COLDBOOT',
        short_name: 'COLDBOOT',
        description: 'Revision for VCE Applied Computing: Software Development, Units 3 and 4.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: base,
        start_url: base,
        lang: 'en-AU',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    testTimeout: 20000,
    // The audience is in Melbourne; running tests there exercises AEST/AEDT changes around the 4 am rollover.
    env: { TZ: 'Australia/Melbourne' },
  },
});
