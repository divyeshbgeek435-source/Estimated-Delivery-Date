import { WORKING_DAYS } from "../../lib/constants";

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
            value={String(shipping.processingMinDays)}
            min={0}
            max={30}
            suffix="days"
            error={errors.processingMinDays}
          ></s-number-field>
          <s-number-field
            label="Longest processing time"
            name="processingMaxDays"
            value={String(shipping.processingMaxDays)}
            min={0}
            max={60}
            suffix="days"
            error={errors.processingMaxDays}
          ></s-number-field>
        </s-grid>
        <s-text-field
          label="Cutoff time"
          name="cutoffTime"
          value={shipping.cutoffTime}
          details="Example: 12:00 PM"
          error={errors.cutoffTime}
        ></s-text-field>
        <s-text-field
          label="Timezone"
          name="timezone"
          value={timezone}
          details="IANA timezone, for example America/New_York"
        ></s-text-field>
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
            value={String(shipping.transitMinDays ?? 2)}
            min={0}
            max={30}
            suffix="days"
            error={errors.transitMinDays}
          ></s-number-field>
          <s-number-field
            label="Longest transit time"
            name="transitMaxDays"
            value={String(shipping.transitMaxDays ?? 5)}
            min={0}
            max={60}
            suffix="days"
            error={errors.transitMaxDays}
          ></s-number-field>
        </s-grid>
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
    <s-stack gap="base">
      <s-text type="strong">Holidays / blocked dates</s-text>
      {dates.length ? (
        dates.map((item) => (
          <s-stack key={`${item.date}-${item.name}`} direction="inline" gap="base" alignItems="center">
            <s-text>
              {item.date} — {item.name}
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
        <s-date-field label="Date" name={dateName}></s-date-field>
        <s-text-field label="Name" name={nameField} placeholder="Christmas Day"></s-text-field>
        <s-button name="intent" value={addIntent} type="submit">
          Add blocked date
        </s-button>
      </s-grid>
    </s-stack>
  );
}
