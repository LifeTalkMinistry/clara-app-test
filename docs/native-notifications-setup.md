# CLARA native notifications setup

CLARA uses one notification architecture across web and installed apps:

- Supported browser/PWA: Web Push through the CLARA service worker.
- Android Capacitor app: Capacitor Push Notifications + Firebase Cloud Messaging (FCM).
- iOS Capacitor app: Capacitor Push Notifications / APNs-compatible registration.
- Unsupported browser or WebView: in-app notifications remain available.

The frontend does **not** use Supabase for notification registration or delivery. Device registrations and real server push tests go through the dedicated CLARA backend API.

## Local test vs real push

- **Local test notification** is generated directly by the current device. It proves local permission and tap routing.
- **Real push test notification** is requested from the CLARA backend and delivered through the configured push provider. It proves outside-app server delivery.

## 1. Install and sync Capacitor plugins

```bash
npm install @capacitor/push-notifications @capacitor/local-notifications
npx cap sync
```

Run `npx cap sync android` after dependency changes.

## 2. Firebase Console setup for Android

1. Create or open the Firebase project used by CLARA.
2. Add the Android app using the CLARA package id:

   ```text
   com.clara.lifeos.app
   ```

3. Download `google-services.json`.
4. Place it at:

   ```text
   android/app/google-services.json
   ```

Keep production Firebase credentials out of source control unless project policy explicitly allows them.

## 3. Android requirements

The Android app must include Android notification permission and use the notification channel:

```text
clara_reminders
```

CLARA creates this channel at runtime and uses it for native FCM notifications.

## 4. CLARA backend requirements

The backend must expose the notification API used by the frontend, including the existing routes for:

- native device-token registration
- Web Push subscription registration
- notification preference synchronization
- push public-key delivery when needed
- real push test delivery

The frontend sends its authenticated CLARA backend token with these requests. The backend is responsible for identifying the signed-in user; the app must not ship database credentials or privileged push-provider secrets.

## 5. Firebase / FCM server credentials

Firebase service-account or equivalent FCM server credentials belong on the **CLARA backend**, not in the frontend build.

The app only contains the Android Firebase client configuration required for device registration. Private server credentials must remain server-side.

## 6. Frontend environment

The CLARA backend defaults to the production API configured in `src/lib/clara-backend-client.js`. Development builds may override it with:

```bash
VITE_CLARA_API_URL=https://your-clara-backend.example.com
```

Web Push may also require the configured public VAPID key, either from the frontend environment or from the CLARA backend public-key endpoint.

No Supabase URL or Supabase anonymous key is required by the app.

## 7. Build Android

```bash
npm install
npx cap sync android
npm run build:android
npx cap open android
```

Test native push on a physical device.

## 8. Test real Android push

1. Open CLARA and sign in to the CLARA account backend.
2. Go to Settings → Notifications.
3. Enable phone notifications.
4. Approve Android notification permission.
5. CLARA registers the FCM token with the CLARA backend.
6. Run the real push test.
7. The frontend requests the test through the CLARA backend.
8. Confirm the notification appears outside the app.
9. Tap it and confirm the CLARA route opens correctly.

A successful backend response should report at least one sent notification using its supported delivery counters.

## 9. Local device test

Use the local device test only to verify local permission and tap routing. A local test is not proof that backend/FCM delivery is working.

## 10. Testing checklist

### Desktop browser / PWA

- Phone notification toggle reflects live browser capability and permission.
- Web Push registration is saved through the CLARA backend.
- Local/browser test works.
- Real push test is requested through the CLARA backend.
- Service-worker notification taps route back into CLARA.

### Android installed app

- Notification permission can be granted.
- Native FCM token registration succeeds through the CLARA backend.
- Local test creates a local notification.
- Real push test is sent by the CLARA backend and appears outside the app.
- Notification taps route into CLARA.

### Unsupported environment

- CLARA does not crash.
- In-app notifications remain available.
- Device-only actions explain that the environment does not support them.

## 11. Common failure reasons

- **Permission denied:** enable CLARA notifications in device/browser settings.
- **No FCM token:** check `google-services.json`, package id, Google Play services, and Capacitor registration.
- **No CLARA backend session:** sign in again before enabling or testing server push.
- **Backend push not configured:** verify Firebase/FCM server credentials on the CLARA backend.
- **Invalid/unregistered FCM token:** reinstall or refresh registration so the backend receives a current token.
- **Web Push key/subscription issue:** verify the backend public key and stored Web Push subscription.
