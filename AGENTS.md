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
- [x] **Delivery Partner Details & Dual Review System (Rider & Order)**:
  - **Backend API**: Added `/api/orders/:id/rider`, `/api/orders/:id/assign-rider`, `/api/orders/:id/reviews`, `/api/orders/:id/rider-review`, and `/api/orders/:id/product-review` with persistent storage in `rider_assignments.json` and `order_reviews.json`.
  - **Minimalist Rider Card**: Placed directly above the Delivery Destination box on both `LiveOrderPage` and `OrderHistoryView`. Shows clean heading "Delivery Partner", rider name, star rating with star icon, express vehicle info, bike registration number badge (e.g. `WB 02 AR 4491`), profile avatar with fallback bike icon, and quick call shortcut.
  - **Map Rider Pin Integration**: Live tracking map pin displays the rider's profile avatar if provided (or delivery bike icon fallback) along with their vehicle registration number badge directly below the marker.
  - **Contextual Review Cards**: When order status is `delivered`:
    - Rider review card appears directly below the Rider details section.
    - Product / order review card appears directly below the Purchased items section.
    - Both cards feature interactive 5-star rating, pre-defined quick feedback tags, comment support, and persistent state once submitted.
- [x] **Unified `order_id` Synchronization & 8-Character Short Display (`#DE7A0E6C`)**:
  - Maintained full Primary Key UUID (`de7a0e6c-a824-472b-8e28-18ac425083a6`) across `id` and `order_id` in Supabase and server-side upserts for foreign key integrity across related tables (`order_items`, `deliveries`, etc.).
  - Centralized display format in `getShortOrderUuid` and `formatOrderDisplayId` in `/src/utils/cryptoHelper.ts`.
  - Standardized UI display to `#` + the first 8 uppercase hex characters (e.g. `#DE7A0E6C`) across:
    - `OrderHistoryView`: Order cards, details modals, copy button, and search filter (supports querying `#DE7A0E6C` or `DE7A0E6C`).
    - `LiveOrderPage`: Header title (`Order #DE7A0E6C`), live map tracking badge, and cancellation modal dialogs.
    - `FloatingLiveOrderButton`: Quick tracking pill.
    - `invoiceGenerator`: A4 PDF invoice header metadata and clean download file name (`SmartRun-Invoice-DE7A0E6C.pdf`).
    - `emailService` & `server.ts`: Automated WhatsApp alert messages and customer email notifications.
- [x] **Native Android Share Sheet & Public Domain Link Resolution**:
  - **Issue**: In the native Android app (Capacitor WebView with `androidScheme: 'https'`), `window.location.origin` is `https://localhost`. When users shared a product, the generated link was `https://localhost/electrical/product/...`, which failed in external browsers. Furthermore, `navigator.share` inside the Android WebView container does not reliably trigger the native OS share sheet (Instagram, WhatsApp, Messages, etc.).
  - **Fix**:
    - Installed official `@capacitor/share` plugin.
    - Updated `src/utils/shareProduct.ts` with `PRODUCTION_WEB_DOMAIN = 'https://www.smartrun.in'` and `getPublicShareOrigin()`, which sanitizes and forces public domain resolution so share links are always `https://www.smartrun.in/electrical/product/<id>?...`.
    - Integrated `CapShare.share(...)` as priority handler inside native Android platform, triggering the native Android system bottom share sheet (WhatsApp, Instagram, Telegram, Gmail, Messages, etc.).
    - Enhanced deep link routing in `src/App.tsx` (`handleDeepUrl`) to support both `/electrical/product/:id`, `/construction/product/:id`, and `item_id` query parameters across `smartrun://` and web URLs.
- [x] **Dynamic Colour Variants with Linked Photos & Custom Pricing**:
  - **Architecture**: Implemented Option A (zero new database tables). Extends the existing `products` table in Supabase by adding an optional `color_variants` `JSONB` column.
  - **Data Schema**:
    ```json
    [
      { "color": "Red", "price": 1650, "mrp": 2100, "discount_percent": 21, "image_urls": ["https://.../red1.jpg"] },
      { "color": "Black", "price": 1600, "mrp": 2050, "discount_percent": 22, "image_urls": ["https://.../black1.jpg"] }
    ]
    ```
  - **Data Layer & Fallbacks**: `resolveColorOption` in `src/data/wireColors.ts` checks for matching color variant by name/hex. If a variant defines custom `price`, `mrp`, `discount_percent`, or `image_urls`, they override the product's base price and gallery. If not specified, standard product pricing and images seamlessly apply as fallback.
  - **UI Integration**:
    - `ProductDetailPage.tsx`: Reactive `effectivePrice`, `effectiveMrp`, `effectiveDiscountPercent`, and `effectiveImageUrls` adapt instantaneously when clicking any color swatch. Main gallery zooms and resets smoothly to the variant's photo. Bottom floating action bar and price block reflect variant prices in real time.
    - `ProductDetailModal.tsx`: Synchronized with `effectivePrice`, `effectiveOriginalPrice`, and dynamic photo gallery.
    - `CartView.tsx`: Displays variant-specific photo, pricing, and discount badge; bill breakdown dynamically sums each line item according to its selected variant price. Orders snapshot the variant pricing into `orderItems` for invoices and order tracking.
- [x] **Product Details Top Navbar, Scroll-Collapse, and Header Back Arrow**:
  - Enabled top `<Header>` visibility on all product detail routes (`/electrical/product/:id`, `/construction/product/:id`, `/product/:id`).
  - Implemented smooth scroll collapse: when scrolling past 20px on product detail pages, the first line (brand "SmartRun", location selector, cart icon, and avatar) collapses smoothly (`max-h-0 opacity-0`), keeping only the focused search bar and filter/sort buttons sticky at the top.
  - Shifted the back button directly into the sticky top navbar on the left side of the search bar as a clean, minimal arrow icon (`<ArrowLeft />` with zero background boxes). Removed the obsolete floating back button from `ProductDetailPage.tsx` to eliminate button clash.
  - Enhanced filter and sort buttons on product details so clicking them seamlessly navigates to the store and opens the respective filter drawer or sort menu.
- [x] **Android Share Sheet Duplicate Link Fix**:
  - Fixed duplicate URL bug in `src/utils/shareProduct.ts`: Capacitor on Android concatenates `text` and `url` when both are supplied to `CapShare.share(...)`. We previously provided `text: `${shareText} ${fullShareUrl}`` and `url: fullShareUrl`, causing two links. Changed to `text: shareText` so only a single link is produced.
- [x] **Shared Product Link Back Navigation Fallback**:
  - Resolved issue where clicking the arrow back button or Android hardware back button on a product page opened from an external shared link (WhatsApp, SMS, etc.) failed to go back.
  - Integrated smart history fallback (`window.history.state?.idx > 0 ? navigate(-1) : navigate(isConstruction ? '/construction' : '/electrical')`) across Header arrow button, `useEdgeSwipeBack` gesture, and Capacitor Android hardware back button handler in `App.tsx`. Users are never stuck on product pages.
- [x] **Persistent Project Memory**: Created `AGENTS.md` to permanently store all system rules, package details, and fix history.

