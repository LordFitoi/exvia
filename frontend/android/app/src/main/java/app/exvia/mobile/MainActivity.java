package app.exvia.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import app.exvia.mobile.notifications.NotificationCheckerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CpuWakeLockPlugin.class);
        registerPlugin(NotificationCheckerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
