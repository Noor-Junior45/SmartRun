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

- [x] **Bug ID: BUG-UI-003 - Login Page Bottom-Anchored Positioning & Mobile Keyboard Visibility**
  - **Summary**: On phones and desktop devices, the login page previously sat too high or middle-centered, and typing in inputs could cause erratic scroll jumps.
  - **Root Cause**: Centered vertical flex alignment placed elements far from natural mobile thumb zones, and unconstrained viewport height caused jumpy scrolling.
  - **Permanent Guardrail**: Configured outer container with `min-h-[100dvh] flex-col justify-end pt-10 pb-4 sm:pt-16 sm:pb-8` and inner card with `mt-auto mb-3 sm:mb-6 pt-4 pb-6 sm:pb-8` so all login elements sit comfortably towards the bottom across all screen sizes. Maintained `isKeyboardOpen` visual viewport detection with smooth logo scaling (`w-12 h-12`) and `space-y-2 py-1 my-0` when typing, preventing any inputs or logos from getting pushed off-screen.
- [x] **Bug ID: BUG-LOC-002 - Building/Apartment Search Pre-fill & Optional Flat/Floor Field**
  - **Summary**: Searching for an apartment or building name in LocationModal did not pre-fill the first box ("House / Society / Apartment Name") in Step 3, and users with standalone houses/bungalows were blocked from saving addresses because "Flat / House / Floor No." was strictly required with a red asterisk.
  - **Root Cause**: `handleSelectMapSearchResult` populated `setDetectedBuilding` and `setHouseFlat` instead of `houseName`, and `handleSaveAddress` had a hard validation check `!houseFlat.trim()`, while the JSX had `required` and `<span className="text-[#e23744]">*</span>`.
- [x] **Bug ID: BUG-LOC-003 - Buffer Spinner Icon & Device Location Permission Bottom Sheet Prompt**
  - **Summary**: While location was fetching, the rotating `Navigation` icon had an asymmetrical paper-plane shape that looked awkward when rotating, and when location access was off or denied, the app previously omitted the permission request prompt modal.
  - **Root Cause**: `Header.tsx` used `<Navigation className="animate-spin" />` instead of a circular buffer spinner, and `App.tsx` omitted `DeviceLocationPromptModal` mount when `fetchCurrentLocationOnLaunch` failed.
  - **Permanent Guardrail**: Replaced the paper-plane icon with `Loader2` (`animate-spin`) in `Header.tsx` for a clean circular buffer animation. Restored and aligned `DeviceLocationPromptModal` to the user's exact screenshot design with floating circular close button (`X`), rounded bottom sheet, Card 1 ("Current location" with MapPin in soft pink container and gradient "Enable" button), Card 2 ("Search location manually" with Search in soft pink container and chevron arrow), and triggered it when location permission is not yet granted or disabled.
