import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

export const SAVE_STATUS = {
  SAVED: "saved",
  UNSAVED: "unsaved",
  SAVING: "saving",
  ERROR: "error",
};

export function useEditorSave({ draft, tab, widgetId, marker = "", enabled = true }) {
  const fetcher = useFetcher();
  const draftRef = useRef(draft);
  const tabRef = useRef(tab);
  const markerRef = useRef(marker);
  const lastSavedRef = useRef(null);
  const revisionRef = useRef(0);
  const inFlightRef = useRef(0);
  const pendingRef = useRef(null);
  const lastJobRef = useRef({ intent: "save", extras: {}, silent: false });
  const submittedSnapshotRef = useRef(null);
  const silentJobRef = useRef(false);
  const handledRef = useRef("");
  const [status, setStatus] = useState(SAVE_STATUS.SAVED);
  const [errors, setErrors] = useState(null);
  draftRef.current = draft;
  tabRef.current = tab;
  markerRef.current = marker;

  const snapshotOf = (nextDraft = draftRef.current, nextMarker = markerRef.current) =>
    JSON.stringify({ draft: nextDraft, marker: nextMarker });

  const submitJob = (job) => {
    inFlightRef.current = job.revision;
    submittedSnapshotRef.current = job.snapshot;
    silentJobRef.current = Boolean(job.silent);
    lastJobRef.current = { intent: job.intent, extras: job.extras, silent: Boolean(job.silent) };
    fetcher.submit(
      {
        intent: job.intent,
        currentStep: job.tab,
        editorState: JSON.stringify(job.draft),
        saveRevision: String(job.revision),
        ...job.extras,
      },
      { method: "post", preventScrollReset: true },
    );
  };

  /**
   * @param {string} intent
   * @param {object} extras
   * @param {object} [draftOverride]
   * @param {{ silent?: boolean }} [options] silent=true skips Unsaved/save-bar UI
   */
  const enqueue = (intent, extras = {}, draftOverride, options = {}) => {
    const silent = Boolean(options.silent);
    revisionRef.current += 1;
    if (draftOverride) draftRef.current = draftOverride;
    const draftSnapshot = structuredClone(draftOverride ?? draftRef.current);
    const snapshot = JSON.stringify({ draft: draftSnapshot, marker: markerRef.current });
    pendingRef.current = {
      intent,
      extras,
      revision: revisionRef.current,
      draft: draftSnapshot,
      tab: tabRef.current,
      snapshot,
      silent,
    };
    lastJobRef.current = { intent, extras, silent };
    if (silent) {
      // Treat applied draft as saved immediately - no Unsaved / Saving / save bar.
      lastSavedRef.current = snapshot;
      submittedSnapshotRef.current = snapshot;
      setStatus(SAVE_STATUS.SAVED);
    } else {
      setStatus(SAVE_STATUS.UNSAVED);
    }
    if (fetcher.state === "idle") {
      const job = pendingRef.current;
      pendingRef.current = null;
      if (!job.silent) {
        setStatus(SAVE_STATUS.SAVING);
        setErrors(null);
      }
      submitJob(job);
    }
  };

  const retry = () =>
    enqueue(lastJobRef.current.intent || "save", lastJobRef.current.extras || {}, undefined, {
      silent: Boolean(lastJobRef.current.silent),
    });

  useEffect(() => {
    lastSavedRef.current = snapshotOf(draft, marker);
    pendingRef.current = null;
    silentJobRef.current = false;
    setStatus(SAVE_STATUS.SAVED);
    setErrors(null);
  }, [widgetId]);

  useEffect(() => {
    if (status !== SAVE_STATUS.UNSAVED && status !== SAVE_STATUS.ERROR) return undefined;
    let ignore = false;
    const onLeave = (event) => {
      if (ignore) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const onFullReload = () => {
      ignore = true;
    };
    window.addEventListener("beforeunload", onLeave);
    import.meta.hot?.on("vite:beforeFullReload", onFullReload);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === null) {
      lastSavedRef.current = snapshotOf(draft, marker);
      return;
    }
    const dirty = snapshotOf(draft, marker) !== lastSavedRef.current;
    setStatus((current) => {
      if (current === SAVE_STATUS.SAVING) return current;
      if (current === SAVE_STATUS.ERROR && dirty) return SAVE_STATUS.UNSAVED;
      return dirty ? SAVE_STATUS.UNSAVED : SAVE_STATUS.SAVED;
    });
  }, [draft, marker, enabled]);

  useEffect(() => {
    if (fetcher.state !== "idle") {
      if (!silentJobRef.current) setStatus(SAVE_STATUS.SAVING);
      return;
    }

    const data = fetcher.data;
    const token = data
      ? `${data.revision}:${data.ok}:${data.silent}:${JSON.stringify(data.errors || null)}:${data.widget?.updatedAt || ""}`
      : "";
    if (data && token && handledRef.current !== token) {
      handledRef.current = token;
      const revision = Number(data.revision || 0);
      const isCurrent = !revision || revision === inFlightRef.current;
      if (isCurrent) {
        if (data.errors) {
          setErrors(data.errors);
          setStatus(SAVE_STATUS.ERROR);
          silentJobRef.current = false;
        } else if (!pendingRef.current) {
          setErrors(null);
          lastSavedRef.current = submittedSnapshotRef.current || snapshotOf();
          silentJobRef.current = false;
          // Re-check in case the merchant edited again while silent save was in flight.
          setStatus(snapshotOf() === lastSavedRef.current ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED);
        }
      } else if (!pendingRef.current) {
        setStatus(snapshotOf() === lastSavedRef.current ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED);
        silentJobRef.current = false;
      }
    } else if (!pendingRef.current) {
      setStatus((current) => {
        if (current !== SAVE_STATUS.SAVING) return current;
        return snapshotOf() === lastSavedRef.current ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED;
      });
    }

    if (pendingRef.current) {
      const job = pendingRef.current;
      pendingRef.current = null;
      if (!job.silent) {
        setStatus(SAVE_STATUS.SAVING);
        setErrors(null);
      } else {
        lastSavedRef.current = job.snapshot;
        submittedSnapshotRef.current = job.snapshot;
        setStatus(SAVE_STATUS.SAVED);
      }
      submitJob(job);
    }
  }, [fetcher.state, fetcher.data]);

  return {
    fetcher,
    status,
    errors,
    saving: status === SAVE_STATUS.SAVING || (fetcher.state !== "idle" && !silentJobRef.current),
    submitSave: (intent, extras = {}, draftOverride, options) =>
      enqueue(intent, extras, draftOverride, options),
    retry,
    restoreSaved: () => {
      pendingRef.current = null;
      silentJobRef.current = false;
      setErrors(null);
      setStatus(SAVE_STATUS.SAVED);
      if (!lastSavedRef.current) {
        return { draft: structuredClone(draftRef.current), marker: markerRef.current };
      }
      try {
        return JSON.parse(lastSavedRef.current);
      } catch {
        return { draft: structuredClone(draftRef.current), marker: markerRef.current };
      }
    },
  };
}
