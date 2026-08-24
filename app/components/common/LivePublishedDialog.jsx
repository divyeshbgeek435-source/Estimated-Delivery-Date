import { openProductPageEditor } from "../../lib/open-theme-editor";

export function LivePublishedDialog({ notices = [], editorUrl, onDismiss }) {
  const notice = notices[0];
  if (!notice) return null;

  const goToStore = () => {
    openProductPageEditor(editorUrl);
    onDismiss(notice.id);
  };

  return (
    <div className="edd-live-overlay" role="alertdialog" aria-modal="true" aria-labelledby="edd-live-title">
      <div className="edd-live-dialog">
        <p className="edd-live-dialog__badge">Live</p>
        <h2 id="edd-live-title">Widget published</h2>
        <p>
          {notice.name ? <strong>{notice.name}</strong> : "Your widget"} is now live. Open the product page to add
          the Estimated delivery block, then click Save.
        </p>
        <button type="button" className="edd-btn edd-btn--primary" onClick={goToStore}>
          Go to Store
        </button>
      </div>
    </div>
  );
}
