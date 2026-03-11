
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, Pill, Calendar, FileText, Clock, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MyHealthPage() {
    const { user } = useUser();
    const db = useFirestore();

    const profileRef = useMemo(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
    const { data: profile } = useDoc(profileRef);

    const recordsQuery = useMemo(() => {
        if (!user) return null;
        return query(collection(db, 'medical_records'), where('patientId', '==', user.uid));
    }, [db, user]);
    const { data: records, loading: recordsLoading } = useCollection<any>(recordsQuery);

    const vitalsQuery = useMemo(() => {
        if (!profile?.name) return null;
        return query(collection(db, 'vitals'), where('patientName', '==', profile.name), orderBy('timestamp', 'desc'));
    }, [db, profile]);
    const { data: vitals, loading: vitalsLoading } = useCollection<any>(vitalsQuery);

    const latestVital = vitals[0];

    if (recordsLoading || vitalsLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Health Portal</h1>
                <p className="text-slate-500 mt-1 text-sm">Your secure view of personal medical records and vitals.</p>
            </div>

            {/* Vitals banner */}
            <Card className="border border-slate-100 shadow-sm bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                        <HeartPulse size={18} className="text-red-500" /> Latest Vital Signs
                    </CardTitle>
                    {latestVital && (
                        <CardDescription className="text-xs flex items-center gap-1 text-slate-400">
                            <Clock size={11} />
                            Recorded {latestVital.timestamp?.toDate?.()?.toLocaleDateString() || 'recently'} by {latestVital.recordedBy}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {latestVital ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Blood Pressure', value: latestVital.bloodPressure, unit: 'mmHg' },
                                { label: 'Heart Rate', value: latestVital.heartRate, unit: 'bpm' },
                                { label: 'Temperature', value: latestVital.temperature, unit: '°F' },
                                { label: 'O₂ Saturation', value: latestVital.oxygenSat || '—', unit: '' },
                            ].map(({ label, value, unit }) => (
                                <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
                                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                                    <p className="text-xl font-bold text-slate-800">{value}<span className="text-xs text-slate-400 font-normal ml-1">{unit}</span></p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 py-4 text-slate-400">
                            <AlertCircle size={16} />
                            <p className="text-sm">No vitals recorded yet. Ask your nurse to record your vitals.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Medical Records */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-slate-100 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <FileText size={17} className="text-blue-500" /> My Medical Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        {records.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 px-5">
                                <FileText className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                                <p className="text-sm">No medical records on file.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {records.map((r: any) => (
                                    <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">{r.diagnosis || 'Medical Record'}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Stethoscope size={11} /> {r.doctorName || '—'}
                                                </p>
                                            </div>
                                            <p className="text-xs text-slate-400">{r.date || '—'}</p>
                                        </div>
                                        {r.notes && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{r.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Vitals History */}
                <Card className="border border-slate-100 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <HeartPulse size={17} className="text-red-500" /> Vitals History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        {vitals.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 px-5">
                                <HeartPulse className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                                <p className="text-sm">No vitals history available.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {vitals.slice(0, 5).map((v: any) => (
                                    <div key={v.id} className="px-5 py-3 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                        <div className="flex gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500">BP</p>
                                                <p className="text-sm font-semibold text-slate-800">{v.bloodPressure}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">HR</p>
                                                <p className="text-sm font-semibold text-slate-800">{v.heartRate}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500">Temp</p>
                                                <p className="text-sm font-semibold text-slate-800">{v.temperature}°F</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">
                                            {v.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
