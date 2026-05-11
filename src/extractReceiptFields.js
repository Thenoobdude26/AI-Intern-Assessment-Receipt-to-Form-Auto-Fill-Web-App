function normalizeReceiptFields(raw = {}) {
  const merchantName =
    typeof raw.merchant_name === "string"
      ? raw.merchant_name
      : typeof raw.merchantName === "string"
      ? raw.merchantName
      : "";

  const date = typeof raw.date === "string" ? raw.date : "";

  const totalAmountRaw =
    raw.total_amount !== undefined ? raw.total_amount : raw.totalAmount;
  const totalAmount =
    totalAmountRaw === null || totalAmountRaw === undefined
      ? ""
      : String(totalAmountRaw);

  const currency = typeof raw.currency === "string" ? raw.currency : "";

  return {
    merchantName: merchantName.trim(),
    date: date.trim(),
    totalAmount: totalAmount.trim(),
    currency: currency.trim().toUpperCase(),
  };
}

function extractJsonContent(responseText) {
  const text = String(responseText || "").trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && start < end) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON.");
  }
}

module.exports = {
  normalizeReceiptFields,
  extractJsonContent,
};
