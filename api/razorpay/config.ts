function getKeyId(): string {
  const envKey = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim();
  if (envKey && (envKey.startsWith("rzp_test_") || envKey.startsWith("rzp_live_"))) {
    return envKey;
  }
  return "";
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawKeyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "").trim();
  const keyId = getKeyId();
  const secret = (process.env.RAZORPAY_KEY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET || "").trim();
  const isConfigured = Boolean(
    keyId &&
    (keyId.startsWith("rzp_live_") || keyId.startsWith("rzp_test_")) &&
    secret &&
    secret.length >= 8
  );

  let diagnostic = "";
  if (!keyId) {
    if (!rawKeyId) {
      diagnostic = "RAZORPAY_KEY_ID is missing. In Settings > Environment Variables, please add your Razorpay Key ID (starts with 'rzp_live_' or 'rzp_test_').";
    } else {
      diagnostic = `RAZORPAY_KEY_ID in Settings > Environment Variables is currently '${rawKeyId}'. It must start with 'rzp_live_' or 'rzp_test_' from your Razorpay Dashboard.`;
    }
  } else if (!secret) {
    diagnostic = "RAZORPAY_KEY_SECRET is missing. In Settings > Environment Variables, please add your Razorpay Key Secret.";
  }

  return res.status(200).json({
    success: isConfigured,
    keyId,
    isConfigured,
    diagnostic: !isConfigured ? diagnostic : undefined,
    merchantName: "SmartRun",
    currency: "INR"
  });
}
