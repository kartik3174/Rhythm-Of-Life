
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    ShieldAlert,
    Activity,
    CheckCircle2,
    Clock,
    Filter,
    ArrowUpRight
} from 'lucide-react';

const MOCK_ALERTS = [
    {
        id: 1,
        title: 'Multiple Failed Login Attempts',
        description: 'System detected 5+ failed login attempts for user admin@healthsecure.com from IP 45.33.22.11.',
        severity: 'High',
        time: '10 minutes ago',
        type: 'Security'
    },
    {
        id: 2,
        title: 'Unauthorized Record Access Attempt',
        description: 'A user with Nurse role attempted to delete a restricted patient record (pat-123). Action blocked.',
        severity: 'Medium',
        time: '2 hours ago',
        type: 'Permission'
    },
    {
        id: 3,
        title: 'MFA Configuration Change',
        description: 'Administrator updated global MFA policy: 2FA now mandatory for all Receptionist roles.',
        severity: 'Low',
        time: '5 hours ago',
        type: 'Config'
    },
    {
        id: 4,
        title: 'Database Backup Completed',
        description: 'Full nightly backup of medical records and audit logs successfully synced to secure vault.',
        severity: 'Success',
        time: '8 hours ago',
        type: 'System'
    }
];

export default function AlertsPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">System Alerts & Security</h1>
                    <p className="text-muted-foreground">Real-time monitoring of system health and security events.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter size={16} /> Filter
                    </Button>
                    <Button size="sm" className="gap-2">
                        Configure Notifications
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-destructive/5 border-destructive/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                            <ShieldAlert size={20} /> High Priority
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">1</div>
                        <p className="text-xs text-muted-foreground mt-1 text-destructive/70 italic">Critical security event requires attention.</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                            <AlertTriangle size={20} /> Warnings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-700">2</div>
                        <p className="text-xs text-amber-600/70 mt-1 italic">Policy violations or system warnings.</p>
                    </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                            <CheckCircle2 size={20} /> System Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700">Normal</div>
                        <p className="text-xs text-green-600/70 mt-1 italic">All core services operational.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity Trail</CardTitle>
                    <CardDescription>Comprehensive log of security and system events.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {MOCK_ALERTS.map((alert) => (
                            <div
                                key={alert.id}
                                className="flex items-start justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1 p-2 rounded-lg ${alert.severity === 'High' ? 'bg-destructive/10 text-destructive' :
                                            alert.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                alert.severity === 'Success' ? 'bg-green-100 text-green-700' :
                                                    'bg-blue-100 text-blue-700'
                                        }`}>
                                        {alert.severity === 'High' ? <ShieldAlert size={20} /> :
                                            alert.severity === 'Medium' ? <AlertTriangle size={20} /> :
                                                alert.severity === 'Success' ? <CheckCircle2 size={20} /> :
                                                    <Activity size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-lg leading-none group-hover:text-primary transition-colors">
                                                {alert.title}
                                            </h3>
                                            <Badge variant="outline" className="text-[10px] h-5 uppercase tracking-wider">
                                                {alert.type}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2 max-w-2xl">
                                            {alert.description}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                                            <Clock size={12} />
                                            {alert.time}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Investigate <ArrowUpRight size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
