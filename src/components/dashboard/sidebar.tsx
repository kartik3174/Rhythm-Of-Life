
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  ShieldCheck,
  Activity,
  LogOut,
  AlertTriangle,
  HeartPulse,
  Stethoscope,
} from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { writeAuditLog } from '@/lib/audit';

const roleColors: Record<string, { bg: string; text: string; dot: string }> = {
  Administrator: { bg: 'bg-purple-500/15', text: 'text-purple-700', dot: 'bg-purple-500' },
  Doctor: { bg: 'bg-blue-500/15', text: 'text-blue-700', dot: 'bg-blue-500' },
  Nurse: { bg: 'bg-emerald-500/15', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Receptionist: { bg: 'bg-amber-500/15', text: 'text-amber-700', dot: 'bg-amber-500' },
  Patient: { bg: 'bg-cyan-500/15', text: 'text-cyan-700', dot: 'bg-cyan-500' },
};

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Patient', 'Doctor', 'Nurse', 'Receptionist', 'Administrator'] },
  { name: 'Patient Records', href: '/dashboard/records', icon: FileText, roles: ['Doctor', 'Nurse', 'Administrator'] },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar, roles: ['Patient', 'Receptionist', 'Doctor', 'Administrator'] },
  { name: 'Vitals Tracker', href: '/dashboard/vitals', icon: HeartPulse, roles: ['Nurse', 'Doctor'] },
  { name: 'My Health', href: '/dashboard/my-health', icon: Stethoscope, roles: ['Patient'] },
  { name: 'Users & Roles', href: '/dashboard/users', icon: Users, roles: ['Administrator'] },
  { name: 'Audit Logs', href: '/dashboard/audit', icon: ShieldCheck, roles: ['Administrator'] },
  { name: 'System Alerts', href: '/dashboard/alerts', icon: Activity, roles: ['Administrator'] },
];

function EmergencyAccessButton({ profile, db, userId }: { profile: any; db: any; userId: string }) {
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const savedExpiry = sessionStorage.getItem('emergency_expiry');
    if (savedExpiry) {
      const remaining = Math.floor((parseInt(savedExpiry) - Date.now()) / 1000);
      if (remaining > 0) {
        setActive(true);
        setTimeLeft(remaining);
      } else {
        sessionStorage.removeItem('emergency_expiry');
      }
    }
  }, []);

  useEffect(() => {
    if (!active || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setActive(false);
          sessionStorage.removeItem('emergency_expiry');
          toast({ title: 'Emergency Access Expired' });
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, timeLeft]);

  const handleActivate = async () => {
    const duration = 30 * 60;
    const expiry = Date.now() + duration * 1000;
    sessionStorage.setItem('emergency_expiry', expiry.toString());
    setActive(true);
    setTimeLeft(duration);
    await writeAuditLog(db, userId, profile.name, 'Emergency Access Activated', 'Doctor activated elevated 30-minute mode', 'high');
    toast({ title: '🚨 Emergency Access Enabled' });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (active) {
    return (
      <div className="mx-2 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-red-600">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Emergency</span>
          </div>
          <span className="text-xs font-mono font-bold text-red-700">{formatTime(timeLeft)}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      className="mx-2 mb-2 w-[calc(100%-16px)] flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-600 text-sm font-semibold transition-all"
      onClick={handleActivate}
    >
      <AlertTriangle size={15} />
      Emergency Access
    </button>
  );
}

export function DashboardSidebar({ profile }: { profile: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      // Fire and forget audit log to prevent blocking the UI
      if (user && profile) {
        writeAuditLog(db, user.uid, profile.name || 'User', 'Logout', 'User signed out', 'low')
          .catch(err => console.error('Silent audit failure:', err));
      }

      sessionStorage.removeItem('hs_mfa_verified');
      sessionStorage.removeItem('emergency_expiry');

      await auth.signOut();

      // Force clear local cache if any and redirect
      router.push('/login');
      toast({ title: 'Signed out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: Force navigation even if Firebase signOut hangs
      try {
        await auth.signOut();
      } catch (e) { }
      router.push('/login');
    }
  };

  if (!profile) return null;

  const filteredItems = navItems.filter((item) => item.roles.includes(profile.role));
  const colors = roleColors[profile.role] || roleColors.Patient;

  return (
    <div className="w-64 bg-health-bg-start border-r border-white/5 flex flex-col h-screen sticky top-0 shadow-2xl z-50">
      <div className="px-6 py-8 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-health-primary to-health-secondary rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <Image
              src="/logo.png"
              alt="Rhythm Of Life"
              width={36}
              height={36}
              className="relative rounded-xl border border-white/10"
            />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">Rhythm Of Life</span>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold border border-white/5', colors.bg, colors.text)}>
          <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', colors.dot)} />
          {profile.role}
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                isActive
                  ? 'bg-health-primary text-white shadow-lg shadow-health-primary/20 scale-[1.02]'
                  : 'text-health-text-secondary hover:bg-white/5 hover:text-white hover:translate-x-1'
              )}
            >
              <item.icon size={18} className={cn(isActive ? 'text-white' : 'text-health-text-secondary group-hover:text-health-primary')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="pb-6 pt-4 border-t border-white/5 mt-auto bg-health-bg-start/80 backdrop-blur-sm">
        {profile.role === 'Doctor' && (
          <EmergencyAccessButton profile={profile} db={db} userId={user?.uid || ''} />
        )}
        <button
          type="button"
          className="mx-4 flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-health-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 active:scale-95"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
