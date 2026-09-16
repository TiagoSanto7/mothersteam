import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSessionForVoiceChat()
        return true
    }

    // MARK: - Audio session do chat de voz (Sara / ElevenLabs)
    //
    // O WKWebView troca a categoria do AVAudioSession pra `.playAndRecord` sempre que
    // getUserMedia({audio:true}) é acionado (necessário pro microfone da Sara). Sem
    // `.defaultToSpeaker`, o iOS entende que é uma "chamada" e roteia a saída de áudio
    // pro fone de ouvido (earpiece) em vez do alto-falante — a voz da Sara toca baixíssima,
    // como se estivesse muda, a não ser que o aparelho fique encostado na orelha.
    // Forçamos a categoria certa no boot e reforçamos a cada mudança de rota, porque o
    // WebKit reseta isso toda vez que a captura do microfone liga/desliga.
    private func configureAudioSessionForVoiceChat() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
            try session.setActive(true)
        } catch {
            print("[AudioSession] falha ao configurar categoria: \(error)")
        }

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    @objc private func handleAudioRouteChange(_ notification: Notification) {
        let session = AVAudioSession.sharedInstance()
        guard session.category == .playAndRecord else { return }
        try? session.overrideOutputAudioPort(.speaker)
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications (APNs → FCM via Capacitor)

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(
            name: Notification.Name(CAPNotifications.DidRegisterForRemoteNotificationsWithDeviceToken.name()),
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: Notification.Name(CAPNotifications.DidFailToRegisterForRemoteNotificationsWithError.name()),
            object: error
        )
    }
}
