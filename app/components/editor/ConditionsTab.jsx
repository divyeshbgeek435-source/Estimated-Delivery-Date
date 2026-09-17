import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { MARKET_SCOPES, ensureScopes } from "../../lib/app-scopes";
import { WORKING_DAYS, WIDGET_LOCATIONS } from "../../lib/constants";
import { joinCutoff, splitCutoff } from "../../lib/delivery-calculator";
import { boundedIntFromEvent, intFieldValue, CUTOFF_LIMITS, SHIPPING_DAY_LIMITS, SHIPPING_DAY_MAX } from "../../lib/number-input";
import { widgetProfile } from "../../lib/widget-profiles";
import { ActionButton, HostChoiceList } from "../common/ActionButton";
import { PincodeRulesEditor } from "./PincodeRulesEditor";
import { hasWeightDisplayChoice, WeightDisplayPicker } from "./WeightDisplayPicker";
import { DeliveryRequestsPanel } from "./DeliveryRequestsPanel";
import { resolveTimeZone } from "../../lib/timezone";
import { TimezonePicker } from "./TimezonePicker";

const DAY_SHORT = {
  MONDAY: "M",
  TUESDAY: "T",
  WEDNESDAY: "W",
  THURSDAY: "Th",
  FRIDAY: "F",
  SATURDAY: "Sa",
  SUNDAY: "S",
};

function onDayInput(event, key, bounds, onChange) {
  const parsed = boundedIntFromEvent(event, bounds);
  if (parsed == null) return;
  onChange({ [key]: parsed });
}

function DaysLimitNote() {
  return (
    <s-paragraph color="subdued">Maximum allowed duration is {SHIPPING_DAY_MAX} days.</s-paragraph>
  );
}

export function ConditionsTab({ widget, draft, onChange, errors = {}, deliveryRequests = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const shipping = draft.shippingRules;
  const profile = widgetProfile(widget.location);
  const isCreateSetup = searchParams.get("created") === "1";
  const shouldAutoOpenWeight =
    widget.location === WIDGET_LOCATIONS.PRODUCT &&
    isCreateSetup &&
    !hasWeightDisplayChoice(shipping);

  useEffect(() => {
    if (!isCreateSetup) return;
    // Drop the one-time create flag so reload / later edits never auto-open the popup.
    const next = new URLSearchParams(searchParams);
    next.delete("created");
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }, [isCreateSetup, searchParams, setSearchParams]);

  const setShipping = (patch) =>
    onChange((current) => ({
      ...(current || {}),
      shippingRules: {
        ...(current?.shippingRules || {}),
        ...patch,
      },
    }));
  const setDraftFields = (patch) =>
    onChange((current) => ({
      ...(current || {}),
      ...patch,
    }));

  return (
    <s-stack gap="large">
      <s-section heading="Widget details">
        {/* <s-paragraph color="subdued">Name this widget for your admin. Customers never see this title.</s-paragraph> */}
        <s-text-field
          label="Title"
          name="name"
          value={draft.name}
          error={errors.name}
          onInput={(event) => setDraftFields({ name: event.currentTarget.value })}
        ></s-text-field>
        {profile.inheritProductConditions ? (
          <>
            <s-banner>
              Delivery logic is automatically used from your Product Page conditions.
            </s-banner>
            {widget.location === WIDGET_LOCATIONS.CHECKOUT ? (
              <s-paragraph color="subdued">
                Checkout shows one estimate from the products in the order. If no matching product-page widget is
                found, the checkout widget stays hidden.
              </s-paragraph>
            ) : null}
          </>
        ) : null}
        {profile.showCartMode ? (
          <>
            <input type="hidden" name="displayMode" value={draft.cartConfig.displayMode} />
            <HostChoiceList
              label="Widget mode"
              name="displayModeField"
              onChange={(event) => {
                const target = event?.currentTarget || event?.target;
                const displayMode = target?.values?.[0] || target?.value || "GENERAL";
                setDraftFields({
                  cartConfig: {
                    ...(draft.cartConfig || {}),
                    displayMode,
                  },
                });
              }}
            >
              <s-choice value="GENERAL" selected={draft.cartConfig.displayMode === "GENERAL"}>
                General
              </s-choice>
              <s-choice value="PER_PRODUCT" selected={draft.cartConfig.displayMode === "PER_PRODUCT"}>
                Per product
              </s-choice>
            </HostChoiceList>
            <s-paragraph color="subdued">
              {draft.cartConfig.displayMode === "PER_PRODUCT"
                ? "Show a delivery line for each cart item using that product’s live Product Page widget. Items without a matching product widget are omitted."
                : "Show one delivery date for the whole order. This summarizes the entire cart into a single estimate based on the item with the longest delivery time."}
            </s-paragraph>
          </>
        ) : null}
      </s-section>

      {profile.showShipping ? (
        <>
          <ProcessingSection
            shipping={shipping}
            timezone={draft.timezone}
            errors={errors}
            onChange={setShipping}
            onTimezone={(timezone) => setDraftFields({ timezone })}
          />
          <TransitSection shipping={shipping} errors={errors} onChange={setShipping} />
        </>
      ) : (
        <HiddenShipping shipping={shipping} timezone={draft.timezone} />
      )}

      {profile.showMarkets ? <MarketsSection draft={draft} onChange={onChange} errors={errors} /> : null}
      {widget.location === WIDGET_LOCATIONS.PRODUCT ? (
        <>
          <WeightDisplayPicker
            shipping={shipping}
            widgetId={widget.id}
            autoOpen={shouldAutoOpenWeight}
            onChange={setShipping}
          />
          <PincodeRulesEditor shipping={shipping} onChange={setShipping} errors={errors} />
          <DeliveryRequestsPanel
            requests={deliveryRequests}
            onAccepted={(saved) => {
              if (!saved?.shippingRules) return;
              onChange((current) => ({
                ...(current || {}),
                shippingRules: {
                  ...(current?.shippingRules || {}),
                  pincodeRules: saved.shippingRules.pincodeRules,
                  weightRules: saved.shippingRules.weightRules || current?.shippingRules?.weightRules,
                },
              }));
            }}
          />
        </>
      ) : null}
    </s-stack>
  );
}

function HiddenShipping({ shipping, timezone }) {
  return (
    <>
      <input type="hidden" name="timezone" value={resolveTimeZone(timezone)} />
      <input type="hidden" name="processingMinDays" value={intFieldValue(shipping.processingMinDays, SHIPPING_DAY_LIMITS.processingMin, 0)} />
      <input type="hidden" name="processingMaxDays" value={intFieldValue(shipping.processingMaxDays, SHIPPING_DAY_LIMITS.processingMax, 1)} />
      <input type="hidden" name="cutoffTime" value={shipping.cutoffTime} />
      <input type="hidden" name="transitMinDays" value={intFieldValue(shipping.transitMinDays, SHIPPING_DAY_LIMITS.transitMin, 1)} />
      <input type="hidden" name="transitMaxDays" value={intFieldValue(shipping.transitMaxDays, SHIPPING_DAY_LIMITS.transitMax, 2)} />
      <input type="hidden" name="blockedDates" value={JSON.stringify(shipping.blockedDates || [])} />
      <input type="hidden" name="transitBlockedDates" value={JSON.stringify(shipping.transitBlockedDates || [])} />
      <input type="hidden" name="pincodeRules" value={JSON.stringify(shipping.pincodeRules || {})} />
      <input type="hidden" name="weightRules" value={JSON.stringify(shipping.weightRules || {})} />
      {(shipping.workingDays || []).map((day) => (
        <input key={`wd-${day}`} type="hidden" name={`workingDay_${day}`} value="on" />
      ))}
      {(shipping.transitWorkingDays || []).map((day) => (
        <input key={`td-${day}`} type="hidden" name={`transitDay_${day}`} value="on" />
      ))}
    </>
  );
}

function ProcessingSection({ shipping, timezone, errors, onChange, onTimezone }) {
  return (
    <s-section heading="Order processing">
      {/* <s-paragraph color="subdued">
        Set how long you need to prepare an order, when the daily cutoff is, and which days you work.
      </s-paragraph> */}
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Shortest processing"
          name="processingMinDays"
          value={intFieldValue(shipping.processingMinDays, SHIPPING_DAY_LIMITS.processingMin, 0)}
          min={SHIPPING_DAY_LIMITS.processingMin.min}
          max={SHIPPING_DAY_LIMITS.processingMin.max}
          step={1}
          suffix="Days"
          error={errors.processingMinDays}
          onInput={(event) =>
            onDayInput(event, "processingMinDays", SHIPPING_DAY_LIMITS.processingMin, onChange)
          }
        ></s-number-field>
        <s-number-field
          label="Longest processing"
          name="processingMaxDays"
          value={intFieldValue(shipping.processingMaxDays, SHIPPING_DAY_LIMITS.processingMax, 1)}
          min={SHIPPING_DAY_LIMITS.processingMax.min}
          max={SHIPPING_DAY_LIMITS.processingMax.max}
          step={1}
          suffix="Days"
          error={errors.processingMaxDays}
          onInput={(event) =>
            onDayInput(event, "processingMaxDays", SHIPPING_DAY_LIMITS.processingMax, onChange)
          }
        ></s-number-field>
      </s-grid>
      <DaysLimitNote />
      <CutoffFields
        value={shipping.cutoffTime}
        error={errors.cutoffTime}
        onChange={(cutoffTime) => onChange({ cutoffTime })}
      />
      <TimezonePicker value={timezone} error={errors.timezone} onChange={onTimezone} />
      <DayPills
        label="Processing days"
        help="Days you prepare and ship orders"
        namePrefix="workingDay_"
        days={shipping.workingDays}
        error={errors.workingDays}
        onChange={(workingDays) => onChange({ workingDays })}
      />
      <BlockedDatesField
        label="Blocked dates"
        help="Holidays or closed days when you will not process orders."
        hiddenName="blockedDates"
        dates={shipping.blockedDates || []}
        onChange={(blockedDates) => onChange({ blockedDates })}
      />
    </s-section>
  );
}

function TransitSection({ shipping, errors, onChange }) {
  return (
    <s-section heading="Order transit">
      {/* <s-paragraph color="subdued">
        Shipping time after the order leaves your facility until it reaches the customer.
      </s-paragraph> */}
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Shortest transit"
          name="transitMinDays"
          value={intFieldValue(shipping.transitMinDays, SHIPPING_DAY_LIMITS.transitMin, 1)}
          min={SHIPPING_DAY_LIMITS.transitMin.min}
          max={SHIPPING_DAY_LIMITS.transitMin.max}
          step={1}
          suffix="Days"
          error={errors.transitMinDays}
          onInput={(event) =>
            onDayInput(event, "transitMinDays", SHIPPING_DAY_LIMITS.transitMin, onChange)
          }
        ></s-number-field>
        <s-number-field
          label="Longest transit"
          name="transitMaxDays"
          value={intFieldValue(shipping.transitMaxDays, SHIPPING_DAY_LIMITS.transitMax, 2)}
          min={SHIPPING_DAY_LIMITS.transitMax.min}
          max={SHIPPING_DAY_LIMITS.transitMax.max}
          step={1}
          suffix="Days"
          error={errors.transitMaxDays}
          onInput={(event) =>
            onDayInput(event, "transitMaxDays", SHIPPING_DAY_LIMITS.transitMax, onChange)
          }
        ></s-number-field>
      </s-grid>
      <DaysLimitNote />
      <DayPills
        label="Transit days"
        help="Days carriers move the package"
        namePrefix="transitDay_"
        days={shipping.transitWorkingDays}
        error={errors.transitWorkingDays}
        onChange={(transitWorkingDays) => onChange({ transitWorkingDays })}
      />
      <BlockedDatesField
        label="Transit blocked dates"
        help="Days when transit should not be counted (carrier holidays)."
        hiddenName="transitBlockedDates"
        dates={shipping.transitBlockedDates || []}
        onChange={(transitBlockedDates) => onChange({ transitBlockedDates })}
      />
    </s-section>
  );
}

function CutoffFields({ value, error, onChange }) {
  const parts = splitCutoff(value);
  return (
    <s-stack gap="small-200">
      <s-text type="strong">Processing cutoff time</s-text>
      <s-paragraph color="subdued">Orders placed after this time start processing on the next working day.</s-paragraph>
      <input type="hidden" name="cutoffTime" value={value} />
      <div className="edd-cutoff">
        <s-number-field
          label="Hour"
          labelAccessibilityVisibility="exclusive"
          min={CUTOFF_LIMITS.hours.min}
          max={CUTOFF_LIMITS.hours.max}
          step={1}
          value={String(parts.hours)}
          onInput={(event) => {
            const hours = boundedIntFromEvent(event, CUTOFF_LIMITS.hours, parts.hours);
            if (hours == null) return;
            onChange(joinCutoff(hours, parts.minutes, parts.meridiem));
          }}
        ></s-number-field>
        <s-number-field
          label="Minute"
          labelAccessibilityVisibility="exclusive"
          min={CUTOFF_LIMITS.minutes.min}
          max={CUTOFF_LIMITS.minutes.max}
          step={1}
          value={String(parts.minutes)}
          onInput={(event) => {
            const minutes = boundedIntFromEvent(event, CUTOFF_LIMITS.minutes, parts.minutes);
            if (minutes == null) return;
            onChange(joinCutoff(parts.hours, minutes, parts.meridiem));
          }}
        ></s-number-field>
        <s-select
          label="AM or PM"
          labelAccessibilityVisibility="exclusive"
          value={parts.meridiem}
          onChange={(event) => onChange(joinCutoff(parts.hours, parts.minutes, event.currentTarget.value))}
        >
          <s-option value="AM">AM</s-option>
          <s-option value="PM">PM</s-option>
        </s-select>
      </div>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </s-stack>
  );
}

function setWorkingDay(days, day, selected) {
  const current = Array.isArray(days) ? days.filter((item) => WORKING_DAYS.includes(item)) : [];
  const nextDays = selected ? [...current, day] : current.filter((item) => item !== day);
  return WORKING_DAYS.filter((item) => nextDays.includes(item));
}

function DayPills({ label, help, namePrefix, days, error, onChange }) {
  const selectedDays = Array.isArray(days) ? days.filter((item) => WORKING_DAYS.includes(item)) : [];
  const listRef = useRef(null);
  const daysRef = useRef(selectedDays);
  const onChangeRef = useRef(onChange);
  daysRef.current = selectedDays;
  onChangeRef.current = onChange;

  useEffect(() => {
    const node = listRef.current;
    if (!node) return undefined;
    const handleClick = (event) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const fromTarget =
        event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      const button =
        path.find((item) => item?.hasAttribute?.("data-day")) || fromTarget?.closest?.("[data-day]");
      if (!button || !node.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const day = button.getAttribute("data-day");
      if (!WORKING_DAYS.includes(day)) return;
      const current = daysRef.current;
      onChangeRef.current(setWorkingDay(current, day, !current.includes(day)));
    };
    node.addEventListener("click", handleClick, true);
    return () => node.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <div className="edd-subsection">
      <s-stack gap="small-200">
        <s-text type="strong">{label}</s-text>
        {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
        <div ref={listRef} className="edd-days" role="group" aria-label={label}>
          {WORKING_DAYS.map((day) => {
            const selected = selectedDays.includes(day);
            return (
              <button
                key={`${namePrefix}${day}`}
                type="button"
                data-day={day}
                className={selected ? "edd-day is-selected" : "edd-day"}
                aria-pressed={selected}
                aria-label={day.charAt(0) + day.slice(1).toLowerCase()}
              >
                {DAY_SHORT[day]}
              </button>
            );
          })}
        </div>
        {error ? <s-banner tone="critical">{error}</s-banner> : null}
      </s-stack>
      {selectedDays.map((day) => (
        <input key={`${namePrefix}${day}-hidden`} type="hidden" name={`${namePrefix}${day}`} value="on" />
      ))}
    </div>
  );
}

function localIsoDate(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

function formatBlockedLabel(item) {
  const start = parseISO(`${item.date}T12:00:00`);
  const end = item.endDate ? parseISO(`${item.endDate}T12:00:00`) : start;
  const range =
    item.endDate && item.endDate !== item.date
      ? `${format(start, "MMM d")} - ${format(end, "d")}`
      : format(start, "MMM d");
  return item.recurring ? `${range} of every year` : `${range} ${format(start, "yyyy")}`;
}

function BlockedDatesField({ label, help, hiddenName, dates, onChange }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(true);
  const minDate = localIsoDate();
  const endMin = start && start > minDate ? start : minDate;

  const chooseStart = (value) => {
    const next = String(value || "");
    if (next && next < minDate) return;
    setStart(next);
    if (end && next && end < next) setEnd("");
  };

  const chooseEnd = (value) => {
    const next = String(value || "");
    if (next && next < endMin) return;
    setEnd(next);
  };

  return (
    <div className="edd-subsection">
      <s-stack gap="small-200">
        <s-text type="strong">{label}</s-text>
        {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
        {dates.length ? (
        <div className="edd-chip-row">
          {dates.map((item) => (
            <div key={`${item.date}-${item.endDate || ""}-${item.name}`} className="edd-chip">
              <span>
                <strong>{item.name}</strong> · {formatBlockedLabel(item)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onChange(dates.filter((current) => current !== item))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <s-text color="subdued">No blocked dates yet.</s-text>
      )}
      {open ? (
        <s-box padding="base" background="subdued" borderRadius="base">
          <s-stack gap="small-200">
            <div className="edd-date-pair">
              <label className="edd-date-field">
                <span>Start date</span>
                <input
                  type="date"
                  value={start}
                  min={minDate}
                  onChange={(event) => chooseStart(event.currentTarget.value)}
                />
              </label>
              <label className="edd-date-field">
                <span>End date</span>
                <input
                  type="date"
                  value={end}
                  min={endMin}
                  onChange={(event) => chooseEnd(event.currentTarget.value)}
                />
              </label>
            </div>
            <s-paragraph color="subdued">Today and future dates only. End date is optional.</s-paragraph>
            <s-text-field
              label="Name"
              value={name}
              placeholder="Holiday"
              onInput={(event) => setName(event.currentTarget.value)}
            ></s-text-field>
            <s-checkbox
              label="Repeat every year"
              checked={recurring}
              onChange={(event) => setRecurring(Boolean(event.currentTarget.checked))}
            ></s-checkbox>
            <div className="edd-blocked-actions">
              <ActionButton
                type="button"
                variant="primary"
                disabled={!start || start < minDate || !name.trim()}
                onClick={() => {
                  if (!start || start < minDate || !name.trim()) return;
                  if (end && end < start) return;
                  onChange([
                    ...dates,
                    {
                      date: start,
                      endDate: end || start,
                      name: name.trim(),
                      recurring,
                    },
                  ]);
                  setStart("");
                  setEnd("");
                  setName("");
                  setRecurring(true);
                  setOpen(false);
                }}
              >
                Add date
              </ActionButton>
              <ActionButton type="button" variant="tertiary" onClick={() => setOpen(false)}>
                Cancel
              </ActionButton>
            </div>
            {!start || !name.trim() ? (
              <s-paragraph color="subdued">Choose a start date and enter a name, then click Add date.</s-paragraph>
            ) : null}
          </s-stack>
        </s-box>
      ) : (
        <ActionButton type="button" variant="secondary" icon="plus" onClick={() => setOpen(true)}>
          Add blocked date
        </ActionButton>
      )}
      </s-stack>
      <input type="hidden" name={hiddenName} value={JSON.stringify(dates)} />
    </div>
  );
}

function MarketsSection({ draft, onChange, errors }) {
  return (
    <s-section heading="Markets">
      <s-paragraph color="subdued">Choose where this widget is visible.</s-paragraph>
      <input type="hidden" name="marketMode" value={draft.marketMode || "ALL"} />
      <div className="edd-markets">
        <HostChoiceList
          label="Market visibility"
          name="marketModeField"
          labelAccessibilityVisibility="exclusive"
          onChange={(event) => {
            const target = event?.currentTarget || event?.target;
            const marketMode = target?.values?.[0] || target?.value || "ALL";
            onChange((current) => ({
              ...(current || {}),
              marketMode,
            }));
          }}
        >
          <s-choice value="ALL" selected={(draft.marketMode || "ALL") === "ALL"}>
            All markets
          </s-choice>
          <s-choice value="SPECIFIC" selected={draft.marketMode === "SPECIFIC"}>
            Specific market
          </s-choice>
        </HostChoiceList>
        {draft.marketMode === "SPECIFIC" ? (
          <MarketPicker
            selected={draft.markets || []}
            onSelected={(markets) =>
              onChange((current) => ({
                ...(current || {}),
                markets,
                marketIds: markets.map((item) => item.id),
              }))
            }
          />
        ) : null}
      </div>
      <input type="hidden" name="marketIds" value={JSON.stringify(draft.marketIds || [])} />
      <input type="hidden" name="markets" value={JSON.stringify(draft.markets || [])} />
      {errors.marketIds ? <s-banner tone="critical">{errors.marketIds}</s-banner> : null}
    </s-section>
  );
}

function MarketPicker({ selected, onSelected }) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();
  const [query, setQuery] = useState("");
  const [scopeState, setScopeState] = useState("checking");
  const retried = useRef(false);

  const grantMarkets = async () => {
    retried.current = false;
    const granted = await ensureScopes(shopify, MARKET_SCOPES);
    setScopeState(granted ? "granted" : "denied");
    return granted;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await grantMarkets();
      if (cancelled) return;
      if (!granted) setScopeState("denied");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scopeState !== "granted") return;
    const handle = setTimeout(() => {
      fetcher.load(`/api/markets/search?q=${encodeURIComponent(query)}`);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scopeState]);

  useEffect(() => {
    if (scopeState !== "granted" || !fetcher.data?.needsScopes || fetcher.state !== "idle") return;
    if (retried.current) {
      setScopeState("denied");
      return;
    }
    retried.current = true;
    const timer = setTimeout(() => {
      fetcher.load(`/api/markets/search?q=${encodeURIComponent(query)}`);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.data?.needsScopes, fetcher.state, scopeState, query]);

  const results = fetcher.data?.nodes || [];
  const selectedIds = useMemo(() => new Set(selected.map((item) => item.id)), [selected]);
  const searching = query.trim().length > 0;
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? results.filter(
          (item) =>
            item.title.toLowerCase().includes(needle) ||
            String(item.handle || "").toLowerCase().includes(needle),
        )
      : results;
    if (needle) return matches;
    const byId = new Map(matches.map((item) => [item.id, item]));
    const extras = selected.filter((item) => !byId.has(item.id));
    return [...extras, ...matches];
  }, [results, selected, query]);

  const allVisibleSelected = rows.length > 0 && rows.every((item) => selectedIds.has(item.id));
  const someVisibleSelected = rows.some((item) => selectedIds.has(item.id));
  const allRef = useRef(null);

  useEffect(() => {
    if (!allRef.current) return;
    allRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected, rows.length]);

  const toggle = (item) => {
    if (selectedIds.has(item.id)) {
      onSelected(selected.filter((current) => current.id !== item.id));
      return;
    }
    onSelected([...selected, item]);
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(rows.map((item) => item.id));
      onSelected(selected.filter((item) => !visibleIds.has(item.id)));
      return;
    }
    const next = new Map(selected.map((item) => [item.id, item]));
    rows.forEach((item) => next.set(item.id, item));
    onSelected([...next.values()]);
  };

  const loading = !rows.length && (scopeState === "checking" || fetcher.state !== "idle");
  const refreshing = fetcher.state !== "idle" && rows.length > 0;

  return (
    <div className="edd-market-picker">
      <s-search-field
        label="Search markets"
        name="marketsQuery"
        value={query}
        placeholder="Search markets"
        labelAccessibilityVisibility="exclusive"
        onInput={(event) => setQuery(event.currentTarget.value)}
      ></s-search-field>
      {scopeState === "denied" ? (
        <s-stack gap="small-200">
          <s-banner tone="warning">Allow market access to choose specific markets.</s-banner>
          <ActionButton type="button" variant="primary" onClick={grantMarkets}>
            Allow access
          </ActionButton>
        </s-stack>
      ) : null}
      {fetcher.data?.error && !fetcher.data?.needsScopes ? (
        <s-banner tone="warning">{fetcher.data.error}</s-banner>
      ) : null}
      {scopeState !== "denied" ? (
        <div className="edd-market-list" role="group" aria-label="Markets" aria-busy={loading || refreshing}>
          {rows.length > 0 && !loading ? (
            <label
              className={`edd-market-row edd-market-row--all${allVisibleSelected ? " is-selected" : ""}`}
            >
              <input
                ref={allRef}
                type="checkbox"
                checked={allVisibleSelected}
                aria-label={searching ? "Select all matching markets" : "Select all markets"}
                onChange={toggleAll}
              />
              <span className="edd-market-row__name">All</span>
              <span className="edd-market-row__meta">
                {refreshing ? "Updating…" : selected.length ? `${selected.length} selected` : "None selected"}
              </span>
            </label>
          ) : (
            <div className="edd-market-list__toolbar">
              <span>{searching ? "Search results" : "Available markets"}</span>
              <span>{refreshing ? "Updating…" : "None selected"}</span>
            </div>
          )}
          {loading ? (
            <div className="edd-market-empty">
              <s-spinner accessibilityLabel="Loading markets"></s-spinner>
            </div>
          ) : rows.length ? (
            rows.map((item) => {
              const checked = selectedIds.has(item.id);
              return (
                <label key={item.id} className={`edd-market-row${checked ? " is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item)}
                  />
                  <span className="edd-market-row__name">{item.title}</span>
                </label>
              );
            })
          ) : (
            <div className="edd-market-empty">
              {searching ? `No markets match “${query.trim()}”.` : "No markets available."}
            </div>
          )}
        </div>
      ) : null}
      {selected.length ? (
        <div className="edd-market-selected">
          <div className="edd-market-selected__head">
            <s-text type="strong">Selected markets</s-text>
            <s-text color="subdued">{selected.length}</s-text>
          </div>
          <div className="edd-chip-row">
            {selected.map((item) => (
              <div key={item.id} className="edd-chip">
                <span>{item.title}</span>
                <button type="button" aria-label={`Remove ${item.title}`} onClick={() => toggle(item)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : scopeState !== "denied" ? (
        <s-text color="subdued">Select at least one market for this widget.</s-text>
      ) : null}
    </div>
  );
}
