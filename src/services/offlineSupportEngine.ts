import { UserProfile, Order, SavedAddress } from '../types';

export interface SmartChatResponse {
  text: string;
  needsEscalation?: boolean;
  faqCategory?: string;
  suggestedActions?: Array<{ label: string; query: string }>;
}

export interface EscalationContacts {
  whatsapp: {
    phone: string;
    label: string;
    prefilledText: string;
    url: string;
  };
  email: {
    address: string;
    label: string;
    subject: string;
    body: string;
    url: string;
  };
  phone: {
    number: string;
    label: string;
    url: string;
  };
}

export const SUPPORT_CONTACTS: EscalationContacts = {
  whatsapp: {
    phone: '918777400280',
    label: 'Open WhatsApp Chat',
    prefilledText: 'Hello Giriraj Power Kasba, I need assistance with my order / contractor inquiry.',
    url: 'https://wa.me/918777400280?text=' + encodeURIComponent('Hello Giriraj Power Kasba, I need assistance with my order / contractor inquiry.')
  },
  email: {
    address: 'team@girirajpower.in',
    label: 'Send Email to Support Desk',
    subject: 'Customer Support Inquiry - Giriraj Power',
    body: 'Hi Support Team,\n\nI am contacting you regarding my BuildNow / Giriraj Power account.\n\nQuery details:\n',
    url: 'mailto:team@girirajpower.in?subject=' + encodeURIComponent('Customer Support Inquiry - Giriraj Power') + '&body=' + encodeURIComponent('Hi Support Team,\n\nI am contacting you regarding my BuildNow / Giriraj Power account.\n\nQuery details:\n')
  },
  phone: {
    number: '+919007168561',
    label: 'Call Support Helpline',
    url: 'tel:+919007168561'
  }
};

export const STORE_FAQS = [
  {
    id: 'delivery',
    question: 'How fast is Kolkata express delivery?',
    shortAnswer: 'Dispatched within 10–15 minutes, delivered in ~60 minutes across Kolkata.',
    keywords: ['delivery', 'fast', 'express', 'speed', 'time', 'how long', 'when will', 'dispatch', 'rider', 'area', 'kolkata']
  },
  {
    id: 'wire_sizing',
    question: 'What wire size (sq mm) is needed for AC, Geyser, and Lighting?',
    shortAnswer: '1.5 sq mm for lights/fans, 2.5 sq mm for AC (1.5 Ton)/geysers, 4.0 sq mm for 2 Ton ACs/sub-mains.',
    keywords: ['wire', 'gauge', 'sq mm', 'sqmm', 'cable', 'polycab', 'havells', 'finolex', 'size', 'ac', 'geyser', 'heater', 'fan', 'mcb']
  },
  {
    id: 'gst_invoice',
    question: 'Can I get a GST Tax Invoice for business ITC claims?',
    shortAnswer: 'Yes, 100% compliant GST invoice is provided with registered GSTIN. Download anytime from Profile > Orders.',
    keywords: ['invoice', 'gst', 'tax', 'bill', 'itc', 'input tax', 'b2b', 'company', 'download invoice']
  },
  {
    id: 'electrician',
    question: 'How do I book a verified licensed electrician?',
    shortAnswer: 'We provide background-checked certified electricians across Kolkata for wiring, repairs, and installations with fixed upfront pricing.',
    keywords: ['electrician', 'technician', 'book', 'install', 'fitting', 'repair', 'wiring', 'labor', 'service']
  },
  {
    id: 'returns',
    question: 'What is the return and replacement policy?',
    shortAnswer: 'Hassle-free 7-day replacement for unused items and uncut wire coils. Doorstep pickup within 24 hours.',
    keywords: ['return', 'replace', 'replacement', 'cancel', 'refund', 'damaged', 'exchange', 'policy', 'defective']
  },
  {
    id: 'materials',
    question: 'Do you supply genuine cement and TMT steel?',
    shortAnswer: 'Fresh UltraTech 53 Grade Cement (<15 days old) & Tata Tiscon 550D primary TMT rebars dispatched directly to construction sites.',
    keywords: ['cement', 'steel', 'tmt', 'ultratech', 'tiscon', 'construction', 'rod', 'sand', 'stone', 'civil']
  },
  {
    id: 'payments',
    question: 'What payment options are accepted?',
    shortAnswer: 'UPI (GPay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Net Banking, and Cash on Delivery (COD) within Kolkata.',
    keywords: ['payment', 'pay', 'upi', 'cod', 'cash', 'card', 'online', 'razorpay', 'wallet']
  },
  {
    id: 'store_address',
    question: 'Where is the central warehouse located in Kolkata?',
    shortAnswer: 'Giriraj Power Kasba Central Hub, Kolkata 700039. Open 8:00 AM – 9:30 PM every day.',
    keywords: ['address', 'location', 'where', 'hub', 'kasba', 'store', 'shop', 'timing', 'hours', 'office']
  }
];

// Conversational variety pools for natural, non-repetitive responses
const GREETING_VARIATIONS = [
  (name: string) => `How can I help you today, ${name}? 😊 Ask me anything about our 60-min Kolkata delivery, wire gauge calculations, GST invoices, or your account orders!`,
  (name: string) => `Hello ${name} 👋! Great to hear from you. What can I get sorted for your electrical or construction supplies right now?`,
  (name: string) => `Hi ${name}! Nice to see you. Mayra here, your 24/7 AI Support Specialist. What's on your mind today?`,
  (name: string) => `Welcome back ${name}! How may I assist you with your project today — need wire sizing advice, order tracking, or an electrician booking?`
];

const GRATITUDE_VARIATIONS = [
  (name: string) => `Nice to hear that you liked the answer, ${name}! 😊 Feel free to ask if you have any other questions about wiring, orders, or delivery.`,
  (name: string) => `You're very welcome, ${name}! Glad I could be of help. I'm always here 24/7 whenever you need assistance!`,
  (name: string) => `So glad that was helpful! It's always my absolute pleasure to assist with your electrical and hardware questions.`,
  (name: string) => `Awesome, happy to hear that! Reach out anytime if you need more recommendations or quotes.`
];

const CASUAL_CHAT_VARIATIONS = [
  `I'm doing fantastic, thank you for asking! 😊 Ready to help you with lightning-fast electrical supplies across Kolkata. How are your projects going?`,
  `Everything is running smoothly! All our dispatch teams at Kasba are on standby for 60-minute deliveries. How can I help you today?`,
  `I'm feeling great and ready to assist! Whether it's Polycab wire sizing or civil estimates, ask away!`
];

/**
 * Generates an intelligent, human-like response running 100% offline on client device,
 * trained on the user's real profile, past orders, saved addresses, and Kolkata store catalog.
 */
export function processOfflineQuery(
  query: string,
  userProfile?: UserProfile | null,
  orders?: Order[],
  savedAddresses?: SavedAddress[]
): SmartChatResponse {
  const clean = (query || '').trim();
  const lower = clean.toLowerCase();
  const userName = userProfile?.name?.split(' ')[0] || 'there';

  // 1. HUMAN AGENT / REAL PERSON ESCALATION
  // Checks if user wants to speak to a person, call, or reach support directly
  if (
    lower.includes('human') ||
    lower.includes('real person') ||
    lower.includes('call') ||
    lower.includes('phone') ||
    lower.includes('speak') ||
    lower.includes('agent') ||
    lower.includes('representative') ||
    lower.includes('operator') ||
    lower.includes('talk to someone') ||
    lower.includes('talk to human') ||
    lower.includes('contact support') ||
    lower.includes('helpline') ||
    lower.includes('phone number') ||
    lower.includes('mobile number')
  ) {
    return {
      text: `I can certainly connect you with our specialized human support and contractor desk! 🤝\n\nPlease choose your preferred contact option below:\n\n• **1. WhatsApp**: Instant chat with our Kasba dispatch manager\n• **2. Official Email**: Send your inquiry or quote request to our desk\n• **3. Support Helpline**: Open direct dialer for immediate voice assistance`,
      needsEscalation: true,
      suggestedActions: [
        { label: '💬 Open WhatsApp', query: 'Open WhatsApp' },
        { label: '✉️ Send Email', query: 'Send Email' },
        { label: '📞 Call Helpline', query: 'Call Helpline' }
      ]
    };
  }

  // 2. APPRECIATION / COMPLIMENTS ("nice to hear you like answer", "thanks", "thank you", "great", "helpful")
  if (
    lower.includes('thank') ||
    lower.includes('thanks') ||
    lower.includes('nice answer') ||
    lower.includes('good answer') ||
    lower.includes('like your answer') ||
    lower.includes('like the answer') ||
    lower.includes('great job') ||
    lower.includes('awesome') ||
    lower.includes('helpful') ||
    lower.includes('good bot') ||
    lower.includes('perfect')
  ) {
    const randomGratitude = GRATITUDE_VARIATIONS[Math.floor(Math.random() * GRATITUDE_VARIATIONS.length)];
    return {
      text: randomGratitude(userName),
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📦 Track My Order', query: 'Where is my order?' }
      ]
    };
  }

  // 3. GREETINGS & CASUAL OPENERS ("hello", "hi", "how are you", "who are you")
  if (
    lower === 'hi' ||
    lower === 'hello' ||
    lower === 'hey' ||
    lower.startsWith('hi ') ||
    lower.startsWith('hello ') ||
    lower.startsWith('hey ') ||
    lower.includes('good morning') ||
    lower.includes('good afternoon') ||
    lower.includes('good evening')
  ) {
    const randomGreeting = GREETING_VARIATIONS[Math.floor(Math.random() * GREETING_VARIATIONS.length)];
    return {
      text: randomGreeting(userName),
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📦 Track Order', query: 'Where is my order?' },
        { label: '📞 Talk to Human', query: 'Talk to real person' }
      ]
    };
  }

  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes("how're you")) {
    const randomCasual = CASUAL_CHAT_VARIATIONS[Math.floor(Math.random() * CASUAL_CHAT_VARIATIONS.length)];
    return {
      text: randomCasual,
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '📄 GST Invoice', query: 'Can I get GST invoice?' }
      ]
    };
  }

  if (lower.includes('who are you') || lower.includes('your name') || lower.includes('what are you')) {
    return {
      text: `Hello ${userName}! I am **Mayra**, your dedicated 24/7 Support Specialist at Giriraj Power (Kasba, Kolkata). 🤖✨\n\n• ⚡ Technical wire gauges & MCB recommendations\n• 🚀 60-minute express Kolkata delivery tracking\n• 📄 GST tax invoices & B2B Input Tax Credit\n• 🔧 Booking certified licensed electricians\n• 📦 Tracking your personal orders and account details\n• 🤝 Direct escalation to our human support team`,
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📞 Contact Real Person', query: 'Talk to human agent' }
      ]
    };
  }

  // 4. USER-TRAINED DATA: TRACK ORDERS & ORDER STATUS
  if (
    lower.includes('my order') ||
    lower.includes('where is my order') ||
    lower.includes('track order') ||
    lower.includes('order status') ||
    lower.includes('past order') ||
    lower.includes('recent order')
  ) {
    const userOrders = orders && orders.length > 0 ? orders : getLocalOrders();
    if (userOrders && userOrders.length > 0) {
      const latest = userOrders[0];
      const itemsCount = latest.items?.reduce((sum, it) => sum + it.quantity, 0) || latest.items?.length || 1;
      const orderDate = latest.createdAt ? new Date(latest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently';
      const statusFormatted = (latest.status || 'Processing').toUpperCase();

      const deliveryDest = latest.address || latest.area || 'Kolkata';

      return {
        text: `📦 **Here are your recent order details, ${userName}**:\n\n• **Order ID**: #${latest.id?.slice(-8) || latest.id}\n• **Placed On**: ${orderDate}\n• **Status**: **${statusFormatted}**\n• **Items**: ${itemsCount} product(s)\n• **Total Amount**: ₹${latest.totalAmount?.toLocaleString('en-IN') || 0}\n• **Delivery Address**: ${deliveryDest}\n\nOur Kasba warehouse team dispatches in 10–15 mins for 60-minute doorstep arrival! You can also view the live GPS rider map under your **Profile > Order History** section.`,
        suggestedActions: [
          { label: '📞 Contact Support Desk', query: 'Talk to human agent' },
          { label: '📄 GST Invoice', query: 'How to download invoice?' }
        ]
      };
    } else {
      return {
        text: `I checked your account, ${userName}, but I don't see any active or past orders registered yet.\n\nOnce you place an order for wires, MCBs, or construction supplies, you can ask me to track it here in real-time! Would you like to check out our product catalog?`,
        suggestedActions: [
          { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
          { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' }
        ]
      };
    }
  }

  // 5. USER-TRAINED DATA: ADDRESS & PROFILE INQUIRIES
  if (
    lower.includes('my address') ||
    lower.includes('where do you deliver to me') ||
    lower.includes('delivery location')
  ) {
    const primaryAddr = savedAddresses?.[0];
    if (primaryAddr) {
      const fullText = primaryAddr.formattedExactAddress || `${primaryAddr.houseFlat || ''}, ${primaryAddr.houseName || ''}, ${primaryAddr.buildingRoad || ''}, ${primaryAddr.area || 'Kolkata'}`;
      return {
        text: `📍 **Your Saved Delivery Address**:\n\n• **Label**: ${(primaryAddr.tag || 'Primary').toUpperCase()}\n• **Address**: ${fullText}\n• **Area**: ${primaryAddr.area || 'Kolkata'}\n\nWe provide 60-minute express courier delivery from our central Kasba warehouse to this location!`,
        suggestedActions: [
          { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
          { label: '📦 Track Order', query: 'Where is my order?' }
        ]
      };
    } else {
      return {
        text: `We deliver anywhere across Kolkata within 60 minutes (Kasba, Salt Lake, New Town, Ballygunge, Gariahat, Jadavpur, Park Street, Behala, Howrah, and more).\n\nYou can view and save your delivery addresses anytime in **Profile > Manage Addresses**!`,
        suggestedActions: [
          { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
          { label: '📍 Kasba Store Location', query: 'Where is your store?' }
        ]
      };
    }
  }

  if (lower.includes('my wallet') || lower.includes('wallet balance') || lower.includes('my balance') || lower.includes('cashback')) {
    const balance = userProfile?.walletBalance || 0;
    const cashback = userProfile?.cashbackBalance || 0;
    return {
      text: `💰 **Your Giriraj Power Wallet Summary**:\n\n• **Available Balance**: ₹${balance.toLocaleString('en-IN')}\n• **Cashback Balance**: ₹${cashback.toLocaleString('en-IN')}\n\nYou can use your wallet balance during checkout for instant one-tap discounts on your electrical purchases!`,
      suggestedActions: [
        { label: '💳 Payment Options', query: 'What payment methods do you accept?' },
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' }
      ]
    };
  }

  if (lower.includes('my email') || lower.includes('my phone') || lower.includes('my profile') || lower.includes('my account')) {
    return {
      text: `👤 **Your Account Profile**:\n\n• **Name**: ${userProfile?.name || 'Valued Customer'}\n• **Email**: ${userProfile?.email || 'Not provided'}\n• **Phone**: ${userProfile?.phone || 'Not provided'}\n• **Wallet**: ₹${userProfile?.walletBalance || 0}\n\nYou can update your name or phone number anytime in the **Profile** tab!`,
      suggestedActions: [
        { label: '📦 My Orders', query: 'Where is my order?' },
        { label: '📞 Talk to Human', query: 'Talk to real person' }
      ]
    };
  }

  // 6. STORE FAQ: WIRE GAUGE RECOMMENDATIONS
  if (
    lower.includes('wire') ||
    lower.includes('gauge') ||
    lower.includes('sq mm') ||
    lower.includes('sqmm') ||
    lower.includes('cable') ||
    lower.includes('polycab') ||
    lower.includes('havells') ||
    lower.includes('finolex') ||
    lower.includes('geyser') ||
    lower.includes('heater') ||
    lower.includes('ac wire')
  ) {
    return {
      text: `⚡ **Technical Wire Gauge & Load Sizing Guide**:\n\n• **1.5 sq mm** (Polycab FR-LSH / Havells): Recommended for lighting points, ceiling fans, and 6A switchboards (paired with a 10A MCB).\n• **2.5 sq mm**: Essential for 1.0–1.5 Ton ACs, storage/instant water geysers, refrigerators, and 16A kitchen sockets (paired with a 16A/20A MCB).\n• **4.0 sq mm**: Required for 2.0 Ton heavy AC units, microwave circuits, and room sub-mains (paired with a 25A/32A MCB).\n• **6.0 sq mm**: Used for main electrical incoming feeds from the energy meter to the distribution board.\n\nAll wires in our catalog are 100% genuine electrolytic copper with ISI and FR-LSH fire-retardant certification.`,
      faqCategory: 'wire_sizing',
      suggestedActions: [
        { label: '🔧 Book Electrician', query: 'How to book an electrician?' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📞 Contact Real Person', query: 'Talk to real person' }
      ]
    };
  }

  // 7. STORE FAQ: 60-MINUTE DELIVERY
  if (
    lower.includes('delivery') ||
    lower.includes('fast') ||
    lower.includes('speed') ||
    lower.includes('dispatch') ||
    lower.includes('rider') ||
    lower.includes('how long') ||
    lower.includes('shipping') ||
    lower.includes('60 min')
  ) {
    return {
      text: `🚀 **60-Minute Express Kolkata Delivery**:\n\n• **Dispatch Speed**: All orders are packed and dispatched within 10–15 minutes from our central Kasba warehouse.\n• **Coverage Areas**: Kasba, Salt Lake, New Town, Ballygunge, Gariahat, Park Street, Ruby, Jadavpur, Behala, Howrah, and greater Kolkata.\n• **Live Tracking**: You receive real-time rider tracking and WhatsApp delivery notifications.\n• **Same-Day Service**: Active daily between 8:00 AM and 9:30 PM!`,
      faqCategory: 'delivery',
      suggestedActions: [
        { label: '📦 Track My Order', query: 'Where is my order?' },
        { label: '📍 Kasba Store Location', query: 'Where is your store?' },
        { label: '📞 Talk to Human', query: 'Talk to real person' }
      ]
    };
  }

  // 8. STORE FAQ: GST TAX INVOICES & ITC
  if (
    lower.includes('invoice') ||
    lower.includes('gst') ||
    lower.includes('bill') ||
    lower.includes('tax') ||
    lower.includes('itc') ||
    lower.includes('b2b') ||
    lower.includes('input credit')
  ) {
    return {
      text: `📄 **GST Tax Invoices & B2B Benefits**:\n\n• Every single order is accompanied by an official GST Tax Invoice containing our registered GSTIN.\n• **For Contractors & Businesses**: Enter your company GSTIN during checkout to claim full Input Tax Credit (ITC).\n• **Instant PDF Download**: You can view, print, or download invoices anytime directly from your **Profile > Order History** screen.`,
      faqCategory: 'gst_invoice',
      suggestedActions: [
        { label: '📦 View Orders', query: 'Where is my order?' },
        { label: '📞 Contractor Desk', query: 'Talk to human agent' }
      ]
    };
  }

  // 9. STORE FAQ: ELECTRICIAN BOOKING
  if (
    lower.includes('electrician') ||
    lower.includes('technician') ||
    lower.includes('book') ||
    lower.includes('install') ||
    lower.includes('fitting') ||
    lower.includes('repair') ||
    lower.includes('wiring')
  ) {
    return {
      text: `🔧 **Verified Licensed Electrician Booking**:\n\n• We provide licensed, background-verified technicians across all Kolkata neighborhoods.\n• **Services Offered**: Full house rewiring, MCB distribution board installation, ceiling fan and chandelier mounting, switchboard replacements, and electrical fault detection.\n• **Transparent Pricing**: Fixed upfront labor rates with guaranteed satisfaction.\n• You can book a technician directly via the **Book Electrician** tab in the app!`,
      faqCategory: 'electrician',
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '📞 Call Support', query: 'Talk to real person' }
      ]
    };
  }

  // 10. STORE FAQ: RETURNS & REPLACEMENTS
  if (
    lower.includes('return') ||
    lower.includes('replace') ||
    lower.includes('cancel') ||
    lower.includes('refund') ||
    lower.includes('exchange') ||
    lower.includes('damaged') ||
    lower.includes('defective')
  ) {
    return {
      text: `🔄 **Hassle-Free 7-Day Return & Replacement Policy**:\n\n• **Eligibility**: Unused items in original packaging, factory-sealed goods, and intact uncut wire coils can be exchanged or returned within 7 days of delivery.\n• **Defective or Damaged Goods**: Instant doorstep replacement arranged within 24 hours at zero additional cost.\n• **Refunds**: Processed back to your original payment method (or UPI) within 24–48 hours of item pickup.`,
      faqCategory: 'returns',
      suggestedActions: [
        { label: '📞 Contact Support Desk', query: 'Talk to real person' },
        { label: '📦 Track Order', query: 'Where is my order?' }
      ]
    };
  }

  // 11. STORE FAQ: CEMENT & TMT REBARS
  if (
    lower.includes('cement') ||
    lower.includes('steel') ||
    lower.includes('tmt') ||
    lower.includes('ultratech') ||
    lower.includes('tiscon') ||
    lower.includes('construction') ||
    lower.includes('sand') ||
    lower.includes('stone')
  ) {
    return {
      text: `🏗️ **Civil & Construction Supplies**:\n\n• **UltraTech Cement**: Fresh 53 Grade & Super Cement bags directly from manufacturer depots (guaranteed <15 days old).\n• **Tata Tiscon 550D TMT Rebars**: Certified primary steel with mill test certificates and exact weighbridge receipts.\n• **Site Delivery**: Dispatched via mini-trucks directly to your construction site across Kolkata with optional ground-floor unloading.\n• Contact our wholesale contractor desk for project volume pricing!`,
      faqCategory: 'materials',
      suggestedActions: [
        { label: '📞 Wholesale Contractor Desk', query: 'Talk to real person' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' }
      ]
    };
  }

  // 12. STORE FAQ: PAYMENTS & COD
  if (
    lower.includes('payment') ||
    lower.includes('pay') ||
    lower.includes('upi') ||
    lower.includes('cod') ||
    lower.includes('cash') ||
    lower.includes('razorpay') ||
    lower.includes('credit card')
  ) {
    return {
      text: `💳 **Payment Methods & Security**:\n\n• We accept **UPI** (Google Pay, PhonePe, Paytm, BHIM), **Credit/Debit Cards**, **Net Banking**, and **Cash on Delivery (COD)**.\n• All online transactions are 100% secure, protected by 256-bit bank-grade encryption.\n• COD is available for orders within Kolkata express delivery zones.`,
      faqCategory: 'payments',
      suggestedActions: [
        { label: '📄 GST Invoice', query: 'Can I get GST invoice?' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' }
      ]
    };
  }

  // 13. STORE FAQ: ADDRESS & TIMINGS
  if (
    lower.includes('address') ||
    lower.includes('location') ||
    lower.includes('where is the shop') ||
    lower.includes('store timing') ||
    lower.includes('kasba') ||
    lower.includes('hub')
  ) {
    return {
      text: `📍 **Giriraj Power Kasba Central Hub**:\n\n• **Address**: Kasba Central Hub, Near Nator Park, Kolkata, West Bengal 700039\n• **Operating Hours**: 8:00 AM – 9:30 PM (Open 7 Days a week)\n• **Services**: Express local dispatch, contractor pick-up counter, product inspections, and technical advice.`,
      faqCategory: 'store_address',
      suggestedActions: [
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📞 Call Hub', query: 'Talk to real person' }
      ]
    };
  }

  // 14. SHOW ALL FAQS
  if (lower.includes('faq') || lower.includes('all questions') || lower.includes('help topics')) {
    return {
      text: `📚 **Frequently Asked Questions & Store Guides**:\n\nTap any of the common topics below to get instant answers right here in chat:\n\n• ⚡ **Wire Gauge Recommendations** (AC, Geysers, Lighting)\n• 🚀 **60-Minute Kolkata Express Delivery**\n• 📄 **GST Tax Invoices & ITC Claims**\n• 🔧 **Booking Licensed Electricians**\n• 🔄 **7-Day Return & Replacement Policy**\n• 🏗️ **UltraTech Cement & Tata Tiscon Steel**\n• 💳 **Accepted Payment Methods & COD**\n• 📍 **Kasba Central Store Location & Timings**`,
      suggestedActions: [
        { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
        { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
        { label: '📄 GST Tax Invoice', query: 'Can I get GST invoice?' },
        { label: '🔧 Book Electrician', query: 'How to book an electrician?' },
        { label: '🔄 7-Day Returns', query: 'What is return policy?' },
        { label: '📞 Contact Real Person', query: 'Talk to real person' }
      ]
    };
  }

  // 15. DEFAULT SMART DOMAIN FALLBACK
  return {
    text: `I've noted your question regarding "${clean}".\n\nAt Giriraj Power (Kasba, Kolkata), we provide **60-minute express delivery**, 100% genuine ISI certified electricals (Polycab, Havells, Schneider, Anchor), verified electrician services, and official GST invoices.\n\nWould you like technical wire specifications, delivery updates, or to connect directly with our human support desk?`,
    suggestedActions: [
      { label: '⚡ Wire Gauge Guide', query: 'Wire gauge recommendations' },
      { label: '🚀 60-Min Delivery', query: 'How fast is delivery?' },
      { label: '📞 Talk to Human Agent', query: 'Talk to real person' }
    ]
  };
}

function getLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem('smartrun_user_orders') || localStorage.getItem('gp_orders');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // ignore
  }
  return [];
}
