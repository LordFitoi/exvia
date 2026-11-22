package app.exvia.mobile.notifications;

import android.content.Context;
import android.util.Log;

import java.io.IOException;
import java.util.List;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * One check: asks the server for the notifications newer than the last one handled and posts them. Run by the
 * service every few seconds and by the worker when the app is closed; the lock keeps the two from overlapping,
 * which would post an event twice.
 */
final class NotificationCheck {
    private static final String TAG = "ExviaNotificationCheck";
    private static final Object LOCK = new Object();
    private static final long EMPTY_BASELINE = 0L;

    private NotificationCheck() {}

    static void run(Context context) {
        synchronized (LOCK) {
            SessionStore store = new SessionStore(context);
            if (!store.hasSession()) {
                return;
            }
            try {
                checkForNew(context, store);
            } catch (NotificationApi.SessionExpiredException error) {
                store.clear();
                CheckScheduler.stop(context);
            } catch (IOException | JSONException error) {
                Log.w(TAG, "Could not check for notifications", error);
            }
        }
    }

    private static void checkForNew(Context context, SessionStore store)
            throws IOException, JSONException, NotificationApi.SessionExpiredException {
        long lastSeenId = store.getLastSeenId();
        List<JSONObject> events = new NotificationApi(store).fetchNotificationsAfter(lastSeenId);
        if (events.isEmpty()) {
            if (lastSeenId == SessionStore.NO_BASELINE) {
                store.saveLastSeenId(EMPTY_BASELINE);
            }
            return;
        }
        // The first check only sets the baseline, so a rider is not flooded with what they already had.
        boolean shouldPost = lastSeenId != SessionStore.NO_BASELINE && !AppVisibility.isVisible();
        if (shouldPost) {
            postAll(context, events);
        }
        store.saveLastSeenId(events.get(events.size() - 1).getLong("id"));
    }

    private static void postAll(Context context, List<JSONObject> events) throws JSONException {
        for (JSONObject event : events) {
            LocalNotifier.showEvent(context, event.getInt("id"), event.getString("title"), event.getString("body"));
        }
    }
}
