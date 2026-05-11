const express = require("express");
const multer = require("multer");
const OpenAI = require("openai");
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

const openaiApiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/extract", upload.single("receipt"), async (req, res) => {
  if (!openai) {
    res.status(500).json({
      error:
        "Missing OPENAI_API_KEY. Set it in your environment before extracting receipt data.",
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Please upload a receipt image file." });
    return;
  }

  try {
    const imageDataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
      "base64"
    )}`;

    const completion = await openai.chat.completions.create({
      model: openaiModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract receipt fields and return JSON only with keys merchant_name, date, total_amount, currency.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract merchant name, date, total amount, and currency from this receipt image.",
            },
            {
              type: "image_url",
              image_url: { url: imageDataUri },
            },
          ],
        },
      ],
    });

    const text = completion.choices?.[0]?.message?.content || "{}";
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
