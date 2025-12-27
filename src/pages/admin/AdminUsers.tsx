import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AdminDialog, 
  AdminDialogContent, 
  AdminDialogHeader, 
  AdminDialogTitle, 
  AdminDialogDescription, 
  AdminDialogFooter 
} from '@/components/admin/AdminDialog';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Loader2, Search, Shield, ShieldOff, Eye, Users as UsersIcon, BadgeCheck, Mail, Ban, UserX, 
  Pencil, AlertTriangle, Trash2, Plus, Filter, UserCheck, UserCog
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  is_public: boolean | null;
  is_verified: boolean | null;
  verified_at: string | null;
  verified_by: string | null;
  is_banned: boolean | null;
  banned_at: string | null;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'active' | 'banned' | 'verified' | 'with_warnings';
type RoleFilter = 'all' | 'admin' | 'moderator' | 'support' | 'user';

// Helper function to send email notifications
const sendUserNotification = async (
  type: 'verification' | 'warning' | 'ban' | 'unban',
  userEmail: string,
  userName: string,
  reason?: string,
  warningCount?: number,
  notes?: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-user-notification', {
      body: { type, userEmail, userName, reason, warningCount, notes }
    });
    
    if (error) {
      console.error('Failed to send notification email:', error);
    } else {
      console.log('Notification email sent:', data);
    }
  } catch (err) {
    console.error('Error sending notification:', err);
  }
};

export const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isWarningDialogOpen, setIsWarningDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
  const [userToWarn, setUserToWarn] = useState<AdminUser | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<AdminUser | null>(null);
  const [warningReason, setWarningReason] = useState('');
  const [warningNotes, setWarningNotes] = useState('');
  const [newRole, setNewRole] = useState<string>('user');
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    bio: '',
    country: '',
    is_public: false,
    email: '',
    avatar_url: '',
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch users using the secure function
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_users');
      
      if (error) throw error;
      return data as AdminUser[];
    },
  });

  // Get user roles
  const { data: userRoles } = useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all warnings
  const { data: allWarnings } = useQuery({
    queryKey: ['allUserWarnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_warnings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getUserWarningsCount = (userId: string) => {
    return allWarnings?.filter(w => w.user_id === userId).length || 0;
  };

  const getUserWarnings = (userId: string) => {
    return allWarnings?.filter(w => w.user_id === userId) || [];
  };

  const getUserRole = (userId: string) => {
    const role = userRoles?.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'moderator': return 'مشرف';
      case 'support': return 'دعم';
      default: return 'مستخدم';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'moderator': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'support': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Verify user mutation
  const verifyUserMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
          verified_by: verified ? currentUser?.id : null
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success(verified ? 'تم توثيق المستخدم' : 'تم إلغاء التوثيق');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('تم تحديث بيانات المستخدم');
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث البيانات');
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc('ban_user', { 
        target_user_id: userId, 
        reason 
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('تم حظر المستخدم بنجاح');
      setIsBanDialogOpen(false);
      setBanReason('');
      setUserToBan(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء حظر المستخدم');
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('unban_user', { 
        target_user_id: userId 
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('تم إلغاء حظر المستخدم');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء إلغاء الحظر');
    },
  });

  // Delete warning mutation
  const deleteWarningMutation = useMutation({
    mutationFn: async (warningId: string) => {
      const { error } = await supabase
        .from('user_warnings')
        .delete()
        .eq('id', warningId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserWarnings'] });
      toast.success('تم حذف التحذير');
    },
    onError: () => {
      toast.error('فشل في حذف التحذير');
    },
  });

  // Add warning mutation
  const addWarningMutation = useMutation({
    mutationFn: async ({ userId, reason, notes }: { userId: string; reason: string; notes?: string }) => {
      const { error } = await supabase
        .from('user_warnings')
        .insert({
          user_id: userId,
          reason,
          notes,
          issued_by: currentUser?.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserWarnings'] });
      toast.success('تم إضافة التحذير');
      setIsWarningDialogOpen(false);
      setWarningReason('');
      setWarningNotes('');
      setUserToWarn(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في إضافة التحذير');
    },
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // First delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      // Then insert new role if not 'user' (default)
      if (role !== 'user') {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: role as 'admin' | 'moderator' | 'support' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
      toast.success('تم تغيير الدور بنجاح');
      setIsRoleDialogOpen(false);
      setUserToChangeRole(null);
      setNewRole('user');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في تغيير الدور');
    },
  });

  const handleToggleAdmin = async (userId: string, userName: string) => {
    const currentRole = getUserRole(userId);
    
    try {
      if (currentRole === 'admin') {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        if (error) throw error;

        logActivity({
          actionType: 'update',
          entityType: 'user',
          entityId: userId,
          entityName: userName,
          details: { action: 'remove_admin' },
        });

        toast.success('تم إزالة صلاحيات الإدارة');
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: 'admin' as const }]);
        
        if (error) throw error;

        logActivity({
          actionType: 'update',
          entityType: 'user',
          entityId: userId,
          entityName: userName,
          details: { action: 'grant_admin' },
        });

        toast.success('تم منح صلاحيات الإدارة');
      }
      
      queryClient.invalidateQueries({ queryKey: ['userRoles'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleToggleVerify = (user: AdminUser) => {
    const willVerify = !user.is_verified;
    
    verifyUserMutation.mutate({ 
      userId: user.id, 
      verified: willVerify 
    });
    
    // Send email notification only when verifying
    if (willVerify && user.email) {
      sendUserNotification(
        'verification',
        user.email,
        user.full_name || user.username || 'المستخدم'
      );
    }
    
    logActivity({
      actionType: 'update',
      entityType: 'user',
      entityId: user.id,
      entityName: user.full_name || user.email || 'Unknown',
      details: { action: user.is_verified ? 'unverify' : 'verify' },
    });
  };

  const handleBanUser = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك حظر نفسك');
      return;
    }
    setUserToBan(user);
    setIsBanDialogOpen(true);
  };

  const confirmBanUser = () => {
    if (!userToBan || !banReason.trim()) {
      toast.error('يرجى إدخال سبب الحظر');
      return;
    }
    
    banUserMutation.mutate({ 
      userId: userToBan.id, 
      reason: banReason 
    });
    
    // Send ban notification email
    if (userToBan.email) {
      sendUserNotification(
        'ban',
        userToBan.email,
        userToBan.full_name || userToBan.username || 'المستخدم',
        banReason
      );
    }
    
    logActivity({
      actionType: 'update',
      entityType: 'user',
      entityId: userToBan.id,
      entityName: userToBan.full_name || userToBan.email || 'Unknown',
      details: { action: 'ban', reason: banReason },
    });
  };

  const handleUnbanUser = (user: AdminUser) => {
    unbanUserMutation.mutate(user.id);
    
    // Send unban notification email
    if (user.email) {
      sendUserNotification(
        'unban',
        user.email,
        user.full_name || user.username || 'المستخدم'
      );
    }
    
    logActivity({
      actionType: 'update',
      entityType: 'user',
      entityId: user.id,
      entityName: user.full_name || user.email || 'Unknown',
      details: { action: 'unban' },
    });
  };

  const handleAddWarning = (user: AdminUser) => {
    setUserToWarn(user);
    setIsWarningDialogOpen(true);
  };

  const confirmAddWarning = () => {
    if (!userToWarn || !warningReason.trim()) {
      toast.error('يرجى إدخال سبب التحذير');
      return;
    }
    
    const currentWarningCount = getUserWarningsCount(userToWarn.id);
    const newWarningCount = currentWarningCount + 1;
    
    addWarningMutation.mutate({
      userId: userToWarn.id,
      reason: warningReason,
      notes: warningNotes || undefined
    });

    // Send warning notification email
    if (userToWarn.email) {
      sendUserNotification(
        'warning',
        userToWarn.email,
        userToWarn.full_name || userToWarn.username || 'المستخدم',
        warningReason,
        newWarningCount,
        warningNotes || undefined
      );
    }

    logActivity({
      actionType: 'create',
      entityType: 'user',
      entityId: userToWarn.id,
      entityName: userToWarn.full_name || userToWarn.email || 'Unknown',
      details: { action: 'add_warning', reason: warningReason },
    });
  };

  const handleChangeRole = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك تغيير دورك');
      return;
    }
    setUserToChangeRole(user);
    setNewRole(getUserRole(user.id));
    setIsRoleDialogOpen(true);
  };

  const confirmChangeRole = () => {
    if (!userToChangeRole) return;
    
    changeRoleMutation.mutate({
      userId: userToChangeRole.id,
      role: newRole
    });

    logActivity({
      actionType: 'update',
      entityType: 'user',
      entityId: userToChangeRole.id,
      entityName: userToChangeRole.full_name || userToChangeRole.email || 'Unknown',
      details: { action: 'change_role', newRole },
    });
  };

  // Filter users based on status and role
  const filteredUsers = users?.filter(user => {
    // Search filter
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'banned' && !user.is_banned) return false;
    if (statusFilter === 'verified' && !user.is_verified) return false;
    if (statusFilter === 'active' && user.is_banned) return false;
    if (statusFilter === 'with_warnings' && getUserWarningsCount(user.id) === 0) return false;

    // Role filter
    if (roleFilter !== 'all') {
      const userRole = getUserRole(user.id);
      if (roleFilter !== userRole) return false;
    }

    return true;
  });

  // Pagination logic
  const totalItems = filteredUsers?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter]);

  const openViewDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      username: user.username || '',
      bio: user.bio || '',
      country: user.country || '',
      is_public: user.is_public || false,
      email: user.email || '',
      avatar_url: user.avatar_url || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('maktaba')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('maktaba')
        .getPublicUrl(filePath);

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    // Update profile data
    const profileUpdates = {
      full_name: editForm.full_name,
      username: editForm.username,
      bio: editForm.bio,
      country: editForm.country,
      is_public: editForm.is_public,
      avatar_url: editForm.avatar_url,
    };

    updateUserMutation.mutate({
      userId: selectedUser.id,
      updates: profileUpdates
    });

    // Update email if changed
    if (editForm.email && editForm.email !== selectedUser.email) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: selectedUser.id, email: editForm.email }
        });

        if (error) throw error;
        toast.success('تم تحديث البريد الإلكتروني');
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      } catch (error: any) {
        toast.error(error.message || 'حدث خطأ أثناء تحديث البريد');
      }
    }
    
    logActivity({
      actionType: 'update',
      entityType: 'user',
      entityId: selectedUser.id,
      entityName: editForm.full_name || selectedUser.email || 'Unknown',
      details: { action: 'edit_profile', updates: profileUpdates },
    });
  };

  const verifiedCount = users?.filter(u => u.is_verified).length || 0;
  const bannedCount = users?.filter(u => u.is_banned).length || 0;
  const usersWithWarnings = users?.filter(u => getUserWarningsCount(u.id) > 0).length || 0;
  const adminCount = userRoles?.filter(r => r.role === 'admin').length || 0;
  const moderatorCount = userRoles?.filter(r => r.role === 'moderator').length || 0;
  const supportCount = userRoles?.filter(r => r.role === 'support').length || 0;

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive mb-2">خطأ في تحميل المستخدمين</p>
            <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة المستخدمين والأدوار والتحذيرات</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 rounded-lg">
              <Ban className="w-4 h-4 text-destructive" />
              <span className="font-medium text-destructive text-sm">{bannedCount} محظور</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-700 dark:text-orange-400 text-sm">{usersWithWarnings} بتحذيرات</span>
            </div>
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
              <BadgeCheck className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400 text-sm">{verifiedCount} موثق</span>
            </div>
            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
              <UsersIcon className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">{users?.length || 0} مستخدم</span>
            </div>
          </div>
        </div>

        {/* Role Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">مدير</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{moderatorCount}</p>
                <p className="text-sm text-muted-foreground">مشرف</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{supportCount}</p>
                <p className="text-sm text-muted-foreground">دعم</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <UsersIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(users?.length || 0) - adminCount - moderatorCount - supportCount}</p>
                <p className="text-sm text-muted-foreground">مستخدم عادي</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالاسم أو البريد الإلكتروني..."
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="w-4 h-4 ml-2" />
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="banned">محظور</SelectItem>
                    <SelectItem value="verified">موثق</SelectItem>
                    <SelectItem value="with_warnings">بتحذيرات</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأدوار</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="moderator">مشرف</SelectItem>
                    <SelectItem value="support">دعم</SelectItem>
                    <SelectItem value="user">مستخدم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Tabs */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                <TabsTrigger value="all">الكل ({users?.length || 0})</TabsTrigger>
                <TabsTrigger value="active">نشط ({(users?.length || 0) - bannedCount})</TabsTrigger>
                <TabsTrigger value="banned">محظور ({bannedCount})</TabsTrigger>
                <TabsTrigger value="verified">موثق ({verifiedCount})</TabsTrigger>
                <TabsTrigger value="with_warnings">بتحذيرات ({usersWithWarnings})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التحذيرات</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers?.map((user) => (
                    <TableRow key={user.id} className={user.is_banned ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || ''}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium">
                                {user.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{user.full_name || '-'}</span>
                              {user.is_verified && (
                                <BadgeCheck className="w-4 h-4 text-blue-500" />
                              )}
                              {user.is_banned && (
                                <Ban className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">@{user.username || '-'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${user.email}`} className="text-primary hover:underline flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </a>
                      </TableCell>
                      <TableCell>
                        {user.is_banned ? (
                          <Badge variant="destructive">
                            <Ban className="w-3 h-3 ml-1" />
                            محظور
                          </Badge>
                        ) : user.is_verified ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <BadgeCheck className="w-3 h-3 ml-1" />
                            موثق
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            نشط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const count = getUserWarningsCount(user.id);
                          if (count === 0) return <span className="text-muted-foreground text-sm">-</span>;
                          return (
                            <Badge variant={count >= 3 ? "destructive" : "secondary"} className={count >= 3 ? "" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}>
                              <AlertTriangle className="w-3 h-3 ml-1" />
                              {count}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`${getRoleColor(getUserRole(user.id))} cursor-pointer`}
                          onClick={() => handleChangeRole(user)}
                        >
                          {getRoleLabel(getUserRole(user.id))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openViewDialog(user)} title="عرض التفاصيل">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} title="تعديل البيانات">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleAddWarning(user)}
                            title="إضافة تحذير"
                          >
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleVerify(user)}
                            title={user.is_verified ? 'إلغاء التوثيق' : 'توثيق المستخدم'}
                          >
                            <BadgeCheck className={`w-4 h-4 ${user.is_verified ? 'text-blue-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleChangeRole(user)}
                            title="تغيير الدور"
                            disabled={user.id === currentUser?.id}
                          >
                            <Shield className={`w-4 h-4 ${getUserRole(user.id) !== 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
                          </Button>
                          {user.is_banned ? (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleUnbanUser(user)}
                              title="إلغاء الحظر"
                            >
                              <UserX className="w-4 h-4 text-green-600" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleBanUser(user)}
                              title="حظر المستخدم"
                              disabled={user.id === currentUser?.id}
                            >
                              <Ban className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Pagination */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </CardContent>
        </Card>

        {/* View User Dialog */}
        <AdminDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <AdminDialogContent className="max-w-lg">
            <AdminDialogHeader>
              <AdminDialogTitle>تفاصيل المستخدم</AdminDialogTitle>
            </AdminDialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {selectedUser.avatar_url ? (
                    <img
                      src={selectedUser.avatar_url}
                      alt={selectedUser.full_name || ''}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl text-primary font-medium">
                        {selectedUser.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium">{selectedUser.full_name || 'بدون اسم'}</h3>
                      {selectedUser.is_verified && (
                        <BadgeCheck className="w-5 h-5 text-blue-500" />
                      )}
                      {selectedUser.is_banned && (
                        <Badge variant="destructive">محظور</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">@{selectedUser.username || 'بدون اسم مستخدم'}</p>
                    <Badge variant="secondary" className={getRoleColor(getUserRole(selectedUser.id))}>
                      {getRoleLabel(getUserRole(selectedUser.id))}
                    </Badge>
                  </div>
                </div>

                {selectedUser.is_banned && selectedUser.banned_reason && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive">سبب الحظر:</p>
                    <p className="text-sm">{selectedUser.banned_reason}</p>
                    {selectedUser.banned_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        تاريخ الحظر: {format(new Date(selectedUser.banned_at), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">البريد الإلكتروني:</span>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الدولة:</span>
                    <p className="font-medium">{selectedUser.country || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الحساب:</span>
                    <p className="font-medium">{selectedUser.is_public ? 'عام' : 'خاص'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">التوثيق:</span>
                    <p className="font-medium">{selectedUser.is_verified ? 'موثق ✓' : 'غير موثق'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">تاريخ التسجيل:</span>
                    <p className="font-medium">
                      {format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: ar })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الدور:</span>
                    <p className="font-medium">{getRoleLabel(getUserRole(selectedUser.id))}</p>
                  </div>
                </div>

                {selectedUser.bio && (
                  <div>
                    <span className="text-muted-foreground text-sm">النبذة:</span>
                    <p className="mt-1">{selectedUser.bio}</p>
                  </div>
                )}

                {/* Warnings Section */}
                {(() => {
                  const userWarnings = getUserWarnings(selectedUser.id);
                  if (userWarnings.length === 0) return null;
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">التحذيرات ({userWarnings.length})</span>
                        {userWarnings.length >= 3 && (
                          <Badge variant="destructive" className="text-xs">تجاوز الحد!</Badge>
                        )}
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {userWarnings.map((warning) => (
                          <div key={warning.id} className="bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-orange-700 dark:text-orange-400 font-medium">
                                {warning.reason}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(warning.created_at), 'dd/MM/yyyy', { locale: ar })}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    if (confirm('هل أنت متأكد من حذف هذا التحذير؟')) {
                                      deleteWarningMutation.mutate(warning.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            {warning.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{warning.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddWarning(selectedUser)}
                  >
                    <AlertTriangle className="w-4 h-4 ml-2 text-orange-500" />
                    إضافة تحذير
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeRole(selectedUser)}
                    disabled={selectedUser.id === currentUser?.id}
                  >
                    <Shield className="w-4 h-4 ml-2" />
                    تغيير الدور
                  </Button>
                  <Button 
                    onClick={() => handleToggleVerify(selectedUser)}
                    variant={selectedUser.is_verified ? 'outline' : 'default'}
                    size="sm"
                  >
                    <BadgeCheck className="w-4 h-4 ml-2" />
                    {selectedUser.is_verified ? 'إلغاء التوثيق' : 'توثيق'}
                  </Button>
                  {selectedUser.is_banned ? (
                    <Button 
                      onClick={() => handleUnbanUser(selectedUser)}
                      variant="outline"
                      size="sm"
                    >
                      <UserX className="w-4 h-4 ml-2" />
                      إلغاء الحظر
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleBanUser(selectedUser)}
                      variant="destructive"
                      size="sm"
                      disabled={selectedUser.id === currentUser?.id}
                    >
                      <Ban className="w-4 h-4 ml-2" />
                      حظر
                    </Button>
                  )}
                </div>
              </div>
            )}
          </AdminDialogContent>
        </AdminDialog>

        {/* Ban User Dialog */}
        <AdminDialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>حظر المستخدم</AdminDialogTitle>
              <AdminDialogDescription>
                هل أنت متأكد من حظر "{userToBan?.full_name || userToBan?.email}"؟ لن يتمكن من الوصول للموقع.
              </AdminDialogDescription>
            </AdminDialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">سبب الحظر *</label>
                <Textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="اكتب سبب حظر هذا المستخدم..."
                  className="mt-1"
                />
              </div>
            </div>
            <AdminDialogFooter>
              <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmBanUser}
                disabled={banUserMutation.isPending || !banReason.trim()}
              >
                {banUserMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد الحظر
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>

        {/* Add Warning Dialog */}
        <AdminDialog open={isWarningDialogOpen} onOpenChange={setIsWarningDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>إضافة تحذير</AdminDialogTitle>
              <AdminDialogDescription>
                إضافة تحذير للمستخدم "{userToWarn?.full_name || userToWarn?.email}". 
                {getUserWarningsCount(userToWarn?.id || '') >= 2 && (
                  <span className="text-destructive font-medium"> سيتم حظر المستخدم تلقائياً عند التحذير الثالث!</span>
                )}
              </AdminDialogDescription>
            </AdminDialogHeader>
            <div className="space-y-4">
              <div>
                <Label>سبب التحذير *</Label>
                <Select value={warningReason} onValueChange={setWarningReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر سبب التحذير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="محتوى غير لائق">محتوى غير لائق</SelectItem>
                    <SelectItem value="إساءة للآخرين">إساءة للآخرين</SelectItem>
                    <SelectItem value="سبام أو إعلانات">سبام أو إعلانات</SelectItem>
                    <SelectItem value="انتهاك حقوق النشر">انتهاك حقوق النشر</SelectItem>
                    <SelectItem value="معلومات مضللة">معلومات مضللة</SelectItem>
                    <SelectItem value="سلوك مخالف">سلوك مخالف</SelectItem>
                    <SelectItem value="أخرى">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ملاحظات إضافية</Label>
                <Textarea
                  value={warningNotes}
                  onChange={(e) => setWarningNotes(e.target.value)}
                  placeholder="ملاحظات إضافية (اختياري)..."
                  className="mt-1"
                />
              </div>
              {userToWarn && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">التحذيرات الحالية: {getUserWarningsCount(userToWarn.id)}/3</span>
                </div>
              )}
            </div>
            <AdminDialogFooter>
              <Button variant="outline" onClick={() => setIsWarningDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={confirmAddWarning}
                disabled={addWarningMutation.isPending || !warningReason.trim()}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {addWarningMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                إضافة التحذير
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>

        {/* Change Role Dialog */}
        <AdminDialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>تغيير دور المستخدم</AdminDialogTitle>
              <AdminDialogDescription>
                تغيير دور المستخدم "{userToChangeRole?.full_name || userToChangeRole?.email}"
              </AdminDialogDescription>
            </AdminDialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الدور الجديد</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        مستخدم عادي
                      </div>
                    </SelectItem>
                    <SelectItem value="support">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4 text-purple-600" />
                        دعم فني
                      </div>
                    </SelectItem>
                    <SelectItem value="moderator">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        مشرف
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        مدير
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-muted rounded-lg space-y-2 text-sm">
                <p className="font-medium">صلاحيات الأدوار:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <strong>مستخدم:</strong> صلاحيات أساسية فقط</li>
                  <li>• <strong>دعم:</strong> الرسائل والتقارير</li>
                  <li>• <strong>مشرف:</strong> إدارة الكتب والمراجعات</li>
                  <li>• <strong>مدير:</strong> كل الصلاحيات</li>
                </ul>
              </div>
            </div>
            <AdminDialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={confirmChangeRole}
                disabled={changeRoleMutation.isPending}
              >
                {changeRoleMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد التغيير
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>

        {/* Edit User Dialog */}
        <AdminDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AdminDialogContent className="max-w-lg">
            <AdminDialogHeader>
              <AdminDialogTitle>تعديل بيانات المستخدم</AdminDialogTitle>
            </AdminDialogHeader>
            {selectedUser && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Avatar Section */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="relative">
                    {editForm.avatar_url ? (
                      <img
                        src={editForm.avatar_url}
                        alt={editForm.full_name || ''}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl text-primary font-medium">
                          {editForm.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                      ) : (
                        <Pencil className="w-3 h-3 text-primary-foreground" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">ID: {selectedUser.id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground mt-1">اضغط على القلم لتغيير الصورة</p>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="البريد الإلكتروني"
                    dir="ltr"
                  />
                  {editForm.email !== selectedUser.email && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">سيتم تحديث البريد الإلكتروني</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">الاسم الكامل</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="الاسم الكامل"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">اسم المستخدم</Label>
                    <Input
                      id="username"
                      value={editForm.username}
                      onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="اسم المستخدم"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">الدولة</Label>
                  <Input
                    id="country"
                    value={editForm.country}
                    onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="الدولة"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">النبذة التعريفية</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="نبذة عن المستخدم..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>حساب عام</Label>
                    <p className="text-sm text-muted-foreground">السماح للآخرين برؤية الملف الشخصي</p>
                  </div>
                  <Switch
                    checked={editForm.is_public}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>
              </div>
            )}
            <AdminDialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleSaveUser}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                حفظ التغييرات
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
