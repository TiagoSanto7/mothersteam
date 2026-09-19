import UIKit
import Capacitor

// Ciclo de vida por cenas (UIScene) — obrigatório para apps compilados com o SDK do
// iOS 27: sem ele o app fecha ao abrir (TIA-70). O UIKit cria a janela a partir do
// storyboard Main, declarado em UIApplicationSceneManifest no Info.plist. Abertura
// por URL e universal links passam a chegar aqui (não mais no AppDelegate) e são
// repassadas ao Capacitor, que as entrega aos plugins.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
