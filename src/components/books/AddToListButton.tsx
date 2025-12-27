import { useState } from 'react';
import { Plus, List, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useReadingLists } from '@/hooks/useReadingLists';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AddToListButtonProps {
  bookId: string;
  variant?: 'icon' | 'button';
}

const AddToListButton = ({ bookId, variant = 'icon' }: AddToListButtonProps) => {
  const { user } = useAuth();
  const { lists, isLoading, createList, addBookToList, isCreating } = useReadingLists();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  if (!user) {
    return null;
  }

  const handleAddToList = (listId: string) => {
    addBookToList({ listId, bookId });
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error('يرجى إدخال اسم القائمة');
      return;
    }
    
    createList({
      name: newListName.trim(),
      description: newListDescription.trim() || undefined,
      is_public: isPublic,
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewListName('');
        setNewListDescription('');
        setIsPublic(false);
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'icon' ? (
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border">
              <List className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="outline" className="h-10 sm:h-12 px-3 sm:px-4 rounded-xl border-2 text-xs sm:text-base gap-1 sm:gap-2">
              <List className="w-4 h-4 sm:w-5 sm:h-5" />
              إضافة لقائمة
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>إضافة إلى قائمة القراءة</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isLoading ? (
            <div className="p-2 text-center text-muted-foreground text-sm">
              جاري التحميل...
            </div>
          ) : lists.length === 0 ? (
            <div className="p-2 text-center text-muted-foreground text-sm">
              لا توجد قوائم
            </div>
          ) : (
            lists.map((list) => (
              <DropdownMenuItem
                key={list.id}
                onClick={() => handleAddToList(list.id)}
                className="cursor-pointer"
              >
                <List className="w-4 h-4 ml-2" />
                <span className="flex-1">{list.name}</span>
                <span className="text-xs text-muted-foreground">
                  {list.book_count} كتاب
                </span>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="cursor-pointer"
          >
            <Plus className="w-4 h-4 ml-2" />
            إنشاء قائمة جديدة
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إنشاء قائمة قراءة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">اسم القائمة</Label>
              <Input
                id="list-name"
                placeholder="مثال: كتب للقراءة لاحقاً"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">الوصف (اختياري)</Label>
              <Textarea
                id="list-description"
                placeholder="وصف قصير للقائمة..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is-public">قائمة عامة</Label>
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPublic 
                ? 'سيتمكن الجميع من رؤية هذه القائمة' 
                : 'أنت فقط من يمكنه رؤية هذه القائمة'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateList} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء القائمة'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddToListButton;
