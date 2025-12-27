import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Camera, Loader2, Globe, MapPin, AtSign, Check, X, Target, Minus, Plus, Trash2, LogOut, Key, Bell, UserX, Heart, Clock } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { useContentModeration } from '@/hooks/useContentModeration';
import { useReadingGoal } from '@/hooks/useReadingGoal';
import { useUserSettings } from '@/hooks/useUserSettings';
import { clearAllOfflineData } from '@/hooks/useOfflineStorage';
import { clearAllSavedBooks } from '@/hooks/useOfflineBooks';
import { clearAllCache } from '@/hooks/useDataCache';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  newPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

const profileSchema = z.object({
  full_name: z.string().max(100, 'الاسم يجب أن يكون أقل من 100 حرف').optional().or(z.literal('')),
  username: z.string()
    .regex(/^[a-zA-Z0-9_]*$/, 'اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية وأرقام و _')
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(30, 'اسم المستخدم يجب أن يكون أقل من 30 حرف')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'النبذة يجب أن تكون أقل من 500 حرف').optional().or(z.literal('')),
  country: z.string().max(50).optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const countries = [
  'السعودية', 'الإمارات', 'مصر', 'الأردن', 'العراق', 'الكويت', 'قطر', 'البحرين',
  'عُمان', 'لبنان', 'سوريا', 'فلسطين', 'اليمن', 'ليبيا', 'تونس', 'الجزائر', 'المغرب', 'السودان'
];

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { moderateProfile } = useContentModeration();
  const { goal, updateGoal, isUpdating: isUpdatingGoal } = useReadingGoal();
  const { settings, updateNotifications, isUpdatingNotifications, updateAthkar, isUpdatingAthkar, updateAthkarInterval, isUpdatingAthkarInterval, updateAthkarDisplaySeconds, isUpdatingAthkarDisplaySeconds } = useUserSettings();
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [localGoal, setLocalGoal] = useState(goal);
  const [isClearing, setIsClearing] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      username: '',
      bio: '',
      country: '',
    },
  });

  useEffect(() => {
    setLocalGoal(goal);
  }, [goal]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        form.reset({
          full_name: data.full_name || '',
          username: data.username || '',
          bio: data.bio || '',
          country: data.country || '',
        });
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: ProfileFormData) => {
    if (!user) return;

    const contentCheck = moderateProfile({
      fullName: values.full_name,
      username: values.username,
      bio: values.bio,
    });

    if (!contentCheck.isClean) {
      toast.error('يحتوي الملف الشخصي على كلمات غير لائقة', {
        description: contentCheck.message
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name || null,
          username: values.username || null,
          bio: values.bio || null,
          country: values.country || null,
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('اسم المستخدم مستخدم بالفعل');
          return;
        }
        throw error;
      }

      toast.success('تم تحديث الملف الشخصي بنجاح');
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحديث الملف الشخصي');
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;

    const file = event.target.files[0];
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('يجب اختيار ملف صورة');
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      toast.error('صيغة الصورة غير مدعومة');
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
      if (existingFiles?.length) {
        await supabase.storage.from('avatars').remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url: urlWithCacheBuster }).eq('id', user.id);
      setAvatarUrl(urlWithCacheBuster);
      toast.success('تم تحديث الصورة الشخصية');
    } catch (error) {
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    try {
      // مسح الكتب المحفوظة
      await clearAllSavedBooks();
      // مسح البيانات المؤقتة
      await clearAllCache();
      await clearAllOfflineData();
      
      // حفظ البيانات المهمة قبل المسح
      const themeValue = localStorage.getItem('vite-ui-theme');
      const supabaseAuthToken = localStorage.getItem('sb-biicvrdwoawrzkzohdzt-auth-token');
      
      // مسح localStorage مع الحفاظ على بيانات الجلسة
      const keysToKeep: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToKeep.push(key);
        }
      }
      const savedValues: Record<string, string | null> = {};
      keysToKeep.forEach(key => {
        savedValues[key] = localStorage.getItem(key);
      });
      
      localStorage.clear();
      
      // استعادة بيانات الجلسة والثيم
      if (themeValue) localStorage.setItem('vite-ui-theme', themeValue);
      keysToKeep.forEach(key => {
        if (savedValues[key]) {
          localStorage.setItem(key, savedValues[key]!);
        }
      });
      
      // لا نمسح sessionStorage لأنها تحتوي على بيانات الجلسة
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      toast.success('تم مسح الكتب المحفوظة والبيانات المؤقتة');
    } catch (error) {
      toast.error('فشل في مسح البيانات');
    } finally {
      setIsClearing(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast.success('تم تغيير كلمة المرور بنجاح');
      setIsPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const response = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('تم حذف حسابك بنجاح');
      await signOut();
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف الحساب';
      toast.error(errorMessage);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="section-container py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'الإعدادات' }]} />

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة حسابك وإعداداتك</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Right Column - Avatar & Quick Actions */}
          <div className="space-y-6">
            {/* Avatar Card */}
            <div className="bg-card rounded-2xl border p-6 text-center">
              <div className="relative inline-block mb-4">
                <Avatar className="h-24 w-24 border-2 border-primary">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {form.watch('full_name')?.charAt(0)?.toUpperCase() || <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadAvatar}
                  disabled={uploading}
                  className="hidden"
                />
              </div>
              <p className="font-medium text-foreground">{form.watch('full_name') || 'المستخدم'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Reading Goal */}
            <div className="bg-card rounded-2xl border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">هدف القراءة الشهري</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setLocalGoal(Math.max(1, localGoal - 1))}
                  disabled={localGoal <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold w-12 text-center">{localGoal}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setLocalGoal(Math.min(50, localGoal + 1))}
                  disabled={localGoal >= 50}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {localGoal !== goal && (
                <Button
                  className="w-full mt-4"
                  size="sm"
                  onClick={() => updateGoal(localGoal)}
                  disabled={isUpdatingGoal}
                >
                  {isUpdatingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 ml-1" />}
                  حفظ
                </Button>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <span className="font-medium">الإشعارات داخل التطبيق</span>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => updateNotifications(checked)}
                  disabled={isUpdatingNotifications}
                />
              </div>
              <p className="text-sm text-muted-foreground">تلقي إشعارات عن الكتب والتحديثات</p>
              
              <Separator />
              
              {/* Push Notifications */}
              <div className="space-y-2">
                <p className="text-sm font-medium">إشعارات الهاتف</p>
                <p className="text-xs text-muted-foreground">تلقي إشعارات فورية عند إضافة كتب جديدة</p>
                <PushNotificationToggle variant="outline" size="sm" showLabel={true} />
              </div>

              <Separator />

              {/* Athkar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-medium">الأذكار</span>
                </div>
                <Switch
                  checked={settings.athkar_enabled}
                  onCheckedChange={(checked) => updateAthkar(checked)}
                  disabled={isUpdatingAthkar}
                />
              </div>
              <p className="text-sm text-muted-foreground">عرض أذكار ودعاء أثناء تصفح الموقع</p>
              
              {settings.athkar_enabled && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">الفترة الزمنية</span>
                    </div>
                    <Select
                      value={String(settings.athkar_interval_minutes)}
                      onValueChange={(value) => updateAthkarInterval(Number(value))}
                      disabled={isUpdatingAthkarInterval}
                    >
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 دقائق</SelectItem>
                        <SelectItem value="10">10 دقائق</SelectItem>
                        <SelectItem value="15">15 دقيقة</SelectItem>
                        <SelectItem value="20">20 دقيقة</SelectItem>
                        <SelectItem value="30">30 دقيقة</SelectItem>
                        <SelectItem value="60">ساعة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">تظهر الأذكار كل {settings.athkar_interval_minutes} دقيقة</p>
                  
                  {/* مدة ظهور الذكر */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">مدة الظهور</span>
                    </div>
                    <Select
                      value={String(settings.athkar_display_seconds)}
                      onValueChange={(value) => updateAthkarDisplaySeconds(Number(value))}
                      disabled={isUpdatingAthkarDisplaySeconds}
                    >
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 ثواني</SelectItem>
                        <SelectItem value="10">10 ثواني</SelectItem>
                        <SelectItem value="15">15 ثانية</SelectItem>
                        <SelectItem value="20">20 ثانية</SelectItem>
                        <SelectItem value="30">30 ثانية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">يبقى الذكر ظاهراً لمدة {settings.athkar_display_seconds} ثانية</p>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="bg-card rounded-2xl border p-4 space-y-2">
              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground">
                    <Key className="w-4 h-4 ml-2" />
                    تغيير كلمة المرور
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تغيير كلمة المرور</DialogTitle>
                    <DialogDescription>أدخل كلمة المرور الجديدة</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">كلمة المرور الجديدة</label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="أدخل كلمة المرور الجديدة"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">تأكيد كلمة المرور</label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="أعد إدخال كلمة المرور"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-3">
                    <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                      {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      تغيير
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Separator />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4 ml-2" />
                    مسح البيانات المحلية
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>مسح الكتب المحفوظة؟</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">سيتم حذف جميع الكتب المحفوظة للقراءة بدون إنترنت والذاكرة المؤقتة.</span>
                      <span className="block text-destructive font-medium">⚠️ لا يمكن التراجع عن هذا الإجراء!</span>
                      <span className="block text-muted-foreground text-xs">ملاحظة: لن يتم تسجيل خروجك من حسابك.</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearData} 
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={isClearing}
                    >
                      {isClearing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />}
                      نعم، احذف الكتب المحفوظة
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Danger Zone */}
            <div className="bg-card rounded-2xl border border-destructive/20 p-4 space-y-2">
              <p className="text-sm font-medium text-destructive mb-2">منطقة الخطر</p>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 ml-2" />
                تسجيل الخروج
              </Button>
              
              <Separator />
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <UserX className="w-4 h-4 ml-2" />
                    حذف الحساب نهائياً
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف الحساب نهائياً؟</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">سيتم حذف حسابك وجميع بياناتك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.</span>
                      <span className="block text-destructive font-medium">للتأكيد، اكتب "حذف" في الحقل أدناه:</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder='اكتب "حذف" للتأكيد'
                    className="text-center"
                    dir="rtl"
                  />
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>إلغاء</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAccount} 
                      className="bg-destructive hover:bg-destructive/90"
                      disabled={isDeletingAccount || deleteConfirmText !== 'حذف'}
                    >
                      {isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                      حذف الحساب
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Left Column - Form */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <AtSign className="w-4 h-4 text-muted-foreground" />
                          اسم المستخدم
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input 
                              placeholder="username_123" 
                              {...field} 
                              dir="ltr"
                              className="text-left pl-10"
                              onChange={async (e) => {
                                field.onChange(e);
                                const value = e.target.value;
                                if (value && value.length >= 3) {
                                  setCheckingUsername(true);
                                  try {
                                    const { data } = await supabase.rpc('check_username_available', {
                                      check_username: value,
                                      user_id: user?.id
                                    });
                                    setUsernameAvailable(data);
                                  } catch {
                                    setUsernameAvailable(null);
                                  } finally {
                                    setCheckingUsername(false);
                                  }
                                } else {
                                  setUsernameAvailable(null);
                                }
                              }}
                            />
                          </FormControl>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {checkingUsername ? (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            ) : usernameAvailable === true ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : usernameAvailable === false ? (
                              <X className="w-4 h-4 text-destructive" />
                            ) : null}
                          </div>
                        </div>
                        <FormDescription>
                          {usernameAvailable === false ? 'غير متاح' : usernameAvailable === true ? 'متاح ✓' : 'أحرف إنجليزية وأرقام و _'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل</FormLabel>
                        <FormControl>
                          <Input placeholder="أدخل اسمك" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bio */}
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نبذة عنك</FormLabel>
                        <FormControl>
                          <Textarea placeholder="اكتب نبذة قصيرة..." className="resize-none" rows={3} {...field} />
                        </FormControl>
                        <FormDescription>{field.value?.length || 0}/500</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Country */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          البلد
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر البلد" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      'حفظ التغييرات'
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
