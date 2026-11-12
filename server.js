
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

// Google AI Studio / Gemini
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite"
];

// PayPal Sandbox
const PAYPAL_BASE =
  process.env.PAYPAL_API_BASE ||
  "https://api-m.sandbox.paypal.com";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

function paypalConfigured() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET
  );
}

async function getPayPalAccessToken() {
  if (!paypalConfigured()) {
    throw new Error("PayPal credentials are missing in .env");
  }

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal authentication failed: ${JSON.stringify(data)}`
    );
  }

  return data.access_token;
}

async function paypalRequest(path, accessToken, method = "GET", body) {
  const response = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `PayPal API error (${response.status}): ${JSON.stringify(data)}`
    );
  }

  return data;
}

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FreelancePay AI Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    aiConfigured: Boolean(ai),
    paypalConfigured: paypalConfigured()
  });
});

// Gemini model information
app.get("/api/ai/status", (req, res) => {
  res.json({
    success: true,
    configured: Boolean(ai),
    primaryModel: GEMINI_MODELS[0],
    fallbackModels: GEMINI_MODELS.slice(1)
  });
});

// Gemini AI chat with automatic model fallback
app.post("/api/ai/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid message."
      });
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is missing. Check your .env file."
      });
    }

    const prompt = `
You are FreelancePay AI, a helpful assistant for freelancers.
Help users with invoices, payments, clients, pricing and business.
Give practical, clear and concise answers.

User message: ${message}
`;

    const errors = [];

    for (const model of GEMINI_MODELS) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt
        });

        const reply = result.text;

        if (!reply) {
          throw new Error("Gemini returned an empty response.");
        }

        return res.json({
          success: true,
          model,
          reply
        });
      } catch (error) {
        console.error(`Gemini ${model} failed:`, error.message);
        errors.push({
          model,
          error: error.message
        });

        // Try the next model if this one is unavailable.
      }
    }

    return res.status(503).json({
      success: false,
      error: "All configured Gemini models are currently unavailable.",
      details: errors
    });

  } catch (error) {
    console.error("Gemini error:", error);

    res.status(500).json({
      success: false,
      error: "Gemini request failed.",
      details: error.message
    });
  }
});

// PayPal frontend configuration
app.get("/api/paypal/config", (req, res) => {
  res.json({
    success: true,
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    currency: "USD",
    environment: "sandbox"
  });
});

// Create PayPal order
app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();

    const order = await paypalRequest(
      "/v2/checkout/orders",
      accessToken,
      "POST",
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "5.00"
            },
            description: "FreelancePay AI Test Payment"
          }
        ],
        application_context: {
          brand_name: "FreelancePay AI",
          user_action: "PAY_NOW",
          return_url: `${FRONTEND_URL}/?payment=success`,
          cancel_url: `${FRONTEND_URL}/?payment=cancel`
        }
      }
    );

    const approvalUrl = order.links?.find(
      link => link.rel === "approve"
    )?.href;

    res.json({
      success: true,
      orderId: order.id,
      status: order.status,
      approvalUrl
    });

  } catch (error) {
    console.error("PayPal create order error:", error);

    res.status(500).json({
      success: false,
      error: "Could not create PayPal order.",
      details: error.message
    });
  }
});

// Check PayPal order status
app.get("/api/paypal/order/:orderId", async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();

    const order = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(req.params.orderId)}`,
      accessToken
    );

    res.json({
      success: true,
      orderId: order.id,
      status: order.status
    });

  } catch (error) {
    console.error("PayPal order status error:", error);

    res.status(500).json({
      success: false,
      error: "Could not retrieve order status.",
      details: error.message
    });
  }
});

// Capture approved PayPal order
app.post("/api/paypal/capture-order/:orderId", async (req, res) => {
  try {
    const accessToken = await getPayPalAccessToken();

    const orderId = encodeURIComponent(req.params.orderId);

    const order = await paypalRequest(
      `/v2/checkout/orders/${orderId}`,
      accessToken
    );

    if (order.status === "COMPLETED") {
      return res.json({
        success: true,
        message: "Payment already completed.",
        orderId: order.id,
        status: order.status
      });
    }

    if (order.status !== "APPROVED") {
      return res.status(409).json({
        success: false,
        error: "Buyer approval is required before capture.",
        status: order.status
      });
    }

    const capture = await paypalRequest(
      `/v2/checkout/orders/${orderId}/capture`,
      accessToken,
      "POST",
      {}
    );

    res.json({
      success: capture.status === "COMPLETED",
      orderId: capture.id,
      status: capture.status,
      details: capture.purchase_units
    });

  } catch (error) {
    console.error("PayPal capture error:", error);

    res.status(500).json({
      success: false,
      error: "PayPal payment capture failed.",
      details: error.message
    });
  }
});

// Start backend
app.listen(PORT, () => {
  console.log(`FreelancePay AI running at http://localhost:${PORT}`);
});
