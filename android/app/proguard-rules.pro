# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Capacitor Bridge, Plugins, and Plugin Methods
-keep public class * extends com.getcapacitor.Plugin
-keep public class * extends com.getcapacitor.Bridge
-keep public class * extends com.getcapacitor.BridgeActivity
-keep public class * extends com.getcapacitor.PluginConfig

# Keep JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor internals and Cordova plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Preserve annotations and line numbers for crash reports
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepattributes SourceFile,LineNumberTable

