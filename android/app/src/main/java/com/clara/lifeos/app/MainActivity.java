package com.clara.lifeos.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.clara.lifeos.app.ClaraBillingPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ClaraBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}