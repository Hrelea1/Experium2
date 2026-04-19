import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth as authApi, tokenStore, type User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, otp: string) => Promise<{ error: string | null; user?: User }>;
  otpLogin: (email: string, otp: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  forgotPassword: (email: string) => Promise<{ error: string | null }>;
  doResetPassword: (email: string, otp: string, newPassword: string) => Promise<{ error: string | null }>;
  loginWithGoogle: (token: string) => Promise<{ error: string | null }>;
  loginWithFacebook: (token: string) => Promise<{ error: string | null }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load user from token on mount
  useEffect(() => {
    authApi.getUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = async () => {
    const u = await authApi.getUser();
    setUser(u);
  };

  // ─── signUp ────────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const result = await authApi.signUp(email, password, fullName);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Eroare la înregistrare';
      toast({ title: 'Eroare înregistrare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── verifyOtp ─────────────────────────────────────────────────────────────
  // Step 2 of signup: verify OTP code, sets user + token
  const verifyOtp = async (email: string, otp: string) => {
    try {
      const result = await authApi.verifyOtp(email, otp);
      setUser(result.user);
      return { error: null, user: result.user };
    } catch (err: any) {
      const message = err.message ?? 'Cod OTP invalid';
      toast({ title: 'Eroare verificare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── signIn ────────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    try {
      const result = await authApi.signIn(email, password);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      const raw = err.message ?? '';
      const message = raw.includes('fetch')
        ? 'Nu s-a putut conecta la server. Verificați conexiunea la internet.'
        : raw.includes('password') || raw.includes('credentials')
        ? 'Email sau parolă incorectă'
        : raw;
      toast({ title: 'Eroare autentificare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── sendOtp ───────────────────────────────────────────────────────────────
  const sendOtp = async (email: string) => {
    try {
      await authApi.sendOtp(email);
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Eroare la trimiterea OTP';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── otpLogin ──────────────────────────────────────────────────────────────
  const otpLogin = async (email: string, otp: string) => {
    try {
      const result = await authApi.otpLogin(email, otp);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Autentificare OTP eșuată';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── signOut ───────────────────────────────────────────────────────────────
  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
    toast({ title: 'Deconectat cu succes' });
  };

  // ─── resetPassword ─────────────────────────────────────────────────────────
  // Legacy: sends an OTP login code (kept for backward compat)
  const resetPassword = async (email: string) => {
    return forgotPassword(email);
  };

  // ─── forgotPassword ────────────────────────────────────────────────────────
  const forgotPassword = async (email: string) => {
    try {
      await authApi.forgotPassword(email);
      toast({
        title: 'Email trimis',
        description: 'Verifică inbox-ul pentru codul de resetare a parolei.',
      });
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Eroare la trimiterea codului de resetare';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── doResetPassword ───────────────────────────────────────────────────────
  const doResetPassword = async (email: string, otp: string, newPassword: string) => {
    try {
      const result = await authApi.resetPassword(email, otp, newPassword);
      setUser(result.user);
      toast({ title: 'Parolă resetată!', description: 'Te-ai autentificat cu noua parolă.' });
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Eroare la resetarea parolei';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── loginWithGoogle ───────────────────────────────────────────────────────
  const loginWithGoogle = async (token: string) => {
    try {
      const result = await authApi.googleLogin(token);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Autentificare cu Google eșuată';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  // ─── loginWithFacebook ─────────────────────────────────────────────────────
  const loginWithFacebook = async (token: string) => {
    try {
      const result = await authApi.facebookLogin(token);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      const message = err.message ?? 'Autentificare cu Facebook eșuată';
      toast({ title: 'Eroare', description: message, variant: 'destructive' });
      return { error: message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signUp,
      signIn,
      signOut,
      sendOtp,
      verifyOtp,
      otpLogin,
      resetPassword,
      forgotPassword,
      doResetPassword,
      loginWithGoogle,
      loginWithFacebook,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
