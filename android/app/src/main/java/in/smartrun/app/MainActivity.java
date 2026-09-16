package in.smartrun.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        String url = request.getUrl().toString();
                        if (handleExternalScheme(url)) {
                            return true;
                        }
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (handleExternalScheme(url)) {
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, url);
                }

                private boolean handleExternalScheme(String url) {
                    if (url == null) return false;

                    // Intercept UPI payment intents, wallet deep links, and communication schemes
                    if (url.startsWith("upi://") ||
                        url.startsWith("tez://") ||
                        url.startsWith("phonepe://") ||
                        url.startsWith("paytmmp://") ||
                        url.startsWith("bhim://") ||
                        url.startsWith("credpay://") ||
                        url.startsWith("intent://") ||
                        url.startsWith("whatsapp://") ||
                        url.startsWith("tel:") ||
                        url.startsWith("mailto:")) {
                        try {
                            Intent intent;
                            if (url.startsWith("intent://")) {
                                intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                            } else {
                                intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            }
                            if (intent != null) {
                                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                                intent.setComponent(null);
                                intent.setSelector(null);
                                startActivity(intent);
                                return true;
                            }
                        } catch (Exception e) {
                            try {
                                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                startActivity(fallback);
                                return true;
                            } catch (Exception ignored) {}
                        }
                    }
                    return false;
                }
            });
        }
    }
}
