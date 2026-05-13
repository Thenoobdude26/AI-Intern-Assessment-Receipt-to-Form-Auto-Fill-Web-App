const express = require("express");
const multer = require("multer");
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

const geminiApiKey = process.env.GEMINI_API_KEY;

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/extract", upload.single("receipt"), async (req, res) => {
  if (!geminiApiKey) {
    res.status(500).json({
      error: "Missing GEMINI_API_KEY. Set it in your environment.",
    });
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Gemini API error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
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