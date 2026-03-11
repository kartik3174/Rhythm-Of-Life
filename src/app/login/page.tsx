
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, useFirestore } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, enableNetwork } from 'firebase/firestore';
import {
  ShieldCheck,
  Lock,
  UserPlus,
  LogIn,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/lib/types';
import { writeAuditLog } from '@/lib/audit';

// ─── Robust Document Fetching — Retries if Firestore is temporarily "offline" ──
async function getDocWithRetry(docRef: any, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const snap = await getDoc(docRef);
      return snap;
    } catch (err: any) {
      const isOfflineError = err.message?.includes('offline') || err.code === 'unavailable' || err.code === 'network';
      if (isOfflineError && i < maxRetries - 1) {
        console.warn(`[Rhythm Of Life] Firestore connection pending/offline, retrying in ${delayMs * (i + 1)}ms...`);
        await new Promise(res => setTimeout(res, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

// ─── Ensure Firestore is online, then read the profile document ──────────────
async function resolveDestination(db: any, uid: string): Promise<string> {
  try {
    await enableNetwork(db);

    const snap = await getDocWithRetry(doc(db, 'users', uid));
    if (!snap?.exists()) return '/profile-setup';
    const p = snap.data() as any;
    return p?.mfaEnrolled ? '/dashboard' : '/verify-phone';
  } catch (err: any) {
    console.error('[Rhythm Of Life] Fatal Firestore error:', err);
    return '/profile-setup';
  }
}

// ─── Login Page — PUBLIC route, never auto-redirects ─────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Patient');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State for pausing Google Sign-In to ask for role
  const [pendingGoogleUser, setPendingGoogleUser] = useState<any>(null);

  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      writeAuditLog(db, cred.user.uid, cred.user.displayName || trimmedEmail, 'Login', 'Email/password login', 'low');
      // resolveDestination already calls enableNetwork internally
      const dest = await resolveDestination(db, cred.user.uid);
      router.push(dest);
    } catch (error: any) {
      const isOffline = error.code === 'unavailable' || error.message?.includes('offline');
      const desc = error.code === 'auth/invalid-credential'
        ? "Invalid email or password. If you registered via Google, use 'Continue with Google'."
        : isOffline ? 'Network error — check your internet connection and try again.'
          : error.message;
      toast({ variant: 'destructive', title: 'Login failed', description: desc });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      const cred = await signInWithPopup(auth, provider);
      const { user: gUser } = cred;

      // Ensure Firestore is online before any reads/writes
      await enableNetwork(db);

      // Upsert: create profile doc if it doesn't exist; leave existing data intact
      const userRef = doc(db, 'users', gUser.uid);
      const snap = await getDocWithRetry(userRef);
      if (!snap?.exists()) {
        // New Google user — pause and ask for role
        setPendingGoogleUser(gUser);
        setLoading(false);
      } else {
        writeAuditLog(db, gUser.uid, gUser.displayName || gUser.email || '', 'Login', 'Google sign-in', 'low');
        const p = snap.data() as any;
        router.push(p?.mfaEnrolled ? '/dashboard' : '/verify-phone');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.warn('[Rhythm Of Life] Google Sign-In popup closed by user.');
        setLoading(false);
        return;
      }

      console.error('[Rhythm Of Life] Google Sign-In Error:', error);

      let desc = error.message;

      // Specific handling for common Google Sign-In failure modes
      if (error.code === 'auth/network-request-failed' || error.code === 'unavailable' || error.message?.includes('offline')) {
        desc = 'Network error — check your internet connection and verify that Firebase can reach its servers.';
      } else if (error.code === 'auth/unauthorized-domain') {
        desc = 'Login failed: This domain is not authorized. Please ensure your current URL is added to "Authorized Domains" in the Firebase Console.';
      } else if (error.code === 'auth/popup-blocked') {
        desc = 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
      }

      toast({ variant: 'destructive', title: 'Google Sign-In failed', description: desc });
      setLoading(false);
    }
  };

  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingGoogleUser) return;

    setLoading(true);
    try {
      const gUser = pendingGoogleUser;
      const userRef = doc(db, 'users', gUser.uid);

      await setDoc(userRef, {
        name: gUser.displayName || gUser.email?.split('@')[0] || 'User',
        email: gUser.email || '',
        role: role, // The role they just selected
        createdAt: new Date().toISOString(),
        mfaEnrolled: false,
        avatarUrl: gUser.photoURL || '',
      });

      writeAuditLog(db, gUser.uid, gUser.displayName || gUser.email || '', 'Register', `Google account connected as ${role}`, 'low');

      setPendingGoogleUser(null);
      router.push('/profile-setup');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registration failed', description: error.message });
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const { user: newUser } = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await setDoc(doc(db, 'users', newUser.uid), {
        name: name.trim(),
        email: trimmedEmail,
        role,
        createdAt: new Date().toISOString(),
        mfaEnrolled: false,
      });
      writeAuditLog(db, newUser.uid, name, 'Register', `New ${role} account created`, 'low');
      toast({ title: 'Account created', description: 'Your secure healthcare portal is ready.' });
      router.push('/verify-phone');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Registration failed', description: error.message });
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', description: 'Please enter your email address first.' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({ title: 'Email sent', description: 'Check your inbox for password reset instructions.' });
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    }
  };

  // ── UI — always rendered immediately, no auth-state loading ───────────────
  return (
    <div className="flex min-h-screen health-bg relative overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-health-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-health-secondary/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Rhythm Of Life"
            width={40}
            height={40}
          />
          <span className="text-xl font-semibold text-white">Rhythm Of Life</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-6xl font-extrabold text-white leading-tight tracking-tighter">
            Rhythm <span className="text-health-primary italic">Of</span> Life
          </h1>
          <p className="text-health-text-secondary text-xl max-w-md leading-relaxed font-medium">
            Professional health analytics dashboard.
            <br />
            <span className="text-health-accent/80 text-sm mt-2 block italic tracking-wide">Monitor. Understand. Improve.</span>
          </p>
        </div>

        <div className="text-white/30 text-xs text-center border-t border-white/5 pt-4">
          © 2026 Rhythm Of Life. HIPAA Compliant System.
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10">
        <Card className="w-full max-w-md health-card bg-[#1E293B]/80 backdrop-blur-md border border-white/5">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-3xl font-bold tracking-tight text-white mb-1">Welcome</CardTitle>
            <CardDescription className="text-health-text-secondary">
              Access your medical workspace
            </CardDescription>
          </CardHeader>

          <Tabs defaultValue="login" className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-health-bg-start/50 p-1 border border-white/5 rounded-xl">
                <TabsTrigger value="login" className="data-[state=active]:bg-health-primary data-[state=active]:text-white text-health-text-secondary rounded-lg transition-all duration-300">
                  <LogIn size={15} className="mr-2" /> Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-health-primary data-[state=active]:text-white text-health-text-secondary rounded-lg transition-all duration-300">
                  <UserPlus size={15} className="mr-2" /> Register
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Sign In Tab */}
            <TabsContent value="login">
              <CardContent className="space-y-4">
                {pendingGoogleUser ? (
                  <form onSubmit={handleCompleteGoogleRegistration} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-2 text-center pb-2">
                      <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2">
                        <UserPlus className="h-6 w-6 text-cyan-400" />
                      </div>
                      <h3 className="text-white font-medium">Complete Registration</h3>
                      <p className="text-white/60 text-sm">Please select your role to continue.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-white/70">I am a...</Label>
                      <Select onValueChange={(val: any) => setRole(val)} defaultValue="Patient">
                        <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Patient">Patient</SelectItem>
                          <SelectItem value="Doctor">Doctor</SelectItem>
                          <SelectItem value="Nurse">Nurse</SelectItem>
                          <SelectItem value="Receptionist">Receptionist</SelectItem>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full h-11 health-button shadow-lg shadow-health-primary/20" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      {loading ? 'Processing...' : 'Complete & Continue'}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-white/50 hover:text-white"
                      disabled={loading}
                      onClick={() => setPendingGoogleUser(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <Button
                      type="button"
                      className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/20"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <Image src="/google.svg" alt="" width={18} height={18} className="mr-2" />
                      Continue with Google
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-white/40">or</span></div>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-health-text-secondary">Email</Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-health-bg-start/50 border-white/10 text-white focus:ring-health-primary"
                          placeholder="doctor@rhythmoflife.com"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-health-text-secondary">Password</Label>
                          <button type="button" onClick={handleForgotPassword} className="text-[10px] text-health-accent hover:text-white transition-colors">Forgot password?</button>
                        </div>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-health-bg-start/50 border-white/10 text-white pr-10 focus:ring-health-primary"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                          >
                            {showPassword ? <ShieldCheck size={16} /> : <Lock size={16} />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-12 health-button shadow-lg shadow-health-primary/20 text-lg" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                        {loading ? 'Authenticating...' : 'Sign In'}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="signup">
              <CardContent className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Role</Label>
                    <Select onValueChange={(val: any) => setRole(val)} defaultValue="Patient">
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Patient">Patient</SelectItem>
                        <SelectItem value="Doctor">Doctor</SelectItem>
                        <SelectItem value="Nurse">Nurse</SelectItem>
                        <SelectItem value="Receptionist">Receptionist</SelectItem>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white" required />
                  </div>
                  <Button type="submit" className="w-full h-12 health-button shadow-lg shadow-health-primary/20 text-lg" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
