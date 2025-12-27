import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { toast } from 'sonner';
import { 
  Loader2, Search, AlertTriangle, Trash2, User, Calendar, Filter, Eye, Ban
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  AdminDialog, 
  AdminDialogContent, 
  AdminDialogHeader, 
  AdminDialogTitle, 
  AdminDialogDescription,
  AdminDialogFooter 
} from '@/components/admin/AdminDialog';
import { useNavigate } from 'react-router-dom';

interface Warning {
  id: string;
  user_id: string;
  reason: string;
  notes: string | null;
  content_type: string | null;
  content_id: string | null;
  issued_by: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
  is_banned?: boolean;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
type ReasonFilter = 'all' | string;

export const AdminWarnings = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [warningToDelete, setWarningToDelete] = useState<Warning | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all warnings
  const { data: warnings, isLoading } = useQuery({
    queryKey: ['allWarnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_warnings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Warning[];
    },
  });

  // Fetch admin users for displaying issuer names
  const { data: users } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Get user info by ID
  const getUserInfo = (userId: string): UserProfile | undefined => {
    return users?.find(u => u.id === userId);
  };

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
      queryClient.invalidateQueries({ queryKey: ['allWarnings'] });
      queryClient.invalidateQueries({ queryKey: ['allUserWarnings'] });
      toast.success('تم حذف التحذير بنجاح');
      setIsDeleteDialogOpen(false);
      setWarningToDelete(null);
    },
    onError: () => {
      toast.error('فشل في حذف التحذير');
    },
  });

  // Get unique reasons for filter
  const uniqueReasons = [...new Set(warnings?.map(w => w.reason) || [])];

  // Filter warnings
  const filteredWarnings = warnings?.filter(warning => {
    // Search filter - search in user info
    const user = getUserInfo(warning.user_id);
    const matchesSearch = 
      user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch && searchTerm) return false;

    // Date filter
    const warningDate = new Date(warning.created_at);
    const now = new Date();
    
    if (dateFilter === 'today') {
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      if (warningDate < todayStart || warningDate > todayEnd) return false;
    } else if (dateFilter === 'week') {
      const weekAgo = subDays(now, 7);
      if (warningDate < weekAgo) return false;
    } else if (dateFilter === 'month') {
      const monthAgo = subDays(now, 30);
      if (warningDate < monthAgo) return false;
    }

    // Reason filter
    if (reasonFilter !== 'all' && warning.reason !== reasonFilter) return false;

    return true;
  });

  // Pagination logic
  const totalItems = filteredWarnings?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedWarnings = filteredWarnings?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, reasonFilter]);

  // Stats
  const totalWarnings = warnings?.length || 0;
  const todayWarnings = warnings?.filter(w => {
    const date = new Date(w.created_at);
    const today = startOfDay(new Date());
    return date >= today;
  }).length || 0;
  const weekWarnings = warnings?.filter(w => {
    const date = new Date(w.created_at);
    const weekAgo = subDays(new Date(), 7);
    return date >= weekAgo;
  }).length || 0;

  // Users with 3+ warnings (at risk of ban)
  const userWarningCounts = warnings?.reduce((acc, w) => {
    acc[w.user_id] = (acc[w.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const usersAtRisk = Object.values(userWarningCounts).filter(count => count >= 3).length;

  const handleViewUser = (userId: string) => {
    navigate(`/admin/users?user=${userId}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">إدارة التحذيرات</h1>
            <p className="text-muted-foreground mt-1">عرض وإدارة جميع تحذيرات المستخدمين</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalWarnings}</p>
                  <p className="text-sm text-muted-foreground">إجمالي التحذيرات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayWarnings}</p>
                  <p className="text-sm text-muted-foreground">اليوم</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{weekWarnings}</p>
                  <p className="text-sm text-muted-foreground">هذا الأسبوع</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usersAtRisk}</p>
                  <p className="text-sm text-muted-foreground">معرضين للحظر</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالمستخدم أو السبب..."
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                  <SelectTrigger className="w-[130px]">
                    <Calendar className="w-4 h-4 ml-2" />
                    <SelectValue placeholder="التاريخ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الوقت</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">آخر أسبوع</SelectItem>
                    <SelectItem value="month">آخر شهر</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={reasonFilter} onValueChange={(v) => setReasonFilter(v as ReasonFilter)}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="w-4 h-4 ml-2" />
                    <SelectValue placeholder="السبب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأسباب</SelectItem>
                    {uniqueReasons.map(reason => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : paginatedWarnings?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد تحذيرات</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>الملاحظات</TableHead>
                    <TableHead>صادر من</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWarnings?.map((warning) => {
                    const user = getUserInfo(warning.user_id);
                    const issuer = getUserInfo(warning.issued_by);
                    const userWarningCount = userWarningCounts[warning.user_id] || 0;
                    
                    return (
                      <TableRow key={warning.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {user?.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name || ''}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{user?.full_name || 'مستخدم محذوف'}</span>
                                {user?.is_banned && (
                                  <Badge variant="destructive" className="text-xs">محظور</Badge>
                                )}
                              </div>
                              <span className="text-sm text-muted-foreground">@{user?.username || '-'}</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Badge 
                                  variant={userWarningCount >= 3 ? "destructive" : "secondary"} 
                                  className={`text-xs ${userWarningCount >= 3 ? '' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}
                                >
                                  {userWarningCount} تحذيرات
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                            {warning.reason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {warning.notes || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{issuer?.full_name || 'غير معروف'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(warning.created_at), 'dd MMM yyyy', { locale: ar })}</p>
                            <p className="text-muted-foreground text-xs">
                              {format(new Date(warning.created_at), 'HH:mm', { locale: ar })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedWarning(warning);
                                setIsViewDialogOpen(true);
                              }}
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewUser(warning.user_id)}
                              title="عرض المستخدم"
                            >
                              <User className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setWarningToDelete(warning);
                                setIsDeleteDialogOpen(true);
                              }}
                              title="حذف التحذير"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

        {/* View Warning Dialog */}
        <AdminDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>تفاصيل التحذير</AdminDialogTitle>
            </AdminDialogHeader>
            {selectedWarning && (() => {
              const user = getUserInfo(selectedWarning.user_id);
              const issuer = getUserInfo(selectedWarning.issued_by);
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || ''}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-lg">{user?.full_name || 'مستخدم محذوف'}</p>
                      <p className="text-muted-foreground">@{user?.username || '-'}</p>
                      {user?.is_banned && (
                        <Badge variant="destructive" className="mt-1">محظور</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">السبب</p>
                      <Badge variant="outline" className="mt-1 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                        {selectedWarning.reason}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">التاريخ</p>
                      <p className="font-medium mt-1">
                        {format(new Date(selectedWarning.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                      </p>
                    </div>
                  </div>

                  {selectedWarning.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">الملاحظات</p>
                      <p className="mt-1 p-3 bg-muted rounded-lg">{selectedWarning.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">صادر من</p>
                    <p className="font-medium mt-1">{issuer?.full_name || 'غير معروف'}</p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        handleViewUser(selectedWarning.user_id);
                      }}
                    >
                      <User className="w-4 h-4 ml-2" />
                      عرض المستخدم
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        setWarningToDelete(selectedWarning);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف التحذير
                    </Button>
                  </div>
                </div>
              );
            })()}
          </AdminDialogContent>
        </AdminDialog>

        {/* Delete Warning Dialog */}
        <AdminDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>حذف التحذير</AdminDialogTitle>
              <AdminDialogDescription>
                هل أنت متأكد من حذف هذا التحذير؟ لا يمكن التراجع عن هذا الإجراء.
              </AdminDialogDescription>
            </AdminDialogHeader>
            {warningToDelete && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="font-medium text-orange-700 dark:text-orange-400">{warningToDelete.reason}</p>
                {warningToDelete.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{warningToDelete.notes}</p>
                )}
              </div>
            )}
            <AdminDialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => warningToDelete && deleteWarningMutation.mutate(warningToDelete.id)}
                disabled={deleteWarningMutation.isPending}
              >
                {deleteWarningMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد الحذف
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminWarnings;
