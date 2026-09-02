import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

let initialized = false

function initFirebase() {
  if (initialized || getApps().length) return

  // Prefere FIREBASE_SERVICE_ACCOUNT_B64 (JSON completo em base64url — sem chars
  // problemáticos em env files). Mantém suporte às 3 vars individuais como fallback.
  let projectId: string | undefined
  let clientEmail: string | undefined
  let privateKey: string | undefined

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  if (b64) {
    try {
      const sa = JSON.parse(Buffer.from(b64, 'base64url').toString())
      projectId   = sa.project_id
      clientEmail = sa.client_email
      privateKey  = sa.private_key
    } catch {
      console.warn('[fcm] FIREBASE_SERVICE_ACCOUNT_B64 inválido — push desabilitado')
      return
    }
  } else {
    projectId   = process.env.FIREBASE_PROJECT_ID
    clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[fcm] Firebase env vars not set — push notifications disabled')
    return
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  initialized = true
}

export async function sendPush(fcmToken: string, title: string, body: string): Promise<void> {
  initFirebase()
  if (!initialized && !getApps().length) return
  try {
    await getMessaging().send({ token: fcmToken, notification: { title, body } })
  } catch (err) {
    console.error('[fcm] send error:', err)
  }
}
