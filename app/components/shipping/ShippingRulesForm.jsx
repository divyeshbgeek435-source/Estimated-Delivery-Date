import { WORKING_DAYS } from "../../lib/constants";
import { TimezonePicker } from "../editor/TimezonePicker";
import { boundedIntFromEvent, intFieldValue, SHIPPING_DAY_LIMITS, SHIPPING_DAY_MAX } from "../../lib/number-input";

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DAY_LABELS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function ShippingRulesForm({ shipping, timezone, errors = {} }) {
  const blockedDates = shipping.blockedDates || [];
  const transitBlockedDates = shipping.transitBlockedDates || [];

  return (
    <s-stack gap="large">
      <s-section heading="Processing">
        <s-paragraph color="subdued">
          Business days needed to prepare an order before it ships. After cutoff, processing
          starts on the next working day.
        </s-paragraph>
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Shortest processing time"
            name="processingMinDays"
            value={intFieldValue(shipping.processingMinDays, SHIPPING_DAY_LIMITS.processingMin, 0)}
            min={SHIPPING_DAY_LIMITS.processingMin.min}
            max={SHIPPING_DAY_LIMITS.processingMin.max}
            step={1}
            suffix="days"
            error={errors.processingMinDays}
            onInput={(event) => boundedIntFromEvent(event, SHIPPING_DAY_LIMITS.processingMin, 0)}
          ></s-number-field>
          <s-number-field
            label="Longest processing time"
            name="processingMaxDays"
            value={intFieldValue(shipping.processingMaxDays, SHIPPING_DAY_LIMITS.processingMax, 1)}
            min={SHIPPING_DAY_LIMITS.processingMax.min}
            max={SHIPPING_DAY_LIMITS.processingMax.max}
            step={1}
            suffix="days"
            error={errors.processingMaxDays}
            onInput={(event) => boundedIntFromEvent(event, SHIPPING_DAY_LIMITS.processingMax, 1)}
          ></s-number-field>
        </s-grid>
        <s-paragraph color="subdued">Maximum allowed duration is {SHIPPING_DAY_MAX} days.</s-paragraph>
        <s-text-field
          label="Cutoff time"
          name="cutoffTime"
          value={shipping.cutoffTime}
          details="Example: 12:00 PM"
          error={errors.cutoffTime}
        ></s-text-field>
        <TimezonePicker value={timezone} error={errors.timezone} />
        <WorkingDaySwitches
          days={shipping.workingDays}
          namePrefix="workingDay_"
          error={errors.workingDays}
        />
        <input type="hidden" name="blockedDates" value={JSON.stringify(blockedDates)} />
        <BlockedDatesEditor
          dates={blockedDates}
          dateName="newBlockedDate"
          nameField="newBlockedName"
          addIntent="addBlockedDate"
          removeName="removeBlockedDate"
          emptyLabel="No processing holidays yet."
        />
      </s-section>

      <s-section heading="Transit">
        <s-paragraph color="subdued">
          Shipping days after processing is complete. Transit uses its own working days and
          blocked dates.
        </s-paragraph>
        <s-grid gridTemplateColumns="1fr 1fr" gap="base">
          <s-number-field
            label="Shortest transit time"
            name="transitMinDays"
            value={intFieldValue(shipping.transitMinDays, SHIPPING_DAY_LIMITS.transitMin, 1)}
            min={SHIPPING_DAY_LIMITS.transitMin.min}
            max={SHIPPING_DAY_LIMITS.transitMin.max}
            step={1}
            suffix="days"
            error={errors.transitMinDays}
            onInput={(event) => boundedIntFromEvent(event, SHIPPING_DAY_LIMITS.transitMin, 1)}
          ></s-number-field>
          <s-number-field
            label="Longest transit time"
            name="transitMaxDays"
            value={intFieldValue(shipping.transitMaxDays, SHIPPING_DAY_LIMITS.transitMax, 2)}
            min={SHIPPING_DAY_LIMITS.transitMax.min}
            max={SHIPPING_DAY_LIMITS.transitMax.max}
            step={1}
            suffix="days"
            error={errors.transitMaxDays}
            onInput={(event) => boundedIntFromEvent(event, SHIPPING_DAY_LIMITS.transitMax, 2)}
          ></s-number-field>
        </s-grid>
        <s-paragraph color="subdued">Maximum allowed duration is {SHIPPING_DAY_MAX} days.</s-paragraph>
        <WorkingDaySwitches
          days={shipping.transitWorkingDays}
          namePrefix="transitDay_"
          error={errors.transitWorkingDays}
        />
        <input
          type="hidden"
          name="transitBlockedDates"
          value={JSON.stringify(transitBlockedDates)}
        />
        <BlockedDatesEditor
          dates={transitBlockedDates}
          dateName="newTransitBlockedDate"
          nameField="newTransitBlockedName"
          addIntent="addTransitBlockedDate"
          removeName="removeTransitBlockedDate"
          emptyLabel="No transit blocked dates yet."
        />
      </s-section>
    </s-stack>
  );
}

function WorkingDaySwitches({ days, namePrefix, error }) {
  return (
    <s-stack gap="small-200">
      <s-text type="strong">Working days</s-text>
      <s-paragraph color="subdued">Days counted when calculating this time.</s-paragraph>
      {WORKING_DAYS.map((day) => (
        <s-switch
          key={`${namePrefix}${day}`}
          label={DAY_LABELS[day]}
          name={`${namePrefix}${day}`}
          checked={days?.includes(day)}
        ></s-switch>
      ))}
      {error ? <s-banner tone="critical">{error}</s-banner> : null}
    </s-stack>
  );
}

function BlockedDatesEditor({
  dates,
  dateName,
  nameField,
  addIntent,
  removeName,
  emptyLabel,
}) {
  return (
    <s-stack gap="small-200">
      <s-text type="strong">Holidays / blocked dates</s-text>
      <s-paragraph color="subdued">Dates that are skipped when counting this time.</s-paragraph>
      {dates.length ? (
        dates.map((item) => (
          <s-stack key={`${item.date}-${item.name}`} direction="inline" gap="base" alignItems="center">
            <s-text>
              {item.date} - {item.name}
            </s-text>
            <s-button name={removeName} value={item.date} type="submit" variant="tertiary" tone="critical">
              Remove
            </s-button>
          </s-stack>
        ))
      ) : (
        <s-text color="subdued">{emptyLabel}</s-text>
      )}
      <s-grid gridTemplateColumns="1fr 1fr auto" gap="base" alignItems="end">
        <s-date-field
          label="Date"
          name={dateName}
          allow={`${localIsoDate()}--`}
          placeholder="Select date"
          details="Today and future dates only."
        ></s-date-field>
        <s-text-field label="Name" name={nameField} placeholder="Christmas Day"></s-text-field>
        <s-button name="intent" value={addIntent} type="submit">
          Add blocked date
        </s-button>
      </s-grid>
    </s-stack>
  );
}
