
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  QueryDocumentSnapshot,
  FirestoreError,
  DocumentData,
  queryEqual,
} from 'firebase/firestore';

export function useCollection<T = DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!q);
  const [error, setError] = useState<Error | null>(null);

  // Keep track of the actual query string/internal representation to avoid recreation loops
  const currentQueryRef = useRef<Query<T> | null>(null);

  const stableQuery = useMemo(() => {
    if (!q) return null;
    if (currentQueryRef.current && queryEqual(q, currentQueryRef.current)) {
      return currentQueryRef.current;
    }
    currentQueryRef.current = q;
    return q;
  }, [q]);

  const lastStableQuery = useRef<Query<T> | null>(null);

  // Synchronous state derivation to prevent stale returns
  let currentData = data;
  let currentLoading = loading;
  let currentError = error;

  if (lastStableQuery.current !== stableQuery) {
    lastStableQuery.current = stableQuery;
    currentData = [];
    currentLoading = !!stableQuery;
    currentError = null;
    setData([]);
    setLoading(!!stableQuery);
    setError(null);
  }

  useEffect(() => {
    if (!stableQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Firestore useCollection timeout');
        setLoading(false);
      }
    }, 15000); // 15 second safety cap

    const unsubscribe = onSnapshot(
      stableQuery,
      (snapshot: QuerySnapshot<T>) => {
        clearTimeout(timeoutId);
        const docs = snapshot.docs.map((doc: QueryDocumentSnapshot<T>) => ({
          ...(doc.data() as any),
          id: doc.id,
        }));

        setData(docs as T[]);
        setLoading(false);
        setError(null);
      },
      (err: FirestoreError) => {
        clearTimeout(timeoutId);
        console.error('Firestore Collection Error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [stableQuery]);

  return { data: currentData, loading: currentLoading, error: currentError };
}
