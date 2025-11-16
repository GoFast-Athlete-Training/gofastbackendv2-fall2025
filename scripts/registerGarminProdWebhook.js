import dotenv from "dotenv";
import { GARMIN_CONFIG } from '../services/garminUtils.js';

dotenv.config();

const GARMIN_API_BASE = "https://apis.garmin.com/health-api/v1";
const CALLBACK_URL = GARMIN_CONFIG.WEBHOOK_URLS.ACTIVITY; // Production webhook URL from config

(async () => {
  try {
    const token = process.env.GARMIN_PROD_ACCESS_TOKEN;
    if (!token) {
      throw new Error("❌ Missing GARMIN_PROD_ACCESS_TOKEN in .env");
    }

    // STEP 1: Check existing subscriptions
    console.log("🔍 Checking Garmin Production subscriptions...");
    const checkRes = await fetch(`${GARMIN_API_BASE}/users/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!checkRes.ok) {
      const errorText = await checkRes.text();
      throw new Error(`❌ Failed to check subscriptions: ${checkRes.status} - ${errorText}`);
    }

    const current = await checkRes.json();
    console.log("📦 Current subs:", JSON.stringify(current, null, 2));

    const already = Array.isArray(current) && current.some(s => s.callbackUrl === CALLBACK_URL);
    if (already) {
      console.log("✅ Already subscribed to:", CALLBACK_URL);
      process.exit(0);
    }

    // STEP 2: Register new subscription
    console.log("🚀 Registering new Production webhook...");
    console.log("📡 Callback URL:", CALLBACK_URL);
    
    const res = await fetch(`${GARMIN_API_BASE}/push/subscription`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ callbackUrl: CALLBACK_URL }),
    });

    const data = await res.json();
    console.log("📡 Garmin Response:", JSON.stringify(data, null, 2));
    
    if (res.ok) {
      console.log("✅ Done. Status:", res.status);
      console.log("🎉 Webhook registered successfully!");
    } else {
      console.error("❌ Failed to register webhook. Status:", res.status);
      console.error("❌ Response:", data);
      process.exit(1);
    }

  } catch (err) {
    console.error("💥 Garmin webhook registration failed:", err);
    process.exit(1);
  }
})();

