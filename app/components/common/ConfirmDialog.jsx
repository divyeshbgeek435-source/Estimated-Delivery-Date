import { useEffect, useId, useRef } from "react";

function DialogIcon({ tone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path
          d="M7.5 12.4 10.4 15.3 16.6 8.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
      <path
        d="M9 4.75h6M5.75 7.5h12.5M9.5 7.5V18.2a1.3 1.3 0 0 0 1.3 1.3h2.4a1.3 1.3 0 0 0 1.3-1.3V7.5M10.5 11v5M13.5 11v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  tone = "neutral",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirming = false,
  hideCancel = false,
}) {
  const titleId = useId();
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape" && !confirming) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => {
      (hideCancel ? confirmRef : cancelRef).current?.focus();
    }, 40);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open, confirming, hideCancel, onCancel]);

  if (!open) return null;

  return (
    <div
      className="edd-dialog-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-busy={confirming || undefined}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !confirming) onCancel?.();
      }}
    >
      <div className={`edd-dialog edd-dialog--${tone}`}>
        <div className="edd-dialog__icon" aria-hidden="true">
          <DialogIcon tone={tone} />
        </div>
        <h2 id={titleId}>{title}</h2>
        <p>{body}</p>
        <div className="edd-dialog__actions">
          {hideCancel ? null : (
            <button
              ref={cancelRef}
              type="button"
              className="edd-btn"
              disabled={confirming}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={tone === "danger" ? "edd-btn edd-btn--danger" : "edd-btn edd-btn--primary"}
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
