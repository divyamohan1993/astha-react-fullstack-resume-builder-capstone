import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

let cached: { app: FirebaseApp; db: Firestore; auth: Auth } | null = null;

function getConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg.apiKey && cfg.projectId);
}

export function initFirebase() {
  if (cached) return cached;

  const config = getConfig();
  if (!config.apiKey || !config.projectId) {
    throw new Error('Firebase config missing. Set VITE_FIREBASE_* env vars.');
  }

  const app = initializeApp(config);
  const db = getFirestore(app);
  const auth = getAuth(app);

  cached = { app, db, auth };
  return cached;
}

export function getDb(): Firestore {
  return initFirebase().db;
}

export function getAppAuth(): Auth {
  return initFirebase().auth;
}
