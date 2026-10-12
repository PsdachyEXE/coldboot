/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __BUILD_ID__: string;

/** Per-KK item counts and case study sizes, computed from the content files at build time (vite.config.ts). */
declare module 'virtual:coldboot-content-summary' {
  const summary: import('./content/summary').ContentSummary;
  export default summary;
}
