
'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase';
import { useEffect, useMemo, useRef } from 'react';
import { doc } from 'firebase/firestore';
import { ShieldCheck } from 'lucide-react';

const ProfileInitializationForm = dynamic(
    () => import('@/components/auth/profile-initialization-form'),
    { ssr: false }
);

export default function ProfileSetupPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();
    const auth = useAuth();

    const userDocRef = useMemo(() =>
        user ? doc(db, 'users', user.uid) : null,
        [db, user?.uid]);
    const { data: profile, loading: profileLoading } = useDoc(userDocRef);

    // Redirect-only guard — no isChecking state needed here
    const guardFired = useRef(false);
    useEffect(() => {
        if (authLoading || (user && profileLoading)) return;
        if (guardFired.current) return;

        if (!user) {
            guardFired.current = true;
            router.replace('/login');
        } else if (profile !== null) {
            guardFired.current = true;
            if (!profile.mfaEnrolled) {
                router.replace('/verify-phone');
            } else {
                router.replace('/dashboard');
            }
        }
        // profile === null → correct place, stay here
    }, [user, profile, authLoading, profileLoading, router]);

    // Loading state while auth/profile resolves
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

    // Guard: only render if authenticated with no profile
    if (!user || profile !== null) return null;

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
            <ProfileInitializationForm user={user} db={db} auth={auth} />
        </div>
    );
}
