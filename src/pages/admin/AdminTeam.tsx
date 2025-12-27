import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Pencil, Trash2, Users, GripVertical } from 'lucide-react';
import {
  useAdminTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  TeamMember,
} from '@/hooks/useTeamMembers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const AdminTeam = () => {
  const { data: members = [], isLoading } = useAdminTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    avatar_url: '',
    is_active: true,
    display_order: 0,
    social_links: {} as Record<string, string>,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      bio: '',
      avatar_url: '',
      is_active: true,
      display_order: members.length,
      social_links: {},
    });
    setEditingMember(null);
  };

  const handleOpenDialog = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        role: member.role,
        bio: member.bio || '',
        avatar_url: member.avatar_url || '',
        is_active: member.is_active,
        display_order: member.display_order,
        social_links: member.social_links || {},
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMember) {
      await updateMember.mutateAsync({
        id: editingMember.id,
        ...formData,
      });
    } else {
      await createMember.mutateAsync(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (memberToDelete) {
      await deleteMember.mutateAsync(memberToDelete);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة الفريق</h1>
            <p className="text-muted-foreground">
              أضف وعدّل أعضاء الفريق الذين سيظهرون في صفحة "عن المكتبة"
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة عضو
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingMember ? 'تعديل العضو' : 'إضافة عضو جديد'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">الدور / المنصب *</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    placeholder="مثال: مؤسس المكتبة، مطور، مصمم..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">نبذة مختصرة</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="نبذة مختصرة عن العضو..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">رابط الصورة</Label>
                  <Input
                    id="avatar_url"
                    value={formData.avatar_url}
                    onChange={(e) =>
                      setFormData({ ...formData, avatar_url: e.target.value })
                    }
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_order">ترتيب العرض</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">نشط (يظهر في الموقع)</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingMember ? 'حفظ التغييرات' : 'إضافة'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الأعضاء</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الأعضاء النشطين</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الأعضاء</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                جاري التحميل...
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد أعضاء بعد</p>
                <p className="text-sm">اضغط على "إضافة عضو" لإضافة أول عضو في الفريق</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>العضو</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback>
                              {member.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            {member.bio && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {member.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.is_active
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {member.is_active ? 'نشط' : 'مخفي'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(member)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setMemberToDelete(member.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا العضو نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminTeam;
