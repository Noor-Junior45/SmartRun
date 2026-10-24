import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product' | 'profile';
  noIndex?: boolean;
  breadcrumbs?: Array<{ name: string; path: string }>;
  productData?: {
    name: string;
    description?: string;
    price: number;
    brand?: string;
    image?: string;
    inStock?: boolean;
    rating?: number;
    reviewsCount?: number;
    category?: string;
  };
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

// Helpers for robust meta tag injection
const setOrUpdateMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const setOrUpdateCanonical = (href: string) => {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  image,
  type = 'website',
  noIndex,
  breadcrumbs,
  productData,
  structuredData
}) => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // 1. Determine Title & Meta Defaults Based on Current Route
    let defaultTitle = 'SmartRun (Smart Run) | Electrical Goods, Construction Supplies & Wiring Services Kolkata';
    let defaultDesc =
      'SmartRun (Smart Run) by SmartRun materials pvt. ltd: Kolkata’s trusted depot for electrical goods, modular switches, Polycab & Havells wires, UltraTech cement, Tata Tiscon TMT bars, and certified house wiring contractors with 60-minute express delivery.';
    let defaultKeywords =
      'Smart Run, SmartRun, smart run, smartrun, smart run app, smartrun app, smart run kolkata, smart run electricals, smart run apk, smart run download, smart run play store, SmartRun materials pvt ltd, SmartRun materials pvt. ltd, electrical shop near me, buy electrical goods online Kolkata, house wiring contractor, electrical wiring services, modular switches, Polycab wire, Havells cables, Finolex wire, Schneider MCB, distribution board, LED lighting, construction materials Kolkata, cement delivery, UltraTech cement, ACC cement, TMT steel bars, Tata Tiscon rebars, waterproofing chemicals, real estate electrification, licensed electrician Kolkata, Kasba electrical shop, wholesale electrical market Kolkata, B2B building materials procurement, direct depot Kolkata';
    let defaultType = type;
    let shouldNoIndex = noIndex ?? false;

    if (path === '/') {
      defaultTitle = 'SmartRun (Smart Run) | Buy Electrical Goods, Construction Materials & Wiring Services Kolkata';
      defaultDesc = 'Order genuine electrical supplies, house wiring cables, modular switches, UltraTech cement, and TMT steel bars on SmartRun (Smart Run) with 60-minute express delivery across Kolkata.';
    } else if (path === '/electrical') {
      defaultTitle = 'Electrical Goods & House Wiring Cables Wholesale Kolkata | SmartRun';
      defaultDesc = 'Shop RR Kabel, Polycab, Havells copper wires, Schneider MCBs, distribution boards, and modular switches at factory-direct wholesale prices in Kolkata.';
      defaultKeywords = 'electrical goods kolkata, polycab wire kolkata, rr kabel online, buy switches kolkata, schneider mcb, distribution board, electrical depot kolkata';
    } else if (path.startsWith('/electrical/product/') || path.startsWith('/product/')) {
      defaultType = 'product';
      defaultTitle = 'Genuine Electrical Supply & Hardware | SmartRun Kolkata Depot';
      defaultDesc = 'Buy genuine electrical goods with manufacturer warranty and 60-minute doorstep express delivery across Kolkata.';
    } else if (path === '/construction') {
      defaultTitle = 'Building Materials, UltraTech Cement & Tata TMT Steel Kolkata | SmartRun';
      defaultDesc = 'Procure construction supplies online: UltraTech & ACC cement, Tata Tiscon TMT rebars, waterproofing chemicals, and plumbing pipes with direct site delivery in Kolkata.';
      defaultKeywords = 'construction materials kolkata, ultratech cement kolkata, tata tiscon tmt rebars, building materials procurement, dr fixit waterproofing';
    } else if (path.startsWith('/construction/product/')) {
      defaultType = 'product';
      defaultTitle = 'Construction Materials & Building Supplies | SmartRun Kolkata';
      defaultDesc = 'High-grade certified construction materials, structural cement, and hardware supplies delivered on-demand to construction sites in Kolkata.';
    } else if (path === '/technicians') {
      defaultTitle = 'Certified Electricians & House Wiring Contractors Kolkata | SmartRun';
      defaultDesc = 'Book verified, licensed electrical contractors, home wiring technicians, switchboard repair, and industrial electrification specialists in Kolkata with instant booking.';
      defaultKeywords = 'electrician kolkata, licensed electrical contractor, home wiring specialist, switchboard repair kolkata, real estate electrification';
    } else if (path.startsWith('/technicians/')) {
      defaultTitle = 'Certified Electrician Specialist Profile | SmartRun Kolkata';
      defaultDesc = 'View verified technician expertise, government license details, customer ratings, and book on-site electrical wiring services in Kolkata.';
    } else if (path === '/cart') {
      defaultTitle = 'Shopping Cart & Instant Checkout | SmartRun Kolkata';
      defaultDesc = 'Review your electrical supplies and building materials cart with instant express delivery to your doorstep in Kolkata.';
      shouldNoIndex = true;
    } else if (path === '/orders') {
      defaultTitle = 'My Orders & Tax Invoices | SmartRun Express Depot';
      defaultDesc = 'View your active orders, past delivery history, download GST invoices, and reorder electrical supplies on SmartRun.';
      shouldNoIndex = true;
    } else if (path.startsWith('/live-order')) {
      defaultTitle = 'Live Order Tracking & GPS Delivery | SmartRun';
      defaultDesc = 'Track your SmartRun express delivery partner in real-time with live GPS coordinates, vehicle registration details, and instant rider contact.';
      shouldNoIndex = true;
    } else if (path === '/profile') {
      defaultTitle = 'My Profile & Saved Addresses | SmartRun';
      defaultDesc = 'Manage your SmartRun profile, saved job site addresses, wallet balance, GST tax details, and account preferences.';
      shouldNoIndex = true;
    } else if (path === '/login' || path === '/auth') {
      defaultTitle = 'Sign In / Register | SmartRun Express Electricals';
      defaultDesc = 'Sign in to your SmartRun account with mobile OTP or email to track express delivery orders, manage addresses, and access wholesale pricing.';
      defaultKeywords = 'smartrun login, smartrun sign in, electrical depot account, mobile otp login';
    } else if (path === '/reset-password') {
      defaultTitle = 'Reset Password | SmartRun';
      defaultDesc = 'Securely reset your password for your SmartRun customer account.';
      shouldNoIndex = true;
    } else if (path === '/sitemap') {
      defaultTitle = 'Sitemap & Directory | SmartRun Express Electricals Kolkata';
      defaultDesc = 'Explore the complete directory of SmartRun: electrical supplies, building materials, certified electrician services, company policies, and direct links.';
      defaultKeywords = 'smartrun sitemap, site directory, electrical goods directory, construction materials index';
    } else if (path === '/about' || path === '/about-us') {
      defaultTitle = 'About Us | SmartRun Express Electricals Kolkata';
      defaultDesc = 'Learn about SmartRun, Kolkata’s premier quick-commerce depot supplying genuine electrical goods, construction materials, and certified electrician wiring services.';
    } else if (path === '/faqs' || path === '/faq') {
      defaultTitle = 'Frequently Asked Questions (FAQ) | SmartRun';
      defaultDesc = 'Find answers about 60-minute express delivery, order tracking, bulk contractor discounts, GST invoices, and return policies on SmartRun.';
    } else if (path === '/refund-policy' || path === '/refunds') {
      defaultTitle = 'Refund & Cancellation Policy | SmartRun Kolkata';
      defaultDesc = 'Read SmartRun’s customer-first refund and return policy: 7-day hassle-free replacements and instant direct-to-source refunds.';
    } else if (path === '/shipping-policy' || path === '/shipping') {
      defaultTitle = 'Shipping & Delivery Policy | SmartRun Kolkata';
      defaultDesc = 'Learn about SmartRun’s 60-minute express courier delivery, service radius in Kolkata & Howrah, packaging standards, and tracking.';
    } else if (path === '/privacy' || path === '/privacy-policy') {
      defaultTitle = 'Privacy Policy | SmartRun';
      defaultDesc = 'Understand how SmartRun collects, protects, and handles personal information in compliance with Indian IT Rules and data protection standards.';
    } else if (path === '/terms' || path === '/terms-of-service') {
      defaultTitle = 'Terms of Service | SmartRun';
      defaultDesc = 'Review the legal terms and conditions governing the use of SmartRun website, mobile app, order placement, and electrician services.';
    } else if (path === '/delete' || path === '/account-deletion') {
      defaultTitle = 'Account & Data Deletion Portal | SmartRun';
      defaultDesc = 'Submit a request to permanently delete your SmartRun account and personal data in accordance with Google Play Developer policies.';
      shouldNoIndex = true;
    }

    // Product overrides
    if (productData) {
      defaultTitle = `${productData.name} | SmartRun Kolkata Depot`;
      defaultDesc = `Buy ${productData.name} online at ₹${productData.price} with 60-minute express delivery in Kolkata. 100% genuine with warranty at SmartRun.`;
    }

    const computedTitle = title || defaultTitle;
    const computedDesc = description || defaultDesc;
    const computedKeywords = keywords || defaultKeywords;
    const computedImage = image || (productData?.image) || 'https://www.smartrun.in/SmartRun.png';
    const canonicalUrl = `https://www.smartrun.in${path === '/' ? '/' : path}`;

    // 2. Set Document Title
    document.title = computedTitle;

    // 3. Set Primary HTML Meta Tags
    setOrUpdateMeta('name', 'title', computedTitle);
    setOrUpdateMeta('name', 'description', computedDesc);
    setOrUpdateMeta('name', 'keywords', computedKeywords);
    setOrUpdateMeta(
      'name',
      'robots',
      shouldNoIndex
        ? 'noindex, follow'
        : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'
    );

    // 4. Set Canonical Link
    setOrUpdateCanonical(canonicalUrl);

    // 5. Set OpenGraph Meta Tags
    setOrUpdateMeta('property', 'og:type', defaultType);
    setOrUpdateMeta('property', 'og:site_name', 'SmartRun');
    setOrUpdateMeta('property', 'og:url', canonicalUrl);
    setOrUpdateMeta('property', 'og:title', computedTitle);
    setOrUpdateMeta('property', 'og:description', computedDesc);
    setOrUpdateMeta('property', 'og:image', computedImage);
    setOrUpdateMeta('property', 'og:image:alt', computedTitle);
    setOrUpdateMeta('property', 'og:locale', 'en_IN');

    // 6. Set Twitter Card Meta Tags
    setOrUpdateMeta('name', 'twitter:card', 'summary_large_image');
    setOrUpdateMeta('name', 'twitter:site', '@SmartRunIn');
    setOrUpdateMeta('name', 'twitter:title', computedTitle);
    setOrUpdateMeta('name', 'twitter:description', computedDesc);
    setOrUpdateMeta('name', 'twitter:image', computedImage);

    // 7. Inject Structured Data (JSON-LD)
    const scriptId = 'smartrun-dynamic-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaGraph: Array<Record<string, unknown>> = [];

    // BreadcrumbList Schema
    const breadcrumbItems: Array<{ '@type': string; position: number; name: string; item: string }> = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.smartrun.in/'
      }
    ];

    if (breadcrumbs && breadcrumbs.length > 0) {
      breadcrumbs.forEach((b, idx) => {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: idx + 2,
          name: b.name,
          item: b.path.startsWith('http') ? b.path : `https://www.smartrun.in${b.path}`
        });
      });
    } else if (path.startsWith('/electrical')) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Electrical Goods',
        item: 'https://www.smartrun.in/electrical'
      });
      if (productData) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: 3,
          name: productData.name,
          item: canonicalUrl
        });
      }
    } else if (path.startsWith('/construction')) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Construction Materials',
        item: 'https://www.smartrun.in/construction'
      });
      if (productData) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: 3,
          name: productData.name,
          item: canonicalUrl
        });
      }
    } else if (path.startsWith('/technicians')) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Certified Technicians',
        item: 'https://www.smartrun.in/technicians'
      });
    } else if (path === '/sitemap') {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'Sitemap',
        item: 'https://www.smartrun.in/sitemap'
      });
    }

    schemaGraph.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems
    });

    // Specific Product Schema
    if (productData) {
      schemaGraph.push({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productData.name,
        image: computedImage,
        description: productData.description || `${productData.name} available at SmartRun Kolkata with 60-min express delivery.`,
        brand: {
          '@type': 'Brand',
          name: productData.brand || 'SmartRun'
        },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'INR',
          price: productData.price,
          availability: productData.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'SmartRun',
            legalName: 'SmartRun materials pvt. ltd',
            url: 'https://www.smartrun.in/'
          }
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: productData.rating || 4.8,
          reviewCount: productData.reviewsCount || 42
        }
      });
    }

    // Specific FAQPage Schema
    if (path === '/faqs' || path === '/faq') {
      schemaGraph.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How fast is express delivery from SmartRun?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'SmartRun delivers verified electrical supplies and emergency components within 60 minutes across Kolkata and surrounding operational zones.'
            }
          },
          {
            '@type': 'Question',
            name: 'Are all electrical goods and cables genuine?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, 100% of our inventory is sourced directly from verified manufacturers including Polycab, RR Kabel, Havells, Schneider Electric, Legrand, and UltraTech.'
            }
          },
          {
            '@type': 'Question',
            name: 'Can I get GST tax invoices for business procurement?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, every order includes a statutory GST tax invoice with your registered GSTIN for full input tax credit (ITC) claims.'
            }
          }
        ]
      });
    }

    // Custom injected structured data
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        schemaGraph.push(...structuredData);
      } else {
        schemaGraph.push(structuredData);
      }
    }

    scriptTag.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': schemaGraph
    });

  }, [
    location.pathname,
    title,
    description,
    keywords,
    image,
    type,
    noIndex,
    breadcrumbs,
    productData,
    structuredData
  ]);

  return null;
};
