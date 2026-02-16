---
description: Build and sync the mobile application for testing
---

This workflow prepares the web application for mobile, builds the static export, and syncs it with Capacitor for testing on Android/iOS.

// turbo-all
1. Run the safe mobile build script:
`powershell -ExecutionPolicy Bypass -File scripts/safe-mobile-build.ps1`

2. Open the Android project in Android Studio (if not already open):
`npx cap open android`
