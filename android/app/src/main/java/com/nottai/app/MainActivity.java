package com.nottai.app;

import com.getcapacitor.BridgeActivity;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onResume() {
        super.onResume();
        WebView.setWebContentsDebuggingEnabled(true);
    }
}
