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

### 4. Account Linking & Phone-Email Identity Resolution
- **Problem**: When a user registers or logs in first via Email/Google and saves their phone number, and subsequently logs in via Phone Number OTP, the system must NOT create a separate orphan account.
- **Resolution Flow**:
  1. `/api/auth/resolve-phone-user`: Pre-resolves existing accounts by phone number across memory cache, `user_profiles`, and historic `orders`.
  2. `firebaseAuthService`: Bridges to Supabase using `effectiveUserId = preResolvedUserId || supabaseUser.id`, persists `master_user_id`, `linked_user_id`, and `real_email` in Supabase Auth user metadata.
  3. `supabaseService` & `App.tsx`: Scope user state (`uid_${effectiveUserId}`), fetch orders matching `user.id` OR `effectiveUserId`, and merge existing email, name, avatar, and order history into the active session seamlessly.

---

## 5. Map & Delivery Tracking Architecture

- **Cascaded Map Provider**:
  1. **Mappls (MapmyIndia) v3.0**: Primary Indian address autocomplete and geocoding.
  2. **Google Maps Platform**: Secondary provider.
  3. **Leaflet / OpenStreetMap**: Zero-dependency fallback built into `LiveOrderRealMap.tsx`.
- **Server-Authoritative Rider Location**:
  - POST coordinates: `/api/orders/:orderId/rider-location`
  - GET coordinates: `/api/orders/:orderId/rider-location`
  - Rider coordinates are fetched strictly from the server. The client never fabricates fake locations.

---

## 6. Master Checklist of Completed Fixes & Tasks

- [x] **Android Package Unification**: Removed all remnants of `com.girirajpower.buildnow`; unified on `in.smartrun.app` in `google-services.json`, Android Manifest, Capacitor config, and platform detection.
- [x] **Deep Link Intent Formatting**: Fixed deep link parameter format to query syntax (`?access_token=...`) so Android Intent URIs parse properly without stripping tokens.
- [x] **Web vs. Android Google Auth Separation**: Web users authenticate within browser origin without app bridge dialogs; native app users route through `smartrun://` deep links.
- [x] **Single-Tap Instant Sign Out**: Fixed profile resurrection bug by adding cancellation refs (`isLoggingOutRef.current`, `activeUserIdRef.current`) to all focus/visibility profile syncs. Sign-out redirects to `/login` instantaneously.
- [x] **Instant Login Page Launch**: Implemented zero-delay auth loading fast-path for non-authenticated visits.
- [x] **Admin Phone Number Filtering**: Restricted `8777400280` from customer profile autofill.
- [x] **Fast2SMS 414 IP Blacklist Diagnosis**: Identified Fast2SMS Dev API error 414, documented server egress IP (`34.34.254.4`), prioritized dedicated `otp` route, and added structured error messages for Fast2SMS dashboard resolution.
- [x] **Live Order Tracking & GPS**: Built server endpoints `/api/orders/:orderId/rider-location` for real-time delivery partner tracking with Leaflet and Mappls.
- [x] **Seamless Phone-Email Account Linking**: Resolved phone logins to existing email accounts via pre-resolution endpoint `/api/auth/resolve-phone-user`, `effectiveUserId` aliasing, auth metadata preservation (`real_email`, `master_user_id`), and unified order history querying.
- [x] **Email OTP for Mobile Number Modification & Edit Profile Cleanup**:
  - Removed "Supabase Auth Linked" badge and "Enables one-click OTP login..." text from Edit Profile card.
  - Implemented secure Email OTP verification (`/api/auth/send-email-otp` and `/api/auth/verify-email-otp`) when updating mobile number.
  - Added dynamic inline OTP box directly beneath mobile number input that appears only when the user edits their number.
  - Resolved `[Too many requests. Please try again later.]` error by separating global API traffic (expanded to 5,000 requests) from authentication endpoints, adding an `emailOtpLimiter` dedicated to OTP requests, and adding instant verification helper codes.
  - Refactored OTP flow UI: placed "Send OTP" button directly inside the mobile number input box, renamed section header to "Otp verification", updated description to "Otp is sent to your linked email <email>", and built a seamless 6-box single-digit input with auto-advance, backspace navigation, paste support, and automatic verification upon filling all 6 digits; completely removed demo OTP hints.
  - Polished mobile OTP UX: waits until a full 10-digit number is typed before revealing the "Send OTP" button inside the box; reveals the OTP verification boxes below only after the user presses "Send OTP"; removed redundant "Otp verification" header and helper text to keep only the clean description; and reduced the 6 OTP input boxes to a compact size that fits all mobile screen viewports.
- [x] **Direct Mobile OTP via Fast2SMS for Profile Phone Updates**:
  - Investigated Resend API delivery: diagnosed that Resend free/sandbox accounts without custom verified domains reject emails sent to third-party recipients with `403 validation_error: You can only send testing emails to your own email address`.
  - Analyzed Supabase Auth Email OTP: confirmed Supabase supports auth OTP, but rate limits to 3-4 emails/hour on free tier and requires custom SMTP configuration in the Supabase dashboard for general profile update flows.
  - Switched profile mobile number modification from Email OTP to direct **Fast2SMS SMS OTP** sent straight to the new mobile number (`/api/sms/send-fast2sms-otp` & `/api/sms/verify-fast2sms-otp`), with ₹105 active wallet balance and immediate DLT/Quick route dispatch.
- [x] **Product Details Navbar Hiding & Dynamic "Buy Now" Working**:
  - Hides the top navigation Header when viewing any product details (`location.pathname.includes('/product/')` or `selectedProductQuickView`).
  - Modified the "Buy Now" button: preserves the exact same orange design (`bg-[#fb641b]`), but dynamically adapts its functionality based on cart status:
    - If the product is not yet in cart (`cartQty === 0`), it directly buys now by adding the product to cart and opening the cart page.
    - If the product is already in cart (`cartQty > 0`), the button shows "Go to Cart" and directly opens the cart page without adding duplicate items.
- [x] **Product Detail Mobile Button Size & Colour Options Refinements**:
  - Fixed button height (`h-11 sm:h-12`) and added `whitespace-nowrap text-[11px] sm:text-xs` so adding quantity (`Add to Cart (1)`) remains strictly on one line and prevents the buttons from expanding on phone screens.
  - Removed duplicate floating cart button at top-right, keeping only the floating back button at top-left.
  - Redesigned the color selector for mobile screens: removed the `Selected: <colour>` badge, added clean compact color swatches (`p-2`, `w-6 h-6`), and streamlined the role/description summary below.
- [x] **Cart Page Navbar Hiding & Standalone Page Feel**:
  - Completely hides the top Header navbar when viewing the cart (`/cart`), giving it a clean, dedicated full-screen page appearance.
  - Added dedicated top header with Back navigation (`ArrowLeft`) to both empty and populated cart states so users can seamlessly navigate back.
- [x] **Refund Policy UI Redesign**:
  - Replaced the dark red gradient header and shield logo with a clean white sticky header.
  - Aligned the back arrow button and simple heading "Refund policy" on the exact same line.
  - Rewrote the refund articles in a clean, uncluttered layout without extraneous background boxes, reserving subtle highlight containers strictly for critical callouts (direct refund guarantee, clearing SLA, and support helpline).
  - Enforced single-line tags (`whitespace-nowrap inline-flex`) across all badges and banking SLA tags to prevent any text wrapping on mobile viewports.
- [x] **Account Deletion UI Redesign & Top Navbar Hiding**:
  - Completely hides the top Header navbar when on `/delete` or `/account-deletion`.
  - Added clean white sticky header with Back navigation arrow button (`ArrowLeft`) and simple heading "Account delete" on the exact same line.
  - Converted the deletion policy and prerequisite rules into a clean editorial article layout without redundant card containers.
  - Reserved subtle highlight containers strictly for actionable and status sections: in-flight order warnings, unpaid dues settlement, eligibility confirmation, interactive confirmation form, and statutory CGST data retention disclosure.
  - Enforced single-line badges and tags (`whitespace-nowrap inline-flex`) across all statuses and alerts to prevent multiline wrapping on mobile viewports.
- [x] **Persistent Project Memory**: Created `AGENTS.md` to permanently store all system rules, package details, and fix history.
