package com.clara.lifeos.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.clara.lifeos.app.ClaraBillingPlugin;

public class MainActivity extends BridgeActivity {
    private static final String CLARA_REMINDERS_CHANNEL_ID = "clara_reminders";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        createClaraReminderChannel();
        registerPlugin(ClaraBillingPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep conversational composers visible when Android's IME opens.
        // This mirrors ChatGPT-style behavior: the WebView is resized to the
        // remaining visible area instead of the keyboard panning/covering the
        // bottom input bar.
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    private void createClaraReminderChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CLARA_REMINDERS_CHANNEL_ID,
            "CLARA Reminders",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Money reminders and important CLARA updates.");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
