# FreelancePay AI

**AI-powered freelance invoice and payment management platform.**

FreelancePay AI helps freelancers manage invoices, interact with an AI assistant, and process payments through PayPal Sandbox.

## Features

- Create and manage invoices
- AI-powered assistant using Google Gemini
- PayPal Sandbox payment integration
- Invoice dashboard
- Express.js backend
- React + Vite frontend

## Tech Stack

- React
- Vite
- Node.js
- Express.js
- Google Gemini API
- PayPal Sandbox
- Supabase (database setup)

## Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/dev-aditya-design/FreelancePay-AI.git
cd FreelancePay-AI
```

### 2. Install dependencies

```bash
npm install
cd client
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. Add your own API credentials:

```env
GEMINI_API_KEY=your_gemini_api_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
```

Never publish real API keys or secrets.

### 4. Start the backend

From the project root:

```bash
node server.js
```

### 5. Start the frontend

Open another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

## Payment Testing

This project uses PayPal Sandbox for testing. No real payments are processed.

## Project Status

Development version — features and integrations are being tested.

## Developer

Aditya

GitHub: https://github.com/dev-aditya-design
