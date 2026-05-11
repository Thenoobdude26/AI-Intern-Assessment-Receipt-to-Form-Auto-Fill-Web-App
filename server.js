const express = require("express");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");
const {
  normalizeReceiptFields,
  extractJsonContent,
} = require("./src/extractReceiptFields");

const app = express();
const port = Number(process.env.PORT || 3000);

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

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/extract", upload.single("receipt"), async (req, res) => {
  if (!anthropic) {
    res.status(500).json({
      error:
        "Missing ANTHROPIC_API_KEY. Set it in your environment before extracting receipt data.",
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Please upload a receipt image file." });
    return;
  }

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: `Extract receipt fields from this image and return ONLY a valid JSON object with no markdown, no explanation, no backticks.

Return exactly this shape:
{"merchant_name":"...","date":"YYYY-MM-DD","total_amount":0.00,"currency":"USD"}

Rules:
- date must be ISO 8601 (YYYY-MM-DD) or null if not found
- total_amount must be a number (float) or null if not found  
- currency must be a 3-letter ISO code (USD, MYR, GBP, etc.) inferred from symbols or context
- merchant_name is the store or business name`,
            },
          ],
        },
      ],
    });

    const text =
      message.content.find((b) => b.type === "text")?.text || "{}";
    const parsed = extractJsonContent(text);
    res.json({ fields: normalizeReceiptFields(parsed) });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to extract receipt fields.",
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ error: error.message || "Upload failed." });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
