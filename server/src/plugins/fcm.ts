import admin from 'firebase-admin'

let initialized = false

function initFirebase() {
  if (initialized || admin.apps.length) return
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[fcm] Firebase env vars not set — push notifications disabled')
    return
  }
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  })
  initialized = true
}

export async function sendPush(fcmToken: string, title: string, body: string): Promise<void> {
  initFirebase()
  if (!initialized && !admin.apps.length) return
  try {
    await admin.messaging().send({ token: fcmToken, notification: { title, body } })
  } catch (err) {
    console.error('[fcm] send error:', err)
  }
}
