package app.exvia.mobile.notifications;

import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Foreground service that checks for notifications every 30 seconds while the app's process is alive, so an
 * invitation shows within seconds even with the app in the background. It stops with the app being swiped
 * away; the periodic worker covers the time after that.
 */
public class NotificationCheckService extends Service {
    private static final int FOREGROUND_NOTIFICATION_ID = 1;
    private static final long CHECK_INTERVAL_SECONDS = 30;

    private ScheduledExecutorService executor;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        LocalNotifier.createChannels(this);
        startInForeground();
        if (executor == null) {
            executor = Executors.newSingleThreadScheduledExecutor();
            executor.scheduleWithFixedDelay(
                    () -> NotificationCheck.run(getApplicationContext()), 0, CHECK_INTERVAL_SECONDS, TimeUnit.SECONDS);
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startInForeground() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                    FOREGROUND_NOTIFICATION_ID,
                    LocalNotifier.buildServiceNotification(this),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING);
        } else {
            startForeground(FOREGROUND_NOTIFICATION_ID, LocalNotifier.buildServiceNotification(this));
        }
    }
}
