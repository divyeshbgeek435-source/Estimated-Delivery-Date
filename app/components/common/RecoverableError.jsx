import { useEffect } from "react";

const RELOAD_KEY = "edd.recover-reload";
const RELOAD_COOLDOWN_MS = 12000;

function scheduleReload() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return () => {};
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Private mode / blocked storage - still try once.
  }
  const timer = window.setTimeout(() => {
    window.location.reload();
  }, 400);
  return () => window.clearTimeout(timer);
}

export function RecoverableError() {
  useEffect(() => scheduleReload(), []);

  return (
    <div className="edd-recover">
      <p className="edd-recover__title">Connection interrupted</p>
      <p className="edd-recover__text">The app lost its connection to the server. Reloading…</p>
      <button type="button" className="edd-btn edd-btn--primary" onClick={() => window.location.reload()}>
        Reload now
      </button>
    </div>
  );
}
