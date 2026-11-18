package app.exvia.mobile;

import android.content.Context;
import android.os.PowerManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the CPU awake while the screen is off, so the position still reaches the page and the page can
 * still send it. Held only while a ride shares its position; released on stop and when the app closes.
 */
@CapacitorPlugin(name = "CpuWakeLock")
public class CpuWakeLockPlugin extends Plugin {
    private static final String LOCK_TAG = "exvia:ride-sharing";
    // Safety net if the page reloads and never calls release: a ride does not last this long.
    private static final long MAX_HOLD_MS = 12L * 60 * 60 * 1000;

    private PowerManager.WakeLock wakeLock;

    @PluginMethod
    public void acquire(PluginCall call) {
        if (wakeLock == null) {
            PowerManager powerManager =
                    (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, LOCK_TAG);
            wakeLock.setReferenceCounted(false);
        }
        wakeLock.acquire(MAX_HOLD_MS);
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        releaseLock();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        releaseLock();
        super.handleOnDestroy();
    }

    private void releaseLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }
}
