// Retry logic for the offline fallback page. The page is served by the Capacitor shell
// from local assets, so it has to ask the real server whether it is back before leaving.

const SERVER_URL = document.querySelector('meta[name="server-url"]').content
const PROBE_TIMEOUT_MS = 6000
const RECHECK_INTERVAL_MS = 15000
const BUSY_LABEL = 'Connecting…'
const STILL_OFFLINE_TEXT = "Still can't connect. Check your signal and try again."

const screen = document.querySelector('.screen')
const retryButton = document.getElementById('retry')
const retryLabel = document.getElementById('retry-label')
const status = document.getElementById('status')
const idleLabel = retryLabel.textContent

let isChecking = false

async function isServerReachable() {
  try {
    await fetch(SERVER_URL, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return true
  } catch {
    return false
  }
}

function setChecking(isActive) {
  isChecking = isActive
  retryButton.disabled = isActive
  retryButton.classList.toggle('is-busy', isActive)
  retryLabel.textContent = isActive ? BUSY_LABEL : idleLabel
}

function showStillOffline() {
  status.textContent = STILL_OFFLINE_TEXT
  screen.classList.remove('is-still-offline')
  void screen.offsetWidth
  screen.classList.add('is-still-offline')
}

async function reconnect({ isSilent }) {
  if (isChecking) return
  setChecking(true)
  const isReachable = await isServerReachable()
  if (isReachable) {
    location.replace(SERVER_URL)
    return
  }
  setChecking(false)
  if (!isSilent) showStillOffline()
}

retryButton.addEventListener('click', () => reconnect({ isSilent: false }))
window.addEventListener('online', () => reconnect({ isSilent: true }))
setInterval(() => reconnect({ isSilent: true }), RECHECK_INTERVAL_MS)
