
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Search, Shield, Mail, UserCheck, Loader2, MoreVertical, Edit2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { UserRole } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const roleBadgeStyles: Record<string, string> = {
    Administrator: 'bg-purple-100 text-purple-700 border-purple-200',
    Doctor: 'bg-blue-100 text-blue-700 border-blue-200',
    Nurse: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Receptionist: 'bg-amber-100 text-amber-700 border-amber-200',
    Patient: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const permissionLabels: Record<string, { label: string; level: number }> = {
    Administrator: { label: 'Full System Access', level: 5 },
    Doctor: { label: 'Medical Write + View', level: 4 },
    Nurse: { label: 'Vitals Record + View', level: 3 },
    Receptionist: { label: 'Appointments Manage', level: 2 },
    Patient: { label: 'Own Records Only', level: 1 },
};

export default function UsersPage() {
    const db = useFirestore();
    const { user: currentUser } = useUser();
    const usersQuery = useMemo(() => collection(db, 'users'), [db]);
    const { data: users, loading } = useCollection<any>(usersQuery);

    const [search, setSearch] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<UserRole>('Patient');

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.role?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRoleChange = async (userId: string, userName: string, newRole: UserRole) => {
        try {
            await updateDoc(doc(db, 'users', userId), { role: newRole });
            await writeAuditLog(
                db, currentUser!.uid, 'Administrator',
                'Role Changed',
                `Changed role for ${userName} to ${newRole}`,
                'medium'
            );
            toast({ title: 'Role updated', description: `${userName} is now a ${newRole}.` });
            setEditingId(null);
        } catch (err: any) {
            toast({ variant: 'destructive', description: err.message });
        }
    };

    const roleCounts: Record<string, number> = {};
    users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

    return (
        <div className="space-y-6 max-w-6xl">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Users & Role Management</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage system access and assign security roles across your organization.</p>
                </div>
            </div>

            {/* Role summary */}
            <div className="flex flex-wrap gap-2">
                {Object.entries(roleCounts).map(([role, count]) => (
                    <div key={role} className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border', roleBadgeStyles[role] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {role}: {count}
                    </div>
                ))}
            </div>

            <Card className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email or role..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <CardDescription className="text-xs">
                            {filteredUsers.length} of {users.length} users
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-slate-50">
                                        {['User', 'Role', 'Permission Level', 'Status', 'Actions'].map(h => (
                                            <th key={h} className={cn('px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider', h === 'Actions' && 'text-right')}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredUsers.map((user: any) => (
                                        <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-slate-200">
                                                        <AvatarImage src={user.avatarUrl} />
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold text-sm">
                                                            {user.name?.charAt(0) || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{user.name || '(No name)'}</p>
                                                        <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                                                            <Mail size={11} />
                                                            <span className="text-xs">{user.email}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {editingId === user.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Select value={editRole} onValueChange={(v: any) => setEditRole(v)}>
                                                            <SelectTrigger className="h-8 text-xs w-36">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {['Patient', 'Doctor', 'Nurse', 'Receptionist', 'Administrator'].map(r => (
                                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <button
                                                            onClick={() => handleRoleChange(user.id, user.name, editRole)}
                                                            className="p-1.5 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Badge className={cn('border text-xs font-semibold', roleBadgeStyles[user.role] || 'bg-slate-100')}>
                                                        {user.role || 'Unknown'}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield size={13} className={user.role === 'Administrator' ? 'text-purple-500' : 'text-slate-300'} />
                                                    <span className="text-xs text-slate-500">
                                                        {permissionLabels[user.role]?.label || 'Standard Access'}
                                                    </span>
                                                </div>
                                                {/* Permission bar */}
                                                <div className="w-24 h-1 bg-slate-100 rounded-full mt-1.5">
                                                    <div
                                                        className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                                        style={{ width: `${((permissionLabels[user.role]?.level || 1) / 5) * 100}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <UserCheck size={13} />
                                                    <span className="text-xs font-medium">Verified</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreVertical size={15} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuItem
                                                            className="gap-2 text-sm"
                                                            onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                                                        >
                                                            <Edit2 size={13} /> Edit Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="gap-2 text-sm text-red-600">
                                                            Deactivate User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-12 text-slate-400">
                                    <p className="text-sm">No users match your search.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
