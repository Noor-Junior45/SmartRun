import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false
  }
};

/**
 * Helper to read the raw request body Buffer.
 * Supports Vercel Serverless Function runtimes with bodyParser disabled,
 * as well as runtimes where rawBody or pre-buffered body is attached.
 */
async function getRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.rawBody === "string") {
    return Buffer.from(req.rawBody, "utf8");
  }
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", (err: any) => {
      reject(err);
    });
  });
}

function getWebhookSecret(): string | null {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (secret && secret.length >= 8) {
    return secret;
  }
  return null;
}

function getSupabaseClient(): any {
  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Razorpay-Signature"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      console.warn("[Razorpay Webhook] RAZORPAY_WEBHOOK_SECRET is not configured in environment.");
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Webhook configuration error: RAZORPAY_WEBHOOK_SECRET is not configured."
      });
    }

    const signature = (
      req.headers["x-razorpay-signature"] ||
      req.headers["X-Razorpay-Signature"] ||
      ""
    ) as string;

    if (!signature) {
      console.warn("[Razorpay Webhook] Missing x-razorpay-signature header.");
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Missing required signature header: x-razorpay-signature."
      });
    }

    // Read raw body bytes for cryptographic verification
    let rawBodyBuffer: Buffer;
    try {
      rawBodyBuffer = await getRawBody(req);
    } catch (readErr: any) {
      console.error("[Razorpay Webhook] Failed to read raw body:", readErr);
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Could not read raw request body."
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBodyBuffer)
      .digest("hex");

    const genBuf = Buffer.from(generatedSignature, "utf8");
    const sigBuf = Buffer.from(String(signature), "utf8");

    const isMatch =
      genBuf.length === sigBuf.length &&
      crypto.timingSafeEqual(genBuf, sigBuf);

    if (!isMatch) {
      console.warn("[Razorpay Webhook] Signature mismatch.");
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Webhook signature mismatch."
      });
    }

    // Parse JSON event from raw bytes after successful HMAC verification
    let eventData: any;
    try {
      eventData = JSON.parse(rawBodyBuffer.toString("utf8"));
    } catch (parseErr) {
      console.error("[Razorpay Webhook] Failed to parse verified JSON payload:", parseErr);
      return res.status(400).json({
        success: false,
        message: "Malformed JSON payload."
      });
    }

    const event = eventData?.event;
    const payload = eventData?.payload;
    console.log(`[Razorpay Webhook] Verified event received: ${event}`);

    const supabase = getSupabaseClient();
    if (!supabase) {
      console.error("[Razorpay Webhook] Supabase client could not be initialized with service role key.");
      return res.status(500).json({
        success: false,
        message: "Database connection configuration error: SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL missing."
      });
    }

    // Handle supported Razorpay event types
    if (event === "payment.captured") {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (!razorpayOrderId) {
        console.warn("[Razorpay Webhook] 'payment.captured' received without order_id:", paymentEntity?.id);
        return res.status(200).json({ success: true, message: "Event received with no order_id" });
      }

      console.log(`[Razorpay Webhook] Updating order ${razorpayOrderId} to 'paid' (paymentId: ${razorpayPaymentId})`);
      const { data, error } = await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          razorpay_payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString()
        })
        .eq("razorpay_order_id", razorpayOrderId)
        .select("id");

      if (error) {
        console.error("[Razorpay Webhook] Database error updating order payment.captured:", error);
        return res.status(500).json({ success: false, message: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`[Razorpay Webhook] Warning: No matching order found for razorpay_order_id: ${razorpayOrderId}`);
      } else {
        console.log(`[Razorpay Webhook] Successfully updated ${data.length} order(s) for ${razorpayOrderId}`);
      }

      return res.status(200).json({ success: true, message: "Payment captured processed" });
    } else if (event === "payment.failed") {
      const paymentEntity = payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (!razorpayOrderId) {
        console.warn("[Razorpay Webhook] 'payment.failed' received without order_id:", paymentEntity?.id);
        return res.status(200).json({ success: true, message: "Event received with no order_id" });
      }

      console.log(`[Razorpay Webhook] Updating order ${razorpayOrderId} to 'failed'`);
      const { data, error } = await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("razorpay_order_id", razorpayOrderId)
        .select("id");

      if (error) {
        console.error("[Razorpay Webhook] Database error updating order payment.failed:", error);
        return res.status(500).json({ success: false, message: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`[Razorpay Webhook] Warning: No matching order found for razorpay_order_id: ${razorpayOrderId}`);
      } else {
        console.log(`[Razorpay Webhook] Successfully marked order ${razorpayOrderId} as 'failed'`);
      }

      return res.status(200).json({ success: true, message: "Payment failed processed" });
    } else if (event === "refund.processed") {
      const refundEntity = payload?.refund?.entity;
      const razorpayPaymentId = refundEntity?.payment_id;

      if (!razorpayPaymentId) {
        console.warn("[Razorpay Webhook] 'refund.processed' received without payment_id:", refundEntity?.id);
        return res.status(200).json({ success: true, message: "Event received with no payment_id" });
      }

      console.log(`[Razorpay Webhook] Updating order with payment_id ${razorpayPaymentId} to refund_status 'processed'`);
      const { data, error } = await supabase
        .from("orders")
        .update({
          refund_status: "processed",
          updated_at: new Date().toISOString()
        })
        .eq("razorpay_payment_id", razorpayPaymentId)
        .select("id");

      if (error) {
        console.error("[Razorpay Webhook] Database error updating order refund.processed:", error);
        return res.status(500).json({ success: false, message: error.message });
      }

      if (!data || data.length === 0) {
        console.warn(`[Razorpay Webhook] Warning: No matching order found for razorpay_payment_id: ${razorpayPaymentId}`);
      } else {
        console.log(`[Razorpay Webhook] Successfully updated refund_status for ${razorpayPaymentId}`);
      }

      return res.status(200).json({ success: true, message: "Refund processed handled" });
    } else {
      // Acknowledge unhandled events with 200 so Razorpay does not retry
      console.log(`[Razorpay Webhook] Unhandled event type acknowledged: ${event}`);
      return res.status(200).json({
        success: true,
        message: `Event '${event}' acknowledged without action.`
      });
    }
  } catch (err: any) {
    console.error("[Razorpay Webhook Unexpected Error]:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Internal server error processing webhook."
    });
  }
}
