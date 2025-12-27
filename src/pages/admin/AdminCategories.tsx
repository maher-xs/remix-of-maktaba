import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminCategories } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AdminDialog, 
  AdminDialogContent, 
  AdminDialogHeader, 
  AdminDialogTitle, 
  AdminDialogTrigger 
} from '@/components/admin/AdminDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Pencil, Trash2, Loader2, FolderTree, Eye,
  Book, Heart, Star, Bookmark, FileText, GraduationCap,
  Lightbulb, Globe, Users, Briefcase, Code, Music,
  Camera, Palette, Coffee, Plane, Home, Car, Leaf,
  Mountain, Sunrise, Moon, Sun, Cloud, Droplet, Flame,
  Zap, Shield, Award, Trophy, Target, Compass, Map,
  Clock, Calendar, Bell, Gift, Crown, Diamond, Gem,
  Sparkles, Wand2, Brain, Atom, Microscope, Telescope,
  Rocket, Cpu, Monitor, Smartphone, Tablet, Tv, Radio,
  Headphones, Speaker, Mic, Video, Film, Clapperboard,
  Gamepad2, Puzzle, Dices, Drama, Theater, Ticket,
  Utensils, ChefHat, Wine, Pizza, IceCream, Cake, Apple,
  Carrot, Wheat, Flower, TreeDeciduous, Trees, Tent, Umbrella,
  Anchor, Ship, Car as CarIcon, Truck, Bus, Train, Bike,
  Footprints, Dog, Cat, Bird, Fish, Bug, Rabbit, Squirrel,
  Baby, User, UserPlus, UserCheck, Building, Building2, Church,
  Castle, School, Library, Store, Factory, Warehouse,
  Hammer, Wrench, Scissors, PenTool, Brush, Eraser, Ruler,
  Scale, Gavel, FileCheck, FileX, FilePlus, FolderOpen,
  Archive, Database, Server, HardDrive, Wifi, Bluetooth,
  Battery, Power, Plug, Lamp, Fan, Thermometer, Stethoscope,
  Pill, Syringe, Activity, HeartPulse, Bone, Eye as EyeIcon,
  Ear, Hand, Footprints as FootprintsIcon, Fingerprint,
  Lock, Unlock, Key, KeyRound, ShieldCheck, ShieldAlert,
  AlertTriangle, AlertCircle, Info, HelpCircle, MessageCircle,
  MessageSquare, Mail, AtSign, Phone, PhoneCall, Send,
  Download, Upload, Share, Link, ExternalLink, Copy,
  ClipboardList, ClipboardCheck, Search, ZoomIn, ZoomOut,
  Filter, SortAsc, SortDesc, LayoutGrid, LayoutList, Columns,
  Rows, Table2, PieChart, BarChart, LineChart, TrendingUp,
  TrendingDown, DollarSign, Euro, PoundSterling, Bitcoin
} from 'lucide-react';
import { useActivityLog } from '@/hooks/useActivityLog';

// Complete icon map with all icons
const ICON_MAP: Record<string, any> = {
  'book': Book,
  'heart': Heart,
  'star': Star,
  'bookmark': Bookmark,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  'lightbulb': Lightbulb,
  'globe': Globe,
  'users': Users,
  'briefcase': Briefcase,
  'code': Code,
  'music': Music,
  'camera': Camera,
  'palette': Palette,
  'coffee': Coffee,
  'plane': Plane,
  'home': Home,
  'car': CarIcon,
  'leaf': Leaf,
  'mountain': Mountain,
  'sunrise': Sunrise,
  'moon': Moon,
  'sun': Sun,
  'cloud': Cloud,
  'droplet': Droplet,
  'flame': Flame,
  'zap': Zap,
  'shield': Shield,
  'award': Award,
  'trophy': Trophy,
  'target': Target,
  'compass': Compass,
  'map': Map,
  'clock': Clock,
  'calendar': Calendar,
  'bell': Bell,
  'gift': Gift,
  'crown': Crown,
  'diamond': Diamond,
  'gem': Gem,
  'sparkles': Sparkles,
  'wand': Wand2,
  'brain': Brain,
  'atom': Atom,
  'microscope': Microscope,
  'telescope': Telescope,
  'rocket': Rocket,
  'cpu': Cpu,
  'monitor': Monitor,
  'smartphone': Smartphone,
  'tablet': Tablet,
  'tv': Tv,
  'radio': Radio,
  'headphones': Headphones,
  'speaker': Speaker,
  'mic': Mic,
  'video': Video,
  'film': Film,
  'clapperboard': Clapperboard,
  'gamepad': Gamepad2,
  'puzzle': Puzzle,
  'dices': Dices,
  'drama': Drama,
  'theater': Theater,
  'ticket': Ticket,
  'utensils': Utensils,
  'chef-hat': ChefHat,
  'wine': Wine,
  'pizza': Pizza,
  'ice-cream': IceCream,
  'cake': Cake,
  'apple': Apple,
  'carrot': Carrot,
  'wheat': Wheat,
  'flower': Flower,
  'tree': TreeDeciduous,
  'trees': Trees,
  'tent': Tent,
  'umbrella': Umbrella,
  'anchor': Anchor,
  'ship': Ship,
  'truck': Truck,
  'bus': Bus,
  'train': Train,
  'bike': Bike,
  'footprints': Footprints,
  'dog': Dog,
  'cat': Cat,
  'bird': Bird,
  'fish': Fish,
  'bug': Bug,
  'rabbit': Rabbit,
  'squirrel': Squirrel,
  'baby': Baby,
  'user': User,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  'building': Building,
  'building2': Building2,
  'church': Church,
  'castle': Castle,
  'school': School,
  'library': Library,
  'store': Store,
  'factory': Factory,
  'warehouse': Warehouse,
  'hammer': Hammer,
  'wrench': Wrench,
  'scissors': Scissors,
  'pen-tool': PenTool,
  'brush': Brush,
  'eraser': Eraser,
  'ruler': Ruler,
  'scale': Scale,
  'gavel': Gavel,
  'file-check': FileCheck,
  'file-x': FileX,
  'file-plus': FilePlus,
  'folder-open': FolderOpen,
  'archive': Archive,
  'database': Database,
  'server': Server,
  'hard-drive': HardDrive,
  'wifi': Wifi,
  'bluetooth': Bluetooth,
  'battery': Battery,
  'power': Power,
  'plug': Plug,
  'lamp': Lamp,
  'fan': Fan,
  'thermometer': Thermometer,
  'stethoscope': Stethoscope,
  'pill': Pill,
  'syringe': Syringe,
  'activity': Activity,
  'heart-pulse': HeartPulse,
  'bone': Bone,
  'eye': EyeIcon,
  'ear': Ear,
  'hand': Hand,
  'fingerprint': Fingerprint,
  'lock': Lock,
  'unlock': Unlock,
  'key': Key,
  'key-round': KeyRound,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'info': Info,
  'help-circle': HelpCircle,
  'message-circle': MessageCircle,
  'message-square': MessageSquare,
  'mail': Mail,
  'at-sign': AtSign,
  'phone': Phone,
  'phone-call': PhoneCall,
  'send': Send,
  'download': Download,
  'upload': Upload,
  'share': Share,
  'link': Link,
  'external-link': ExternalLink,
  'copy': Copy,
  'clipboard-list': ClipboardList,
  'clipboard-check': ClipboardCheck,
  'search': Search,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'filter': Filter,
  'sort-asc': SortAsc,
  'sort-desc': SortDesc,
  'layout-grid': LayoutGrid,
  'layout-list': LayoutList,
  'columns': Columns,
  'rows': Rows,
  'table': Table2,
  'pie-chart': PieChart,
  'bar-chart': BarChart,
  'line-chart': LineChart,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'dollar': DollarSign,
  'euro': Euro,
  'pound': PoundSterling,
  'bitcoin': Bitcoin,
};

const ICON_CATEGORIES = {
  'عام': ['book', 'heart', 'star', 'bookmark', 'file-text', 'graduation-cap', 'lightbulb', 'globe', 'users', 'briefcase'],
  'تقنية': ['code', 'cpu', 'monitor', 'smartphone', 'tablet', 'tv', 'database', 'server', 'hard-drive', 'wifi', 'rocket'],
  'طبيعة': ['leaf', 'mountain', 'sunrise', 'moon', 'sun', 'cloud', 'droplet', 'flame', 'flower', 'tree', 'trees'],
  'طعام': ['utensils', 'chef-hat', 'wine', 'pizza', 'ice-cream', 'cake', 'apple', 'carrot', 'wheat', 'coffee'],
  'حيوانات': ['dog', 'cat', 'bird', 'fish', 'bug', 'rabbit', 'squirrel'],
  'نقل': ['car', 'plane', 'truck', 'bus', 'train', 'bike', 'ship', 'anchor'],
  'مباني': ['home', 'building', 'building2', 'church', 'castle', 'school', 'library', 'store', 'factory'],
  'أدوات': ['hammer', 'wrench', 'scissors', 'pen-tool', 'brush', 'eraser', 'ruler', 'scale'],
  'طب': ['stethoscope', 'pill', 'syringe', 'activity', 'heart-pulse', 'bone', 'thermometer'],
  'ترفيه': ['music', 'camera', 'palette', 'gamepad', 'puzzle', 'drama', 'mask', 'ticket', 'film', 'video'],
  'جوائز': ['award', 'trophy', 'target', 'crown', 'diamond', 'gem', 'sparkles', 'shield', 'medal'],
  'تواصل': ['mail', 'phone', 'message-circle', 'message-square', 'send', 'at-sign', 'link'],
  'رسوم بيانية': ['pie-chart', 'bar-chart', 'line-chart', 'trending-up', 'trending-down'],
  'مالية': ['dollar', 'euro', 'pound', 'bitcoin'],
};

const COLOR_OPTIONS = [
  // Solid colors
  { name: 'أحمر', value: 'bg-red-500', preview: '#ef4444' },
  { name: 'برتقالي', value: 'bg-orange-500', preview: '#f97316' },
  { name: 'أصفر', value: 'bg-yellow-500', preview: '#eab308' },
  { name: 'أخضر', value: 'bg-green-500', preview: '#22c55e' },
  { name: 'أزرق فيروزي', value: 'bg-teal-500', preview: '#14b8a6' },
  { name: 'سماوي', value: 'bg-cyan-500', preview: '#06b6d4' },
  { name: 'أزرق', value: 'bg-blue-500', preview: '#3b82f6' },
  { name: 'نيلي', value: 'bg-indigo-500', preview: '#6366f1' },
  { name: 'بنفسجي', value: 'bg-purple-500', preview: '#a855f7' },
  { name: 'وردي', value: 'bg-pink-500', preview: '#ec4899' },
  { name: 'زمردي', value: 'bg-emerald-500', preview: '#10b981' },
  { name: 'بني', value: 'bg-amber-700', preview: '#b45309' },
  // Gradient colors
  { name: 'غروب', value: 'bg-gradient-to-r from-orange-500 to-pink-500', preview: 'linear-gradient(to right, #f97316, #ec4899)' },
  { name: 'محيط', value: 'bg-gradient-to-r from-cyan-500 to-blue-500', preview: 'linear-gradient(to right, #06b6d4, #3b82f6)' },
  { name: 'غابة', value: 'bg-gradient-to-r from-green-500 to-teal-500', preview: 'linear-gradient(to right, #22c55e, #14b8a6)' },
  { name: 'أرجواني', value: 'bg-gradient-to-r from-purple-500 to-pink-500', preview: 'linear-gradient(to right, #a855f7, #ec4899)' },
  { name: 'ذهبي', value: 'bg-gradient-to-r from-yellow-400 to-orange-500', preview: 'linear-gradient(to right, #facc15, #f97316)' },
  { name: 'فضي', value: 'bg-gradient-to-r from-slate-400 to-slate-600', preview: 'linear-gradient(to right, #94a3b8, #475569)' },
  { name: 'ليلي', value: 'bg-gradient-to-r from-indigo-600 to-purple-600', preview: 'linear-gradient(to right, #4f46e5, #9333ea)' },
  { name: 'نار', value: 'bg-gradient-to-r from-red-500 to-orange-500', preview: 'linear-gradient(to right, #ef4444, #f97316)' },
];

export const AdminCategories = () => {
  const { data: categories, isLoading } = useAdminCategories();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'book',
    color: 'bg-primary',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: 'book',
      color: 'bg-primary',
    });
    setIconSearch('');
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '');
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('يرجى إدخال اسم التصنيف');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('categories').insert({
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
      });

      if (error) throw error;

      logActivity({
        actionType: 'create',
        entityType: 'category',
        entityName: formData.name,
      });

      toast.success('تم إضافة التصنيف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name) {
      toast.error('يرجى إدخال اسم التصنيف');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: formData.name,
          slug: formData.slug || generateSlug(formData.name),
          description: formData.description || null,
          icon: formData.icon,
          color: formData.color,
        })
        .eq('id', selectedCategory.id);

      if (error) throw error;

      logActivity({
        actionType: 'update',
        entityType: 'category',
        entityId: selectedCategory.id,
        entityName: formData.name,
      });

      toast.success('تم تحديث التصنيف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (category: any) => {
    setSelectedCategory(category);
    setTargetCategoryId('');
    setIsDeleteDialogOpen(true);
  };

  const handleMoveAndDelete = async () => {
    if (!selectedCategory) return;

    // Check if category has books
    if (selectedCategory.book_count > 0 && !targetCategoryId) {
      toast.error('يرجى اختيار تصنيف لنقل الكتب إليه');
      return;
    }

    setIsSubmitting(true);
    try {
      // Move books to target category if there are any
      if (selectedCategory.book_count > 0 && targetCategoryId) {
        const { error: moveError } = await supabase
          .from('books')
          .update({ category_id: targetCategoryId })
          .eq('category_id', selectedCategory.id);
        
        if (moveError) throw moveError;
      }

      // Delete the category
      const { error } = await supabase.from('categories').delete().eq('id', selectedCategory.id);
      if (error) throw error;

      logActivity({
        actionType: 'delete',
        entityType: 'category',
        entityId: selectedCategory.id,
        entityName: selectedCategory.name,
        details: selectedCategory.book_count > 0 ? { movedBooksTo: targetCategoryId } : undefined,
      });

      toast.success('تم حذف التصنيف بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      setTargetCategoryId('');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (category: any) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || 'book',
      color: category.color || 'bg-primary',
    });
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = (category: any) => {
    setSelectedCategory(category);
    setIsPreviewDialogOpen(true);
  };

  const IconComponent = ICON_MAP[formData.icon] || Book;

  // Filter icons based on search
  const getFilteredIcons = () => {
    if (!iconSearch) return ICON_CATEGORIES;
    const filtered: Record<string, string[]> = {};
    Object.entries(ICON_CATEGORIES).forEach(([category, icons]) => {
      const matchingIcons = icons.filter(icon => icon.includes(iconSearch.toLowerCase()));
      if (matchingIcons.length > 0) {
        filtered[category] = matchingIcons;
      }
    });
    return filtered;
  };

  const CategoryForm = ({ onSubmit, submitText }: { onSubmit: () => void; submitText: string }) => (
    <div className="space-y-6">
      {/* Live Preview */}
      <div className="p-4 border rounded-xl bg-muted/30">
        <p className="text-sm font-medium mb-3 text-muted-foreground">معاينة مباشرة:</p>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl ${formData.color} flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{formData.name || 'اسم التصنيف'}</h3>
            <p className="text-sm text-muted-foreground">{formData.description || 'وصف التصنيف'}</p>
            <span className="text-xs text-muted-foreground">/{formData.slug || 'slug'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">اسم التصنيف *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
            placeholder="اسم التصنيف"
          />
        </div>

        <div>
          <label className="text-sm font-medium">الرابط (Slug)</label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="سيتم توليده تلقائياً"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">الوصف</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="وصف التصنيف"
          rows={2}
        />
      </div>

      {/* Icon Selection with Tabs */}
      <div>
        <label className="text-sm font-medium mb-2 block">الأيقونة</label>
        <Input
          value={iconSearch}
          onChange={(e) => setIconSearch(e.target.value)}
          placeholder="ابحث عن أيقونة..."
          className="mb-3"
          dir="ltr"
        />
        <ScrollArea className="h-[200px] rounded-lg border p-2">
          <Tabs defaultValue="عام" dir="rtl">
            <TabsList className="flex flex-wrap gap-1 h-auto mb-3">
              {Object.keys(getFilteredIcons()).map(category => (
                <TabsTrigger key={category} value={category} className="text-xs px-2 py-1">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(getFilteredIcons()).map(([category, icons]) => (
              <TabsContent key={category} value={category}>
                <div className="grid grid-cols-8 gap-2">
                  {icons.map((iconName) => {
                    const Icon = ICON_MAP[iconName];
                    if (!Icon) return null;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                          formData.icon === iconName 
                            ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                            : 'border-border hover:border-primary/50 hover:bg-muted'
                        }`}
                        title={iconName}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>
      </div>

      {/* Color Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">اللون</label>
        <div className="grid grid-cols-5 gap-3">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setFormData({ ...formData, color: color.value })}
              className={`group relative rounded-xl overflow-hidden transition-all ${
                formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary scale-105' : 'hover:scale-105'
              }`}
              title={color.name}
            >
              <div 
                className={`w-full h-10 ${color.value}`}
                style={color.preview.startsWith('linear') ? { background: color.preview } : {}}
              />
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                {color.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
        {submitText}
      </Button>
    </div>
  );

  const getCategoryIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName] || Book;
    return <Icon className="w-4 h-4 text-white" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة التصنيفات</h1>
            <p className="text-muted-foreground mt-1">إضافة وتعديل وحذف التصنيفات</p>
          </div>
          <AdminDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <AdminDialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة تصنيف
              </Button>
            </AdminDialogTrigger>
            <AdminDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AdminDialogHeader>
                <AdminDialogTitle>إضافة تصنيف جديد</AdminDialogTitle>
              </AdminDialogHeader>
              <CategoryForm onSubmit={handleAdd} submitText="إضافة التصنيف" />
            </AdminDialogContent>
          </AdminDialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              <span className="font-medium">{categories?.length || 0} تصنيف</span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المعاينة</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الرابط</TableHead>
                    <TableHead>عدد الكتب</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className={`w-10 h-10 rounded-lg ${category.color} flex items-center justify-center`}>
                          {getCategoryIcon(category.icon)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{category.slug}</TableCell>
                      <TableCell>
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                          {category.book_count} كتاب
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openPreviewDialog(category)} title="معاينة">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(category)} title="تعديل">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(category)} title="حذف">
                            <Trash2 className="w-4 h-4 text-destructive" />
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

        {/* Edit Dialog */}
        <AdminDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AdminDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AdminDialogHeader>
              <AdminDialogTitle>تعديل التصنيف</AdminDialogTitle>
            </AdminDialogHeader>
            <CategoryForm onSubmit={handleEdit} submitText="حفظ التغييرات" />
          </AdminDialogContent>
        </AdminDialog>

        {/* Preview Dialog */}
        <AdminDialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <AdminDialogContent className="max-w-md">
            <AdminDialogHeader>
              <AdminDialogTitle>معاينة التصنيف</AdminDialogTitle>
            </AdminDialogHeader>
            {selectedCategory && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border border-slate-600 rounded-xl">
                  <div className={`w-16 h-16 rounded-xl ${selectedCategory.color} flex items-center justify-center shadow-lg`}>
                    {getCategoryIcon(selectedCategory.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{selectedCategory.name}</h3>
                    <p className="text-slate-400">{selectedCategory.description || 'لا يوجد وصف'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-slate-400">الرابط</p>
                    <p className="font-mono">{selectedCategory.slug}</p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-slate-400">عدد الكتب</p>
                    <p className="font-bold">{selectedCategory.book_count}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  هذا التصنيف سيظهر بنفس الشكل في صفحة التصنيفات على الموقع
                </p>
              </div>
            )}
          </AdminDialogContent>
        </AdminDialog>

        {/* Delete Dialog with Move Books Option */}
        <AdminDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AdminDialogContent className="max-w-md">
            <AdminDialogHeader>
              <AdminDialogTitle className="text-red-400">حذف التصنيف</AdminDialogTitle>
            </AdminDialogHeader>
            {selectedCategory && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border border-red-900/30 rounded-xl bg-red-900/10">
                  <div className={`w-12 h-12 rounded-xl ${selectedCategory.color} flex items-center justify-center shadow-lg`}>
                    {getCategoryIcon(selectedCategory.icon)}
                  </div>
                  <div>
                    <h3 className="font-bold">{selectedCategory.name}</h3>
                    <p className="text-sm text-slate-400">{selectedCategory.book_count} كتاب</p>
                  </div>
                </div>

                {selectedCategory.book_count > 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        ⚠️ هذا التصنيف يحتوي على {selectedCategory.book_count} كتاب. يجب نقلها إلى تصنيف آخر قبل الحذف.
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">نقل الكتب إلى:</label>
                      <select
                        value={targetCategoryId}
                        onChange={(e) => setTargetCategoryId(e.target.value)}
                        className="w-full p-2 border border-slate-600 rounded-lg bg-slate-800 text-slate-100"
                      >
                        <option value="">اختر تصنيف...</option>
                        {categories?.filter(c => c.id !== selectedCategory.id).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.book_count} كتاب)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    هذا التصنيف فارغ ويمكن حذفه مباشرة.
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="flex-1 border-slate-600 hover:bg-slate-800"
                    disabled={isSubmitting}
                  >
                    إلغاء
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleMoveAndDelete}
                    className="flex-1"
                    disabled={isSubmitting || (selectedCategory.book_count > 0 && !targetCategoryId)}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {selectedCategory.book_count > 0 ? 'نقل وحذف' : 'حذف التصنيف'}
                  </Button>
                </div>
              </div>
            )}
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;