package app.exvia.mobile.notifications;

/**
 * Whether the app is in front. The page already shows a toast for a notification it hears live, so while this
 * is true the checker moves on without posting a system notification as well.
 */
final class AppVisibility {
    private static volatile boolean isVisible = false;

    private AppVisibility() {}

    static boolean isVisible() {
        return isVisible;
    }

    static void setVisible(boolean value) {
        isVisible = value;
    }
}
