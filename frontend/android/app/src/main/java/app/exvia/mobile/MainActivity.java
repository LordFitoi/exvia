package app.exvia.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CpuWakeLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
