# Giriraj Power - Quick Commerce & Live Tracking Platform

An express delivery platform for electricals, wires, inverters, and switchgear in Kolkata, featuring 60-minute dispatch from the central Kasba warehouse.

---

## 1. Maps & Geolocation Architecture

The platform supports a 3-tier cascaded map provider architecture managed by `MapProviderManager`:

1. **Mappls (MapmyIndia) Web SDK v3.0** (Primary Indian Map Provider)
   - Configured via environment variable: `VITE_MAPPLS_MAP_KEY` (and `MAPPLS_MAP_KEY` on the server).
   - Interactive map rendering, geocoding, and address reverse-geocoding.
   - Proxied server routes:
     - `GET /api/maps/mappls/autocomplete?input=...`
     - `GET /api/maps/mappls/rev-geocode?lat=...&lng=...`
2. **Google Maps Platform** (Secondary Cascaded Provider)
   - Loaded if Google Maps key is provided and Mappls is unavailable.
3. **OpenStreetMap / Leaflet** (Zero-Dependency Resilient Fallback)
   - Built directly into the customer live order tracking map (`LiveOrderRealMap.tsx`).
   - Provides 100% uptime with zero watermarks or rate-limit lockouts.

---

## 2. Real-Time Rider Location Architecture

Rider GPS positions are **fetched directly from the backend server**. The frontend client never fabricates or calculates fake coordinates. 

When a rider is assigned and begins broadcasting their GPS coordinates, the customer's live order map seamlessly renders the delivery bike pin along the route.

### Backend Endpoints

#### 1. Broadcast Rider GPS (from Delivery App or GPS Device)
```http
POST /api/orders/:orderId/rider-location
Content-Type: application/json

{
  "lat": 22.5245,
  "lng": 88.3712,
  "heading": 85,
  "speed": 28.5,
  "riderName": "Rajesh Kumar",
  "partnerId": "RIDER-04"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "ORD-12345",
  "location": {
    "orderId": "ORD-12345",
    "lat": 22.5245,
    "lng": 88.3712,
    "heading": 85,
    "speed": 28.5,
    "riderName": "Rajesh Kumar",
    "partnerId": "RIDER-04",
    "updatedAt": "2026-09-07T15:30:00.000Z"
  },
  "message": "Rider live GPS updated successfully."
}
```

#### 2. Query Rider GPS (Polled by Customer Live Tracking)
```http
GET /api/orders/:orderId/rider-location
```

**Response (200 OK - Active Rider):**
```json
{
  "success": true,
  "orderId": "ORD-12345",
  "location": {
    "lat": 22.5245,
    "lng": 88.3712,
    "heading": 85,
    "speed": 28.5,
    "riderName": "Rajesh Kumar",
    "updatedAt": "2026-09-07T15:30:00.000Z"
  }
}
```

**Response (200 OK - Rider Not Yet Dispatched):**
```json
{
  "success": true,
  "orderId": "ORD-12345",
  "location": null,
  "message": "No live rider GPS recorded yet."
}
```

---

## 3. How to Connect a Rider App / GPS Beacon to the Backend

### Option A: Testing with `curl`
You can simulate live GPS movement by sending coordinates to the backend:

```bash
# Order starting from Kasba Hub towards destination
curl -X POST http://localhost:3000/api/orders/YOUR_ORDER_ID/rider-location \
  -H "Content-Type: application/json" \
  -d '{"lat": 22.5200, "lng": 88.3800, "riderName": "Rajesh Kumar", "speed": 30}'

# 10 seconds later, rider moves closer
curl -X POST http://localhost:3000/api/orders/YOUR_ORDER_ID/rider-location \
  -H "Content-Type: application/json" \
  -d '{"lat": 22.5350, "lng": 88.3720, "riderName": "Rajesh Kumar", "speed": 26}'
```

### Option B: Mobile Rider App (React Native / Flutter / Android)
In your Delivery Partner application, initialize a background geolocation task that pings the endpoint every 5–10 seconds:

```javascript
// React Native / Web Background Geolocation loop
navigator.geolocation.watchPosition(
  async (position) => {
    const { latitude, longitude, heading, speed } = position.coords;
    
    await fetch(`https://your-domain.com/api/orders/${currentActiveOrderId}/rider-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: latitude,
        lng: longitude,
        heading: heading || 0,
        speed: speed || 0,
        riderName: currentRiderName
      })
    });
  },
  (error) => console.warn('GPS Error:', error),
  { enableHighAccuracy: true, distanceFilter: 10 }
);
```

---

## 4. Database Schema for Order Tracking

In Firestore or Supabase (`orders` collection / table):

```json
{
  "id": "ORD-98765",
  "status": "out_for_delivery",
  "delivery_partner": {
    "id": "PARTNER-01",
    "name": "Rajesh Kumar",
    "phone": "+91 98300 12345",
    "vehicle_type": "bike",
    "vehicle_number": "WB 02 AB 1234"
  },
  "rider_location": {
    "lat": 22.5255,
    "lng": 88.3712,
    "heading": 45,
    "speed": 32,
    "updatedAt": "2026-09-07T15:35:00.000Z"
  }
}
```

When `rider_location` or `/api/orders/:id/rider-location` is present, the live tracking view displays the green "Live GPS" status badge and moves the rider marker smoothly on the map canvas.

---

## 5. Android Build (Native Capacitor)

The official Android application is built using **Capacitor 8** in the `android/` directory.

- **App ID (Application ID)**: `in.smartrun.app`
- **Build System**: Android Studio / Gradle (`android/`)
- **Build Guide**: See `ANDROID_STUDIO_AAB_GUIDE.md` for step-by-step instructions to generate signed `.aab` / `.apk` files.
- **Sync Command**: `npm run cap:build` or `npx cap sync android`
- **Archived TWA**: Previous Bubblewrap / TWA artifacts have been quarantined in `twa-archive/` and are no longer used.
