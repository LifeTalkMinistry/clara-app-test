# CLARA native notifications setup

CLARA uses a universal notification bridge:

- Supported web browser or installed PWA: Web Push through the existing service worker.
- Android installed app through Capacitor: native push through Capacitor Push Notifications and Firebase Cloud Messaging.
- iOS installed app through Capacitor: native push scaffold through Capacitor Push Notifications.
- Unsupported browser or WebView: in-app notifications remain available.

## 1. Install and sync Capacitor notification plugins

```bash
npm install @capacitor/push-notifications @capacitor/local-notifications
npx cap sync
```

Run `npx cap sync android` before opening Android Studio after dependency changes.

## 2. Firebase Console setup for Android

1. Create or open the Firebase project for CLARA.
2. Add an Android app using the CLARA package id:

   ```text
   com.clara.lifeos.app
   ```

3. Download `google-services.json`.
4. Place it at:

   ```text
   android/app/google-services.json
   ```

Do not commit a production `google-services.json` unless the project policy explicitly allows it. Use a placeholder or keep it in local/CI secrets when possible.

## 3. Android native requirements

The Android app must include:

- Android 13+ permission:

  ```xml
  android.permission.POST_NOTIFICATIONS
  ```

- Notification channel id:

  ```text
  clara_reminders
  ```

- Channel name:

  ```text
  CLARA Reminders
  ```

- Importance:

  ```text
  High
  ```

- Description:

  ```text
  Money reminders and important CLARA updates.
  ```

This branch creates the channel in `MainActivity.java` and adds the permission in `AndroidManifest.xml`.

## 4. Supabase schema

Run the universal notification device migration:

```sql
supabase/universal_notification_devices.sql
```

This creates `public.user_notification_devices` for native FCM/APNs tokens and mirrored web-push subscriptions. The old `public.user_push_subscriptions` table remains for backward compatibility.

## 5. Supabase edge function secrets

Web Push still needs:

```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT="mailto:support@clara.app"
```

Android FCM needs:

```bash
supabase secrets set FIREBASE_PROJECT_ID=...
supabase secrets set FIREBASE_CLIENT_EMAIL=...
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Keep the private key quoted so newline escapes are preserved.

## 6. Build and open Android

```bash
npm install
npx cap sync android
npm run build:android
npx cap open android
```

In Android Studio, build and install the app on a real device. Push notification behavior should be tested on a physical device, not only an emulator.

## 7. Testing checklist

### Desktop browser

- Settings → Notifications shows browser/web app wording.
- Enable device notifications uses Web Push when VAPID is configured.
- Test notification works.
- Existing service worker still handles notification taps.

### Unsupported browser or WebView

- Settings → Notifications says browser notifications are unavailable.
- The app does not crash.
- In-app notifications still work.
- Notification category toggles remain usable.

### Android Capacitor installed app

- Settings → Notifications does not say “This browser cannot receive device notifications.”
- It shows phone/native notification copy.
- Enable phone notifications requests Android permission.
- A token is saved to `user_notification_devices` with channel `fcm` and platform `android`.
- Notification taps open the CLARA route from the payload data.
- Test notification works through local notifications.
- `send-task-reminders` can send to the FCM token after Firebase secrets are configured.

### Supabase

- `user_notification_devices` migration runs cleanly.
- Existing `user_push_subscriptions` rows still work as fallback.
- Invalid FCM or Web Push targets are deactivated without failing the whole function.
