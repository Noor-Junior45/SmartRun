// Serverless endpoint for Vercel: /api/sms/fast2sms-status
export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const key = (process.env.FAST2SMS_API_KEY || "").trim();
  const isConfigured = Boolean(key && key.length > 5);

  return res.status(200).json({
    configured: isConfigured,
    keyMasked: isConfigured ? `${key.slice(0, 4)}...${key.slice(-4)}` : null
  });
}
