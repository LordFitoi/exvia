#!/usr/bin/env bash
# Boots the Android emulator (creating its virtual device on first use), then
# installs and launches the debug APK built by `make android_build`.
set -euo pipefail

AVD_NAME="exvia_pixel"
AVD_DEVICE="pixel_8"
AVD_IMAGE="system-images;android-36;google_apis;x86_64"
AVD_RAM_MB=4096
APP_ID="app.exvia.mobile"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
BOOT_TIMEOUT_SECONDS=300
APT_PACKAGES_HINT="sudo apt-get install -y libpulse0 libnss3 libxkbfile1 libasound2t64 libsm6 libice6 libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-render-util0 libxcb-xinerama0 libxkbcommon-x11-0"
EMULATOR_LOG="${TMPDIR:-/tmp}/exvia-emulator.log"

fail() {
  echo "android_run: $1" >&2
  exit 1
}

check_emulator_libraries() {
  local emulator_dir="$ANDROID_HOME/emulator"
  local missing
  missing=$(LD_LIBRARY_PATH="$emulator_dir/lib64:$emulator_dir/lib64/qt/lib" \
    ldd "$emulator_dir/qemu/linux-x86_64/qemu-system-x86_64" \
    "$emulator_dir/lib64/qt/plugins/platforms/libqxcbAndroidEmu.so" \
    "$emulator_dir/lib64/qt/lib/libQt6XcbQpaAndroidEmu.so.6" \
    | { grep "not found" || true; } | awk '{print $1}' | sort -u | tr '\n' ' ')
  [ -z "$missing" ] || fail "missing system libraries: $missing. Install them: $APT_PACKAGES_HINT"
}

check_prerequisites() {
  [ -f "$APK_PATH" ] || fail "$APK_PATH not found; run make android_build first."
  if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
    fail "no access to /dev/kvm. Run: sudo usermod -aG kvm \$USER, then restart WSL (wsl --shutdown)."
  fi
  check_emulator_libraries
}

create_avd_if_missing() {
  local existing_avds
  existing_avds=$(avdmanager list avd -c)
  if grep -qx "$AVD_NAME" <<<"$existing_avds"; then
    return
  fi
  echo "Creating the $AVD_NAME virtual device..."
  echo no | avdmanager create avd -n "$AVD_NAME" -k "$AVD_IMAGE" -d "$AVD_DEVICE" >/dev/null
  sed -i -e "s/^hw.gpu.enabled=.*/hw.gpu.enabled=yes/" \
    -e "s/^hw.ramSize=.*/hw.ramSize=$AVD_RAM_MB/" "$HOME/.android/avd/$AVD_NAME.avd/config.ini"
}

start_emulator_if_needed() {
  if adb devices | grep -q "^emulator-"; then
    return
  fi
  echo "Starting the emulator (log: $EMULATOR_LOG)..."
  nohup emulator -avd "$AVD_NAME" -no-snapshot-save -gpu swiftshader_indirect \
    >"$EMULATOR_LOG" 2>&1 &
}

wait_for_boot() {
  local waited=0
  adb wait-for-device
  until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
    [ "$waited" -lt "$BOOT_TIMEOUT_SECONDS" ] || fail "the emulator did not boot in time; see $EMULATOR_LOG."
    sleep 2
    waited=$((waited + 2))
  done
}

install_and_launch() {
  adb install -r "$APK_PATH"
  adb shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null
  echo "Exvia is running in the emulator."
}

check_prerequisites
create_avd_if_missing
start_emulator_if_needed
wait_for_boot
install_and_launch
