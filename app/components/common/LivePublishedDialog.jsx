import { storefrontPageLabel } from "../../lib/widget-status";

export function WidgetConfirmDialog({
  kind,
  name,
  location,
  scheduledLabel,
  onClose,
}) {
  if (!kind) return null;

  const page = storefrontPageLabel(location);
  const widgetName = name || "Your widget";
  const copy =
    kind === "live"
      ? {
          badge: "Live",
          badgeTone: "live",
          title: "Widget published",
          body: (
            <>
              <strong>{widgetName}</strong> is now live. The store block was added to the {page} automatically.
            </>
          ),
        }
      : kind === "schedule"
        ? {
            badge: "Scheduled",
            badgeTone: "schedule",
            title: "Widget scheduled",
            body: (
              <>
                <strong>{widgetName}</strong> is set up on the {page}
                {scheduledLabel ? ` and will go live on ${scheduledLabel}` : " and will go live at the selected time"}.
                The store block stays hidden until then.
              </>
            ),
          }
        : {
            badge: "Draft",
            badgeTone: "draft",
            title: "Widget saved as draft",
            body: (
              <>
                <strong>{widgetName}</strong> was saved as a draft. The store block on the {page} stays hidden until you publish.
              </>
            ),
          };

  return (
    <div className="edd-live-overlay" role="alertdialog" aria-modal="true" aria-labelledby="edd-live-title">
      <div className="edd-live-dialog">
        <p className={`edd-live-dialog__badge edd-live-dialog__badge--${copy.badgeTone}`}>{copy.badge}</p>
        <h2 id="edd-live-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <button type="button" className="edd-btn edd-btn--primary" onClick={() => onClose?.()}>
          Done
        </button>
      </div>
    </div>
  );
}

export function LivePublishedDialog({
  notices = [],
  onDismiss,
}) {
  const notice = notices[0];
  if (!notice) return null;

  return (
    <WidgetConfirmDialog
      kind="live"
      name={notice.name}
      location={notice.location}
      onClose={() => onDismiss(notice.id)}
    />
  );
}
