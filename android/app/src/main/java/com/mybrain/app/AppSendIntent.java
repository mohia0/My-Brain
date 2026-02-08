package com.mybrain.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gustavosanjose.sendintentplugin.SendIntent;
import com.getcapacitor.PluginCall;

@CapacitorPlugin(name = "SendIntent")
public class AppSendIntent extends SendIntent {

    @PluginMethod
    public void checkSendIntentReceived(PluginCall call) {
        Intent intent = getActivity().getIntent();
        if (intent == null) {
            call.resolve();
            return;
        }

        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            try {
                Bundle bundle = intent.getExtras();
                if (bundle != null) {
                    JSObject extras = new JSObject();
                    for (String key : bundle.keySet()) {
                        Object value = bundle.get(key);
                        if (value == null) {
                            continue;
                        }

                        if (value instanceof android.net.Uri) {
                            extras.put(key, value.toString());
                        } else if (value instanceof java.util.ArrayList) {
                            java.util.ArrayList list = (java.util.ArrayList) value;
                            JSArray array = new JSArray();
                            for (Object o : list) {
                                if (o instanceof android.net.Uri) {
                                    array.put(o.toString());
                                } else {
                                    array.put(o);
                                }
                            }
                            extras.put(key, array);
                        } else {
                            extras.put(key, value);
                        }
                    }

                    JSObject ret = new JSObject();
                    ret.put("extras", extras);

                    // For JS checks:
                    if (extras.has("android.intent.extra.TEXT") ||
                            extras.has("android.intent.extra.STREAM") ||
                            extras.has("android.intent.extra.PROCESS_TEXT")) {
                        call.resolve(ret);
                    } else {
                        call.resolve();
                    }
                } else {
                    call.resolve();
                }
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        } else {
            call.resolve();
        }
    }
}
