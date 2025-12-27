import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, Loader2, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/ui/Logo';

// Validation schemas
const emailSchema = z.string().trim().email({ message: 'البريد الإلكتروني غير صحيح' });
const passwordSchema = z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

const ResetPassword = () => {
  const navigate = useNavigate();
  
  // Check if we're in recovery mode (user clicked the email link)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    let mounted = true;
    
    const checkRecoveryMode = async () => {
      setIsCheckingSession(true);
      
      // Check URL hash for recovery token (Supabase sends tokens in hash)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      const errorDescription = hashParams.get('error_description');
      
      console.log('URL Hash:', hash);
      console.log('Access Token:', accessToken ? 'exists' : 'none');
      console.log('Type:', type);
      
      // Check for errors in URL
      if (errorDescription) {
        toast.error(decodeURIComponent(errorDescription));
        if (mounted) setIsCheckingSession(false);
        return;
      }
      
      // If we have an access token and type is recovery, we're in recovery mode
      if (accessToken && type === 'recovery') {
        console.log('Recovery mode detected from URL hash');
        if (mounted) {
          setIsRecoveryMode(true);
          setIsCheckingSession(false);
        }
        return;
      }
      
      // Wait a moment for Supabase to process tokens
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check current session - if user has session on this page, assume recovery mode
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'exists' : 'none');
      
      // If there's an active session on the reset-password page, show password form
      // This handles the case where Supabase already processed the recovery token
      if (session) {
        console.log('Session exists on reset-password page - showing password form');
        if (mounted) {
          setIsRecoveryMode(true);
          setIsCheckingSession(false);
        }
        return;
      }
      
      if (mounted) setIsCheckingSession(false);
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event detected');
        if (mounted) {
          setIsRecoveryMode(true);
          setIsCheckingSession(false);
        }
      }
      
      // User signed in via recovery link or any sign in on this page
      if (event === 'SIGNED_IN' && session) {
        console.log('SIGNED_IN event - showing password form');
        if (mounted) {
          setIsRecoveryMode(true);
          setIsCheckingSession(false);
        }
      }
    });

    checkRecoveryMode();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const validateEmailForm = () => {
    const newErrors: { email?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'كلمات المرور غير متطابقة';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmailForm()) return;
    
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        setEmailSent(true);
        toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('تم تغيير كلمة المرور بنجاح');
        navigate('/auth');
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Email sent success screen
  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <Logo />
          </Link>

          <div className="content-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              تحقق من بريدك الإلكتروني
            </h1>
            <p className="text-muted-foreground mb-6">
              لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى <span className="font-medium text-foreground">{email}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              إذا لم تجد الرسالة، تحقق من مجلد البريد غير المرغوب فيه (Spam)
            </p>
            <Link to="/auth">
              <Button variant="outline" className="w-full h-12 rounded-xl">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Logo />
        </Link>

        {/* Reset Password Card */}
        <div className="content-card p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {isRecoveryMode ? 'تعيين كلمة مرور جديدة' : 'نسيت كلمة المرور؟'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {isRecoveryMode 
              ? 'أدخل كلمة المرور الجديدة' 
              : 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين'}
          </p>

          {isRecoveryMode ? (
            // New Password Form
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-10 pl-10 rounded-xl"
                    dir="ltr"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-10 pl-10 rounded-xl"
                    dir="ltr"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl btn-primary-glow text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'تحديث كلمة المرور'
                )}
              </Button>
            </form>
          ) : (
            // Email Form
            <form onSubmit={handleSendResetEmail} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="h-12 pr-10 rounded-xl"
                    dir="ltr"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl btn-primary-glow text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'إرسال رابط إعادة التعيين'
                )}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link 
              to="/auth" 
              className="text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <ArrowRight className="w-4 h-4" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
