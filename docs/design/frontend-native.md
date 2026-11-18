# Native Android app (Capacitor)

The Next.js app in [frontend/](../../frontend/) is wrapped in a native Android
shell with [Capacitor](https://capacitorjs.com). The shell is a WebView that
loads the hosted site, so the web app, the PWA ([frontend-pwa.md](frontend-pwa.md))
and the native app share one codebase and ship together.

## Why the WebView loads a URL

The app cannot run from bundled static files: it uses Server Components,
`cacheComponents`, and rewrites that proxy `/api`, `/ws`, `/media` and `/static`
to Django ([frontend.md](frontend.md#single-domain)). So
[capacitor.config.ts](../../frontend/capacitor.config.ts) sets `server.url`
instead of bundling a build:

- The WebView origin is the site itself, so the browser code's relative URLs
  (`/api/auth/token/`) and the WebSocket path keep working with no CORS and no
  API base URL setting.
- Web deploys reach installed apps with no store release. A new APK is only
  needed when the native shell, plugins or icons change.
- The app needs a connection. When the page cannot load, the WebView shows
  [capacitor-www/index.html](../../frontend/capacitor-www/index.html)
  (`errorPath`), a plain "could not reach the server" page.

`webDir` points at `capacitor-www/` only because Capacitor requires one; it
holds that fallback page and nothing else.

## Pieces

| Path | Job |
|------|-----|
| `frontend/capacitor.config.ts` | App id `app.exvia.mobile`, name, `server.url`, background color |
| `frontend/capacitor-www/` | Offline fallback page |
| `frontend/android/` | Generated native project (Gradle). Committed, except build output and `local.properties` |
| `frontend/scripts/android-run.sh` | Behind `make android_run`: creates the `exvia_pixel` virtual device (Pixel 8, Android 36, 4 GB RAM) if missing, boots it, installs the APK and launches the app |
| `Makefile` (`android_*`) | `android_sync`, `android_build`, `android_run`, `android_studio` |

## Server URL

`CAPACITOR_SERVER_URL` is read by `capacitor.config.ts` on `cap sync`; the
default is `https://exvia.up.railway.app`. `cleartext` is enabled only for
`http://` URLs. The value is copied into
`android/app/src/main/assets/capacitor.config.json`, so run the sync again
whenever it changes.

To test against the local stack from the Android emulator (where the host is
`10.0.2.2`):

```bash
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 make android_sync
```

Do not build a release with a local URL.

## Toolchain (WSL, no Windows install)

Everything lives in `~/Android` inside WSL and is wired through `~/.bashrc`:

| Piece | Location |
|-------|----------|
| Android Studio (Linux tarball, runs through WSLg) | `~/Android/android-studio`, started by `make android_studio` |
| JDK 21 (Temurin), required by Capacitor 8 and Gradle | `~/Android/jdk-21` (`JAVA_HOME`; also `org.gradle.java.home` in `~/.gradle/gradle.properties`) |
| Android SDK: platform 36, build-tools 36.0.0, platform-tools, emulator, Google APIs x86_64 system image | `~/Android/Sdk` (`ANDROID_HOME`) |

- Studio runs on its own bundled Java 25 runtime, so `STUDIO_JDK` points at
  `~/Android/android-studio/jbr`. Do not set it to the JDK 21: Studio refuses
  to start with it. Gradle uses JDK 21 through
  `org.gradle.java.home`, so set Studio's Gradle JDK to that one if it asks.
- `frontend/android/local.properties` (`sdk.dir`) is machine-specific and
  git-ignored; Studio recreates it on open.
- Do not accept Studio's Android Gradle Plugin upgrade prompt. It moves AGP to
  9.x and Gradle to 9.x, which rejects the `proguard-android.txt` line in
  Capacitor's `app/build.gradle` and breaks `make android_build`. Capacitor 8
  pins AGP 8.13 and Gradle 8.14; they only change with a Capacitor upgrade.
- Capacitor 8 needs Node 22+, compile/target SDK 36 and min SDK 24.

## Workflow

```bash
make android_build     # sync + debug APK in frontend/android/app/build/outputs/apk/debug/
make android_run       # build, boot the emulator, install and launch the app
make android_studio    # sync + open the project in Android Studio
```

`android_run` reuses an emulator that is already running and logs its output to
`/tmp/exvia-emulator.log`. It stops with the fix when a prerequisite is missing.
The emulator needs, once, on the WSL side:

```bash
sudo usermod -aG kvm $USER   # then run `wsl --shutdown` from Windows and reopen WSL
sudo apt-get install -y libpulse0 libnss3 libxkbfile1 libasound2t64 libsm6 libice6 libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-render-util0 libxcb-xinerama0 libxkbcommon-x11-0
```

To run on a physical phone, turn on Wireless debugging in Developer options,
then:

```bash
make android_connect   # asks for the phone's IP and ports (and the pairing code on first use)
make android_install   # build and install on the connected phone
```

`android_connect` ([android-connect.sh](../../frontend/scripts/android-connect.sh))
asks for three fields: the phone's IP, the port and the pairing code. It runs
`adb pair` with them and then waits up to 20 seconds for the phone to appear in
`adb devices`. It does not run `adb connect`: after pairing, adb connects to the
phone by itself (mDNS) on its real connection port, and connecting to the
pairing port, which closes once pairing is done, only adds an `offline` entry
and fails. The phone
and the PC must be on the same Wi-Fi, and the pairing dialog ("Pair device with
pairing code") must stay open until the script finishes.

Alternatively, copy `app-debug.apk` to the phone and open it, allowing installs
from unknown sources. Over USB, the device must first be attached to WSL
with `usbipd`.

## Not done yet

- iOS (needs macOS).
- Native plugins: geolocation, push, status bar. The WebView uses the web
  geolocation API; add `@capacitor/geolocation` if background tracking is
  needed.
- App icon and splash screen: the project still has Capacitor's defaults.
  Generate them from the PWA icons ([frontend-pwa.md](frontend-pwa.md#icons)).
- Release signing and Play Store build.
