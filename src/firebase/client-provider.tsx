'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { app, auth, firestore } from './init';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * Provider sisi klien yang menggunakan instance dari init.ts
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <FirebaseProvider
      firebaseApp={app}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
