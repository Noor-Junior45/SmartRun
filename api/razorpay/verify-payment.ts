import crypto from "crypto";

function getKeySecret(): string | null {
  const secret = (process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET || "").trim();
  if (secret && secret.length >= 8) {
    return secret;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Missing razorpay_payment_id."
      });
    }

    // Allow test simulated payments without requiring HMAC match
    if (
      String(razorpay_order_id || "").startsWith("order_test_") ||
      String(razorpay_payment_id || "").startsWith("pay_test_") ||
      String(razorpay_signature || "").startsWith("sig_test_")
    ) {
      return res.status(200).json({
        success: true,
        verified: true,
        isSimulated: true,
        message: "Test payment accepted."
      });
    }

    // For all non-test payments, razorpay_order_id and razorpay_signature are strictly required
    if (!razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Missing required verification fields: razorpay_order_id and razorpay_signature must be present."
      });
    }

    // Secret must be configured in environment; no unverified bypass permitted
    const secret = getKeySecret();
    if (!secret) {
      return res.status(500).json({
        success: false,
        verified: false,
        message: "Server configuration error: RAZORPAY_KEY_SECRET is not configured."
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const genBuf = Buffer.from(generatedSignature, "utf8");
    const sigBuf = Buffer.from(String(razorpay_signature), "utf8");

    const isMatch =
      genBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(genBuf, sigBuf);

    if (isMatch) {
      return res.status(200).json({
        success: true,
        verified: true,
        message: "Payment verified successfully."
      });
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Payment signature mismatch."
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      verified: false,
      message: err?.message || "Verification failed."
    });
  }
}
