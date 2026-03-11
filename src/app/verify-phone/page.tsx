
'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase';
import { useEffect, useMemo, useRef } from 'react';
import { doc } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react';

const MFAVerificationPage = dynamic(
    () => import('@/components/auth/mfa-verification-page'),
    { ssr: false }
);

export default function VerifyPhonePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();
    const auth = useAuth();

    const userDocRef = useMemo(() =>
        user ? doc(db, 'users', user.uid) : null,
        [db, user?.uid]);
    const { data: profile, loading: profileLoading } = useDoc(userDocRef);

    // Redirect-only guard
    const guardFired = useRef(false);
    useEffect(() => {
        if (authLoading || (user && profileLoading)) return;
        if (guardFired.current) return;

        if (!user) {
            guardFired.current = true;
            router.replace('/login');
        } else if (profile === null) {
            guardFired.current = true;
            router.replace('/profile-setup');
        } else if (profile.mfaEnrolled) {
            guardFired.current = true;
            router.replace('/dashboard');
        }
        // profile.mfaEnrolled === false → correct place, stay here
    }, [user, profile, authLoading, profileLoading, router]);

    // Loading state
    if (authLoading || (user && profileLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a192f] via-[#0d2a45] to-[#0a192f]">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto" />
                    <ShieldCheck className="h-6 w-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
            </div>
        );
    }

    // Guard: only render if authenticated and MFA not yet enrolled
    if (!user || !profile || profile.mfaEnrolled) return null;

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
            <MFAVerificationPage
                onVerified={() => router.push('/dashboard')}
                user={user}
                db={db}
                auth={auth}
            />
        </div>
    );
}
