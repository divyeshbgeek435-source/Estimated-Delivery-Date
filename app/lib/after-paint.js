/** Run after the first frame is painted so background work does not compete with LCP. */
export function afterPaint(fn) {
  if (typeof window === "undefined") return () => {};

  let idleId = 0;
  let timeoutId = 0;
  let outerRaf = 0;
  let innerRaf = 0;
  let cancelled = false;

  const run = () => {
    if (!cancelled) fn();
  };

  outerRaf = window.requestAnimationFrame(() => {
    innerRaf = window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(run, { timeout: 1200 });
        return;
      }
      timeoutId = window.setTimeout(run, 0);
    });
  });

  return () => {
    cancelled = true;
    if (outerRaf) window.cancelAnimationFrame(outerRaf);
    if (innerRaf) window.cancelAnimationFrame(innerRaf);
    if (idleId && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleId);
    }
    if (timeoutId) window.clearTimeout(timeoutId);
  };
}
