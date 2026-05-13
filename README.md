# Receipt to Form Auto-Fill

Upload a receipt image, let AI extract the data, review it, and submit it to a database. simple web app.

**Live demo:** https://ai-intern-assessment-receipt-to-for.vercel.app/

---

## What it does

1. Upload a receipt image (JPG, PNG, WEBP)
2. AI extracts merchant name, date, total amount, and currency
3. Fields are auto-filled into an editable form
4. Submit saves the data to a Postgres database

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML, CSS, JS |
| Backend | Node.js + Express |
| AI | Groq API (Llama 4 Scout) — vision model |
| Database | Supabase (Postgres) |
| Hosting | Vercel |

---

## Project structure

```
├── public/
│   ├── index.html        # UI
│   ├── app.js            # Frontend logic
│   └── style.css         # Styles
├── server.js             # Express server, API routes
├── vercel.json           # Vercel deployment config
└── package.json
```

---

## API routes

### `POST /api/extract`
Accepts a multipart form upload (`receipt` field), sends the image to Groq, returns extracted fields.

**Response:**
```json
{
  "fields": {
    "merchantName": "Walmart",
    "date": "2011-11-06",
    "totalAmount": "46.30",
    "currency": "USD"
  }
}
```

### `POST /api/submit`
Accepts JSON body, inserts a row into the `extracted_data` table in Supabase.

**Body:**
```json
{
  "merchantName": "Walmart",
  "date": "2011-11-06",
  "totalAmount": "46.30",
  "currency": "USD"
}
```

---

## Database schema

```sql
create table public.extracted_data (
  id uuid not null default gen_random_uuid (),
  merchant_name text null,
  date date null,
  total_amount real null,
  currency text null,
  submitted_at timestamp with time zone null default now(),
  constraint extracted_data_pkey primary key (id)
) TABLESPACE pg_default;
```

---

## Running locally

**1. Clone and install**
```bash
git clone https://github.com/yourusername/AI-Intern-Assessment-Receipt-to-Form-Auto-Fill-Web-App
cd AI-Intern-Assessment-Receipt-to-Form-Auto-Fill-Web-App
npm install
```

**2. Set up environment variables**
```bash
cp .env.example .env
```

Fill in `.env`:
```
GROQ_API_KEY=groq_api_key
DATABASE_URL=supabase_connection_pooler_url
```

- Groq API key: [console.groq.com](https://console.groq.com) — free
- Supabase connection string

**3. Run**
```bash
node server.js
# http://localhost:3000
```

---