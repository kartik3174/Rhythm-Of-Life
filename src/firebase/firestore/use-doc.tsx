
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const currentRefPath = ref?.path || null;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!ref);
  const [error, setError] = useState<Error | null>(null);
  const lastRefPath = useRef<string | null>(null);

  // Synchronous state derivation to prevent stale returns during the first render of a new path
  let currentData = data;
  let currentLoading = loading;
  let currentError = error;

  if (lastRefPath.current !== currentRefPath) {
    lastRefPath.current = currentRefPath;
    currentData = null;
    currentLoading = !!ref;
    currentError = null;
    setData(null);
    setLoading(!!ref);
    setError(null);
  }

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      setData(null);
      return;
    }

    // Safety timeout to prevent indefinite hangs
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn(`Firestore useDoc timeout for path: ${ref.path}`);
        setLoading(false);
      }
    }, 10000); // 10 second safety cap

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        clearTimeout(timeoutId);
        setData(snapshot.data() || null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        const permissionError = new FirestorePermissionError({
          path: ref.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [currentRefPath]);

  return { data: currentData, loading: currentLoading, error: currentError };
}
