# 22: Capacitor Android shell, parked for store distribution

**What to build:** A proven, committed Capacitor Android pipeline (spec story 55, ADR-0003) — not the delivery path; the PWA (ticket 23) is. Scope:

- Capacitor shell: appId `com.pgoldman.backgammon`, webDir `dist`, committed `android/` project, landscape-locked activity.
- Toolchain on the dev machine: Temurin JDK 17 (winget) + Android command-line SDK at `%LOCALAPPDATA%\Android\Sdk` (no Android Studio); SDK packages per `android/variables.gradle` (compileSdk 36); licenses accepted.
- One successful debug-APK build (`gradlew assembleDebug`) recorded with the APK path; refresh procedure documented (`npm run build && npx cap sync android` before Gradle).
- Device install deferred until the store phase; ADR-0003's GPL note gates any selling.

**Blocked by:** None.

**Status:** in-progress (worked inline in the main session — machine state involved)

- [ ] `npx cap sync android` + `gradlew assembleDebug` produce an APK from the committed project
- [ ] Toolchain + build steps recorded in Comments, reproducible on a fresh machine
- [ ] `android/` and `capacitor.config.ts` committed; repo gauntlet still green
