package sa.home.tv;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;

/**
 * Google TV will not let another app replace its home screen, and disabling the Google home app
 * leaves some boxes on a black screen. So the Google home stays installed and enabled, and this
 * service simply opens our home screen whenever the Google one comes to the front (HOME key, boot).
 */
public class HomeRedirectService extends AccessibilityService {

    private static final String[] STOCK_HOMES = {
        "com.google.android.apps.tv.launcherx",     // Google TV
        "com.google.android.tvlauncher",            // Android TV
        "com.google.android.leanbacklauncher",      // older Android TV
        "com.mitv.tvhome",                          // Xiaomi
    };

    private long lastRedirect;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence pkg = event.getPackageName();
        if (pkg == null || !isStockHome(pkg.toString())) return;
        long now = SystemClock.elapsedRealtime();
        if (now - lastRedirect < 800) return;
        lastRedirect = now;
        Intent i = new Intent(this, HomeActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        try { startActivity(i); } catch (Exception ignored) { }
    }

    private static boolean isStockHome(String pkg) {
        for (String s : STOCK_HOMES) if (s.equals(pkg)) return true;
        return false;
    }

    @Override
    public void onInterrupt() { }
}
