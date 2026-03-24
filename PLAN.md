# Apple Subscription Fixes for App Store Submission

## What will be fixed

**1. Add Terms of Service & Privacy Policy Links on Paywall**
- [x] Clickable links at the bottom of the subscription page for "Terms of Service" and "Privacy Policy"
- [x] Uses placeholder URLs for now (you can update them later with your real URLs)
- [x] Apple requires these to be visible and tappable before any purchase

**2. Fix Duplicate Audio Entry in App Settings**
- [ ] Remove the duplicate "audio" entry in the background modes configuration (app.json is restricted, needs manual fix)
- [ ] Prevents potential Apple review warnings

**3. Make Subscription Prices Always Dynamic**
- [x] When RevenueCat prices are available, they will be shown everywhere (profile, stats, etc.)
- [x] Hardcoded fallback prices remain only as backup if RevenueCat hasn't loaded yet
- [x] This ensures prices always match what's set in App Store Connect

**4. Improve Paywall Legal Text**
- [x] Updated subscription disclaimer text to meet Apple's requirements:
  - [x] Clearly states subscription auto-renews
  - [x] Mentions cancellation must happen 24 hours before period ends
  - [x] Payment is charged to Apple ID account
  - [x] Links to Terms & Privacy Policy are tappable

**5. Profile Legal Section**
- [x] Privacy Policy link now opens URL
- [x] Terms & Conditions link now opens URL
