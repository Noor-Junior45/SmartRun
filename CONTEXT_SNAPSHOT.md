# CONTEXT_SNAPSHOT.md (Multi-AI Handoff Brain)

## Current Tech Stack & Core Runtime
- **Frontend**: React 19 SPA, Vite 6, Tailwind CSS 4, React Router 7, TypeScript 5.8
- **Mobile Runtime**: Capacitor 8 Native Android App (`in.smartrun.app`), Gradle 8, Android SDK 36
- **Backend**: Express 4 Node.js server (`server.ts`), tsx dev server, Cloud Run production container (`0.0.0.0:8080`)
- **Database & Auth**: Supabase PostgreSQL + Firebase Firestore + Fast2SMS OTP Gateway + Resend Email Gateway

## Directory Tree Overview
- `/src`: App entry (`App.tsx`), UI components (`/components`), services (`/services`), utils (`/utils`), types (`types.ts`)
- `/android`: Capacitor Android native project (`/android/app/build.gradle`, `/android/app/proguard-rules.pro`, `/android/app/missing_rules.txt`)
- `server.ts`: Cloud Run backend API, Resend email dispatcher, Razorpay payments, SMS OTP, delivery & order tracking
- `Dockerfile`: Multi-stage Cloud Run production container build

## Completed UI & Backend Phases
- **Phase 1 UI**: Storefront (Electrical & Construction), Live GPS Tracking Map, Order History, Product Detail, Cart, Refund, Account Deletion, Edit Profile.
- **Phase 2 Integrations**: Dedicated email subdomains (`welcome@smartrun.in`, `alert@smartrun.in`, `order@smartrun.in`), Instant sign-out with total client cache purge, Android R8 missing rules fix, Zero-gap Android status bar separation (clean native status bar displaying WiFi, network, battery always visible with APK starting immediately below with 0px white space), Login page mobile virtual keyboard adaptive layout (shifted to middle/bottom without design change, logo and inputs stay 100% visible with zero scroll jumping when typing), Unsolicited modal overlay removal (`DeviceLocationPromptModal` / `AndroidAppBridgePrompt`), Full-screen camera cutout & notch safe-area protection, Upgraded release version to **14 (1.1.3)** across Android Gradle and backend metadata, Live auto-location GPS fetch on app/site open with reverse-geocoded Kolkata locality detection & 1-tap "Current Location" / "Add Location" drawer selection, Building/apartment search auto-population into "House / Society / Apartment Name" with optional "Flat / House / Floor No." (no red asterisk, no optional text tag, clean address formatting without leading commas).

## Immediate Next Build Step
- Generate signed Android App Bundle (AAB/APK) and release to production tracks.


