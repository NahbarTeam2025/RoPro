import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import aiStudioConfig from '../../firebase-applet-config.json';

// Detect if we are running in an environment with VITE_FIREBASE_API_KEY (e.g., Cloudflare Pages)
// Otherwise fallback to the AI Studio auto-generated config.
export const firebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY ? {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} : aiStudioConfig;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the explicit AI studio database ID if we're falling back, 
// otherwise use the defined env DB ID (or default if standard).
const databaseId = import.meta.env.VITE_FIREBASE_API_KEY 
  ? (import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)') 
  : aiStudioConfig.firestoreDatabaseId;

export const db = getFirestore(app, databaseId);
export const storage = getStorage(app);
