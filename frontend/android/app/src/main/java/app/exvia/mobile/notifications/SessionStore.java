package app.exvia.mobile.notifications;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * What the checker needs to ask the server on its own, while the page (and its localStorage) is not running:
 * where the server is, the tokens, and the id of the last notification already handled.
 */
final class SessionStore {
    static final long NO_BASELINE = -1L;

    private static final String PREFS_NAME = "exvia_notification_checker";
    private static final String KEY_API_BASE_URL = "api_base_url";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_LAST_SEEN_ID = "last_seen_id";
    private static final long NO_USER = -1L;

    private final SharedPreferences preferences;

    SessionStore(Context context) {
        preferences = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    boolean hasSession() {
        return getApiBaseUrl() != null && getRefreshToken() != null;
    }

    String getApiBaseUrl() {
        return preferences.getString(KEY_API_BASE_URL, null);
    }

    String getAccessToken() {
        return preferences.getString(KEY_ACCESS_TOKEN, null);
    }

    String getRefreshToken() {
        return preferences.getString(KEY_REFRESH_TOKEN, null);
    }

    long getLastSeenId() {
        return preferences.getLong(KEY_LAST_SEEN_ID, NO_BASELINE);
    }

    void saveLastSeenId(long notificationId) {
        preferences.edit().putLong(KEY_LAST_SEEN_ID, notificationId).apply();
    }

    void saveTokens(String accessToken, String refreshToken) {
        preferences.edit().putString(KEY_ACCESS_TOKEN, accessToken).putString(KEY_REFRESH_TOKEN, refreshToken).apply();
    }

    /** Stores the session the page hands over. Another user on the same phone starts again from a fresh baseline. */
    void saveSession(String apiBaseUrl, String refreshToken, long userId) {
        SharedPreferences.Editor editor = preferences.edit()
                .putString(KEY_API_BASE_URL, apiBaseUrl)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .remove(KEY_ACCESS_TOKEN)
                .putLong(KEY_USER_ID, userId);
        if (preferences.getLong(KEY_USER_ID, NO_USER) != userId) {
            editor.putLong(KEY_LAST_SEEN_ID, NO_BASELINE);
        }
        editor.apply();
    }

    void clear() {
        preferences.edit().clear().apply();
    }
}
