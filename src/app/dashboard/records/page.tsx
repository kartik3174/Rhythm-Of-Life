
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Download,
  HeartPulse,
  ShieldAlert,
  History,
  Pill,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function RecordsPage() {
  const { user } = useUser();
  const db = useFirestore();

  // Fetch user profile to check role
  const profileRef = useMemo(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: profile } = useDoc(profileRef);

  // Query records based on role
  const recordsQuery = useMemo(() => {
    if (!profile) return null;
    if (profile.role === 'Patient') {
      return query(collection(db, 'medical_records'), where('patientId', '==', user?.uid));
    }
    return collection(db, 'medical_records');
  }, [db, profile, user]);

  const { data: records, loading } = useCollection<any>(recordsQuery);

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [reAuthOpen, setReAuthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; details: string; id: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [search, setSearch] = useState('');

  const selectedRecord = useMemo(() => {
    if (!records || records.length === 0) return null;
    return records.find(r => r.id === selectedRecordId) || records[0];
  }, [records, selectedRecordId]);

  const handleSensitiveAction = (type: string, details: string, id: string) => {
    setPendingAction({ type, details, id });
    setReAuthOpen(true);
  };

  const confirmAction = async () => {
    if (mfaCode === '123456') { // Mock MFA for demo
      if (pendingAction?.type === 'Delete') {
        const docRef = doc(db, 'medical_records', pendingAction.id);
        try {
          await deleteDoc(docRef);
          toast({
            title: "Record Deleted",
            description: `Successfully removed record ${pendingAction.id}.`,
          });
        } catch (err) {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete'
          });
          errorEmitter.emit('permission-error', permissionError);
          return;
        }
      } else {
        toast({
          title: "Action Authorized",
          description: `Successfully processed ${pendingAction?.type.toLowerCase()} request.`,
        });
      }
      setReAuthOpen(false);
      setMfaCode('');
      setPendingAction(null);
    } else {
      toast({
        variant: "destructive",
        title: "Authorization Failed",
        description: "Invalid MFA code. Sensitive action denied.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredRecords = records.filter(r =>
    r.patientName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end bg-white/5 p-8 rounded-3xl border border-white/5 backdrop-blur-sm shadow-2xl">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter">Medical Records</h1>
          <p className="text-health-text-secondary mt-2 text-lg font-medium">Access sensitive patient health data and history.</p>
        </div>
        {profile?.role !== 'Patient' && (
          <Button className="health-button h-12 px-6 shadow-health-primary/20 text-base">
            <Plus size={20} className="mr-2" />
            New Record
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 health-card bg-[#1E293B] border-white/5 p-0 overflow-hidden shadow-2xl">
          <CardHeader className="p-4 border-b border-white/5 bg-white/5">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-health-text-secondary group-focus-within:text-health-primary transition-colors" />
              <Input
                placeholder="Search patients..."
                className="pl-9 bg-white/5 border-white/5 h-10 text-xs rounded-xl text-white focus:ring-1 focus:ring-health-primary transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="px-0 py-0 h-[600px] overflow-y-auto custom-scrollbar">
            <div className="divide-y divide-white/5">
              {filteredRecords.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRecordId(r.id)}
                  className={cn(
                    "w-full px-6 py-4 text-left flex flex-col gap-1 transition-all duration-300 hover:bg-white/5",
                    selectedRecord?.id === r.id
                      ? "bg-health-primary/10 border-l-4 border-health-primary"
                      : "border-l-4 border-transparent"
                  )}
                >
                  <p className={cn("text-sm font-bold tracking-tight", selectedRecord?.id === r.id ? "text-health-primary" : "text-white")}>{r.patientName}</p>
                  <p className="text-[10px] text-health-text-secondary uppercase font-black tracking-widest">{r.gender}, {r.age} yrs · {r.bloodType}</p>
                </button>
              ))}
              {filteredRecords.length === 0 && (
                <div className="text-center py-10 px-4">
                  <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No matching records found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-8">
          {selectedRecord ? (
            <Card className="health-card bg-[#1E293B] border-white/5 p-0 overflow-hidden shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between bg-white/5 border-b border-white/5 p-8">
                <div>
                  <CardTitle className="text-2xl font-black text-white tracking-tight">{selectedRecord.patientName}</CardTitle>
                  <CardDescription className="text-xs text-health-text-secondary font-bold uppercase tracking-widest mt-1">Medical Identity Protocol: {selectedRecord.id}</CardDescription>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 text-xs font-bold uppercase tracking-widest gap-2 bg-white/5 border-white/10 text-white hover:bg-white/10"
                    onClick={() => selectedRecord && handleSensitiveAction('Export', `Exporting data for ${selectedRecord.patientName}`, selectedRecord.id)}
                  >
                    <Download size={14} /> Export File
                  </Button>
                  {['Doctor', 'Administrator'].includes(profile?.role || '') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-10 px-4 text-xs font-bold uppercase tracking-widest gap-2 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                      onClick={() => selectedRecord && handleSensitiveAction('Delete', `Deleting record for ${selectedRecord.patientName}`, selectedRecord.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <HeartPulse size={14} className="text-red-500" />
                        Latest Vitals
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedRecord.vitals?.[0] ? (
                          <>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <p className="text-[10px] text-slate-500 font-medium mb-1">BLOOD PRESSURE</p>
                              <p className="text-xl font-bold text-slate-800">{selectedRecord.vitals[0].bloodPressure}</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                              <p className="text-[10px] text-slate-500 font-medium mb-1">HEART RATE</p>
                              <p className="text-xl font-bold text-slate-800">{selectedRecord.vitals[0].heartRate} <span className="text-xs font-normal text-slate-400 ml-1">bpm</span></p>
                            </div>
                          </>
                        ) : (
                          <div className="col-span-2 py-4 text-slate-400 text-sm italic">No vitals data available.</div>
                        )}
                      </div>
                    </section>
                    <section>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <Pill size={14} className="text-blue-500" />
                        Prescriptions
                      </h3>
                      <div className="space-y-2">
                        {selectedRecord.prescriptions?.map((p: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <p className="font-bold text-sm text-slate-800">{p.medication}</p>
                            <p className="text-xs text-blue-600 font-medium mt-0.5">{p.dosage}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5 italic">{p.instructions}</p>
                          </div>
                        )) || <div className="text-slate-400 text-sm italic">No active prescriptions.</div>}
                      </div>
                    </section>
                  </div>
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <History size={14} className="text-purple-500" />
                        Clinical History
                      </h3>
                      <div className="space-y-4 relative before:absolute before:inset-0 before:left-2 before:border-l before:border-slate-100 before:pointer-events-none">
                        {selectedRecord.history?.map((h: any, idx: number) => (
                          <div key={idx} className="relative pl-6 pb-4 last:pb-0 group">
                            <div className="absolute left-[-2px] top-1.5 w-2 h-2 rounded-full bg-white border-2 border-slate-300 group-hover:border-purple-400 transition-colors z-10" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{h.date}</p>
                            <p className="text-sm text-slate-700 mt-1 leading-tight">{h.note}</p>
                            <p className="text-[9px] text-slate-400 mt-1 font-medium italic">— {h.author}</p>
                          </div>
                        )) || <div className="text-slate-400 text-sm italic">Clinical history is empty.</div>}
                      </div>
                    </section>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-medium">Select a patient record to view clinical details.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={reAuthOpen} onOpenChange={setReAuthOpen}>
        <DialogContent className="sm:max-w-md border border-white/10 bg-[#1E293B] shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-red-500/10 border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-red-400 text-xl font-bold uppercase tracking-tighter">
              <ShieldAlert size={28} />
              Identity Verification
            </DialogTitle>
            <DialogDescription className="text-health-text-secondary text-sm font-medium pt-2">
              High-security action detected. Please verify your medical credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-6 p-8">
            <div className="space-y-3">
              <Label className="text-white text-xs font-black uppercase tracking-[0.2em]">Medical MFA Code</Label>
              <Input
                id="mfa-code"
                placeholder="000 000"
                className="text-center text-4xl font-black tracking-[0.4em] h-20 bg-white/5 border-white/10 text-health-primary focus:ring-health-primary"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                maxLength={6}
              />
              <p className="text-[10px] text-health-text-secondary text-center font-bold tracking-widest uppercase opacity-40 italic">Demo code: 123456</p>
            </div>
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-400 shrink-0">
                <ShieldAlert size={16} />
              </div>
              <div className="space-y-1">
                <p className="font-black text-red-400 uppercase tracking-widest text-[9px]">Restricted Operation</p>
                <p className="text-white text-xs font-medium leading-relaxed">{pendingAction?.type}: {pendingAction?.details}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 bg-white/5 flex sm:justify-between items-center gap-4">
            <Button variant="ghost" onClick={() => setReAuthOpen(false)} className="text-health-text-secondary hover:text-white hover:bg-white/5 rounded-xl px-6">Cancel</Button>
            <Button onClick={confirmAction} className="health-button bg-red-500 hover:bg-red-600 shadow-red-500/20 h-12 px-8">Authorize & Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
