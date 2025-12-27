import { Helmet } from 'react-helmet-async';

interface OrganizationJsonLdProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
}

const OrganizationJsonLd = ({ 
  name = 'مكتبة',
  description = 'مكتبتك الرقمية العربية المجانية - من غرفة صغيرة للعالم العربي كله',
  url = 'https://maktaba.cc',
  logo = 'https://maktaba.cc/icons/icon-512x512.png'
}: OrganizationJsonLdProps) => {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    description,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    inLanguage: 'ar-SA',
  };

  const libraryJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Library',
    name,
    description,
    url,
    image: logo,
    priceRange: 'مجاني',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteJsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(libraryJsonLd)}
      </script>
    </Helmet>
  );
};

export default OrganizationJsonLd;
