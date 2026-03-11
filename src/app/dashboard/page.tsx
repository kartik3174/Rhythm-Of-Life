
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Calendar,
  Activity,
  ClipboardList,
  Clock,
  CheckCircle2,
  FileText,
  ShieldCheck,
  HeartPulse,
  Pill,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  Loader2,
  Plus,
} from 'lucide-react';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { MOCK_AUDIT_LOGS } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Appointment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { seedDatabase } from '@/lib/seed';
import { toast } from '@/hooks/use-toast';

function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'blue',
  className,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  className?: string;
}) {
  const colorMap = {
    blue: { icon: 'bg-blue-500/20 text-blue-400', trend: 'text-blue-400 bg-blue-500/10' },
    green: { icon: 'bg-health-primary/20 text-health-primary', trend: 'text-health-primary bg-health-primary/10' },
    red: { icon: 'bg-red-500/20 text-red-400', trend: 'text-red-400 bg-red-500/10' },
    amber: { icon: 'bg-amber-500/20 text-amber-400', trend: 'text-amber-400 bg-amber-500/10' },
    purple: { icon: 'bg-purple-500/20 text-purple-400', trend: 'text-purple-400 bg-purple-500/10' },
    cyan: { icon: 'bg-cyan-500/20 text-cyan-400', trend: 'text-cyan-400 bg-cyan-500/10' },
  };
  const c = colorMap[color];

  return (
    <Card className={cn('health-card bg-[#1E293B] border-white/5 overflow-hidden group', className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between">
          <div className={cn('p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300', c.icon)}>{icon}</div>
          {trend && (
            <span className={cn('text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg', c.trend)}>{trend}</span>
          )}
        </div>
        <div className="mt-5">
          <p className="text-xs font-bold text-health-text-secondary uppercase tracking-[0.1em]">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-extrabold text-white">{value}</p>
            {trendLabel && <span className="text-[10px] text-health-text-secondary font-medium">{trendLabel}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Role dashboards ────────────────────────────────────────────────

function AdminDashboard({ db, appointments }: { db: any, appointments: Appointment[] }) {
  const usersQuery = useMemo(() => collection(db, 'users'), [db]);
  const { data: users } = useCollection<any>(usersQuery);

  const { doctorCount, nurseCount, patientCount } = useMemo(() => {
    if (!users || !Array.isArray(users)) return { doctorCount: 0, nurseCount: 0, patientCount: 0 };
    return {
      doctorCount: users.filter((u: any) => u.role === 'Doctor').length,
      nurseCount: users.filter((u: any) => u.role === 'Nurse').length,
      patientCount: users.filter((u: any) => u.role === 'Patient').length,
    };
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={users?.length || '—'} icon={<Users size={20} />} trend="+3 this week" color="blue" />
        <StatCard title="Doctors" value={doctorCount || '—'} icon={<Stethoscope size={20} />} color="green" />
        <StatCard title="Patients" value={patientCount || '—'} icon={<HeartPulse size={20} />} color="cyan" />
        <StatCard title="Security Alerts" value="2" icon={<AlertTriangle size={20} />} trend="High" color="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard title="System Uptime" value="99.9%" icon={<Activity size={20} />} trend="Stable" color="green" trendLabel="All services operational" />
        <StatCard title="Today's Appointments" value={appointments.length} icon={<Calendar size={20} />} color="blue" trendLabel="Real-time data" />
        <StatCard title="Audit Events (24h)" value="47" icon={<ShieldCheck size={20} />} color="purple" trendLabel="No anomalies detected" />
      </div>
    </div>
  );
}

function DoctorDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Assigned Patients" value="12" icon={<Users size={20} />} trend="+2 today" color="blue" />
      <StatCard title="Pending Rounds" value="4" icon={<ClipboardList size={20} />} trendLabel="Ward B & C" color="amber" />
      <StatCard title="Next Appointment" value="10:30 AM" icon={<Clock size={20} />} trendLabel="Alice Thompson" color="green" />
      <StatCard title="Prescriptions Today" value="7" icon={<Pill size={20} />} color="purple" trendLabel="3 renewals pending" />
      <StatCard title="Critical Patients" value="1" icon={<HeartPulse size={20} />} trend="Monitor" color="red" />
      <StatCard title="Treatment Plans" value="18" icon={<FileText size={20} />} color="cyan" trendLabel="2 updated today" />
    </div>
  );
}

function NurseDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Vitals Pending" value="8" icon={<HeartPulse size={20} />} trend="Due Now" color="red" />
      <StatCard title="Patients on Watch" value="14" icon={<Users size={20} />} color="blue" trendLabel="Ward A–C" />
      <StatCard title="Vitals Completed" value="6" icon={<CheckCircle2 size={20} />} trend="Today" color="green" />
    </div>
  );
}

function ReceptionistDashboard({ appointments }: { appointments: Appointment[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Today's Appointments" value={appointments.length} icon={<Calendar size={20} />} color="blue" />
      <StatCard title="Checked In" value="3" icon={<UserCheck size={20} />} color="green" trendLabel="Real-time overview" />
      <StatCard title="Pending Check-Ins" value="5" icon={<Clock size={20} />} trend="Awaiting" color="amber" />
    </div>
  );
}

function PatientDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard title="Next Appointment" value="June 15" icon={<Calendar size={20} />} trendLabel="Dr. Sarah Wilson" color="blue" />
      <StatCard title="Active Prescriptions" value="1" icon={<Pill size={20} />} trendLabel="Sumatriptan 50mg" color="purple" />
      <StatCard title="Latest Vitals" value="Normal" icon={<CheckCircle2 size={20} />} trendLabel="BP: 120/80" color="green" />
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [seeding, setSeeding] = useState(false);
  const profileRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const appointmentsQuery = useMemo(() => query(collection(db, 'appointments'), orderBy('date', 'desc')), [db]);
  const { data: appointments, loading: appointmentsLoading } = useCollection<any>(appointmentsQuery);

  if (!profile) return null;

  const roleGreeting: Record<string, string> = {
    Administrator: 'System Overview',
    Doctor: "Today's Clinical Summary",
    Nurse: 'Patient Care Dashboard',
    Receptionist: 'Front Desk Overview',
    Patient: 'My Health Portal',
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDatabase(db);
      toast({ title: 'Success', description: 'Database populated with sample data.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Seed Helper (Temporary) */}
      {appointments.length === 0 && (
        <Card className="bg-blue-600 text-white border-0 shadow-lg overflow-hidden relative">
          <div className="p-6 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Empty Database Detected</h3>
              <p className="text-blue-100 text-sm max-w-xl">
                It looks like your Firestore collections are empty. Would you like to seed the database with sample
                patients, doctors, and medical records to explore the system?
              </p>
            </div>
            <Button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-white text-blue-600 hover:bg-blue-50 font-bold shrink-0 shadow-md"
            >
              {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Seed Sample Data
            </Button>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck size={120} />
          </div>
        </Card>
      )}

      {/* Page header */}
      <div className="flex items-end justify-between bg-white/5 p-8 rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter">
            {roleGreeting[profile.role] || 'Dashboard'}
          </h1>
          <p className="text-health-text-secondary mt-2 text-lg font-medium">
            Welcome back, <span className="text-health-primary">{profile.name}</span>.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className="text-[10px] px-3 py-1.5 bg-health-primary/20 text-health-primary border-health-primary/30 uppercase tracking-widest font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-health-primary mr-2 animate-ping" />
            Live System
          </Badge>
          <p className="text-[10px] text-health-text-secondary uppercase tracking-[0.2em] font-bold">Health Analytics v2.0</p>
        </div>
      </div>

      {/* Role-specific stats */}
      {profile.role === 'Administrator' && (
        <AdminDashboard db={db} appointments={appointments} />
      )}
      {profile.role === 'Doctor' && <DoctorDashboard />}
      {profile.role === 'Nurse' && <NurseDashboard />}
      {profile.role === 'Receptionist' && <ReceptionistDashboard appointments={appointments} />}
      {profile.role === 'Patient' && <PatientDashboard />}

      {/* Shared bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
        <Card className="health-card bg-[#1E293B] border-white/5 shadow-2xl">
          <CardHeader className="pb-6 border-b border-white/5 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
              <div className="p-2 bg-health-primary/20 rounded-lg">
                <Calendar size={20} className="text-health-primary" />
              </div>
              Recent Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 min-h-[200px] flex flex-col pt-0">
            {appointmentsLoading ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-health-primary" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-health-text-secondary opacity-40">
                <Calendar size={48} className="mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">No activity found</p>
              </div>
            ) : appointments.slice(0, 5).map((app: any) => (
              <div key={app.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-b-0 group">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-health-primary to-health-secondary flex items-center justify-center text-white text-base font-black shadow-lg shadow-health-primary/20 group-hover:scale-110 transition-transform duration-300">
                    {app.patientName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-white tracking-tight">{app.patientName}</p>
                    <p className="text-xs text-health-text-secondary font-medium tracking-wide">{app.doctorName}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <p className="text-sm font-black text-white">{app.time}</p>
                  <Badge className="text-[9px] tracking-widest font-black uppercase bg-health-primary/10 text-health-primary border-health-primary/20">{app.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="health-card bg-[#1E293B] border-white/5 shadow-2xl">
          <CardHeader className="pb-6 border-b border-white/5 mb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ShieldCheck size={20} className="text-purple-400" />
              </div>
              System Security Log
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pt-0">
            {MOCK_AUDIT_LOGS.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-white/5 transition-all duration-300 border-b border-white/5 last:border-b-0 group">
                <div className={cn(
                  'p-2 rounded-xl shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110 shadow-lg',
                  log.severity === 'high' ? 'bg-red-500/20 text-red-400 shadow-red-500/10' : 'bg-purple-500/20 text-purple-400 shadow-purple-500/10'
                )}>
                  <Activity size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-base font-bold text-white tracking-tight truncate">{log.action}</p>
                    <span className="text-[10px] text-health-text-secondary font-bold tabular-nums shrink-0 ml-2">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-health-text-secondary font-medium mt-1 truncate">{log.details}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
