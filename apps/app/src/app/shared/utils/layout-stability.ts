import { isPlatformBrowser } from '@angular/common';

/**
 * Waits for the layout to become stable by monitoring changes in document height.
 *
 * @param maxWaitMs Maximum time to wait in total.
 * @param quietWindowMs Time the height must remain unchanged to be considered stable.
 * @param platformId Optional platform ID for SSR safety.
 */
export async function waitForStableLayout(
  maxWaitMs: number = 3000,
  quietWindowMs: number = 150,
  platformId?: object
): Promise<void> {
  if (platformId && !isPlatformBrowser(platformId)) {
    return Promise.resolve();
  }

  // Fallback for environment where document might not be available
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  // Ensure fonts are loaded as they often cause layout shifts
  if ('fonts' in document) {
    try {
      await Promise.race([
        (document as any).fonts.ready,
        new Promise((resolve) => setTimeout(resolve, maxWaitMs)),
      ]);
    } catch (e) {
      // Ignore font loading errors
    }
  }

  return new Promise((resolve) => {
    let timeoutId: any;
    const startTime = Date.now();
    let lastHeight = document.documentElement.scrollHeight;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      resolve();
    };

    const checkStability = () => {
      const currentHeight = document.documentElement.scrollHeight;
      const now = Date.now();

      if (currentHeight !== lastHeight) {
        lastHeight = currentHeight;
        if (timeoutId) clearTimeout(timeoutId);

        if (now - startTime < maxWaitMs) {
          timeoutId = setTimeout(checkStability, quietWindowMs);
        } else {
          cleanup();
        }
      } else {
        cleanup();
      }
    };

    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(checkStability, quietWindowMs);
    });

    observer.observe(document.documentElement);

    // Initial check in case it's already stable
    timeoutId = setTimeout(checkStability, quietWindowMs);

    // Global safety timeout
    setTimeout(cleanup, maxWaitMs);
  });
}
