package app.exvia.mobile.notifications;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationChannelCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import app.exvia.mobile.MainActivity;
import app.exvia.mobile.R;

/** Builds and posts the notifications of the checker: one per event, and the ongoing one of its service. */
final class LocalNotifier {
    private static final String EVENTS_CHANNEL_ID = "exvia-notifications";
    private static final String EVENTS_CHANNEL_NAME = "Invitations and rides";
    private static final String BACKGROUND_CHANNEL_ID = "exvia-background-check";
    private static final String BACKGROUND_CHANNEL_NAME = "Background check";
    private static final String BACKGROUND_TITLE = "Exvia";
    private static final String BACKGROUND_TEXT = "Checking for invitations";
    // Events are posted under this tag so their ids (the event ids) never clash with the service's notification.
    private static final String EVENT_TAG = "exvia-event";

    private LocalNotifier() {}

    static void createChannels(Context context) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        manager.createNotificationChannel(
                new NotificationChannelCompat.Builder(EVENTS_CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_HIGH)
                        .setName(EVENTS_CHANNEL_NAME)
                        .build());
        manager.createNotificationChannel(
                new NotificationChannelCompat.Builder(BACKGROUND_CHANNEL_ID, NotificationManagerCompat.IMPORTANCE_LOW)
                        .setName(BACKGROUND_CHANNEL_NAME)
                        .build());
    }

    static Notification buildServiceNotification(Context context) {
        return newBuilder(context, BACKGROUND_CHANNEL_ID, BACKGROUND_TITLE, BACKGROUND_TEXT)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    @SuppressLint("MissingPermission")
    static void showEvent(Context context, int notificationId, String title, String body) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) {
            return;
        }
        createChannels(context);
        Notification notification = newBuilder(context, EVENTS_CHANNEL_ID, title, body)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .build();
        manager.notify(EVENT_TAG, notificationId, notification);
    }

    private static NotificationCompat.Builder newBuilder(Context context, String channelId, String title, String text) {
        return new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.drawable.ic_stat_exvia)
                .setColor(ContextCompat.getColor(context, R.color.ic_launcher_background))
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(buildOpenAppIntent(context));
    }

    private static PendingIntent buildOpenAppIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
