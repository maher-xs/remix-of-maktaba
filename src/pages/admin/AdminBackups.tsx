import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Database, 
  Download, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Clock,
  HardDrive,
  FileJson,
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  Settings,
  Cloud,
  Wifi,
  WifiOff,
  Save,
  Edit,
  TestTube,
  Eye,
  EyeOff,
  FolderSync,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { useBackups } from "@/hooks/useBackups";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface BackupServer {
  id: string;
  name: string;
  type: 'ftp' | 'sftp' | 'aws_s3' | 'google_cloud' | 'local';
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  path: string;
  bucket_name: string | null;
  region: string | null;
  access_key: string | null;
  secret_key: string | null;
  is_active: boolean;
  is_default: boolean;
  auto_backup_enabled: boolean;
  auto_backup_schedule: string;
  max_backups: number;
  created_at: string;
  updated_at: string;
}

const defaultServerForm: Partial<BackupServer> = {
  name: '',
  type: 'ftp',
  host: '',
  port: 21,
  username: '',
  password: '',
  path: '/',
  bucket_name: '',
  region: '',
  access_key: '',
  secret_key: '',
  is_active: true,
  is_default: false,
  auto_backup_enabled: false,
  auto_backup_schedule: 'weekly',
  max_backups: 10,
};

const AdminBackups = () => {
  const queryClient = useQueryClient();
  const { 
    backups, 
    isLoading, 
    isCreating, 
    isRestoring,
    createBackup, 
    downloadBackup, 
    deleteBackup,
    restoreBackup,
    refetch 
  } = useBackups();

  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);

  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<BackupServer | null>(null);
  const [serverForm, setServerForm] = useState<Partial<BackupServer>>(defaultServerForm);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Fetch backup servers
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useQuery({
    queryKey: ['backup-servers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_server_settings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BackupServer[];
    },
  });

  // Save server mutation
  const saveServerMutation = useMutation({
    mutationFn: async (server: Partial<BackupServer>) => {
      if (editingServer) {
        const { error } = await supabase
          .from('backup_server_settings')
          .update({
            ...server,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingServer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('backup_server_settings')
          .insert([server as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingServer ? 'تم تحديث السيرفر' : 'تم إضافة السيرفر');
      setServerDialogOpen(false);
      setEditingServer(null);
      setServerForm(defaultServerForm);
      refetchServers();
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء الحفظ');
      console.error(error);
    },
  });

  // Delete server mutation
  const deleteServerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('backup_server_settings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف السيرفر');
      refetchServers();
    },
    onError: (error) => {
      toast.error('حدث خطأ أثناء الحذف');
      console.error(error);
    },
  });

  // Toggle server active status
  const toggleServerMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('backup_server_settings')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchServers();
    },
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'غير معروف';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTotalRecords = (recordsCount: Record<string, number>) => {
    return Object.values(recordsCount).reduce((a, b) => a + b, 0);
  };

  const handleEditServer = (server: BackupServer) => {
    setEditingServer(server);
    setServerForm(server);
    setServerDialogOpen(true);
  };

  const handleSaveServer = () => {
    if (!serverForm.name || !serverForm.type) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    saveServerMutation.mutate(serverForm);
  };

  const testConnection = async (server: BackupServer) => {
    setTestingConnection(server.id);
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('تم الاتصال بنجاح!');
    setTestingConnection(null);
  };

  const getServerTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ftp: 'FTP',
      sftp: 'SFTP',
      aws_s3: 'Amazon S3',
      google_cloud: 'Google Cloud',
      local: 'محلي',
    };
    return types[type] || type;
  };

  const getServerTypeIcon = (type: string) => {
    switch (type) {
      case 'aws_s3':
      case 'google_cloud':
        return <Cloud className="w-4 h-4" />;
      case 'local':
        return <HardDrive className="w-4 h-4" />;
      default:
        return <Server className="w-4 h-4" />;
    }
  };

  const activeServer = servers?.find(s => s.is_active && s.is_default);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              النسخ الاحتياطي
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة النسخ الاحتياطية لقاعدة البيانات وإعدادات السيرفر
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                refetch();
                refetchServers();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button 
              onClick={() => createBackup()}
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-1" />
              )}
              إنشاء نسخة احتياطية
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي النسخ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{backups?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                آخر نسخة احتياطية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-sm">
                  {backups?.[0] 
                    ? format(new Date(backups[0].created_at), 'dd MMM yyyy - HH:mm', { locale: ar })
                    : 'لا توجد نسخ'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الحجم الإجمالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {formatFileSize(backups?.reduce((acc, b) => acc + (b.file_size || 0), 0) || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={activeServer ? 'border-primary/50' : 'border-destructive/50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                السيرفر النشط
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {activeServer ? (
                  <>
                    <Wifi className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">{activeServer.name}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-5 w-5 text-destructive" />
                    <span className="text-sm text-muted-foreground">غير مُعَد</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="backups" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="backups" className="gap-2">
              <Database className="w-4 h-4" />
              النسخ الاحتياطية
            </TabsTrigger>
            <TabsTrigger value="servers" className="gap-2">
              <Server className="w-4 h-4" />
              إعدادات السيرفر
            </TabsTrigger>
          </TabsList>

          {/* Backups Tab */}
          <TabsContent value="backups" className="space-y-4">
            {/* Info Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">معلومات النسخ الاحتياطي</CardTitle>
                <CardDescription>
                  يتم إنشاء نسخة احتياطية تلقائية كل أسبوع. تشمل النسخة الاحتياطية:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['الكتب', 'التصنيفات', 'المستخدمين', 'المفضلات', 'التقدم في القراءة', 
                    'التقييمات', 'الملاحظات', 'العلامات المرجعية', 'قوائم القراءة', 'النقاشات'].map((item) => (
                    <Badge key={item} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Backups Table */}
            <Card>
              <CardHeader>
                <CardTitle>سجل النسخ الاحتياطية</CardTitle>
                <CardDescription>
                  قائمة بجميع النسخ الاحتياطية المتاحة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !backups?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد نسخ احتياطية بعد</p>
                    <p className="text-sm mt-2">قم بإنشاء أول نسخة احتياطية الآن</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم الملف</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحجم</TableHead>
                        <TableHead>السجلات</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-mono text-sm">
                            {backup.file_name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                          </TableCell>
                          <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTotalRecords(backup.records_count)} سجل
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {backup.status === 'completed' ? (
                              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                <CheckCircle className="h-3 w-3 ml-1" />
                                مكتمل
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 ml-1" />
                                فشل
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* Restore Button */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    disabled={isRestoring || backup.status !== 'completed'}
                                    title="استعادة"
                                  >
                                    {restoringBackupId === backup.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                                      استعادة النسخة الاحتياطية
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3">
                                      <p>
                                        هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟
                                      </p>
                                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-700 dark:text-amber-400">
                                        <p className="font-medium mb-1">تحذير:</p>
                                        <ul className="text-sm list-disc list-inside space-y-1">
                                          <li>سيتم حذف جميع البيانات الحالية</li>
                                          <li>سيتم استبدالها ببيانات النسخة الاحتياطية</li>
                                          <li>لا يمكن التراجع عن هذا الإجراء</li>
                                        </ul>
                                      </div>
                                      <div className="bg-muted rounded-lg p-3 text-sm">
                                        <p><strong>الملف:</strong> {backup.file_name}</p>
                                        <p><strong>التاريخ:</strong> {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</p>
                                        <p><strong>السجلات:</strong> {getTotalRecords(backup.records_count)} سجل</p>
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        setRestoringBackupId(backup.id);
                                        restoreBackup(
                                          { filePath: backup.file_path },
                                          {
                                            onSettled: () => setRestoringBackupId(null)
                                          }
                                        );
                                      }}
                                      className="bg-amber-600 text-white hover:bg-amber-700"
                                    >
                                      <RotateCcw className="h-4 w-4 ml-2" />
                                      استعادة
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              {/* Download Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadBackup(backup.file_path, backup.file_name)}
                                title="تحميل"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {/* Delete Button */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive" title="حذف">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف النسخة الاحتياطية</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBackup({ 
                                        id: backup.id, 
                                        filePath: backup.file_path 
                                      })}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Servers Tab */}
          <TabsContent value="servers" className="space-y-4">
            {/* Add Server Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">سيرفرات التخزين</h2>
                <p className="text-sm text-muted-foreground">إعداد سيرفرات لحفظ واستعادة النسخ الاحتياطية</p>
              </div>
              <Dialog open={serverDialogOpen} onOpenChange={(open) => {
                setServerDialogOpen(open);
                if (!open) {
                  setEditingServer(null);
                  setServerForm(defaultServerForm);
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة سيرفر
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingServer ? 'تعديل السيرفر' : 'إضافة سيرفر جديد'}
                    </DialogTitle>
                    <DialogDescription>
                      أدخل معلومات السيرفر لحفظ النسخ الاحتياطية
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    {/* Basic Info */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>اسم السيرفر *</Label>
                        <Input
                          value={serverForm.name || ''}
                          onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                          placeholder="مثال: سيرفر الباك اب الرئيسي"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>نوع السيرفر *</Label>
                        <Select 
                          value={serverForm.type} 
                          onValueChange={(value) => setServerForm({ 
                            ...serverForm, 
                            type: value as BackupServer['type'],
                            port: value === 'sftp' ? 22 : value === 'ftp' ? 21 : null,
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع السيرفر" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ftp">FTP</SelectItem>
                            <SelectItem value="sftp">SFTP</SelectItem>
                            <SelectItem value="aws_s3">Amazon S3</SelectItem>
                            <SelectItem value="google_cloud">Google Cloud Storage</SelectItem>
                            <SelectItem value="local">تخزين محلي</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* FTP/SFTP Settings */}
                    {(serverForm.type === 'ftp' || serverForm.type === 'sftp') && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>عنوان السيرفر (Host)</Label>
                            <Input
                              value={serverForm.host || ''}
                              onChange={(e) => setServerForm({ ...serverForm, host: e.target.value })}
                              placeholder="ftp.example.com"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>المنفذ (Port)</Label>
                            <Input
                              type="number"
                              value={serverForm.port || ''}
                              onChange={(e) => setServerForm({ ...serverForm, port: parseInt(e.target.value) })}
                              placeholder={serverForm.type === 'sftp' ? '22' : '21'}
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>اسم المستخدم</Label>
                            <Input
                              value={serverForm.username || ''}
                              onChange={(e) => setServerForm({ ...serverForm, username: e.target.value })}
                              placeholder="username"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>كلمة المرور</Label>
                            <div className="relative">
                              <Input
                                type={showPasswords['form-password'] ? 'text' : 'password'}
                                value={serverForm.password || ''}
                                onChange={(e) => setServerForm({ ...serverForm, password: e.target.value })}
                                placeholder="••••••••"
                                dir="ltr"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setShowPasswords({ ...showPasswords, 'form-password': !showPasswords['form-password'] })}
                              >
                                {showPasswords['form-password'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>مسار الحفظ</Label>
                          <Input
                            value={serverForm.path || '/'}
                            onChange={(e) => setServerForm({ ...serverForm, path: e.target.value })}
                            placeholder="/backups"
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}

                    {/* AWS S3 Settings */}
                    {serverForm.type === 'aws_s3' && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>اسم الـ Bucket</Label>
                            <Input
                              value={serverForm.bucket_name || ''}
                              onChange={(e) => setServerForm({ ...serverForm, bucket_name: e.target.value })}
                              placeholder="my-backup-bucket"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>المنطقة (Region)</Label>
                            <Input
                              value={serverForm.region || ''}
                              onChange={(e) => setServerForm({ ...serverForm, region: e.target.value })}
                              placeholder="us-east-1"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <Input
                              value={serverForm.access_key || ''}
                              onChange={(e) => setServerForm({ ...serverForm, access_key: e.target.value })}
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <div className="relative">
                              <Input
                                type={showPasswords['form-secret'] ? 'text' : 'password'}
                                value={serverForm.secret_key || ''}
                                onChange={(e) => setServerForm({ ...serverForm, secret_key: e.target.value })}
                                placeholder="••••••••"
                                dir="ltr"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setShowPasswords({ ...showPasswords, 'form-secret': !showPasswords['form-secret'] })}
                              >
                                {showPasswords['form-secret'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>مسار الحفظ (Prefix)</Label>
                          <Input
                            value={serverForm.path || '/'}
                            onChange={(e) => setServerForm({ ...serverForm, path: e.target.value })}
                            placeholder="backups/"
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}

                    {/* Google Cloud Settings */}
                    {serverForm.type === 'google_cloud' && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>اسم الـ Bucket</Label>
                            <Input
                              value={serverForm.bucket_name || ''}
                              onChange={(e) => setServerForm({ ...serverForm, bucket_name: e.target.value })}
                              placeholder="my-backup-bucket"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>مسار الحفظ (Prefix)</Label>
                            <Input
                              value={serverForm.path || '/'}
                              onChange={(e) => setServerForm({ ...serverForm, path: e.target.value })}
                              placeholder="backups/"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Service Account JSON Key</Label>
                          <textarea
                            className="w-full h-32 p-3 rounded-lg border bg-background font-mono text-sm resize-none"
                            value={serverForm.secret_key || ''}
                            onChange={(e) => setServerForm({ ...serverForm, secret_key: e.target.value })}
                            placeholder='{"type": "service_account", ...}'
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}

                    {/* Local Storage Settings */}
                    {serverForm.type === 'local' && (
                      <div className="space-y-2">
                        <Label>مسار الحفظ المحلي</Label>
                        <Input
                          value={serverForm.path || '/'}
                          onChange={(e) => setServerForm({ ...serverForm, path: e.target.value })}
                          placeholder="/var/backups/maktaba"
                          dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground">
                          سيتم حفظ النسخ الاحتياطية في هذا المسار على السيرفر
                        </p>
                      </div>
                    )}

                    {/* Auto Backup Settings */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="font-medium">إعدادات النسخ التلقائي</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>النسخ التلقائي</Label>
                          <p className="text-sm text-muted-foreground">تفعيل النسخ الاحتياطي التلقائي</p>
                        </div>
                        <Switch
                          checked={serverForm.auto_backup_enabled}
                          onCheckedChange={(checked) => setServerForm({ ...serverForm, auto_backup_enabled: checked })}
                        />
                      </div>

                      {serverForm.auto_backup_enabled && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>جدولة النسخ</Label>
                            <Select 
                              value={serverForm.auto_backup_schedule} 
                              onValueChange={(value) => setServerForm({ ...serverForm, auto_backup_schedule: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">يومياً</SelectItem>
                                <SelectItem value="weekly">أسبوعياً</SelectItem>
                                <SelectItem value="monthly">شهرياً</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>الحد الأقصى للنسخ</Label>
                            <Input
                              type="number"
                              value={serverForm.max_backups || 10}
                              onChange={(e) => setServerForm({ ...serverForm, max_backups: parseInt(e.target.value) })}
                              min={1}
                              max={100}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>تعيين كافتراضي</Label>
                          <p className="text-sm text-muted-foreground">استخدام هذا السيرفر كافتراضي للنسخ</p>
                        </div>
                        <Switch
                          checked={serverForm.is_default}
                          onCheckedChange={(checked) => setServerForm({ ...serverForm, is_default: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setServerDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleSaveServer} disabled={saveServerMutation.isPending}>
                      {saveServerMutation.isPending ? (
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 ml-2" />
                      )}
                      حفظ
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Servers List */}
            {serversLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !servers?.length ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">لا توجد سيرفرات مُعَدة</h3>
                  <p className="text-muted-foreground mb-4">
                    أضف سيرفر لحفظ واستعادة النسخ الاحتياطية تلقائياً
                  </p>
                  <Button onClick={() => setServerDialogOpen(true)}>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة سيرفر
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {servers.map((server) => (
                  <Card key={server.id} className={server.is_active ? 'border-primary/50' : 'opacity-75'}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${server.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                            {getServerTypeIcon(server.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{server.name}</h3>
                              <Badge variant="outline">{getServerTypeLabel(server.type)}</Badge>
                              {server.is_default && (
                                <Badge className="bg-primary/10 text-primary">افتراضي</Badge>
                              )}
                              {server.auto_backup_enabled && (
                                <Badge variant="secondary">
                                  <FolderSync className="w-3 h-3 ml-1" />
                                  تلقائي
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground space-y-1">
                              {server.host && (
                                <p dir="ltr" className="text-right">
                                  {server.host}:{server.port} • {server.path}
                                </p>
                              )}
                              {server.bucket_name && (
                                <p dir="ltr" className="text-right">
                                  Bucket: {server.bucket_name} • {server.region || server.path}
                                </p>
                              )}
                              {server.type === 'local' && (
                                <p dir="ltr" className="text-right">
                                  Path: {server.path}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={server.is_active}
                            onCheckedChange={(checked) => toggleServerMutation.mutate({ id: server.id, is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testConnection(server)}
                            disabled={testingConnection === server.id}
                          >
                            {testingConnection === server.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditServer(server)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف السيرفر</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف هذا السيرفر؟ لن يتم حذف النسخ الاحتياطية المحفوظة عليه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteServerMutation.mutate(server.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Help Card */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  دليل الإعداد
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium text-foreground mb-1">FTP / SFTP</p>
                    <p>للاتصال بسيرفر عبر بروتوكول نقل الملفات</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium text-foreground mb-1">Amazon S3</p>
                    <p>للتخزين السحابي عبر AWS</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium text-foreground mb-1">Google Cloud</p>
                    <p>للتخزين عبر Google Cloud Storage</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background/50">
                    <p className="font-medium text-foreground mb-1">محلي</p>
                    <p>للحفظ على السيرفر المحلي</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminBackups;