import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { signupSchema } from '@/lib/validations';
import { z } from 'zod';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, verifyOtp, otpLogin, resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Reset password
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const mode = searchParams.get('mode');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (mode === 'reset') setShowResetForm(true);
  }, [mode]);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    
    // If account not verified, switch to verify OTP mode
    if (error && error.includes('not verified')) {
      setResetEmail(loginEmail);
      setShowResetForm(true);
      setResetSent(true);
      toast({ title: 'Cont nevalidat', description: 'Introduceți codul OTP primit pe email.' });
    } else if (!error) {
      navigate('/');
    }
  };

  // ─── Signup ─────────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    try {
      signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        setPasswordError(validationError.errors[0]?.message || 'Date invalide');
        return;
      }
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFullName);
    setLoading(false);

    if (!error) {
      toast({ title: 'Succes!', description: 'Contul a fost creat cu succes!' });
      navigate('/');
    }
  };

  // ─── Reset password / OTP Send ──────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(resetEmail);
    setLoading(false);

    if (!error) {
      setResetSent(true);
    }
  };

  // ─── OTP Login ──────────────────────────────────────────────────────────────
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Use otpLogin for passwordless login, or verifyOtp for first time
    const { error } = await otpLogin(resetEmail, otpCode);
    setLoading(false);

    if (!error) {
      navigate('/');
    }
  };

  // ─── Reset form ──────────────────────────────────────────────────────────────
  if (showResetForm) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Autentificare cu OTP</CardTitle>
              <CardDescription>
                {resetSent
                  ? 'Verifică-ți email-ul pentru codul OTP'
                  : 'Introdu adresa de email pentru a primi un cod OTP'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <form onSubmit={handleOtpLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="adresa@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Cod OTP (6 cifre)</Label>
                    <Input
                      id="otp-code"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6 || !resetEmail}>
                    {loading ? 'Se verifică...' : 'Autentifică-te'}
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => { setShowResetForm(false); setResetSent(false); }}>
                    Înapoi la autentificare cu parolă
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="adresa@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Se trimite...' : 'Trimite cod OTP'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowResetForm(false)}>
                    Înapoi la autentificare
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bun venit la Experium</CardTitle>
            <CardDescription>Autentifică-te sau creează un cont nou</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Autentificare</TabsTrigger>
                <TabsTrigger value="signup">Înregistrare</TabsTrigger>
              </TabsList>

              {/* ── Login tab ── */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="adresa@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Parolă</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowResetForm(true)}
                  >
                    Ai uitat parola?
                  </Button>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Se autentifică...' : 'Autentifică-te'}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Signup tab ── */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nume complet</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Ion Popescu"
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="adresa@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Parolă</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground">Min. 6 caractere</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password">Confirmă parola</Label>
                      <Input
                        id="signup-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Se creează contul...' : 'Creează cont'}
                    </Button>
                  </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;