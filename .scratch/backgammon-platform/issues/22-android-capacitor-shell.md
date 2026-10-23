# 22: Capacitor Android shell, parked for store distribution

**What to build:** A proven, committed Capacitor Android pipeline (spec story 55, ADR-0003) — not the delivery path; the PWA (ticket 23) is. Scope:

- Capacitor shell: appId `com.pgoldman.backgammon`, webDir `dist`, committed `android/` project, landscape-locked activity.
- Toolchain on the dev machine: Temurin JDK 17 (winget) + Android command-line SDK at `%LOCALAPPDATA%\Android\Sdk` (no Android Studio); SDK packages per `android/variables.gradle` (compileSdk 36); licenses accepted.
- One successful debug-APK build (`gradlew assembleDebug`) recorded with the APK path; refresh procedure documented (`npm run build && npx cap sync android` before Gradle).
- Device install deferred until the store phase; ADR-0003's GPL note gates any selling.

**Blocked by:** None.

**Status:** done

- [x] `npx cap sync android` + `gradlew assembleDebug` produce an APK from the committed project
- [x] Toolchain + build steps recorded in Comments, reproducible on a fresh machine
- [x] `android/` and `capacitor.config.ts` committed; repo gauntlet still green

## Comments

Pipeline proven 2026-10-23 (inline, main session). Debug APK built: `android/app/build/outputs/apk/debug/app-debug.apk` (6.2 MB).

Toolchain (fresh-machine reproduction, no Android Studio):

1. `winget install EclipseAdoptium.Temurin.21.JDK` — Capacitor's Android template targets **Java 21** (a JDK 17 attempt fails with "invalid source release: 21").
2. Android command-line tools: download `commandlinetools-win-*_latest.zip` from dl.google.com/android/repository, extract to `%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest`.
3. `sdkmanager --licenses` (accept), then `sdkmanager platform-tools "platforms;android-36" "build-tools;36.0.0"` (match `android/variables.gradle` compileSdk).
4. `android/local.properties` with `sdk.dir` pointing at the SDK (gitignored; recreate per machine).
5. Build: `npm run build && npx cap sync android`, then in `android/`: `JAVA_HOME=<jdk21> ANDROID_HOME=<sdk> gradlew assembleDebug`.

Landscape lock: `android:screenOrientation="sensorLandscape"` on MainActivity. Device install deferred per ADR-0003 (PWA is the delivery path); when wanted: `adb install app-debug.apk` with USB debugging, or copy the APK to the device. Store release additionally needs signing config + a revisit of ADR-0001's GPL position (ADR-0003).
