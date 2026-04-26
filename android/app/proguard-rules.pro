# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# CLARA / Capacitor release safety rules.
# These keep native bridge, Cordova plugin, WebView interface, and Billing classes
# stable when release minification is enabled.

-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class com.android.billingclient.** { *; }

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses

-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
-dontwarn com.android.billingclient.**

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
