import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { MARKET_SCOPES, ensureScopes } from "../../lib/app-scopes";
import { WORKING_DAYS, WIDGET_LOCATIONS } from "../../lib/constants";
import { joinCutoff, splitCutoff } from "../../lib/delivery-calculator";
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

function parseDayInput(raw) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const next = Number(text);
  if (!Number.isFinite(next)) return null;
  return Math.max(0, Math.floor(next));
}

/** Keep shortest/longest day pairs valid while typing (empty inputs are ignored). */
function patchDayRange(shipping, edge, raw, minKey, maxKey) {
  const parsed = parseDayInput(raw);
  if (parsed == null) return null;
  if (edge === "min") {
    const currentMax = Number(shipping?.[maxKey]);
    const max = Number.isFinite(currentMax) ? currentMax : parsed;
    return { [minKey]: parsed, [maxKey]: Math.max(max, parsed) };
  }
  const currentMin = Number(shipping?.[minKey]);
  const min = Number.isFinite(currentMin) ? currentMin : 0;
  return { [maxKey]: Math.max(parsed, min) };
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

  useEffect(() => {
    const transitMin = Number(shipping.transitMinDays) || 0;
    const transitMax = Number(shipping.transitMaxDays) || 0;
    const processingMin = Number(shipping.processingMinDays) || 0;
    const processingMax = Number(shipping.processingMaxDays) || 0;
    const patch = {};
    if (transitMax < transitMin) patch.transitMaxDays = transitMin;
    if (processingMax < processingMin) patch.processingMaxDays = processingMin;
    if (!Object.keys(patch).length) return;
    setShipping(patch);
    // Only repair invalid pairs when opening this widget — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id]);

  return (
    <s-stack gap="base">
      <s-section heading="Widget details">
        <s-paragraph color="subdued">Name this widget for your admin. Customers never see this title.</s-paragraph>
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
    <s-section heading="Order processing">
      <s-paragraph color="subdued">
        Set how long you need to prepare an order, when the daily cutoff is, and which days you work.
      </s-paragraph>
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Shortest processing"
          name="processingMinDays"
          value={String(shipping.processingMinDays)}
          min={0}
          max={30}
          suffix="Days"
          error={errors.processingMinDays}
          onInput={(event) => {
            const patch = patchDayRange(
              shipping,
              "min",
              event.currentTarget.value,
              "processingMinDays",
              "processingMaxDays",
            );
            if (patch) onChange(patch);
          }}
        ></s-number-field>
        <s-number-field
          label="Longest processing"
          name="processingMaxDays"
          value={String(shipping.processingMaxDays)}
          min={0}
          max={60}
          suffix="Days"
          error={errors.processingMaxDays}
          onInput={(event) => {
            const patch = patchDayRange(
              shipping,
              "max",
              event.currentTarget.value,
              "processingMinDays",
              "processingMaxDays",
            );
            if (patch) onChange(patch);
          }}
        ></s-number-field>
      </s-grid>
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
      <s-paragraph color="subdued">
        Shipping time after the order leaves your facility until it reaches the customer.
      </s-paragraph>
      <s-grid gridTemplateColumns="1fr 1fr" gap="base">
        <s-number-field
          label="Shortest transit"
          name="transitMinDays"
          value={String(shipping.transitMinDays ?? 1)}
          min={0}
          max={30}
          suffix="Days"
          error={errors.transitMinDays}
          onInput={(event) => {
            const patch = patchDayRange(
              shipping,
              "min",
              event.currentTarget.value,
              "transitMinDays",
              "transitMaxDays",
            );
            if (patch) onChange(patch);
          }}
        ></s-number-field>
        <s-number-field
          label="Longest transit"
          name="transitMaxDays"
          value={String(shipping.transitMaxDays ?? 2)}
          min={0}
          max={60}
          suffix="Days"
          error={errors.transitMaxDays}
          onInput={(event) => {
            const patch = patchDayRange(
              shipping,
              "max",
              event.currentTarget.value,
              "transitMinDays",
              "transitMaxDays",
            );
            if (patch) onChange(patch);
          }}
        ></s-number-field>
      </s-grid>
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
      <s-paragraph color="subdued">Orders placed after this time start processing on the next working day.</s-paragraph>
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
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(true);

  return (
    <s-stack gap="small-300">
      <s-text type="strong">{label}</s-text>
      {help ? <s-paragraph color="subdued">{help}</s-paragraph> : null}
      <input type="hidden" name={hiddenName} value={JSON.stringify(dates)} />
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
          <s-stack gap="small-300">
            <div className="edd-date-pair">
              <label className="edd-date-field">
                <span>Start date</span>
                <input type="date" value={start} onChange={(event) => setStart(event.currentTarget.value)} />
              </label>
              <label className="edd-date-field">
                <span>End date</span>
                <input type="date" value={end} onChange={(event) => setEnd(event.currentTarget.value)} />
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
            <div className="edd-blocked-actions">
              <ActionButton
                type="button"
                variant="primary"
                disabled={!start || !name.trim()}
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
  );
}

function MarketsSection({ draft, onChange, errors }) {
  return (
    <s-section heading="Markets">
      <s-paragraph color="subdued">Choose where this widget is visible.</s-paragraph>
      <input type="hidden" name="marketMode" value={draft.marketMode || "ALL"} />
      <HostChoiceList
        label="Markets"
        name="marketModeField"
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
