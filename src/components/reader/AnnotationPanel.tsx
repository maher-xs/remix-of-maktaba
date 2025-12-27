import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  MessageSquare, 
  Bookmark, 
  Trash2, 
  Edit3,
  ChevronLeft,
  Search,
  StickyNote,
  BookmarkCheck,
  Clock,
  Check,
  Filter,
  Sparkles
} from 'lucide-react';
import { Annotation, useDeleteAnnotation, useUpdateAnnotation } from '@/hooks/useBookAnnotations';
import { toast } from 'sonner';

interface AnnotationPanelProps {
  annotations: Annotation[];
  bookId: string;
  currentPage: number;
  onClose: () => void;
  onGoToPage: (page: number) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'أصفر', value: '#FFEB3B' },
  { name: 'أخضر', value: '#4CAF50' },
  { name: 'أزرق', value: '#2196F3' },
  { name: 'وردي', value: '#E91E63' },
  { name: 'برتقالي', value: '#FF9800' },
];

type FilterType = 'all' | 'note' | 'bookmark';

const AnnotationPanel = ({ annotations, bookId, currentPage, onClose, onGoToPage }: AnnotationPanelProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const deleteAnnotation = useDeleteAnnotation();
  const updateAnnotation = useUpdateAnnotation();

  const getIcon = (type: string, filled = false) => {
    switch (type) {
      case 'note':
        return <StickyNote className="w-4 h-4" />;
      case 'bookmark':
        return filled ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'note':
        return 'ملاحظة';
      case 'bookmark':
        return 'إشارة مرجعية';
      default:
        return type;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnotation.mutateAsync({ id, bookId });
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      toast.error('فشل الحذف');
    }
  };

  const handleEdit = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditContent(annotation.content || '');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAnnotation.mutateAsync({ id, content: editContent });
      setEditingId(null);
      toast.success('تم الحفظ بنجاح');
    } catch (error) {
      toast.error('فشل الحفظ');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', { 
      day: 'numeric',
      month: 'short',
    });
  };

  // Filter annotations (exclude highlights)
  const filteredAnnotations = annotations.filter(annotation => {
    if (annotation.annotation_type === 'highlight') return false;
    const matchesType = filterType === 'all' || annotation.annotation_type === filterType;
    const matchesSearch = !searchQuery || 
      annotation.content?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const groupedAnnotations = filteredAnnotations.reduce((acc, annotation) => {
    const page = annotation.page_number;
    if (!acc[page]) acc[page] = [];
    acc[page].push(annotation);
    return acc;
  }, {} as Record<number, Annotation[]>);

  const sortedPages = Object.keys(groupedAnnotations).map(Number).sort((a, b) => a - b);

  // Stats
  const stats = {
    total: annotations.filter(a => a.annotation_type !== 'highlight').length,
    notes: annotations.filter(a => a.annotation_type === 'note').length,
    bookmarks: annotations.filter(a => a.annotation_type === 'bookmark').length,
  };

  return (
    <div className="h-full flex flex-col bg-card/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-l from-primary/10 to-transparent border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
            <StickyNote className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">ملاحظاتي</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {stats.total} عنصر
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-border">
        <button
          onClick={() => setFilterType(filterType === 'note' ? 'all' : 'note')}
          className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
            filterType === 'note' 
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <StickyNote className="w-5 h-5 mb-1" />
          <span className="text-xl font-bold">{stats.notes}</span>
          <span className="text-xs">ملاحظة</span>
        </button>
        <button
          onClick={() => setFilterType(filterType === 'bookmark' ? 'all' : 'bookmark')}
          className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
            filterType === 'bookmark' 
              ? 'bg-green-500/20 text-green-600 dark:text-green-400 ring-1 ring-green-500/30' 
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Bookmark className="w-5 h-5 mb-1" />
          <span className="text-xl font-bold">{stats.bookmarks}</span>
          <span className="text-xs">إشارة</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الملاحظات..."
            className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pr-10 h-11 rounded-xl"
          />
        </div>
        {filterType !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterType('all')}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Filter className="w-3 h-3 ml-1" />
            إزالة الفلتر
          </Button>
        )}
      </div>

      {/* Annotations List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {sortedPages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium mb-2 text-foreground">لا توجد ملاحظات بعد</p>
              <p className="text-sm text-muted-foreground">
                حدد نصاً في الكتاب لإضافة<br />تظليل أو ملاحظة
              </p>
            </div>
          ) : (
            sortedPages.map(page => (
              <div key={page} className="space-y-3">
                {/* Page header */}
                <button
                  onClick={() => onGoToPage(page)}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 ${
                    page === currentPage 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>صفحة {page}</span>
                  {page === currentPage && <span className="text-xs opacity-75">• الحالية</span>}
                </button>
                
                {/* Annotations for this page */}
                <div className="space-y-2 mr-2">
                  {groupedAnnotations[page].map(annotation => (
                    <div
                      key={annotation.id}
                      className="bg-muted/50 rounded-xl overflow-hidden border border-border transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                    >
                      {/* Color bar */}
                      <div 
                        className="h-1"
                        style={{ backgroundColor: annotation.color }}
                      />
                      
                      <div className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${annotation.color || '#FFEB3B'}20` }}
                            >
                              {getIcon(annotation.annotation_type || 'note')}
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">{getTypeName(annotation.annotation_type || 'note')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                              <Clock className="w-3 h-3" />
                              {formatDate(annotation.created_at)}
                            </span>
                            {annotation.annotation_type === 'note' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                                onClick={() => handleEdit(annotation)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={() => handleDelete(annotation.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Note content - editing mode */}
                        {editingId === annotation.id ? (
                          <div className="space-y-3 pt-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="bg-background border-border text-foreground text-sm min-h-[100px] rounded-xl"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(annotation.id)}
                                className="bg-primary hover:bg-primary/90 rounded-lg"
                              >
                                <Check className="w-4 h-4 ml-1" />
                                حفظ
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                className="text-muted-foreground rounded-lg"
                              >
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : annotation.content && (
                          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {annotation.content.startsWith('**') ? (
                              <>
                                <p className="font-bold text-primary mb-2">
                                  {annotation.content.split('\n')[0].replace(/\*\*/g, '')}
                                </p>
                                <p className="text-foreground/80">{annotation.content.split('\n').slice(2).join('\n')}</p>
                              </>
                            ) : (
                              <p className="text-foreground/80">{annotation.content}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AnnotationPanel;
