package app.exvia.mobile.notifications;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** The check for when the app is not running: WorkManager wakes it about every 15 minutes, even after a reboot. */
public class NotificationCheckWorker extends Worker {
    public NotificationCheckWorker(@NonNull Context context, @NonNull WorkerParameters parameters) {
        super(context, parameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        NotificationCheck.run(getApplicationContext());
        return Result.success();
    }
}
