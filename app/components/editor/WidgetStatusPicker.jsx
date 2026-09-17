import { defaultScheduleValue, SAVE_ACTIONS, storefrontPageLabel } from "../../lib/widget-status";

export function WidgetStatusPicker({ location, value, onChange, scheduleAt, onScheduleAtChange }) {
  const page = storefrontPageLabel(location);

  return (
    <div className="edd-status-picker">
      <p className="edd-status-picker__title">Widget status</p>
      <div className="edd-publish-when">
        <label className="edd-publish-option">
          <input
            type="radio"
            name="saveAction"
            value={SAVE_ACTIONS.DRAFT}
            checked={value === SAVE_ACTIONS.DRAFT}
            onChange={() => onChange(SAVE_ACTIONS.DRAFT)}
          />
          <span>
            <strong>Draft</strong>
            <span className="edd-publish-option__help">
              Save the widget and keep the store block hidden on the {page}.
            </span>
          </span>
        </label>
        <label className="edd-publish-option">
          <input
            type="radio"
            name="saveAction"
            value={SAVE_ACTIONS.SCHEDULE}
            checked={value === SAVE_ACTIONS.SCHEDULE}
            onChange={() => onChange(SAVE_ACTIONS.SCHEDULE)}
          />
          <span>
            <strong>Schedule</strong>
            <span className="edd-publish-option__help">
              Add the store block to the {page} and display it automatically at the date and time you choose.
            </span>
          </span>
        </label>
        <label className="edd-publish-option">
          <input
            type="radio"
            name="saveAction"
            value={SAVE_ACTIONS.PUBLISH}
            checked={value === SAVE_ACTIONS.PUBLISH}
            onChange={() => onChange(SAVE_ACTIONS.PUBLISH)}
          />
          <span>
            <strong>Publish</strong>
            <span className="edd-publish-option__help">
              Add or update the store block on the {page} and display it immediately.
            </span>
          </span>
        </label>
      </div>

      {value === SAVE_ACTIONS.SCHEDULE ? (
        <label className="edd-field edd-publish-when__time">
          <span>Date and time</span>
          <input
            className="edd-input"
            type="datetime-local"
            value={scheduleAt}
            min={defaultScheduleValue()}
            onChange={(event) => onScheduleAtChange(event.currentTarget.value)}
          />
        </label>
      ) : null}
    </div>
  );
}
