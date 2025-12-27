import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AdminDialog, 
  AdminDialogContent, 
  AdminDialogHeader, 
  AdminDialogTitle, 
  AdminDialogTrigger 
} from '@/components/admin/AdminDialog';
import { toast } from 'sonner';
import { Loader2, Shield, Plus, Trash2, Crown, UserCheck, User, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useActivityLog } from '@/hooks/useActivityLog';

const roleIcons: Record<string, any> = {
  admin: Crown,
  moderator: UserCheck,
  support: Shield,
  user: User,
};

const roleLabels: Record<string, string> = {
  admin: 'مدير',
  moderator: 'مشرف',
  support: 'دعم',
  user: 'مستخدم',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  moderator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  support: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  user: 'bg-muted text-muted-foreground',
};

export const AdminRoles = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'moderator' | 'support'>('moderator');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['allUserRoles'],
    queryFn: async () => {
      // First get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;
      
      // Then get profiles for these users using the admin function
      const { data: users, error: usersError } = await supabase.rpc('get_admin_users');
      
      if (usersError) throw usersError;
      
      // Merge the data
      return roles?.map(role => ({
        ...role,
        profiles: users?.find(u => u.id === role.user_id) || null
      })) || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data;
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: role as any }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      toast.success('تمت إضافة الصلاحية');
      setIsAddDialogOpen(false);
      setSelectedUserId('');
    },
    onError: (error: any) => {
      if (error.message.includes('duplicate')) {
        toast.error('هذا المستخدم لديه هذه الصلاحية بالفعل');
      } else {
        toast.error('حدث خطأ أثناء الإضافة');
      }
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      toast.success('تمت إزالة الصلاحية');
    },
  });

  const handleAddRole = () => {
    if (!selectedUserId) {
      toast.error('يرجى اختيار مستخدم');
      return;
    }
    
    const user = users?.find(u => u.id === selectedUserId);
    addRoleMutation.mutate({ userId: selectedUserId, role: selectedRole });
    logActivity({
      actionType: 'create',
      entityType: 'user',
      entityId: selectedUserId,
      entityName: user?.full_name || user?.username || 'Unknown',
      details: { role: selectedRole }
    });
  };

  const handleRemoveRole = (roleId: string, userName: string, role: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذه الصلاحية؟')) return;
    removeRoleMutation.mutate(roleId);
    logActivity({
      actionType: 'delete',
      entityType: 'user',
      entityName: userName,
      details: { role }
    });
  };

  // Filter users based on search query
  const filteredUsers = users?.filter(u => {
    const searchLower = userSearchQuery.toLowerCase();
    return (
      (u.full_name?.toLowerCase().includes(searchLower) || false) ||
      (u.username?.toLowerCase().includes(searchLower) || false) ||
      u.id.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Check if user already has the selected role
  const userHasRole = (userId: string, role: string) => {
    return userRoles?.some(r => r.user_id === userId && r.role === role);
  };

  const adminCount = userRoles?.filter(r => r.role === 'admin').length || 0;
  const moderatorCount = userRoles?.filter(r => r.role === 'moderator').length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الأدوار</h1>
            <p className="text-muted-foreground mt-1">التحكم في صلاحيات المستخدمين</p>
          </div>
          <AdminDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <AdminDialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                إضافة صلاحية
              </Button>
            </AdminDialogTrigger>
            <AdminDialogContent>
              <AdminDialogHeader>
                <AdminDialogTitle>إضافة صلاحية جديدة</AdminDialogTitle>
              </AdminDialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">البحث عن مستخدم</label>
                  <div className="relative mt-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث بالاسم أو اسم المستخدم..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">المستخدم ({filteredUsers.length} نتيجة)</label>
                  <select
                    className="w-full mt-1 p-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100 max-h-48"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    size={5}
                  >
                    <option value="">اختر مستخدم</option>
                    {filteredUsers.map(user => {
                      const hasCurrentRole = userHasRole(user.id, selectedRole);
                      return (
                        <option 
                          key={user.id} 
                          value={user.id}
                          disabled={hasCurrentRole}
                          className={hasCurrentRole ? 'opacity-50' : ''}
                        >
                          {user.full_name || user.username || user.id}
                          {user.username ? ` (@${user.username})` : ''}
                          {hasCurrentRole ? ' ✓' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedUserId && userHasRole(selectedUserId, selectedRole) && (
                    <p className="text-sm text-yellow-500 mt-1">
                      هذا المستخدم لديه هذه الصلاحية بالفعل
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">الصلاحية</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      variant={selectedRole === 'admin' ? 'default' : 'outline'}
                      onClick={() => setSelectedRole('admin')}
                      size="sm"
                    >
                      <Crown className="w-4 h-4 ml-1" />
                      مدير
                    </Button>
                    <Button
                      variant={selectedRole === 'moderator' ? 'default' : 'outline'}
                      onClick={() => setSelectedRole('moderator')}
                      size="sm"
                    >
                      <UserCheck className="w-4 h-4 ml-1" />
                      مشرف
                    </Button>
                    <Button
                      variant={selectedRole === 'support' ? 'default' : 'outline'}
                      onClick={() => setSelectedRole('support')}
                      size="sm"
                    >
                      <Shield className="w-4 h-4 ml-1" />
                      دعم
                    </Button>
                  </div>
                </div>
                <Button onClick={handleAddRole} className="w-full" disabled={addRoleMutation.isPending}>
                  {addRoleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  إضافة الصلاحية
                </Button>
              </div>
            </AdminDialogContent>
          </AdminDialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Crown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-sm text-muted-foreground">مدراء</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{moderatorCount}</p>
                <p className="text-sm text-muted-foreground">مشرفين</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(users?.length || 0) - (userRoles?.length || 0)}</p>
                <p className="text-sm text-muted-foreground">مستخدمين عاديين</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              المستخدمين ذوي الصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : userRoles && userRoles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>الصلاحية</TableHead>
                    <TableHead>تاريخ الإضافة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRoles.map((role) => {
                    const RoleIcon = roleIcons[role.role] || User;
                    return (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {(role.profiles as any)?.avatar_url ? (
                              <img
                                src={(role.profiles as any).avatar_url}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {((role.profiles as any)?.full_name || (role.profiles as any)?.email || '?').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {(role.profiles as any)?.full_name || (role.profiles as any)?.email || 'بدون اسم'}
                              </p>
                              {(role.profiles as any)?.username && (
                                <p className="text-sm text-muted-foreground">
                                  @{(role.profiles as any).username}
                                </p>
                              )}
                              {(role.profiles as any)?.email && (
                                <p className="text-xs text-muted-foreground">
                                  {(role.profiles as any).email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={roleColors[role.role]}>
                            <RoleIcon className="w-3 h-3 ml-1" />
                            {roleLabels[role.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(role.created_at), 'dd MMM yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRole(
                              role.id, 
                              (role.profiles as any)?.full_name || '', 
                              role.role
                            )}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد صلاحيات مخصصة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRoles;
