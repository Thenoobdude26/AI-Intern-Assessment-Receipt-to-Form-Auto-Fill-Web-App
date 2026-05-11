const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeReceiptFields,
  extractJsonContent,
} = require("../src/extractReceiptFields");

test("normalizeReceiptFields maps known keys and normalizes values", () => {
  const normalized = normalizeReceiptFields({
    merchant_name: "  Super Store  ",
    date: " 2026-01-12 ",
    total_amount: 31.99,
    currency: " usd ",
  });

  assert.deepEqual(normalized, {
    merchantName: "Super Store",
    date: "2026-01-12",
    totalAmount: "31.99",
    currency: "USD",
  });
});

test("extractJsonContent supports JSON wrapped in extra text", () => {
  const parsed = extractJsonContent(
    'Result:\n{"merchant_name":"Cafe","date":"2026-05-10","total_amount":"14.20","currency":"EUR"}\nDone'
  );

  assert.equal(parsed.merchant_name, "Cafe");
  assert.equal(parsed.currency, "EUR");
});
