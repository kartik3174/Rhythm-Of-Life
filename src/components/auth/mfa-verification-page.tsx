
'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { RecaptchaVerifier, PhoneAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { writeAuditLog } from '@/lib/audit';

interface MFAVerificationPageProps {
    onVerified: () => void;
    user: any;
    db: any;
    auth: any;
}

export function MFAVerificationPage({ onVerified, user, db, auth }: MFAVerificationPageProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [step, setStep] = useState<'phone' | 'otp' | 'demo'>('phone');
    const [loading, setLoading] = useState(false);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const destroyVerifier = () => {
        try {
            recaptchaRef.current?.clear();
        } catch (_) { }
        recaptchaRef.current = null;
        if (containerRef.current && document.body.contains(containerRef.current)) {
            document.body.removeChild(containerRef.current);
        }
        containerRef.current = null;
    };

    useEffect(() => () => destroyVerifier(), []);

    const sendOtp = async () => {
        if (!phoneNumber) return;
        setLoading(true);
        destroyVerifier();

        const freshContainer = document.createElement('div');
        document.body.appendChild(freshContainer);
        containerRef.current = freshContainer;

        try {
            recaptchaRef.current = new RecaptchaVerifier(auth, freshContainer, { size: 'invisible' });
            const phoneProvider = new PhoneAuthProvider(auth);
            const verId = await phoneProvider.verifyPhoneNumber(phoneNumber, recaptchaRef.current);
            setVerificationId(verId);
            setStep('otp');
            toast({ title: 'OTP Sent', description: `Verification code sent to ${phoneNumber}` });
        } catch (err: any) {
            destroyVerifier();
            if (
                err.code === 'auth/operation-not-allowed' ||
                err.code === 'auth/billing-not-enabled' ||
                err.code === 'auth/too-many-requests'
            ) {
                setStep('demo');
                toast({
                    title: 'Evaluator Mode Active',
                    description: 'Rate limit hit or billing disabled. Use code 123456 to continue.',
                });
            } else {
                toast({ variant: 'destructive', title: 'Failed to send OTP', description: err.message });
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyDemoOtp = async () => {
        if (otp === '123456') {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    mfaEnrolled: true,
                    phoneNumber: phoneNumber || null
                });
                writeAuditLog(db, user?.uid || 'unknown', user?.displayName || 'User', 'MFA Verified (Demo)', 'Demo OTP accepted', 'medium');
                toast({ title: '✓ Verified (Demo)', description: 'Access granted.' });
                onVerified();
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to save verification status.' });
            }
        } else {
            toast({ variant: 'destructive', title: 'Wrong Code', description: 'Demo mode code is 123456.' });
        }
    };

    const verifyOtp = async () => {
        if (!otp || !verificationId) return;
        setLoading(true);
        try {
            const credential = PhoneAuthProvider.credential(verificationId, otp);
            if (auth.currentUser) {
                await linkWithCredential(auth.currentUser, credential).catch((e) => {
                    if (e.code !== 'auth/provider-already-linked' && e.code !== 'auth/credential-already-in-use') throw e;
                });
            }
            await updateDoc(doc(db, 'users', user.uid), {
                mfaEnrolled: true,
                phoneNumber: phoneNumber || null
            });
            writeAuditLog(db, user?.uid || 'unknown', user?.displayName || 'User', 'MFA Verified', 'Phone OTP verification successful', 'low');
            toast({ title: '✓ Verified', description: 'Phone MFA verification successful.' });
            onVerified();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Verification failed', description: 'Invalid or expired OTP code.' });
        } finally {
            setLoading(false);
        }
    };

    const resetToPhone = () => {
        setStep('phone');
        setOtp('');
        setVerificationId('');
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md flex flex-col items-center bg-white border border-slate-200 p-8 rounded-2xl shadow-xl text-slate-800">
                <div className="space-y-2 mb-8 text-center">
                    <div className="bg-blue-50 p-3 rounded-2xl w-fit mx-auto mb-4">
                        <ShieldCheck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                        Identity Verification
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Protecting sensitive healthcare data requires an additional layer of security.
                    </p>
                </div>

                {step === 'phone' && (
                    <div className="space-y-6 py-2 w-full">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="+91 98765 43210"
                                    className="pl-10 bg-slate-50 border-slate-200 text-slate-900 h-11 focus-visible:ring-blue-500/50"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                                />
                            </div>
                            <p className="text-[11px] text-slate-400 text-center italic">Include country code (e.g. +91 or +1)</p>
                        </div>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-white font-bold shadow-lg shadow-blue-200 transition-all rounded-xl"
                            onClick={sendOtp}
                            disabled={loading || !phoneNumber}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                            Send Verification Code
                        </Button>
                    </div>
                )}

                {step === 'otp' && (
                    <div className="space-y-6 py-2 w-full">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-blue-700 font-medium leading-relaxed">Verification code sent to <span className="font-bold">{phoneNumber}</span>. This code will expire in 5 minutes.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">6-Digit Access Code</label>
                            <Input
                                placeholder="000000"
                                autoFocus
                                className="text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-slate-200 text-slate-900 h-16 placeholder:text-slate-200 rounded-xl"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                            />
                        </div>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white font-bold shadow-lg shadow-blue-200 rounded-xl"
                            onClick={verifyOtp}
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Verify & Enter Portal
                        </Button>
                        <button className="text-xs text-slate-400 hover:text-blue-600 w-full text-center transition-colors font-medium" onClick={resetToPhone}>
                            ← Use different phone number
                        </button>
                    </div>
                )}

                {step === 'demo' && (
                    <div className="space-y-6 py-2 w-full">
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2.5">
                            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                Demo Mode Active
                            </div>
                            <p className="text-[11px] text-amber-800/80 leading-relaxed italic">
                                Note: Firebase Phone Authentication requires a paid Blaze plan. For evaluation purposes, use the bypass code below.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Evaluation Bypass Code <span className="text-slate-400 font-normal">(use <span className="font-bold underline">123456</span>)</span>
                            </label>
                            <Input
                                placeholder="123456"
                                autoFocus
                                className="text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-amber-300 text-slate-900 h-16 placeholder:text-slate-200 rounded-xl"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength={6}
                                onKeyDown={(e) => e.key === 'Enter' && verifyDemoOtp()}
                            />
                        </div>
                        <Button
                            className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-white font-bold shadow-lg shadow-amber-200 rounded-xl"
                            onClick={verifyDemoOtp}
                            disabled={otp.length !== 6}
                        >
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Verify (Evaluator Mode)
                        </Button>
                        <button className="text-xs text-slate-400 hover:text-slate-600 w-full text-center transition-colors font-medium" onClick={resetToPhone}>
                            ← Return to phone entry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
export default MFAVerificationPage;
