import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <motion.div 
      className="flex flex-col items-center gap-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <motion.div
          className="absolute -inset-1 rounded-2xl border-2 border-primary/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-foreground font-semibold">جاري التحميل</p>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  </div>
);

export const BookCardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border/50 overflow-hidden h-full flex flex-col">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="p-4 space-y-3 flex-grow">
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <div className="flex justify-between pt-3 border-t border-border/40 mt-auto">
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="h-7 w-14 rounded-lg" />
      </div>
    </div>
  </div>
);

export const CategoryCardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border/50 p-6 flex flex-col items-center">
    <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
    <Skeleton className="h-5 w-24 mb-2" />
    <Skeleton className="h-4 w-16" />
  </div>
);

export const HeroSkeleton = () => (
  <div className="py-16 lg:py-20 bg-muted/30">
    <div className="section-container text-center space-y-8">
      <Skeleton className="h-16 lg:h-20 w-48 mx-auto rounded-2xl" />
      <Skeleton className="h-6 w-72 mx-auto" />
      <Skeleton className="h-16 w-full max-w-xl mx-auto rounded-2xl" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-14 w-40 rounded-2xl" />
        <Skeleton className="h-14 w-36 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const BookDetailsSkeleton = () => (
  <div className="section-container py-8">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Book Cover */}
      <div className="lg:col-span-1">
        <Skeleton className="aspect-[3/4] w-full max-w-sm mx-auto rounded-2xl" />
      </div>
      {/* Book Info */}
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    <Skeleton className="h-12 w-full rounded-xl" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full rounded-xl" />
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-6 max-w-lg">
    <div className="space-y-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
    <Skeleton className="h-12 w-full rounded-xl" />
  </div>
);
