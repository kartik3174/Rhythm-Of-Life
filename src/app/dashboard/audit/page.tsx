
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { adminAuditLogAnomalyDetection } from '@/ai/flows/admin-audit-log-anomaly-detection-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Download,
  Activity,
  Filter,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const severityStyles = {
  low: { badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  high: { badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500 animate-pulse' },
};

export default function AuditAnalysisPage() {
  const db = useFirestore();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isAnomaly: boolean; anomalyDescription: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch real audit logs from Firestore
  const auditQuery = useMemo(() => {
    return query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100));
  }, [db]);
  const { data: auditLogs, loading } = useCollection<any>(auditQuery);

  const filteredLogs = filter === 'all' ? auditLogs : auditLogs.filter(l => l.severity === filter);

  const highCount = auditLogs.filter(l => l.severity === 'high').length;
  const mediumCount = auditLogs.filter(l => l.severity === 'medium').length;

  const runAnalysis = async () => {
    if (auditLogs.length === 0) return;
    setAnalyzing(true);
    const logsStr = auditLogs.slice(0, 30).map((log: any) =>
      `User: ${log.userName}, Action: ${log.action}, Details: ${log.details}, Severity: ${log.severity}`
    ).join('\n');

    try {
      const output = await adminAuditLogAnomalyDetection({ auditLogs: logsStr });
      setResult(output);
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Security Audit Center</h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time audit trail with AI-powered anomaly detection.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-slate-600">
            <Download size={14} /> Export
          </Button>
          <Button onClick={runAnalysis} disabled={analyzing || auditLogs.length === 0} className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-0 shadow-lg shadow-purple-200">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            AI Security Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: auditLogs.length, color: 'text-slate-800', bg: 'bg-white border-slate-200' },
          { label: 'High Severity', value: highCount, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Medium', value: mediumCount, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Informational', value: auditLogs.filter(l => l.severity === 'low').length, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={cn('border shadow-sm', bg)}>
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
              <p className={cn('text-2xl font-black mt-1', color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-slate-50/30">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold text-slate-700">Live Audit Trail</CardTitle>
              <div className="flex gap-1">
                {(['all', 'high', 'medium', 'low'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter transition-colors',
                      filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-300">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No audit events recorded.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50/95 border-b z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase">Time</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase">User</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase">Action</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase">Details</th>
                      <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase text-right">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((log: any) => {
                      const sev = severityStyles[log.severity as keyof typeof severityStyles] || severityStyles.low;
                      const timeStr = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-5 py-4 whitespace-nowrap text-slate-400 font-mono">{timeStr}</td>
                          <td className="px-5 py-4 font-bold text-slate-700 whitespace-nowrap">{log.userName}</td>
                          <td className="px-5 py-4 text-slate-600 font-medium">{log.action}</td>
                          <td className="px-5 py-4 text-slate-400 max-w-xs truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">{log.details}</td>
                          <td className="px-5 py-4 text-right">
                            <Badge className={cn('border-none text-[9px] font-black uppercase px-2 py-0.5', sev.badge)}>
                              {log.severity}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-0 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <ShieldCheck size={100} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-400">
                <Activity size={16} /> SYSTEM STATUS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-2">
                <div className="text-4xl font-black">{highCount > 0 ? 'REDACTED' : 'STABLE'}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn('h-2 w-2 rounded-full', highCount > 0 ? 'bg-red-500 animate-ping' : 'bg-green-500')} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {highCount > 0 ? `${highCount} CRITICAL ALERT(S) ACTIVE` : 'NO ANOMALIES DETECTED'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {analyzing && (
            <div className="p-8 border border-blue-100 bg-blue-50/50 rounded-2xl text-center space-y-4 shadow-inner">
              <div className="relative mx-auto w-12 h-12">
                <Loader2 className="absolute inset-0 h-12 w-12 animate-spin text-blue-500 opacity-20" />
                <ShieldCheck className="absolute inset-2 h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-800">Gemini Security Intelligence</p>
                <p className="text-[11px] text-blue-600 font-medium mt-1">Analyzing log vector for anomalies...</p>
              </div>
            </div>
          )}

          {result && !analyzing && (
            <Alert variant={result.isAnomaly ? 'destructive' : 'default'} className={cn('border-2 rounded-2xl shadow-lg', result.isAnomaly ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900')}>
              <div className="flex gap-3">
                {result.isAnomaly ? <ShieldAlert className="h-6 w-6 shrink-0" /> : <ShieldCheck className="h-6 w-6 shrink-0 text-green-600" />}
                <div className="space-y-1">
                  <AlertTitle className="font-black text-sm uppercase tracking-tight">
                    {result.isAnomaly ? 'Anomaly Detection Alert' : 'Heuristic Scan Passed'}
                  </AlertTitle>
                  <AlertDescription className="text-xs leading-relaxed font-medium">
                    {result.anomalyDescription || 'No suspicious cross-patterns identified in current log set.'}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {!result && !analyzing && (
            <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4 bg-slate-50/50">
              <div className="bg-white p-4 rounded-full w-fit mx-auto shadow-sm">
                <ShieldCheck className="h-8 w-8 text-slate-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-600">AI Vulnerability Scanner</p>
                <p className="text-xs text-slate-400 leading-relaxed px-4">
                  Leverage Gemini 2.0 to detect potential security breaches and unauthorized access patterns.
                </p>
              </div>
              <Button onClick={runAnalysis} variant="secondary" className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs ring-1 ring-slate-200">
                Initialize Scan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
