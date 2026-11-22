package app.exvia.mobile.notifications;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Lets the page start and stop the native check for notifications. The page hands over the session because the
 * checker runs with the page closed and cannot read its localStorage. It also reports when the app is in front.
 */
@CapacitorPlugin(
        name = "NotificationChecker",
        permissions = {@Permission(alias = NotificationCheckerPlugin.NOTIFICATIONS_ALIAS, strings = {Manifest.permission.POST_NOTIFICATIONS})})
public class NotificationCheckerPlugin extends Plugin {
    static final String NOTIFICATIONS_ALIAS = "notifications";

    @PluginMethod
    public void start(PluginCall call) {
        String apiBaseUrl = call.getString("apiBaseUrl");
        String refreshToken = call.getString("refreshToken");
        Integer userId = call.getInt("userId");
        if (apiBaseUrl == null || refreshToken == null || userId == null) {
            call.reject("apiBaseUrl, refreshToken and userId are required");
            return;
        }
        new SessionStore(getContext()).saveSession(apiBaseUrl, refreshToken, userId);
        if (shouldAskForPermission()) {
            requestPermissionForAlias(NOTIFICATIONS_ALIAS, call, "handlePermissionAnswer");
            return;
        }
        beginChecking(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        CheckScheduler.stop(getContext());
        new SessionStore(getContext()).clear();
        call.resolve();
    }

    @Override
    protected void handleOnResume() {
        AppVisibility.setVisible(true);
        super.handleOnResume();
    }

    @Override
    protected void handleOnPause() {
        AppVisibility.setVisible(false);
        super.handleOnPause();
    }

    // The check starts whatever the answer: a rider who allows notifications later gets them without a restart.
    @PermissionCallback
    private void handlePermissionAnswer(PluginCall call) {
        beginChecking(call);
    }

    private boolean shouldAskForPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState(NOTIFICATIONS_ALIAS) != PermissionState.GRANTED;
    }

    private void beginChecking(PluginCall call) {
        CheckScheduler.start(getContext());
        call.resolve();
    }
}
