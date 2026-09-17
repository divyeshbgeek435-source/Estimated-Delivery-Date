import { calculateDeliveryDate } from "./delivery-calculator.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(name, fn) {
  fn();
  console.log(`ok ${name}`);
}

run("empty processing days does not hang date math", () => {
  const started = Date.now();
  const result = calculateDeliveryDate({
    orderDate: new Date("2026-09-16T12:00:00.000Z"),
    processingMinDays: 1,
    processingMaxDays: 2,
    transitMinDays: 1,
    transitMaxDays: 2,
    workingDays: [],
    transitWorkingDays: ["MONDAY"],
  });
  assert(Date.now() - started < 1000, "empty working days must not hang");
  assert(Boolean(result.deliveryDateMax), "should still return a delivery date");
});

run("empty transit days does not hang date math", () => {
  const started = Date.now();
  const result = calculateDeliveryDate({
    orderDate: new Date("2026-09-16T12:00:00.000Z"),
    processingMinDays: 1,
    processingMaxDays: 2,
    transitMinDays: 1,
    transitMaxDays: 2,
    workingDays: ["FRIDAY"],
    transitWorkingDays: [],
  });
  assert(Date.now() - started < 1000, "empty transit days must not hang");
  assert(Boolean(result.deliveryDateMax), "should still return a delivery date");
});

run("a single selected day still advances processing", () => {
  const result = calculateDeliveryDate({
    orderDate: new Date("2026-09-16T12:00:00.000Z"),
    cutoffTime: "12:00 AM",
    processingMinDays: 1,
    processingMaxDays: 1,
    transitMinDays: 0,
    transitMaxDays: 0,
    workingDays: ["FRIDAY"],
    timezone: "UTC",
  });
  assert(result.processingDateMin !== "2026-09-16", "Friday-only processing should move off Wednesday");
});

console.log("All delivery-calculator tests passed.");
