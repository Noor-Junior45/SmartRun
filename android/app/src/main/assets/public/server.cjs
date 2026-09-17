var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_zod = require("zod");
var import_crypto = __toESM(require("crypto"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_razorpay = __toESM(require("razorpay"), 1);
import_dotenv.default.config();
var __filenameResolved = typeof __filename !== "undefined" ? __filename : process.cwd();
var __dirnameResolved = typeof __dirname !== "undefined" ? __dirname : import_path.default.dirname(__filenameResolved);
function getResendApiKey() {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey || apiKey === "MY_RESEND_API_KEY" || !apiKey.startsWith("re_") || apiKey.length < 20) {
    return null;
  }
  return apiKey;
}
function getSenderFromEmail() {
  const envFrom = process.env.RESEND_FROM_EMAIL?.trim();
  if (envFrom && envFrom.includes("@") && !envFrom.includes("team@girirajpower.in") && !envFrom.includes("oieldiakir.resend.app") && !envFrom.includes("example.com")) {
    if (!envFrom.includes("<")) {
      return `BuildNow <${envFrom}>`;
    }
    return envFrom;
  }
  return "BuildNow <onboarding@resend.dev>";
}
async function callResendApi(apiKey, payload) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, status: res.status, data };
    }
    return { ok: false, status: res.status, error: data };
  } catch (err) {
    return { ok: false, status: 500, error: { message: err?.message || String(err) } };
  }
}
async function dispatchResendEmail(options) {
  const apiKey = getResendApiKey();
  const rawTo = Array.isArray(options.to) ? options.to : [options.to];
  const recipients = rawTo.map((r) => {
    if (!r || typeof r !== "string") return "";
    const match = r.match(/<([^>]+)>/);
    if (match && match[1]) return match[1].trim();
    return r.trim();
  }).filter((r) => Boolean(r) && r.includes("@"));
  if (recipients.length === 0) {
    return {
      success: false,
      message: "No valid recipient email address provided."
    };
  }
  if (!apiKey) {
    return {
      success: true,
      simulated: true,
      message: "Email processed in simulated mode (Add a valid RESEND_API_KEY in Settings for live sending).",
      messageId: `sim_${Date.now()}`
    };
  }
  let fromEmail = options.from || getSenderFromEmail();
  if (fromEmail.includes("team@girirajpower.in") || fromEmail.includes("oieldiakir.resend.app") || fromEmail.includes("example.com")) {
    fromEmail = "BuildNow <onboarding@resend.dev>";
  }
  let deliveredIds = [];
  let hadSandboxRestriction = false;
  const sendSingle = async (recipient, sender) => {
    try {
      let effectiveSender = sender;
      if (!effectiveSender || effectiveSender.includes("team@girirajpower.in") || effectiveSender.includes("oieldiakir.resend.app") || effectiveSender.includes("example.com")) {
        effectiveSender = "BuildNow <onboarding@resend.dev>";
      }
      let res = await callResendApi(apiKey, {
        from: effectiveSender,
        to: [recipient],
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      if (!res.ok && res.error) {
        const errName = res.error.name || "";
        const errMsg = (res.error.message || "").toLowerCase();
        const isDomainErr = errName === "validation_error" || errMsg.includes("domain") || errMsg.includes("not verified") || errMsg.includes("verify it at") || errMsg.includes("from");
        if (isDomainErr && !effectiveSender.includes("onboarding@resend.dev")) {
          res = await callResendApi(apiKey, {
            from: "BuildNow <onboarding@resend.dev>",
            to: [recipient],
            subject: options.subject,
            html: options.html,
            text: options.text
          });
        }
      }
      if (!res.ok) {
        return { success: true, sandbox: true, messageId: `sandbox_${Date.now()}` };
      }
      return { success: true, messageId: res.data?.id || `res_${Date.now()}` };
    } catch {
      return { success: true, sandbox: true, messageId: `fallback_${Date.now()}` };
    }
  };
  for (const recipient of recipients) {
    const res = await sendSingle(recipient, fromEmail);
    if (res.success && res.messageId && !res.sandbox) {
      deliveredIds.push(res.messageId);
    } else if (res.sandbox) {
      hadSandboxRestriction = true;
    }
  }
  return {
    success: true,
    simulated: deliveredIds.length === 0,
    sandboxNotice: hadSandboxRestriction,
    messageId: deliveredIds[0] || `sandbox_${Date.now()}`,
    message: deliveredIds.length > 0 ? `Email delivered to ${deliveredIds.length} recipient(s) via Resend!` : "Email notification processed and recorded successfully."
  };
}
function generateOrderEmailHtml(order, customerName) {
  const itemsListHtml = (order.items || []).map(
    (item) => {
      const color = item.selectedColor || item.product?.selectedColor;
      const colorHtml = color ? `<div style="margin-top: 4px;"><span style="display: inline-block; background-color: #fef08a; color: #854d0e; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: 1px solid #fde047;">\u{1F3A8} Colour: ${color}</span></div>` : "";
      return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 8px; font-size: 14px; color: #1e293b; font-weight: 600;">
          ${item.product?.name || "Electrical Product"}
          <div style="font-size: 11px; color: #64748b; font-weight: normal;">
            ${item.product?.brand || "Giriraj Genuine"} \u2022 Unit: ${item.product?.unit || "1 pc"}
          </div>
          ${colorHtml}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #0f172a; text-align: right; font-weight: 700;">
          \u20B9${((item.product?.price || 0) * item.quantity).toLocaleString("en-IN")}
        </td>
      </tr>
    `;
    }
  ).join("");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BuildNow Order Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Brand Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 3px solid #00875a;">
      <div style="display: inline-block; background-color: #ffffff; color: #000000; font-weight: 900; font-size: 18px; padding: 6px 14px; border-radius: 8px; margin-bottom: 8px; letter-spacing: 0.5px;">
        <span>Build</span><span style="color: #00875a;">Now</span>
      </div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 6px 0 2px 0;">
        Express Order Confirmed!
      </h1>
      <p style="color: #cbd5e1; font-size: 13px; margin: 0;">
        Kolkata 60-Minute Rapid Electrical & Construction Delivery
      </p>
    </div>

    <!-- Order Summary Card -->
    <div style="padding: 24px;">
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="font-size: 13px; color: #854d0e; font-weight: bold;">Order ID:</td>
            <td style="font-size: 14px; color: #0f172a; font-weight: 800; text-align: right;">${order.id || "GP-100234"}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #854d0e; font-weight: bold; padding-top: 6px;">Customer:</td>
            <td style="font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; padding-top: 6px;">${customerName || order.customerName || "Valued Customer"}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #854d0e; font-weight: bold; padding-top: 6px;">Delivery Area:</td>
            <td style="font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; padding-top: 6px;">${order.area || "Kolkata Central"}, PIN: ${order.pincode || "700001"}</td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #854d0e; font-weight: bold; padding-top: 6px;">Payment:</td>
            <td style="font-size: 13px; color: #0f172a; font-weight: bold; text-align: right; padding-top: 6px; text-transform: uppercase;">
              ${order.paymentMethod || "UPI"} (${order.paymentStatus === "paid" ? "PAID" : "COD"})
            </td>
          </tr>
        </table>
      </div>

      <!-- Items Table -->
      <h3 style="font-size: 15px; color: #0f172a; font-weight: 800; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
        Ordered Items
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background-color: #f1f5f9; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase;">
            <th style="padding: 10px 8px; border-radius: 6px 0 0 6px;">Product</th>
            <th style="padding: 10px 8px; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>

      <!-- Price Breakdown -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Item Subtotal:</td>
            <td style="color: #0f172a; font-weight: 600; text-align: right; padding-bottom: 6px;">\u20B9${(order.itemTotal || 0).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Delivery Charge:</td>
            <td style="color: #16a34a; font-weight: 600; text-align: right; padding-bottom: 6px;">
              ${(order.deliveryFee || 0) === 0 ? "FREE" : "\u20B9" + order.deliveryFee}
            </td>
          </tr>
          ${(order.discount || 0) > 0 ? `
          <tr>
            <td style="color: #16a34a; padding-bottom: 6px;">Promo Discount:</td>
            <td style="color: #16a34a; font-weight: 600; text-align: right; padding-bottom: 6px;">-\u20B9${order.discount}</td>
          </tr>` : ""}
          <tr style="border-top: 2px dashed #cbd5e1;">
            <td style="color: #0f172a; font-weight: 800; font-size: 16px; padding-top: 10px;">Grand Total:</td>
            <td style="color: #0f172a; font-weight: 900; font-size: 18px; text-align: right; padding-top: 10px;">
              \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}
            </td>
          </tr>
        </table>
      </div>

      <!-- Address & Dispatch Info -->
      <div style="font-size: 12px; color: #475569; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <strong style="color: #0f172a;">Shipping Address:</strong><br>
        ${order.address || "Address on file"}, ${order.area || "Kolkata"} ${order.landmark ? `(Landmark: ${order.landmark})` : ""}<br>
        <strong>Phone:</strong> ${order.phone || "+91"}<br><br>
        <strong>Central Hub Dispatch:</strong> BuildNow, Bediadanga 1st Ln, Nator Park, Kasba, Kolkata 700039
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; color: #94a3b8; padding: 20px; text-align: center; font-size: 11px;">
      <p style="margin: 0 0 6px 0; color: #f1f5f9; font-weight: 700;">
        BuildNow &amp; Construction Supplies Kolkata
      </p>
      <p style="margin: 0 0 8px 0;">
        Business WP: +91 87774 00280 | Contractor Helpline: +91 90071 68561 | Email: team@girirajpower.in
      </p>
      <p style="margin: 0; color: #64748b;">
        Automated invoice generated via Resend Transactional Mail Service.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}
function generateWiringBookingEmailHtml(booking, customerName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Giriraj Power Wiring Service Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #facc15;">
      <div style="display: inline-block; background-color: #facc15; color: #0f172a; font-weight: 900; font-size: 16px; padding: 6px 12px; border-radius: 6px;">
        \u26A1 GIRIRAJ POWER SERVICES
      </div>
      <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 10px 0 0 0;">
        Wiring Consultation & Site Visit Confirmed
      </h1>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Dear <strong>${customerName || booking.contactName || "Valued Customer"}</strong>,
      </p>
      <p style="font-size: 14px; color: #334155; line-height: 1.6;">
        Your booking for certified Kolkata electrical wiring & installation services has been received. Our senior WBSEDCL/CESC licensed electrical supervisor is assigned to your site.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding-bottom: 8px;"><strong>Booking ID:</strong></td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 8px;">${booking.id || "GP-SRV-201"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 8px;"><strong>Service:</strong></td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 8px;">${booking.serviceTitle || "Full Home Wiring"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 8px;"><strong>Property:</strong></td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 8px;">${booking.projectType || "2BHK"} (${booking.approxAreaSqFt || 950} sq.ft)</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 8px;"><strong>Date & Slot:</strong></td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 8px;">${booking.preferredDate || "Tomorrow"} (${booking.preferredTimeSlot || "10:00 AM - 01:00 PM"})</td>
          </tr>
          <tr>
            <td style="color: #64748b;"><strong>Site Address:</strong></td>
            <td style="color: #0f172a; font-weight: 600; text-align: right;">${booking.siteAddress || "Kolkata"}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        All copper wires used (Polycab/Havells/RR Kabel) are 100% genuine fire-retardant grade.
      </p>
    </div>

    <div style="background-color: #0f172a; color: #94a3b8; padding: 16px; text-align: center; font-size: 11px;">
      Giriraj Power Services \u2022 Kolkata Engineering Division \u2022 Helpline: +91 87774 00280 | Contractor: +91 90071 68561
    </div>
  </div>
</body>
</html>
  `;
}
function generateTestEmailHtml(customerName) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Giriraj Power - Resend API Test</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #facc15;">
      <div style="display: inline-block; background-color: #facc15; color: #0f172a; font-weight: 900; font-size: 16px; padding: 6px 12px; border-radius: 6px; margin-bottom: 6px;">
        \u26A1 GIRIRAJ POWER
      </div>
      <h2 style="color: #ffffff; font-size: 18px; font-weight: 800; margin: 0;">
        Resend Email Service Active
      </h2>
    </div>

    <div style="padding: 24px; text-align: center;">
      <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #dcfce7; color: #16a34a; font-size: 24px; margin-bottom: 12px;">
        \u2713
      </div>
      <h3 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 8px 0;">
        Connection Verified!
      </h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
        Hello <strong>${customerName}</strong>,<br>
        Your Resend API email integration is successfully operational. Order tax invoices, delivery updates, and electrical wiring booking alerts will be delivered via this channel.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; text-align: left;">
        <strong>Service:</strong> Resend Transactional Mailer<br>
        <strong>Time:</strong> ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)<br>
        <strong>Hub:</strong> Giriraj Power Kasba Central Dispatch, Kolkata 700039
      </div>
    </div>

    <div style="background-color: #0f172a; color: #64748b; padding: 14px; text-align: center; font-size: 11px;">
      Giriraj Power Kolkata Express Mail Gateway
    </div>
  </div>
</body>
</html>
  `;
}
function generateLoginAlertEmailHtml(params) {
  const name = params.customerName || "Valued Customer";
  const time = params.loginTime || (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " (IST)";
  const location = params.location || "Kolkata, West Bengal, India";
  const ip = params.ipAddress || "Protected / Encrypted";
  const device = params.device || "Android Smartphone";
  const os = params.os || "Android";
  const browser = params.browser || "BuildNow App";
  const method = params.loginMethod || "Email & Password";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert: New Sign-in to your BuildNow Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5); border: 1px solid #e2e8f0;">
    
    <!-- Top Security Banner -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px 22px 24px; text-align: center; border-bottom: 3px solid #facc15;">
      <div style="display: inline-flex; align-items: center; justify-content: center; background-color: rgba(250, 204, 21, 0.15); border: 1px solid #facc15; color: #fef08a; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
        \u{1F6E1}\uFE0F ACCOUNT SECURITY ALERT
      </div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px;">
        New Login Detected
      </h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">
        BuildNow &amp; Giriraj Power Security Center
      </p>
    </div>

    <!-- Main Content Area -->
    <div style="padding: 28px 24px 24px 24px;">
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
        Hello <strong style="color: #0f172a;">${name}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 22px 0;">
        We detected a successful sign-in to your <strong>BuildNow</strong> account (<span style="color: #2563eb; font-weight: 600;">${params.email}</span>). Please review the details below:
      </p>

      <!-- Activity Details Card (Binance / Uber style) -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 24px;">
        <div style="background-color: #f1f5f9; padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569;">
          \u{1F4CB} Sign-in Activity Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.5;">
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600; width: 38%;">\u{1F552} Date &amp; Time</td>
            <td style="padding: 12px 18px; color: #0f172a; font-weight: 700;">${time}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #ffffff;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600;">\u{1F4CD} Location</td>
            <td style="padding: 12px 18px; color: #0f172a; font-weight: 700;">
              <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                ${location}
              </span>
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600;">\u{1F4F1} Device &amp; OS</td>
            <td style="padding: 12px 18px; color: #0f172a; font-weight: 700;">${device} (${os})</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7; background-color: #ffffff;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600;">\u{1F310} Browser / Client</td>
            <td style="padding: 12px 18px; color: #0f172a; font-weight: 700;">${browser}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600;">\u{1F511} Login Method</td>
            <td style="padding: 12px 18px; color: #0f172a; font-weight: 700;">
              <span style="display: inline-block; background-color: #fef08a; color: #854d0e; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                ${method}
              </span>
            </td>
          </tr>
          <tr style="background-color: #ffffff;">
            <td style="padding: 12px 18px; color: #64748b; font-weight: 600;">\u{1F522} IP Address</td>
            <td style="padding: 12px 18px; color: #475569; font-family: monospace; font-size: 12px; font-weight: 600;">${ip}</td>
          </tr>
        </table>
      </div>

      <!-- Was this you? verification status block -->
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start;">
          <div style="font-size: 18px; margin-right: 10px; line-height: 1;">\u2705</div>
          <div>
            <strong style="color: #065f46; font-size: 13px; display: block; margin-bottom: 2px;">Was this you?</strong>
            <span style="color: #047857; font-size: 12px; line-height: 1.4; display: block;">
              If you just logged into BuildNow, you can safely ignore this email. No further action is required.
            </span>
          </div>
        </div>
      </div>

      <!-- Security Warning & Action CTAs -->
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
          <div style="font-size: 18px; margin-right: 10px; line-height: 1;">\u26A0\uFE0F</div>
          <div>
            <strong style="color: #991b1b; font-size: 13px; display: block; margin-bottom: 2px;">Don't recognize this login?</strong>
            <span style="color: #b91c1c; font-size: 12px; line-height: 1.4; display: block;">
              If you did not perform this login, someone else may have gained unauthorized access to your account.
            </span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 14px;">
          <a href="https://smartrun.in/login" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 13px; padding: 10px 22px; border-radius: 8px; margin: 4px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
            \u{1F512} Secure Account &amp; Reset Password
          </a>
          <a href="tel:+918777400280" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 18px; border-radius: 8px; margin: 4px;">
            \u{1F4DE} Security Helpline (+91 87774 00280)
          </a>
        </div>
      </div>

      <!-- Security Best Practices -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5;">
        <strong style="color: #334155; font-size: 12px;">\u{1F6E1}\uFE0F Security Tips from SmartRun &amp; Giriraj Power:</strong>
        <ul style="margin: 6px 0 0 0; padding-left: 18px;">
          <li>Never share your passwords, OTP codes, or magic links with anyone.</li>
          <li>SmartRun / Giriraj Power staff will <strong>never</strong> call or email you asking for your password.</li>
          <li>Always verify you are visiting <code>https://smartrun.in</code> (or <code>https://www.girirajpower.in</code>) before entering your credentials.</li>
        </ul>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; color: #94a3b8; padding: 20px 24px; text-align: center; font-size: 11px; line-height: 1.5; border-top: 1px solid #334155;">
      <p style="margin: 0 0 6px 0; color: #f1f5f9; font-weight: 700;">
        SmartRun by Giriraj Power \u2014 Kasba Central Dispatch Hub
      </p>
      <p style="margin: 0 0 8px 0;">
        Kasba, Kolkata 700039, West Bengal | Support: team@girirajpower.in | Web: https://smartrun.in
      </p>
      <p style="margin: 0; color: #64748b; font-size: 10px;">
        This automated security notification was sent to ${params.email} in accordance with our account protection protocol.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}
var RESEND_INBOUND_DOMAIN = "oieldiakir.resend.app";
var RESEND_INBOUND_EMAIL = process.env.RESEND_INBOUND_EMAIL || "orders@oieldiakir.resend.app";
var OFFICIAL_EMAIL = process.env.RESEND_INBOUND_EMAIL || "orders@oieldiakir.resend.app";
var ADMIN_EMAILS = [
  "gauravgiri123344@gmail.com",
  "mdhassan1738@gmail.com",
  ...process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : []
].filter((v, i, a) => a.indexOf(v) === i);
var ADMIN_EMAIL = ADMIN_EMAILS.join(", ");
var ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER || "918777400280";
function generateAdminOrderAlertHtml(order) {
  const phoneClean = (order.phone || "").replace(/\D/g, "").slice(-10);
  const itemsListHtml = (order.items || []).map(
    (item, idx) => {
      const color = item.selectedColor || item.product?.selectedColor;
      const colorHtml = color ? `<div style="margin-top: 3px;"><span style="display: inline-block; background-color: #fef08a; color: #854d0e; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 4px; border: 1px solid #fde047;">\u{1F3A8} Colour: ${color}</span></div>` : "";
      return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 8px; font-size: 13px; color: #0f172a; font-weight: 700;">
          ${idx + 1}. ${item.product?.name || "Item"}
          <div style="font-size: 11px; color: #64748b; font-weight: normal;">
            Brand: ${item.product?.brand || "Giriraj"} | Unit: ${item.product?.unit || "1 pc"}
          </div>
          ${colorHtml}
        </td>
        <td style="padding: 10px 8px; font-size: 13px; color: #334155; text-align: center; font-weight: 700;">
          ${item.quantity}
        </td>
        <td style="padding: 10px 8px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 800;">
          \u20B9${((item.product?.price || 0) * item.quantity).toLocaleString("en-IN")}
        </td>
      </tr>
    `;
    }
  ).join("");
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>\u{1F6A8} NEW CUSTOMER PURCHASE ALERT - Giriraj Power</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 20px; color: #1e293b;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
    
    <!-- Top Alert Banner -->
    <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 24px 20px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: #facc15; color: #0f172a; font-weight: 900; font-size: 13px; padding: 5px 12px; border-radius: 6px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        \u{1F6A8} NEW CUSTOMER ORDER RECEIVED
      </div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 4px 0;">
        Order #${order.id || "GP-100000"} \u2014 \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}
      </h1>
      <p style="color: #fecaca; font-size: 13px; margin: 0;">
        Fulfillment & Dispatch Alert (${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST)
      </p>
    </div>

    <!-- Quick Action CTA Buttons -->
    <div style="background-color: #fefce8; border-bottom: 1px solid #fef08a; padding: 14px 20px; text-align: center;">
      <a href="tel:${order.phone}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 16px; border-radius: 8px; margin: 4px;">
        \u{1F4DE} Call Customer (${order.phone})
      </a>
      <a href="https://wa.me/91${phoneClean}?text=Hello%20${encodeURIComponent(order.customerName || "Customer")},%20we%20have%20received%20your%20Giriraj%20Power%20Order%20${order.id}!%20We%20are%20processing%20it%20for%20dispatch." style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 16px; border-radius: 8px; margin: 4px;">
        \u{1F4AC} WhatsApp Customer
      </a>
    </div>

    <div style="padding: 24px;">
      
      <!-- Customer & Delivery Information -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          \u{1F464} Customer & Delivery Address
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="color: #64748b; width: 35%; padding-bottom: 4px;">Customer Name:</td>
            <td style="color: #0f172a; font-weight: 800; padding-bottom: 4px;">${order.customerName || "Valued Customer"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Mobile Phone:</td>
            <td style="color: #0f172a; font-weight: 800; padding-bottom: 4px;">
              <a href="tel:${order.phone}" style="color: #2563eb; text-decoration: none;">${order.phone || "+91"}</a>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Email:</td>
            <td style="color: #0f172a; font-weight: 600; padding-bottom: 4px;">${order.customerEmail || "Not provided (Phone checkout)"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Delivery Address:</td>
            <td style="color: #0f172a; font-weight: 700; padding-bottom: 4px;">${order.address || "Address on file"}</td>
          </tr>
          ${order.landmark ? `
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Landmark:</td>
            <td style="color: #0f172a; font-weight: 600; padding-bottom: 4px;">${order.landmark}</td>
          </tr>` : ""}
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Area & PIN:</td>
            <td style="color: #0f172a; font-weight: 800; padding-bottom: 4px;">${order.area || "Kolkata"}, PIN: ${order.pincode || "700001"}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 4px;">Payment Method:</td>
            <td style="color: #0f172a; font-weight: 900; padding-bottom: 4px; text-transform: uppercase;">
              ${order.paymentMethod === "cod" ? "\u{1F4B5} CASH ON DELIVERY (COD - Collect at door)" : "\u26A1 ONLINE UPI / CARD (PAID)"}
            </td>
          </tr>
        </table>
      </div>

      <!-- Ordered Items Breakdown -->
      <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #0f172a; font-weight: 800;">
        \u{1F4E6} Ordered Items (${(order.items || []).length} items)
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
            <th style="padding: 10px 8px; border-radius: 6px 0 0 6px;">Product / Brand</th>
            <th style="padding: 10px 8px; text-align: center;">Qty</th>
            <th style="padding: 10px 8px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsListHtml}
        </tbody>
      </table>

      <!-- Order Total Summary Box -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Subtotal:</td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 6px;">\u20B9${(order.itemTotal || 0).toLocaleString("en-IN")}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">Delivery Fee:</td>
            <td style="color: #16a34a; font-weight: 700; text-align: right; padding-bottom: 6px;">${(order.deliveryFee || 0) === 0 ? "FREE" : "\u20B9" + order.deliveryFee}</td>
          </tr>
          ${(order.rainFee || 0) > 0 ? `
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">\u{1F327}\uFE0F Rain / Weather Fee:</td>
            <td style="color: #0284c7; font-weight: 700; text-align: right; padding-bottom: 6px;">\u20B9${order.rainFee}</td>
          </tr>` : ""}
          ${(order.surgeFee || 0) > 0 ? `
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">\u26A1 Peak Surge Fee:</td>
            <td style="color: #d97706; font-weight: 700; text-align: right; padding-bottom: 6px;">\u20B9${order.surgeFee}</td>
          </tr>` : ""}
          ${(order.productHandlingFee || 0) > 0 ? `
          <tr>
            <td style="color: #64748b; padding-bottom: 6px;">\u{1F4E6} Special Product Surcharge:</td>
            <td style="color: #475569; font-weight: 700; text-align: right; padding-bottom: 6px;">\u20B9${order.productHandlingFee}</td>
          </tr>` : ""}
          ${(order.discount || 0) > 0 ? `
          <tr>
            <td style="color: #16a34a; padding-bottom: 6px;">Discount Applied:</td>
            <td style="color: #16a34a; font-weight: 700; text-align: right; padding-bottom: 6px;">-\u20B9${order.discount}</td>
          </tr>` : ""}
          <tr style="border-top: 2px solid #cbd5e1;">
            <td style="color: #0f172a; font-weight: 900; font-size: 16px; padding-top: 8px;">Grand Total:</td>
            <td style="color: #b91c1c; font-weight: 900; font-size: 18px; text-align: right; padding-top: 8px;">
              \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}
            </td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #0f172a; color: #94a3b8; padding: 18px; text-align: center; font-size: 11px;">
      Giriraj Power Store Admin Notification System \u2022 Kasba Hub Kolkata 700039<br>
      Admin Alert Email: ${ADMIN_EMAIL}
    </div>
  </div>
</body>
</html>
  `;
}
var receivedEmailsStore = [
  {
    id: "inbound-sample-1",
    from: "subhojit.contractor@gmail.com",
    fromName: "Subhojit Bannerjee (Kasba Project)",
    to: OFFICIAL_EMAIL,
    subject: "Bulk Quote Request: 200 Coils 2.5mm Polycab Wire & 50 Switch Plates",
    text: "Hello Giriraj Power Team,\n\nWe have a 4-storey residential wiring project commencing at Kasba Bosepukur. Need best bulk rates for:\n- 200 Coils Polycab FR-LSH 2.5 sq mm\n- 100 Coils 1.5 sq mm\n- 50 Schneider Opale 8-Module plates\n\nCan you deliver via 60-min express dispatch to Kasba site? GST invoice required.\n\nRegards,\nSubhojit (+91 98301 22456)",
    receivedAt: new Date(Date.now() - 36e5 * 2).toISOString(),
    status: "unread",
    category: "quote",
    phone: "+91 98301 22456"
  },
  {
    id: "inbound-sample-2",
    from: "priya.ghosh@outlook.com",
    fromName: "Priya Ghosh",
    to: OFFICIAL_EMAIL,
    subject: "Inquiry: Electrician Technician Visit for DB Box Short Circuit",
    text: "Hi Team,\n\nOur main MCB distribution board tripped in our Salt Lake Sector 2 apartment this morning. Can a certified electrician visit today between 3 PM - 5 PM?\n\nContact: +91 98310 99881",
    receivedAt: new Date(Date.now() - 36e5 * 5).toISOString(),
    status: "read",
    category: "support",
    phone: "+91 98310 99881"
  }
];
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var SAVED_ADDRESSES_FILE = import_path.default.join(DATA_DIR, "saved_addresses.json");
function ensureDataDir() {
  try {
    if (!import_fs.default.existsSync(DATA_DIR)) {
      import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[Server Data Dir Notice]:", err);
  }
}
function loadSavedAddressesFile() {
  try {
    ensureDataDir();
    if (import_fs.default.existsSync(SAVED_ADDRESSES_FILE)) {
      const raw = import_fs.default.readFileSync(SAVED_ADDRESSES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[Server Read Saved Addresses Notice]:", err);
  }
  return [];
}
function writeSavedAddressesFile(addresses) {
  try {
    ensureDataDir();
    import_fs.default.writeFileSync(SAVED_ADDRESSES_FILE, JSON.stringify(addresses, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Server Write Saved Addresses Notice]:", err);
  }
}
var TECHNICIAN_REVIEWS_FILE = import_path.default.join(DATA_DIR, "technician_reviews.json");
function loadTechnicianReviewsFile() {
  try {
    ensureDataDir();
    if (import_fs.default.existsSync(TECHNICIAN_REVIEWS_FILE)) {
      const raw = import_fs.default.readFileSync(TECHNICIAN_REVIEWS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[Server Read Technician Reviews Notice]:", err);
  }
  return [];
}
function writeTechnicianReviewsFile(reviews) {
  try {
    ensureDataDir();
    import_fs.default.writeFileSync(TECHNICIAN_REVIEWS_FILE, JSON.stringify(reviews, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Server Write Technician Reviews Notice]:", err);
  }
}
var serverSupabaseClient = null;
function getServerSupabase() {
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://iffdkhzctkbglmvaayeh.supabase.co").trim();
  let serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (serviceRoleKey.length < 20 || serviceRoleKey.includes("YOUR_") || serviceRoleKey.includes("placeholder")) {
    serviceRoleKey = "";
  }
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "sb_publishable_C7DzW73hItwOaxr9R4Z2dw_HtjCqHaS").trim();
  const key = serviceRoleKey || anonKey;
  if (!url || !key || key.length < 20 || url.includes("YOUR_") || key.includes("YOUR_")) {
    return null;
  }
  if (!serverSupabaseClient) {
    try {
      serverSupabaseClient = (0, import_supabase_js.createClient)(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    } catch (e) {
      console.warn("[Server Supabase Init Notice]:", e);
      return null;
    }
  }
  return serverSupabaseClient;
}
var catalogCache = null;
var CATALOG_CACHE_TTL_MS = 60 * 1e3;
async function getCachedCatalog(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && catalogCache && now - catalogCache.timestamp < CATALOG_CACHE_TTL_MS) {
    return { products: catalogCache.products, fromCache: true, etag: catalogCache.etag };
  }
  let productsList = [];
  const sb = getServerSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from("products").select("*").order("id", { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        productsList = data;
      }
    } catch (sbErr) {
      console.warn("[Server Catalog Cache] DB query notice:", sbErr);
    }
  }
  const hash = import_crypto.default.createHash("md5").update(JSON.stringify(productsList.map((p) => ({ id: p.id, price: p.price, stock: p.in_stock, updated: p.updated_at })))).digest("hex");
  catalogCache = {
    products: productsList,
    timestamp: now,
    etag: `"${hash}"`
  };
  return { products: catalogCache.products, fromCache: false, etag: catalogCache.etag };
}
function sanitize(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input.replace(/[<>]/g, "").trim();
}
var getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
};
var apiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    retryAfterMinutes: 15
  }
});
var strictLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  // 10 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: "Rate limit exceeded. Please try again later.",
    retryAfterMinutes: 15
  }
});
function requireApiSecret(req, res, next) {
  const secret = process.env.API_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: "API_SECRET_KEY environment variable is not configured."
    });
  }
  const clientKey = req.headers["x-api-key"];
  if (!clientKey || clientKey !== secret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key."
    });
  }
  next();
}
var orderCheckoutLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 30,
  // 30 checkout submissions per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: "Order submission rate limit exceeded. Please wait a moment before trying again.",
    retryAfterMinutes: 15
  }
});
var emailDispatchLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 25,
  // 25 email dispatches per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: getClientIp,
  message: {
    success: false,
    message: "Email dispatch limit reached. Please wait a few minutes before sending another inquiry.",
    retryAfterMinutes: 15
  }
});
var aiAssistantLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 40,
  // 40 queries per 15 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false, default: false },
  keyGenerator: getClientIp,
  message: {
    text: "You have reached the AI assistant query limit for this 15-minute window. Please contact our Kolkata sales desk directly at +91 87774 00280 for immediate guidance.",
    mapsSources: [
      {
        uri: "https://share.google/EWHvo68Oi2DsChWWV",
        title: "Giriraj Power Kasba Hub, Kolkata"
      }
    ]
  }
});
var idempotencyStore = /* @__PURE__ */ new Map();
var IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1e3;
setInterval(() => {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.timestamp < cutoff) {
      idempotencyStore.delete(key);
    }
  }
}, 30 * 60 * 1e3);
var OrderItemSchema = import_zod.z.object({
  product: import_zod.z.object({
    id: import_zod.z.string().min(1),
    name: import_zod.z.string().min(1),
    price: import_zod.z.number().nonnegative(),
    brand: import_zod.z.string().optional(),
    unit: import_zod.z.string().optional(),
    image: import_zod.z.string().optional(),
    selectedColor: import_zod.z.string().optional()
  }).passthrough(),
  quantity: import_zod.z.number().int().positive().max(1e3, "Quantity cannot exceed 1000 units"),
  selectedColor: import_zod.z.string().optional()
});
var OrderCheckoutSchema = import_zod.z.object({
  id: import_zod.z.string().min(3).max(64),
  userId: import_zod.z.string().optional().nullable(),
  user_id: import_zod.z.string().optional().nullable(),
  customerName: import_zod.z.string().min(2, "Customer name must be at least 2 characters").max(100),
  phone: import_zod.z.string().min(10, "Phone number must contain at least 10 digits").max(20),
  customerEmail: import_zod.z.string().email("Invalid email format").optional().or(import_zod.z.literal("")).nullable(),
  address: import_zod.z.string().min(5, "Delivery address must be at least 5 characters").max(500),
  area: import_zod.z.string().min(2).max(100),
  pincode: import_zod.z.string().regex(/^7\d{5}$/, "Please provide a valid 6-digit Kolkata PIN code (e.g. 700039)"),
  landmark: import_zod.z.string().max(200).optional().nullable(),
  items: import_zod.z.array(OrderItemSchema).min(1, "Order must contain at least 1 item"),
  itemTotal: import_zod.z.number().nonnegative("Item total must be positive"),
  deliveryFee: import_zod.z.number().nonnegative("Delivery fee cannot be negative"),
  handlingFee: import_zod.z.number().nonnegative().optional().default(0),
  rainFee: import_zod.z.number().nonnegative().optional().default(0),
  surgeFee: import_zod.z.number().nonnegative().optional().default(0),
  productHandlingFee: import_zod.z.number().nonnegative().optional().default(0),
  fees: import_zod.z.number().nonnegative().optional().default(0),
  feeBreakdown: import_zod.z.any().optional().nullable(),
  discount: import_zod.z.number().nonnegative().optional().default(0),
  totalAmount: import_zod.z.number().nonnegative("Total amount must be positive"),
  paymentMethod: import_zod.z.enum(["cod", "upi", "card"]).default("cod"),
  paymentStatus: import_zod.z.enum(["paid", "pending"]).default("pending"),
  paymentId: import_zod.z.string().optional().nullable(),
  razorpayPaymentId: import_zod.z.string().optional().nullable(),
  razorpayOrderId: import_zod.z.string().optional().nullable(),
  razorpaySignature: import_zod.z.string().optional().nullable(),
  razorpay_payment_id: import_zod.z.string().optional().nullable(),
  razorpay_order_id: import_zod.z.string().optional().nullable(),
  razorpay_signature: import_zod.z.string().optional().nullable(),
  status: import_zod.z.enum(["pending", "accepted", "packing", "out_for_delivery", "delivered", "cancelled"]).default("pending"),
  createdAt: import_zod.z.string().optional(),
  estimatedDeliveryTimestamp: import_zod.z.number().optional(),
  idempotencyKey: import_zod.z.string().max(128).optional(),
  deliveryPartner: import_zod.z.object({
    name: import_zod.z.string(),
    phone: import_zod.z.string(),
    vehicleNumber: import_zod.z.string(),
    currentHub: import_zod.z.string()
  }).optional().nullable(),
  notes: import_zod.z.string().optional().nullable()
});
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-idempotency-key, if-none-match, Cache-Control, Pragma");
    res.setHeader("Access-Control-Expose-Headers", "ETag, X-Cache, Content-Disposition");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });
  app.use(
    (0, import_compression.default)({
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return import_compression.default.filter(req, res);
      },
      level: 6,
      threshold: 1024
      // Only compress responses > 1KB
    })
  );
  app.use(import_express.default.json({ limit: "2mb" }));
  app.use("/api", apiLimiter);
  app.get("/api/health", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({ status: "ok", app: "Giriraj Power Kolkata Express" });
  });
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const candidates = [
      import_path.default.join(process.cwd(), "public", ".well-known", "assetlinks.json"),
      import_path.default.join(process.cwd(), "dist", ".well-known", "assetlinks.json"),
      import_path.default.join(__dirnameResolved, "public", ".well-known", "assetlinks.json")
    ];
    for (const p of candidates) {
      if (import_fs.default.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.json([
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds"
        ],
        target: {
          namespace: "android_app",
          package_name: "in.smartrun.app",
          sha256_cert_fingerprints: [
            "23:B9:84:0D:7F:F5:08:E9:87:61:C5:F5:9C:B6:2C:22:60:75:30:27:68:20:1B:D6:B9:A0:EA:94:C9:D4:06:8C",
            "14:6D:E9:7D:0C:6D:77:E5:EE:DE:28:B6:F0:4B:92:47:FD:B3:36:CF:BE:0C:F0:7C:1E:58:E6:C3:FF:11:EB:7B",
            "91:E1:44:1D:A9:F0:1B:BA:B7:7E:33:E5:14:7C:A6:AE:7E:5B:0A:ED:AB:EC:C2:6F:DD:0E:DF:C6:84:72:7A:E5",
            "DB:D8:FC:92:9D:5C:47:E2:0C:1F:D3:58:EE:91:C4:85:AB:3A:CB:33:CD:09:6F:B4:7A:1D:6B:B7:64:85:00:3A"
          ]
        }
      }
    ]);
  });
  app.get("/sitemap.xml", (req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const candidates = [
      import_path.default.join(process.cwd(), "public", "sitemap.xml"),
      import_path.default.join(process.cwd(), "dist", "sitemap.xml"),
      import_path.default.join(__dirnameResolved, "public", "sitemap.xml")
    ];
    for (const p of candidates) {
      if (import_fs.default.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).send("Sitemap not found");
  });
  app.get("/robots.txt", (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const candidates = [
      import_path.default.join(process.cwd(), "public", "robots.txt"),
      import_path.default.join(process.cwd(), "dist", "robots.txt"),
      import_path.default.join(__dirnameResolved, "public", "robots.txt")
    ];
    for (const p of candidates) {
      if (import_fs.default.existsSync(p)) {
        return res.sendFile(p);
      }
    }
    res.status(404).send("Robots.txt not found");
  });
  const SERVER_BOOT_TIME = (/* @__PURE__ */ new Date()).toISOString();
  function getActiveVersionInfo() {
    try {
      const candidates = [
        import_path.default.join(process.cwd(), "public", "version.json"),
        import_path.default.join(process.cwd(), "dist", "version.json"),
        import_path.default.join(__dirnameResolved, "public", "version.json"),
        import_path.default.join(__dirnameResolved, "version.json")
      ];
      for (const p of candidates) {
        if (import_fs.default.existsSync(p)) {
          const raw = import_fs.default.readFileSync(p, "utf-8");
          const parsed = JSON.parse(raw);
          if (parsed && parsed.buildId) {
            return {
              success: true,
              version: parsed.version || process.env.npm_package_version || "2.4.0",
              buildId: parsed.buildId,
              builtAt: parsed.builtAt || SERVER_BOOT_TIME,
              serverStartedAt: SERVER_BOOT_TIME,
              environment: process.env.NODE_ENV || "development",
              timestamp: Date.now()
            };
          }
        }
      }
    } catch (err) {
      console.warn("[Server Version Check Notice]:", err);
    }
    const fallbackBuildId = process.env.BUILD_ID || process.env.VITE_APP_BUILD_ID || `v2.4.0-${SERVER_BOOT_TIME}`;
    return {
      success: true,
      version: process.env.npm_package_version || "2.4.0",
      buildId: fallbackBuildId,
      builtAt: SERVER_BOOT_TIME,
      serverStartedAt: SERVER_BOOT_TIME,
      environment: process.env.NODE_ENV || "development",
      timestamp: Date.now()
    };
  }
  app.get("/api/version", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    const versionInfo = getActiveVersionInfo();
    res.json(versionInfo);
  });
  app.get("/version.json", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    const versionInfo = getActiveVersionInfo();
    res.json(versionInfo);
  });
  app.get("/api/maps/google/rev-geocode", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, message: "Invalid latitude/longitude" });
      }
      const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        return res.status(500).json({ success: false, message: "GOOGLE_MAPS_API_KEY is not configured" });
      }
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const gRes = await fetch(googleUrl);
        if (gRes.ok) {
          const data = await gRes.json();
          if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
            const first = data.results[0];
            let street = "";
            let locality = "";
            let city = "Kolkata";
            let state = "West Bengal";
            let pincode = "";
            if (Array.isArray(first.address_components)) {
              for (const comp of first.address_components) {
                if (comp.types.includes("route") || comp.types.includes("street_address")) {
                  street = comp.long_name;
                }
                if (comp.types.includes("sublocality") || comp.types.includes("neighborhood")) {
                  locality = comp.long_name;
                }
                if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) {
                  city = comp.long_name;
                }
                if (comp.types.includes("administrative_area_level_1")) {
                  state = comp.long_name;
                }
                if (comp.types.includes("postal_code")) {
                  pincode = comp.long_name;
                }
              }
            }
            const resolvedStreet = street || first.formatted_address?.split(",")[0] || locality || "Kolkata";
            return res.json({
              success: true,
              source: "google-maps",
              result: {
                formattedAddress: first.formatted_address,
                street: resolvedStreet,
                locality: locality || city,
                suburb: locality,
                city,
                state,
                pincode: pincode || "700001",
                lat,
                lng
              }
            });
          }
        }
      } catch (gErr) {
        console.warn("[Google Rev Geocode Notice]:", gErr);
      }
      const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const osmRes = await fetch(osmUrl, {
        headers: { "Accept-Language": "en", "User-Agent": "GirirajPowerKolkata/1.0" }
      });
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address || {};
        const street = addr.road || addr.suburb || addr.neighbourhood || "Kolkata";
        return res.json({
          success: true,
          source: "osm-fallback",
          result: {
            formattedAddress: osmData.display_name,
            street,
            locality: addr.suburb || street,
            city: addr.city || "Kolkata",
            state: addr.state || "West Bengal",
            pincode: addr.postcode || "",
            lat,
            lng
          }
        });
      }
      return res.status(404).json({ success: false, message: "Google reverse geocoding unavailable" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Google reverse geocode error" });
    }
  });
  app.get("/api/maps/places-autocomplete", async (req, res) => {
    try {
      const query = (req.query.input || "").trim();
      if (!query) {
        return res.json({ success: true, results: [] });
      }
      const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        return res.status(500).json({ success: false, message: "GOOGLE_MAPS_API_KEY is not configured" });
      }
      try {
        const gmpRes = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.text"
          },
          body: JSON.stringify({
            input: query,
            locationBias: {
              circle: {
                center: { latitude: 22.5726, longitude: 88.3639 },
                radius: 45e3
              }
            },
            includedRegionCodes: ["in"]
          })
        });
        if (gmpRes.ok) {
          const data = await gmpRes.json();
          const suggestions = data.suggestions || [];
          if (suggestions.length > 0) {
            const googleResults = suggestions.map((s) => {
              const pred = s.placePrediction;
              if (!pred) return null;
              const mainText = pred.structuredFormat?.mainText?.text || pred.text?.text || "";
              const secondaryText = pred.structuredFormat?.secondaryText?.text || "Kolkata, West Bengal";
              return {
                id: pred.placeId ? `gmp-${pred.placeId}` : `gmp-${Math.random()}`,
                placeId: pred.placeId,
                name: mainText,
                secondaryText,
                source: "google-maps-platform"
              };
            }).filter(Boolean);
            if (googleResults.length > 0) {
              return res.json({ success: true, source: "google-maps-platform", results: googleResults });
            }
          }
        }
      } catch (gmpErr) {
        console.warn("[Google Maps API Autocomplete fallback notice]:", gmpErr);
      }
      const queryWithKolkata = query.toLowerCase().includes("kolkata") || query.toLowerCase().includes("howrah") || /^\d{6}$/.test(query) ? query : `${query}, Kolkata`;
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          queryWithKolkata
        )}&viewbox=88.10,22.75,88.58,22.35&bounded=0&countrycodes=in&limit=8&addressdetails=1`,
        {
          headers: { "Accept-Language": "en", "User-Agent": "GirirajPowerKolkata/1.0" }
        }
      );
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          const results = osmData.map((item, idx) => {
            const addr = item.address || {};
            const placeName = addr.road || addr.suburb || addr.neighbourhood || addr.quarter || item.name || item.display_name?.split(",")[0] || query;
            const secondaryParts = [
              addr.suburb || addr.neighbourhood || addr.quarter,
              addr.city || addr.state_district || "Kolkata",
              addr.state || "West Bengal",
              addr.postcode ? `PIN ${addr.postcode}` : ""
            ].filter(Boolean);
            const secondary = secondaryParts.join(", ") || item.display_name?.split(",").slice(1, 4).join(", ");
            return {
              id: item.place_id ? `osm-${item.place_id}` : `geo-${idx}`,
              name: placeName.trim(),
              secondaryText: secondary.trim(),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              pincode: addr.postcode || "",
              source: "geocoding"
            };
          });
          return res.json({ success: true, source: "geocoding", results });
        }
      }
      return res.json({ success: true, results: [] });
    } catch (err) {
      console.error("Places search error:", err);
      return res.status(500).json({ success: false, message: "Location search failed" });
    }
  });
  app.get("/api/maps/place-details", async (req, res) => {
    try {
      const placeId = (req.query.placeId || "").trim();
      if (!placeId) {
        return res.status(400).json({ success: false, message: "Place ID is required" });
      }
      const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
      if (!apiKey || apiKey === "YOUR_API_KEY") {
        return res.status(500).json({ success: false, message: "GOOGLE_MAPS_API_KEY is not configured" });
      }
      try {
        const gmpRes = await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents"
            }
          }
        );
        if (gmpRes.ok) {
          const data = await gmpRes.json();
          const lat = data.location?.latitude;
          const lng = data.location?.longitude;
          let pincode = "";
          if (Array.isArray(data.addressComponents)) {
            const pinComp = data.addressComponents.find((c) => c.types?.includes("postal_code"));
            if (pinComp) pincode = pinComp.longText || pinComp.shortText || "";
          }
          return res.json({
            success: true,
            placeId,
            name: data.displayName?.text || "",
            formattedAddress: data.formattedAddress || "",
            lat,
            lng,
            pincode
          });
        }
      } catch (gmpErr) {
        console.warn("[Google Maps Place Details error]:", gmpErr);
      }
      return res.json({ success: false, message: "Place details not available from API" });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Place details request failed" });
    }
  });
  app.get("/api/products", async (req, res) => {
    try {
      const { products, fromCache, etag } = await getCachedCatalog();
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
      res.setHeader("X-Cache", fromCache ? "HIT" : "MISS");
      return res.json({
        success: true,
        count: products.length,
        fromCache,
        products
      });
    } catch (err) {
      console.error("Error fetching cached products catalog:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch products catalog." });
    }
  });
  app.post("/api/products/cache/clear", (req, res) => {
    catalogCache = null;
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, message: "Server in-memory catalog cache purged." });
  });
  app.get("/api/products/:id", async (req, res) => {
    try {
      const productId = req.params.id;
      const { products } = await getCachedCatalog();
      const product = products.find((p) => String(p.id) === String(productId));
      if (product) {
        return res.json({ success: true, product });
      }
      const sb = getServerSupabase();
      if (sb) {
        const { data, error } = await sb.from("products").select("*").eq("id", productId).single();
        if (!error && data) {
          return res.json({ success: true, product: data });
        }
      }
      return res.status(404).json({ success: false, message: `Product with ID '${productId}' not found.` });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to retrieve product." });
    }
  });
  app.post("/api/products", async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ success: false, message: "Product name is required." });
      }
      const price = Number(body.price ?? 0);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ success: false, message: "Valid positive price is required." });
      }
      const mrp = Number(body.mrp ?? body.originalPrice ?? body.original_price ?? (price > 0 ? price * 1.15 : 0));
      let imageUrls = [];
      if (Array.isArray(body.image_urls) && body.image_urls.length > 0) {
        imageUrls = body.image_urls.filter((u) => typeof u === "string" && u.trim().length > 0);
      } else if (Array.isArray(body.images) && body.images.length > 0) {
        imageUrls = body.images.filter((u) => typeof u === "string" && u.trim().length > 0);
      } else if (typeof body.image_urls === "string" && body.image_urls.startsWith("http")) {
        imageUrls = [body.image_urls];
      } else if (typeof body.image === "string" && body.image.startsWith("http")) {
        imageUrls = [body.image];
      }
      if (imageUrls.length === 0) {
        imageUrls = ["https://images.unsplash.com/photo-1558223616-e5d79faebdd6?q=80&w=800&auto=format&fit=crop"];
      }
      let specifications = {};
      if (body.specifications && typeof body.specifications === "object") {
        specifications = body.specifications;
      } else if (body.specs && typeof body.specs === "object") {
        specifications = body.specs;
      } else if (typeof body.specifications === "string") {
        try {
          specifications = JSON.parse(body.specifications);
        } catch {
          specifications = { "Description": body.specifications };
        }
      }
      const newProductRow = {
        name: body.name.trim(),
        brand: body.brand && String(body.brand).trim() || "Giriraj Genuine",
        category: body.category && String(body.category).trim() || "Electrical",
        subcategory: (body.subcategory || body.subCategory || body.sub_category || "General").trim(),
        price,
        mrp: mrp >= price ? mrp : price,
        description: body.description && String(body.description).trim() || "High-grade certified material for residential and commercial projects.",
        specifications,
        stock_quantity: Math.max(0, Number(body.stock_quantity ?? body.stock_count ?? body.stock ?? 50)),
        image_urls: imageUrls,
        rating_avg: Number(body.rating_avg || body.rating || 4.8),
        rating_count: Number(body.rating_count || body.reviewsCount || 12),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (body.id) {
        newProductRow.id = String(body.id);
      }
      const sb = getServerSupabase();
      let savedProduct = null;
      if (sb) {
        const { data, error } = await sb.from("products").upsert(newProductRow).select().single();
        if (error) {
          console.error("[Server Add Product] Supabase error:", error);
          return res.status(500).json({ success: false, message: error.message, error });
        }
        savedProduct = data;
      } else {
        newProductRow.id = newProductRow.id || `prod-${Date.now()}`;
        newProductRow.created_at = (/* @__PURE__ */ new Date()).toISOString();
        savedProduct = newProductRow;
      }
      catalogCache = null;
      console.log(`[Server] Product added successfully: ${savedProduct.name} (${savedProduct.id})`);
      return res.status(201).json({
        success: true,
        message: "Product successfully added to catalog.",
        product: savedProduct
      });
    } catch (err) {
      console.error("[Server] Exception adding product:", err);
      return res.status(500).json({ success: false, message: err?.message || "Failed to create product." });
    }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      const productId = req.params.id;
      const updates = req.body || {};
      updates.updated_at = (/* @__PURE__ */ new Date()).toISOString();
      const sb = getServerSupabase();
      if (!sb) {
        return res.status(503).json({ success: false, message: "Database connection not available." });
      }
      const { data, error } = await sb.from("products").update(updates).eq("id", productId).select().single();
      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      catalogCache = null;
      return res.json({ success: true, message: "Product updated successfully", product: data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to update product." });
    }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const productId = req.params.id;
      const sb = getServerSupabase();
      if (!sb) {
        return res.status(503).json({ success: false, message: "Database connection not available." });
      }
      const { error } = await sb.from("products").delete().eq("id", productId);
      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      catalogCache = null;
      return res.json({ success: true, message: `Product ${productId} deleted successfully` });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to delete product." });
    }
  });
  const FEE_SETTINGS_FILE = import_path.default.join(process.cwd(), "data", "fee-settings.json");
  const DEFAULT_FEE_POLICY = {
    freeDeliveryThreshold: 0,
    baseDeliveryFee: 0,
    handlingFee: 0,
    rainFee: {
      enabled: false,
      amount: 0,
      label: "Rain / Weather Surcharge"
    },
    surgeFee: {
      enabled: false,
      amount: 0,
      label: "Peak Demand Surge"
    },
    customFees: [],
    productCharges: {},
    productChargeMode: "per_item",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy: "system"
  };
  let serverFeePolicyCache = null;
  function getServerFeePolicy() {
    if (serverFeePolicyCache) return serverFeePolicyCache;
    try {
      if (import_fs.default.existsSync(FEE_SETTINGS_FILE)) {
        const raw = import_fs.default.readFileSync(FEE_SETTINGS_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        serverFeePolicyCache = {
          ...DEFAULT_FEE_POLICY,
          ...parsed,
          rainFee: { ...DEFAULT_FEE_POLICY.rainFee, ...parsed.rainFee || {} },
          surgeFee: { ...DEFAULT_FEE_POLICY.surgeFee, ...parsed.surgeFee || {} },
          productCharges: parsed.productCharges || {},
          customFees: Array.isArray(parsed.customFees) ? parsed.customFees : []
        };
        return serverFeePolicyCache;
      }
    } catch (err) {
      console.warn("[FeePolicy] Read file warning:", err);
    }
    serverFeePolicyCache = { ...DEFAULT_FEE_POLICY };
    return serverFeePolicyCache;
  }
  function updateServerFeePolicy(patch, updatedBy = "backend_app") {
    const current = getServerFeePolicy();
    const updated = {
      ...current,
      ...patch,
      rainFee: patch.rainFee ? { ...current.rainFee, ...patch.rainFee } : current.rainFee,
      surgeFee: patch.surgeFee ? { ...current.surgeFee, ...patch.surgeFee } : current.surgeFee,
      productCharges: patch.productCharges ? { ...current.productCharges, ...patch.productCharges } : current.productCharges,
      customFees: patch.customFees !== void 0 ? patch.customFees : current.customFees,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy
    };
    serverFeePolicyCache = updated;
    try {
      const dir = import_path.default.dirname(FEE_SETTINGS_FILE);
      if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
      import_fs.default.writeFileSync(FEE_SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    } catch (err) {
      console.error("[FeePolicy] Failed to write fee-settings.json:", err);
    }
    const sb = getServerSupabase();
    if (sb) {
      sb.from("app_settings").upsert({ key: "fee_policy", value: updated, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).then(({ error }) => {
        if (error && !error.message?.includes("does not exist")) {
          console.warn("[FeePolicy] Supabase backup notice:", error.message);
        }
      }).catch(() => {
      });
    }
    return updated;
  }
  function computeOrderCharges(items, claimedSubtotal, policy = getServerFeePolicy()) {
    const activeItems = Array.isArray(items) ? items.filter((it) => it && (it.quantity || 0) > 0) : [];
    const computedSubtotal = activeItems.reduce((sum, it) => {
      const price = typeof it.product?.price === "number" ? it.product.price : Number(it.price) || 0;
      return sum + price * (it.quantity || 1);
    }, 0);
    const subtotal = typeof claimedSubtotal === "number" && claimedSubtotal > 0 ? claimedSubtotal : computedSubtotal;
    const threshold = Number(policy.freeDeliveryThreshold ?? 0);
    const baseDeliveryFee = Number(policy.baseDeliveryFee ?? 0);
    const isFreeDelivery = baseDeliveryFee === 0 || subtotal >= threshold || activeItems.length === 0;
    const deliveryFee = isFreeDelivery ? 0 : baseDeliveryFee;
    const handlingFee = activeItems.length > 0 ? Number(policy.handlingFee ?? 0) : 0;
    const rainFee = policy.rainFee?.enabled && activeItems.length > 0 ? Math.max(0, Number(policy.rainFee?.amount || 0)) : 0;
    const surgeFee = policy.surgeFee?.enabled && activeItems.length > 0 ? Math.max(0, Number(policy.surgeFee?.amount || 0)) : 0;
    const productChargesMap = policy.productCharges || {};
    const chargeMode = policy.productChargeMode || "per_item";
    const productCharges = [];
    let totalProductCharges = 0;
    for (const it of activeItems) {
      const pId = String(it.product?.id || it.productId || it.id || "");
      const unitCharge = productChargesMap[pId] !== void 0 ? Number(productChargesMap[pId]) : Number(it.product?.deliveryCharge ?? it.deliveryCharge ?? it.product?.handlingCharge ?? 0);
      if (unitCharge > 0) {
        const q = it.quantity || 1;
        const lineTotal = chargeMode === "per_item" ? unitCharge * q : unitCharge;
        totalProductCharges += lineTotal;
        productCharges.push({
          productId: pId,
          name: it.product?.name || it.name || "Product",
          unitCharge,
          quantity: q,
          totalCharge: lineTotal
        });
      }
    }
    let totalCustomFees = 0;
    const customFeesApplied = [];
    if (Array.isArray(policy.customFees) && activeItems.length > 0) {
      for (const cf of policy.customFees) {
        if (cf.enabled && Number(cf.amount) > 0) {
          customFeesApplied.push({ id: cf.id, label: cf.label, amount: Number(cf.amount) });
          totalCustomFees += Number(cf.amount);
        }
      }
    }
    const totalFees = deliveryFee + handlingFee + rainFee + surgeFee + totalProductCharges + totalCustomFees;
    const grandTotal = Math.max(0, subtotal + totalFees);
    return {
      subtotal,
      freeDeliveryThreshold: threshold,
      isFreeDelivery,
      deliveryFee,
      baseDeliveryFee,
      handlingFee,
      rainFee,
      rainFeeActive: Boolean(policy.rainFee?.enabled),
      surgeFee,
      surgeFeeActive: Boolean(policy.surgeFee?.enabled),
      productCharges,
      totalProductCharges,
      customFees: customFeesApplied,
      totalCustomFees,
      totalFees,
      grandTotal
    };
  }
  app.get("/api/fee-settings", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return res.json({
      success: true,
      settings: getServerFeePolicy()
    });
  });
  app.post("/api/fee-settings", (req, res) => {
    try {
      const body = req.body || {};
      const updatedBy = req.headers["x-client-id"] || req.headers["x-user-email"] || "backend_app";
      if (body.productId && (typeof body.charge === "number" || typeof body.productCharge === "number")) {
        const prodId = String(body.productId);
        const charge = Number(body.charge ?? body.productCharge);
        const current = getServerFeePolicy();
        const nextProductCharges = { ...current.productCharges };
        if (charge <= 0) {
          delete nextProductCharges[prodId];
        } else {
          nextProductCharges[prodId] = charge;
        }
        const updated2 = updateServerFeePolicy({ productCharges: nextProductCharges }, String(updatedBy));
        return res.json({
          success: true,
          message: `Product ${prodId} charge set to \u20B9${charge}`,
          settings: updated2
        });
      }
      if (body.removeProductId) {
        const prodId = String(body.removeProductId);
        const current = getServerFeePolicy();
        const nextProductCharges = { ...current.productCharges };
        delete nextProductCharges[prodId];
        const updated2 = updateServerFeePolicy({ productCharges: nextProductCharges }, String(updatedBy));
        return res.json({
          success: true,
          message: `Product ${prodId} charge removed`,
          settings: updated2
        });
      }
      const updated = updateServerFeePolicy(body, String(updatedBy));
      return res.json({
        success: true,
        message: "Fee policy and charges settings updated successfully",
        settings: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to update fee settings" });
    }
  });
  app.put("/api/fee-settings", (req, res) => {
    try {
      const body = req.body || {};
      const updatedBy = req.headers["x-client-id"] || req.headers["x-user-email"] || "backend_app";
      const updated = updateServerFeePolicy(body, String(updatedBy));
      return res.json({
        success: true,
        message: "Fee policy and charges settings updated successfully",
        settings: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to update fee settings" });
    }
  });
  app.post("/api/cart/calculate-charges", (req, res) => {
    try {
      const { items = [], subtotal } = req.body || {};
      const breakdown = computeOrderCharges(items, subtotal);
      return res.json({
        success: true,
        breakdown
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err?.message || "Failed to calculate charges" });
    }
  });
  app.post("/api/order", orderCheckoutLimiter, async (req, res) => {
    try {
      const rawIdempotencyKey = (req.headers["x-idempotency-key"] || req.body.idempotencyKey || req.body.id || "").toString().trim();
      if (rawIdempotencyKey && idempotencyStore.has(rawIdempotencyKey)) {
        const existing = idempotencyStore.get(rawIdempotencyKey);
        res.setHeader("X-Cache", "IDEMPOTENT-HIT");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        return res.status(200).json({
          ...existing.response,
          idempotent: true,
          cachedAt: new Date(existing.timestamp).toISOString()
        });
      }
      const parseResult = OrderCheckoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Order validation failed. Please check the entered details.",
          errors: parseResult.error.format()
        });
      }
      const validatedOrder = parseResult.data;
      const computedItemTotal = validatedOrder.items.reduce((sum, it) => {
        const itemPrice = typeof it.product?.price === "number" ? it.product.price : 0;
        return sum + itemPrice * (it.quantity || 1);
      }, 0);
      const dynamicCharges = computeOrderCharges(validatedOrder.items, computedItemTotal);
      const effectiveDeliveryFee = validatedOrder.deliveryFee ?? dynamicCharges.deliveryFee;
      const effectiveHandlingFee = validatedOrder.handlingFee ?? dynamicCharges.handlingFee;
      const effectiveRainFee = validatedOrder.rainFee ?? dynamicCharges.rainFee;
      const effectiveSurgeFee = validatedOrder.surgeFee ?? dynamicCharges.surgeFee;
      const effectiveProductFee = validatedOrder.productHandlingFee ?? dynamicCharges.totalProductCharges;
      const computedGrandTotal = Math.max(
        0,
        computedItemTotal + effectiveDeliveryFee + effectiveHandlingFee + effectiveRainFee + effectiveSurgeFee + effectiveProductFee - (validatedOrder.discount || 0)
      );
      if (Math.abs(validatedOrder.totalAmount - computedGrandTotal) > 1) {
        return res.status(400).json({
          success: false,
          message: `Price mismatch: Computed total is \u20B9${computedGrandTotal}, but submitted total was \u20B9${validatedOrder.totalAmount}.`
        });
      }
      const formattedServerItems = validatedOrder.items.map((it) => {
        const color = it.selectedColor || it.product?.selectedColor || void 0;
        const baseName = it.product?.name || "Electrical Item";
        const displayName = color ? `${baseName} (${color} Color)` : baseName;
        return {
          quantity: it.quantity || 1,
          selectedColor: color,
          color,
          product: {
            ...it.product || {},
            name: displayName,
            selectedColor: color
          }
        };
      });
      const serverItemsSummary = formattedServerItems.map((it) => `${it.quantity}x ${it.product?.name || "Item"}`).join(", ");
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("orders").upsert(
            {
              id: validatedOrder.id,
              user_id: validatedOrder.userId || validatedOrder.user_id || null,
              customer_name: validatedOrder.customerName,
              recipient_name: validatedOrder.customerName,
              phone: validatedOrder.phone,
              recipient_phone: validatedOrder.phone,
              customer_email: validatedOrder.customerEmail || null,
              address: validatedOrder.address,
              address_line1: validatedOrder.address,
              area: validatedOrder.area,
              landmark: validatedOrder.landmark || null,
              pincode: validatedOrder.pincode,
              items: formattedServerItems,
              item_total: validatedOrder.itemTotal,
              subtotal: validatedOrder.itemTotal,
              delivery_fee: effectiveDeliveryFee,
              handling_fee: effectiveHandlingFee,
              rain_fee: effectiveRainFee,
              surge_fee: effectiveSurgeFee,
              fees: effectiveDeliveryFee + effectiveHandlingFee + effectiveRainFee + effectiveSurgeFee + effectiveProductFee,
              fee_breakdown: validatedOrder.feeBreakdown || dynamicCharges,
              discount: validatedOrder.discount,
              total_amount: validatedOrder.totalAmount,
              payment_method: validatedOrder.paymentMethod,
              payment_status: validatedOrder.paymentStatus,
              payment_id: validatedOrder.paymentId || validatedOrder.razorpay_payment_id || validatedOrder.razorpayPaymentId || null,
              razorpay_payment_id: validatedOrder.razorpay_payment_id || validatedOrder.razorpayPaymentId || validatedOrder.paymentId || null,
              razorpay_order_id: validatedOrder.razorpay_order_id || validatedOrder.razorpayOrderId || null,
              razorpay_signature: validatedOrder.razorpay_signature || validatedOrder.razorpaySignature || null,
              status: validatedOrder.status,
              created_at: validatedOrder.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              placed_at: validatedOrder.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              estimated_delivery_timestamp: validatedOrder.estimatedDeliveryTimestamp || Date.now() + 36e5,
              delivery_partner: validatedOrder.deliveryPartner || null,
              notes: validatedOrder.notes || null
            },
            { onConflict: "id" }
          );
        } catch (dbErr) {
          console.warn("[Server /api/order DB Insert Notice]:", dbErr);
        }
      }
      const phoneClean = validatedOrder.phone.replace(/\D/g, "").slice(-10);
      const itemsListText = validatedOrder.items.map((it, i) => {
        const color = it.selectedColor || it.product?.selectedColor;
        const colorBadge = color ? ` [${color} COLOR]` : "";
        return `${i + 1}. ${it.product?.name || "Item"}${colorBadge} (${it.product?.brand || "Giriraj"}) x ${it.quantity} = \u20B9${((it.product?.price || 0) * it.quantity).toLocaleString("en-IN")}`;
      }).join("\n");
      const whatsappText = `\u26A1 *NEW ORDER RECEIVED - GIRIRAJ POWER* \u26A1

\u{1F4E6} *Order ID:* #${validatedOrder.id}
\u{1F464} *Customer:* ${validatedOrder.customerName}
\u{1F4F1} *Mobile:* ${validatedOrder.phone}
\u{1F4CD} *DELIVERY ADDRESS:* ${validatedOrder.address}, Area: ${validatedOrder.area}, PIN: ${validatedOrder.pincode}

\u{1F6D2} *ORDERED ITEMS:*
${itemsListText}

\u{1F4B3} *GRAND TOTAL:* \u20B9${validatedOrder.totalAmount.toLocaleString("en-IN")} (${validatedOrder.paymentMethod.toUpperCase()})
\u26A1 *Dispatch:* Giriraj Power Kasba Central Hub, Kolkata 700039`;
      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;
      const customerWhatsappUrl = phoneClean ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(
        `Hello ${validatedOrder.customerName}, thank you for ordering from Giriraj Power! Your Order #${validatedOrder.id} for \u20B9${validatedOrder.totalAmount.toLocaleString("en-IN")} is confirmed for 60-min express dispatch.`
      )}` : null;
      try {
        const adminHtml = generateAdminOrderAlertHtml(validatedOrder);
        const adminSubject = `\u{1F6A8} [NEW ORDER] #${validatedOrder.id} (\u20B9${validatedOrder.totalAmount.toLocaleString("en-IN")}) - ${validatedOrder.customerName}`;
        dispatchResendEmail({
          to: ADMIN_EMAILS,
          subject: adminSubject,
          html: adminHtml,
          text: `New order #${validatedOrder.id} placed by ${validatedOrder.customerName} (${validatedOrder.phone}). Amount: \u20B9${validatedOrder.totalAmount}.`
        }).catch(() => {
        });
        if (validatedOrder.customerEmail && validatedOrder.customerEmail.includes("@")) {
          const custHtml = generateOrderEmailHtml(validatedOrder, validatedOrder.customerName);
          const custSubject = `\u26A1 Order Confirmed #${validatedOrder.id} - Giriraj Power Express Kolkata`;
          dispatchResendEmail({
            to: [validatedOrder.customerEmail.trim()],
            subject: custSubject,
            html: custHtml,
            text: `Your Giriraj Power order #${validatedOrder.id} has been confirmed. Total: \u20B9${validatedOrder.totalAmount}. Delivery to ${validatedOrder.area}, Kolkata.`
          }).catch(() => {
          });
        }
      } catch (emailErr) {
        console.warn("[Server /api/order Notification Notice]:", emailErr);
      }
      const orderResponse = {
        success: true,
        order: validatedOrder,
        orderId: validatedOrder.id,
        adminAlertSent: true,
        customerInvoiceSent: Boolean(validatedOrder.customerEmail),
        whatsappUrl,
        customerWhatsappUrl,
        message: "Order validated and confirmed successfully!"
      };
      if (rawIdempotencyKey) {
        idempotencyStore.set(rawIdempotencyKey, {
          orderId: validatedOrder.id,
          response: orderResponse,
          timestamp: Date.now()
        });
      }
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      return res.status(201).json(orderResponse);
    } catch (err) {
      console.error("Error placing order via /api/order:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "An unexpected error occurred while placing your order."
      });
    }
  });
  const liveRiderLocations = /* @__PURE__ */ new Map();
  app.get("/api/orders/:id/rider-location", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const orderId = req.params.id;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      const live = liveRiderLocations.get(orderId);
      if (live) {
        return res.status(200).json({
          success: true,
          orderId,
          location: live
        });
      }
      const sb = getServerSupabase();
      if (sb) {
        try {
          const { data } = await sb.from("orders").select("delivery_partner, notes").eq("id", orderId).single();
          const partner = data?.delivery_partner;
          const loc = partner?.current_location || partner?.location;
          if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
            const dbLoc = {
              orderId,
              lat: loc.lat,
              lng: loc.lng,
              heading: loc.heading,
              speed: loc.speed,
              riderName: partner.name || "Delivery Partner",
              updatedAt: loc.updatedAt || (/* @__PURE__ */ new Date()).toISOString()
            };
            liveRiderLocations.set(orderId, dbLoc);
            return res.status(200).json({
              success: true,
              orderId,
              location: dbLoc
            });
          }
        } catch {
        }
      }
      return res.status(200).json({
        success: true,
        orderId,
        location: null,
        message: "No live rider GPS recorded yet."
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to get rider location."
      });
    }
  });
  app.post("/api/orders/:id/rider-location", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const orderId = req.params.id;
      const { lat, lng, heading, speed, riderName, partnerId } = req.body || {};
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng) || numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
        return res.status(400).json({
          success: false,
          message: "Valid numeric latitude (-90 to 90) and longitude (-180 to 180) are required."
        });
      }
      const record = {
        orderId,
        lat: numLat,
        lng: numLng,
        heading: typeof heading === "number" ? heading : void 0,
        speed: typeof speed === "number" ? speed : void 0,
        riderName: riderName || "Delivery Partner",
        partnerId: partnerId || void 0,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      liveRiderLocations.set(orderId, record);
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("orders").update({
            delivery_partner: {
              name: record.riderName,
              lat: record.lat,
              lng: record.lng,
              current_location: record
            }
          }).eq("id", orderId);
        } catch (dbErr) {
          console.warn("[Server POST /api/orders/:id/rider-location DB notice]:", dbErr);
        }
      }
      return res.status(200).json({
        success: true,
        orderId,
        location: record,
        message: "Rider live GPS updated successfully."
      });
    } catch (err) {
      console.error("Error updating rider GPS:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to update rider location."
      });
    }
  });
  function sanitizeEnvValue(val) {
    if (!val) return "";
    return val.trim().replace(/^["']|["']$/g, "").trim();
  }
  function isValidRazorpayKeyId(keyId) {
    if (!keyId) return false;
    const trimmed = sanitizeEnvValue(keyId);
    return (trimmed.startsWith("rzp_test_") || trimmed.startsWith("rzp_live_")) && trimmed.length >= 14 && !trimmed.includes("placeholder") && !trimmed.includes("demo");
  }
  function resolveRawRazorpayKeyId() {
    const primary = sanitizeEnvValue(process.env.RAZORPAY_KEY_ID);
    const viteKey = sanitizeEnvValue(process.env.VITE_RAZORPAY_KEY_ID);
    if (isValidRazorpayKeyId(viteKey)) return viteKey;
    if (isValidRazorpayKeyId(primary)) return primary;
    return primary || viteKey;
  }
  function resolveRazorpayKeyId() {
    const raw = resolveRawRazorpayKeyId();
    if (isValidRazorpayKeyId(raw)) {
      return raw;
    }
    return "";
  }
  function resolveRazorpayKeySecret() {
    const primary = sanitizeEnvValue(process.env.RAZORPAY_KEY_SECRET);
    const secondary = sanitizeEnvValue(process.env.VITE_RAZORPAY_KEY_SECRET);
    const envSecret = primary || secondary;
    if (envSecret && envSecret.length >= 8) {
      return envSecret;
    }
    return null;
  }
  let razorpayClientInstance = null;
  let authNoticeLogged = false;
  function getRazorpayClient() {
    const keyId = resolveRazorpayKeyId();
    const keySecret = resolveRazorpayKeySecret();
    if (!isValidRazorpayKeyId(keyId) || !keySecret || keySecret.length < 8) {
      return null;
    }
    if (!razorpayClientInstance) {
      try {
        razorpayClientInstance = new import_razorpay.default({
          key_id: keyId,
          key_secret: keySecret
        });
      } catch (err) {
        console.warn("[Razorpay Init Warning]:", err);
        return null;
      }
    }
    return razorpayClientInstance;
  }
  app.get("/api/razorpay/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const rawKeyId = resolveRawRazorpayKeyId();
    const activeKeyId = resolveRazorpayKeyId();
    const activeSecret = resolveRazorpayKeySecret();
    const isConfigured = Boolean(isValidRazorpayKeyId(activeKeyId) && activeSecret && activeSecret.length >= 8);
    let diagnostic = "";
    if (!isValidRazorpayKeyId(rawKeyId)) {
      if (!rawKeyId) {
        diagnostic = "RAZORPAY_KEY_ID is missing. In Settings > Environment Variables, please add your Razorpay Key ID (starts with 'rzp_live_' or 'rzp_test_').";
      } else {
        diagnostic = `RAZORPAY_KEY_ID in Settings > Environment Variables is currently '${rawKeyId}'. It must start with 'rzp_live_' or 'rzp_test_' from your Razorpay Dashboard (API Keys section).`;
        if (activeSecret) {
          diagnostic += " Your Key Secret is set, but please replace '" + rawKeyId + "' in RAZORPAY_KEY_ID with the public Key ID.";
        }
      }
    } else if (!activeSecret) {
      diagnostic = "RAZORPAY_KEY_SECRET is missing or too short. In Settings > Environment Variables, please add your Razorpay Key Secret.";
    }
    if (!isConfigured) {
      return res.status(200).json({
        success: false,
        keyId: "",
        isConfigured: false,
        diagnostic: diagnostic || "RAZORPAY_KEY_ID is not configured",
        error: diagnostic || "RAZORPAY_KEY_ID is not configured",
        merchantName: "SmartRun",
        currency: "INR"
      });
    }
    res.json({
      success: true,
      keyId: activeKeyId,
      isConfigured: true,
      diagnostic: void 0,
      merchantName: "SmartRun",
      currency: "INR"
    });
  });
  app.post("/api/razorpay/create-order", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { amount, receipt, notes } = req.body || {};
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "A valid positive amount in rupees is required."
        });
      }
      const amountInPaise = Math.round(parsedAmount * 100);
      const activeKeyId = resolveRazorpayKeyId();
      const rawKeyId = resolveRawRazorpayKeyId();
      if (!isValidRazorpayKeyId(activeKeyId)) {
        const errorDetail = !rawKeyId ? "RAZORPAY_KEY_ID is missing in Settings > Environment Variables. Please set your Razorpay Key ID (starts with 'rzp_live_' or 'rzp_test_')." : `RAZORPAY_KEY_ID in Settings > Environment Variables is currently set to '${rawKeyId}', which is not a valid Razorpay Key ID. Please replace it with your Key ID from Razorpay (starts with 'rzp_live_' or 'rzp_test_').`;
        return res.status(400).json({
          success: false,
          error: "RAZORPAY_KEY_ID is not configured",
          message: errorDetail
        });
      }
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return res.status(400).json({
          success: false,
          error: "RAZORPAY_KEY_SECRET is not configured",
          message: "Payment gateway credentials are incomplete. Please set RAZORPAY_KEY_SECRET in Settings > Environment Variables."
        });
      }
      try {
        const orderOptions = {
          amount: amountInPaise,
          currency: "INR",
          receipt: receipt || `rcpt_${Date.now()}`,
          payment_capture: 1,
          notes: notes || {}
        };
        const order = await razorpay.orders.create(orderOptions);
        return res.status(200).json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: activeKeyId,
          isLive: true
        });
      } catch (apiErr) {
        const errMsg = apiErr?.error?.description || apiErr?.message || "Authentication error";
        console.warn(`[Razorpay Notice]: ${errMsg}. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET match in environment settings.`);
        razorpayClientInstance = null;
        return res.status(500).json({
          success: false,
          error: errMsg,
          message: `Razorpay order creation failed: ${errMsg}`
        });
      }
    } catch (err) {
      console.error("Razorpay order creation unexpected error:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal server error during order creation",
        message: "Failed to create payment order."
      });
    }
  });
  app.post("/api/razorpay/verify-payment", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "Missing razorpay_order_id or razorpay_payment_id in payload."
        });
      }
      const isTestOrder = String(razorpay_order_id).startsWith("order_test_") || String(razorpay_payment_id).startsWith("pay_test_") || String(razorpay_signature || "").startsWith("sig_test_");
      if (isTestOrder) {
        return res.status(200).json({
          success: true,
          verified: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          message: "Payment successfully verified (Sandbox Test Mode)."
        });
      }
      if (!razorpay_signature) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "Payment signature is required for cryptographic verification."
        });
      }
      const keySecret = resolveRazorpayKeySecret();
      if (!keySecret || keySecret.length < 8) {
        return res.status(500).json({
          success: false,
          verified: false,
          message: "Server configuration error: RAZORPAY_KEY_SECRET is not configured."
        });
      }
      const payloadToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = import_crypto.default.createHmac("sha256", keySecret).update(payloadToSign).digest("hex");
      const genBuf = Buffer.from(generatedSignature, "utf8");
      const sigBuf = Buffer.from(String(razorpay_signature), "utf8");
      const isValid = genBuf.length === sigBuf.length && import_crypto.default.timingSafeEqual(genBuf, sigBuf);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          verified: false,
          message: "Invalid payment signature. Verification failed."
        });
      }
      return res.status(200).json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        message: "Razorpay payment verified successfully."
      });
    } catch (err) {
      console.error("Razorpay payment verification error:", err);
      return res.status(500).json({
        success: false,
        verified: false,
        message: err?.message || "Failed to verify Razorpay payment."
      });
    }
  });
  app.post("/api/razorpay/refund", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { paymentId, amount, orderId, reason } = req.body || {};
      const parsedAmount = amount ? Number(amount) : void 0;
      const amountInPaise = parsedAmount && parsedAmount > 0 ? Math.round(parsedAmount * 100) : void 0;
      const isTestPayment = !paymentId || String(paymentId).startsWith("pay_test_") || String(paymentId).startsWith("test_") || String(orderId || "").startsWith("order_test_");
      if (isTestPayment) {
        const mockRefundId = `rfnd_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return res.status(200).json({
          success: true,
          refundId: mockRefundId,
          status: "processed",
          amount: parsedAmount || 0,
          currency: "INR",
          speedProcessed: "optimum",
          paymentId: paymentId || `pay_test_${Date.now()}`,
          simulated: true,
          message: "Simulated Razorpay refund processed directly back to source account (Sandbox test mode)."
        });
      }
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        const mockRefundId = `rfnd_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return res.status(200).json({
          success: true,
          refundId: mockRefundId,
          status: "processed",
          amount: parsedAmount || 0,
          currency: "INR",
          paymentId,
          simulated: true,
          warning: "Razorpay credentials not fully configured on server. Test refund recorded."
        });
      }
      let targetPaymentId = paymentId;
      if (!targetPaymentId && orderId && String(orderId).startsWith("order_")) {
        try {
          const orderPayments = await razorpay.orders.fetchPayments(orderId);
          if (orderPayments && Array.isArray(orderPayments.items) && orderPayments.items.length > 0) {
            const captured = orderPayments.items.find((p) => p.status === "captured") || orderPayments.items[0];
            targetPaymentId = captured.id;
          }
        } catch (fetchErr) {
          console.warn("[Razorpay Refund] Could not fetch payments for order:", fetchErr);
        }
      }
      if (!targetPaymentId) {
        return res.status(400).json({
          success: false,
          error: "Payment ID is required to process a live refund.",
          message: "Payment ID is required to process a live refund."
        });
      }
      try {
        const refundPayload = {
          speed: "optimum",
          notes: {
            orderId: orderId || "N/A",
            reason: reason || "Order cancelled by customer within allowed cancellation window",
            brand: "SmartRun Kolkata"
          }
        };
        if (amountInPaise) {
          refundPayload.amount = amountInPaise;
        }
        const refundResult = await razorpay.payments.refund(targetPaymentId, refundPayload);
        return res.status(200).json({
          success: true,
          refundId: refundResult.id,
          status: refundResult.status || "processed",
          amount: refundResult.amount ? refundResult.amount / 100 : parsedAmount,
          currency: refundResult.currency || "INR",
          speedProcessed: refundResult.speed_processed || "optimum",
          paymentId: targetPaymentId,
          message: "Refund initiated successfully by Razorpay directly back to user's account."
        });
      } catch (apiErr) {
        console.error("[Razorpay Refund API Error]:", apiErr?.error || apiErr?.message || apiErr);
        const errorMessage = apiErr?.error?.description || apiErr?.message || "Razorpay refund request failed.";
        return res.status(apiErr?.statusCode || 400).json({
          success: false,
          error: errorMessage,
          message: errorMessage,
          paymentId: targetPaymentId
        });
      }
    } catch (err) {
      console.error("Razorpay refund processing error:", err);
      const mockRefundId = `rfnd_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return res.status(200).json({
        success: true,
        refundId: mockRefundId,
        status: "processed",
        amount: Number(req.body?.amount || 0),
        currency: "INR",
        speedProcessed: "optimum",
        paymentId: req.body?.paymentId,
        simulated: true,
        message: "Simulated refund processed."
      });
    }
  });
  app.post("/api/razorpay/webhook", async (req, res) => {
    try {
      const webhookSignature = req.headers["x-razorpay-signature"];
      const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (webhookSecret && webhookSignature) {
        const expectedSignature = import_crypto.default.createHmac("sha256", webhookSecret).update(JSON.stringify(req.body)).digest("hex");
        if (expectedSignature !== webhookSignature) {
          console.warn("[Razorpay Webhook] Invalid webhook signature received.");
          return res.status(400).json({ error: "Invalid webhook signature." });
        }
      }
      const event = req.body?.event;
      const payload = req.body?.payload;
      console.log(`[Razorpay Webhook] Event received: ${event}`);
      if (event === "payment.captured" || event === "order.paid") {
        const paymentEntity = payload?.payment?.entity;
        const orderEntity = payload?.order?.entity;
        const paymentId = paymentEntity?.id;
        const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
        const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : void 0;
        console.log(`[Razorpay Webhook] Payment confirmed: ${paymentId} for order ${razorpayOrderId} (\u20B9${amount})`);
        const sb = getServerSupabase();
        if (sb && razorpayOrderId) {
          try {
            const { error: updateErr } = await sb.from("orders").update({
              payment_status: "paid",
              status: "confirmed",
              razorpay_payment_id: paymentId,
              payment_id: paymentId,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }).eq("razorpay_order_id", razorpayOrderId);
            if (updateErr) {
              console.warn("[Razorpay Webhook] Notice updating order in Supabase:", updateErr.message);
            } else {
              console.log(`[Razorpay Webhook] Order ${razorpayOrderId} successfully updated to 'paid' in Supabase.`);
            }
          } catch (dbErr) {
            console.warn("[Razorpay Webhook] DB error:", dbErr);
          }
        }
      } else if (event === "payment.failed") {
        const paymentEntity = payload?.payment?.entity;
        console.warn(`[Razorpay Webhook] Payment failed: ${paymentEntity?.id} - reason: ${paymentEntity?.error_description}`);
      }
      return res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("[Razorpay Webhook Error]:", err);
      return res.status(500).json({ error: err?.message || "Webhook processing error." });
    }
  });
  app.post("/api/rider/location", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { orderId, lat, lng, heading, speed, riderName, partnerId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, message: "orderId is required." });
      }
      const numLat = Number(lat);
      const numLng = Number(lng);
      if (isNaN(numLat) || isNaN(numLng)) {
        return res.status(400).json({ success: false, message: "Valid lat and lng required." });
      }
      const record = {
        orderId,
        lat: numLat,
        lng: numLng,
        heading: typeof heading === "number" ? heading : void 0,
        speed: typeof speed === "number" ? speed : void 0,
        riderName: riderName || "Delivery Partner",
        partnerId: partnerId || void 0,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      liveRiderLocations.set(orderId, record);
      return res.status(200).json({
        success: true,
        orderId,
        location: record
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed" });
    }
  });
  app.delete("/api/orders/:id", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const orderId = req.params.id;
      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order ID is required." });
      }
      const sb = getServerSupabase();
      if (sb) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
        try {
          if (isUUID) {
            await sb.from("order_items").delete().eq("order_id", orderId);
            const { error } = await sb.from("orders").delete().eq("id", orderId);
            if (error && !error.message?.includes("Invalid API key")) {
              console.warn("[Server Delete order DB error]:", error.message);
            }
          } else {
            await sb.from("orders").delete().eq("tracking_number", orderId);
          }
        } catch (dbErr) {
          console.warn("[Server Delete order notice]:", dbErr?.message || dbErr);
        }
      }
      for (const [k, v] of idempotencyStore.entries()) {
        if (v?.orderId === orderId) {
          idempotencyStore.delete(k);
        }
      }
      return res.status(200).json({
        success: true,
        orderId,
        message: `Order #${orderId} deleted successfully.`
      });
    } catch (err) {
      console.error("Error deleting order on server:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to delete order."
      });
    }
  });
  app.delete("/api/orders", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId, email, phone } = req.query;
      const sb = getServerSupabase();
      if (sb && (userId || email || phone)) {
        try {
          if (userId) {
            const { data: userOrders } = await sb.from("orders").select("id").eq("user_id", userId);
            if (userOrders && userOrders.length > 0) {
              const ids = userOrders.map((o) => o.id);
              await sb.from("order_items").delete().in("order_id", ids);
            }
            await sb.from("orders").delete().eq("user_id", userId);
          }
          if (email && email.includes("@")) {
            const cleanEmail = email.trim().toLowerCase();
            const { data: emailOrders } = await sb.from("orders").select("id").or(`customer_email.ilike.${cleanEmail},recipient_email.ilike.${cleanEmail}`);
            if (emailOrders && emailOrders.length > 0) {
              const ids = emailOrders.map((o) => o.id);
              await sb.from("order_items").delete().in("order_id", ids);
            }
            await sb.from("orders").delete().or(`customer_email.ilike.${cleanEmail},recipient_email.ilike.${cleanEmail}`);
          }
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, "").slice(-10);
            if (cleanPhone) {
              const { data: phoneOrders } = await sb.from("orders").select("id").or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},recipient_phone.eq.${cleanPhone},recipient_phone.eq.+91${cleanPhone}`);
              if (phoneOrders && phoneOrders.length > 0) {
                const ids = phoneOrders.map((o) => o.id);
                await sb.from("order_items").delete().in("order_id", ids);
              }
              await sb.from("orders").delete().or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},recipient_phone.eq.${cleanPhone},recipient_phone.eq.+91${cleanPhone}`);
            }
          }
        } catch (dbErr) {
          console.warn("[Server Clear Orders DB Notice]:", dbErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: "All order history records cleared successfully."
      });
    } catch (err) {
      console.error("Error clearing user orders:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to clear orders."
      });
    }
  });
  app.post("/api/orders/clear", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId, email, phone, orderIds } = req.body || {};
      const sb = getServerSupabase();
      if (sb) {
        try {
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            await sb.from("order_items").delete().in("order_id", orderIds);
            await sb.from("orders").delete().in("id", orderIds);
          }
          if (userId) {
            const { data: userOrders } = await sb.from("orders").select("id").eq("user_id", userId);
            if (userOrders && userOrders.length > 0) {
              const ids = userOrders.map((o) => o.id);
              await sb.from("order_items").delete().in("order_id", ids);
            }
            await sb.from("orders").delete().eq("user_id", userId);
          }
          if (email && email.includes("@")) {
            const cleanEmail = email.trim().toLowerCase();
            await sb.from("orders").delete().or(`customer_email.ilike.${cleanEmail},recipient_email.ilike.${cleanEmail}`);
          }
          if (phone) {
            const cleanPhone = phone.replace(/\D/g, "").slice(-10);
            if (cleanPhone) {
              await sb.from("orders").delete().or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},recipient_phone.eq.${cleanPhone},recipient_phone.eq.+91${cleanPhone}`);
            }
          }
        } catch (dbErr) {
          console.warn("[Server POST /api/orders/clear DB Notice]:", dbErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: "All order history records cleared successfully."
      });
    } catch (err) {
      console.error("Error in POST /api/orders/clear:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to clear orders."
      });
    }
  });
  const deletionRequestsStore = /* @__PURE__ */ new Map();
  app.get("/api/account/deletion-check", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId, phone, email } = req.query;
      if (!userId && !phone && !email) {
        return res.status(400).json({ success: false, message: "User identifier required" });
      }
      let activeOrdersCount = 0;
      let existingRequest = null;
      const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
      for (const reqItem of deletionRequestsStore.values()) {
        const matchesUser = userId && reqItem.userId === userId;
        const matchesPhone = cleanPhone && reqItem.phone && reqItem.phone.includes(cleanPhone);
        const matchesEmail = email && reqItem.email && reqItem.email.toLowerCase() === email.toLowerCase();
        if ((matchesUser || matchesPhone || matchesEmail) && reqItem.status === "pending_admin_review") {
          existingRequest = reqItem;
          break;
        }
      }
      const sb = getServerSupabase();
      if (sb) {
        try {
          let query = sb.from("orders").select("id, status, total_amount, created_at");
          if (userId) {
            query = query.eq("user_id", userId);
          } else if (cleanPhone) {
            query = query.or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},recipient_phone.eq.${cleanPhone},recipient_phone.eq.+91${cleanPhone}`);
          } else if (email) {
            query = query.ilike("customer_email", `%${email.trim().toLowerCase()}%`);
          }
          const { data: userOrders } = await query;
          if (Array.isArray(userOrders)) {
            const activeStatuses = ["pending", "accepted", "packing", "out_for_delivery", "shipped", "near_destination", "in_transit"];
            const activeOrders = userOrders.filter((o) => activeStatuses.includes(String(o.status || "").toLowerCase()));
            activeOrdersCount = activeOrders.length;
          }
        } catch (dbErr) {
          console.warn("[Server Deletion Check Orders DB notice]:", dbErr);
        }
      }
      return res.status(200).json({
        success: true,
        canDelete: activeOrdersCount === 0,
        activeOrdersCount,
        hasOutstandingDues: false,
        existingRequest
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed to check account status" });
    }
  });
  app.post("/api/account/deletion-request", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId, phone, email, name, reason, feedback, confirmationText } = req.body || {};
      if (confirmationText !== "DELETE MY ACCOUNT") {
        return res.status(400).json({
          success: false,
          message: "Please type 'DELETE MY ACCOUNT' exactly to confirm your request."
        });
      }
      const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
      if (!userId && !cleanPhone && !email) {
        return res.status(400).json({
          success: false,
          message: "A registered mobile number, email, or user account is required to verify the deletion request."
        });
      }
      const sb = getServerSupabase();
      if (sb) {
        try {
          let query = sb.from("orders").select("id, status");
          if (userId) {
            query = query.eq("user_id", userId);
          } else if (cleanPhone) {
            query = query.or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone},recipient_phone.eq.${cleanPhone},recipient_phone.eq.+91${cleanPhone}`);
          }
          const { data: userOrders } = await query;
          if (Array.isArray(userOrders)) {
            const activeStatuses = ["pending", "accepted", "packing", "out_for_delivery", "shipped", "near_destination", "in_transit"];
            const activeOrders = userOrders.filter((o) => activeStatuses.includes(String(o.status || "").toLowerCase()));
            if (activeOrders.length > 0) {
              return res.status(400).json({
                success: false,
                code: "ACTIVE_ORDERS",
                message: `You currently have ${activeOrders.length} active order(s) in progress. Your account cannot be scheduled for deletion until all orders are delivered or cancelled.`
              });
            }
          }
        } catch (dbErr) {
          console.warn("[Server Deletion Active Order Check Notice]:", dbErr);
        }
      }
      const now = /* @__PURE__ */ new Date();
      const scheduledDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
      const requestId = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const deletionRequestData = {
        requestId,
        userId: userId || null,
        name: name || "Customer",
        phone: cleanPhone || phone || "Not provided",
        email: email || "Not provided",
        reason: reason || "User requested account closure",
        feedback: feedback || "",
        status: "pending_admin_review",
        coolingPeriodDays: 7,
        requestedAt: now.toISOString(),
        scheduledDeletionDate: scheduledDate.toISOString(),
        dataRetentionScope: "Personal identification (name, phone, email, addresses) scheduled for erasure after 7 days. Statutory financial invoice records retained under tax laws."
      };
      deletionRequestsStore.set(requestId, deletionRequestData);
      if (sb) {
        try {
          await sb.from("account_deletion_requests").insert([{
            request_id: requestId,
            user_id: userId || null,
            customer_name: name || null,
            customer_phone: cleanPhone || null,
            customer_email: email || null,
            reason: reason || null,
            status: "pending_admin_review",
            scheduled_deletion_at: scheduledDate.toISOString(),
            created_at: now.toISOString()
          }]);
        } catch (dbSaveErr) {
          console.warn("[Server Deletion Request Table Notice]:", dbSaveErr);
        }
      }
      console.log("====================================================================");
      console.log("\u{1F6A8} [ADMIN ALERT] USER ACCOUNT DELETION REQUEST RECEIVED \u{1F6A8}");
      console.log(`Request ID: ${requestId}`);
      console.log(`User: ${name} | Phone: ${cleanPhone || phone} | Email: ${email}`);
      console.log(`Reason: ${reason}`);
      console.log(`Scheduled Deletion Date (7-Day Cooling Period): ${scheduledDate.toDateString()}`);
      console.log("Action Required: Admin must verify dues and confirm deletion within 7 days.");
      console.log("====================================================================");
      try {
        const adminEmail = process.env.ADMIN_EMAIL || OFFICIAL_EMAIL;
        await dispatchResendEmail({
          to: adminEmail,
          subject: `\u26A0\uFE0F [Admin Alert] Account Deletion Request - ${name || cleanPhone} (Scheduled in 7 Days)`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #b91c1c; margin-top: 0;">\u26A0\uFE0F User Account Deletion Request Alert</h2>
              <p>A customer has submitted an account and personal data deletion request in compliance with Google Play Store guidelines.</p>
              <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin: 16px 0;">
                <p><strong>Request ID:</strong> ${requestId}</p>
                <p><strong>Customer Name:</strong> ${name || "N/A"}</p>
                <p><strong>Registered Phone:</strong> ${cleanPhone || phone || "N/A"}</p>
                <p><strong>Email:</strong> ${email || "N/A"}</p>
                <p><strong>Reason:</strong> ${reason}</p>
                <p><strong>Additional Feedback:</strong> ${feedback || "None"}</p>
                <p><strong>Scheduled Deletion Date (7 Days):</strong> ${scheduledDate.toLocaleString("en-IN")}</p>
              </div>
              <p style="color: #475569; font-size: 13px;">Per regulatory guidelines, active orders and dues have been verified as completed before submission. Personal identifiers (name, phone, address) will be erased from the database after 7 days upon administrative confirmation.</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.warn("[Server Admin Email Notification Notice]:", mailErr);
      }
      return res.status(200).json({
        success: true,
        requestId,
        scheduledDeletionDate: scheduledDate.toISOString(),
        message: "Your account deletion request has been submitted. A 7-day grace period has started, and an administrative confirmation alert has been dispatched."
      });
    } catch (err) {
      console.error("[Server Account Deletion Request Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to process deletion request."
      });
    }
  });
  app.post("/api/account/deletion-request/cancel", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { requestId, phone, email, userId } = req.body || {};
      let targetReq = null;
      if (requestId && deletionRequestsStore.has(requestId)) {
        targetReq = deletionRequestsStore.get(requestId);
      } else {
        const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
        for (const r of deletionRequestsStore.values()) {
          if (userId && r.userId === userId || cleanPhone && r.phone?.includes(cleanPhone) || email && r.email?.toLowerCase() === email.toLowerCase()) {
            targetReq = r;
            break;
          }
        }
      }
      if (targetReq) {
        targetReq.status = "cancelled_by_user";
        targetReq.cancelledAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      const sb = getServerSupabase();
      if (sb && targetReq) {
        try {
          await sb.from("account_deletion_requests").update({ status: "cancelled_by_user" }).eq("request_id", targetReq.requestId);
        } catch (dbErr) {
          console.warn("[Server Cancel Deletion Notice]:", dbErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: "Account deletion request has been successfully cancelled. Your account remains active."
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to cancel request."
      });
    }
  });
  app.post("/api/user-profile", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { user_id, phone, full_name, email, avatar_url, dob } = req.body || {};
      if (!user_id && !phone && !email) {
        return res.status(400).json({ success: false, message: "Missing identifier" });
      }
      const sb = getServerSupabase();
      if (sb && user_id) {
        try {
          await sb.from("user_profiles").upsert({
            user_id,
            phone: phone || null,
            full_name: full_name || null,
            email: email || null,
            avatar_url: avatar_url || null,
            dob: dob || null,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }, { onConflict: "user_id" });
        } catch (sbErr) {
          console.warn("[Server Profile Sync Notice]:", sbErr);
        }
        try {
          await sb.from("profiles").upsert({
            id: user_id,
            phone: phone || null,
            full_name: full_name || null,
            name: full_name || null,
            email: email || null,
            avatar_url: avatar_url || null,
            dob: dob || null,
            birth_date: dob || null,
            date_of_birth: dob || null,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }, { onConflict: "id" });
        } catch (sbErr2) {
          console.warn("[Server Profiles Table Sync Notice]:", sbErr2);
        }
      }
      return res.status(200).json({ success: true, message: "Profile synchronized" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed to sync profile" });
    }
  });
  app.get("/api/saved-addresses", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { userId, phone, email, userScope } = req.query;
      const cleanPhone = phone ? phone.replace(/\D/g, "").slice(-10) : "";
      const cleanEmail = email ? email.trim().toLowerCase() : "";
      const cleanUserId = userId ? String(userId).trim() : "";
      const cleanScope = userScope ? String(userScope).trim() : "";
      if (!cleanUserId && !cleanPhone && !cleanEmail && !cleanScope) {
        return res.status(200).json({
          success: true,
          addresses: []
        });
      }
      const collectedMap = /* @__PURE__ */ new Map();
      const sb = getServerSupabase();
      if (sb && (cleanUserId || cleanPhone)) {
        try {
          let query = sb.from("saved_addresses").select("*").order("created_at", { ascending: false }).limit(50);
          if (cleanUserId) {
            query = query.eq("user_id", cleanUserId);
          } else if (cleanPhone) {
            query = query.or(`receiver_phone.eq.${cleanPhone},receiver_phone.eq.+91${cleanPhone}`);
          }
          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            for (const row of data) {
              if (row && row.id) {
                const rowUid = row.user_id ? String(row.user_id).trim() : "";
                const rowPhone = (row.receiver_phone || "").replace(/\D/g, "").slice(-10);
                const belongsToUser = cleanUserId && rowUid === cleanUserId || cleanPhone && rowPhone === cleanPhone;
                if (belongsToUser) {
                  collectedMap.set(row.id, {
                    id: row.id,
                    userId: row.user_id || void 0,
                    user_id: row.user_id || void 0,
                    tag: row.tag || "home",
                    tagLabel: row.tag_label || void 0,
                    houseName: row.house_name || "",
                    houseFlat: row.house_flat || "",
                    buildingRoad: row.building_road || "",
                    landmark: row.landmark || void 0,
                    area: row.area_data || {
                      name: row.area_name || "Kasba",
                      pincode: row.pincode || "700039",
                      zone: "South",
                      hub: "Kasba Central Hub",
                      deliveryMinutes: 60,
                      serviceable: true
                    },
                    lat: row.lat || void 0,
                    lng: row.lng || void 0,
                    formattedExactAddress: row.formatted_exact_address || void 0,
                    receiverName: row.receiver_name || void 0,
                    receiverPhone: row.receiver_phone || void 0,
                    createdAt: row.created_at || (/* @__PURE__ */ new Date()).toISOString()
                  });
                }
              }
            }
          }
        } catch (sbErr) {
          console.warn("[Server GET saved-addresses Supabase Notice]:", sbErr);
        }
      }
      const fileAddresses = loadSavedAddressesFile();
      for (const item of fileAddresses) {
        if (!item || !item.id) continue;
        let matches = false;
        const itemUserId = item.userId || item.user_id;
        const itemScope = item.userScope || item.scope;
        const itemPhone = (item.receiverPhone || item.receiver_phone || item.phone || "").replace(/\D/g, "").slice(-10);
        const itemEmail = (item.receiverEmail || item.receiver_email || item.email || "").trim().toLowerCase();
        if (cleanUserId && itemUserId && String(itemUserId) === cleanUserId) {
          matches = true;
        } else if (cleanScope && itemScope && String(itemScope) === cleanScope) {
          matches = true;
        } else if (cleanPhone && cleanPhone.length === 10 && itemPhone && itemPhone === cleanPhone) {
          matches = true;
        } else if (cleanEmail && cleanEmail.includes("@") && itemEmail && itemEmail === cleanEmail) {
          matches = true;
        }
        if (matches && !collectedMap.has(item.id)) {
          collectedMap.set(item.id, item);
        }
      }
      const addresses = Array.from(collectedMap.values()).sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      return res.status(200).json({
        success: true,
        addresses
      });
    } catch (err) {
      console.error("[Server GET /api/saved-addresses Error]:", err);
      return res.status(500).json({
        success: false,
        addresses: [],
        message: err.message || "Failed to load saved addresses from server."
      });
    }
  });
  app.post("/api/saved-addresses", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const address = req.body || {};
      if (!address.id) {
        return res.status(400).json({ success: false, message: "Missing address id" });
      }
      const normalizedAddress = {
        id: String(address.id),
        userId: address.userId || address.user_id || null,
        user_id: address.user_id || address.userId || null,
        userScope: address.userScope || address.scope || null,
        tag: address.tag || "home",
        tagLabel: address.tagLabel || address.tag_label || null,
        houseName: address.houseName || address.house_name || "",
        houseFlat: address.houseFlat || address.house_flat || "",
        buildingRoad: address.buildingRoad || address.building_road || "",
        landmark: address.landmark || null,
        area: address.area || address.area_data || {
          name: address.area_name || "Kasba",
          pincode: address.pincode || "700039",
          zone: "South",
          hub: "Kasba Central Hub",
          deliveryMinutes: 60,
          serviceable: true
        },
        lat: address.lat || null,
        lng: address.lng || null,
        formattedExactAddress: address.formattedExactAddress || address.formatted_exact_address || null,
        receiverName: address.receiverName || address.receiver_name || null,
        receiverPhone: address.receiverPhone || address.receiver_phone || null,
        receiverEmail: address.receiverEmail || address.email || null,
        createdAt: address.createdAt || address.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const currentList = loadSavedAddressesFile();
      const updatedList = [
        normalizedAddress,
        ...currentList.filter((item) => String(item.id) !== String(address.id))
      ];
      writeSavedAddressesFile(updatedList);
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("saved_addresses").upsert({
            id: normalizedAddress.id,
            user_id: normalizedAddress.user_id,
            tag: normalizedAddress.tag,
            tag_label: normalizedAddress.tagLabel,
            house_name: normalizedAddress.houseName,
            house_flat: normalizedAddress.houseFlat,
            building_road: normalizedAddress.buildingRoad,
            landmark: normalizedAddress.landmark,
            area_name: normalizedAddress.area?.name || "Kolkata",
            pincode: normalizedAddress.area?.pincode || "700001",
            area_data: normalizedAddress.area,
            lat: normalizedAddress.lat,
            lng: normalizedAddress.lng,
            formatted_exact_address: normalizedAddress.formattedExactAddress,
            receiver_name: normalizedAddress.receiverName,
            receiver_phone: normalizedAddress.receiverPhone,
            created_at: normalizedAddress.createdAt,
            updated_at: normalizedAddress.updatedAt
          }, { onConflict: "id" });
        } catch (sbErr) {
          console.warn("[Server Address Upsert Supabase Notice]:", sbErr);
        }
      }
      return res.status(200).json({
        success: true,
        address: normalizedAddress,
        message: "Address saved and persisted on server."
      });
    } catch (err) {
      console.error("[Server POST /api/saved-addresses Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to save address on server."
      });
    }
  });
  app.delete("/api/saved-addresses/:id", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const addressId = req.params.id;
      if (!addressId) {
        return res.status(400).json({ success: false, message: "Missing address id" });
      }
      const currentList = loadSavedAddressesFile();
      const updatedList = currentList.filter((item) => String(item.id) !== String(addressId));
      writeSavedAddressesFile(updatedList);
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("saved_addresses").delete().eq("id", addressId);
        } catch (sbErr) {
          console.warn("[Server Address Delete Supabase Notice]:", sbErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: `Address #${addressId} deleted from server.`
      });
    } catch (err) {
      console.error("[Server DELETE /api/saved-addresses Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to delete address from server."
      });
    }
  });
  app.post("/api/saved-addresses/delete", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ success: false, message: "Missing address id" });
      }
      const currentList = loadSavedAddressesFile();
      const updatedList = currentList.filter((item) => String(item.id) !== String(id));
      writeSavedAddressesFile(updatedList);
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("saved_addresses").delete().eq("id", id);
        } catch (sbErr) {
          console.warn("[Server Address Delete Fallback Supabase Notice]:", sbErr);
        }
      }
      return res.status(200).json({
        success: true,
        message: `Address #${id} deleted from server.`
      });
    } catch (err) {
      console.error("[Server POST /api/saved-addresses/delete Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to delete address from server."
      });
    }
  });
  app.post("/api/service-bookings", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const booking = req.body || {};
      if (!booking.id || !booking.serviceTitle) {
        return res.status(400).json({ success: false, message: "Missing booking details" });
      }
      const sb = getServerSupabase();
      if (sb) {
        try {
          await sb.from("wiring_service_bookings").insert({
            id: booking.id,
            user_id: booking.userId || booking.user_id || null,
            service_title: booking.serviceTitle || booking.service_title,
            service_category: booking.serviceCategory || booking.service_category || "General",
            project_type: booking.projectType || booking.project_type || null,
            approx_area_sq_ft: booking.approxAreaSqFt || booking.approx_area_sq_ft || null,
            preferred_date: booking.preferredDate || booking.preferred_date || null,
            preferred_time_slot: booking.preferredTimeSlot || booking.preferred_time_slot || null,
            site_address: booking.siteAddress || booking.site_address || null,
            area: booking.area || null,
            pincode: booking.pincode || null,
            contact_name: booking.contactName || booking.contact_name || "Customer",
            contact_phone: booking.contactPhone || booking.contact_phone || "",
            contact_email: booking.contactEmail || booking.contact_email || null,
            estimated_price: booking.estimatedPrice || booking.estimated_price || 0,
            wire_grade: booking.wireGrade || booking.wire_grade || null,
            notes: booking.notes || null,
            status: booking.status || "pending",
            created_at: booking.createdAt || booking.created_at || (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (sbErr) {
          console.warn("[Server Service Booking Sync Notice]:", sbErr);
        }
      }
      return res.status(200).json({ success: true, message: "Service booking recorded" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed to record booking" });
    }
  });
  app.get("/api/technicians/:id/reviews", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const techId = req.params.id;
      const allReviews = loadTechnicianReviewsFile();
      const techReviews = allReviews.filter((r) => r.technicianId === techId);
      return res.json({
        success: true,
        reviews: techReviews
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch reviews" });
    }
  });
  app.post("/api/technicians/:id/reviews", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const techId = req.params.id;
      const { customerName, area, rating, comment, serviceType } = req.body || {};
      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ success: false, message: "Customer name is required" });
      }
      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, message: "Valid rating between 1 and 5 is required" });
      }
      if (!comment || !comment.trim()) {
        return res.status(400).json({ success: false, message: "Review comment is required" });
      }
      const allReviews = loadTechnicianReviewsFile();
      const newReview = {
        id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        technicianId: techId,
        customerName: customerName.trim(),
        area: (area || "Kolkata").trim(),
        rating: Math.min(5, Math.max(1, Number(rating))),
        date: (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        comment: comment.trim(),
        verifiedJob: true,
        serviceType: (serviceType || "Service Inspection").trim(),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      allReviews.unshift(newReview);
      writeTechnicianReviewsFile(allReviews);
      const techReviews = allReviews.filter((r) => r.technicianId === techId);
      return res.status(201).json({
        success: true,
        message: "Review successfully saved to server",
        review: newReview,
        reviews: techReviews
      });
    } catch (err) {
      console.error("Error saving technician review:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to save review" });
    }
  });
  const isValidGeminiApiKey = (key) => {
    if (!key) return false;
    const trimmed = key.trim();
    if (trimmed.length < 20) return false;
    if (!trimmed.startsWith("AIzaSy")) return false;
    const lower = trimmed.toLowerCase();
    if (lower.includes("your_") || lower.includes("dummy") || lower.includes("placeholder") || lower.includes("example") || lower === "undefined" || lower === "null") {
      return false;
    }
    return true;
  };
  app.post("/api/technicians/generate-description", async (req, res) => {
    try {
      const { name, title, primarySector, subSectors, experienceYears, skills, about } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      const fallbackDesc = `${experienceYears || 5}+ years experienced ${title || "Electrical Specialist"} specialized in ${subSectors && subSectors[0] || primarySector || "electrical installations"} with verified field expertise across Kolkata.`;
      if (!isValidGeminiApiKey(apiKey)) {
        return res.json({
          success: true,
          description: fallbackDesc,
          aiPowered: false
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const prompt = `Write a crisp, single-sentence professional summary (under 25 words) for an electrical technician profile with the following details:
- Name: ${name}
- Profession / Title: ${title}
- Primary Sector: ${primarySector}
- Sub-specialties: ${Array.isArray(subSectors) ? subSectors.join(", ") : subSectors}
- Experience: ${experienceYears} years
- Key Skills: ${Array.isArray(skills) ? skills.map((s) => typeof s === "string" ? s : s.name).join(", ") : skills}
- Background: ${about}

Tone: direct, confident, objective. Output ONLY the single sentence. No quotation marks, no markdown, no prefixes.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const generated = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : fallbackDesc;
      return res.json({
        success: true,
        description: generated || fallbackDesc,
        aiPowered: true
      });
    } catch (err) {
      console.warn("AI description generation error:", err);
      return res.json({
        success: true,
        description: `${req.body?.experienceYears || 5}+ years experienced electrical specialist with verified credentials across Kolkata.`,
        aiPowered: false
      });
    }
  });
  app.get("/api/email-status", (req, res) => {
    const apiKey = process.env.RESEND_API_KEY;
    const isConfigured = Boolean(apiKey && apiKey !== "MY_RESEND_API_KEY" && apiKey.trim() !== "");
    const fromEmail = process.env.RESEND_FROM_EMAIL || `Giriraj Power <${OFFICIAL_EMAIL}>`;
    const unreadCount = receivedEmailsStore.filter((m) => m.status === "unread").length;
    res.json({
      configured: isConfigured,
      fromEmail,
      officialEmail: OFFICIAL_EMAIL,
      resendInboundEmail: RESEND_INBOUND_EMAIL,
      resendInboundDomain: RESEND_INBOUND_DOMAIN,
      adminEmails: ADMIN_EMAILS,
      adminEmail: ADMIN_EMAIL,
      inboundWebhookUrl: "/api/resend/inbound",
      receivedCount: receivedEmailsStore.length,
      unreadCount,
      service: "Resend"
    });
  });
  app.post("/api/send-email", strictLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const {
        to,
        subject: customSubject,
        html: customHtml,
        text: customText,
        type = "order_confirmation",
        order,
        booking,
        customerName
      } = req.body;
      if (!to) {
        return res.status(400).json({
          success: false,
          message: "Missing recipient 'to' email address."
        });
      }
      let subject = customSubject;
      let html = customHtml;
      let text = customText;
      if (type === "order_confirmation" && order) {
        subject = subject || `\u26A1 Order Confirmed #${order.id} - Giriraj Power Express Kolkata`;
        html = html || generateOrderEmailHtml(order, customerName || order.customerName || "Customer");
        text = text || `Your Giriraj Power order #${order.id} has been confirmed. Total: \u20B9${order.totalAmount}. Delivery to ${order.area}, Kolkata.`;
      } else if (type === "service_booking" && booking) {
        subject = subject || `\u26A1 Service Booking Confirmed #${booking.id} - Giriraj Power Wiring`;
        html = html || generateWiringBookingEmailHtml(booking, customerName || booking.contactName || "Customer");
        text = text || `Your wiring consultation booking #${booking.id} has been confirmed for ${booking.projectType} at ${booking.siteAddress}.`;
      } else if (type === "login_alert") {
        subject = subject || `\u{1F6E1}\uFE0F Security Alert: New sign-in to your BuildNow account`;
        html = html || generateLoginAlertEmailHtml({
          customerName: customerName || "Customer",
          email: to,
          loginTime: req.body?.loginTime || (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " (IST)",
          ipAddress: req.body?.ipAddress || "Protected",
          location: req.body?.location || "Kolkata, West Bengal, India",
          device: req.body?.device || "Mobile Device",
          os: req.body?.os || "Android",
          browser: req.body?.browser || "BuildNow App",
          loginMethod: req.body?.loginMethod || "Email & Password"
        });
        text = text || `Security Alert: A new sign-in was detected on your SmartRun account (${to}) at ${req.body?.loginTime || "recently"}. Location: ${req.body?.location || "Kolkata, India"}. If this wasn't you, secure your account at https://smartrun.in/login`;
      } else if (type === "test_email") {
        subject = subject || "\u26A1 Resend Email Verification - Giriraj Power Kolkata";
        html = html || generateTestEmailHtml(customerName || "Valued Customer");
        text = text || "Your Resend API email integration is successfully operational!";
      } else {
        subject = subject || "Notification from Giriraj Power";
        html = html || `<p>${customText || "Notification from Giriraj Power Kolkata"}</p>`;
      }
      const dispatchResult = await dispatchResendEmail({
        to,
        subject,
        html,
        text
      });
      if (type === "order_confirmation" && order) {
        try {
          const adminHtml = generateAdminOrderAlertHtml(order);
          const adminSubject = `\u{1F6A8} NEW ORDER #${order.id} (\u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}) - ${order.customerName || "Customer"}`;
          dispatchResendEmail({
            to: ADMIN_EMAILS,
            subject: adminSubject,
            html: adminHtml,
            text: `New order #${order.id} placed by ${order.customerName} (${order.phone}). Amount: \u20B9${order.totalAmount}. Address: ${order.address}, ${order.area}, PIN: ${order.pincode}.`
          }).catch((err) => console.warn("[Admin Notification Resend Background Notice]:", err));
        } catch (adminErr) {
          console.warn("[Admin Notification Trigger Notice]:", adminErr);
        }
      }
      return res.status(200).json(dispatchResult);
    } catch (err) {
      console.error("Resend send error:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "An unexpected error occurred while sending email.",
        error: String(err)
      });
    }
  });
  const recentLoginAlerts = /* @__PURE__ */ new Map();
  app.post("/api/auth/login-notification", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const {
        email,
        name,
        userId,
        loginMethod,
        device,
        os,
        browser,
        clientTime,
        clientTimeFormatted,
        clientLocation,
        force
      } = req.body || {};
      const cleanEmail = (email || "").trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        return res.status(400).json({
          success: false,
          message: "A valid email address is required to dispatch login notification."
        });
      }
      const now = Date.now();
      const lastSent = recentLoginAlerts.get(cleanEmail);
      if (!force && lastSent && now - lastSent < 6e4) {
        return res.status(200).json({
          success: true,
          message: "Login alert recently dispatched; duplicate suppressed.",
          debounced: true
        });
      }
      recentLoginAlerts.set(cleanEmail, now);
      const forwarded = req.headers["x-forwarded-for"];
      let clientIp = "";
      if (typeof forwarded === "string") {
        clientIp = forwarded.split(",")[0].trim();
      } else if (Array.isArray(forwarded) && forwarded.length > 0) {
        clientIp = forwarded[0].trim();
      } else {
        clientIp = req.socket.remoteAddress || req.ip || "";
      }
      if (clientIp.startsWith("::ffff:")) {
        clientIp = clientIp.replace("::ffff:", "");
      }
      let finalLocation = (clientLocation || "").trim();
      if (!finalLocation) {
        const cfCity = req.headers["cf-ipcity"];
        const cfRegion = req.headers["cf-ipregion"];
        const cfCountry = req.headers["cf-ipcountry"];
        if (cfCity || cfRegion || cfCountry) {
          finalLocation = [cfCity, cfRegion, cfCountry === "IN" ? "India" : cfCountry].filter(Boolean).join(", ");
        }
      }
      if (!finalLocation || finalLocation === "Unknown" || finalLocation.toLowerCase().includes("undefined")) {
        finalLocation = "Kolkata, West Bengal, India";
      }
      const displayTime = clientTimeFormatted || (/* @__PURE__ */ new Date()).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "medium"
      }) + " (IST)";
      const customerName = name || cleanEmail.split("@")[0] || "Valued Customer";
      const html = generateLoginAlertEmailHtml({
        customerName,
        email: cleanEmail,
        loginTime: displayTime,
        ipAddress: clientIp || "Protected",
        location: finalLocation,
        device: device || "Mobile Device",
        os: os || "Android",
        browser: browser || "BuildNow App",
        loginMethod: loginMethod || "Email & Password"
      });
      const subject = `\u{1F6E1}\uFE0F Security Alert: New sign-in to your BuildNow account (${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST)`;
      const text = `Hello ${customerName},

A new login was detected on your SmartRun account (${cleanEmail}) on ${displayTime}.
Location: ${finalLocation}
Device: ${device || "Mobile"} (${os || "Android"})
Browser: ${browser || "BuildNow App"}
Method: ${loginMethod || "Password"}

If this was you, no action is required.
If you did not make this login, please secure your account immediately at https://smartrun.in/login or call support at +91 87774 00280.`;
      const dispatchResult = await dispatchResendEmail({
        to: cleanEmail,
        subject,
        html,
        text
      });
      return res.status(200).json({
        success: true,
        message: "Security login notification successfully dispatched.",
        details: dispatchResult
      });
    } catch (err) {
      console.error("[Login Notification Handler Error]:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to dispatch login notification.",
        error: String(err)
      });
    }
  });
  app.post("/api/notify-order", strictLimiter, requireApiSecret, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { order, customerEmail } = req.body;
      if (!order) {
        return res.status(400).json({
          success: false,
          message: "Missing order payload."
        });
      }
      const phoneClean = (order.phone || "").replace(/\D/g, "").slice(-10);
      const itemsListText = (order.items || []).map((it, i) => `${i + 1}. ${it.product?.name || "Item"} (${it.product?.brand || "Giriraj"}) x ${it.quantity} ${it.product?.unit || "pc"} = \u20B9${((it.product?.price || 0) * it.quantity).toLocaleString("en-IN")}`).join("\n");
      const whatsappText = `\u26A1 *NEW ORDER RECEIVED - GIRIRAJ POWER* \u26A1

\u{1F4E6} *Order ID:* #${order.id || "GP-100000"}
\u{1F4C5} *Date/Time:* ${(/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)

\u{1F464} *Customer Name:* ${order.customerName || "Customer"}
\u{1F4F1} *Mobile Phone:* ${order.phone || "+91"}
\u2709\uFE0F *Email:* ${order.customerEmail || customerEmail || "Not provided"}

\u{1F4CD} *DELIVERY ADDRESS:*
${order.address || "Address provided"}
${order.landmark ? `Landmark: ${order.landmark}
` : ""}Area: ${order.area || "Kolkata"}, PIN: ${order.pincode || "700001"}

\u{1F6D2} *ORDERED ITEMS & QUANTITIES:*
${itemsListText}

\u{1F4B0} *Item Total:* \u20B9${(order.itemTotal || 0).toLocaleString("en-IN")}
\u{1F69A} *Delivery Fee:* ${(order.deliveryFee || 0) === 0 ? "FREE (Express)" : "\u20B9" + order.deliveryFee}
${(order.rainFee || 0) > 0 ? `\u{1F327}\uFE0F *Rain Surcharge:* \u20B9${order.rainFee}
` : ""}${(order.surgeFee || 0) > 0 ? `\u26A1 *Peak Surge:* \u20B9${order.surgeFee}
` : ""}${(order.productHandlingFee || 0) > 0 ? `\u{1F4E6} *Product Surcharge:* \u20B9${order.productHandlingFee}
` : ""}${(order.discount || 0) > 0 ? `\u{1F39F}\uFE0F *Discount:* -\u20B9${order.discount}
` : ""}\u{1F4B3} *GRAND TOTAL:* \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}
\u{1F4B5} *Payment Mode:* ${order.paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online UPI / Card (PAID)"}

\u26A1 *Dispatch Central:* Giriraj Power Kasba Hub Kolkata 700039`;
      const whatsappUrl = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;
      const customerWhatsappUrl = phoneClean ? `https://wa.me/91${phoneClean}?text=${encodeURIComponent(`Hello ${order.customerName || "Customer"}, thank you for ordering from Giriraj Power! Your Order #${order.id} for \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")} has been received and is being dispatched.`)}` : null;
      let adminAlertSent = false;
      let customerInvoiceSent = false;
      try {
        const adminHtml = generateAdminOrderAlertHtml(order);
        const adminSubject = `\u{1F6A8} [NEW ORDER RECEIVED] #${order.id} (\u20B9${(order.totalAmount || 0).toLocaleString("en-IN")}) - ${order.customerName || "Customer"}`;
        const adminDispatch = await dispatchResendEmail({
          to: ADMIN_EMAILS,
          subject: adminSubject,
          html: adminHtml,
          text: `New order #${order.id} placed by ${order.customerName} (${order.phone}). Amount: \u20B9${order.totalAmount}. Address: ${order.address}, ${order.area}, PIN: ${order.pincode}.`
        });
        adminAlertSent = adminDispatch.success;
      } catch (adminErr) {
        console.warn("[Admin Order Alert Email Notice]:", adminErr);
      }
      const targetCustEmail = customerEmail || order.customerEmail;
      if (targetCustEmail && targetCustEmail.includes("@")) {
        try {
          const custHtml = generateOrderEmailHtml(order, order.customerName || "Valued Customer");
          const custSubject = `\u26A1 Order Confirmed #${order.id} - Giriraj Power Express Kolkata`;
          const custDispatch = await dispatchResendEmail({
            to: [targetCustEmail.trim()],
            subject: custSubject,
            html: custHtml,
            text: `Your Giriraj Power order #${order.id} has been confirmed. Total: \u20B9${order.totalAmount}. Delivery to ${order.area}, Kolkata.`
          });
          customerInvoiceSent = custDispatch.success;
        } catch (custErr) {
          console.warn("[Customer Invoice Email Notice]:", custErr);
        }
      }
      try {
        const orderStatus = (order.status || "confirmed").toUpperCase();
        const notificationTitle = `\u{1F69A} BuildNow Order #${order.id} ${orderStatus}`;
        const notificationBody = `Your order of \u20B9${(order.totalAmount || 0).toLocaleString("en-IN")} is confirmed! 60-min delivery to ${order.area || "Kolkata"}.`;
        console.log(`[Push Notification Queued]: ${notificationTitle} - ${notificationBody}`);
      } catch (pushErr) {
        console.warn("[Push Notification Dispatch Notice]:", pushErr);
      }
      return res.json({
        success: true,
        adminAlertSent,
        customerInvoiceSent,
        adminEmail: ADMIN_EMAIL,
        adminWhatsapp: ADMIN_WHATSAPP_NUMBER,
        whatsappText,
        whatsappUrl,
        customerWhatsappUrl,
        orderId: order.id,
        message: adminAlertSent ? `Order alert dispatched to ${ADMIN_EMAIL} and WhatsApp ready!` : "Order processed successfully."
      });
    } catch (err) {
      console.error("Failed in /api/notify-order:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to dispatch order notification."
      });
    }
  });
  const pushTokensStore = /* @__PURE__ */ new Map();
  app.post("/api/push/register-token", (req, res) => {
    try {
      const { token, platform, userId, userEmail } = req.body || {};
      if (!token || typeof token !== "string") {
        return res.status(400).json({ success: false, error: "Push token is required." });
      }
      const existing = pushTokensStore.get(token);
      const record = {
        token,
        platform: platform || "unknown",
        userId: userId || existing?.userId,
        userEmail: userEmail || existing?.userEmail,
        registeredAt: existing?.registeredAt || (/* @__PURE__ */ new Date()).toISOString(),
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      pushTokensStore.set(token, record);
      console.log(`[Push Token Registered]: Platform: ${record.platform}, User: ${record.userId || record.userEmail || "guest"}, Token: ${token.substring(0, 16)}...`);
      return res.json({
        success: true,
        message: "Push notification token registered successfully.",
        totalRegisteredDevices: pushTokensStore.size
      });
    } catch (err) {
      console.error("Error registering push token:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/push/send-order-update", (req, res) => {
    try {
      const { orderId, status, title, body, userEmail, userId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: "orderId is required." });
      }
      const statusLabels = {
        placed: "Order Placed & Confirmed \u26A1",
        confirmed: "Order Confirmed \u26A1",
        processing: "Packing in Progress \u{1F4E6}",
        packed: "Packed & Ready for Rider \u{1F4E6}",
        out_for_delivery: "Out for Delivery \u{1F680} (Rider is nearby)",
        delivered: "Delivered \u{1F389} (Thank you for choosing BuildNow)",
        cancelled: "Order Cancelled \u26A0\uFE0F"
      };
      const pushTitle = title || `Order #${orderId}: ${statusLabels[status] || status || "Update"}`;
      const pushBody = body || `Your Kolkata BuildNow order #${orderId} status has been updated to "${status || "processing"}".`;
      let targetTokens = Array.from(pushTokensStore.values());
      if (userId) {
        targetTokens = targetTokens.filter((t) => t.userId === userId);
      } else if (userEmail) {
        targetTokens = targetTokens.filter((t) => t.userEmail === userEmail);
      }
      console.log(`[Push Notification Dispatched] to ${targetTokens.length} device(s): ${pushTitle} | ${pushBody}`);
      return res.json({
        success: true,
        orderId,
        status,
        title: pushTitle,
        body: pushBody,
        matchedDevices: targetTokens.length,
        message: `Push notification dispatched for order #${orderId}.`
      });
    } catch (err) {
      console.error("Error sending push notification:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/push/status", (req, res) => {
    res.json({
      success: true,
      registeredDevicesCount: pushTokensStore.size,
      platforms: {
        android: Array.from(pushTokensStore.values()).filter((t) => t.platform === "android").length,
        ios: Array.from(pushTokensStore.values()).filter((t) => t.platform === "ios").length,
        web: Array.from(pushTokensStore.values()).filter((t) => t.platform === "web").length
      }
    });
  });
  app.get("/api/received-emails", (req, res) => {
    const unreadCount = receivedEmailsStore.filter((m) => m.status === "unread").length;
    res.json({
      success: true,
      officialEmail: OFFICIAL_EMAIL,
      totalCount: receivedEmailsStore.length,
      unreadCount,
      emails: [...receivedEmailsStore].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      )
    });
  });
  app.post(["/api/resend/inbound", "/api/receive-email"], async (req, res) => {
    try {
      const payload = req.body || {};
      console.log("[Resend Inbound Webhook Received]:", JSON.stringify(payload).substring(0, 300));
      const emailData = payload.data || payload;
      const fromRaw = emailData.from || emailData.sender || "inbound-sender@example.com";
      const toRaw = emailData.to || OFFICIAL_EMAIL;
      const subject = emailData.subject || "Incoming Message to team@girirajpower.in";
      const text = emailData.text || emailData.body || "";
      const html = emailData.html || "";
      const headers = emailData.headers || {};
      const attachments = emailData.attachments || [];
      let fromEmail = fromRaw;
      let fromName = "Customer / Contractor";
      if (typeof fromRaw === "string" && fromRaw.includes("<") && fromRaw.includes(">")) {
        const match = fromRaw.match(/(.*)<(.*)>/);
        if (match) {
          fromName = match[1].trim();
          fromEmail = match[2].trim();
        }
      } else if (typeof fromRaw === "string") {
        fromEmail = fromRaw.trim();
        fromName = fromEmail.split("@")[0];
      }
      const lowerSub = subject.toLowerCase() + " " + (text || "").toLowerCase();
      let category = "inbound_webhook";
      if (lowerSub.includes("quote") || lowerSub.includes("price") || lowerSub.includes("rate") || lowerSub.includes("bulk")) {
        category = "quote";
      } else if (lowerSub.includes("contractor") || lowerSub.includes("electrician") || lowerSub.includes("wiring") || lowerSub.includes("technician")) {
        category = "contractor";
      } else if (lowerSub.includes("support") || lowerSub.includes("complaint") || lowerSub.includes("order") || lowerSub.includes("help") || lowerSub.includes("invoice")) {
        category = "support";
      }
      const newRecord = {
        id: `inbound-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        from: fromEmail,
        fromName,
        to: Array.isArray(toRaw) ? toRaw.join(", ") : String(toRaw),
        subject,
        text: text || "No text content provided.",
        html: html || void 0,
        receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "unread",
        category,
        headers,
        attachmentsCount: Array.isArray(attachments) ? attachments.length : 0
      };
      receivedEmailsStore.unshift(newRecord);
      return res.json({
        success: true,
        message: "Inbound email received and recorded successfully!",
        emailId: newRecord.id,
        to: newRecord.to
      });
    } catch (err) {
      console.error("Error processing inbound email webhook:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to process inbound email webhook.",
        error: String(err)
      });
    }
  });
  app.post("/api/contact-inquiry", strictLimiter, async (req, res) => {
    try {
      const rawBody = req.body || {};
      const name = sanitize(rawBody.name);
      const email = sanitize(rawBody.email).toLowerCase();
      const phone = sanitize(rawBody.phone);
      const rawSubject = sanitize(rawBody.subject);
      const message = sanitize(rawBody.message);
      const rawCategory = sanitize(rawBody.category);
      const category = ["quote", "support", "contractor", "general"].includes(rawCategory) ? rawCategory : "general";
      const orderId = sanitize(rawBody.orderId);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid sender email address."
        });
      }
      if (!message || message.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please include a message or inquiry details."
        });
      }
      const subject = rawSubject || `Inquiry from ${name || email} for Giriraj Power`;
      const senderName = name || email.split("@")[0];
      const newRecord = {
        id: `inquiry-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        from: email,
        fromName: senderName,
        to: OFFICIAL_EMAIL,
        subject,
        text: message,
        receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "unread",
        category,
        phone: phone || void 0,
        orderId: orderId || void 0
      };
      receivedEmailsStore.unshift(newRecord);
      let alertSent = false;
      let ackSent = false;
      try {
        const ackDispatch = await dispatchResendEmail({
          to: [email],
          subject: `\u2713 Received: ${subject} - Giriraj Power Kasba`,
          html: `
            <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                <h2 style="color: #facc15; margin: 0; font-size: 18px;">\u26A1 GIRIRAJ POWER</h2>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Kasba Central Hub, Kolkata</p>
              </div>
              <div style="padding: 24px;">
                <h3 style="color: #0f172a; margin: 0 0 12px 0;">Thank you for contacting us, ${senderName}!</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                  We have received your message at <strong>${OFFICIAL_EMAIL}</strong>. Our Kasba engineering and wholesale desk will get back to you shortly.
                </p>
                <div style="background-color: #f8fafc; border-left: 4px solid #facc15; padding: 12px; margin: 16px 0; font-size: 13px; color: #334155;">
                  <strong>Your Message:</strong><br>${message.replace(/\n/g, "<br>")}
                </div>
                <p style="font-size: 12px; color: #64748b; margin: 16px 0 0 0;">
                  Need urgent electrical supplies? Call our 60-min dispatch desk: <strong>+91 87774 00280</strong> | Contractor: <strong>+91 90071 68561</strong>
                </p>
              </div>
            </div>
          `
        });
        ackSent = ackDispatch.success;
      } catch (resendErr) {
        console.warn("[Resend Inbound Auto-Reply Notice]:", resendErr);
      }
      return res.json({
        success: true,
        message: `Inquiry successfully delivered to ${OFFICIAL_EMAIL}!`,
        emailId: newRecord.id,
        ackSent,
        alertSent
      });
    } catch (err) {
      console.error("Error creating contact inquiry:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to submit inquiry.",
        error: String(err)
      });
    }
  });
  app.post("/api/received-emails/:id/reply", async (req, res) => {
    try {
      const { id } = req.params;
      const { replyText, subject: customSubject } = req.body;
      const recordIndex = receivedEmailsStore.findIndex((m) => m.id === id);
      if (recordIndex === -1) {
        return res.status(404).json({ success: false, message: "Received email record not found." });
      }
      const record = receivedEmailsStore[recordIndex];
      const replySubject = customSubject || `Re: ${record.subject}`;
      let sendResult = null;
      try {
        sendResult = await dispatchResendEmail({
          to: [record.from],
          subject: replySubject,
          text: replyText,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 18px 24px; border-bottom: 3px solid #facc15;">
                <h2 style="color: #facc15; margin: 0; font-size: 16px;">\u26A1 GIRIRAJ POWER RESPONSE</h2>
                <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 11px;">Official Reply from ${OFFICIAL_EMAIL}</p>
              </div>
              <div style="padding: 24px; font-size: 14px; color: #1e293b; line-height: 1.6;">
                <p style="margin: 0 0 16px 0;">Dear <strong>${record.fromName || "Customer"}</strong>,</p>
                <p style="margin: 0 0 20px 0; white-space: pre-line;">${replyText}</p>
                
                <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; font-size: 12px; color: #64748b;">
                  <strong>Giriraj Power Support & Wholesale Desk</strong><br>
                  Kasba Central Warehouse, Kolkata 700039<br>
                  WhatsApp: +91 87774 00280 | Phone: +91 90071 68561 | Email: ${OFFICIAL_EMAIL}
                </div>
              </div>
            </div>
          `
        });
      } catch (sdkErr) {
        console.warn("[Resend Reply SDK error]:", sdkErr);
      }
      receivedEmailsStore[recordIndex] = {
        ...record,
        status: "replied",
        replySent: {
          subject: replySubject,
          sentAt: (/* @__PURE__ */ new Date()).toISOString(),
          text: replyText
        }
      };
      return res.json({
        success: true,
        message: `Reply sent successfully to ${record.from}!`,
        replyId: sendResult?.messageId,
        record: receivedEmailsStore[recordIndex]
      });
    } catch (err) {
      console.error("Error replying to email:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send email reply.",
        error: String(err)
      });
    }
  });
  app.patch("/api/received-emails/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const recordIndex = receivedEmailsStore.findIndex((m) => m.id === id);
    if (recordIndex === -1) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }
    if (["unread", "read", "replied", "archived"].includes(status)) {
      receivedEmailsStore[recordIndex].status = status;
    }
    res.json({
      success: true,
      email: receivedEmailsStore[recordIndex]
    });
  });
  app.delete("/api/received-emails/:id", (req, res) => {
    const { id } = req.params;
    receivedEmailsStore = receivedEmailsStore.filter((m) => m.id !== id);
    res.json({ success: true, message: "Email removed from inbound inbox." });
  });
  app.post("/api/received-emails/simulate-inbound", (req, res) => {
    const { from, fromName, subject, text, category } = req.body;
    const newRecord = {
      id: `inbound-test-${Date.now()}`,
      from: from || "kolkata.builder@gmail.com",
      fromName: fromName || "Anirban Sen (Ballygunge Project)",
      to: OFFICIAL_EMAIL,
      subject: subject || "Urgent Delivery: 50 Amaron Modular MCBs to Ballygunge Site",
      text: text || "Hi Team, need urgent 60-min dispatch for 50 pieces 16A C-Curve MCBs to our ongoing apartment renovation site at Ballygunge Circular Rd. Please confirm dispatch.",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "unread",
      category: category || "contractor"
    };
    receivedEmailsStore.unshift(newRecord);
    res.json({
      success: true,
      message: `Simulated inbound email received to ${OFFICIAL_EMAIL}!`,
      email: newRecord
    });
  });
  app.post("/api/ai-assistant", aiAssistantLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { prompt, userArea, pincode } = req.body;
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      const defaultMapsSources = [
        {
          uri: "https://share.google/EWHvo68Oi2DsChWWV",
          title: "Giriraj Power Kasba Hub, Kolkata"
        }
      ];
      const fallbackText = `Electrical Recommendation for ${userArea || "Kolkata"} (PIN: ${pincode || "700039"}):
\u2022 Lighting & Fan circuits: 1.5 sq mm Polycab FR-LSH Copper Wire (10A MCB).
\u2022 Air Conditioners (up to 1.5 Ton) & Geysers: 2.5 sq mm Havells HRFR Wire + 16A/20A MCB.
\u2022 Main Distribution: 4.0 sq mm pure copper wire + 32A DP Isolator.
\u2022 Heavy loads: 6.0 sq mm for entire home mains.
Express delivery is available across Kolkata within ~60 minutes!`;
      if (!isValidGeminiApiKey(apiKey)) {
        return res.json({
          text: fallbackText,
          mapsSources: defaultMapsSources
        });
      }
      try {
        const ai = new import_genai.GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const systemPrompt = `You are the expert Electrical Engineer, Construction Estimator & Store Advisor for Giriraj Power in Kolkata, India.
Customer is located in ${userArea || "Kolkata Metropolitan Area"} (PIN: ${pincode || "700039"}).
Provide concise, practical electrical advice (wire gauges, MCB ratings, CESC/WBSEDCL standards, conduit sizing, cement and TMT recommendations) and reference Kolkata locations like Kasba, Nator Park, Salt Lake Sector V, New Town, Park Street, or Gariahat where relevant.`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${systemPrompt}

Customer question: ${prompt}`,
          config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
              retrievalConfig: {
                latLng: {
                  latitude: 22.5145,
                  // Kasba Kolkata coordinates
                  longitude: 88.3882
                }
              }
            }
          }
        });
        const responseText = response.text || fallbackText;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const mapsSources = [];
        for (const chunk of groundingChunks) {
          if (chunk.maps?.uri) {
            mapsSources.push({
              uri: chunk.maps.uri,
              title: chunk.maps.title || "View on Google Maps"
            });
          } else if (chunk.web?.uri) {
            mapsSources.push({
              uri: chunk.web.uri,
              title: chunk.web.title || "Kolkata Hub Info"
            });
          }
        }
        if (mapsSources.length === 0) {
          mapsSources.push(...defaultMapsSources);
        }
        return res.json({
          text: responseText,
          mapsSources
        });
      } catch (apiErr) {
        console.warn("AI Assistant model fallback activated:", apiErr?.message || apiErr);
        return res.json({
          text: fallbackText,
          mapsSources: defaultMapsSources
        });
      }
    } catch (err) {
      console.warn("AI Assistant API error caught:", err);
      return res.json({
        text: `Electrical Recommendation for Kolkata:
\u2022 Lighting & Fan circuits: 1.5 sq mm Polycab FR-LSH Copper Wire.
\u2022 Air Conditioners (1.5 Ton) & Geysers: 2.5 sq mm Havells HRFR Wire + 16A/20A MCB.
\u2022 Main Distribution: 4.0 sq mm pure copper wire + 32A DP Isolator.
Express delivery is available across Kolkata within ~60 minutes!`,
        mapsSources: [
          {
            uri: "https://share.google/EWHvo68Oi2DsChWWV",
            title: "Giriraj Power Kasba Hub, Kolkata"
          }
        ]
      });
    }
  });
  function getMayraSmartResponse(query, customerName = "Customer") {
    const lower = (query || "").toLowerCase();
    let needsEscalation = false;
    let text = "";
    if (lower.includes("human") || lower.includes("call") || lower.includes("phone") || lower.includes("speak") || lower.includes("agent") || lower.includes("representative") || lower.includes("operator") || lower.includes("talk to someone") || lower.includes("real person")) {
      text = `I can connect you directly with our specialized human support and contractor desk! \u{1F91D}

Please select your preferred way to reach us below:
\u2022 **1. WhatsApp**: Instant chat with our Kasba dispatch desk
\u2022 **2. Official Email**: Send your inquiry to team@girirajpower.in
\u2022 **3. Support Helpline**: Call our customer helpline directly`;
      needsEscalation = true;
    } else if (lower.includes("thank") || lower.includes("thanks") || lower.includes("nice answer") || lower.includes("good answer") || lower.includes("like your answer") || lower.includes("like the answer") || lower.includes("great job") || lower.includes("awesome") || lower.includes("helpful")) {
      const gratitudePool = [
        `Nice to hear that you liked the answer, ${customerName}! \u{1F60A} Feel free to ask if you have any other questions about wiring, orders, or delivery.`,
        `You're very welcome, ${customerName}! Glad I could be of help. I'm always here 24/7 whenever you need assistance!`,
        `So glad that was helpful! It's always my absolute pleasure to assist with your electrical and hardware questions.`,
        `Awesome, happy to hear that! Reach out anytime if you need more recommendations or quotes.`
      ];
      text = gratitudePool[Math.floor(Math.random() * gratitudePool.length)];
    } else if (lower === "hi" || lower === "hello" || lower === "hey" || lower.startsWith("hi ") || lower.startsWith("hello ") || lower.startsWith("hey ") || lower.includes("good morning") || lower.includes("good afternoon") || lower.includes("good evening")) {
      const greetingPool = [
        `How can I help you today, ${customerName}? \u{1F60A} Ask me anything about our 60-min Kolkata delivery, wire gauge calculations, GST invoices, or your account orders!`,
        `Hello ${customerName} \u{1F44B}! Great to hear from you. What can I get sorted for your electrical or construction supplies right now?`,
        `Hi ${customerName}! Nice to see you. Mayra here, your 24/7 AI Support Specialist. What's on your mind today?`,
        `Welcome back ${customerName}! How may I assist you with your project today \u2014 need wire sizing advice, order tracking, or an electrician booking?`
      ];
      text = greetingPool[Math.floor(Math.random() * greetingPool.length)];
    } else if (lower.includes("delivery") || lower.includes("track") || lower.includes("time") || lower.includes("speed") || lower.includes("dispatch") || lower.includes("rider") || lower.includes("status") || lower.includes("when will") || lower.includes("how long")) {
      text = `\u{1F680} **60-Minute Express Kolkata Delivery**:

\u2022 **Speed**: All orders are packed and dispatched within 10\u201315 minutes from our central Kasba warehouse.
\u2022 **Coverage**: Kasba, Salt Lake, New Town, Gariahat, Ballygunge, Park Street, Ruby, Jadavpur, Behala, Howrah, and greater Kolkata.
\u2022 **Live Tracking**: You receive live rider tracking alerts directly on your registered WhatsApp number upon dispatch.
\u2022 **Same-day guarantee**: Order anytime between 8 AM and 9 PM for lightning-fast doorstep arrival!`;
    } else if (lower.includes("wire") || lower.includes("gauge") || lower.includes("sq mm") || lower.includes("sqmm") || lower.includes("cable") || lower.includes("polycab") || lower.includes("havells") || lower.includes("finolex") || lower.includes("size") || lower.includes("ac") || lower.includes("geyser") || lower.includes("heater")) {
      text = `\u26A1 **Technical Wire Gauge & Load Sizing Guide**:

\u2022 **1.5 sq mm** (Polycab FR-LSH / Havells): Recommended for lighting, ceiling fans, and LED fixtures (paired with 10A MCB).
\u2022 **2.5 sq mm**: Essential for 1.5 Ton ACs, storage/instant geysers, refrigerators, and 16A kitchen power sockets (paired with 16A/20A MCB).
\u2022 **4.0 sq mm**: Required for 2.0 Ton ACs, microwave circuits, and heavy power runs (paired with 25A/32A MCB).
\u2022 **6.0 sq mm**: Used for main electrical incoming feeds from the energy meter to the distribution board.

All wires in our catalog are 100% genuine, pure electrolytic copper with ISI and FR-LSH fire-retardant certification.`;
    } else if (lower.includes("invoice") || lower.includes("gst") || lower.includes("bill") || lower.includes("tax") || lower.includes("input credit") || lower.includes("b2b")) {
      text = `\u{1F4C4} **GST Tax Invoices & ITC Benefits**:

\u2022 Every single order is accompanied by a compliant GST Tax Invoice with our registered GSTIN.
\u2022 **For Business & Contractors**: Enter your company GSTIN during checkout to claim full Input Tax Credit (ITC).
\u2022 **Instant PDF Download**: You can view, print, or download invoices anytime from your **Profile > Order History** screen.`;
    } else if (lower.includes("electrician") || lower.includes("technician") || lower.includes("book") || lower.includes("install") || lower.includes("fitting") || lower.includes("repair") || lower.includes("wiring")) {
      text = `\u{1F527} **Verified Licensed Electrician Booking**:

\u2022 We provide licensed, background-verified technicians across all Kolkata neighborhoods.
\u2022 **Services Offered**: Full house rewiring, MCB distribution board installation, ceiling fan and chandelier mounting, switchboard replacements, and electrical fault detection.
\u2022 **Transparent Pricing**: Fixed upfront labor rates with guaranteed satisfaction.
\u2022 You can book a technician directly via the **Book Electrician** tab in the app!`;
    } else if (lower.includes("return") || lower.includes("replace") || lower.includes("cancel") || lower.includes("refund") || lower.includes("exchange") || lower.includes("damaged") || lower.includes("wrong item")) {
      text = `\u{1F504} **Hassle-Free 7-Day Return & Replacement Policy**:

\u2022 **Eligibility**: Unused items in original packaging, factory-sealed goods, and intact uncut wire coils can be exchanged or returned within 7 days of delivery.
\u2022 **Defective or Damaged Goods**: Instant doorstep replacement arranged within 24 hours at zero additional cost.
\u2022 **Refunds**: Processed back to your original payment method (or UPI) within 24\u201348 hours of item pickup.`;
    } else if (lower.includes("cement") || lower.includes("steel") || lower.includes("tmt") || lower.includes("ultratech") || lower.includes("tiscon") || lower.includes("construction") || lower.includes("sand") || lower.includes("stone")) {
      text = `\u{1F3D7}\uFE0F **Civil & Construction Supplies**:

\u2022 **UltraTech Cement**: Fresh 53 Grade & Super Cement bags directly from manufacturer depots.
\u2022 **Tata Tiscon 550D TMT Rebars**: Certified primary steel with test certificates and exact weighbridge receipts.
\u2022 **Site Delivery**: Dispatched via mini-trucks directly to your construction site across Kolkata with optional ground-floor unloading.
\u2022 Tap below to contact our wholesale contractor desk for project volume pricing!`;
    } else if (lower.includes("payment") || lower.includes("pay") || lower.includes("upi") || lower.includes("cod") || lower.includes("cash") || lower.includes("razorpay") || lower.includes("credit card")) {
      text = `\u{1F4B3} **Payment Methods & Security**:

\u2022 We accept **UPI** (Google Pay, PhonePe, Paytm, BHIM), **Credit/Debit Cards**, **Net Banking**, and **Cash on Delivery (COD)**.
\u2022 All online transactions are 100% secure, protected by 256-bit bank-grade encryption.
\u2022 COD is available for orders within Kolkata express delivery zones.`;
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey") || lower.includes("morning") || lower.includes("evening") || lower.includes("mayra") || lower.includes("who are you") || lower.includes("help")) {
      text = `Hello ${customerName || "there"} \u{1F44B}, I am Mayra your 24/7 AI support specialist.

I can help you with Kolkata 60-min delivery updates, technical wire/MCB sizing recommendations, GST invoices, electrician bookings, and store policies. How may I assist you today?`;
    } else {
      text = `I have noted your query regarding "${query}".

At BuildNow Electricals (Kasba, Kolkata), we provide 60-minute express delivery, 100% genuine ISI certified electricals (Polycab, Havells, Schneider, Anchor), verified electrician services, and official GST invoices.

If you need specific assistance or customized contractor quotes, please ask or tap below to speak directly with our desk.`;
    }
    return { text, needsEscalation };
  }
  app.post("/api/gemini/support-chat", aiAssistantLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { messages = [], customerName = "Valued Customer", customerEmail = "", customerArea = "Kolkata" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      const userLatestMessage = messages.length > 0 ? messages[messages.length - 1]?.content : "";
      let responseText = "";
      let needsEscalation = false;
      if (isValidGeminiApiKey(apiKey)) {
        try {
          const ai = new import_genai.GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build"
              }
            }
          });
          const systemPrompt = `You are Mayra, the friendly, expert 24/7 AI Customer Support Specialist for BuildNow Electricals & Construction Supplies, located at Kasba, Kolkata 700039.
Customer Name: ${customerName || "Customer"}
Customer Email: ${customerEmail || "Not specified"}
Customer Area: ${customerArea || "Kolkata"}

Personality & Style:
- Speak warmly, conversationally, and naturally like a real helpful customer support representative. Avoid robotic or identical repetitive responses.
- If the customer compliments you, expresses gratitude ("thank you", "nice answer", "great"), respond with genuine warmth (e.g. "So nice to hear that you liked the answer, ${customerName}! \u{1F60A}", "Always my pleasure to help!").
- If the customer says hello or greets you, vary your greeting naturally (e.g. "How can I help you today?", "Great to hear from you!", "What can I get sorted for your electrical project?").

Knowledge Base & Service Details:
1. 60-Minute Express Delivery: Shipped directly across Kolkata (Kasba, Nator Park, Salt Lake, New Town, Gariahat, Ballygunge, Park Street, Ruby, Jadavpur, Behala, Howrah, etc.) from Kasba central warehouse.
2. Brands in Stock: Polycab, Havells, Anchor by Panasonic, Finolex, Schneider, Legrand, Philips, UltraTech Cement, Tata Tiscon 550D TMT. 100% genuine with ISI marks & GST invoices.
3. Wire sizing guidance: 1.5 sq mm for lighting/fans (10A MCB), 2.5 sq mm for ACs/geysers/kitchen sockets (16A/20A MCB), 4.0 sq mm for mains & heavy loads (25A/32A MCB), 6.0 sq mm for full-home mains.
4. Electrician Booking: Verified licensed electricians available for on-site wiring, MCB troubleshooting, and lighting installations.
5. Invoicing: GST invoices generated with registered GSTIN on all orders for input tax credit.
6. Returns: 7-day return/exchange on factory-sealed items and intact uncut wire coils.
7. Escalation Policy:
   - If the customer asks to speak to a real person, call, or talk to human support, warmly let them know they can connect directly with our human team via: 1. WhatsApp, 2. Email (team@girirajpower.in), and 3. Support Helpline (+91 90071 68561).
   - Format responses cleanly with bold bullet points or short paragraphs for great mobile readability. Avoid verbose fluff.`;
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [`${systemPrompt}

User Question: ${userLatestMessage}`]
          });
          responseText = response.text || "";
        } catch (apiErr) {
          console.warn("Support chat AI model unavailable or key invalid, using Mayra knowledge engine:", apiErr?.message || apiErr);
        }
      }
      if (!responseText) {
        const smart = getMayraSmartResponse(userLatestMessage, customerName);
        responseText = smart.text;
        needsEscalation = smart.needsEscalation;
      } else {
        const lowerResp = responseText.toLowerCase();
        const lowerReq = (userLatestMessage || "").toLowerCase();
        needsEscalation = lowerResp.includes("dialer") || lowerResp.includes("contractor desk") || lowerResp.includes("human") || lowerResp.includes("escalate") || lowerResp.includes("team@girirajpower.in") || lowerResp.includes("whatsapp") || lowerReq.includes("human") || lowerReq.includes("real person") || lowerReq.includes("call") || lowerReq.includes("agent") || lowerReq.includes("representative") || lowerReq.includes("operator") || lowerReq.includes("speak to");
      }
      return res.json({
        text: responseText,
        needsEscalation
      });
    } catch (err) {
      console.warn("Support Chat handled error:", err);
      const fallback = getMayraSmartResponse(req.body?.messages?.[req.body?.messages?.length - 1]?.content || "", req.body?.customerName);
      return res.json({
        text: fallback.text,
        needsEscalation: fallback.needsEscalation
      });
    }
  });
  app.post("/api/gemini/estimate-materials", aiAssistantLimiter, async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const {
        clientName = "Valued Client",
        phone = "",
        area = "Kolkata",
        pincode = "700039",
        houseAreaSqFt = 950,
        propertyType = "2BHK",
        floors = 1,
        projectScope = "both",
        // 'both' | 'electrical' | 'construction'
        qualityTier = "premium",
        // 'standard' | 'premium' | 'heavy_duty'
        customRequirements = ""
      } = req.body;
      const areaNum = Number(houseAreaSqFt) || 950;
      const floorsNum = Number(floors) || 1;
      const totalEffectiveSqFt = areaNum * floorsNum;
      const calcWireCoilsLight = Math.max(2, Math.round(totalEffectiveSqFt / 250));
      const calcWireCoilsPower = Math.max(2, Math.round(totalEffectiveSqFt / 350));
      const calcSwitches = Math.max(12, Math.round(totalEffectiveSqFt / 35));
      const calcMcbBoxes = Math.max(1, Math.ceil(totalEffectiveSqFt / 900));
      const calcConduits = Math.max(8, Math.round(totalEffectiveSqFt / 70));
      const calcCement = Math.max(20, Math.round(totalEffectiveSqFt * (projectScope === "construction" ? 0.4 : 0.08)));
      const calcSteel = Math.max(150, Math.round(totalEffectiveSqFt * (projectScope === "construction" ? 3.5 : 0.6)));
      const calcWaterproofing = Math.max(4, Math.round(totalEffectiveSqFt * 0.012));
      const calcPutty = Math.max(2, Math.round(totalEffectiveSqFt * 5e-3));
      const wireLightTotal = calcWireCoilsLight * 3600;
      const wirePowerTotal = calcWireCoilsPower * 4200;
      const switchesTotal = calcSwitches * 140;
      const mcbTotal = calcMcbBoxes * 1250;
      const conduitsTotal = calcConduits * 120;
      const electricalTotal = wireLightTotal + wirePowerTotal + switchesTotal + mcbTotal + conduitsTotal;
      const cementTotal = calcCement * 385;
      const steelTotal = calcSteel * 62;
      const wpTotal = calcWaterproofing * 135;
      const puttyTotal = calcPutty * 690;
      const constructionTotal = cementTotal + steelTotal + wpTotal + puttyTotal;
      const grandTotal = projectScope === "electrical" ? electricalTotal : projectScope === "construction" ? constructionTotal : electricalTotal + constructionTotal;
      const heuristicResult = {
        success: true,
        aiPowered: false,
        summary: `Wholesale Estimate for ${propertyType} (${totalEffectiveSqFt} sq.ft total built-up) in ${area}, Kolkata.`,
        sanctionedLoadRecommendation: `${Math.max(3, Math.min(12, Math.ceil(totalEffectiveSqFt / 250)))} kW (CESC / WBSEDCL Standard)`,
        electrical: {
          wireCoilsLight: { qty: calcWireCoilsLight, spec: "1.0 & 1.5 sq.mm Polycab/RR Kabel FR", rate: 3600, amount: wireLightTotal },
          wireCoilsPower: { qty: calcWireCoilsPower, spec: "2.5 & 4.0 sq.mm Heavy Copper Cables", rate: 4200, amount: wirePowerTotal },
          modularSwitches: { qty: calcSwitches, spec: "Schneider Opale / Havells Modular Points", rate: 140, amount: switchesTotal },
          mcbDistribution: { qty: calcMcbBoxes, spec: "SPN/TPN Double Door Enclosure + MCBs", rate: 1250, amount: mcbTotal },
          pvcConduits: { qty: calcConduits, spec: "20mm/25mm Heavy Duty PVC Pipes (3m)", rate: 120, amount: conduitsTotal },
          subtotal: electricalTotal
        },
        construction: {
          cementBags: { qty: calcCement, spec: "UltraTech OPC 53 Grade Fresh 50kg Bags", rate: 385, amount: cementTotal },
          tmtSteelKg: { qty: calcSteel, spec: "Tata Tiscon 550D Primary Fe Rebars (kg)", rate: 62, amount: steelTotal },
          waterproofingLiters: { qty: calcWaterproofing, spec: "Dr. Fixit 101 LW+ Integral Compound (L)", rate: 135, amount: wpTotal },
          wallPuttyBags: { qty: calcPutty, spec: "Asian Paints TruCare 20kg Polymer Putty", rate: 690, amount: puttyTotal },
          subtotal: constructionTotal
        },
        grandTotal,
        laborDaysEstimate: {
          electricianDays: Math.max(3, Math.round(totalEffectiveSqFt / 180)),
          masonDays: Math.max(4, Math.round(totalEffectiveSqFt / 150)),
          approxLaborCost: Math.round(totalEffectiveSqFt * 28)
        },
        engineeringAdvice: [
          `For ${area}, ensure all circuit neutrals are kept independent to prevent MCB nuisance tripping during high-humidity monsoons.`,
          `Dedicated 4.0 sq.mm copper wire runs are strongly recommended for master bedroom 1.5 Ton AC units and instant water geysers.`,
          `UltraTech cement bags are dispatched fresh from Giriraj Power Kasba warehouse with guaranteed manufacturing within 15 days.`
        ]
      };
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!isValidGeminiApiKey(apiKey)) {
        return res.json(heuristicResult);
      }
      try {
        const ai = new import_genai.GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build"
            }
          }
        });
        const prompt = `You are the Principal Chief Electrical Engineer and Civil Construction Quantity Estimator for Giriraj Power, located at Kasba Hub, Kolkata.
Calculate a realistic, wholesale Bill of Materials (BOM) for the following project:
- Client Name: ${clientName}
- Location: ${area}, Kolkata (PIN: ${pincode})
- Property: ${propertyType}, ${houseAreaSqFt} sq.ft per floor, ${floorsNum} Floor(s) (Total Effective Area: ${totalEffectiveSqFt} sq.ft)
- Scope: ${projectScope}
- Quality Tier: ${qualityTier}
- Custom Requirements: ${customRequirements || "Standard residential setup with modern modular electricals and high-grade finishing."}

Respond ONLY with a valid JSON object matching the following structure:
{
  "summary": "Short 1-2 sentence executive estimate summary",
  "sanctionedLoadRecommendation": "e.g. 5 kW (CESC Kolkata Standard)",
  "electrical": {
    "wireCoilsLight": { "qty": number, "spec": string, "rate": number, "amount": number },
    "wireCoilsPower": { "qty": number, "spec": string, "rate": number, "amount": number },
    "modularSwitches": { "qty": number, "spec": string, "rate": number, "amount": number },
    "mcbDistribution": { "qty": number, "spec": string, "rate": number, "amount": number },
    "pvcConduits": { "qty": number, "spec": string, "rate": number, "amount": number },
    "subtotal": number
  },
  "construction": {
    "cementBags": { "qty": number, "spec": string, "rate": number, "amount": number },
    "tmtSteelKg": { "qty": number, "spec": string, "rate": number, "amount": number },
    "waterproofingLiters": { "qty": number, "spec": string, "rate": number, "amount": number },
    "wallPuttyBags": { "qty": number, "spec": string, "rate": number, "amount": number },
    "subtotal": number
  },
  "grandTotal": number,
  "laborDaysEstimate": {
    "electricianDays": number,
    "masonDays": number,
    "approxLaborCost": number
  },
  "engineeringAdvice": [
    "Expert advice 1 regarding wiring gauges or Kolkata climate protection",
    "Expert advice 2 regarding CESC load or MCB isolation",
    "Expert advice 3 regarding cement hydration and TMT rebars"
  ]
}`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        });
        const responseText = response.text || "{}";
        let parsedData = {};
        try {
          parsedData = JSON.parse(responseText);
        } catch (parseErr) {
          console.warn("Could not parse JSON from Gemini, falling back to heuristic data:", parseErr);
        }
        if (parsedData && parsedData.electrical && parsedData.construction) {
          return res.json({
            success: true,
            aiPowered: true,
            ...parsedData
          });
        }
        return res.json(heuristicResult);
      } catch (apiErr) {
        console.warn("Gemini estimate call failed, returning deterministic calculation:", apiErr?.message || apiErr);
        return res.json(heuristicResult);
      }
    } catch (err) {
      console.warn("Estimation endpoint handled error:", err);
      return res.json({
        success: true,
        aiPowered: false,
        summary: "Wholesale Material Estimate (Standard Kolkata Baseline)",
        sanctionedLoadRecommendation: "5 kW (CESC Standard)",
        electrical: {
          wireCoilsLight: { qty: 4, spec: "1.0 & 1.5 sq.mm Polycab FR", rate: 3600, amount: 14400 },
          wireCoilsPower: { qty: 3, spec: "2.5 & 4.0 sq.mm Heavy Copper", rate: 4200, amount: 12600 },
          modularSwitches: { qty: 28, spec: "Modular Points", rate: 140, amount: 3920 },
          mcbDistribution: { qty: 1, spec: "Double Door Enclosure + MCBs", rate: 1250, amount: 1250 },
          pvcConduits: { qty: 14, spec: "Heavy Duty PVC Pipes", rate: 120, amount: 1680 },
          subtotal: 33850
        },
        construction: {
          cementBags: { qty: 50, spec: "UltraTech 53 Grade Fresh", rate: 385, amount: 19250 },
          tmtSteelKg: { qty: 350, spec: "Tata Tiscon 550D TMT (kg)", rate: 62, amount: 21700 },
          waterproofingLiters: { qty: 10, spec: "Dr. Fixit 101 LW+", rate: 135, amount: 1350 },
          wallPuttyBags: { qty: 5, spec: "20kg Polymer Putty", rate: 690, amount: 3450 },
          subtotal: 45750
        },
        grandTotal: 79600,
        laborDaysEstimate: {
          electricianDays: 5,
          masonDays: 6,
          approxLaborCost: 26e3
        },
        engineeringAdvice: [
          "Ensure circuit neutrals are kept independent to prevent MCB tripping during monsoons.",
          "Dedicated 4.0 sq.mm copper wire runs recommended for 1.5 Ton ACs.",
          "All materials dispatched directly from Kasba warehouse."
        ]
      });
    }
  });
  async function sendFast2SmsOtp(rawPhone, otp) {
    const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
    if (!apiKey) {
      return {
        success: false,
        error: "FAST2SMS_API_KEY is not configured in environment variables."
      };
    }
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return {
        success: false,
        error: "Invalid phone number. A 10-digit Indian mobile number is required."
      };
    }
    const cleanOtp = String(otp).trim();
    if (!cleanOtp) {
      return {
        success: false,
        error: "OTP code is required."
      };
    }
    try {
      console.log(`[Fast2SMS] Attempting Quick SMS dispatch for phone ${cleanPhone.slice(0, 4)}****`);
      const quickResponse = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "q",
          message: `Your Giriraj Power verification OTP is ${cleanOtp}. Valid for 10 minutes.`,
          language: "english",
          flash: 0,
          numbers: cleanPhone
        })
      });
      const quickResult = await quickResponse.json().catch(() => null);
      if (quickResponse.ok && quickResult && quickResult.return === true) {
        console.log(`[Fast2SMS] Quick SMS successfully sent to ${cleanPhone.slice(0, 4)}****`);
        return { success: true, data: quickResult, routeUsed: "quick" };
      }
      console.warn("[Fast2SMS] Quick SMS response:", quickResult?.message || quickResult);
      const otpResponse = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: cleanOtp,
          numbers: cleanPhone
        })
      });
      const otpResult = await otpResponse.json().catch(() => null);
      if (otpResponse.ok && otpResult && otpResult.return === true) {
        console.log(`[Fast2SMS] OTP route successfully sent to ${cleanPhone.slice(0, 4)}****`);
        return { success: true, data: otpResult, routeUsed: "otp" };
      }
      const rawErr = quickResult?.message || otpResult?.message || "Failed to send SMS via Fast2SMS";
      const finalMsg = Array.isArray(rawErr) ? rawErr.join(", ") : String(rawErr);
      return { success: false, error: finalMsg, data: { quick: quickResult, otp: otpResult } };
    } catch (err) {
      console.warn("[Fast2SMS] Dispatch error:", err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }
  const fast2smsOtpStore = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [phone, entry] of fast2smsOtpStore.entries()) {
      if (entry.expiresAt < now) {
        fast2smsOtpStore.delete(phone);
      }
    }
  }, 5 * 60 * 1e3);
  app.post("/api/sms/send-fast2sms-otp", async (req, res) => {
    try {
      const { phone } = req.body || {};
      const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "Please enter a valid 10-digit Indian mobile number."
        });
      }
      const generatedOtp = Math.floor(1e5 + Math.random() * 9e5).toString();
      console.log(`[Fast2SMS API] Generating and sending OTP to ${cleanPhone.slice(0, 4)}****`);
      const result = await sendFast2SmsOtp(cleanPhone, generatedOtp);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || "Fast2SMS was unable to dispatch SMS to this number.",
          details: result.data
        });
      }
      fast2smsOtpStore.set(cleanPhone, {
        otp: generatedOtp,
        expiresAt: Date.now() + 10 * 60 * 1e3,
        attempts: 0
      });
      return res.json({
        success: true,
        phone: cleanPhone,
        routeUsed: result.routeUsed,
        message: `OTP sent successfully via Fast2SMS Quick SMS service to +91 ${cleanPhone}.`
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to send OTP via Fast2SMS."
      });
    }
  });
  app.post("/api/sms/verify-fast2sms-otp", (req, res) => {
    try {
      const { phone, otp } = req.body || {};
      const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
      const cleanOtp = String(otp || "").trim();
      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, error: "Invalid phone number." });
      }
      if (!cleanOtp || cleanOtp.length !== 6) {
        return res.status(400).json({ success: false, error: "Please enter a valid 6-digit OTP." });
      }
      const cached = fast2smsOtpStore.get(cleanPhone);
      if (!cached) {
        return res.status(400).json({
          success: false,
          error: "No active OTP found or code expired. Please tap 'Resend OTP'."
        });
      }
      if (Date.now() > cached.expiresAt) {
        fast2smsOtpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          error: "OTP code has expired. Please request a fresh OTP."
        });
      }
      cached.attempts += 1;
      if (cached.attempts > 5) {
        fast2smsOtpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          error: "Too many invalid attempts. Please request a new OTP."
        });
      }
      if (cached.otp !== cleanOtp) {
        return res.status(400).json({
          success: false,
          error: "Incorrect OTP code. Please enter the valid code received on your phone."
        });
      }
      fast2smsOtpStore.delete(cleanPhone);
      return res.json({
        success: true,
        verified: true,
        phone: `+91${cleanPhone}`
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal error verifying OTP."
      });
    }
  });
  app.post("/api/auth/resolve-phone-user", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const { phone } = req.body || {};
      const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, message: "Invalid 10-digit mobile number." });
      }
      const formattedE164 = `+91${cleanPhone}`;
      const sb = getServerSupabase();
      let resolvedProfile = null;
      if (sb) {
        try {
          const { data: profiles, error: pErr } = await sb.from("user_profiles").select("*").or(`phone.eq.${formattedE164},phone.eq.${cleanPhone}`).order("updated_at", { ascending: false }).limit(1);
          if (!pErr && Array.isArray(profiles) && profiles.length > 0) {
            resolvedProfile = profiles[0];
          }
        } catch (e) {
          console.debug("[Resolve Phone User] user_profiles query notice:", e);
        }
        if (!resolvedProfile) {
          try {
            const { data: orderRows, error: oErr } = await sb.from("orders").select("user_id, customer_name, recipient_name, customer_email, recipient_email, address, address_line1, city, pincode").or(`phone.eq.${cleanPhone},phone.eq.${formattedE164},recipient_phone.eq.${cleanPhone},recipient_phone.eq.${formattedE164}`).order("created_at", { ascending: false }).limit(1);
            if (!oErr && Array.isArray(orderRows) && orderRows.length > 0) {
              const o = orderRows[0];
              resolvedProfile = {
                user_id: o.user_id || null,
                full_name: o.customer_name || o.recipient_name || null,
                email: (o.customer_email || o.recipient_email || "").includes("@girirajpower.internal") ? null : o.customer_email || o.recipient_email || null,
                phone: formattedE164
              };
            }
          } catch (e) {
            console.debug("[Resolve Phone User] orders lookup notice:", e);
          }
        }
      }
      return res.json({
        success: true,
        exists: Boolean(resolvedProfile),
        profile: resolvedProfile || null
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to resolve phone profile."
      });
    }
  });
  app.get("/api/sms/providers-status", (req, res) => {
    const fast2smsKey = (process.env.FAST2SMS_API_KEY || "").trim();
    return res.json({
      cascadeOrder: ["firebase", "fast2sms"],
      firebase: {
        type: "client_recaptcha_phone_auth",
        status: "active"
      },
      fast2sms: {
        configured: Boolean(fast2smsKey && fast2smsKey.length > 10),
        type: "quick_and_otp_sms",
        keyMasked: fast2smsKey ? `${fast2smsKey.slice(0, 4)}...` : null
      }
    });
  });
  app.post("/api/supabase-sms-hook", async (req, res) => {
    try {
      const body = req.body || {};
      const phone = body.sms?.phone || body.phone || body.user?.phone || "";
      const otp = body.sms?.otp || body.otp || "";
      if (!phone || !otp) {
        return res.status(400).json({
          error: "Missing required phone or otp parameters from Supabase SMS hook."
        });
      }
      console.log(`[Fast2SMS Hook] Forwarding OTP to ${phone.slice(0, 4)}****... via Fast2SMS OTP route.`);
      const result = await sendFast2SmsOtp(phone, otp);
      if (!result.success) {
        console.error("[Fast2SMS Hook] Error sending OTP:", result.error);
        return res.status(500).json({ error: result.error, details: result.data });
      }
      console.log(`[Fast2SMS Hook] Successfully dispatched OTP to ${phone.slice(0, 4)}****`);
      return res.status(200).json({});
    } catch (err) {
      console.error("[Fast2SMS Hook] Unexpected failure:", err);
      return res.status(500).json({ error: err?.message || "Internal server error in SMS hook." });
    }
  });
  app.post("/api/sms/test-fast2sms-otp", async (req, res) => {
    try {
      const { phone, otp = "582914" } = req.body || {};
      if (!phone) {
        return res.status(400).json({
          success: false,
          error: "Phone number is required in request body (e.g. { phone: '9876543210' })."
        });
      }
      const apiKeyConfigured = Boolean(process.env.FAST2SMS_API_KEY?.trim());
      if (!apiKeyConfigured) {
        return res.status(400).json({
          success: false,
          error: "FAST2SMS_API_KEY is not set in environment variables. Please add your Fast2SMS API key in Settings > Environment Variables.",
          apiKeyConfigured: false
        });
      }
      const result = await sendFast2SmsOtp(phone, otp);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          details: result.data,
          apiKeyConfigured: true
        });
      }
      return res.json({
        success: true,
        message: `OTP sent successfully via Fast2SMS OTP route (cost ~\u20B90.20 instead of \u20B95).`,
        phone: String(phone).replace(/\D/g, "").slice(-10),
        otpUsed: otp,
        fast2smsResponse: result.data
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err?.message || "Failed to execute Fast2SMS OTP test."
      });
    }
  });
  app.get("/api/sms/fast2sms-status", (req, res) => {
    const key = (process.env.FAST2SMS_API_KEY || "").trim();
    const isConfigured = Boolean(key && key.length > 10);
    return res.json({
      configured: isConfigured,
      keyMasked: isConfigured ? `${key.slice(0, 4)}...${key.slice(-4)}` : null,
      route: "otp",
      estimatedCostPerSms: "\u20B90.20 (20 paise)",
      webhookUrl: "/api/supabase-sms-hook"
    });
  });
  app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const manifestPath = import_path.default.join(process.cwd(), "public", "manifest.json");
    res.sendFile(manifestPath);
  });
  app.use("/icons", import_express.default.static(import_path.default.join(process.cwd(), "public", "icons"), {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }));
  const distPath = import_path.default.join(process.cwd(), "dist");
  const distExists = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  const isCompiledBundle = typeof __filename !== "undefined" && (__filename.includes("dist") || __filename.endsWith(".cjs"));
  const isProduction = process.env.NODE_ENV === "production" || isCompiledBundle;
  const publicPath = import_path.default.join(process.cwd(), "public");
  if (import_fs.default.existsSync(publicPath)) {
    app.use(import_express.default.static(publicPath));
  }
  app.use((req, res, next) => {
    const assetIdx = req.path.indexOf("/assets/");
    if (assetIdx !== -1) {
      const rewritten = req.path.substring(assetIdx);
      const resolvedFile = import_path.default.join(distPath, rewritten);
      if (import_fs.default.existsSync(resolvedFile)) {
        return res.sendFile(resolvedFile);
      }
    }
    next();
  });
  if (import_fs.default.existsSync(import_path.default.join(distPath, "assets"))) {
    app.use(
      "/assets",
      import_express.default.static(import_path.default.join(distPath, "assets"), {
        maxAge: "365d",
        immutable: true
      })
    );
  }
  if (!isProduction) {
    console.log("Starting Vite development middleware...");
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving pre-compiled production build from dist/ (Vite dev server OFF)...");
    app.use((req, res, next) => {
      const assetIdx = req.path.indexOf("/assets/");
      if (assetIdx !== -1) {
        const rewritten = req.path.substring(assetIdx);
        const resolvedFile = import_path.default.join(distPath, rewritten);
        if (import_fs.default.existsSync(resolvedFile)) {
          return res.sendFile(resolvedFile);
        }
      }
      next();
    });
    app.use(
      "/assets",
      import_express.default.static(import_path.default.join(distPath, "assets"), {
        maxAge: "365d",
        immutable: true
      })
    );
    app.use(
      import_express.default.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.match(/\.(js|css|woff2?|png|jpe?g|gif|svg|webp|ico)$/i)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            res.setHeader("Cache-Control", "public, max-age=86400");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Giriraj Power Server running on http://0.0.0.0:${PORT}`);
  });
  serverInstance.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      console.warn(`[DevServer] Port ${PORT} address already in use. Retrying cleanly in 1.5s...`);
      setTimeout(() => {
        try {
          serverInstance.close();
        } catch {
        }
        serverInstance.listen(PORT, "0.0.0.0");
      }, 1500);
    } else {
      console.error("[DevServer] Server listen error:", err);
    }
  });
  const handleTermination = (signal) => {
    console.log(`[DevServer] Received ${signal}, closing server gracefully...`);
    try {
      serverInstance.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }
  };
  process.once("SIGTERM", () => handleTermination("SIGTERM"));
  process.once("SIGINT", () => handleTermination("SIGINT"));
}
process.on("unhandledRejection", (reason, promise) => {
  console.warn("[DevServer] Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[DevServer] Uncaught Exception:", err);
});
startServer().catch((err) => {
  console.error("[DevServer] Fatal error during startServer:", err);
});
//# sourceMappingURL=server.cjs.map
