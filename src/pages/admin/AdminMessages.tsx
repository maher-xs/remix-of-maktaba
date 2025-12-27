import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Eye, Trash2, Mail, CheckCheck, Archive, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useActivityLog } from '@/hooks/useActivityLog';
import { AdminPagination } from '@/components/admin/AdminPagination';

const statusOptions = [
  { value: 'unread', label: 'غير مقروء', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'read', label: 'مقروء', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'replied', label: 'تم الرد', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'archived', label: 'مؤرشف', color: 'bg-muted text-muted-foreground' },
];

export const AdminMessages = () => {
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['contactMessages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updateData: any = { status };
      if (notes !== undefined) updateData.admin_notes = notes;
      if (status === 'replied') updateData.replied_at = new Date().toISOString();

      const { error } = await supabase
        .from('contact_messages')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
      toast.success('تم تحديث الحالة');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactMessages'] });
      toast.success('تم حذف الرسالة');
    },
  });

  const handleViewMessage = (message: any) => {
    setSelectedMessage(message);
    setAdminNotes(message.admin_notes || '');
    setReplyMessage('');
    setIsViewDialogOpen(true);
    
    // Mark as read if unread
    if (message.status === 'unread') {
      updateStatusMutation.mutate({ id: message.id, status: 'read' });
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyMessage.trim()) {
      toast.error('يرجى كتابة رسالة الرد');
      return;
    }

    setIsSendingReply(true);

    type SendReplyEmailResponse = {
      success: boolean;
      error?: string;
      status?: number;
      needs_domain_verification?: boolean;
    };

    try {
      const { data, error } = await supabase.functions.invoke('send-reply-email', {
        body: {
          to: selectedMessage.email,
          subject: `رد: ${selectedMessage.subject}`,
          recipientName: selectedMessage.name,
          message: replyMessage,
          originalSubject: selectedMessage.subject,
        },
      });

      if (error) throw error;

      const payload = data as SendReplyEmailResponse | null;

      if (!payload?.success) {
        const message = payload?.error || 'فشل في إرسال الرد';
        if (payload?.needs_domain_verification) {
          toast.error('حساب البريد في وضع التجربة: وثّق الدومين واضبط عنوان الإرسال (From) ثم أعد المحاولة.');
        } else {
          toast.error(message);
        }
        return;
      }

      // Update status to replied
      await updateStatusMutation.mutateAsync({
        id: selectedMessage.id,
        status: 'replied',
        notes: adminNotes
          ? `${adminNotes}\n\n--- الرد المرسل ---\n${replyMessage}`
          : `--- الرد المرسل ---\n${replyMessage}`,
      });

      toast.success('تم إرسال الرد بنجاح');
      setReplyMessage('');
      setSelectedMessage({ ...selectedMessage, status: 'replied' });

      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityId: selectedMessage.id,
        entityName: `رد على رسالة من ${selectedMessage.name}`,
      });
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast.error(error.message || 'فشل في إرسال الرد');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSaveNotes = () => {
    if (selectedMessage) {
      updateStatusMutation.mutate({ 
        id: selectedMessage.id, 
        status: selectedMessage.status,
        notes: adminNotes 
      });
      logActivity({
        actionType: 'update',
        entityType: 'setting',
        entityId: selectedMessage.id,
        entityName: `رسالة من ${selectedMessage.name}`,
      });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
    deleteMutation.mutate(id);
    logActivity({
      actionType: 'delete',
      entityType: 'setting',
      entityId: id,
      entityName: `رسالة من ${name}`,
    });
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(s => s.value === status);
    return option ? (
      <Badge variant="secondary" className={option.color}>
        {option.label}
      </Badge>
    ) : null;
  };

  const filteredMessages = messages?.filter(m => 
    filterStatus === 'all' || m.status === filterStatus
  );

  // Pagination logic
  const totalItems = filteredMessages?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedMessages = filteredMessages?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const unreadCount = messages?.filter(m => m.status === 'unread').length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">رسائل التواصل</h1>
            <p className="text-muted-foreground mt-1">إدارة رسائل الزوار والعملاء</p>
          </div>
          <div className="flex items-center gap-4">
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1">
                {unreadCount} رسالة جديدة
              </Badge>
            )}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="تصفية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">{filteredMessages?.length || 0} رسالة</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredMessages && filteredMessages.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المرسل</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead>البريد</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMessages?.map((message) => (
                      <TableRow key={message.id} className={message.status === 'unread' ? 'bg-primary/5' : ''}>
                        <TableCell>{getStatusBadge(message.status)}</TableCell>
                        <TableCell className="font-medium">{message.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{message.subject}</TableCell>
                        <TableCell>
                          <a href={`mailto:${message.email}`} className="text-primary hover:underline">
                            {message.email}
                          </a>
                        </TableCell>
                        <TableCell>
                          {format(new Date(message.created_at), 'dd MMM yyyy - HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleViewMessage(message)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(message.id, message.name)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
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
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد رسائل</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base">تفاصيل الرسالة</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">المرسل</span>
                    <p className="font-medium">{selectedMessage.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">البريد</span>
                    <p>
                      <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline text-xs">
                        {selectedMessage.email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">التاريخ</span>
                    <p className="text-sm">{format(new Date(selectedMessage.created_at), 'dd/MM/yyyy - HH:mm', { locale: ar })}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">الحالة</span>
                    <Select 
                      value={selectedMessage.status} 
                      onValueChange={(value) => {
                        updateStatusMutation.mutate({ id: selectedMessage.id, status: value });
                        setSelectedMessage({ ...selectedMessage, status: value });
                      }}
                    >
                      <SelectTrigger className="w-28 h-8 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">الموضوع</span>
                  <p className="font-medium">{selectedMessage.subject}</p>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">الرسالة</span>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm max-h-32 overflow-y-auto">
                    {selectedMessage.message}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">ملاحظات الإدارة</span>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="أضف ملاحظات..."
                    rows={2}
                    className="mt-1 text-sm"
                  />
                  <Button onClick={handleSaveNotes} size="sm" className="mt-2 h-8">
                    حفظ الملاحظات
                  </Button>
                </div>

                <div className="pt-3 border-t">
                  <span className="text-xs font-medium flex items-center gap-1 mb-1">
                    <Send className="w-3 h-3" />
                    الرد على الرسالة
                  </span>
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={3}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleSendReply} 
                    className="mt-2 w-full h-9"
                    disabled={isSendingReply || !replyMessage.trim()}
                  >
                    {isSendingReply ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إرسال الرد
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Button asChild variant="outline" size="sm" className="flex-1 h-8">
                    <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}>
                      <Mail className="w-3 h-3 ml-1" />
                      فتح في البريد
                    </a>
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedMessage.id, status: 'replied' });
                      setSelectedMessage({ ...selectedMessage, status: 'replied' });
                    }}
                  >
                    <CheckCheck className="w-3 h-3 ml-1" />
                    تم الرد
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedMessage.id, status: 'archived' });
                      setIsViewDialogOpen(false);
                    }}
                  >
                    <Archive className="w-3 h-3 ml-1" />
                    أرشفة
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminMessages;
