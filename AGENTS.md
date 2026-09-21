# AGENTS.md - Project Knowledge Base & Persistent Architecture Rules

> **Important**: This file is automatically loaded by Google AI Studio into the agent's system instructions across all sessions. It preserves project specifications, architectural decisions, and a master checklist of all completed fixes.

---

## 1. Project Identity & Key Coordinates

- **App Name**: Giriraj Power (SmartRun) — Express Electricals & Quick Commerce
- **Production Web Domain**: `https://www.smartrun.in`
- **Official Android Package Name**: `in.smartrun.app`
  - ⚠️ **CRITICAL RULE**: Do **NOT** use or reintroduce `com.girirajpower.buildnow`. That legacy package has been completely replaced by `in.smartrun.app` across `google-services.json`, Android Manifest, Capacitor config, and platform detection.
- **Android Deep Link Schemes**:
  - Direct scheme: `smartrun://login?access_token=...&refresh_token=...`
  - Android Intent URI: `intent://login?access_token=...#Intent;scheme=smartrun;package=in.smartrun.app;end;`
  - Notice query string syntax (`?param=val`) is used for Intent URIs rather than hash fragments (`#`) so Android Intent parsers correctly read tokens.
- **Admin Mobile / Contact**: `8777400280` (Owner / Kasba Warehouse Hub)
  - Non-admin autofill guard is strictly enforced: `8777400280` is filtered out from general customer phone autofill.

---

## 2. SMS Gateway Architecture & Fast2SMS Error Reference

### Cascaded SMS Gateway
1. **Primary Gateway**: **Firebase Phone Auth**
   - Headless reCAPTCHA verifier + SMS OTP.
2. **Secondary Fallback Gateway**: **Fast2SMS Dev API (bulkV2)**
   - API Endpoint: `/api/sms/send-fast2sms-otp`
   - Test Endpoint: `/api/sms/test-fast2sms-otp`
   - Status Endpoint: `/api/sms/fast2sms-status`
   - **Primary Route**: Dedicated `otp` route (`variables_values: <otp>`, `route: "otp"`). Uses Fast2SMS pre-approved DLT template, cost is only ~₹0.20 per SMS.
   - **Secondary Route**: Quick SMS `q` (`route: "q"`, `message: "..."`).

### Fast2SMS Error Code 414: "IP is blacklisted from Dev API section"
- **Cause**: Fast2SMS Developer API has an IP security filter. When the API key is called from a cloud server or data center IP (such as Google Cloud egress IP `34.34.254.4`), Fast2SMS rejects the request with HTTP/Status 414: `{"return": false, "status_code": 414, "message": "IP is blacklisted from Dev API section"}`.
- **How to Resolve in Fast2SMS Dashboard**:
  1. Log in to [Fast2SMS Dashboard](https://www.fast2sms.com/dashboard/dev-api).
  2. Navigate to **Dev API** -> **SECURITY** tab.
  3. If **IP Whitelist** is enabled, either:
     - Add the server egress IP: `34.34.254.4` (or any custom domain/server IP).
     - OR turn **OFF / Disable** the IP Whitelist restriction.
  4. If the account was flagged by Fast2SMS automated security, submit a quick request or contact Fast2SMS support to unblock Developer API requests for your API key.

---

## 3. Authentication & Session Architecture Rules

### 1. Instant Sign-Out (Single Tap)
- Sign-out must execute **immediately on first tap** without freezing or redirecting back to home.
- **Cancellation Tokens**: Always use `isLoggingOutRef.current = true` and check `isUserLoggingOut()`.
- **State Clearing**: Clear state synchronously with React `flushSync` and navigate immediately to `/login`:
  ```typescript
  flushSync(() => {
    setIsLoggingOut(false);
    setUserProfile(null);
    setUserPhone(null);
    setUserName('');
    activeUserIdRef.current = null;
  });
  navigate('/login', { replace: true });
  ```
- **Prevent Profile Resurrection**: Any background asynchronous profile fetch (such as `fetchUserProfileFromSupabase` inside visibility listeners, window focus listeners, or Supabase `onAuthStateChange` listeners) **MUST** check:
  ```typescript
  if (isLoggingOutRef.current || isUserLoggingOut() || !activeUserIdRef.current || activeUserIdRef.current !== targetUserId) {
    return; // Discard stale profile response
  }
  ```

### 2. Instant Login Page Load
- If there is no active token in `localStorage` (`giriraj_supabase_auth_session` or `smartrun_user_profile`) and no OAuth token in the URL (`access_token` or `code`), immediately set `isAuthLoading = false` with zero delay. Never force the user to wait for a 2-second timeout when launching without a session.

### 3. Google Sign-In Separation (Web vs. Native Android App)
- **Web Browsers**: Must redirect to `https://www.smartrun.in/login?client=web`. Web users must **never** be redirected to deep links or shown the Android app bridge modal.
- **Android App Users**: Pass `target=app&source=android_app` so that OAuth redirects trigger `smartrun://login` deep link parsing back into the app wrapper.

---

## 4. Map & Delivery Tracking Architecture

- **Cascaded Map Provider**:
  1. **Mappls (MapmyIndia) v3.0**: Primary Indian address autocomplete and geocoding.
  2. **Google Maps Platform**: Secondary provider.
  3. **Leaflet / OpenStreetMap**: Zero-dependency fallback built into `LiveOrderRealMap.tsx`.
- **Server-Authoritative Rider Location**:
  - POST coordinates: `/api/orders/:orderId/rider-location`
  - GET coordinates: `/api/orders/:orderId/rider-location`
  - Rider coordinates are fetched strictly from the server. The client never fabricates fake locations.

---

## 5. Master Checklist of Completed Fixes & Tasks

- [x] **Android Package Unification**: Removed all remnants of `com.girirajpower.buildnow`; unified on `in.smartrun.app` in `google-services.json`, Android Manifest, Capacitor config, and platform detection.
- [x] **Deep Link Intent Formatting**: Fixed deep link parameter format to query syntax (`?access_token=...`) so Android Intent URIs parse properly without stripping tokens.
- [x] **Web vs. Android Google Auth Separation**: Web users authenticate within browser origin without app bridge dialogs; native app users route through `smartrun://` deep links.
- [x] **Single-Tap Instant Sign Out**: Fixed profile resurrection bug by adding cancellation refs (`isLoggingOutRef.current`, `activeUserIdRef.current`) to all focus/visibility profile syncs. Sign-out redirects to `/login` instantaneously.
- [x] **Instant Login Page Launch**: Implemented zero-delay auth loading fast-path for non-authenticated visits.
- [x] **Admin Phone Number Filtering**: Restricted `8777400280` from customer profile autofill.
- [x] **Fast2SMS 414 IP Blacklist Diagnosis**: Identified Fast2SMS Dev API error 414, documented server egress IP (`34.34.254.4`), prioritized dedicated `otp` route, and added structured error messages for Fast2SMS dashboard resolution.
- [x] **Live Order Tracking & GPS**: Built server endpoints `/api/orders/:orderId/rider-location` for real-time delivery partner tracking with Leaflet and Mappls.
- [x] **Persistent Project Memory**: Created `AGENTS.md` to permanently store all system rules, package details, and fix history.
