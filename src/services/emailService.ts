import { Order, WiringServiceBooking, ReceivedEmail } from '../types';
import { API_BASE_URL } from '../lib/apiBase';
import { getShortOrderUuid } from '../utils/cryptoHelper';

export interface EmailSendResult {
  success: boolean;
  simulated?: boolean;
  messageId?: string;
  message: string;
  error?: string;
  emailId?: string;
  ackSent?: boolean;
  alertSent?: boolean;
}

export interface EmailServiceStatus {
  configured: boolean;
  fromEmail: string;
  officialEmail?: string;
  resendInboundEmail?: string;
  resendInboundDomain?: string;
  adminEmails?: string[];
  adminEmail?: string;
  inboundWebhookUrl?: string;
  receivedCount?: number;
  unreadCount?: number;
  service: string;
}

export interface ReceivedEmailsResponse {
  success: boolean;
  officialEmail: string;
  totalCount: number;
  unreadCount: number;
  emails: ReceivedEmail[];
}

/**
 * Checks if the Resend Mail service is configured on the backend
 */
export async function getEmailServiceStatus(): Promise<EmailServiceStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/email-status`);
    if (!res.ok) {
      return {
        configured: false,
        fromEmail: 'Giriraj Power <orders@oieldiakir.resend.app>',
        officialEmail: 'orders@oieldiakir.resend.app',
        resendInboundEmail: 'orders@oieldiakir.resend.app',
        resendInboundDomain: 'oieldiakir.resend.app',
        adminEmails: ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'],
        service: 'Resend'
      };
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to check email service status:', err);
    return {
      configured: false,
      fromEmail: 'Giriraj Power <orders@oieldiakir.resend.app>',
      officialEmail: 'orders@oieldiakir.resend.app',
      resendInboundEmail: 'orders@oieldiakir.resend.app',
      resendInboundDomain: 'oieldiakir.resend.app',
      adminEmails: ['gauravgiri123344@gmail.com', 'mdhassan1738@gmail.com'],
      service: 'Resend'
    };
  }
}

/**
 * Fetches all received inbound emails and customer contact inquiries
 */
export async function getReceivedEmails(): Promise<ReceivedEmailsResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/received-emails`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch received emails:', err);
    return {
      success: false,
      officialEmail: 'team@girirajpower.in',
      totalCount: 0,
      unreadCount: 0,
      emails: []
    };
  }
}

/**
 * Submits a contact / quote inquiry email to team@girirajpower.in
 */
export async function sendContactInquiry(params: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  category?: 'quote' | 'support' | 'contractor' | 'general';
  orderId?: string;
}): Promise<EmailSendResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/contact-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      message: `Failed to submit inquiry: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * Replies to a received email using Resend
 */
export async function replyToReceivedEmail(
  id: string,
  replyText: string,
  customSubject?: string
): Promise<{ success: boolean; message: string; record?: ReceivedEmail }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/received-emails/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyText, subject: customSubject })
    });
    return await res.json();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      message: `Failed to send reply: ${errorMessage}`
    };
  }
}

/**
 * Updates status of a received email (unread, read, archived)
 */
export async function updateReceivedEmailStatus(
  id: string,
  status: 'unread' | 'read' | 'archived'
): Promise<{ success: boolean; email?: ReceivedEmail }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/received-emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
}

/**
 * Deletes a received email from the inbound inbox
 */
export async function deleteReceivedEmail(id: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/received-emails/${id}`, {
      method: 'DELETE'
    });
    return await res.json();
  } catch (err) {
    return { success: false };
  }
}

/**
 * Triggers a simulated inbound email for testing receiving functionality
 */
export async function simulateInboundEmail(params?: {
  from?: string;
  fromName?: string;
  subject?: string;
  text?: string;
  category?: 'quote' | 'support' | 'contractor' | 'general';
}): Promise<{ success: boolean; message: string; email?: ReceivedEmail }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/received-emails/simulate-inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: 'Failed to simulate inbound email' };
  }
}

/**
 * Formats an order into a clean, complete WhatsApp message for store dispatch & delivery alerts
 */
export function formatOrderWhatsAppMessage(order: Order): string {
  const itemsText = (order.items || [])
    .map((it, idx) => {
      const color = it.selectedColor || it.product?.selectedColor;
      const colorTag = color ? ` [🎨 Colour: ${color}]` : '';
      return `${idx + 1}. *${it.product?.name || 'Product'}* (${it.product?.brand || 'Giriraj'})${colorTag} × ${it.quantity} ${it.product?.unit || 'pc'} = ₹${((it.product?.price || 0) * it.quantity).toLocaleString('en-IN')}`;
    })
    .join('\n');

  return (
    `⚡ *NEW ORDER RECEIVED - GIRIRAJ POWER* ⚡\n\n` +
    `📦 *Order ID:* #${getShortOrderUuid(order.id)}\n` +
    `📅 *Time:* ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\n\n` +
    `👤 *Customer:* ${order.customerName}\n` +
    `📱 *Mobile:* ${order.phone}\n` +
    `✉️ *Email:* ${order.customerEmail || 'Not provided'}\n\n` +
    `📍 *DELIVERY ADDRESS:*\n` +
    `${order.address}\n` +
    `${order.landmark ? `Landmark: ${order.landmark}\n` : ''}` +
    `Area: ${order.area}, PIN: ${order.pincode}\n\n` +
    `🛒 *ITEMS & QUANTITIES:*\n${itemsText}\n\n` +
    `💰 *Items Total:* ₹${(order.itemTotal || 0).toLocaleString('en-IN')}\n` +
    `🚚 *Delivery Fee:* ${(order.deliveryFee || 0) === 0 ? 'FREE (Express 60-Min)' : '₹' + order.deliveryFee}\n` +
    `${(order.discount || 0) > 0 ? `🎟️ *Discount:* -₹${order.discount}\n` : ''}` +
    `💳 *GRAND TOTAL:* ₹${(order.totalAmount || 0).toLocaleString('en-IN')}\n` +
    `💵 *Payment Mode:* ${order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online UPI / Card (PAID)'}\n\n` +
    `⚡ *Central Dispatch:* Giriraj Power Kasba Hub, Kolkata 700039`
  );
}

/**
 * Returns a direct WhatsApp click-to-chat URL with the complete formatted order
 */
export function getOrderWhatsAppUrl(order: Order, recipientPhone = '918777400280'): string {
  const cleanPhone = recipientPhone.replace(/\D/g, '');
  const message = formatOrderWhatsAppMessage(order);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Notifies the Admin via Email & prepares WhatsApp notification whenever a purchase occurs
 */
export async function notifyOrderPlaced(
  order: Order,
  customerEmail?: string
): Promise<{
  success: boolean;
  adminAlertSent: boolean;
  customerInvoiceSent: boolean;
  whatsappUrl: string;
  message: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/notify-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        customerEmail: customerEmail || order.customerEmail
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      adminAlertSent: data.adminAlertSent ?? true,
      customerInvoiceSent: data.customerInvoiceSent ?? false,
      whatsappUrl: data.whatsappUrl || getOrderWhatsAppUrl(order),
      message: data.message || 'Order notification dispatched!'
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error';
    console.warn('Could not dispatch backend order notification:', errorMsg);
    return {
      success: false,
      adminAlertSent: false,
      customerInvoiceSent: false,
      whatsappUrl: getOrderWhatsAppUrl(order),
      message: `Failed: ${errorMsg}`
    };
  }
}

/**
 * Sends an automated order confirmation and tax invoice email to the customer
 */
export async function sendOrderConfirmationEmail(
  order: Order,
  emailRecipient?: string
): Promise<EmailSendResult> {
  const targetEmail = emailRecipient || order.customerEmail;
  if (!targetEmail || !targetEmail.includes('@')) {
    return {
      success: false,
      message: 'No valid recipient email address provided.'
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_confirmation',
        to: targetEmail,
        customerName: order.customerName,
        order
      })
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    console.error('Failed to send order confirmation email:', err);
    return {
      success: false,
      message: `Failed to send email: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * Sends an automated electrical wiring project booking confirmation email
 */
export async function sendWiringBookingEmail(
  booking: WiringServiceBooking,
  emailRecipient?: string
): Promise<EmailSendResult> {
  const targetEmail = emailRecipient || booking.contactEmail;
  if (!targetEmail || !targetEmail.includes('@')) {
    return {
      success: false,
      message: 'No valid recipient email address provided.'
    };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'service_booking',
        to: targetEmail,
        customerName: booking.contactName,
        booking
      })
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    console.error('Failed to send wiring booking email:', err);
    return {
      success: false,
      message: `Failed to send email: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * Sends a test email to verify Resend API connectivity
 */
export async function sendTestEmail(
  toEmail: string,
  recipientName = 'Valued Customer'
): Promise<EmailSendResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test_email',
        to: toEmail,
        customerName: recipientName
      })
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    console.error('Failed to send test email:', err);
    return {
      success: false,
      message: `Failed to send test email: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * Sends a custom email through the Resend API backend
 */
export async function sendCustomEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  customerName?: string;
}): Promise<EmailSendResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'custom',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        customerName: params.customerName
      })
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      message: `Failed to send email: ${errorMessage}`,
      error: errorMessage
    };
  }
}
