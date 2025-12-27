import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Logo from '@/components/ui/Logo';
import PasswordStrengthMeter from '@/components/security/PasswordStrengthMeter';
import { sanitizeString } from '@/lib/security';

// Validation schemas
const emailSchema = z.string().trim().email({ message: 'البريد الإلكتروني غير صحيح' }).max(255);
const passwordSchema = z.string().min(8, { message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }).max(128);
const fullNameSchema = z.string().trim().min(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' }).max(100);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  // Get client IP on mount
  useEffect(() => {
    const getClientIp = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-client-ip');
        if (data?.ip) {
          setClientIp(data.ip);
        }
      } catch (error) {
        console.error('Failed to get client IP:', error);
      }
    };
    getClientIp();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (!isLogin) {
      const fullNameResult = fullNameSchema.safeParse(fullName);
      if (!fullNameResult.success) {
        newErrors.fullName = fullNameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    // Check if IP is blocked before attempting login
    if (isBlocked) {
      toast.error('تم حظر عنوان IP الخاص بك مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Check if IP is blocked before login attempt using edge function
        if (clientIp) {
          try {
            const { data: ipCheckResult } = await supabase.functions.invoke('check-ip-blocked', {
              body: { ip_address: clientIp }
            });
            if (ipCheckResult?.blocked) {
              setIsBlocked(true);
              toast.error('تم حظر عنوان IP الخاص بك مؤقتاً. حاول مرة أخرى بعد 24 ساعة.');
              setIsLoading(false);
              return;
            }
          } catch (checkError) {
            console.error('Failed to check IP block status:', checkError);
          }
        }

        const { error } = await signIn(email, password);
        if (error) {
          // Log failed login attempt with IP
          try {
            const { data: resultData } = await supabase.rpc('log_failed_login', {
              p_email: email,
              p_error_message: error.message,
              p_ip_address: clientIp,
              p_user_agent: navigator.userAgent
            });
            
            const result = resultData as { blocked?: boolean; remaining?: number } | null;
            
            // Check if IP got blocked after this attempt
            if (result?.blocked) {
              setIsBlocked(true);
              toast.error('تم حظر عنوان IP الخاص بك بسبب تجاوز الحد الأقصى لمحاولات تسجيل الدخول الفاشلة');
            } else if (result?.remaining !== undefined) {
              toast.error(`البريد الإلكتروني أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${result.remaining}`);
            } else if (error.message.includes('Invalid login credentials')) {
              toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
            } else {
              toast.error(error.message);
            }
          } catch (logError) {
            console.error('Failed to log security event:', logError);
            if (error.message.includes('Invalid login credentials')) {
              toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
            } else {
              toast.error(error.message);
            }
          }
        } else {
          toast.success('تم تسجيل الدخول بنجاح');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, sanitizeString(fullName));
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('هذا البريد الإلكتروني مسجل مسبقاً');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني');
        }
      }
    } catch (error) {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Logo />
        </Link>

        {/* Auth Card */}
        <div className="content-card p-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            {isLogin ? 'مرحباً بعودتك!' : 'انضم إلى مجتمع القراء'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name - Only for signup */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="h-12 pr-10 rounded-xl"
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pr-10 rounded-xl"
                  dir="ltr"
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              {/* Password Strength Meter - Only for signup */}
              {!isLogin && password && (
                <PasswordStrengthMeter password={password} className="mt-2" />
              )}
              {isLogin && (
                <div className="text-left">
                  <Link 
                    to="/reset-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl btn-primary-glow text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                'تسجيل الدخول'
              ) : (
                'إنشاء حساب'
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary font-medium mr-1 hover:underline"
              >
                {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
              </button>
            </p>
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

export default Auth;
