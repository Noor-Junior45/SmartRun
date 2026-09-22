import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Order } from '../types';
import { getShortOrderUuid } from './cryptoHelper';

export async function downloadInvoicePDF(order: Order): Promise<void> {
  // 1. Calculate pricing metrics
  const itemsList = order.items && order.items.length > 0
    ? order.items.map((it) => ({
        title: `${it.product.name}${it.selectedColor ? ` (${it.selectedColor})` : ''}`,
        subtitle: `${it.quantity} ${it.product.unit || 'pcs'} × ₹${(it.product.price || 0).toLocaleString('en-IN')}`,
        total: `₹${((it.product.price || 0) * it.quantity).toLocaleString('en-IN')}`
      }))
    : order.services && order.services.length > 0
    ? order.services.map((srv) => ({
        title: srv.serviceTitle,
        subtitle: `1 service (${srv.projectType}) • ${srv.area}`,
        total: `₹${(srv.estimatedPrice || order.totalAmount).toLocaleString('en-IN')}`
      }))
    : [
        {
          title: 'Standard Electrical & Construction Materials',
          subtitle: '1 order package',
          total: `₹${order.totalAmount.toLocaleString('en-IN')}`
        }
      ];

  const itemsSubtotal = order.items && order.items.length > 0
    ? order.items.reduce((sum, it) => sum + (it.product.price || 0) * it.quantity, 0)
    : order.services && order.services.length > 0
    ? order.services.reduce((sum, s) => sum + (s.estimatedPrice || order.totalAmount), 0)
    : order.totalAmount;

  const gstAmount = Math.round((itemsSubtotal * 0.18) * 10) / 10;
  const rawSubtotal = Math.round((itemsSubtotal - gstAmount) * 10) / 10;
  const deliveryFee = order.deliveryFee || 0;
  const rainFee = (order as any).rainFee || order.feeBreakdown?.rainFee || 0;
  const surgeFee = (order as any).surgeFee || order.feeBreakdown?.surgeFee || 0;
  const productHandlingFee = (order as any).productHandlingFee || order.feeBreakdown?.totalProductCharges || 0;
  const handlingFee = order.handlingFee || 0;
  const discountAmount = order.discount || 0;
  const totalAmount = order.totalAmount;

  const isPaidOnline = order.paymentMethod !== 'cod' || order.paymentStatus === 'paid';
  const paymentMethodLabel = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid (Online)';

  const formattedDate = new Date(order.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const shortOrderCode = getShortOrderUuid(order.id || (order as any).order_id || order.orderId);
  const invoiceNumber = `INV-${shortOrderCode}`;

  // 2. Pagination Calculation for Standard A4
  // Page 1 can comfortably hold header, metadata, up to 6 items, plus totals & footer.
  // If items > 6, split items across pages (8 items on subsequent pages).
  const ITEMS_PER_FIRST_PAGE = 6;
  const ITEMS_PER_SUBSEQUENT_PAGE = 9;

  const pages: (typeof itemsList)[] = [];
  if (itemsList.length <= ITEMS_PER_FIRST_PAGE) {
    pages.push(itemsList);
  } else {
    pages.push(itemsList.slice(0, ITEMS_PER_FIRST_PAGE));
    let remaining = itemsList.slice(ITEMS_PER_FIRST_PAGE);
    while (remaining.length > 0) {
      pages.push(remaining.slice(0, ITEMS_PER_SUBSEQUENT_PAGE));
      remaining = remaining.slice(ITEMS_PER_SUBSEQUENT_PAGE);
    }
  }

  const totalPagesCount = pages.length;

  // 3. Create Offscreen Container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px'; // standard A4 pixel width at 96 DPI
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
  (container.style as any).webkitFontSmoothing = 'antialiased';
  container.style.color = '#1d1d1f';
  document.body.appendChild(container);

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    for (let pageIdx = 0; pageIdx < totalPagesCount; pageIdx++) {
      const isFirstPage = pageIdx === 0;
      const isLastPage = pageIdx === totalPagesCount - 1;
      const currentItems = pages[pageIdx];

      const pageEl = document.createElement('div');
      pageEl.style.width = '794px';
      pageEl.style.minHeight = '1123px'; // A4 height at 96 DPI
      pageEl.style.backgroundColor = '#fbfbfa';
      pageEl.style.padding = '44px 48px';
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'space-between';
      pageEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

      let innerHTML = `
        <div style="width: 100%;">
      `;

      // Header Section
      if (isFirstPage) {
        innerHTML += `
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="font-size: 26px; font-weight: 800; letter-spacing: 0.5px; color: #111827; margin: 0 0 6px 0; text-transform: uppercase;">
              SmartRun
            </h1>
            <p style="font-size: 13px; color: #4b5563; margin: 0 0 3px 0; font-weight: 500;">
              Giriraj Power Depot • Bediadanga 1st Ln, Nator Park, Kasba, Kolkata, West Bengal 700039
            </p>
            <p style="font-size: 13px; color: #6b7280; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
              Phone: +91 8777400280 &nbsp;•&nbsp; GSTIN: 19AABCG1234F1Z8
            </p>
          </div>

          <div style="border-top: 1.5px dashed #cbd5e1; margin: 18px 0;"></div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;">
            <div>
              <span style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 2px;">ORDER / INVOICE ID</span>
              <strong style="font-size: 15px; color: #0f172a; font-weight: 700;">#${shortOrderCode}</strong>
              <div style="font-size: 11px; color: #64748b; font-family: -apple-system, sans-serif; margin-top: 2px;">
                Ref: ${invoiceNumber}
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 2px;">TIMESTAMP</span>
              <strong style="font-size: 13px; color: #0f172a; font-weight: 700;">${formattedDate}</strong>
            </div>
            <div>
              <span style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 2px;">CUSTOMER NAME</span>
              <strong style="font-size: 14px; color: #0f172a; font-weight: 700; text-transform: uppercase;">${order.customerName || 'Valued Customer'}</strong>
              <div style="font-size: 11px; color: #64748b; font-family: -apple-system, sans-serif; margin-top: 2px;">
                ${order.area ? `${order.area}, Kolkata (${order.pincode})` : `Pincode: ${order.pincode}`}
              </div>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; color: #94a3b8; letter-spacing: 1px; display: block; margin-bottom: 2px;">SERVED BY</span>
              <strong style="font-size: 13px; color: #0f172a; font-weight: 700;">SmartRun Kasba Depot</strong>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Payment: ${paymentMethodLabel}
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid #e2e8f0; margin: 16px 0;"></div>
        `;
      } else {
        innerHTML += `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 18px;">
            <div>
              <strong style="font-size: 14px; color: #111827; letter-spacing: 0.5px; text-transform: uppercase;">SMARTRUN INVOICE (${invoiceNumber})</strong>
              <div style="font-size: 11px; color: #64748b;">Customer: ${order.customerName || 'Valued Customer'}</div>
            </div>
            <div style="text-align: right; font-size: 11px; font-family: ui-monospace, monospace; color: #64748b;">
              Page ${pageIdx + 1} of ${totalPagesCount}
            </div>
          </div>
        `;
      }

      // Products Section
      innerHTML += `
        <div style="margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1.2px; text-transform: uppercase; font-family: ui-monospace, monospace;">
            PURCHASED PRODUCTS ${totalPagesCount > 1 ? `(Page ${pageIdx + 1}/${totalPagesCount})` : ''}
          </span>
        </div>

        <div style="margin-top: 10px;">
      `;

      currentItems.forEach((it) => {
        innerHTML += `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
            <div style="max-width: 72%;">
              <div style="font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.35;">
                ${it.title}
              </div>
              <div style="font-size: 12px; color: #64748b; font-family: ui-monospace, monospace; margin-top: 3px;">
                ${it.subtitle}
              </div>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace; text-align: right; white-space: nowrap;">
              ${it.total}
            </div>
          </div>
        `;
      });

      innerHTML += `</div>`;

      // If last page, show Financial summary & Footer
      if (isLastPage) {
        innerHTML += `
          <div style="border-top: 1.5px dashed #cbd5e1; margin: 20px 0 16px 0;"></div>

          <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.8; color: #334155;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <strong style="color: #0f172a;">₹${rawSubtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Tax (GST 18%):</span>
              <strong style="color: #0f172a;">₹${gstAmount.toLocaleString('en-IN')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Delivery Fee:</span>
              <strong style="color: ${deliveryFee > 0 ? '#0f172a' : '#15803d'};">
                ${deliveryFee > 0 ? `₹${deliveryFee.toLocaleString('en-IN')}` : 'FREE Delivery'}
              </strong>
            </div>
            ${rainFee > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #0284c7;">
                <span>🌧️ Rain / Weather Surcharge:</span>
                <strong>₹${rainFee.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
            ${surgeFee > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #d97706;">
                <span>⚡ Peak Surge Surcharge:</span>
                <strong>₹${surgeFee.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
            ${productHandlingFee > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>📦 Special Product Charges:</span>
                <strong>₹${productHandlingFee.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
            ${handlingFee > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>Handling Fee:</span>
                <strong>₹${handlingFee.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
            ${discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #15803d;">
                <span>Discount Applied:</span>
                <strong>-₹${discountAmount.toLocaleString('en-IN')}</strong>
              </div>
            ` : ''}
          </div>

          <div style="border-top: 2px solid #334155; margin-top: 12px; padding-top: 12px; display: flex; justify-content: space-between; align-items: baseline;">
            <span style="font-size: 17px; font-weight: 800; color: #0f172a; font-family: -apple-system, sans-serif;">
              Total Invoice Amount:
            </span>
            <span style="font-size: 22px; font-weight: 900; color: #09090b; font-family: ui-monospace, monospace;">
              ₹${totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div style="margin-top: 10px; display: flex; justify-content: space-between; font-family: ui-monospace, monospace; font-size: 13px;">
            <span style="color: #475569;">Payment Method:</span>
            <strong style="color: #0f172a;">${paymentMethodLabel}</strong>
          </div>
        `;
      }

      innerHTML += `</div>`; // Close main content container

      // Footer Section
      innerHTML += `
        <div style="margin-top: auto; padding-top: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; font-family: ui-monospace, monospace; margin: 0 0 4px 0;">
            THANK YOU FOR YOUR BUSINESS!
          </p>
          <p style="font-size: 13px; color: #475569; font-style: italic; margin: 0 0 8px 0;">
            "Thank you for choosing SmartRun. Please visit us again!"
          </p>
          <div style="display: flex; justify-content: flex-end; align-items: center; font-size: 10px; color: #94a3b8; font-family: ui-monospace, monospace; margin-top: 10px;">
            <span>Page ${pageIdx + 1} of ${totalPagesCount}</span>
          </div>
        </div>
      `;

      pageEl.innerHTML = innerHTML;
      container.appendChild(pageEl);

      // Render canvas for this page
      const canvas = await html2canvas(pageEl, {
        scale: 2, // 2x high DPI rendering
        useCORS: true,
        backgroundColor: '#fbfbfa',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pageIdx > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Clean up page element
      container.removeChild(pageEl);
    }

    // Save and trigger direct browser download
    const cleanFileName = `SmartRun-Invoice-${shortOrderCode}.pdf`;
    pdf.save(cleanFileName);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
