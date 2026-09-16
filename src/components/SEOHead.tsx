import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  productData?: {
    name: string;
    description?: string;
    price: number;
    brand?: string;
    image?: string;
    inStock?: boolean;
    rating?: number;
    reviewsCount?: number;
  };
}

export const SEOHead = ({
  title,
  description,
  keywords,
  image,
  productData
}: SEOHeadProps) => {
  const location = useLocation();

  useEffect(() => {
    // 1. Dynamic Page Titles
    const baseTitle = 'SmartRun | Kolkata Electrical Goods, Construction Supplies & Wiring Services';
    let computedTitle = title || baseTitle;

    if (!title) {
      if (location.pathname === '/') {
        computedTitle = 'SmartRun | Buy Electrical Goods, Construction Materials & Wiring Services Kolkata';
      } else if (location.pathname.startsWith('/electrical')) {
        computedTitle = 'Buy Electrical Goods & House Wiring Cables Online Kolkata | SmartRun';
      } else if (location.pathname.startsWith('/construction')) {
        computedTitle = 'Order Cement, TMT Steel & Construction Materials Online Kolkata | SmartRun';
      } else if (location.pathname.startsWith('/services')) {
        computedTitle = 'Certified House Wiring & Real Estate Electrification Contractors Kolkata | SmartRun';
      } else if (location.pathname === '/privacy' || location.pathname === '/privacy-policy') {
        computedTitle = 'Privacy Policy | SmartRun';
      } else if (location.pathname === '/terms' || location.pathname === '/terms-of-service') {
        computedTitle = 'Terms of Service | SmartRun';
      } else if (location.pathname === '/refund-policy' || location.pathname === '/refunds') {
        computedTitle = 'Refund & Cancellation Policy | SmartRun';
      } else if (location.pathname === '/shipping-policy' || location.pathname === '/shipping') {
        computedTitle = 'Shipping & Delivery Policy | SmartRun';
      } else if (location.pathname === '/about' || location.pathname === '/about-us') {
        computedTitle = 'About Us | SmartRun Kolkata';
      } else if (location.pathname === '/faqs' || location.pathname === '/faq') {
        computedTitle = 'Frequently Asked Questions (FAQ) | SmartRun';
      }
    }

    document.title = computedTitle;

    // 2. Dynamic Meta Description
    const defaultDesc =
      'SmartRun: Kolkata’s trusted supplier for electrical goods, modular switches, Polycab & Havells wires, electronics, UltraTech cement, Tata Tiscon TMT bars, and certified house & real estate wiring contractors with 60-minute express delivery.';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description || defaultDesc);
    }

    // 3. Dynamic Meta Keywords
    const defaultKeywords =
      'SmartRun, smartrun, smartrun kolkata, smartrun electricals, BuildNow, build now kolkata, electrical shop near me, buy electrical goods online Kolkata, house wiring contractor, electrical wiring services, modular switches, Polycab wire, Havells cables, Finolex wire, Schneider MCB, distribution board, LED lighting, construction materials Kolkata, cement delivery, UltraTech cement, ACC cement, TMT steel bars, Tata Tiscon rebars, waterproofing chemicals, real estate electrification, licensed electrician Kolkata, Kasba electrical shop, wholesale electrical market Kolkata, B2B building materials procurement, direct depot Kolkata';
    const metaKey = document.querySelector('meta[name="keywords"]');
    if (metaKey) {
      metaKey.setAttribute('content', keywords || defaultKeywords);
    }

    // 4. Update OpenGraph Tags & Canonical URL
    const canonicalUrl = `https://www.smartrun.in${location.pathname === '/' ? '/' : location.pathname}`;

    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', computedTitle);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description || defaultDesc);

    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute('content', image || 'https://www.smartrun.in/smartrun.jpeg');

    // 5. Inject Dynamic Product Schema if on a product page
    let productScriptTag = document.getElementById('dynamic-product-jsonld');
    if (productData) {
      if (!productScriptTag) {
        productScriptTag = document.createElement('script');
        productScriptTag.id = 'dynamic-product-jsonld';
        productScriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(productScriptTag);
      }

      const productSchema = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productData.name,
        image: productData.image || 'https://i.imgur.com/tGG9UN0.png',
        description: productData.description || `${productData.name} available at Giriraj Power Kolkata with express delivery.`,
        brand: {
          '@type': 'Brand',
          name: productData.brand || 'Giriraj Power'
        },
        offers: {
          '@type': 'Offer',
          url: window.location.href,
          priceCurrency: 'INR',
          price: productData.price,
          availability: productData.inStock !== false ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'Giriraj Power'
          }
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: productData.rating || 4.8,
          reviewCount: productData.reviewsCount || 42
        }
      };

      productScriptTag.textContent = JSON.stringify(productSchema);
    } else if (productScriptTag) {
      productScriptTag.remove();
    }
  }, [location.pathname, title, description, keywords, image, productData]);

  return null;
};
