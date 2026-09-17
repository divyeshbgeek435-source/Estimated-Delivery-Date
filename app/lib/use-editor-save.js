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
  const lastJobRef = useRef({ intent: "save", extras: {} });
  const submittedSnapshotRef = useRef(null);
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
    lastJobRef.current = { intent: job.intent, extras: job.extras };
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

  const enqueue = (intent, extras = {}) => {
    revisionRef.current += 1;
    pendingRef.current = {
      intent,
      extras,
      revision: revisionRef.current,
      draft: structuredClone(draftRef.current),
      tab: tabRef.current,
      snapshot: snapshotOf(),
    };
    lastJobRef.current = { intent, extras };
    setStatus(SAVE_STATUS.UNSAVED);
    if (fetcher.state === "idle") {
      const job = pendingRef.current;
      pendingRef.current = null;
      setStatus(SAVE_STATUS.SAVING);
      setErrors(null);
      submitJob(job);
    }
  };

  const retry = () => enqueue(lastJobRef.current.intent || "save", lastJobRef.current.extras || {});

  useEffect(() => {
    lastSavedRef.current = snapshotOf(draft, marker);
    pendingRef.current = null;
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
      setStatus(SAVE_STATUS.SAVING);
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
        } else if (!pendingRef.current) {
          setErrors(null);
          lastSavedRef.current = submittedSnapshotRef.current || snapshotOf();
          setStatus(snapshotOf() === lastSavedRef.current ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED);
        }
      } else if (!pendingRef.current) {
        // Stale response after a newer edit - don't leave the UI stuck on "Saving".
        setStatus(snapshotOf() === lastSavedRef.current ? SAVE_STATUS.SAVED : SAVE_STATUS.UNSAVED);
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
      setStatus(SAVE_STATUS.SAVING);
      setErrors(null);
      submitJob(job);
    }
  }, [fetcher.state, fetcher.data]);

  return {
    fetcher,
    status,
    errors,
    saving: status === SAVE_STATUS.SAVING || fetcher.state !== "idle",
    submitSave: (intent, extras = {}) => enqueue(intent, extras),
    retry,
  };
}
