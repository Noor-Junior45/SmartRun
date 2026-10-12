import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Palette, MapPin, Wrench, ShoppingBag, Truck, User, MessageCircle } from 'lucide-react';
import { SEOHead } from './SEOHead';

interface HowToUseAppPageProps {
  onBack?: () => void;
}

export const HowToUseAppPage: React.FC<HowToUseAppPageProps> = ({ onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const tableOfContents = [
    { id: 'step-search', no: '1', title: 'Find & Search Products', summary: 'Search electrical wires, switches, cement, and tools fast' },
    { id: 'step-colors', no: '2', title: 'Choose Colors & Quantities', summary: 'Pick wire colors to see live photos and instant pricing' },
    { id: 'step-pincode', no: '3', title: 'Check 60-Minute Delivery', summary: 'Enter your 6-digit Kolkata pincode for instant confirmation' },
    { id: 'step-technicians', no: '4', title: 'Book Verified Electricians', summary: 'Browse certified electricians for house wiring and repairs' },
    { id: 'step-checkout', no: '5', title: 'Cart & Easy Payments', summary: 'Pay easily with UPI, Cash on Delivery (COD), or Cards' },
    { id: 'step-tracking', no: '6', title: 'Track Live Orders & Invoices', summary: 'Watch your delivery rider on the map and download GST invoices' },
    { id: 'step-profile', no: '7', title: 'Manage Profile & Addresses', summary: 'Save delivery locations, manage wallet, and account details' },
    { id: 'step-help', no: '8', title: 'Customer Support on WhatsApp', summary: 'Chat directly with our Kasba warehouse support desk' }
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] text-[#2C261E] pb-24 font-sans">
      <SEOHead
        title="How to Use App | User Guide & Instructions | SmartRun"
        description="Learn how to use SmartRun to order genuine electrical goods, construction materials, and book certified electricians in Kolkata with 60-minute express delivery."
        keywords="how to use smartrun, app user guide, smartrun guide, order electricals kolkata, book electrician"
      />

      {/* Top Header: Simple Heading 'How to use app' and Arrow Back Button in the same line with Beige Background */}
      <div className="bg-[#F9F6F0] border-b border-[#E6DEC8] sticky top-0 z-20 px-4 sm:px-6 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            id="btn-how-to-use-back"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-[#EFE9DC] active:bg-[#E5DEC7] text-[#2C261E] transition-colors cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-[#2C261E] tracking-tight whitespace-nowrap">
            How to use app
          </h1>
        </div>
      </div>

      {/* Main Content Area - Box Design with Warm Beige Styling */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Intro Box */}
        <section className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-2">
          <h2 className="text-base sm:text-lg font-bold text-[#2C261E]">
            Welcome to SmartRun
          </h2>
          <p className="text-sm sm:text-base text-[#4A4235] leading-relaxed">
            SmartRun is Kolkata’s quick-commerce platform for genuine electrical goods, construction supplies, and certified electrician services. This simple guide explains how to get the most out of the app.
          </p>
        </section>

        {/* Content Table Box - Mobile Optimized Card List */}
        <section className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-4">
          <div className="border-b border-[#E6DEC8] pb-2.5">
            <h2 className="text-base sm:text-lg font-bold text-[#2C261E]">
              Content table
            </h2>
            <p className="text-xs sm:text-sm text-[#7C7469] mt-0.5">
              Tap any topic below to jump directly to its instructions.
            </p>
          </div>

          <div className="space-y-2">
            {tableOfContents.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF9F4] hover:bg-[#F3EDE0] border border-[#EFE9DC] transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[#EAE2D0] text-[#2C261E] font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#2C261E] group-hover:text-white transition-colors">
                  {item.no}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-[#2C261E] group-hover:text-amber-900 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B6254] mt-0.5 line-clamp-2">
                    {item.summary}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Step 1 Box: Search & Browse */}
        <section id="step-search" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                1. Find &amp; Search Products
              </h3>
              <p className="text-xs text-[#7C7469]">Browse wires, switches, MCBs, cement, and tools</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              Use the top search bar to type any product name, brand, or wire size (such as <em>Polycab 2.5 sq mm</em>, <em>Schneider switch</em>, or <em>UltraTech Cement</em>).
            </p>
            <p>
              You can also switch categories from the Home page between <strong>Electrical Depot</strong> and <strong>Construction Materials</strong>.
            </p>
            <p>
              Each product shows wholesale pricing and discount information clearly so you always get the best rates.
            </p>
          </div>
        </section>

        {/* Step 2 Box: Wire Colors & Quantities */}
        <section id="step-colors" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                2. Choose Wire Colors &amp; Quantities
              </h3>
              <p className="text-xs text-[#7C7469]">Live photos and pricing change with color selection</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              When viewing any electrical wire, tap the color swatches below the image (Red, Black, Green, Blue, or Yellow).
            </p>
            <p>
              Selecting a color immediately updates the product picture and shows the exact price for that specific color spool.
            </p>
            <p>
              Use the <strong>+</strong> and <strong>-</strong> buttons to set your required quantity, then tap <strong>Add to Cart</strong> or <strong>Buy Now</strong>.
            </p>
          </div>
        </section>

        {/* Step 3 Box: 60-Minute Delivery & Pincode */}
        <section id="step-pincode" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                3. Check 60-Minute Delivery
              </h3>
              <p className="text-xs text-[#7C7469]">Fast dispatch from Kasba warehouse hub</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              On any product detail page, find the <strong>Delivery</strong> box and enter your 6-digit postal pincode.
            </p>
            <p>
              If your location is within our express delivery area, the app confirms 60-minute courier dispatch right away.
            </p>
            <p>
              You can also tap the location bar at the top of the screen anytime to select or update your saved delivery address.
            </p>
          </div>
        </section>

        {/* Step 4 Box: Book Electricians */}
        <section id="step-technicians" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                4. Book Licensed Electricians
              </h3>
              <p className="text-xs text-[#7C7469]">Verified technicians for home wiring and repairs</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              Tap the <strong>Technician</strong> tab in the bottom menu to browse verified electricians across Kolkata.
            </p>
            <p>
              Check each electrician’s rating, years of experience, specialized skills (such as full flat wiring or distribution boards), and starting rates.
            </p>
            <p>
              Tap <strong>Book Service</strong> to schedule a visit or tap the call button to contact the technician directly.
            </p>
          </div>
        </section>

        {/* Step 5 Box: Cart & Checkout */}
        <section id="step-checkout" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                5. Place Orders &amp; Pay Safely
              </h3>
              <p className="text-xs text-[#7C7469]">UPI, Cash on Delivery, and Cards</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              Tap the <strong>Cart</strong> icon at any time to review your selected items, quantities, and transparent bill breakdown.
            </p>
            <p>
              Choose your saved delivery address or enter a new one with your building, flat number, and contact phone.
            </p>
            <p>
              Pick your preferred payment option:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#5A5245]">
              <li><strong>UPI:</strong> Pay instantly using Google Pay, PhonePe, Paytm, or BHIM.</li>
              <li><strong>Cash on Delivery (COD):</strong> Pay cash or UPI directly to the delivery rider upon delivery.</li>
              <li><strong>Debit / Credit Cards &amp; Net Banking:</strong> Secure online checkout powered by Razorpay.</li>
            </ul>
          </div>
        </section>

        {/* Step 6 Box: Live Order Tracking & Invoices */}
        <section id="step-tracking" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                6. Track Live Orders &amp; Invoices
              </h3>
              <p className="text-xs text-[#7C7469]">Live GPS delivery partner map and official GST PDF</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              After placing an order, tap <strong>Orders</strong> in the profile menu or use the live tracking shortcut on your screen.
            </p>
            <p>
              Watch your delivery partner move in real time on the map, complete with bike registration number and direct call option.
            </p>
            <p>
              Every delivered order includes a <strong>Download Invoice</strong> button to save an official GST tax invoice PDF.
            </p>
          </div>
        </section>

        {/* Step 7 Box: Profile & Addresses */}
        <section id="step-profile" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                7. Managing Profile, Addresses &amp; Wallet
              </h3>
              <p className="text-xs text-[#7C7469]">Personal details, saved sites, and refund balances</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-2 leading-relaxed">
            <p>
              Tap the <strong>Profile</strong> tab to update your name, email, and contact phone number.
            </p>
            <p>
              In <strong>Addresses</strong>, save frequently used locations (like Home, Office, or Project Site) for faster checkout.
            </p>
            <p>
              In <strong>Wallet</strong>, view any instant refund balances or cashback credits from your orders.
            </p>
          </div>
        </section>

        {/* Step 8 Box: WhatsApp Support */}
        <section id="step-help" className="bg-[#FFFDF9] border border-[#E6DEC8] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(40,30,10,0.04)] space-y-3.5 scroll-mt-20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5F0E4] border border-[#E6DEC8] text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2C261E]">
                8. Customer Support on WhatsApp
              </h3>
              <p className="text-xs text-[#7C7469]">Direct help from our central Kasba warehouse hub</p>
            </div>
          </div>
          <div className="text-sm text-[#5A5245] space-y-3 leading-relaxed">
            <p>
              Our support team is available on WhatsApp every day from 8:00 AM to 10:00 PM to assist with product inquiries, bulk orders, or delivery tracking.
            </p>
            <div>
              <a
                href="https://wa.me/918777400280?text=Hello%20SmartRun,%20I%20need%20assistance%20using%20the%20app."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2C261E] hover:bg-[#3D352A] text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Chat with Support on WhatsApp</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};
