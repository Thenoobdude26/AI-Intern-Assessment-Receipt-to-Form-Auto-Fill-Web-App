require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const port = Number(process.env.PORT || 3000);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are supported."));
  },
});

const groqApiKey = process.env.GROQ_API_KEY;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/api/extract", upload.single("receipt"), async (req, res) => {
  if (!groqApiKey) {
    res.status(500).json({ error: "Missing GROQ_API_KEY." });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "Please upload a receipt image file." });
    return;
  }

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    const prompt = `Extract receipt fields from this image and return ONLY a valid JSON object. No markdown, no explanation, no backticks.

Return exactly this shape:
{"merchant_name":"...","date":"YYYY-MM-DD","total_amount":0.00,"currency":"USD"}

Rules:
- date must be ISO 8601 (YYYY-MM-DD) or null if not found
- total_amount must be a number (float) or null if not found
- currency must be a 3-letter ISO code (USD, MYR, GBP, etc.) inferred from symbols or context
- merchant_name is the store or business name`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Groq API error");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    const parsed = extractJsonContent(text);
    res.json({ fields: normalizeReceiptFields(parsed) });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to extract receipt fields." });
  }
});

app.post("/api/submit", async (req, res) => {
  const { merchantName, date, totalAmount, currency } = req.body;

  if (!merchantName) {
    res.status(400).json({ error: "Merchant name is required." });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO extracted_data (merchant_name, date, total_amount, currency)
       VALUES ($1, $2, $3, $4)`,
      [merchantName, date || null, totalAmount || null, currency || null]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to save submission." });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message || "Upload failed." });
});

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
