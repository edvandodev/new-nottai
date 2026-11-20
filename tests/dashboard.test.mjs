import test from "node:test";
import assert from "node:assert/strict";
import { dashboardSummary } from "../src/pages/dashboard/summary.ts";

const now = new Date(2026, 10, 12, 12);
const at = (day, month = 10) => new Date(2026, month, day, 12).toISOString();
const clients = [{ id: "a" }, { id: "b" }];
const sale = (id, date, value, status = "PRAZO") => ({
  id,
  clientId: "a",
  date,
  totalValue: value,
  liters: value / 4,
  pricePerLiter: 4,
  paymentStatus: status,
});

test("empty account has zero totals and no invented activity", () => {
  const result = dashboardSummary([], [], [], new Map(), now);
  assert.equal(result.total, 0);
  assert.equal(result.received, 0);
  assert.equal(result.outstanding, 0);
  assert.equal(result.recent.length, 0);
  assert.deepEqual(
    result.weekly.map((week) => week.value),
    [0, 0, 0, 0, 0],
  );
});

test("cash sales and their payment records are counted once in each distinct metric", () => {
  const sales = [
    sale("cash", at(1), 100, "AVISTA"),
    sale("credit", at(8), 200),
  ];
  const payments = [
    { id: "p1", clientId: "a", date: at(1), amount: 100 },
    { id: "p2", clientId: "a", date: at(9), amount: 50 },
  ];
  const result = dashboardSummary(
    sales,
    payments,
    clients,
    new Map([
      ["a", 150],
      ["b", -20],
    ]),
    now,
  );
  assert.equal(result.total, 300);
  assert.equal(result.received, 150);
  assert.equal(result.liters, 75);
  assert.equal(result.cash, 100);
  assert.equal(result.credit, 200);
  assert.equal(result.outstanding, 150);
  assert.equal(result.pendingClients, 1);
  assert.deepEqual(
    result.weekly.map((week) => week.value),
    [100, 200, 0, 0, 0],
  );
});

test("monthly totals exclude other months and invalid dates; balances remain all-time", () => {
  const sales = [
    sale("old", at(31, 9), 80),
    sale("start", at(1), 100),
    sale("end", at(30), 120),
    sale("future", at(1, 11), 90),
    sale("invalid", "bad-date", 999),
  ];
  const result = dashboardSummary(
    sales,
    [],
    clients,
    new Map([["a", 300]]),
    now,
  );
  assert.equal(result.total, 220);
  assert.equal(result.outstanding, 300);
  assert.equal(result.weekly[4].value, 120);
  assert.equal(result.weekly[4].label, "29–30");
});

test("February has four weeks; leap February has a final one-day interval", () => {
  const regular = dashboardSummary(
    [],
    [],
    [],
    new Map(),
    new Date(2026, 1, 15),
  );
  const leap = dashboardSummary([], [], [], new Map(), new Date(2028, 1, 15));
  assert.equal(regular.weekly.length, 4);
  assert.equal(regular.weekly.at(-1).label, "22–28");
  assert.equal(leap.weekly.at(-1).label, "29–29");
});

test("recent payments are ordered and capped without mutating source records", () => {
  const payments = [2, 5, 1, 4, 3].map((day) => ({
    id: String(day),
    clientId: "a",
    date: at(day),
    amount: day,
  }));
  const before = structuredClone(payments);
  const result = dashboardSummary([], payments, clients, new Map(), now);
  assert.deepEqual(
    result.recent.map((payment) => payment.id),
    ["5", "4", "3", "2"],
  );
  assert.deepEqual(payments, before);
});
