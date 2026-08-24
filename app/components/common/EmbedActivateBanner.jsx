import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

export function EmbedActivateBanner() {
  const fetcher = useFetcher();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [dismissed, setDismissed] = useState(false);
  const enabled = fetcher.data?.appEmbedEnabled;
  const activateUrl = fetcher.data?.themeEditorEmbed;

  const refresh = () => fetcherRef.current.load("/app/embed-status");

  useEffect(() => {
    refresh();
  }, []);

  if (dismissed || enabled !== false) return null;

  return (
    <div className="edd-embed-banner" role="status">
      <div className="edd-embed-banner__copy">
        <p className="edd-embed-banner__title">Estimated Delivery Date app is not activated yet.</p>
        <p className="edd-embed-banner__text">
          Please activate the app by clicking 'Activate' button below and then 'Save' in the following page.
        </p>
        <button
          type="button"
          className="edd-embed-banner__activate"
          onClick={() => {
            if (!activateUrl) return;
            window.open(activateUrl, "_blank", "noopener,noreferrer");
            refresh();
          }}
        >
          Activate
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
