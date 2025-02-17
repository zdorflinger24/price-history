'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import ClientOnly from '@/lib/components/ClientOnly';

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
  initialized: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  initialized: false
});

function FirebaseProviderContent({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<FirebaseContextType>({
    app: null,
    db: null,
    initialized: false
  });

  useEffect(() => {
    let mounted = true;

    const initializeFirebase = async () => {
      if (context.initialized) return;

      try {
        let firebaseApp: FirebaseApp;
        
        if (!getApps().length) {
          const missingKeys = Object.entries(firebaseConfig)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

          if (missingKeys.length > 0) {
            throw new Error(`Missing Firebase configuration keys: ${missingKeys.join(', ')}`);
          }

          firebaseApp = initializeApp(firebaseConfig);
        } else {
          firebaseApp = getApps()[0];
        }

        const firestoreDb = getFirestore(firebaseApp);
        
        if (mounted) {
          setContext({
            app: firebaseApp,
            db: firestoreDb,
            initialized: true
          });
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        if (mounted) {
          setContext(prev => ({ ...prev, initialized: true }));
        }
      }
    };

    initializeFirebase();

    return () => {
      mounted = false;
    };
  }, [context.initialized]);

  return (
    <FirebaseContext.Provider value={context}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      <FirebaseProviderContent>{children}</FirebaseProviderContent>
    </ClientOnly>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

// Helper function for consistent date formatting
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Helper function for getting current timestamp
export function getCurrentTimestamp(): Date {
  return new Date();
} 