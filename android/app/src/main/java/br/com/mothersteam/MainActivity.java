package br.com.mothersteam;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import com.getcapacitor.BridgeActivity;

/**
 * Android WebView doesn't auto-grant WebRTC/getUserMedia permissions —
 * even when the native RECORD_AUDIO permission is granted at the OS level,
 * the WebView still fires its own {@link WebChromeClient#onPermissionRequest}
 * dance which defaults to DENY. That's why the ElevenLabs voice conversation
 * in <MaeIAScreen> silently failed even though the app had the mic permission.
 *
 * We override {@link WebChromeClient#onPermissionRequest} on the WebView the
 * Capacitor bridge already created, and auto-grant audio/video capture. The
 * native RECORD_AUDIO permission dialog still shows on first use (Android
 * enforces that separately from the WebView permission).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final WebChromeClient existingClient = this.bridge.getWebView().getWebChromeClient();
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)
                                || PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                            request.grant(request.getResources());
                            return;
                        }
                    }
                    request.deny();
                });
            }

            // Delegate everything else to Capacitor's original client so we don't
            // break file uploads, JS dialogs, console logs, etc.
            @Override
            public boolean onShowFileChooser(android.webkit.WebView webView,
                                             android.webkit.ValueCallback<android.net.Uri[]> filePathCallback,
                                             FileChooserParams fileChooserParams) {
                return existingClient != null && existingClient.onShowFileChooser(webView, filePathCallback, fileChooserParams);
            }

            @Override
            public boolean onJsAlert(android.webkit.WebView view, String url, String message,
                                     android.webkit.JsResult result) {
                if (existingClient != null) return existingClient.onJsAlert(view, url, message, result);
                return super.onJsAlert(view, url, message, result);
            }

            @Override
            public boolean onJsConfirm(android.webkit.WebView view, String url, String message,
                                       android.webkit.JsResult result) {
                if (existingClient != null) return existingClient.onJsConfirm(view, url, message, result);
                return super.onJsConfirm(view, url, message, result);
            }

            @Override
            public boolean onJsPrompt(android.webkit.WebView view, String url, String message, String defaultValue,
                                      android.webkit.JsPromptResult result) {
                if (existingClient != null) return existingClient.onJsPrompt(view, url, message, defaultValue, result);
                return super.onJsPrompt(view, url, message, defaultValue, result);
            }

            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                if (existingClient != null) return existingClient.onConsoleMessage(consoleMessage);
                return super.onConsoleMessage(consoleMessage);
            }
        });
    }
}
