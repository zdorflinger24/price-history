'use client';

// Import Firebase modules
import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  Firestore 
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

function initializeFirebase() {
  if (typeof window === 'undefined') return;

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log('Firebase app initialized');
    } else {
      app = getApps()[0];
      console.log('Using existing Firebase app');
    }

    if (app) {
      db = getFirestore(app);
      auth = getAuth(app);
      storage = getStorage(app);

      // Enable offline persistence for Firestore
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });

      console.log('Firebase services initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Initialize Firebase on the client side only
if (typeof window !== 'undefined') {
  initializeFirebase();
}

export { db, auth, storage };
