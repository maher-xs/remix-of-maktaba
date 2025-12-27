import { Helmet } from 'react-helmet-async';

interface CategoryJsonLdProps {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    book_count: number;
  };
  books?: Array<{
    id: string;
    title: string;
    author: string;
    cover_url?: string | null;
  }>;
}

const CategoryJsonLd = ({ category, books }: CategoryJsonLdProps) => {
  const siteUrl = 'https://maktabati.app';

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/categories/${category.slug}`,
    name: `كتب ${category.name}`,
    description: category.description || `تصفح مجموعة كتب ${category.name} - ${category.book_count} كتاب متاح للقراءة والتحميل مجاناً`,
    url: `${siteUrl}/categories/${category.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: category.book_count,
      itemListElement: books?.slice(0, 10).map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Book',
          '@id': `${siteUrl}/book/${book.id}`,
          name: book.title,
          author: {
            '@type': 'Person',
            name: book.author,
          },
          image: book.cover_url || `${siteUrl}/placeholder.svg`,
          url: `${siteUrl}/book/${book.id}`,
        },
      })) || [],
    },
  };

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
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${siteUrl}/categories/${category.slug}`,
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(collectionJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbJsonLd)}
      </script>
    </Helmet>
  );
};

export default CategoryJsonLd;
