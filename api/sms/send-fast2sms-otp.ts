import crypto from "crypto";

// Serverless endpoint for Vercel: /api/sms/send-fast2sms-otp
// In-memory cache across warm invocations
declare global {
  // eslint-disable-next-line no-var
  var __fast2smsOtpStore: Map<string, { otp: string; expiresAt: number; attempts: number }> | undefined;
}

if (!global.__fast2smsOtpStore) {
  global.__fast2smsOtpStore = new Map();
}

const otpStore = global.__fast2smsOtpStore;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { phone } = req.body || {};
    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: "Please enter a valid 10-digit Indian mobile number."
      });
    }

    const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "FAST2SMS_API_KEY is not configured on the server."
      });
    }

    // Generate random 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    let sendSuccess = false;
    let routeUsed = "otp";
    let lastError = "";
    let statusCode: number | undefined;

    // 1. Primary Attempt: Dedicated Fast2SMS OTP route ("otp")
    // Pre-approved DLT telecom registration, delivers to BOTH DND and Non-DND numbers, lowest cost (~₹0.20)
    try {
      console.log(`[Fast2SMS Vercel] Attempting primary OTP route dispatch for phone ${cleanPhone.slice(0, 4)}****`);
      const otpRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: generatedOtp,
          numbers: cleanPhone
        })
      });

      const otpData: any = await otpRes.json().catch(() => null);
      if (otpRes.ok && otpData && otpData.return === true) {
        sendSuccess = true;
        routeUsed = "otp";
      } else {
        statusCode = otpData?.status_code;
        lastError = Array.isArray(otpData?.message)
          ? otpData.message.join(", ")
          : String(otpData?.message || "OTP route failed");
        console.warn("[Fast2SMS Vercel] OTP route response:", lastError, "status:", statusCode);
      }
    } catch (oErr: any) {
      lastError = oErr?.message || "OTP route error";
      console.warn("[Fast2SMS Vercel] OTP route error:", lastError);
    }

    // 2. Secondary Fallback: Quick SMS route ("q") if OTP route failed
    if (!sendSuccess) {
      try {
        console.log(`[Fast2SMS Vercel] Attempting fallback Quick SMS route for phone ${cleanPhone.slice(0, 4)}****`);
        const quickRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: "POST",
          headers: {
            authorization: apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            route: "q",
            message: `Your SmartRun verification OTP is ${generatedOtp}. Valid for 10 minutes.`,
            language: "english",
            flash: 0,
            numbers: cleanPhone
          })
        });

        const quickData: any = await quickRes.json().catch(() => null);
        if (quickRes.ok && quickData && quickData.return === true) {
          sendSuccess = true;
          routeUsed = "quick";
        } else {
          statusCode = quickData?.status_code || statusCode;
          const qMsg = Array.isArray(quickData?.message)
            ? quickData.message.join(", ")
            : String(quickData?.message || "");
          if (qMsg) lastError = qMsg;
          console.warn("[Fast2SMS Vercel] Quick SMS route response:", lastError, "status:", statusCode);
        }
      } catch (qErr: any) {
        console.warn("[Fast2SMS Vercel] Quick SMS error:", qErr);
      }
    }

    if (!sendSuccess) {
      // Provide clean, human-actionable error messages
      if (statusCode === 427 || lastError.toLowerCase().includes("dnd")) {
        lastError = "This mobile number is registered on TRAI DND (Do Not Disturb). Fast2SMS Quick SMS cannot deliver to DND-registered numbers. Please use a non-DND phone or complete DLT verification.";
      } else if (statusCode === 414 || lastError.toLowerCase().includes("blacklisted")) {
        lastError = "Fast2SMS Error 414: Server IP is restricted in your Fast2SMS settings. Please log into Fast2SMS Dashboard -> Dev API -> SECURITY tab and disable IP Whitelisting.";
      } else if (statusCode === 402 || lastError.toLowerCase().includes("balance")) {
        lastError = "Fast2SMS Error: Insufficient wallet balance in your Fast2SMS account. Please add credits to your Fast2SMS wallet.";
      }

      return res.status(400).json({
        success: false,
        error: lastError || "Fast2SMS was unable to deliver SMS to this number."
      });
    }

    // 3. Generate Cryptographic Stateless Verification Token (HMAC-SHA256)
    // Solves serverless instance memory loss between send and verify lambda functions!
    const secret = (process.env.FAST2SMS_API_KEY || "smartrun-otp-secret-key").trim();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${cleanPhone}:${generatedOtp}:${expiresAt}`)
      .digest("hex");
    const token = `${expiresAt}.${signature}`;

    // Also store in warm cache Map as secondary backup
    otpStore.set(cleanPhone, {
      otp: generatedOtp,
      expiresAt,
      attempts: 0
    });

    return res.status(200).json({
      success: true,
      phone: cleanPhone,
      token,
      routeUsed,
      message: `OTP sent successfully via Fast2SMS to +91 ${cleanPhone}.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Server error sending SMS OTP."
    });
  }
}
