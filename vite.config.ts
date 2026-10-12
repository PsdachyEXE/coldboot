import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// Extensions on purpose: Vite's native config loader (a future default) resolves files as written.
import { summarise, type SummaryInput } from './src/content/summary.ts';

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

/**
 * Preloads the Latin subsets of the two variable fonts. The entry chunk is small enough that the
 * first render can beat the fonts, and the swap from the fallback font then moves the page (CLS).
 */
function fontPreloadPlugin(base: string): Plugin {
  return {
    name: 'coldboot-font-preload',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const fonts = Object.keys(ctx.bundle ?? {}).filter((f) => /(atkinson-hyperlegible-next|martian-mono)-latin-wght-normal-[\w-]+\.woff2$/.test(f));
        return fonts.map((f) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `${base}${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head' as const,
        }));
      },
    },
  };
}

/**
 * Builds `virtual:coldboot-content-summary` from the content files: per-KK item counts and the
 * case studies' sizes (src/content/summary.ts). It lets the Drill and Written setup screens paint
 * without waiting for the content chunks, which matters on a phone's first visit.
 */
function contentSummaryPlugin(): Plugin {
  const id = 'virtual:coldboot-content-summary';
  const resolved = `\0${id}`;
  const root = fileURLToPath(new URL('./content', import.meta.url));
  return {
    name: 'coldboot-content-summary',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loadId) {
      if (loadId !== resolved) return undefined;
      const read = <T,>(file: string, fallback: T): T => {
        const path = join(root, file);
        this.addWatchFile(path);
        return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
      };
      type Items = SummaryInput['cards'];
      const areas = ['u3o1', 'u3o2', 'u4o1', 'u4o2'].map((a) => ({
        cards: read<Items>(`${a}/cards.json`, []),
        mcq: read<Items>(`${a}/mcq.json`, []),
        short: read<Items>(`${a}/short.json`, []),
      }));
      const terms = read<Items>('terms.json', []);
      const psm = read<{ cards: Items; mcq: Items; short: Items }>('psm.json', { cards: [], mcq: [], short: [] });
      // The loader sorts case study files by path, so they come out in id order.
      const caseDir = join(root, 'case-studies');
      const caseStudies = (existsSync(caseDir) ? readdirSync(caseDir) : [])
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => read<SummaryInput['caseStudies'][number]>(`case-studies/${f}`, { id: '', title: '', questions: [], totalMarks: 0 }));
      const summary = summarise({
        cards: [...areas.flatMap((a) => a.cards), ...terms, ...psm.cards],
        mcq: [...areas.flatMap((a) => a.mcq), ...psm.mcq],
        short: [...areas.flatMap((a) => a.short), ...psm.short],
        caseStudies,
      });
      return `export default ${JSON.stringify(summary)};`;
    },
  };
}

/**
 * What the build calls itself: the last commit that changed anything the app ships, not the
 * commit being deployed. A push that only changes docs, tests or CI then rebuilds byte-identical
 * files, the service worker doesn't change, and nobody is asked to reload for nothing. deploy.yml
 * checks out full history for this; without git history it falls back to GITHUB_SHA and now.
 */
const SHIPPED_PATHS = [
  'src',
  'content',
  'public',
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  ':(exclude,glob)**/*.test.ts',
  ':(exclude,glob)**/*.test.tsx',
  ':(exclude)content/README.md',
];

function sourceRevision(): { sha: string; time: string } {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%H %cI', '--', ...SHIPPED_PATHS], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [sha, time] = out.split(' ');
    const date = new Date(time ?? '');
    if (sha && Number.isFinite(date.getTime())) return { sha: sha.slice(0, 7), time: date.toISOString() };
  } catch {
    // Not a git checkout (a source archive): fall through.
  }
  return { sha: (process.env.GITHUB_SHA ?? 'local').slice(0, 7), time: new Date().toISOString() };
}

const base = resolveBase();
const revision = sourceRevision();
const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // Identifies the shipped source in content reports: version plus the last commit that changed it.
    __BUILD_ID__: JSON.stringify(`${version}+${revision.sha}`),
    // When that commit was made (Settings shows it as "Updated").
    __BUILD_TIME__: JSON.stringify(revision.time),
  },
  plugins: [
    react(),
    contentSummaryPlugin(),
    cspPlugin(),
    fontPreloadPlugin(base),
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
    // Warn when a chunk passes 500 kB, so a regression in the entry chunk shows up in the build log.
    chunkSizeWarningLimit: 500,
    // The CSP allows fonts from 'self' only, so a small font subset must never be inlined as a data: URI.
    assetsInlineLimit: (file: string) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
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
