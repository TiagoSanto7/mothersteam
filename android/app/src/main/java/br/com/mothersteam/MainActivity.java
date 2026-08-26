package br.com.mothersteam;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Fix crítico do microfone no WebView Android.
 *
 * O {@link BridgeWebChromeClient} default do Capacitor 8 intercepta
 * {@code onPermissionRequest} e chama internamente um {@code permissionLauncher}
 * pedindo TANTO {@code RECORD_AUDIO} QUANTO {@code MODIFY_AUDIO_SETTINGS}
 * (ver BridgeWebChromeClient.java do @capacitor/android). Se qualquer uma
 * delas não estiver granted, o callback recebe {@code isGranted=false}
 * e a bridge chama {@code request.deny()} — a chamada JS a
 * {@code navigator.mediaDevices.getUserMedia({audio:true})} rejeita
 * silenciosamente, mesmo com {@code RECORD_AUDIO} ativo nas config do app.
 *
 * Estendemos a bridge, sobrescrevemos {@code onPermissionRequest} e:
 *   1. Se {@code RECORD_AUDIO} já está granted no OS, chamamos
 *      {@code request.grant()} imediatamente — bypass do launcher e da
 *      dependência em {@code MODIFY_AUDIO_SETTINGS} (que agora também está
 *      declarada no manifesto por segurança).
 *   2. Caso contrário delegamos pro fluxo default de request permission.
 *
 * Todos os outros callbacks (file upload, JS dialogs, geolocation, console log)
 * continuam funcionando via herança de {@code BridgeWebChromeClient}.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Autoplay de áudio (usado pelo TTS do ElevenLabs) não precisa de gesto
        // do usuário — já garantimos consentimento via botão "Conectar".
        this.bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);

        this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                boolean needsAudio = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
                        needsAudio = true;
                        break;
                    }
                }

                boolean audioAlreadyGranted = ContextCompat.checkSelfPermission(
                    MainActivity.this,
                    android.Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED;

                if (needsAudio && audioAlreadyGranted) {
                    // Curto-circuito: entrega o mic pro WebView sem passar pelo
                    // launcher (que quebra se MODIFY_AUDIO_SETTINGS faltar).
                    runOnUiThread(() -> request.grant(request.getResources()));
                    return;
                }

                super.onPermissionRequest(request);
            }
        });
    }
}
