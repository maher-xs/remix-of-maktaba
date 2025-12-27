import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  book_count: number;
  created_at: string;
  updated_at: string;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('book_count', { ascending: false });
      
      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useCategoryBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as Category;
    },
    enabled: !!slug,
  });
};
