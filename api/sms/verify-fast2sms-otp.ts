import crypto from "crypto";

// Serverless endpoint for Vercel: /api/sms/verify-fast2sms-otp
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
    const { phone, otp, token } = req.body || {};
    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    const cleanOtp = String(otp || "").trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: "Invalid phone number." });
    }
    if (!cleanOtp || cleanOtp.length !== 6) {
      return res.status(400).json({ success: false, error: "Please enter a valid 6-digit OTP." });
    }

    const secret = (process.env.FAST2SMS_API_KEY || "smartrun-otp-secret-key").trim();

    // 1. Primary Verification: Stateless Cryptographic Token (HMAC-SHA256)
    // 100% resilient across serverless lambdas, cold starts, and container boundaries!
    if (token && typeof token === "string" && token.includes(".")) {
      const parts = token.split(".");
      const expiresAt = Number(parts[0]);
      const signature = parts[1];

      if (isNaN(expiresAt) || !signature) {
        return res.status(400).json({
          success: false,
          error: "Malformed verification token. Please tap 'Resend OTP'."
        });
      }

      if (Date.now() > expiresAt) {
        return res.status(400).json({
          success: false,
          error: "OTP code has expired. Please tap 'Resend OTP'."
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${cleanPhone}:${cleanOtp}:${expiresAt}`)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({
          success: false,
          error: "Incorrect OTP code. Please enter the valid code received on your phone."
        });
      }

      // Validated via cryptographic proof!
      if (otpStore.has(cleanPhone)) {
        otpStore.delete(cleanPhone);
      }

      return res.status(200).json({
        success: true,
        verified: true,
        phone: `+91${cleanPhone}`,
        message: "Phone number verified successfully."
      });
    }

    // 2. Secondary Fallback: In-memory warm container cache
    const cached = otpStore.get(cleanPhone);
    if (!cached) {
      return res.status(400).json({
        success: false,
        error: "No active OTP found or code expired. Please tap 'Resend OTP'."
      });
    }

    if (Date.now() > cached.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        error: "OTP code has expired. Please request a fresh OTP."
      });
    }

    cached.attempts += 1;
    if (cached.attempts > 5) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        error: "Too many invalid attempts. Please request a new OTP."
      });
    }

    if (cached.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP code. (${5 - cached.attempts} attempts remaining)`
      });
    }

    // Successfully verified!
    otpStore.delete(cleanPhone);
    return res.status(200).json({
      success: true,
      verified: true,
      phone: `+91${cleanPhone}`,
      message: "Phone number verified successfully."
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Server error verifying OTP."
    });
  }
}
