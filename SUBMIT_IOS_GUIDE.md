# Fix Fastlane Pilot / EAS Submit for iOS (TestFlight)

## Why it failed

Fastlane pilot failed because **App Store Connect App ID** was not set. Your `eas.json` had the placeholder `"YOUR_NEW_ASC_APP_ID"` instead of the real numeric ID.

---

## Step 1: Get your App Store Connect App ID

1. Go to [App Store Connect](https://appstoreconnect.apple.com/apps).
2. Open your app (**Voxi Task Manager** / `app.rork.voxi-task-manager`).
3. In the browser URL you’ll see something like:
   ```text
   https://appstoreconnect.apple.com/apps/1234567890123456789/...
   ```
4. The number in the URL (e.g. `1234567890123456789`) is your **App Store Connect App ID** (`ascAppId`). It is **digits only**.

If the app doesn’t exist yet:

- In App Store Connect: **My Apps** → **+** → **New App**.
- Fill in name, bundle ID `app.rork.voxi-task-manager`, etc.
- After creation, open the app and copy the numeric ID from the URL as above.

---

## Step 2: Set `ascAppId` in `eas.json`

Open `eas.json` and replace the empty `ascAppId` with your numeric ID:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "1234567890123456789"
    }
  }
}
```

Use your actual number, not this example.

---

## Step 3: Submit again

From the project root:

```bash
eas submit --platform ios --profile production --latest
```

Or submit a specific build:

```bash
eas submit --platform ios --profile production --id <BUILD_ID>
```

---

## If it still fails

### 1. “Cannot verify client’s JWT headers” / auth errors

- Use an **App Store Connect API key** (recommended) instead of only Apple ID/password.
- In [App Store Connect → Users and Access → Keys](https://appstoreconnect.apple.com/access/api):
  - Create a key with **App Manager** (or Admin).
  - Download the `.p8` file once (you can’t download it again).
- In EAS:
  ```bash
  eas credentials
  ```
  Configure iOS and add the API key (Key ID, Issuer ID, `.p8` path).

### 2. Metadata / validation errors

- In App Store Connect, for the app and for TestFlight, fill in:
  - **Beta App Description**
  - **Contact email** and **phone**
  - Any other required fields for the version you’re submitting.

### 3. See the real error

- Run submit and check the full log:
  ```bash
  eas submit --platform ios --profile production --latest
  ```
- If EAS gives a build URL, open it and expand the **Fastlane / pilot** step to see the exact error message.

---

## Summary

| Issue                         | Fix                                              |
|------------------------------|--------------------------------------------------|
| Pilot failed / “couldn’t figure out what went wrong” | Set real **App Store Connect App ID** in `eas.json` → `submit.production.ios.ascAppId` |
| Auth / JWT errors            | Use App Store Connect API key in EAS credentials |
| Metadata / validation errors | Complete required fields in App Store Connect    |

After setting the correct `ascAppId` and fixing auth/metadata if needed, Fastlane pilot should succeed and the build will appear in TestFlight.

---

## “Upload Symbols Failed” (missing dSYM for React / Hermes)

### What it is

When submitting an iOS build, you may see warnings like:

- *“The archive did not include a dSYM for the React.framework with the UUIDs [76FBCEE9-...]”*
- *“The archive did not include a dSYM for the ReactNativeDependencies.framework…”*
- *“The archive did not include a dSYM for the hermes.framework…”*

**dSYM** = Debug Symbol file. They’re used to turn crash reports (memory addresses) into readable stack traces (function names, line numbers). The upload step is complaining because React Native’s prebuilt frameworks often don’t ship with dSYM files in the archive.

### Do you need to fix it?

- **Usually no.** These are **warnings**, not hard failures. The build can still be accepted by App Store Connect and appear in TestFlight. Many React Native/Expo apps ship without these framework dSYMs.
- **Your app’s own dSYM** (for your JavaScript/app code) is typically still uploaded. Crashes in *your* code can still be symbolicated.
- Missing framework dSYMs only affect symbolication of crashes that happen **inside** React/Hermes/ReactNativeDependencies. Those are less common and often less critical.

### What you can do

1. **Ignore the warnings**  
   If submission succeeds and the build shows up in TestFlight/App Store Connect, you can safely ignore these messages.

2. **Optional: build with Xcode 15**  
   This warning is known to appear more with **Xcode 16**. If EAS or your local build uses Xcode 16 and the warnings bother you, using Xcode 15 for the build (where possible) may avoid them. This is optional.

3. **Only if you need full symbolication for React/Hermes**  
   You would need to obtain or generate dSYMs for the exact React Native/Hermes version you use and add them to the archive so the UUIDs match. That’s advanced and version-sensitive; most teams don’t do it.

### Summary

| Message                     | Meaning                                      | Action                          |
|----------------------------|----------------------------------------------|---------------------------------|
| Upload Symbols Failed (React/Hermes/…) | Archive is missing dSYMs for those frameworks | Ignore if submit still succeeds |
| Build rejected / upload failed       | Real failure                                 | Check EAS/App Store Connect logs |

So: **if the build is accepted and appears in TestFlight, you don’t need to “fix” the dSYM warnings.**
