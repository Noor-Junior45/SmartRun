# BUG_LOG.md (Anti-Regression Checklist)

- [x] **Bug ID: BUG-EMAIL-001 - Daily Welcome Email On App Open**
  - **Summary**: Users received a welcome email every day upon opening the app even if already logged in.
  - **Root Cause**: `/api/user-profile` contained auto-send welcome email logic triggered by background profile synchronization from `fetchUserProfileFromSupabase`. Because Cloud Run containers are ephemeral and restart/scale to zero, in-memory `welcomedUsersStore` was reset, causing `/api/user-profile` to falsely trigger welcome emails on startup.
  - **Permanent Guardrail**: All email dispatch logic was completely removed from `/api/user-profile`. `/api/auth/send-welcome-email` now enforces strict database existence checks (rejects accounts older than 5 minutes) and persists `welcomed: true` directly in Firebase Firestore and Supabase.

- [x] **Bug ID: BUG-EMAIL-002 - Generic Email Senders**
  - **Summary**: Emails were sent from generic `team@smartrun.in` instead of dedicated function-specific addresses.
  - **Root Cause**: `getSenderFromEmail()` returned a single static address.
  - **Permanent Guardrail**: Dedicated senders `welcome@smartrun.in` (Welcome), `alert@smartrun.in` (Security alerts), and `order@smartrun.in` (Order updates & Tax Invoice PDFs) are strictly enforced in `server.ts` with automatic fallback.

- [x] **Bug ID: BUG-APK-001 - Android Build Missing Rules File (`missing_rules.txt`)**
  - **Summary**: Android APK builds reported missing file error for `missing_rules.txt`.
  - **Root Cause**: R8 / ProGuard in Android Gradle Plugin expected `missing_rules.txt` for suppressed third-party library rules.
  - **Permanent Guardrail**: Created persistent `android/app/missing_rules.txt` and `android/missing_rules.txt`, and added universal `-dontwarn **` and `-ignorewarnings` in `proguard-rules.pro`.

- [x] **Bug ID: BUG-APK-002 - Top Navbar White Blank Space in APK**
  - **Summary**: A horizontal white blank gap was visible above the top navbar in the Android APK.
  - **Root Cause**: `EdgeToEdge.enable(this)` was active while `android:statusBarColor` was not transparent and Capacitor's StatusBar plugin was not configured to overlay the webview.
  - **Permanent Guardrail**: Configured `StatusBar.setOverlaysWebView({ overlay: true })` in `capacitor.config.ts` and `App.tsx`, set `android:statusBarColor` transparent in `styles.xml` and `MainActivity.java`, allowing `Header.tsx`'s safe-area padding to flow seamlessly under the status bar.

- [x] **Bug ID: BUG-AUTH-001 - Lingering Cache Memory After Logout**
  - **Summary**: User cache memory and session state could persist on devices after logout.
  - **Root Cause**: Standard logout only cleared partial localStorage keys.
  - **Permanent Guardrail**: `purgeAllUserCacheAndStorage()` now wipes `localStorage`, `sessionStorage`, all Cache Storage API caches, IndexedDB databases, cookies, Capacitor Preferences, and Cloud Run server sessions in under 500ms.

- [x] **Bug ID: BUG-UI-001 - Unsolicited Permission Modal Overlay & Backdrop**
  - **Summary**: Full-screen modal overlay (`div#root > div > div`) was automatically forced on mount, blocking user interaction.
  - **Root Cause**: `App.tsx` mounted an automatic geolocation permission prompt timer (`setTimeout` 1200ms) and rendered `<AndroidAppBridgePrompt />` and `<DeviceLocationPromptModal />` at the top level.
  - **Permanent Guardrail**: Removed unsolicited auto-prompts on mount. Location selection is purely user-initiated via the top `<Header>` ("Select Location") invoking `<LocationModal />`.

- [x] **Bug ID: BUG-UI-002 - Camera Cutout & Search Bar / Cross Button Clipping in Full Screen Mode**
  - **Summary**: On full-screen phone mode and edge-to-edge Android devices, the search input, cross button, and header sections were partially hidden behind the camera punch-hole / notch.
  - **Root Cause**: Headers in `LocationModal.tsx`, `Header.tsx`, `CartView.tsx`, and `ProfileView.tsx` used fixed padding (`pt-5`, `top-3.5`) or bare `env(safe-area-inset-top)` which resolves to `0px` in many Android WebViews when `overlaysWebView: true` is active.
  - **Permanent Guardrail**: Defined `:root` CSS custom property `--safe-area-top` initialized in `App.tsx` (38px fallback for modern notch/punch hole phones) and bridged from native Android `WindowInsets` via `MainActivity.java`. All sticky top bars, modals, search bars, and cross buttons now use `calc(<base> + max(env(safe-area-inset-top, 0px), var(--safe-area-top, 0px)))`.

- [x] **Bug ID: BUG-LOC-001 - Non-Intrusive Auto-Location Fetching & 1-Tap Current Location Selection**
  - **Summary**: When user opens the site or app, location wasn't indicating detection state in Header, and selecting current location inside the location drawer required going through the map step.
  - **Root Cause**: `isLocationFetching` was not forwarded as a prop to `<Header />`, and `handleDetectCurrentLocation` did not support direct selection and drawer closing when `goToMap = false`.
  - **Permanent Guardrail**: `<Header isLocationFetching={isLocationFetching} />` binds the resilient geolocation resolver (`getResilientCurrentPosition`) to the location button with an animated spinner and `"Detecting location..."` state. Step 1 of `LocationModal` features clean, symmetrical single-line action buttons: "Current Location" (direct GPS detection) and "Add Location" (opens interactive map pin picker), updating `currentArea` and closing the drawer cleanly.

- [x] **Bug ID: BUG-APK-003 - Top White Blank Space & Status Bar Separation in Android APK**
  - **Summary**: On Android APK, there was a lot of empty white blank space at the top between the system status bar and the app Header.
  - **Root Cause**: `overlaysWebView: true` combined with artificial `--safe-area-top: 38px` and Android `EdgeToEdge.enable()` forced web insets into the WebView while the system was already managing window space, creating an empty white band.
  - **Permanent Guardrail**: In `capacitor.config.ts`, set `StatusBar.overlaysWebView: false`. In `styles.xml`, set `android:fitsSystemWindows: true` and `android:statusBarColor: @android:color/white`. In `MainActivity.java`, set `contentView.setFitsSystemWindows(true)`, keep status bar solid white with dark icons (`setAppearanceLightStatusBars(true)`), and set `--safe-area-top: 0px` so the APK WebView begins immediately below the WiFi, network, and battery indicators with zero gap.

- [x] **Bug ID: BUG-UI-003 - Login Page Scroll Jumping & Mobile Keyboard Hidden Inputs/Logo**
  - **Summary**: On mobile phones, tapping to type in mobile number or email caused the page to scroll up violently, hiding the logo and pushing the input box out of view.
  - **Root Cause**: `min-h-screen justify-center` with `my-auto` caused negative vertical overflow when the virtual keyboard reduced viewport height, and default browser scroll jumping pushed the top off screen.
  - **Permanent Guardrail**: Used `min-h-[100dvh]` with `overscroll-contain` and centered/slightly-bottom balanced padding (`pt-3 pb-8 my-auto`). Integrated `isKeyboardOpen` visual viewport detection with responsive smooth scaling of the logo (`w-12 h-12` when keyboard active) and nearest-edge scroll positioning (`scrollIntoView({ block: 'nearest' })`), ensuring logo and input boxes remain 100% visible together without scrolling off screen.
- [x] **Bug ID: BUG-LOC-002 - Building/Apartment Search Pre-fill & Optional Flat/Floor Field**
  - **Summary**: Searching for an apartment or building name in LocationModal did not pre-fill the first box ("House / Society / Apartment Name") in Step 3, and users with standalone houses/bungalows were blocked from saving addresses because "Flat / House / Floor No." was strictly required with a red asterisk.
  - **Root Cause**: `handleSelectMapSearchResult` populated `setDetectedBuilding` and `setHouseFlat` instead of `houseName`, and `handleSaveAddress` had a hard validation check `!houseFlat.trim()`, while the JSX had `required` and `<span className="text-[#e23744]">*</span>`.
  - **Permanent Guardrail**: `handleSelectMapSearchResult` and `handleProceedToDetails` directly bind `result.building || result.name` to `houseName` (Society/Apartment Name). In `handleSaveAddress`, `houseFlat` is optional, `formattedExactAddress` filters out empty components using `.filter(Boolean).join(', ')` to eliminate leading commas, and the UI displays clean label `Flat / House / Floor No.` with zero red asterisks and no `(Optional)` text.
