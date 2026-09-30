/** Hands the user a file to save, built in memory. Same-origin, so the CSP allows it. */

/**
 * Downloads `data` as pretty-printed JSON named `filename`. Returns false when the browser
 * refused (the caller says so and suggests another way).
 */
export function downloadJson(filename: string, data: unknown): boolean {
  let url: string | null = null;
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    const done = url;
    setTimeout(() => URL.revokeObjectURL(done), 10_000);
    return true;
  } catch {
    if (url) URL.revokeObjectURL(url);
    return false;
  }
}
