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
import { GoogleLogin } from '@react-oauth/google';
// @ts-ignore
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || 'your_facebook_app_id_here';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn, signUp, forgotPassword, doResetPassword, loginWithGoogle, loginWithFacebook } = useAuth();
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

  // Reset password — 3 steps: email → OTP → new password
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1=email, 2=OTP, 3=new password
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const mode = searchParams.get('mode');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    if (mode === 'reset') setShowResetForm(true);
  }, [mode]);

  // ─── Social Logins ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setLoading(true);
      const { error } = await loginWithGoogle(credentialResponse.credential);
      setLoading(false);
      if (!error) navigate('/');
    }
  };

  const handleFacebookCallback = async (response: any) => {
    if (response.accessToken) {
      setLoading(true);
      const { error } = await loginWithFacebook(response.accessToken);
      setLoading(false);
      if (!error) navigate('/');
    }
  };

  // ─── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (!error) navigate('/');
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

  // ─── Reset Step 1: Send OTP email ───────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await forgotPassword(resetEmail);
    setLoading(false);
    if (!error) setResetStep(2);
  };

  // ─── Reset Step 2: Verify OTP → show new password form ─────────────────────
  const handleVerifyResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return;
    setResetStep(3);
  };

  // ─── Reset Step 3: Set new password ────────────────────────────────────────
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Parolele nu se potrivesc', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Parola trebuie să aibă minim 6 caractere', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await doResetPassword(resetEmail, otpCode, newPassword);
    setLoading(false);
    if (!error) navigate('/');
  };

  // ─── Reset form ──────────────────────────────────────────────────────────────
  if (showResetForm) {
    const stepTitles = ['Resetare Parolă', 'Verificare Cod OTP', 'Parolă Nouă'];
    const stepDescriptions = [
      'Introdu email-ul contului tău pentru a primi un cod de resetare',
      `Am trimis un cod OTP la ${resetEmail}. Introdu-l mai jos.`,
      'Alege o parolă nouă pentru contul tău',
    ];

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      s <= resetStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <CardTitle>{stepTitles[resetStep - 1]}</CardTitle>
              <CardDescription>{stepDescriptions[resetStep - 1]}</CardDescription>
            </CardHeader>
            <CardContent>
              {resetStep === 1 && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="adresa@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !resetEmail}>
                    {loading ? 'Se trimite...' : 'Trimite cod de resetare'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowResetForm(false)}>
                    Înapoi la autentificare
                  </Button>
                </form>
              )}

              {resetStep === 2 && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Cod OTP (6 cifre)</Label>
                    <input
                      id="otp-code"
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tracking-widest text-center text-lg font-bold"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={otpCode.length !== 6}>
                    Verifică codul
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setResetStep(1); setOtpCode(''); }}>
                    Trimite un alt cod
                  </Button>
                </form>
              )}

              {resetStep === 3 && (
                <form onSubmit={handleSetNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Parolă nouă</Label>
                    <input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirmă parola nouă</Label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || !newPassword || newPassword !== confirmNewPassword}>
                    {loading ? 'Se resetează...' : '🔐 Resetează Parola'}
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
                {/* Social Login — only Google shown since `width` must be px */}
                <div className="mt-6 flex flex-col space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Sau continuă cu</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-center w-full">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => toast({ title: 'Eroare', description: 'Autentificarea cu Google a eșuat.', variant: 'destructive' })}
                        theme="outline"
                        size="large"
                        width={400}
                      />
                    </div>
                    <FacebookLogin
                      appId={FACEBOOK_APP_ID}
                      callback={handleFacebookCallback}
                      fields="name,email,picture"
                      render={(renderProps: any) => (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
                          onClick={renderProps.onClick}
                          disabled={loading}
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                          </svg>
                          Continuă cu Facebook
                        </Button>
                      )}
                    />
                  </div>
                </div>
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
                  <div className="mt-6 flex flex-col space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Sau continuă cu</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-center w-full">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => toast({ title: 'Eroare', description: 'Autentificarea cu Google a eșuat.', variant: 'destructive' })}
                          theme="outline"
                          size="large"
                          width={400}
                        />
                      </div>
                      <FacebookLogin
                        appId={FACEBOOK_APP_ID}
                        callback={handleFacebookCallback}
                        fields="name,email,picture"
                        render={(renderProps: any) => (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-10 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
                            onClick={renderProps.onClick}
                            disabled={loading}
                          >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                            </svg>
                            Continuă cu Facebook
                          </Button>
                        )}
                      />
                    </div>
                  </div>
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