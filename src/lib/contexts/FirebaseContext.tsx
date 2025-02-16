'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null
});

let firebaseInitialized = false;

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || firebaseInitialized) return;

    try {
      let firebaseApp;
      if (!getApps().length) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApps()[0];
      }

      setApp(firebaseApp);
      setDb(getFirestore(firebaseApp));
      firebaseInitialized = true;
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ app, db }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
} 