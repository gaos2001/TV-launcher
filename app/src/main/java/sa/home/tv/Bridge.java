package sa.home.tv;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Everything the web page can ask the system for. All calls arrive on a WebView binder thread. */
public class Bridge {

    private final HomeActivity activity;
    private final WebView web;
    private final PackageManager pm;
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private final Map<String, String> imageCache = new ConcurrentHashMap<>();
    private volatile String appsJson;

    Bridge(HomeActivity activity, WebView web) {
        this.activity = activity;
        this.web = web;
        this.pm = activity.getPackageManager();
    }

    void shutdown() { io.shutdownNow(); }

    void invalidateApps() { appsJson = null; }

    // ---------------------------------------------------------------- apps

    /** Builds the app list off the UI thread and hands it to window.onApps(list). */
    @JavascriptInterface
    public void requestApps() {
        io.execute(() -> {
            String json = appsJson;
            if (json == null) json = appsJson = buildApps();
            activity.js("window.onApps && onApps(" + json + ")");
        });
    }

    private String buildApps() {
        JSONArray out = new JSONArray();
        Set<String> seen = new HashSet<>();
        String self = activity.getPackageName();
        try {
            // TV apps first (they have proper banners), then phone-style apps that still run on TV.
            String[] cats = { Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER };
            for (String cat : cats) {
                Intent q = new Intent(Intent.ACTION_MAIN).addCategory(cat);
                List<ResolveInfo> list = pm.queryIntentActivities(q, 0);
                for (ResolveInfo ri : list) {
                    ActivityInfo ai = ri.activityInfo;
                    if (ai == null || self.equals(ai.packageName) || !seen.add(ai.packageName)) continue;
                    JSONObject o = new JSONObject();
                    o.put("pkg", ai.packageName);
                    o.put("label", String.valueOf(ri.loadLabel(pm)));
                    Drawable banner = ai.loadBanner(pm);
                    if (banner == null && ai.applicationInfo != null) banner = ai.applicationInfo.loadBanner(pm);
                    o.put("banner", banner != null);
                    o.put("img", image(ai.packageName, banner != null ? banner : ri.loadIcon(pm), banner != null));
                    o.put("tv", Intent.CATEGORY_LEANBACK_LAUNCHER.equals(cat));
                    out.put(o);
                }
            }
        } catch (Exception e) {
            // Leave whatever was collected.
        }
        return out.toString();
    }

    private String image(String pkg, Drawable d, boolean banner) {
        String key = pkg + (banner ? ":b" : ":i");
        String cached = imageCache.get(key);
        if (cached != null) return cached;
        int w = banner ? 320 : 160, h = banner ? 180 : 160;
        Bitmap bmp;
        if (d instanceof BitmapDrawable && ((BitmapDrawable) d).getBitmap() != null
                && !banner && ((BitmapDrawable) d).getBitmap().getWidth() <= 192) {
            bmp = ((BitmapDrawable) d).getBitmap();
        } else {
            bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(bmp);
            d.setBounds(0, 0, w, h);
            d.draw(c);
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.PNG, 100, bos);
        String uri = "data:image/png;base64," + Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
        imageCache.put(key, uri);
        return uri;
    }

    @JavascriptInterface
    public boolean launch(String pkg) {
        Intent i = pm.getLeanbackLaunchIntentForPackage(pkg);
        if (i == null) i = pm.getLaunchIntentForPackage(pkg);
        if (i == null) return false;
        start(i);
        return true;
    }

    /** Package of the first installed app whose name or package contains one of the words (| separated). */
    @JavascriptInterface
    public String findApp(String words) {
        String json = appsJson;
        if (json == null) json = appsJson = buildApps();
        try {
            JSONArray a = new JSONArray(json);
            String[] keys = words.toLowerCase(Locale.ROOT).split("\\|");
            for (String k : keys) {
                for (int i = 0; i < a.length(); i++) {
                    JSONObject o = a.getJSONObject(i);
                    String hay = (o.getString("label") + " " + o.getString("pkg")).toLowerCase(Locale.ROOT);
                    if (hay.contains(k.trim())) return o.getString("pkg");
                }
            }
        } catch (Exception ignored) { }
        return "";
    }

    @JavascriptInterface
    public void openStore(String query) {
        start(new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=" + Uri.encode(query))),
              new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/search?q=" + Uri.encode(query))));
    }

    @JavascriptInterface
    public void openSettings() {
        start(new Intent(Settings.ACTION_SETTINGS));
    }

    @JavascriptInterface
    public void openInputs() {
        // Google TV / Android TV input picker; harmless no-op where it does not exist.
        start(new Intent("com.android.tv.action.VIEW_INPUTS"), new Intent(Settings.ACTION_SETTINGS));
    }

    /** Starts the first intent that resolves; runs on the UI thread. */
    private void start(Intent... options) {
        activity.runOnUiThread(() -> {
            for (Intent i : options) {
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { activity.startActivity(i); return; } catch (Exception ignored) { }
            }
        });
    }

    // ---------------------------------------------------------------- network

    /** GET a URL natively (no CORS limits) and reply with window.onHttp(id, status, body). */
    @JavascriptInterface
    public void httpGet(final String id, final String url) {
        io.execute(() -> {
            int status = 0;
            String body = "";
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 12; TV) TVHome/1.0");
                c.setRequestProperty("Accept", "application/json");
                status = c.getResponseCode();
                InputStream in = status < 400 ? c.getInputStream() : c.getErrorStream();
                if (in != null) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
                    in.close();
                    body = new String(bos.toByteArray(), StandardCharsets.UTF_8);
                }
            } catch (Exception e) {
                status = 0;
            } finally {
                if (c != null) c.disconnect();
            }
            activity.js("window.onHttp && onHttp(" + JSONObject.quote(id) + "," + status + ","
                    + JSONObject.quote(body) + ")");
        });
    }
}
