# Trusted Web Activity (TWA) - Google Play Store Build Guide

Your project is now **100% pre-configured for Google's official Trusted Web Activity (TWA)** via **Bubblewrap**.

---

### What Was Pre-Configured in the Codebase:
1. **`public/manifest.json` & `public/manifest.webmanifest`**: Configured with proper `id`, `start_url`, maskable icons, standalone display mode, theme colors, shortcuts, and categories.
2. **`public/.well-known/assetlinks.json`**: Pre-configured Digital Asset Links file.
3. **`server.ts`**: Direct `/.well-known/assetlinks.json` endpoint to ensure Google Play and Chrome verify domain ownership with no redirection issues.
4. **`twa-manifest.json`**: Pre-configured Bubblewrap build file containing package ID (`com.girirajpower.buildnow`), app name, theme colors, icons, and location delegation permissions.

---

### How to Build the Signed App Bundle (.aab) & APK in 2 Minutes:

#### Step 1: Open Terminal in your downloaded project folder
```bash
cd giriraj-power
```

#### Step 2: Build the Signed Android App Bundle
Run this single command:
```bash
npm run twa:build
```
*(or run: `npx @bubblewrap/cli build`)*

- When run for the first time, Bubblewrap will ask you if you want to create a new key store file (`android.keystore`). Press **Enter** and type a password you will remember.
- Bubblewrap will compile the project and generate **`app-release-bundle.aab`** in your project directory.

---

### Step 3: Verify Digital Asset Links (No URL Bar)

1. When Bubblewrap finishes building, it prints your **SHA-256 fingerprint**:
   Example: `14:6D:E9:7D:0C:6D:77:E5:EE:DE:28:B6:F0:4B:92:47:FD:B3:36:CF:BE:0C:F0:7C:1E:58:E6:C3:FF:11:EB:7B`
2. Ensure this SHA-256 fingerprint matches the one inside `public/.well-known/assetlinks.json`.
3. That's it! When opened on Android phones, Google Chrome will automatically hide the top URL bar and give the exact 100% full-screen native app experience.

---

### Step 4: Upload to Google Play Store
1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create App** (Name: `BuildNow`, Category: `Shopping` or `Business`).
3. Go to **Release > Production** (or **Testing > Internal testing**).
4. Upload **`app-release-bundle.aab`**.
5. Fill in your Store Listing details, App icon, and screenshots.
6. Submit for review!
