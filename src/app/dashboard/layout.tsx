
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useAuth, useDoc } from '@/firebase';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Search, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { doc } from 'firebase/firestore';
import { UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';



// ─── Dashboard Layout ────────────────────────────────────────────────
const ROLES_REQUIRING_MFA: UserRole[] = ['Doctor', 'Administrator'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();

  const userDocRef = useMemo(() =>
    user ? doc(db, 'users', user.uid) : null,
    [db, user?.uid]);
  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const [notifications, setNotifications] = useState(3);

  // Gating Logic with Timeout — isChecking NOT in deps to prevent infinite re-runs
  const [isChecking, setIsChecking] = useState(true);
  const isCheckingRef = useRef(true);
  const stopChecking = () => { isCheckingRef.current = false; setIsChecking(false); };

  useEffect(() => {
    if (authLoading) return;
    if (user && profileLoading) return;

    const timer = setTimeout(() => {
      if (isCheckingRef.current) stopChecking();
    }, 5000);

    if (!user) {
      router.replace('/login');
    } else {
      if (profile === null) {
        router.replace('/profile-setup');
      } else if (!profile.mfaEnrolled) {
        router.replace('/verify-phone');
      } else {
        // Valid session — allow dashboard to render
        stopChecking();
      }
    }

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile, authLoading, profileLoading, router]);

  // Consolidated loading screen while determining status
  if (isChecking || authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-health-primary/20 border-t-health-primary animate-spin mx-auto shadow-2xl shadow-health-primary/20" />
            <ShieldCheck className="h-10 w-10 text-health-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-3">
            <p className="text-white font-black tracking-[0.3em] uppercase text-[10px]">Security Protocol Active</p>
            <p className="text-health-text-secondary text-[10px] animate-pulse font-bold tracking-widest uppercase">Synchronizing encrypted session data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Final Dashboard UI
  if (!profile) return null;

  const roleColors: Record<string, string> = {
    Administrator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    Doctor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Nurse: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Receptionist: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Patient: 'bg-health-primary/20 text-health-primary border-health-primary/30',
  };

  return (
    <div className="flex min-h-screen health-bg">
      <DashboardSidebar profile={profile} />
      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-health-bg-start/50 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-[40] shadow-2xl">
          <div className="relative w-80 xl:w-[450px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-health-text-secondary group-focus-within:text-health-primary transition-colors" />
            <Input
              placeholder="Search patients, records, analytics..."
              className="pl-12 bg-white/5 border-white/5 focus-visible:ring-1 focus-visible:ring-health-primary text-white h-12 rounded-2xl transition-all"
            />
          </div>

          <div className="flex items-center gap-6">
            <button
              className="relative p-3 text-health-text-secondary hover:bg-white/5 hover:text-white rounded-2xl transition-all duration-300"
              onClick={() => setNotifications(0)}
            >
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-health-primary text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#0F172A] shadow-lg shadow-health-primary/20">
                  {notifications}
                </span>
              )}
            </button>

            <div className="w-px h-10 bg-white/5" />

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-base font-bold text-white leading-none tracking-tight">{profile?.name || 'User'}</p>
                <div className="flex justify-end mt-1.5">
                  <Badge className={`text-[9px] px-2 py-0.5 h-auto border font-black uppercase tracking-widest ${roleColors[profile?.role || 'Patient'] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {profile?.role || 'Guest'}
                  </Badge>
                </div>
              </div>
              <Avatar className="h-12 w-12 border-2 border-white/5 shadow-2xl transition-transform hover:scale-110 duration-300">
                <AvatarImage src={profile.avatarUrl || user?.photoURL || ''} />
                <AvatarFallback className="bg-gradient-to-br from-health-primary to-health-secondary text-white font-black text-sm">
                  {profile.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 xl:p-10 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
