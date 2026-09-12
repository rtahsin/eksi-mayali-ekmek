/**
 * EkmekLab Firebase Client Configuration
 * Fallbacks are provided using the verified project settings for 'eksimayaliekmekweb'
 */

export const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyDC_r1CdLMa3JqtxiqFdsDAF8zAaOE7bH8",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "eksimayaliekmekweb.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "eksimayaliekmekweb",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "eksimayaliekmekweb.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "984417239539",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:984417239539:web:544b34c57488722f6a1286",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    "G-ESX3TRFPBB",
};
