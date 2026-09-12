import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "eksimayaliekmekweb";

let adminApp: App;

if (getApps().length === 0) {
  // If FIREBASE_SERVICE_ACCOUNT_KEY json is supplied in env
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      const parsedKey = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(parsedKey),
        projectId,
      });
    } catch {
      adminApp = initializeApp({ projectId });
    }
  } else {
    adminApp = initializeApp({ projectId });
  }
} else {
  adminApp = getApps()[0];
}

const adminDb: Firestore = getFirestore(adminApp);
const adminAuth: Auth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
