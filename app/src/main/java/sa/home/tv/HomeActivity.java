package sa.home.tv;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * The home screen. The whole UI is a local web page (assets/index.html); this activity hosts it,
 * keeps it alive as the HOME app, and hands it a small native bridge (apps, launching, network).
 */
public class HomeActivity extends Activity {

    private WebView web;
    private Bridge bridge;
    private boolean pageReady;

    private final BroadcastReceiver packagesChanged = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) {
            if (bridge != null) bridge.invalidateApps();
            js("window.onAppsChanged && onAppsChanged()");
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        bridge = new Bridge(this, web);
        web.addJavascriptInterface(bridge, "Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return true; // the home page never navigates away
            }
            @Override public void onPageFinished(WebView v, String url) {
                pageReady = true;
            }
        });

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
        web.requestFocus();

        IntentFilter f = new IntentFilter();
        f.addAction(Intent.ACTION_PACKAGE_ADDED);
        f.addAction(Intent.ACTION_PACKAGE_REMOVED);
        f.addAction(Intent.ACTION_PACKAGE_CHANGED);
        f.addAction(Intent.ACTION_PACKAGE_REPLACED);
        f.addDataScheme("package");
        registerReceiver(packagesChanged, f);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.resumeTimers();
        web.requestFocus();
        if (pageReady) js("window.onHomeResume && onHomeResume()");
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Stop clocks and polling while an app is in front, so the launcher costs nothing then.
        js("window.onHomePause && onHomePause()");
        web.onPause();
        web.pauseTimers();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // HOME pressed while already home: go back to the main tab.
        js("window.onHomeKey && onHomeKey()");
    }

    @Override
    public void onBackPressed() {
        // A launcher never closes; the page decides what Back means (close a tab, etc).
        js("window.onBack && onBack()");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP) onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(packagesChanged); } catch (Exception ignored) { }
        if (bridge != null) bridge.shutdown();
        web.destroy();
        super.onDestroy();
    }

    void js(String code) {
        if (web != null) web.post(() -> web.evaluateJavascript(code, null));
    }
}
