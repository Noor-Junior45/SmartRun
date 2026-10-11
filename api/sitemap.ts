import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

  const possiblePaths = [
    path.join(process.cwd(), 'public', 'sitemap.xml'),
    path.join(process.cwd(), 'dist', 'sitemap.xml'),
    path.join(__dirname, '..', 'public', 'sitemap.xml')
  ];

  for (const sitemapPath of possiblePaths) {
    if (fs.existsSync(sitemapPath)) {
      const xml = fs.readFileSync(sitemapPath, 'utf8');
      return res.status(200).send(xml);
    }
  }

  // Fallback inline XML in case filesystem is isolated
  const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.smartrun.in/</loc><priority>1.0</priority></url>
  <url><loc>https://www.smartrun.in/electrical</loc><priority>0.95</priority></url>
  <url><loc>https://www.smartrun.in/construction</loc><priority>0.95</priority></url>
  <url><loc>https://www.smartrun.in/technicians</loc><priority>0.90</priority></url>
  <url><loc>https://www.smartrun.in/sitemap</loc><priority>0.80</priority></url>
  <url><loc>https://www.smartrun.in/about</loc><priority>0.70</priority></url>
  <url><loc>https://www.smartrun.in/faqs</loc><priority>0.70</priority></url>
  <url><loc>https://www.smartrun.in/refund-policy</loc><priority>0.65</priority></url>
  <url><loc>https://www.smartrun.in/shipping-policy</loc><priority>0.65</priority></url>
  <url><loc>https://www.smartrun.in/privacy</loc><priority>0.60</priority></url>
  <url><loc>https://www.smartrun.in/terms</loc><priority>0.60</priority></url>
  <url><loc>https://www.smartrun.in/login</loc><priority>0.50</priority></url>
</urlset>`;

  return res.status(200).send(fallbackXml);
}
