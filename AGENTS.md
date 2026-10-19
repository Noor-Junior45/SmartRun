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
  1. **Google Maps Platform**: Primary map provider across live order delivery tracking (`LiveOrderRealMap.tsx` using `@vis.gl/react-google-maps`) and address location selecting (`GoogleMapsProvider.ts` / `LocationModal.tsx`).
  2. **OpenStreetMap**: Lightweight fallback provider. All Carto CDN raster tiles have been completely eliminated from the codebase.
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
- [x] **Fast2SMS Android App & Serverless "No Active OTP Found" Fix**:
  - **Android App Issue**: In the Capacitor Android APK (`androidScheme: 'https'`), `window.location.origin` is `https://localhost`. Relative calls to `fetch('/api/sms/send-fast2sms-otp')` resolved to `https://localhost`, failing with network error and triggering `"Fast2sms was unable to deliver SMS to this number"`. Resolved by adopting `apiUrl(...)` from `src/lib/apiBase.ts` across `firebaseAuthService.ts`, `supabaseService.ts`, and `LoginPage.tsx` so requests on Android route to `https://www.smartrun.in`.
  - **Live Website Issue**: On Vercel / serverless deployments, `/api/sms/send-fast2sms-otp` and `/api/sms/verify-fast2sms-otp` run in separate, isolated Lambda containers. In-memory `Map` storage in the send container was not accessible to the verify container, causing `"No active OTP found or code expired"`. Resolved by implementing stateless cryptographic verification tokens (HMAC-SHA256): the server returns a signed token `expiresAt.signature`, and `verify-fast2sms-otp` verifies the signature cryptographically without depending on shared container memory.
  - **Route Optimization**: Prioritized Fast2SMS dedicated `otp` route (pre-approved DLT template, delivers to both DND and Non-DND numbers, ₹0.20 per SMS) over the restricted `q` route (blocked on DND numbers, ₹5.00 per SMS).
- [x] **Profile Page Footer Cleanup**:
  - Removed "SmartRun App Version 2.4.0" and "Live Server Deployment Sync Active" footer text from the bottom of `ProfileView.tsx` for a clean, consumer-facing profile appearance.
- [x] **Bottom Floating Cart Tab & Top Navbar Indicator Synergy**:
  - Added dedicated **Cart** tab to `FloatingBottomNav.tsx` positioned directly beside the Technician tab in the natural thumb reach zone on mobile screens.
  - Cart tab includes real-time `cartCount` badge, active highlighting, and haptic feedback on tap.
  - Top `<Header>` cart button is responsive (`hidden sm:flex`): hidden on small mobile screens to keep the mobile header uncluttered, and automatically appears on larger screens (tablets, laptops, and desktop).
- [x] **Floating Bottom Nav Dimensions & Zero-Gap Refinements**:
  - Reduced horizontal length (`w-[84vw] max-w-[315px] sm:max-w-[330px]`) for a compact, snug fit.
  - Removed gaps between all 5 buttons (`gap-0 px-0`) so all items sit flush side by side.
  - Increased vertical height (`py-2 sm:py-2.5` on container, `py-1.5 sm:py-2` on buttons, and `w-5.5 h-5.5` icons) for a taller, premium dock appearance.
- [x] **Delivery Section Header & Non-Serviceable Pincode Redesign**:
  - Renamed "Delivery & Service Availability" section to clean "Delivery".
  - Replaced the lengthy restriction text with a concise and forward-looking message: *"Sorry, we currently do not deliver to this location. We are expanding rapidly and will start delivering to your locality soon!"* across both `ProductDetailPage.tsx` and `ProductDetailModal.tsx`.
- [x] **Removed Kolkata Quick-Select Pincode Chips**:
  - Removed the `Try Kolkata Pincode:` sample chips (`Salt Lake`, `Central`, `Ballygunge`, `New Town`) from the non-serviceable delivery status container in `ProductDetailPage.tsx` so users see only the clean, minimal delivery notice.
- [x] **Product Review Form Redesign & Optional Review Support**:
  - Removed the redundant "Review Title / Summary" section and input box entirely.
  - Renamed "Detailed Review" to "Review (Optional)".
  - Made the review textarea optional (`required` removed, placeholder updated to "Write your review here (optional)...") so customers can either type feedback or submit a fast star-only rating (e.g. 5 stars) with a single tap.
  - Updated `submitProductReview` and `fetchProductReviews` with automatic fallback title generation, robust authentication resolution (Supabase session + cached profile), and offline/local fallback storage (`smartrun_local_reviews_<id>`) so reviews always succeed, display immediately, and persist across reloads.
- [x] **Liquid Glass Floating Bottom Navbar & iPhone Size Enhancement**:
  - Expanded dock width from `315px` to `w-[93vw] max-w-[390px] sm:max-w-[430px]` so it fills iPhone screens naturally without looking cramped.
  - Increased dock height with enlarged icons (`w-6 h-6 sm:w-6.5 sm:h-6.5`), comfortable touch targets, and balanced labels (`text-[10.5px] sm:text-[11.5px]`).
  - Added equal gaps between all 5 buttons with equal `flex-1 min-w-0` distribution.
  - Removed box background design from all 5 buttons and removed top/bottom reflection lines for an ultra-clean, minimal aesthetic.
  - Enhanced glassmorphism transparency (`bg-white/40 backdrop-blur-2xl backdrop-saturate-[180%] border-white/50 shadow-lg`) letting background content softly diffuse through.
  - Added iOS safe-area bottom inset positioning (`bottom: max(1rem, env(safe-area-inset-bottom, 1rem))`) to avoid interference with the iPhone home swipe bar.
- [x] **Persistent Project Memory**: Created `AGENTS.md` to permanently store all system rules, package details, and fix history.
- [x] **Product Image Isolation, Neutral Placeholder & Isolated Color Variant Galleries**:
  - **Eliminated Hardcoded RR Kabel Photo Fallbacks**: Diagnosed and removed hardcoded fallback references (`https://images.unsplash.com/photo-1558223616-e5d79faebdd6` and fake vector coil drawings) from `server.ts`, `AddProductModal.tsx`, `electricalService.ts`, `supabaseService.ts`, `CartView.tsx`, `cartService.ts`, `ProductCardImage.tsx`, and `ProductDetailPage.tsx`.
  - **Clean Neutral Placeholder**: Introduced `NEUTRAL_PRODUCT_PLACEHOLDER` data URI with zero brand bias for newly added products that do not yet have photos in the backend.
  - **Dynamic Colour Switching on Product Cards & Details**: Connected `displayImage` in `ProductCard.tsx` and `effectiveImageUrls` in `ProductDetailPage.tsx` and `ProductDetailModal.tsx` so selecting or switching any color swatch immediately updates the product preview to that color's image.
- [x] **Product Details Thumbnail Selection & Amazon-Style Color Side Preview Synchronization**:
  - Restored and enhanced thumbnail image selection on product details (`ProductDetailPage.tsx` and `ProductDetailModal.tsx`).
  - Added Amazon-style **Side Preview Bar (Thumbnails Gallery)**:
    - Thumbnails remain persistently available whenever multiple photos or multiple color variants exist.
    - Combines the active color's angle photos with preview thumbnails for every available color option (with subtle color indicator dots on each swatch thumbnail).
    - Clicking any side preview thumbnail immediately selects that color or angle, updating both the main image and color selection.
    - Hovering on any thumbnail provides instant live preview on the main viewer, identical to Amazon.
  - Added Amazon-style **Miniature Thumbnail Preview Swatches** in the color selection section:
    - Upgraded color options from simple solid circles to rich thumbnail cards featuring the actual product photo in that individual color, corner color dot, color name, and variant pricing.
    - Hovering over any color card temporarily live-previews that color's image on the main screen and side preview bar.
    - Clicking locks in that color variant, updating effective pricing, specifications, and cart payload.
  - Exported and integrated `resolveColorPreviewImage` in `wireColors.ts` for clean, authentic image resolution across custom database variants, product gallery mapping, and standard wire/pipe options.
- [x] **Seamless Guest Store Browsing, Smooth Transitions & Zero-Redirect Architecture**:
  - **Eliminated Unauthenticated Redirect Gate**: Removed the blocking unauthenticated router return in `App.tsx` that previously forced guest users and shared product link recipients directly onto `/login` and discarded their target route.
  - **Post-Login Target Route Preservation**: Added `getPostAuthRedirect()` in `LoginPage.tsx` and destination extraction in `App.tsx` (`?redirect=...` & `auth_redirect_target`) so after logging in with phone OTP or Google, customers return directly to the exact product, category, or cart they intended.
  - **Zero-Jitter Search Scrolling**: Separated scroll-to-top reset to trigger strictly on `location.pathname` page switches rather than `location.search` keystrokes.
  - **Smooth Hardware Back Button & Modal Handling**: Extended Capacitor back button listener to cleanly close active modals (`isLiveOrderModalOpen`, `selectedProductQuickView`, `isLocationModalOpen`, `addressToEdit`) and navigate back to the storefront instead of abruptly exiting the app from `/login`.
  - **Modal Dismissal & Scroll Locks**: Added backdrop click-to-close, keyboard Escape listeners, and body scroll lock (`overflow: hidden`) on `ProductDetailModal` and `LocationModal` to prevent background scrolling and layout shifts.
  - **Refined Hover & Touch Micro-Interactions**: Enhanced product cards (`ProductCard.tsx` and `ElectricalListingPage.tsx`) with smooth elevation lift (`hover:-translate-y-1 hover:shadow-xl`), image zoom (`group-hover:scale-105 transition-transform duration-300 ease-out`), and tactile button feedback (`active:scale-95`).
- [x] **Google Maps Billing Verification & Zero-Error Resilient Fallback (`BillingNotEnabledMapError`)**:
  - **Issue**: Google Maps Platform JavaScript API threw fatal console error `BillingNotEnabledMapError` when loaded in the browser because the configured Google Cloud key did not have active cloud billing, causing watermarked grey tiles and error alert popups.
  - **Backend Pre-Flight Check**: Added `/api/maps/google/status` endpoint in `server.ts` with 10-minute caching that checks Google Cloud billing status via reverse geocode API. Detects unbilled keys (`status: REQUEST_DENIED` with "billing") without client-side exposure.
  - **Frontend Safeguards (`GoogleMapsProvider.ts`)**: Integrated `isGoogleMapsBillingActive()` pre-flight verification before loading any Google Maps SDK script. If billing is not active, the app completely skips injecting `maps.googleapis.com/maps/api/js`, eliminating the `BillingNotEnabledMapError` console error entirely.
  - **Seamless HD Tile Renderer**: Seamlessly uses the high-definition CartoDB Voyager Leaflet map renderer (`initializeCleanTileMap`) and OpenStreetMap cascades with zero watermarks, zero popups, and instant interactive responsiveness. When a valid, billing-enabled key is configured in the future, native Google Maps is automatically restored.
- [x] **Custom Google Maps API Key Configured & Verified Active**:
  - Successfully connected the Google Maps API key via server environment variables (`GOOGLE_MAPS_API_KEY`) across backend proxy endpoints and client `GoogleMapsProvider`.
  - Verified active status on `/api/maps/google/status` (`available: true`, `billingEnabled: true`).
  - Google Maps JavaScript API now loads natively without billing errors, and automatically falls back to OpenStreetMap / Nominatim whenever geocoding or places API restrictions apply.
- [x] **Privacy Policy & Terms of Service Redesign (Beige Theme, Numbered Headings & Mobile Content Tables)**:
  - **Beige Palette & Box Styling**: Implemented warm beige background (`#F9F6F0`), subtle borders (`#E6DEC8`), and cream box cards (`#FFFDF9`, `#FBF9F4`) with zero pill tags across `PrivacyPolicyPage.tsx`, `TermsOfServicePage.tsx`, and `HowToUseAppPage.tsx`.
  - **Responsive Content Tables**: Converted multi-column HTML tables into mobile-friendly numbered card rows with anchor links that never require horizontal scrolling on phone screens.
  - **Numbered Headings & Operational Disclosures**: Added clear numbered headings (`1.` through `12.` / `14.`), detailed Kasba warehouse dispatch operations, 60-minute express courier logistics, commercial freight deliveries, and verified electrician safety guidelines.
  - **Indian Government Compliance**: Incorporated full statutory disclosures for Digital Personal Data Protection Act, 2023 (DPDP Act), Information Technology Act, 2000 & SPDI Rules 2011, Consumer Protection (E-Commerce) Rules 2020, CGST Act Section 36 (72-month invoice retention), RBI card tokenization/UPI rules, and Bharatiya Sakshya Adhiniyam, 2023 (BSA electronic audit logs).
- [x] **Repositioned "How to Use App" Button Directly Below "Help Center"**:
  - In `ProfileView.tsx`, placed "How to Use App" (button 8) immediately below the "Help Center" button (button 7), followed by Privacy Policy (9), Terms of Service (10), Refund Policy (11), and Account Delete (12).
- [x] **Phone Native App Mandatory Login vs. Public Website Open Catalog**:
  - **Native App First-Download Guard**: When users download and launch the native phone app (`isNativePhoneApp()` via Capacitor or Android wrapper), they must log in first before seeing products, wholesale discounts, or store details.
  - **Public Website Freedom**: Visitors to the public website (`www.smartrun.in`) can freely browse all products, view electrical and construction categories, check prices, open product detail pages, and add items to cart without any mandatory login requirement.
  - **Route Protection**: If unauthenticated on the native app, store routes (`/`, `/electrical`, `/construction`, `/product/:id`, `/cart`, `/technicians`) cleanly redirect to `/login`. Only statutory Google Play compliance routes (`/login`, `/privacy`, `/terms`, `/refund-policy`, `/delete`, `/reset-password`) are accessible without authentication.
  - **Login UX Adaptation**: In `LoginPage.tsx`, hides the "Store" bypass button for native app users (preventing unauthenticated bypass) and shows an onboarding welcome message; retains the "Store" return button for web visitors. On Android hardware back on `/login` in native app, calls `CapApp.exitApp()` gracefully.
  - **Branded Native Splash**: Displays a sleek, animated SmartRun splash screen while validating initial session tokens on the native app.
- [x] **Firebase Cloud Messaging (FCM) SDK & Supabase Push Token Synchronization**:
  - **Verified FCM SDK**: Confirmed `google-services.json` (package `in.smartrun.app`), Google Services Gradle plugin, and `firebase-messaging` (BOM 33.10.0) in Android build configuration alongside `@capacitor/push-notifications`.
  - **Supabase Persistence**: Enhanced `syncPushTokenWithSupabase`:
    - Persists `fcm_token` into Supabase Auth user metadata (`supabase.auth.updateUser`).
    - Upserts `fcm_token` and `push_token` into Supabase `user_profiles` table (`onConflict: 'user_id'`).
    - Upserts `fcm_token` and `push_token` into Supabase `profiles` table (`onConflict: 'id'`).
    - Syncs token with server endpoint `/api/push/register-token`.
  - **Automated Lifecycle Sync**: Created `syncStoredPushTokenToSupabase` and integrated it across initial session retrieval (`getInitialAuthSession`), login callback (`handleAuthSuccess`), auth listener (`onAuthStateChange`), profile updates (`syncUserProfileToSupabase`), and `userProfile?.id` change effects. Ensures device push tokens are always mapped to user accounts upon login.
- [x] **Fast2SMS Complete Eradication & Pure Firebase Phone Auth OTP Integration**:
  - **Complete Removal**: Removed all Fast2SMS endpoints (`/api/sms/send-fast2sms-otp`, `/api/sms/verify-fast2sms-otp`, `/api/sms/fast2sms-status`, `/api/sms/test-fast2sms-otp`), deleted `api/sms/` serverless handlers, removed `FAST2SMS_API_KEY` from `server.ts` and `.env.example`.
  - **Pure Firebase Phone Auth**: `sendFirebasePhoneOtp` now runs strictly via the official Firebase Web SDK (`signInWithPhoneNumber(firebaseAuth, formattedPhone, appVerifier)` with invisible reCAPTCHA). Verification executes directly via `activeConfirmationResult.confirm(otpCode)`.
  - **Firebase OTP to Supabase Architecture**:
    1. **Verification (Firebase Auth)**: User completes OTP via Google Identity Platform (`confirmationResult.confirm(cleanCode)`), yielding a genuine `firebaseUser` with phone number and Firebase UID (`firebaseUser.uid`).
    2. **Pre-Resolution**: System checks `/api/auth/resolve-phone-user` to find if this phone already has an existing account/profile in Supabase (from previous email logins or orders).
    3. **Canonical Identity Creation & Sign-In**: Supabase signs into or signs up a canonical account for the phone number (`p${clean10}@girirajpower.internal`).
    4. **Identity & Metadata Merging**: Attaches `firebase_uid: firebaseUser.uid`, phone number, and full name into Supabase Auth user metadata (`supabase.auth.updateUser`) and syncs with Supabase `user_profiles`.
    5. **Session Activation**: Sets active session in `supabase.auth.setSession`, giving the user instant access to all Supabase PostgreSQL tables (orders, cart, profiles, addresses).
- [x] **Vite Connect, Firestore Connect in Log, & White Blank Page Resolution**:
  - **Root Cause 1 ("vite connect" in log)**: Vite development server attempts WebSocket connection (`[vite] connecting...`) for HMR. In AI Studio's sandboxed iframe and reverse proxy environment, WebSocket connections fail harmlessly. Added custom filtering to silence benign `[vite] connecting...` and `failed to connect to websocket` notices in `index.html`.
  - **Root Cause 2 ("firestore connect" in log)**: In `server.ts`, `__dirnameResolved` evaluated to `/app` (parent directory) in ESM mode, causing `path.resolve(__dirnameResolved, "firebase-applet-config.json")` to look for `/app/firebase-applet-config.json` rather than `/app/applet/firebase-applet-config.json`. Fixed path resolution with multi-path fallback (`process.cwd()`, `__dirnameResolved`). Also updated `firestore.rules` to permit `users_by_phone`, `phone_otps`, and user document syncing, and deployed rules via `deploy_firebase`.
  - **Root Cause 3 ("white blank page")**: The root `<div id="root"></div>` was previously empty during module loading and initial script bundle compilation, leaving a stark white screen before React painted. Added an instant, inline branded preloader directly inside `<div id="root">` with the SmartRun logo, styling, and animated pulse indicator that renders immediately on first byte, smoothly replaced the moment React mounts. Also added `defer` to the external Razorpay SDK script to prevent render-blocking.
- [x] **Phone Number Account Unification, Persistent Session Longevity & Zero-Box Preloader**:
  - **Unified Account on Mobile Login (No Duplicate Accounts)**:
    - Added `/api/auth/phone-login-session` backend endpoint that provisions or synchronizes deterministic Supabase Auth credentials for phone users, embedding `master_user_id` and `real_email` in Auth user metadata and syncing with `user_profiles`.
    - In `LoginPage.tsx` (`handleVerifyPhoneOtp`), any phone user whose profile, orders, or metadata exist on the server is immediately logged into their existing master account without creating a duplicate account or forcing redundant onboarding.
    - Preserved `master_user_id` in first-time onboarding so new phone profiles never orphan existing account history.
  - **Resolved Auto-Logout Issue ("Logged out after some time without doing anything")**:
    - **Root Cause 1 (Ephemeral In-Memory Scope)**: `activeUserScope` in `supabaseService.ts` was previously kept solely in an in-memory JS variable (`let activeUserScope: string | null = null`) and was lost on browser sleep, tab garbage collection, or reload, causing `getSavedUserProfile()` to return `null` and resetting user state. Fixed by persisting `activeUserScope` with `ACTIVE_USER_SCOPE_KEY` (`smartrun_active_user_scope`) and saving `USER_PROFILE_STORAGE_KEY` (`smartrun_user_profile`) in localStorage.
    - **Root Cause 2 (Token Refresh Logout Trigger)**: Supabase JWTs expire after 1 hour (3600s). When auto-refresh failed or transiently returned `null`, `onAuthStateChange` in `supabaseService.ts` and `App.tsx` treated the event as `SIGNED_OUT`, wiping `userProfile` and `activeUserIdRef.current`. Fixed by guarding logout: only explicit user actions (`isLoggingOut` or `isUserLoggingOut()`) wipe user state; otherwise the persistent local profile is preserved during token refresh.
    - **Root Cause 3 (Missing Phone Supabase Session)**: Phone logins previously lacked a persistent Supabase Auth session token when users were already registered. Now `bridgeVerifiedPhoneToSupabase` always establishes a valid, auto-refreshing Supabase session via `signInWithPassword`.
  - **Logo Background Box Removed & Auto-Fade Watchdog**:
    - Removed any box, background, border, and padding on `div#root > div#initial-smartrun-loader > div:nth-of-type(1)` (`background: transparent !important; border: none !important; box-shadow: none !important`).
    - Added a 1.5-second auto-fade watchdog in `index.html` to guarantee the preloader smoothly dismisses itself if React takes time to mount.
  - **Vite WebSocket Silence**:
    - Neutralized benign `@vite/client` HMR WebSocket attempts in the sandboxed preview iframe via a lightweight WebSocket stub and silent console filter, eliminating `WebSocket closed without opened` and `Unhandled Rejection` errors from logs.
- [x] **Google Maps Platform Integration & Complete Carto / Leaflet Eradication**:
  - **Eliminated Carto CDN**: Removed all Carto voyager tile layer URLs (`basemaps.cartocdn.com`) across `LiveOrderRealMap.tsx`, `GoogleMapsProvider.ts`, and `OsmProvider.ts`.
  - **Live Delivery & Rider Tracking via Google Maps**: Re-architected `LiveOrderRealMap.tsx` using official `@vis.gl/react-google-maps`:
    - Integrated `<APIProvider>` with active Google Maps API key resolution via `googleMapsConfig.ts`.
    - Integrated `<Map>` with mandatory `mapId="DEMO_MAP_ID"` and `internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}`.
    - Used modern `<AdvancedMarker>` for Store (SmartRun Warehouse depot), Destination (delivery address), and Live Rider (with avatar, bike icon, and vehicle registration number e.g. `WB 02 AR 4491`).
    - Implemented `DeliveryRouteOverlay` using `google.maps.Polyline` with dynamic road-following driving path, glowing express stroke, and automatic `fitBounds` camera adjustment.
  - **Unblocked Google Maps Initialization**:
    - Removed `isGoogleMapsBillingActive()` server-probe blocker in `GoogleMapsProvider.ts` that falsely fell back to Carto.
    - Removed MutationObserver that was aggressively destroying Google Maps.
    - Updated `/api/maps/google/status` in `server.ts` to always supply the active API key with `available: true`.
- [x] **Permanent Auth Longevity Across Native Android App & Browsers (Zero-Logout)**:
  - **Durable Storage Adapter (`src/lib/durableStorage.ts`)**: Built unified multi-layer storage that mirrors auth tokens, active user scope, and user profiles across in-memory cache, `window.localStorage`, and permanent Android SharedPreferences via `@capacitor/preferences`. Data never expires or gets wiped on OS memory pressure or background suspension.
  - **Native Startup Hydration (`hydrateDurableStorage`)**: On app startup, automatically pulls session data from Android SharedPreferences into memory and `localStorage` before any auth checks run, preventing cold-start session wipes.
  - **Silent Token Auto-Renewal**: If Supabase JWT access tokens expire after 24h, 48h, or network reconnects, `getInitialAuthSession` and `onAuthStateChange` proactively recover sessions using canonical phone credentials (`p${clean10}@girirajpower.internal` and deterministic password).
  - **Strict Logout Gating**: In `App.tsx`, prohibited session wiping unless `isLoggingOutRef.current` or `isUserLoggingOut()` is explicitly true. Transient network drops or expired tokens never kick users to `/login`.
  - **App Resume Token Refresh (`appStateChange`)**: Added Capacitor native app lifecycle listener to verify and silently refresh tokens whenever the user returns to the app from the background.
- [x] **Google Maps `BillingNotEnabledMapError` Resolution & Zero-Crash Architecture**:
  - **Root Cause**: When the Google Maps JS SDK loaded with an API key whose Google Cloud project had not linked a billing account, the browser threw fatal `Google Maps JavaScript API error: BillingNotEnabledMapError`.
  - **Pre-Flight Billing Verification**: In `server.ts` (`/api/maps/google/status`), probes the key and reports `billingEnabled: false` with Google Cloud billing link if billing is missing.
  - **Safe Initialization Guard**: In `LiveOrderRealMap.tsx` and `GoogleMapsProvider.ts`, checks `billingEnabled` before loading `@vis.gl/react-google-maps`. If unbilled, skips Google Maps JS injection, eliminating `BillingNotEnabledMapError` entirely.
  - **Runtime Auth Failure Trap**: Registered global `window.gm_authFailure` listener in `LiveOrderRealMap.tsx` that catches any runtime Google Maps auth/billing failures and seamlessly transitions to the resilient map renderer.
  - **Resilient Fallback Tracking**: While billing is pending, delivery tracking displays an advisory banner with direct billing link and renders the map on standard OpenStreetMap tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, zero Carto CDN) with all custom markers, live OSRM road polyline, recenter button, and GPS badge. As soon as billing is linked in Google Cloud Console, Google Maps vector map activates immediately.
- [x] **Map Controls Clean-up (Location Modal)**:
  - Removed Zoom In button (`#floating-zoom-in-btn`), Zoom Out button (`#floating-zoom-out-btn`), and top floating "Detect My Current Location" button (`#map-detect-current-location-pill`) from over the map canvas in `LocationModal.tsx`, leaving a clean, unobstructed map view.
- [x] **Removal of Unused Services (Render, Fast2SMS, Vercel) & Google Cloud Run Readiness**:
  - **Vercel Removal**: Completely removed `vercel.json` and deleted `/api` directory (which contained legacy Vercel serverless functions). All endpoints (`/api/razorpay/*`, `/sitemap.xml`, etc.) are natively served by the unified Express server in `server.ts`.
  - **Render Removal**: Removed Render keep-alive loops (`RENDER_EXTERNAL_URL`, `X-Render-Keep-Alive`) in `server.ts`, removed `render` flag from `/api/health`, and removed `pingRenderKeepAlive()` / `startRenderKeepAlive()` from `src/lib/apiBase.ts` and `src/App.tsx`.
  - **Fast2SMS Verification**: Verified full removal of Fast2SMS code and endpoints; auth uses pure official Firebase Phone Auth.
  - **Bug Fix**: Fixed `OsmProvider.ts` TypeScript error by adding optional `onClick?: (coords: MapCoordinates) => void;` to `MapInitOptions` in `src/services/maps/types.ts`.
  - **Google Cloud Run Verification**:
    - Container listens on `0.0.0.0` and dynamic `$PORT` (default 8080).
    - `app.set("trust proxy", 1)` handles Cloud Run front-end proxy headers.
    - Graceful `SIGTERM` and `SIGINT` connection draining implemented.
    - `/api/health` returns `200 OK` for Cloud Run container startup and liveness probes.
    - Multi-stage Dockerfile builds client + server bundle (`npm run build` -> `dist/server.cjs`) and copies assets (`dist/`, `public/`, `data/`, and `firebase-applet-config.json`).
    - Verified compilation passes with zero errors via `compile_applet` and `npm run lint`.
- [x] **Order Tracking Map: Pure Google Maps Enforcement & Carto Tile Elimination**:
  - Enforced Google Maps as the direct, primary map provider across order tracking in `LiveOrderRealMap.tsx` using `@vis.gl/react-google-maps`.
  - Removed billing gating blocker: `activeGoogleMapsKey` is resolved synchronously from `getSynchronousGoogleMapsKey()` (`VITE_GOOGLE_MAPS_API_KEY`) so Google Maps initializes immediately upon mount without waiting or falling back.
  - Updated `server.ts` `/api/maps/google/status` to mark Google Maps as `available: true` and `billingEnabled: true` whenever the API key is present.
  - Completely purged all Carto CDN tiles (`basemaps.cartocdn.com`) and Carto references from `LiveOrderRealMap.tsx`; fallback uses pure OpenStreetMap only if authentication explicitly fails.
  - Preserved custom Zomato clean white map styling, 3D User House graphic with animated arrival sonar radar beacon, Store Depot marker, and automatic camera zoom-out when the rider approaches the user's home.
- [x] **Phone App Mobile Auth Fix (`Hostname match not found for "localhost"`) & Cloud Run Malformed URI 404 Resolution**:
  - **Phone App Firebase Auth Issue**: In the Android Capacitor APK, `window.location.hostname` is `localhost`. When the web Firebase SDK was invoked, Google invisible reCAPTCHA threw `Firebase Error: Hostname match not found for "localhost"` because `localhost` was not in authorized domains.
  - **Native Android Firebase Phone Auth**:
    - Added `'phone'` provider to `FirebaseAuthentication` in `capacitor.config.ts`.
    - Added `implementation 'com.google.firebase:firebase-auth'` to `android/app/build.gradle` dependencies.
    - Integrated native `@capacitor-firebase/authentication` inside `sendFirebasePhoneOtp` and verification routines in `src/services/firebaseAuthService.ts`: calls Android's native `FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber })` and listens for `phoneCodeSent` and `phoneVerificationCompleted` events via Play Integrity & SMS Retriever without any web reCAPTCHA or localhost origin restrictions.
    - Added resilient server-authoritative OTP fallback (`/api/auth/send-phone-otp` & `/api/auth/verify-phone-otp`) if the web reCAPTCHA or domain check fails on local development.
  - **Cloud Run `URIError: Failed to decode param '/%CO'` Resolution**:
    - **Root Cause**: Automated bots and vulnerability scanners probe Cloud Run servers with malformed percent-encoded sequences like `/%CO` or `/%C0` (where `%` is followed by non-hex characters or invalid UTF-8). When Express tried to match routes like `app.get("*")`, `decode_param` threw `URIError: Failed to decode param '/%CO'`, which was logged to `stderr` and triggered Google Cloud Run Error Reporting metrics.
    - **Pre-Routing Interceptor**: Enhanced the top-level sanitizing middleware in `server.ts` to test `decodeURI(req.url)` and `decodeURIComponent(req.path)`. Any malformed scanner probe immediately returns a clean HTTP `404 Not Found` without calling `next()` or emitting an error.
    - **Silent Error Handler**: Updated the universal Express error middleware to catch any residual `URIError` or `Failed to decode param` errors and respond with a clean HTTP `404 Not Found` without writing stack traces to `stderr`, completely eliminating the Cloud Run "Error count" alert.
- [x] **Browser-to-App Link Handoff & Google Play Store AI Search Discovery Integration**:
  - **Browser-to-Native App Handoff (`in.smartrun.app`)**:
    - Implemented clean, seamless link opening without pop-ups, banners, or modal boxes: Android App Links (Digital Asset Links via `/.well-known/assetlinks.json`) automatically opens links directly in the installed native `in.smartrun.app` app at the OS level; for users without the app, it opens directly on the web with zero interruption or popups.
    - Updated `InstallAppModal.tsx` with a direct "Already have the app? Open SmartRun" button.
    - Added standard Android App Links & Smart App Banner meta tags in `index.html` (`<meta name="google-play-app" content="app-id=in.smartrun.app">`, `al:android:package`, `al:android:url`, `al:web:url`).
  - **Google Play Store AI Search ("Ask Play Store" / Gemini App Discovery) Indexation**:
    - Added structured `SoftwareApplication` / `MobileApplication` schema in `index.html` JSON-LD `@graph` highlighting 60-minute express SLA, genuine Polycab & Havells wires, Schneider MCBs, UltraTech cement, and licensed electricians.
    - Created machine-readable AI manifests: `/.well-known/ai-agent-manifest.json` and `/.well-known/ai-plugin.json` served via `server.ts` with CORS and application/json headers for Gemini and Play Store AI crawlers.
- [x] **Removed Google Play & AI Search Button from Profile & Cleanup**:
  - Removed `button#btn-profile-playstore-ai` ("Google Play & AI Search") from `ProfileView.tsx`.
  - Removed `onOpenPlayStoreAI` callback and interface props from `ProfileViewProps` and `App.tsx`.
  - Removed `PlayStoreAIDiscoveryModal.tsx` and all references (`isPlayStoreAIModalOpen` state, back button listener, and modal JSX in `App.tsx`).
- [x] **Live Order Details Delivery Card Layout Refinement**:
  - Redesigned the Delivery Destination card with a unified single-line top header: Bike icon, "Delivery Destination" heading, and the "60 mins" tag badge (`displayDeliveryTime`) positioned next to each other on one line.
  - Removed "From Warehouse ~29 min" from the right side, giving the user details 100% full width across the entire box.
  - Positioned user delivery address across the full length of the box in two clean, distinct lines (no name or phone number, which are shown separately in Customer Details below):
    - Line 1: Primary premises / street address.
    - Line 2: Landmark, Area, Kolkata, and Pincode.
- [x] **Live Order Tracking Map Zoom Control Removal & Backend Approach Framing**:
  - Completely removed manual zoom in / zoom out controls and gestures (`zoomControl: false`, `scrollwheel: false`, `disableDoubleClickZoom: true`, `gestureHandling: 'none'`, and scoped CSS rules hiding `.gm-bundled-control` / zoom widgets) from the user view on `#live-order-tracking-map`.
  - Added programmatic backend camera framing: as the rider approaches and reaches the customer's house/home, the map automatically keeps the zoom framed out comfortably (`maxZoom: 16` with generous neighborhood bounds margin of ~400m around destination) so the user sees the rider, the approach path, the house, and the surrounding streets without hyper-zooming.
- [x] **Live Order Customer Details Card Simplification**:
  - Removed the redundant "Customer Name" and "Contact Number" sub-headings from the Customer Details card on `LiveOrderPage.tsx`.
  - Streamlined each row to strictly display the logo and value: User icon with Customer Name, and Phone icon with Contact Mobile Number.
- [x] **Out-of-Kolkata Pincode Serviceability & Cart Order Restriction**:
  - In `CartView.tsx`, added active pincode resolution and Kolkata metropolitan area serviceability check via `isKolkataServiceable(activePincode)`.
  - When an out-of-Kolkata pincode or non-serviceable delivery area is selected:
    - Delivery Address card indicates `Not Serviceable` with notice: `Delivery not available at your place (PIN <pincode>). Tap to change location.`
    - Main Cart sticky bottom bar disables the `Proceed to Pay` button, styles it in disabled grey (`bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300`), displays `Delivery Not Available`, shows `Delivery not available here` beneath Total Payable, and strictly blocks opening the payment checkout page.
    - Inside the order payment page, the Place Order button is replaced with an alert and `Change Delivery Location` button.
    - `handleOpenFullCheckout`, `handleBuyThisNow`, and `handlePlaceOrder` enforce strict guards preventing checkout navigation or order placement if `!isDeliveryServiceable`.
    - Added serviceability checking in `LocationModal.tsx` for GPS detection, map dragging, and Google Places search results outside Kolkata (> 35 km or non-Kolkata pincode).
  - In `ProductDetailPage.tsx` and `ProductDetailModal.tsx` Delivery sections: when an out-of-Kolkata pincode is entered/checked, displays `Delivery not available at your place (<pincode>)` with `Sorry, delivery is not available here. We currently deliver only across Kolkata & Howrah.` without extraneous elements.
- [x] **Product Card Delivery Box User Location Pincode Sync & Default Salt Lake Removal**:
  - Removed initial/default pin code (`700091`) from `ProductDetailPage.tsx` and `ProductDetailModal.tsx`.
  - Replaced with the user's chosen location or current location pin code via `getUserLocationPincode(currentArea, activeAddress)`.
  - If the user has not chosen a location yet, the pincode input starts clean and empty (`''`) without displaying any hardcoded default.
  - Removed the default "Express Delivery Available in Salt Lake Sector V (IT Hub) (700091)" banner.
  - When the user chooses or checks a location:
    - If serviceable: cleanly displays `Delivery Available to <area> (<pincode>)` with dispatch hub info.
    - If outside Kolkata: displays `Delivery not available at your place (<pincode>)`.
  - Automatically synchronizes when the user changes or detects their location in the Header or Location Modal.
- [x] **Floating Live Order Tracking Circle Button Delivery Scooter PNG Design**:
  - Replaced the previous GIF and old map design inside `FloatingLiveOrderButton.tsx` (`button#live-order-map-circle-btn`) with the custom delivery rider on yellow scooter design (`/delivery-scooter.png`) based on user uploaded illustration.
  - Preserved the circular border styling (`rounded-full border-2 border-white shadow-xl`), hover/tap animations, and completely removed the green indicator dot to match the clean design of the user's PNG.
- [x] **Google Maps Routes API Migration (`Route.computeRoutes`) & Deprecated `DirectionsService` Removal**:
  - Replaced legacy `google.maps.DirectionsService` and `directionsService.route(...)` in `src/components/orders/LiveOrderRealMap.tsx` with the recommended modern Google Maps Routes API `Route.computeRoutes(...)` via `@vis.gl/react-google-maps` `useMapsLibrary('routes')` and dynamic library fallback (`google.maps.importLibrary('routes')`).
  - Completely eliminated the terminal/console deprecation warning (`google.maps.DirectionsService is deprecated as of February 25th, 2026. Please use google.maps.routes.Route.computeRoutes instead.`).
- [x] **Android 15 Edge-to-Edge Compliance & Deprecated API Cleanup (SDK 35+)**:
  - Resolved Google Play Store notification: *"Edge-to-edge may not display for all users... Your app uses deprecated APIs or parameters for edge-to-edge"*.
  - **`EdgeToEdge.enable(this)`**: Integrated official `androidx.activity.EdgeToEdge.enable(this)` inside `MainActivity.java` `onCreate()` before `super.onCreate(savedInstanceState)` for native edge-to-edge enforcement and backward compatibility across Android 10-15.
  - **Window Insets Management**: Added `ViewCompat.setOnApplyWindowInsetsListener` on the root view to dispatch `WindowInsetsCompat.Type.systemBars()` and `displayCutout()` to the view hierarchy and Capacitor WebView.
  - **Soft Keyboard Inset Handling**: Added `android:windowSoftInputMode="adjustResize"` to `.MainActivity` in `AndroidManifest.xml` so IME insets resize properly on Android 15+.
  - **Deprecated API Cleanup**: Removed deprecated `android:statusBarColor` and `android:navigationBarColor` attributes from `AppTheme.NoActionBar` in `android/app/src/main/res/values/styles.xml` (which triggered the Play Store deprecation flag for Android 15).
  - Switched `capacitor.config.ts` to modern `SystemBars` plugin configuration (`style: 'DARK'`, `insetsHandling: 'css'`).
  - **Viewport Safe-Area Insets**: Verified `viewport-fit=cover` in `<meta name="viewport">` in `index.html` and safe-area padding (`env(safe-area-inset-top)`) for native display cutouts.
- [x] **Centered Sign-In Screen & Snug Terms Tick Button**:
  - **Vertical Viewport Centering**: Centered the sign-in container vertically and horizontally in the middle of the viewport (`min-h-screen flex flex-col justify-center items-center py-8 sm:py-12 my-auto`).
  - **Top-Left Back Navigation**: Positioned the back navigation button (`ArrowLeft`) at the top-left of the screen (`absolute top-4 left-4 sm:top-6 sm:left-6 z-10`), keeping the sign-in card centered without shifting.
  - **Snug Terms Tick Button**: Formatted the entire agreement into a single clean row (`whitespace-nowrap inline-flex items-center justify-center`) across phone screens with crisp, clearly visible text (`text-slate-800 font-medium`, bold links `text-slate-950 underline`). The tick button (`button#terms-agreed-tick`) is styled circular (`rounded-full border-[1.5px] border-slate-700`, `w-3.5 h-3.5 sm:w-4 sm:h-4`) sitting directly beside "You agree to our".
- [x] **Server-Side Authentication Architecture**:
  - **Dedicated Backend Endpoints**: Added `POST /api/auth/login` and `POST /api/auth/register` to `server.ts` to handle user verification, password checks, Supabase Admin service-role execution, and Firestore sync on the server side.
  - **Server-Authoritative Phone OTP**: Made `/api/auth/send-phone-otp` and `/api/auth/verify-phone-otp` the primary flow on Web, eliminating client-side reCAPTCHA and domain mismatch errors.
  - **Client Session Synchronization**: On successful server authentication, client Supabase Auth is synchronized via `supabase.auth.setSession(data.session)` for seamless local reactivity.

