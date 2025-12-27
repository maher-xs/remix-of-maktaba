import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { Shield } from 'lucide-react';
import { useGeneralSettings } from '@/hooks/useSiteSettings';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

const PrivacyPolicy = () => {
  const { data: generalSettings } = useGeneralSettings();
  
  const sections = [
    {
      title: 'مقدمة',
      content: `نحن في ${generalSettings.siteName} نلتزم بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك الشخصية عند استخدامك لموقعنا وخدماتنا.`
    },
    {
      title: 'المعلومات التي نجمعها',
      items: [
        'معلومات الحساب: الاسم، البريد الإلكتروني عند التسجيل',
        'معلومات الاستخدام: الكتب التي تقرأها، تقدم القراءة، التفضيلات',
        'معلومات تقنية: نوع المتصفح، عنوان IP، نوع الجهاز',
        'ملفات تعريف الارتباط (Cookies) لتحسين تجربة المستخدم'
      ]
    },
    {
      title: 'كيف نستخدم معلوماتك',
      items: [
        'توفير وتحسين خدماتنا',
        'تخصيص تجربة القراءة والتوصيات',
        'التواصل معك بخصوص حسابك',
        'تحليل استخدام الموقع لتحسين الأداء',
        'عرض إعلانات مخصصة عبر Google AdSense'
      ]
    },
    {
      title: 'الإعلانات',
      content: 'نستخدم Google AdSense لعرض الإعلانات على موقعنا. قد تستخدم Google وشركاؤها ملفات تعريف الارتباط لعرض إعلانات بناءً على زياراتك السابقة لموقعنا أو مواقع أخرى.',
      link: { url: 'https://www.google.com/settings/ads', text: 'إعدادات إعلانات Google' }
    },
    {
      title: 'مشاركة المعلومات',
      content: 'لا نبيع أو نشارك معلوماتك الشخصية مع أطراف ثالثة إلا في الحالات التالية:',
      items: [
        'بموافقتك الصريحة',
        'للامتثال للمتطلبات القانونية',
        'لحماية حقوقنا وسلامة المستخدمين',
        'مع مقدمي الخدمات الذين يساعدوننا في تشغيل الموقع'
      ]
    },
    {
      title: 'أمان البيانات',
      content: 'نتخذ إجراءات أمنية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. نستخدم التشفير وبروتوكولات الأمان المعيارية.'
    },
    {
      title: 'حقوقك',
      items: [
        'الوصول إلى بياناتك الشخصية',
        'تصحيح البيانات غير الدقيقة',
        'حذف حسابك وبياناتك',
        'الاعتراض على معالجة بياناتك'
      ]
    }
  ];

  return (
    <Layout>
      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'سياسة الخصوصية' }]} />

        {/* Header */}
        <motion.div 
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              سياسة الخصوصية
            </h1>
            <p className="text-sm text-muted-foreground">
              آخر تحديث: ديسمبر 2025
            </p>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div 
          className="space-y-4 sm:space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {sections.map((section, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="border-muted-foreground/10 hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    {section.title}
                  </h2>
                  
                  {section.content && (
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">
                      {section.content}
                    </p>
                  )}
                  
                  {section.items && (
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm sm:text-base text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-2 flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.link && (
                    <a 
                      href={section.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-sm mt-3"
                    >
                      {section.link.text} ←
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Contact Section */}
          <motion.div variants={itemVariants}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                  التواصل معنا
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  إذا كانت لديك أي أسئلة حول سياسة الخصوصية، يمكنك التواصل معنا عبر{' '}
                  <a href="/contact" className="text-primary hover:underline font-medium">صفحة اتصل بنا</a>
                  {generalSettings.contactEmail && (
                    <> أو عبر البريد الإلكتروني: <span className="text-primary">{generalSettings.contactEmail}</span></>
                  )}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;