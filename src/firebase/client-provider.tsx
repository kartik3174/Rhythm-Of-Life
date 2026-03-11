'use client';

import React, { useEffect, useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableNetwork } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from './config';
import { FirebaseProvider } from './provider';
import { ShieldCheck } from 'lucide-react';

type FirebaseInstance = { app: any; db: any; auth: any };

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  // Single state object — avoids two-render window where instance is set but ready is false
  const [ready, setReady] = useState<FirebaseInstance | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // ── Step 1: Initialize Firebase synchronously ──────────────────────
    // Do NOT await anything before attaching the listener — the first auth
    // event may fire immediately and would be missed if we await first.
    let app: any, db: any, auth: any;
    try {
      app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

      // Use standard WebSocket connection now that db is confirmed enabled
      db = getFirestore(app);

      auth = getAuth(app);
      // Warm up Firestore network connection proactively at boot
      enableNetwork(db).catch(() => { }); // best-effort, non-blocking
    } catch (err) {
      console.error('Firebase init failed:', err);
      return;
    }

    // ── Step 2: Set persistence in background (non-blocking) ───────────
    setPersistence(auth, browserLocalPersistence).catch((err) =>
      console.warn('Could not set persistence:', err)
    );

    // ── Step 3: Hard fallback — unblock render after 4 seconds ─────────
    const timeoutId = setTimeout(() => {
      if (!resolvedRef.current) {
        console.warn('[Rhythm Of Life] Auth init timeout — forcing render');
        resolvedRef.current = true;
        setReady({ app, db, auth });
      }
    }, 4000);

    // ── Step 4: Attach auth listener — fires once with initial state ───
    unsubscribe = onAuthStateChanged(auth, () => {
      if (!resolvedRef.current) {
        clearTimeout(timeoutId);
        resolvedRef.current = true;
        setReady({ app, db, auth });
      }
      // Subsequent calls (login/logout) are handled by useUser() hooks
    }, (err) => {
      // Auth error (e.g. network failure) — still unblock the app
      console.error('[Rhythm Of Life] onAuthStateChanged error:', err);
      if (!resolvedRef.current) {
        clearTimeout(timeoutId);
        resolvedRef.current = true;
        setReady({ app, db, auth });
      }
    });

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-health-primary/20 border-t-health-primary animate-spin mx-auto shadow-2xl shadow-health-primary/20" />
            <ShieldCheck className="h-10 w-10 text-health-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-3">
            <p className="text-white font-black tracking-[0.3em] uppercase text-[10px]">Security Protocol Active</p>
            <p className="text-health-text-secondary text-[10px] animate-pulse font-bold tracking-widest uppercase italic">Initializing high-security medical workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider app={ready.app} db={ready.db} auth={ready.auth}>
      {children}
    </FirebaseProvider>
  );
}
