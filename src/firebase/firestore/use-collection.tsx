'use client';

import { useState, useEffect } from 'react';
import {
  CollectionReference,
  DocumentData,
  Query,
  onSnapshot,
  QuerySnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { useUser } from '@/firebase';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; 
  isLoading: boolean;       
  error: FirestoreError | Error | null; 
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {

  const { user, isUserLoading } = useUser();

  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // 1. Bedakan state: undefined = loading, null = not logged in
    if (isUserLoading || user === undefined) {
      return;
    }
    
    // 2. Jika user null (sudah pasti logout) atau query tidak ada
    if (user === null || !memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Debugging logs
    console.log('Firestore Query Initiated:', memoizedTargetRefOrQuery);
    console.log('Active User:', user.email);

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        // Defensive check: ignore errors if user suddenly becomes null
        if (!user) return;

        console.error('Firestore Error Details:', err);
        setError(err);
        setData([]); // Kembalikan array kosong agar UI tidak crash/blank
        setIsLoading(false);
      }
    );

    return () => unsubscribe();

  }, [memoizedTargetRefOrQuery, user, isUserLoading]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('Firestore reference/query was not properly memoized. Use useMemoFirebase.');
  }

  return { data, isLoading, error };
}
