import { Helmet } from 'react-helmet-async';

interface BookJsonLdProps {
  book: {
    id: string;
    title: string;
    author: string;
    description?: string | null;
    cover_url?: string | null;
    isbn?: string | null;
    publish_year?: number | null;
    pages?: number | null;
    publisher?: string | null;
    language?: string | null;
    category?: {
      name: string;
    } | null;
  };
  rating?: {
    average: number;
    count: number;
  };
}

const BookJsonLd = ({ book, rating }: BookJsonLdProps) => {
  const siteUrl = 'https://maktabati.app';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${siteUrl}/book/${book.id}`,
    name: book.title,
    author: {
      '@type': 'Person',
      name: book.author,
    },
    description: book.description || `كتاب ${book.title} للمؤلف ${book.author}`,
    image: book.cover_url || `${siteUrl}/placeholder.svg`,
    url: `${siteUrl}/book/${book.id}`,
    inLanguage: book.language === 'ar' ? 'ar-SA' : book.language || 'ar-SA',
    ...(book.isbn && { isbn: book.isbn }),
    ...(book.pages && { numberOfPages: book.pages }),
    ...(book.publish_year && { 
      datePublished: `${book.publish_year}-01-01`,
      copyrightYear: book.publish_year,
    }),
    ...(book.publisher && {
      publisher: {
        '@type': 'Organization',
        name: book.publisher,
      },
    }),
    ...(book.category?.name && {
      genre: book.category.name,
    }),
    ...(rating && rating.count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating.average.toFixed(1),
        bestRating: '5',
        worstRating: '1',
        ratingCount: rating.count,
      },
    }),
    // Additional properties for better SEO
    bookFormat: 'EBook',
    accessMode: ['textual', 'visual'],
    accessibilityFeature: ['readingOrder', 'structuralNavigation'],
    accessibilityHazard: 'noFlashingHazard',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  // BreadcrumbList for navigation
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'التصنيفات',
        item: `${siteUrl}/categories`,
      },
      ...(book.category?.name ? [{
        '@type': 'ListItem',
        position: 3,
        name: book.category.name,
        item: `${siteUrl}/categories/${encodeURIComponent(book.category.name)}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: book.category?.name ? 4 : 3,
        name: book.title,
        item: `${siteUrl}/book/${book.id}`,
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </script>
    </Helmet>
  );
};

export default BookJsonLd;
