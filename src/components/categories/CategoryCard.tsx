import { Link } from 'react-router-dom';
import { Category } from '@/hooks/useCategories';
import { ArrowLeft } from 'lucide-react';
import { CATEGORY_ICON_MAP, getGradientStyle } from '@/lib/categoryIcons';

interface CategoryCardProps {
  category: Category;
  size?: 'default' | 'large';
}

const CategoryCard = ({ category, size = 'default' }: CategoryCardProps) => {
  const IconComponent = CATEGORY_ICON_MAP[category.icon] || CATEGORY_ICON_MAP['book'];
  const gradientStyle = getGradientStyle(category.icon, category.color);

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="category-card group flex flex-col items-center text-center w-full max-w-full overflow-hidden"
    >
      {/* Icon */}
      <div 
        className={`text-white rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 shadow-lg flex-shrink-0 ${
          size === 'large' ? 'w-20 h-20' : 'w-14 h-14'
        }`}
        style={{ background: gradientStyle }}
      >
        <IconComponent className={size === 'large' ? 'w-10 h-10' : 'w-7 h-7'} />
      </div>

      {/* Name */}
      <h3 className={`font-bold text-foreground mb-2 group-hover:text-primary transition-colors w-full truncate px-2 ${
        size === 'large' ? 'text-xl' : 'text-base'
      }`}>
        {category.name}
      </h3>

      {/* Description - Only on large */}
      {size === 'large' && category.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {category.description}
        </p>
      )}

      {/* Books Count */}
      <p className="text-sm text-muted-foreground">
        {category.book_count.toLocaleString('ar-SA')} كتاب
      </p>

      {/* Explore Link - Only on large */}
      {size === 'large' && (
        <div className="flex items-center gap-1 mt-4 text-primary font-medium text-sm group-hover:gap-2 transition-all">
          <span>استكشف</span>
          <ArrowLeft className="w-4 h-4 rtl-flip" />
        </div>
      )}
    </Link>
  );
};

export default CategoryCard;