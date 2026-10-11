// BuildNow Service Worker
// Version: 2.2.0

const isDevOrPreviewHost =
  self.location.hostname.includes('ais-dev') ||
  self.location.hostname.includes('ais-pre') ||
  self.location.hostname.includes('run.app') ||
  self.location.hostname.includes('localhost') ||
  self.location.hostname.includes('127.0.0.1');

if (isDevOrPreviewHost) {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        return self.clients.claim();
      })
    );
  });
}

const CACHE_PREFIX = 'smartrun';
const CACHE_VERSION = 'v2.3.0';

const CACHES = {
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
  runtime: `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`,
};

// Core app shell assets to precache on installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/smartrun.jpeg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Maximum number of cached images to prevent storage bloat
const MAX_IMAGE_ENTRIES = 160;

// Fallback SVG image data URI when totally offline and image is not cached
const OFFLINE_IMAGE_FALLBACK_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="%23f8fafc"><rect width="400" height="400" fill="%23f1f5f9"/><circle cx="200" cy="180" r="48" fill="%23e2e8f0"/><path d="M120 310 L280 310 L250 240 L200 280 L160 230 Z" fill="%23cbd5e1"/><text x="200" y="345" font-family="sans-serif" font-size="14" font-weight="600" fill="%2394a3b8" text-anchor="middle">SmartRun Offline Image</text></svg>';

/**
 * Clean up old cache entries if cache exceeds max size (LRU-like eviction)
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Remove oldest items first
      const itemsToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));
    }
  } catch (e) {
    // Ignore cache trimming errors
  }
}

// ---------------------------------------------------------------------------
// 1. INSTALL LIFECYCLE
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(CACHES.static);
      try {
        await staticCache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn('[SW] Pre-caching partial notice:', err);
      }
      // Force new service worker to activate immediately without waiting for client restart
      await self.skipWaiting();
    })()
  );
});

// ---------------------------------------------------------------------------
// 2. ACTIVATE LIFECYCLE: Purge obsolete cache buckets
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const validCacheNames = new Set(Object.values(CACHES));
      const existingCacheNames = await caches.keys();

      await Promise.all(
        existingCacheNames.map((name) => {
          if (!validCacheNames.has(name) && name.startsWith(CACHE_PREFIX)) {
            console.log('[SW] Deleting obsolete cache bucket:', name);
            return caches.delete(name);
          }
          return Promise.resolve();
        })
      );

      // Claim all clients immediately so page navigations benefit right away
      await self.clients.claim();
    })()
  );
});

// ---------------------------------------------------------------------------
// 3. FETCH INTERCEPTION & STRATEGIES
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (isDevOrPreviewHost) {
    return;
  }

  const request = event.request;

  // Rule 1: Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Rule 2: NEVER cache or intercept real-time / dynamic server APIs, Auth, Vite dev paths, or Payment endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/rest') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.hostname.includes('ais-dev') ||
    url.hostname.includes('supabase.co/auth') ||
    url.hostname.includes('supabase.co/rest') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('razorpay.com') ||
    url.hostname.includes('checkout.stripe.com') ||
    url.hostname.includes('accounts.google.com')
  ) {
    return;
  }

  // -------------------------------------------------------------------------
  // STRATEGY A: Product Images & Media Assets (Cache First + Stale-While-Revalidate)
  // -------------------------------------------------------------------------
  const isImageRequest =
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|webp|svg|gif|avif|ico)(\?.*)?$/i.test(url.pathname) ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('i.imgur.com') ||
    url.hostname.includes('res.cloudinary.com') ||
    (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/')) ||
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org');

  if (isImageRequest) {
    event.respondWith(
      (async () => {
        const imageCache = await caches.open(CACHES.images);
        const cachedResponse = await imageCache.match(request);

        // Fetch fresh copy in the background (or foreground if not cached)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Cache valid HTTP responses (or opaque 0-status CORS images)
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              imageCache.put(request, networkResponse.clone()).then(() => {
                trimCache(CACHES.images, MAX_IMAGE_ENTRIES);
              }).catch(() => {});
            }
            return networkResponse;
          })
          .catch((fetchErr) => {
            // If network fails and no cached copy is available, return SVG placeholder
            if (!cachedResponse) {
              return new Response(OFFLINE_IMAGE_FALLBACK_SVG, {
                headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
              });
            }
            throw fetchErr;
          });

        // If cached copy exists, return it immediately for instant rendering on poor networks
        if (cachedResponse) {
          // Trigger background revalidation quietly
          fetchPromise.catch(() => {});
          return cachedResponse;
        }

        // Otherwise wait for network response
        return fetchPromise;
      })()
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STRATEGY B: Google Fonts & External Typography (Cache-First)
  // -------------------------------------------------------------------------
  const isFontRequest =
    request.destination === 'font' ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    /\.(woff|woff2|ttf|eot|otf)(\?.*)?$/i.test(url.pathname);

  if (isFontRequest) {
    event.respondWith(
      (async () => {
        const fontCache = await caches.open(CACHES.fonts);
        const cachedResponse = await fontCache.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            fontCache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          // If offline and no font cached, return empty or fallback
          return cachedResponse || new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STRATEGY C: Static Bundles & Scripts (/assets/*, CSS, JS) - Stale-While-Revalidate
  // -------------------------------------------------------------------------
  const isStaticBundle =
    url.pathname.startsWith('/assets/') ||
    /\.(js|css)(\?.*)?$/i.test(url.pathname) ||
    url.hostname.includes('unpkg.com');

  if (isStaticBundle) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(CACHES.static);
        const cachedResponse = await staticCache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              staticCache.put(request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          })
          .catch((err) => {
            if (cachedResponse) return cachedResponse;
            throw err;
          });

        return cachedResponse || fetchPromise;
      })()
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STRATEGY D: HTML Navigation & SPA App Shell (Network-First with 2.5s Timeout Fallback)
  // -------------------------------------------------------------------------
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        const staticCache = await caches.open(CACHES.static);

        // Create a fast-timeout promise to prevent long white-screens on spotty 2G/3G connections
        const networkTimeout = new Promise((resolve) => {
          setTimeout(() => resolve(null), 2500);
        });

        try {
          const networkFetch = fetch(request)
            .then(async (response) => {
              if (response && response.status === 200) {
                // Update cached index.html in background
                staticCache.put('/index.html', response.clone()).catch(() => {});
              }
              return response;
            })
            .catch(() => null);

          // Race network against the 2.5s timeout for resilient response
          const networkResult = await Promise.race([networkFetch, networkTimeout]);

          if (networkResult && networkResult.status === 200) {
            return networkResult;
          }

          // If network timed out or failed, serve cached index.html
          const cachedIndex =
            (await staticCache.match(request)) ||
            (await staticCache.match('/index.html')) ||
            (await staticCache.match('/'));

          if (cachedIndex) {
            return cachedIndex;
          }

          // Fallback to awaiting network if cache empty
          const fallbackResponse = await networkFetch;
          if (fallbackResponse) return fallbackResponse;
        } catch (err) {
          const cachedIndex =
            (await staticCache.match('/index.html')) ||
            (await staticCache.match('/'));
          if (cachedIndex) return cachedIndex;
        }

        // Final fallback if totally empty
        return new Response('<h1>BuildNow is loading... Please check your internet connection.</h1>', {
          headers: { 'Content-Type': 'text/html' },
        });
      })()
    );
    return;
  }

  // -------------------------------------------------------------------------
  // STRATEGY E: Default Runtime Cache (Stale-While-Revalidate)
  // -------------------------------------------------------------------------
  event.respondWith(
    (async () => {
      const runtimeCache = await caches.open(CACHES.runtime);
      const cachedResponse = await runtimeCache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            runtimeCache.put(request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        })
        .catch((err) => {
          if (cachedResponse) return cachedResponse;
          throw err;
        });

      return cachedResponse || fetchPromise;
    })()
  );
});

// ---------------------------------------------------------------------------
// 4. CLIENT MESSAGES & DIAGNOSTICS
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'PURGE_IMAGE_CACHE') {
    caches.delete(CACHES.images).then(() => {
      console.log('[SW] Product image cache purged on client request.');
    });
  }

  if (event.data.type === 'GET_CACHE_STATS') {
    (async () => {
      const stats = {};
      for (const [key, cacheName] of Object.entries(CACHES)) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats[key] = keys.length;
      }
      event.ports[0]?.postMessage({ type: 'CACHE_STATS_RESPONSE', stats });
    })();
  }
});
