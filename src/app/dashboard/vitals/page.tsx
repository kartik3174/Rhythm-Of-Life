
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    HeartPulse, Thermometer, Activity, Plus, Loader2, CheckCircle2, Clock
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { cn } from '@/lib/utils';

export default function VitalsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const profileRef = useMemo(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
    const { data: profile } = useDoc(profileRef);

    const vitalsQuery = useMemo(() => {
        return query(collection(db, 'vitals'), orderBy('timestamp', 'desc'));
    }, [db]);
    const { data: vitals, loading } = useCollection<any>(vitalsQuery);

    const [addOpen, setAddOpen] = useState(false);
    const [form, setForm] = useState({ patientName: '', heartRate: '', bloodPressure: '', temperature: '', oxygenSat: '' });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!form.patientName || !form.heartRate || !form.bloodPressure || !form.temperature) {
            toast({ variant: 'destructive', description: 'Please fill all required fields.' });
            return;
        }
        setSaving(true);
        try {
            await addDoc(collection(db, 'vitals'), {
                patientName: form.patientName,
                heartRate: Number(form.heartRate),
                bloodPressure: form.bloodPressure,
                temperature: Number(form.temperature),
                oxygenSat: form.oxygenSat || 'N/A',
                recordedBy: profile?.name || 'Nurse',
                recordedById: user?.uid,
                timestamp: serverTimestamp(),
            });
            await writeAuditLog(db, user!.uid, profile?.name || 'Nurse', 'Vitals Recorded', `Recorded vitals for ${form.patientName}`, 'low');
            toast({ title: 'Vitals saved', description: `Vitals for ${form.patientName} recorded successfully.` });
            setForm({ patientName: '', heartRate: '', bloodPressure: '', temperature: '', oxygenSat: '' });
            setAddOpen(false);
        } catch (err: any) {
            toast({ variant: 'destructive', description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const getBPStatus = (bp: string) => {
        if (!bp || !bp.includes('/')) return 'unknown';
        const systolic = parseInt(bp.split('/')[0]);
        if (systolic < 90) return 'low';
        if (systolic <= 120) return 'normal';
        if (systolic <= 139) return 'elevated';
        return 'high';
    };

    const bpColors: Record<string, string> = {
        normal: 'bg-green-100 text-green-700 border-green-200',
        elevated: 'bg-amber-100 text-amber-700 border-amber-200',
        high: 'bg-red-100 text-red-700 border-red-200',
        low: 'bg-blue-100 text-blue-700 border-blue-200',
        unknown: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vitals Tracker</h1>
                    <p className="text-slate-500 mt-1 text-sm">Monitor and record patient vital signs.</p>
                </div>
                {['Nurse', 'Doctor'].includes(profile?.role) && (
                    <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0" onClick={() => setAddOpen(true)}>
                        <Plus size={16} /> Record Vitals
                    </Button>
                )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Avg Heart Rate', value: vitals.length ? Math.round(vitals.slice(0, 10).reduce((a, v) => a + v.heartRate, 0) / Math.min(vitals.length, 10)) + ' bpm' : '—', icon: <HeartPulse size={18} />, color: 'text-red-500 bg-red-50' },
                    { label: 'Readings Today', value: vitals.length, icon: <Activity size={18} />, color: 'text-blue-500 bg-blue-50' },
                    { label: 'Normal BP', value: vitals.filter(v => getBPStatus(v.bloodPressure) === 'normal').length, icon: <CheckCircle2 size={18} />, color: 'text-green-500 bg-green-50' },
                    { label: 'Alerts', value: vitals.filter(v => getBPStatus(v.bloodPressure) === 'high').length, icon: <Activity size={18} />, color: 'text-amber-500 bg-amber-50' },
                ].map(({ label, value, icon, color }) => (
                    <Card key={label} className="border border-slate-100 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
                            <div>
                                <p className="text-xs text-slate-500">{label}</p>
                                <p className="text-xl font-bold text-slate-800">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Vitals table */}
            <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                        <HeartPulse size={18} className="text-red-500" /> Vitals Log
                    </CardTitle>
                    <CardDescription>All patient vital sign recordings.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : vitals.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <HeartPulse className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                            <p className="text-sm">No vitals recorded yet.</p>
                            <p className="text-xs mt-1">Click "Record Vitals" to add the first entry.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        {['Patient', 'Heart Rate', 'Blood Pressure', 'Temp (°F)', 'O₂ Sat', 'Recorded By', 'Time'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vitals.map((v: any) => (
                                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-3 font-semibold text-slate-800">{v.patientName}</td>
                                            <td className="px-5 py-3">
                                                <span className={cn('font-semibold', v.heartRate > 100 || v.heartRate < 60 ? 'text-red-600' : 'text-slate-700')}>
                                                    {v.heartRate} <span className="text-xs text-slate-400 font-normal">bpm</span>
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge className={cn('border text-xs', bpColors[getBPStatus(v.bloodPressure)])}>
                                                    {v.bloodPressure}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3 text-slate-700">{v.temperature}°</td>
                                            <td className="px-5 py-3 text-slate-700">{v.oxygenSat}</td>
                                            <td className="px-5 py-3 text-slate-500 text-xs">{v.recordedBy}</td>
                                            <td className="px-5 py-3 text-slate-400 text-xs flex items-center gap-1">
                                                <Clock size={11} />
                                                {v.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add vitals dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-800">
                            <HeartPulse className="text-red-500" size={20} /> Record Patient Vitals
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Patient Name *</Label>
                            <Input placeholder="Alice Thompson" value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Heart Rate (bpm) *</Label>
                                <Input type="number" placeholder="72" value={form.heartRate} onChange={e => setForm(f => ({ ...f, heartRate: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Blood Pressure *</Label>
                                <Input placeholder="120/80" value={form.bloodPressure} onChange={e => setForm(f => ({ ...f, bloodPressure: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Temperature (°F) *</Label>
                                <Input type="number" step="0.1" placeholder="98.6" value={form.temperature} onChange={e => setForm(f => ({ ...f, temperature: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>O₂ Saturation</Label>
                                <Input placeholder="98%" value={form.oxygenSat} onChange={e => setForm(f => ({ ...f, oxygenSat: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0"
                        >
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Save Vitals
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
