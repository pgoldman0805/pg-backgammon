# Dual packaging: PWA as the mobile app, Capacitor APK parked for store distribution

The app ships to the owner's phone as a PWA (hosted static bundle, installable, offline via service worker): zero Android-specific code, and every push updates the phone automatically — the right loop for developing mobile UI and features. A Capacitor Android project is kept in-repo with a proven debug-APK build, but is not the delivery path; it exists for an eventual store release.

## Consequences

- Mobile work happens in the ordinary web codebase; the `android/` project only needs attention at store time.
- **Before selling or store listing, ADR-0001 must be revisited**: gnubg is GPL, so the app must remain GPL (source available, free redistribution permitted), and GPLv3 sits awkwardly with app-store terms. A commercial build likely means swapping to a permissively-licensed engine (the hybrid path ADR-0001 rejected for v1) or accepting GPL economics.
- Hosting the PWA publicly exposes only the GPL code; all user data stays in the device's IndexedDB.
