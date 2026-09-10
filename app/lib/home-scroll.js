const SCROLL_KEY = "edd.home.scrollY";
const FOCUS_KEY = "edd.home.focusWidget";

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberHomeScroll() {
  const store = storage();
  if (!store) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  store.setItem(SCROLL_KEY, String(Math.max(0, Math.round(y))));
}

export function rememberHomeFocusWidget(widgetId) {
  const store = storage();
  if (!store || !widgetId) return;
  store.setItem(FOCUS_KEY, String(widgetId));
}

export function homeWidgetAnchorId(widgetId) {
  return `edd-widget-${widgetId}`;
}

export function peekHomeReturnState() {
  const store = storage();
  if (!store) return { scrollY: null, widgetId: null };

  const scrollRaw = store.getItem(SCROLL_KEY);
  const widgetId = store.getItem(FOCUS_KEY);
  const scrollY = scrollRaw == null ? null : Number(scrollRaw);
  return {
    scrollY: Number.isFinite(scrollY) ? scrollY : null,
    widgetId: widgetId || null,
  };
}

export function clearHomeReturnState() {
  const store = storage();
  if (!store) return;
  store.removeItem(SCROLL_KEY);
  store.removeItem(FOCUS_KEY);
}

/** @deprecated Prefer peek + clear after restore; kept for callers that still consume once. */
export function consumeHomeReturnState() {
  const state = peekHomeReturnState();
  clearHomeReturnState();
  return state;
}

export function restoreHomePosition({ widgetId, scrollY, onDone } = {}) {
  if (typeof window === "undefined") return;

  const finish = () => {
    onDone?.();
  };

  const run = () => {
    if (widgetId) {
      const node = document.getElementById(homeWidgetAnchorId(widgetId));
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
        node.classList.add("edd-widget-row--flash");
        window.setTimeout(() => node.classList.remove("edd-widget-row--flash"), 1600);
        finish();
        return;
      }
    }
    if (scrollY != null) {
      window.scrollTo({ top: scrollY, behavior: "auto" });
    }
    finish();
  };

  window.requestAnimationFrame(() => {
    window.setTimeout(run, 40);
  });
}
