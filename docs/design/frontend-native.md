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
  (`errorPath`), the offline page described below.

`webDir` points at `capacitor-www/` only because Capacitor requires one; it
holds that fallback page and nothing else.

### Offline page

"Can't reach Exvia": the brand arrow on a pulsing radar badge with a crossed-out
signal icon, a short message, a **Try again** button and three tips (airplane
mode, signal, reopen). It follows the style guide look (Minimals green, Barlow
heading, Public Sans body, light and dark through `prefers-color-scheme`, reduced
motion respected) but is fully self-contained, since it is shown precisely when
the site and its stylesheet are unreachable:

- `offline.css` redefines the small subset of
  [tokens.css](../ui-ux/tokens.css) it needs; keep the values in sync by hand.
- `fonts/` holds the two vendored font files (SIL OFL, licenses alongside).
- `offline.js` probes the server (`fetch` in `no-cors` mode, 6 s timeout) and
  only then navigates to it, so a still-dead connection shows "Still can't
  connect" instead of looping through the error page. It probes on the button,
  when the phone reports it is back online, and every 15 s.
- The server URL comes from `<meta name="server-url">` in `index.html`. It is the
  production URL and is **not** changed by `CAPACITOR_SERVER_URL`: a build pointed
  at a local server retries against production unless the meta tag is edited too
  (the error page runs without the Capacitor bridge and cannot read the config).

## Pieces

| Path | Job |
|------|-----|
| `frontend/capacitor.config.ts` | App id `app.exvia.mobile`, name, `server.url`, background color |
| `frontend/capacitor-www/` | Offline fallback page |
| `frontend/android/app/src/main/java/app/exvia/mobile/notifications/` | The native check for notifications: plugin, foreground service, worker (see [Notifications](#notifications-when-the-app-is-not-in-front)) |
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

## Location

The map screen reads the position with the web `navigator.geolocation` API
([useGeolocation.ts](../../frontend/src/hooks/useGeolocation.ts)). Capacitor's
WebView client turns that prompt into Android's runtime permission dialog, but
only for permissions declared in
[AndroidManifest.xml](../../frontend/android/app/src/main/AndroidManifest.xml).
The manifest therefore declares `ACCESS_FINE_LOCATION` and
`ACCESS_COARSE_LOCATION` (the dialog lets the user pick precise or approximate).
Without them the dialog never appears and every position request is denied.
`uses-feature` for GPS is `required="false"` so the app still installs on
devices without it (the plugin below declares it as required, so the manifest
overrides that with `tools:replace`).

Permissions are read when the APK is installed, so after changing them
reinstall the app (`make android_install` / `make android_run`). If it was
denied earlier, clear it in Android Settings > Apps > Exvia > Permissions.

### Background location (group rides)

A WebView only gets the position while the app is in front, so a group ride
([ride.md](ride.md#group-ride)) would stop sharing when the screen locks or
another app opens. In the native app, `useGeolocation({ shouldTrackInBackground:
true })` (called by `GroupRideSession`) follows the position through
[@capacitor-community/background-geolocation](https://github.com/capacitor-community/background-geolocation)
instead ([backgroundLocationWatch.ts](../../frontend/src/services/backgroundLocationWatch.ts)):

- The plugin runs a **foreground service of type `location`** (Google's fused
  provider, high accuracy, a fix about every second) with an ongoing
  notification, "Sharing your location with your ride". The service keeps the
  app's process, and so the page's JavaScript and its websocket, running with
  the screen off or another app in front.
- The watch lasts as long as the ride screen is mounted. Leaving the ride, or
  closing the app (swiping it out of recents), stops the watcher and the
  service; the plugin also ends the service when the activity is unbound or
  destroyed, so nothing keeps sharing once the app is closed.
- The permission is requested by the plugin on the first watch. A refusal, or
  the phone's location switched off, shows as `denied`, like in the browser.
- While the watch lasts, the app also holds a **partial CPU wake lock**
  ([CpuWakeLockPlugin.java](../../frontend/android/app/src/main/java/app/exvia/mobile/CpuWakeLockPlugin.java),
  registered in `MainActivity`, `WAKE_LOCK` permission). Without it the phone
  may sleep between fixes with the screen off, and the page could not send the
  position. It is released when the watch stops and when the app closes, and
  expires on its own after 12 hours if the page reloaded without releasing it.
  The cost is battery, like any navigation app.
- In a browser or the PWA the hook ignores the option and keeps the web watch,
  which the browser pauses while the page is hidden.
- `useSharePosition` also sends when a new fix arrives and the last report is
  4 s old, because the page's timers can be throttled while it is hidden but
  the fixes keep arriving.

The plugin's manifest adds `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`
and `POST_NOTIFICATIONS`. Our manifest sets its service to `exported="false"`
(`tools:replace`), since only the app binds to it. The location plugin does not ask for
`POST_NOTIFICATIONS`; the notification checker below does, once, when the app starts.

Limits:

- Some makers (Xiaomi, Huawei, Samsung's "sleeping apps") kill background apps
  even with a foreground service. The rider then has to exclude Exvia from
  battery optimization in the phone's settings.
- The JavaScript side ships with the web deploy, but the plugin is native: the
  APK must be rebuilt and reinstalled once (`make android_install`) to get it.

## Notifications when the app is not in front

A notification event ([notifications.md](notifications.md#background-check-native-app)) shows as a system
notification on the phone with the app in the background or closed, without Firebase or any push service: the app
asks the server itself, in two ways. With the app in front the live websocket toast is shown instead.

| Situation | What checks | How often |
|-----------|-------------|-----------|
| The app's process is alive (open, or in the background) | `NotificationCheckService`, a foreground service of type `remoteMessaging` | every 30 s |
| The app was swiped away, killed, or the phone restarted | `NotificationCheckWorker`, a WorkManager periodic job that needs a network | about every 15 min (Android's minimum) |

- [notificationChecker.ts](../../frontend/src/services/notificationChecker.ts) does nothing outside the native app.
  `LiveNotificationProvider` calls `startNotificationChecker(user.id)` once a user is signed in; `AuthProvider.logout`
  calls `stopNotificationChecker()`.
- [NotificationCheckerPlugin.java](../../frontend/android/app/src/main/java/app/exvia/mobile/notifications/NotificationCheckerPlugin.java)
  (`NotificationChecker`, registered in `MainActivity` like `CpuWakeLock`): `start` asks for the notification
  permission (Android 13+ shows a dialog; the check starts whatever the answer), then starts the service and enqueues the
  worker; `stop` cancels both and forgets the session. It also tells `AppVisibility` when the app is in front.
- **Session.** The page's `localStorage` is out of reach while the page is not running, so `start` hands the plugin the
  API base URL (the page's origin: the API is same-origin through the Next rewrites), the user id and the refresh
  token. `SessionStore` keeps them in private `SharedPreferences`. `NotificationApi` renews the access token with
  `POST /api/auth/token/refresh/` when it has none or the server answers `401`, and keeps the rotated pair. Refresh
  tokens are not blacklisted ([authentication.md](authentication.md)), so the page and the checker each hold their own
  chain without invalidating the other. A `401` on the refresh itself clears the native session and stops both checks
  until the user opens the app again.
- **One check** (`NotificationCheck`) asks `GET /api/notifications/?after=<last handled id>` and posts each new event
  with its `title` and `body`, oldest first, through `LocalNotifier` (channel `exvia-notifications`, high importance).
  A lock keeps the service and the worker from running at once, which would post an event twice. The first check
  after signing in (or as another user) only records the newest id, so the rider is not flooded with old events.
  While the app is in front nothing is posted (the toast covers it) but the id still moves on.
- The status bar icon is [ic_stat_exvia.xml](../../frontend/android/app/src/main/res/drawable/ic_stat_exvia.xml) (the
  brand arrow, white; tinted with `ic_launcher_background`, the brand green).
- **Tapping an event notification opens the list.** Its intent carries `OPEN_NOTIFICATIONS_EXTRA` (own request code, so
  the service's notification does not share it). `NotificationCheckerPlugin` turns it into the `notificationTapped`
  event when the app is alive (`handleOnNewIntent`), and into a pending flag the page reads with `takePendingTap` when
  the tap launched the app (the page cannot listen yet). `LiveNotificationProvider` (through `listenForNotificationTap`)
  then sets `isListRequested` and sends the rider to Home, where `HomeScreen` shows the notifications sheet until it is
  closed. The ongoing "Checking for invitations" notification only opens the app where it was left.
- The checker's requests are native, so Android's cleartext rule applies to them (the WebView is lenient, they are
  not). Debug builds carry a network security config
  ([debug/](../../frontend/android/app/src/debug/)) that allows `http` to `10.0.2.2` and `localhost`, so the checker
  works against `CAPACITOR_SERVER_URL=http://10.0.2.2:3000`. Release builds only reach `https` servers.

Trade-offs:

- While the service runs, Android shows an ongoing "Checking for invitations" notification (low importance, no sound).
  During a group ride that is a second ongoing notification next to the location one.
- A poll every 30 s costs some battery and about 120 small requests an hour per phone. Between the worker's runs an
  invitation can wait up to ~15 min, and some makers (Xiaomi, Huawei, Samsung's "sleeping apps") delay or skip
  background work: the rider has to exclude Exvia from battery optimization in the phone's settings.
- If the phone stays off or offline for over a day the native refresh token expires and checks stop until the app is
  opened.
- The `remoteMessaging` foreground service type is meant for messaging apps; Google Play asks for a declaration of it
  when the app is published.
- Native changes need the APK rebuilt and reinstalled (`make android_install`).

## Not done yet

- iOS (needs macOS).
- Native plugins: status bar. Location outside group rides (the map
  screen) still uses the web geolocation API.
- Splash screen: the project still has Capacitor's default.
- Release signing and Play Store build.

## App icon

Same brand arrow as the PWA icons ([frontend-pwa.md](frontend-pwa.md#icons)).
Adaptive icon (Android 8+): background is the color `ic_launcher_background`
(`#00A76F`), foreground is `mipmap-*/ic_launcher_foreground.png`, the white
arrow on transparent, made from `icon-maskable-512.png` so it stays inside the
safe zone for any launcher mask. Older devices use `ic_launcher.png` (rounded
square) and `ic_launcher_round.png`, resized from `icon-512.png`. The PNGs were
generated once with `sharp`; there is no generator in the repo, so redo them
from the PWA icons if the logo changes (foreground 108dp, legacy 48dp, per
density).
