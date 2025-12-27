import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  X, 
  StickyNote,
  Check,
  Sparkles
} from 'lucide-react';
import { useAddAnnotation } from '@/hooks/useBookAnnotations';
import { toast } from 'sonner';

interface QuickNoteModalProps {
  bookId: string;
  pageNumber: number;
  onClose: () => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'وردي', value: 'hsl(350, 65%, 45%)' },
  { name: 'أزرق داكن', value: 'hsl(220, 50%, 35%)' },
  { name: 'أزرق سماوي', value: 'hsl(200, 80%, 55%)' },
  { name: 'أخضر زيتوني', value: 'hsl(80, 45%, 35%)' },
  { name: 'ذهبي', value: 'hsl(42, 85%, 55%)' },
];

const QuickNoteModal = ({ bookId, pageNumber, onClose }: QuickNoteModalProps) => {
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const addAnnotation = useAddAnnotation();

  const handleSave = async () => {
    if (!noteContent.trim()) {
      toast.error('اكتب محتوى الملاحظة');
      return;
    }

    try {
      const fullContent = noteTitle.trim() 
        ? `**${noteTitle.trim()}**\n\n${noteContent.trim()}`
        : noteContent.trim();

      await addAnnotation.mutateAsync({
        book_id: bookId,
        page_number: pageNumber,
        annotation_type: 'note',
        content: fullContent,
        color: selectedColor,
      });
      toast.success('تمت إضافة الملاحظة بنجاح');
      onClose();
    } catch (error) {
      toast.error('فشل إضافة الملاحظة');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-l from-primary/10 to-transparent border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <StickyNote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">ملاحظة جديدة</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                صفحة {pageNumber}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">العنوان (اختياري)</label>
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="عنوان الملاحظة..."
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-12 rounded-xl"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">المحتوى</label>
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary min-h-[140px] resize-none rounded-xl"
              autoFocus
            />
          </div>

          {/* Color selection */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">اللون:</span>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-9 h-9 rounded-full transition-all duration-200 ${
                    selectedColor === color.value 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110' 
                      : 'hover:scale-110 hover:shadow-lg'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border bg-muted/30">
          <Button
            onClick={handleSave}
            disabled={addAnnotation.isPending || !noteContent.trim()}
            className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20"
          >
            <Check className="w-4 h-4 ml-2" />
            حفظ الملاحظة
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 px-6 text-muted-foreground hover:text-foreground border-border rounded-xl"
          >
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickNoteModal;
