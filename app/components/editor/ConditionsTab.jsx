import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { MARKET_SCOPES, ensureScopes } from "../../lib/app-scopes";
import { WORKING_DAYS, WIDGET_LOCATIONS } from "../../lib/constants";
import { joinCutoff, splitCutoff } from "../../lib/delivery-calculator";
import { widgetProfile } from "../../lib/widget-profiles";
import { ActionButton, HostChoiceList } from "../common/ActionButton";
import { PincodeRulesEditor } from "./PincodeRulesEditor";
import { WeightDisplayPicker } from "./WeightDisplayPicker";
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

export function ConditionsTab({ widget, draft, onChange, errors = {}, deliveryRequests = [] }) {
  const shipping = draft.shippingRules;
  const profile = widgetProfile(widget.location);
  const setShipping = (patch) =>
    onChange({ ...draft, shippingRules: { ...shipping, ...patch } });

  return (
    <s-stack gap="large">
      <s-section heading="Widget">
        <s-text-field
          label="Title"
          name="name"
          value={draft.name}
          details="This is only visible for you"
          error={errors.name}
          onInput={(event) => onChange({ ...draft, name: event.currentTarget.value })}
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
              onChange={(event) =>
                onChange({
                  ...draft,
                  cartConfig: {
                    ...draft.cartConfig,
                    displayMode: event.currentTarget.values?.[0] || event.currentTarget.value,
                  },
                })
              }
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
                ? "Show specific delivery dates for every item. This displays a dedicated delivery line for each product in the basket."
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
            onTimezone={(timezone) => onChange({ ...draft, timezone })}
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
            autoOpen={!draft.shippingRules?.weightRules?.displayMode}
            onChange={setShipping}
          />
          <PincodeRulesEditor shipping={shipping} onChange={setShipping} errors={errors} />
          <DeliveryRequestsPanel
            requests={deliveryRequests}
            onAccepted={(saved) => {
              if (!saved?.shippingRules) return;
              onChange({
                ...draft,
                shippingRules: {
                  ...shipping,
                  pincodeRules: saved.shippingRules.pincodeRules,
                  weightRules: saved.shippingRules.weightRules || shipping.weightRules,
                },
              });
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
      <input type="hidden" name="processingMinDays" value={String(shipping.processingMinDays)} />
      <input type="hidden" name="processingMaxDays" value={String(shipping.processingMaxDays)} />
      <input type="hidden" name="cutoffTime" value={shipping.cutoffTime} />
      <input type="hidden" name="transitMinDays" value={String(shipping.transitMinDays)} />
      <input type="hidden" name="transitMaxDays" value={String(shipping.transitMaxDays)} />
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
    <s-section heading="Order processing settings">
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Processing time"
          name="processingMinDays"
          value={String(shipping.processingMinDays)}
          min={0}
          max={30}
          suffix="Days"
          details="Shortest"
          error={errors.processingMinDays}
          onInput={(event) => onChange({ processingMinDays: Number(event.currentTarget.value) })}
        ></s-number-field>
        <s-number-field
          label="Longest"
          name="processingMaxDays"
          value={String(shipping.processingMaxDays)}
          min={0}
          max={60}
          suffix="Days"
          labelAccessibilityVisibility="visible"
          error={errors.processingMaxDays}
          onInput={(event) => onChange({ processingMaxDays: Number(event.currentTarget.value) })}
        ></s-number-field>
      </s-grid>
      <CutoffFields
        value={shipping.cutoffTime}
        error={errors.cutoffTime}
        onChange={(cutoffTime) => onChange({ cutoffTime })}
      />
      <TimezonePicker
        value={timezone}
        error={errors.timezone}
        onChange={onTimezone}
      />
      <DayPills
        label="Processing working days"
        help="Set which days you are processing orders"
        namePrefix="workingDay_"
        days={shipping.workingDays}
        error={errors.workingDays}
        onChange={(workingDays) => onChange({ workingDays })}
      />
      <BlockedDatesField
        label="Blocked dates (Holidays)"
        help="Set blocked dates for days outside of your business schedule that you will not process orders."
        hiddenName="blockedDates"
        dates={shipping.blockedDates || []}
        onChange={(blockedDates) => onChange({ blockedDates })}
      />
    </s-section>
  );
}

function TransitSection({ shipping, errors, onChange }) {
  return (
    <s-section heading="Order transit settings">
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Shortest"
          name="transitMinDays"
          value={String(shipping.transitMinDays ?? 1)}
          min={0}
          max={30}
          suffix="Days"
          error={errors.transitMinDays}
          onInput={(event) => onChange({ transitMinDays: Number(event.currentTarget.value) })}
        ></s-number-field>
        <s-number-field
          label="Longest"
          name="transitMaxDays"
          value={String(shipping.transitMaxDays ?? 2)}
          min={0}
          max={60}
          suffix="Days"
          error={errors.transitMaxDays}
          onInput={(event) => onChange({ transitMaxDays: Number(event.currentTarget.value) })}
        ></s-number-field>
      </s-grid>
      <DayPills
        label="Order transit days"
        help="Set which days the order is in transit"
        namePrefix="transitDay_"
        days={shipping.transitWorkingDays}
        error={errors.transitWorkingDays}
        onChange={(transitWorkingDays) => onChange({ transitWorkingDays })}
      />
      <BlockedDatesField
        label="Blocked dates (Holidays)"
        help="Set blocked dates for days outside of your business schedule that you will not process orders."
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
      <input type="hidden" name="cutoffTime" value={value} />
      <div className="edd-cutoff">
        <s-number-field
          label="Hour"
          labelAccessibilityVisibility="exclusive"
          min={1}
          max={12}
          value={String(parts.hours)}
          onInput={(event) => onChange(joinCutoff(event.currentTarget.value, parts.minutes, parts.meridiem))}
        ></s-number-field>
        <s-number-field
          label="Minute"
          labelAccessibilityVisibility="exclusive"
          min={0}
          max={59}
          value={String(parts.minutes)}
          onInput={(event) => onChange(joinCutoff(parts.hours, event.currentTarget.value, parts.meridiem))}
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
      <s-paragraph color="subdued">Orders placed after this time start processing on the following day</s-paragraph>
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </s-stack>
  );
}

function DayPills({ label, help, namePrefix, days, error, onChange }) {
  return (
    <s-stack gap="small-200">
      <s-text type="strong">{label}</s-text>
      {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
      <div className="edd-days">
        {WORKING_DAYS.map((day) => {
          const selected = days?.includes(day);
          return (
            <button
              key={`${namePrefix}${day}`}
              type="button"
              className="edd-day"
              aria-pressed={selected}
              onClick={() => {
                const next = selected
                  ? (days || []).filter((item) => item !== day)
                  : [...new Set([...(days || []), day])];
                onChange(next);
              }}
            >
              {DAY_SHORT[day]}
            </button>
          );
        })}
      </div>
      {(days || []).map((day) => (
        <input key={`${namePrefix}${day}-hidden`} type="hidden" name={`${namePrefix}${day}`} value="on" />
      ))}
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </s-stack>
  );
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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(true);

  return (
    <s-stack gap="base">
      <s-text type="strong">{label}</s-text>
      {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
      <input type="hidden" name={hiddenName} value={JSON.stringify(dates)} />
      {dates.map((item) => (
        <div key={`${item.date}-${item.endDate || ""}-${item.name}`} className="edd-chip">
          <span>{formatBlockedLabel(item)}</span>
          <button
            type="button"
            aria-label={`Remove ${item.name}`}
            onClick={() => onChange(dates.filter((current) => current !== item))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="edd-date-pair">
        <label className="edd-date-field">
          <span>Start date</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.currentTarget.value)}
          />
        </label>
        <label className="edd-date-field">
          <span>End date</span>
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.currentTarget.value)}
          />
        </label>
      </div>
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
      <ActionButton
        type="button"
        variant="tertiary"
        onClick={() => {
          if (!start || !name.trim()) return;
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
        }}
      >
        + Add Blocked Dates
      </ActionButton>
    </s-stack>
  );
}

function MarketsSection({ draft, onChange, errors }) {
  return (
    <s-section heading="Markets">
      <s-paragraph color="subdued">Select markets where the widget will be visible.</s-paragraph>
      <input type="hidden" name="marketMode" value={draft.marketMode || "ALL"} />
      <HostChoiceList
        label="Markets"
        name="marketModeField"
        onChange={(event) =>
          onChange({
            ...draft,
            marketMode: event.currentTarget.values?.[0] || event.currentTarget.value,
          })
        }
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
            onChange({
              ...draft,
              markets,
              marketIds: markets.map((item) => item.id),
            })
          }
        />
      ) : null}
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

  return (
    <s-stack gap="base">
      <s-search-field
        label="Select markets"
        name="marketsQuery"
        value={query}
        placeholder="Search markets"
        labelAccessibilityVisibility="exclusive"
        onInput={(event) => setQuery(event.currentTarget.value)}
      ></s-search-field>
      {fetcher.state === "loading" || scopeState === "checking" ? (
        <s-spinner accessibilityLabel="Loading markets"></s-spinner>
      ) : null}
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
      {results.map((item) => (
        <div key={item.id} className="edd-selected-row">
          <s-text>{item.title}</s-text>
          <ActionButton
            type="button"
            variant={selectedIds.has(item.id) ? "secondary" : "primary"}
            onClick={() =>
              selectedIds.has(item.id)
                ? onSelected(selected.filter((current) => current.id !== item.id))
                : onSelected([...selected, item])
            }
          >
            {selectedIds.has(item.id) ? "Remove" : "Select"}
          </ActionButton>
        </div>
      ))}
      {selected.length ? (
        <s-stack gap="small-200">
          <s-text type="strong">Selected markets</s-text>
          {selected.map((item) => (
            <s-text key={item.id}>{item.title}</s-text>
          ))}
        </s-stack>
      ) : (
        <s-text color="subdued">Select at least one market for this widget.</s-text>
      )}
    </s-stack>
  );
}
