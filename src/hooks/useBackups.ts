import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackupHistory {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  tables_backed_up: string[];
  records_count: Record<string, number>;
  status: string;
  error_message: string | null;
  created_at: string;
  created_by: string | null;
}

interface BackupResult {
  success: boolean;
  message?: string;
  error?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  tables_backed_up?: string[];
  records_count?: Record<string, number>;
  total_records?: number;
}

interface RestoreOptions {
  skip_tables?: string[];
  clear_existing?: boolean;
}

interface RestoreResult {
  success: boolean;
  message?: string;
  error?: string;
  summary?: {
    tables_restored: number;
    total_records_restored: number;
    total_errors: number;
  };
  details?: Record<string, { deleted: number; inserted: number; errors: string[] }>;
}

export const useBackups = () => {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch backup history
  const { data: backups, isLoading, refetch } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BackupHistory[];
    },
  });

  // Create new backup
  const createBackup = useMutation({
    mutationFn: async (): Promise<BackupResult> => {
      setIsCreating(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-backup', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as BackupResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح', {
          description: `${data.total_records} سجل من ${data.tables_backed_up?.length} جدول`,
        });
        queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      } else {
        toast.error('فشل في إنشاء النسخة الاحتياطية', {
          description: data.error,
        });
      }
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast.error('فشل في إنشاء النسخة الاحتياطية', {
        description: error.message,
      });
      setIsCreating(false);
    },
  });

  // Download backup file
  const downloadBackup = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('تم تحميل النسخة الاحتياطية');
    } catch (error: unknown) {
      const err = error as Error;
      toast.error('فشل في تحميل النسخة الاحتياطية', {
        description: err.message,
      });
    }
  };

  // Delete backup
  const deleteBackup = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('backups')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      }

      // Delete from history
      const { error } = await supabase
        .from('backup_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف النسخة الاحتياطية');
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: (error: Error) => {
      toast.error('فشل في حذف النسخة الاحتياطية', {
        description: error.message,
      });
    },
  });

  // Restore backup
  const restoreBackup = useMutation({
    mutationFn: async ({ filePath, options }: { filePath: string; options?: RestoreOptions }): Promise<RestoreResult> => {
      setIsRestoring(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          file_path: filePath,
          options: options || { clear_existing: true }
        }
      });

      if (error) throw error;
      return data as RestoreResult;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم استعادة النسخة الاحتياطية بنجاح', {
          description: `تم استعادة ${data.summary?.total_records_restored} سجل من ${data.summary?.tables_restored} جدول`,
        });
      } else {
        toast.warning('تمت الاستعادة مع بعض الأخطاء', {
          description: `${data.summary?.total_errors} أخطاء`,
        });
      }
      setIsRestoring(false);
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('فشل في استعادة النسخة الاحتياطية', {
        description: error.message,
      });
      setIsRestoring(false);
    },
  });

  return {
    backups,
    isLoading,
    isCreating,
    isRestoring,
    createBackup: createBackup.mutate,
    downloadBackup,
    deleteBackup: deleteBackup.mutate,
    restoreBackup: restoreBackup.mutate,
    refetch,
  };
};
