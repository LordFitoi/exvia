package app.exvia.mobile.notifications;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/** Turns the two ways of checking on and off together: the foreground service and the periodic worker. */
final class CheckScheduler {
    private static final String WORK_NAME = "exvia-notification-check";
    // Android does not run periodic work more often than this.
    private static final long WORKER_INTERVAL_MINUTES = 15;

    private CheckScheduler() {}

    static void start(Context context) {
        Constraints needsNetwork = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
                NotificationCheckWorker.class, WORKER_INTERVAL_MINUTES, TimeUnit.MINUTES)
                .setConstraints(needsNetwork)
                .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request);
        ContextCompat.startForegroundService(context, new Intent(context, NotificationCheckService.class));
    }

    static void stop(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
        context.stopService(new Intent(context, NotificationCheckService.class));
    }
}
