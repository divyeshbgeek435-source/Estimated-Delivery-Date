export function PlacementConflictDialog({
  open,
  title = "Another widget is already live",
  body,
  candidate,
  conflicts = [],
  confirming = false,
  onChoose,
  onCancel,
}) {
  if (!open) return null;

  const options = [];
  if (candidate?.id) {
    options.push({
      id: candidate.id,
      name: candidate.name || "This widget",
      placementLabel: candidate.placementLabel || "Current placement",
      overlap: candidate.overlap || "",
      isCandidate: true,
    });
  }
  for (const item of conflicts || []) {
    if (!item?.id || options.some((option) => option.id === item.id)) continue;
    options.push({
      id: item.id,
      name: item.name || "Live widget",
      placementLabel: item.placementLabel || item.overlap || "Overlapping placement",
      overlap: item.overlap || "",
      isCandidate: false,
    });
  }

  const summary =
    body ||
    "Choose which widget should stay live. Only the one you choose will be published.";

  return (
    <div
      className="edd-live-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="edd-conflict-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !confirming) onCancel?.();
      }}
    >
      <div className="edd-live-dialog edd-conflict-dialog">
        <p className="edd-live-dialog__badge edd-live-dialog__badge--schedule">Conflict</p>
        <h2 id="edd-conflict-title">{title}</h2>
        <p>{summary}</p>

        <div className="edd-conflict-dialog__list" role="list">
          {options.map((item) => (
            <div
              key={item.id}
              className={`edd-conflict-dialog__item${item.isCandidate ? " edd-conflict-dialog__item--candidate" : ""}`}
              role="listitem"
            >
              <div className="edd-conflict-dialog__item-copy">
                <strong>{item.name}</strong>
                <span>{item.placementLabel}</span>
                {item.overlap ? <span className="edd-conflict-dialog__overlap">{item.overlap}</span> : null}
              </div>
              <button
                type="button"
                className="edd-btn edd-btn--primary edd-conflict-dialog__choose"
                disabled={confirming}
                onClick={() => onChoose?.(item.id)}
              >
                {confirming ? "Updating…" : "Choose"}
              </button>
            </div>
          ))}
        </div>

        <div className="edd-dialog__actions">
          <button type="button" className="edd-btn" disabled={confirming} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
