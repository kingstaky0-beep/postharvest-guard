# PostHarvest Guard — Shipaton 2026 starter

An offline-first Android app for farmers, aggregators and grain traders to record harvest batches and moisture readings, track drying progress and export records.

## Why this concept

The app focuses on a concrete post-harvest workflow rather than a generic farm dashboard. The first version can be demonstrated without a backend: create a batch, record moisture readings, set a buyer/storage target, review history and export records.

## RevenueCat setup

RevenueCat's current Capacitor installation uses `@revenuecat/purchases-capacitor` followed by `npx cap sync`. See the official docs: https://www.revenuecat.com/docs/getting-started/installation/capacitor

1. Create a RevenueCat project for the Android app.
2. Create a Google Play product with identifier `postharvest_guard_pro_monthly`.
3. Create entitlement `pro`.
4. Add the product to a current offering.
5. Replace `RC_ANDROID_KEY` in `www/app.js` with the RevenueCat Google public SDK key.
6. Build and test the purchase using Google Play internal testing or RevenueCat Test Store as appropriate.

## Build

Prerequisites: Node.js, Android Studio, Android SDK.

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, ensure the app's launch mode is `standard` or `singleTop` for Google Play purchase flows, as recommended by RevenueCat.

## Shipaton eligibility reminder

RevenueCat states that the main Shipaton competition requires a new iOS/iPadOS/macOS/Android app, RevenueCat SDK use for an in-app purchase or RevenueCat Ads, first public release during Aug 1–Sep 30 2026, publication on a qualifying store, and availability for download in the United States. Testing-track-only releases do not count. The published deadline is Sep 30, 2026 at 11:45 pm PDT.

Source: https://www.revenuecat.com/blog/engineering/how-to-submit-your-app-for-shipaton
