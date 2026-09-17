import { useEffect, useRef, useState } from "react";
import { loadAdminJson } from "../../lib/admin-json";

export function EmbedActivateBanner() {
  const [data, setData] = useState(null);
  const inFlight = useRef(false);
  const openedEditor = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const enabled = data?.appEmbedEnabled;
  const activateUrl = data?.themeEditorEmbed;

  const refresh = (fresh = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    loadAdminJson(fresh ? "/app/embed-status?fresh=1" : "/app/embed-status")
      .then((payload) => {
        if (payload) setData(payload);
      })
      .finally(() => {
        inFlight.current = false;
      });
  };

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!openedEditor.current) return;
      openedEditor.current = false;
      refresh(true);
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (dismissed || enabled !== false || data?.missingThemeAccess) return null;

  return (
    <div className="edd-embed-banner" role="status">
      <div className="edd-embed-banner__copy">
        <p className="edd-embed-banner__title">Estimated Delivery Date app is not activated yet.</p>
        <p className="edd-embed-banner__text">
          Open the theme editor, turn on Estimated delivery embed, then click Save.
        </p>
        <button
          type="button"
          className="edd-embed-banner__activate"
          onClick={() => {
            if (!activateUrl) return;
            openedEditor.current = true;
            window.open(activateUrl, "_blank", "noopener,noreferrer");
          }}
        >
          Open theme editor
        </button>
      </div>
      <button
        type="button"
        className="edd-embed-banner__close"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
    </div>
  );
}
