import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  Zap,
  Hammer,
  Users,
  FileText,
  ShieldCheck,
  RotateCcw,
  Truck,
  HelpCircle,
  Building2,
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  User,
  Radio,
  FileCode2,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { SEOHead } from './SEOHead';
import { INITIAL_PRODUCTS } from '../data/products';

export const SitemapPage: React.FC = () => {
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState('');

  const electricalProducts = INITIAL_PRODUCTS.filter(p => p.category === 'electrical').slice(0, 10);
  const constructionProducts = INITIAL_PRODUCTS.filter(p => p.category === 'construction').slice(0, 10);

  const mainSections = [
    {
      title: 'Marketplaces & Hubs',
      description: 'Primary shopping storefronts and service directories',
      icon: Boxes,
      iconColor: 'text-amber-600 bg-amber-50',
      links: [
        { name: 'Home Page', path: '/', desc: 'Central electrical & construction store' },
        { name: 'Electrical Depot', path: '/electrical', desc: 'Copper wires, modular switches, MCBs, LED lighting' },
        { name: 'Construction Materials', path: '/construction', desc: 'UltraTech cement, Tata TMT steel, waterproofing' },
        { name: 'Certified Technicians', path: '/technicians', desc: 'Licensed electricians, house wiring contractors' },
      ]
    },
    {
      title: 'Customer Account & Services',
      description: 'Order management, live tracking, and profile settings',
      icon: User,
      iconColor: 'text-blue-600 bg-blue-50',
      links: [
        { name: 'Sign In / Register', path: '/login', desc: 'Instant OTP and email login portal' },
        { name: 'Shopping Cart', path: '/cart', desc: 'View cart, bill breakdown, and instant checkout' },
        { name: 'My Orders & Invoices', path: '/orders', desc: 'Past purchases, tax invoices, and reorder' },
        { name: 'Live GPS Order Tracking', path: '/live-order', desc: 'Real-time delivery partner map and rider contact' },
        { name: 'Profile & Saved Addresses', path: '/profile', desc: 'Manage delivery addresses and account details' },
        { name: 'Reset Password', path: '/reset-password', desc: 'Account password recovery' }
      ]
    },
    {
      title: 'Company & Help Center',
      description: 'Customer support, corporate background, and answers',
      icon: Building2,
      iconColor: 'text-emerald-600 bg-emerald-50',
      links: [
        { name: 'About SmartRun', path: '/about', desc: 'Kolkata express electricals and quick commerce history' },
        { name: 'Frequently Asked Questions', path: '/faqs', desc: 'Answers on 60-min delivery, bulk discounts, GST invoices' }
      ]
    },
    {
      title: 'Policies & Legal Compliance',
      description: 'Consumer protection, shipping rules, and statutory disclosures',
      icon: ShieldCheck,
      iconColor: 'text-indigo-600 bg-indigo-50',
      links: [
        { name: 'Refund & Cancellation Policy', path: '/refund-policy', desc: '7-day replacement, direct source refund guarantees' },
        { name: 'Shipping & Delivery Policy', path: '/shipping-policy', desc: '60-minute express courier delivery rules and zones' },
        { name: 'Privacy Policy', path: '/privacy', desc: 'Data protection and information security practices' },
        { name: 'Terms of Service', path: '/terms', desc: 'Platform usage agreement, warranties, and jurisdiction' },
        { name: 'Account & Data Deletion Portal', path: '/account-deletion', desc: 'Google Play policy compliant permanent deletion' }
      ]
    }
  ];

  const q = filterQuery.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <SEOHead
        title="Sitemap & Directory | SmartRun Express Electricals Kolkata"
        description="Explore the complete site directory of SmartRun: electrical supplies, building materials, certified electrician services, company policies, and direct links."
        keywords="SmartRun sitemap, site directory, electrical goods kolkata, construction supplies directory, sitemap xml"
      />

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Sitemap & Directory
            </h1>
          </div>

          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Machine XML</span>
            <span>sitemap.xml</span>
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Intro Banner */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                Official Directory
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Explore All SmartRun Pages & Catalogs
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
                Quick index for users and search engine crawlers covering electrical wholesale items, construction materials, licensed technicians, and compliance documents.
              </p>
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter pages or products..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Structured Grid Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mainSections.map((section) => {
            const matchedLinks = section.links.filter(
              (l) => !q || l.name.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q) || l.path.toLowerCase().includes(q)
            );
            if (q && matchedLinks.length === 0) return null;

            const Icon = section.icon;

            return (
              <div
                key={section.title}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-xl ${section.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {section.title}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-slate-100 mt-3">
                    {matchedLinks.map((link) => (
                      <li key={link.path}>
                        <button
                          type="button"
                          onClick={() => navigate(link.path)}
                          className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                              {link.name}
                            </span>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {link.desc}
                            </p>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 group-hover:text-amber-600 shrink-0 ml-2 flex items-center gap-1">
                            {link.path}
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Featured Products Catalogs */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Electrical Top Products */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Featured Electrical Products
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/electrical')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                View all →
              </button>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {electricalProducts
                .filter((p) => !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
                .map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/electrical/product/${product.id}`)}
                      className="w-full text-left py-2 hover:bg-slate-50 px-2 -mx-2 rounded-md flex items-center justify-between group"
                    >
                      <span className="text-slate-800 group-hover:text-amber-700 font-medium truncate pr-2">
                        {product.name}
                      </span>
                      <span className="text-slate-500 shrink-0 font-semibold">
                        ₹{product.price}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>

          {/* Construction Top Products */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Featured Construction Materials
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/construction')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                View all →
              </button>
            </div>
            <ul className="divide-y divide-slate-100 text-xs">
              {constructionProducts
                .filter((p) => !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
                .map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/construction/product/${product.id}`)}
                      className="w-full text-left py-2 hover:bg-slate-50 px-2 -mx-2 rounded-md flex items-center justify-between group"
                    >
                      <span className="text-slate-800 group-hover:text-blue-700 font-medium truncate pr-2">
                        {product.name}
                      </span>
                      <span className="text-slate-500 shrink-0 font-semibold">
                        ₹{product.price}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* XML Crawler Notice */}
        <div className="mt-8 bg-slate-100/80 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">For Search Engine Crawlers & Developers:</span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              The automated XML sitemap is synchronized daily at <code className="bg-white px-1.5 py-0.5 rounded text-slate-800 border border-slate-200 font-mono text-[10px]">https://www.smartrun.in/sitemap.xml</code> with robots.txt directives.
            </p>
          </div>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold shrink-0"
          >
            Open XML feed <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
};
