# Google Play Billing Checklist

- Play Console package name must match the Android `applicationId`: `com.clara.moneytracker`.
- Subscription products must exist and be active: `clara_pro_99`, `clara_core_199`, `clara_lifeos_499`.
- Each subscription needs at least one active base plan or offer available to the tester account.
- Test accounts must be opted into the testing track and added as license testers when using test purchases.
- Purchase testing must use a Play-distributed internal, closed, open, or production build. Sideloaded debug APKs can report billing or product availability failures.
- If the CLARA debug panel shows missing product IDs, confirm the product type is subscription and that the selected Google account can see that product.
