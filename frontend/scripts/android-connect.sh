#!/usr/bin/env bash
# Asks for the phone's IP, port and pairing code, pairs adb with the phone and
# waits for it to connect, so `make android_install` can reach the phone.
set -euo pipefail

ADB="${ANDROID_HOME:-$HOME/Android/Sdk}/platform-tools/adb"
ADB_TIMEOUT_SECONDS=15
CONNECT_WAIT_SECONDS=20

fail() {
  echo "android_connect: $1" >&2
  exit 1
}

ask_required() {
  local prompt="$1"
  local answer
  read -r -p "$prompt" answer
  [ -n "$answer" ] || fail "this field is required."
  echo "$answer"
}

[ -x "$ADB" ] || fail "adb not found at $ADB."
phone_ip=$(ask_required "Phone IP: ")
phone_port=$(ask_required "Port: ")
pairing_code=$(ask_required "Pairing code: ")
phone_address="$phone_ip:$phone_port"
timeout "$ADB_TIMEOUT_SECONDS" "$ADB" pair "$phone_address" "$pairing_code" \
  || fail "pairing failed; check the code and that the pairing dialog is still open on the phone."

echo "Paired. Waiting for the phone to connect..."
for _ in $(seq "$CONNECT_WAIT_SECONDS"); do
  if "$ADB" devices | grep -v "^emulator-" | grep -q "[[:space:]]device$"; then
    "$ADB" devices
    exit 0
  fi
  sleep 1
done
fail "paired, but the phone did not connect within $CONNECT_WAIT_SECONDS seconds; check that Wireless debugging is still on."
