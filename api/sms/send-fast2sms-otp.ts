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

    // 1. Try Quick SMS route ("q")
    let sendSuccess = false;
    let routeUsed = "quick";
    let lastError = "";

    try {
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
        lastError = Array.isArray(quickData?.message)
          ? quickData.message.join(", ")
          : String(quickData?.message || "Quick SMS failed");
      }
    } catch (qErr: any) {
      lastError = qErr?.message || "Quick SMS error";
    }

    // 2. Secondary fallback: OTP route
    if (!sendSuccess) {
      try {
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
          lastError = Array.isArray(otpData?.message)
            ? otpData.message.join(", ")
            : String(otpData?.message || lastError);
        }
      } catch (oErr: any) {
        lastError = oErr?.message || lastError;
      }
    }

    if (!sendSuccess) {
      return res.status(400).json({
        success: false,
        error: lastError || "Fast2SMS was unable to deliver SMS to this number."
      });
    }

    // Store OTP for 10 minutes
    otpStore.set(cleanPhone, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });

    return res.status(200).json({
      success: true,
      phone: cleanPhone,
      routeUsed,
      message: `OTP sent successfully to +91 ${cleanPhone}.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Server error sending SMS OTP."
    });
  }
}
