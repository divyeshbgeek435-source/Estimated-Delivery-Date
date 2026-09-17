import { useEffect, useMemo, useState } from "react";
import { isValidTimeZone, resolveTimeZone, searchTimeZones, timezoneLabel } from "../../lib/timezone";
import { ActionButton } from "../common/ActionButton";

export function TimezonePicker({ value, onChange, error, name = "timezone" }) {
  const [picked, setPicked] = useState(() => resolveTimeZone(value));
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  useEffect(() => {
    setPicked(resolveTimeZone(value));
  }, [value]);

  const selected = resolveTimeZone(picked);
  const options = useMemo(
    () => (searching ? searchTimeZones(query, { selected, limit: 12 }) : []),
    [query, selected, searching],
  );

  const choose = (zone) => {
    if (!isValidTimeZone(zone)) return;
    setPicked(zone);
    onChange?.(zone);
    setQuery("");
  };

  return (
    <div className="edd-timezone edd-subsection">
      <input type="hidden" name={name} value={selected} />
      <s-stack gap="small-200">
        <s-text type="strong">Timezone</s-text>
        <s-paragraph color="subdued">Cutoff time and delivery dates use this timezone.</s-paragraph>
      <div className="edd-timezone-current">
        <s-icon type="globe" color="subdued" />
        <span>{timezoneLabel(selected)}</span>
      </div>
      <s-search-field
        label="Search timezones"
        value={query}
        placeholder="Search city or timezone, for example New York"
        labelAccessibilityVisibility="exclusive"
        onInput={(event) => setQuery(event.currentTarget.value)}
      ></s-search-field>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
      {searching ? (
        options.length ? (
          <div className="edd-timezone-list" role="listbox" aria-label="Timezones">
            {options.map((zone) => (
              <div
                key={zone}
                className="edd-selected-row"
                role="option"
                aria-selected={zone === selected}
                onClick={() => choose(zone)}
              >
                <s-text>{timezoneLabel(zone)}</s-text>
                <ActionButton
                  type="button"
                  variant={zone === selected ? "secondary" : "primary"}
                  onClick={() => choose(zone)}
                >
                  {zone === selected ? "Selected" : "Select"}
                </ActionButton>
              </div>
            ))}
          </div>
        ) : (
          <div className="edd-timezone-empty" role="status">
            <s-text type="strong">Not Found</s-text>
            <s-paragraph color="subdued">
              No timezone matches “{query.trim()}”. Try a city name such as London or Tokyo.
            </s-paragraph>
          </div>
        )
      ) : (
        <s-paragraph color="subdued">Search to change the selected timezone.</s-paragraph>
      )}
      </s-stack>
    </div>
  );
}
