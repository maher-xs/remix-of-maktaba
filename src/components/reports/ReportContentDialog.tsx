import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useContentReport, ReportReason, ContentType } from '@/hooks/useContentReport';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Flag, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
  contentTitle?: string;
}

const reportReasons: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'محتوى غير لائق' },
  { value: 'spam', label: 'محتوى مزعج (سبام)' },
  { value: 'copyright', label: 'انتهاك حقوق النشر' },
  { value: 'harassment', label: 'تحرش أو تنمر' },
  { value: 'other', label: 'سبب آخر' },
];

const contentTypeLabels: Record<ContentType, string> = {
  book: 'الكتاب',
  review: 'التقييم',
  profile: 'الملف الشخصي',
  reading_list: 'قائمة القراءة',
  comment: 'التعليق',
  discussion: 'المناقشة',
  reply: 'الرد',
};

export function ReportContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
  contentTitle,
}: ReportContentDialogProps) {
  const { user } = useAuth();
  const { submitReport, isReporting } = useContentReport();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول للإبلاغ');
      return;
    }

    if (!reason) {
      toast.error('يرجى اختيار سبب البلاغ');
      return;
    }

    const success = await submitReport({
      contentType,
      contentId,
      reason,
      description: description.trim() || undefined,
    });

    if (success) {
      onOpenChange(false);
      setReason('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-4 gap-3">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Flag className="w-4 h-4 text-destructive" />
            الإبلاغ عن {contentTypeLabels[contentType]}
          </DialogTitle>
          {contentTitle && (
            <DialogDescription className="text-xs">
              {contentTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        {!user ? (
          <div className="flex flex-col items-center py-4 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">يجب تسجيل الدخول للإبلاغ</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">سبب البلاغ</Label>
              <RadioGroup
                value={reason}
                onValueChange={(value) => setReason(value as ReportReason)}
                className="space-y-1"
              >
                {reportReasons.map((item) => (
                  <div
                    key={item.value}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors text-sm
                      ${reason === item.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    onClick={() => setReason(item.value)}
                  >
                    <RadioGroupItem value={item.value} id={item.value} className="h-3.5 w-3.5" />
                    <Label htmlFor={item.value} className="cursor-pointer text-sm font-normal flex-1">
                      {item.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm">تفاصيل إضافية (اختياري)</Label>
              <Textarea
                id="description"
                placeholder="اشرح المشكلة..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
                maxLength={500}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          {user && (
            <Button 
              onClick={handleSubmit} 
              disabled={!reason || isReporting}
              variant="destructive"
              size="sm"
            >
              {isReporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />
                  إرسال...
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5 ml-1.5" />
                  إرسال البلاغ
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
