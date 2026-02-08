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
        registerPlugin(com.gustavosanjose.sendintentplugin.SendIntent.class);
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
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null)
            return;
        String action = intent.getAction();
        String type = intent.getType();
        Log.d(TAG, "Handling intent: action=" + action + ", type=" + type);

        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            // Re-trigger the plugin manually for cold starts because some old plugins don't
            // handle them
            try {
                Bundle bundle = intent.getExtras();
                if (bundle != null) {
                    com.getcapacitor.JSObject extras = new com.getcapacitor.JSObject();
                    for (String key : bundle.keySet()) {
                        Object value = bundle.get(key);
                        // Convert specific types to string for JS bridge safety
                        if (value instanceof android.net.Uri) {
                            extras.put(key, value.toString());
                        } else if (value instanceof java.util.ArrayList) {
                            java.util.ArrayList list = (java.util.ArrayList) value;
                            com.getcapacitor.JSArray array = new com.getcapacitor.JSArray();
                            for (Object o : list) {
                                if (o instanceof android.net.Uri)
                                    array.put(o.toString());
                                else
                                    array.put(o);
                            }
                            extras.put(key, array);
                        } else {
                            extras.put(key, value);
                        }
                    }

                    com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                    ret.put("extras", extras);

                    // Manually notify the listeners on the "SendIntent" plugin
                    // This creates a "retained" event that JS will receive when it adds the
                    // listener
                    com.getcapacitor.Plugin plugin = getBridge().getPlugin("SendIntent").getInstance();
                    if (plugin != null) {
                        plugin.notifyListeners("appSendActionIntent", ret, true);
                        Log.d(TAG, "Notified SendIntent listeners manually");
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error processing share intent", e);
            }
        }
    }
}
