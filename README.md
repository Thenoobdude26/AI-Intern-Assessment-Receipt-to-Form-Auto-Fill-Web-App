# AI-Intern-Assessment-Receipt-to-Form-Auto-Fill-Web-App
Objective Build and deploy a simple web app that extracts information from a receipt using generative AI and auto-fills a form with the results.

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Export your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```
3. Start the app:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000`.

## Implemented requirements

- Upload receipt image from browser
- Extract fields using generative AI (OpenAI GPT model)
- Pre-fill editable form with extracted fields:
  - Merchant name
  - Date
  - Total amount
  - Currency
- Submit edited data (saved in browser local storage)
