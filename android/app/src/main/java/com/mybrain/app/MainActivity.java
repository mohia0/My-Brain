package com.mybrain.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.gustavosanjose.sendintentplugin.SendIntent;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SendIntent.class);
        super.onCreate(savedInstanceState);

        Intent intent = getIntent();
        if (intent != null) {
            handleIntent(intent);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // The plugin usually handles this, but we log it for debugging
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null)
            return;
        String action = intent.getAction();
        String type = intent.getType();
        Log.d(TAG, "Handling intent: action=" + action + ", type=" + type);

        // Debug: Log extras for complex sharing scenarios
        Bundle extras = intent.getExtras();
        if (extras != null) {
            for (String key : extras.keySet()) {
                Log.d(TAG, "Intent Extra: " + key + " = " + extras.get(key));
            }
        }
    }
}
