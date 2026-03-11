
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '../provider';

export function useUser() {
  const auth = useAuth();

  // Initialize with current value if available
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [loading, setLoading] = useState(!auth.currentUser);

  useEffect(() => {
    // If the state already matches the current user and we're not loading, 
    // we still want to set up the listener but don't strictly need to reset state.
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  return { user, loading };
}
