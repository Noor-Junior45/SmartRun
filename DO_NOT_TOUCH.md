# DO_NOT_TOUCH.md (Locked UI & Core Logic Registry)

The following components, pages, and architectural modules are verified production assets and MUST NOT be rewritten, restyled, or broken:

1. **Storefront & Navigation**:
   - `src/components/Header.tsx`: Collapsible brand navbar, live search, back arrow for product pages.
   - `src/components/FloatingBottomNav.tsx`: 5-tab docked bottom navigation with zero gap.
   - `src/components/HomePage.tsx`: Category shelves, banner carousels, instant product feeds.
   - `src/components/CartView.tsx`: Full-screen cart checkout, bill calculation, color variant display.

2. **Order & Real-Time Tracking**:
   - `src/components/LiveOrderPage.tsx`: Minimalist Delivery Partner card, live delivery partner map pin.
   - `src/components/LiveOrderRealMap.tsx`: Vis.gl Google Maps platform with Leaflet fallback.
   - `src/components/OrderHistoryView.tsx`: Short 8-character uppercase hex order IDs (`#DE7A0E6C`).

3. **Authentication & Identity**:
   - `src/components/LoginPage.tsx`: Fast2SMS OTP, Google OAuth (web origin vs smartrun:// deep link), WebAuthn passkey.
   - `src/services/firebaseAuthService.ts`: Seamless phone-email linking, master user ID persistence.
   - `src/services/welcomeEmailService.ts`: One-time onboarding email dispatch with multi-layer deduplication.

4. **Android Native Configuration**:
   - `android/app/build.gradle`: Application ID `in.smartrun.app`, ProGuard optimization.
   - `android/app/proguard-rules.pro`: Capacitor, Firebase, AndroidX keep & dontwarn rules.
   - `android/app/missing_rules.txt`: Required R8 rules suppression file.
