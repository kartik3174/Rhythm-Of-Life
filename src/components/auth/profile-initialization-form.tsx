
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2, ShieldCheck, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';
import { UserRole } from '@/lib/types';

interface ProfileInitializationFormProps {
    user: any;
    db: any;
    auth: any;
    onComplete?: () => void;
}

export function ProfileInitializationForm({ user, db, auth, onComplete }: ProfileInitializationFormProps) {
    const router = useRouter();
    const [name, setName] = useState(user.displayName || '');
    const [role, setRole] = useState<UserRole>('Patient');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [initializing, setInitializing] = useState(false);

    const handleInitializeProfile = async () => {
        if (!name) {
            toast({ variant: 'destructive', title: 'Name required', description: 'Please enter your name to continue.' });
            return;
        }
        setInitializing(true);
        try {
            const trimmedName = name.trim();
            const trimmedPhone = phoneNumber.trim();
            await setDoc(doc(db, 'users', user.uid), {
                name: trimmedName,
                email: user.email,
                role,
                phoneNumber: trimmedPhone || null,
                avatarUrl: user.photoURL || null,
                createdAt: new Date().toISOString(),
                mfaEnrolled: false,
            });
            await writeAuditLog(db, user.uid, trimmedName, 'Profile Created', `New ${role} profile initialized via Google OAuth`, 'low');
            toast({ title: 'Profile initialized', description: `Welcome, ${name}! Your ${role} dashboard is ready.` });

            if (onComplete) {
                onComplete();
            } else {
                router.refresh(); // Or regular redirect
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Setup failed', description: error.message });
        } finally {
            setInitializing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200 space-y-6 text-slate-800">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-50 p-3 rounded-2xl shadow-sm border border-blue-100">
                            <ShieldCheck className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Complete Your Profile</h2>
                    <p className="text-slate-500 mt-2 text-sm">
                        Set up your secure workplace identity to continue.
                    </p>
                </div>

                {user.photoURL && (
                    <div className="flex justify-center">
                        <img src={user.photoURL} alt={user.displayName} className="w-16 h-16 rounded-full border-2 border-blue-100 shadow-md" />
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Full Name</label>
                        <Input
                            placeholder="Dr. Jane Smith"
                            className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 h-10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Work Role</label>
                        <Select onValueChange={(val: any) => setRole(val)} defaultValue="Patient">
                            <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10">
                                <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                <SelectItem value="Patient">Patient</SelectItem>
                                <SelectItem value="Doctor">Doctor</SelectItem>
                                <SelectItem value="Nurse">Nurse</SelectItem>
                                <SelectItem value="Receptionist">Receptionist</SelectItem>
                                <SelectItem value="Administrator">Administrator</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Phone Number <span className="text-slate-400 font-normal">(for MFA)</span></label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="+1 555 000 0000"
                                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-300 h-10"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Include country code. Used for mandatory 2-factor authentication.</p>
                    </div>
                </div>

                <div className="pt-2 space-y-3">
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold border-0 h-11 shadow-lg shadow-blue-100"
                        onClick={handleInitializeProfile}
                        disabled={initializing}
                    >
                        {initializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Initialize Dashboard
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-medium"
                        onClick={() => auth.signOut()}
                    >
                        Cancel and Logout
                    </Button>
                </div>
            </div>
        </div>
    );
}
export default ProfileInitializationForm;
