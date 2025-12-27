import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { FileText } from 'lucide-react';
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

const TermsOfService = () => {
  const { data: generalSettings } = useGeneralSettings();
  
  const sections = [
    {
      title: 'قبول الشروط',
      content: `باستخدامك لموقع ${generalSettings.siteName}، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الموقع.`
    },
    {
      title: 'وصف الخدمة',
      content: `${generalSettings.siteName} هي منصة رقمية مجانية توفر الوصول إلى مجموعة من الكتب العربية. نسعى لنشر المعرفة وتوفير المحتوى التعليمي والثقافي للجميع.`
    },
    {
      title: 'حسابات المستخدمين',
      items: [
        'يجب أن تكون المعلومات المقدمة عند التسجيل دقيقة وكاملة',
        'أنت مسؤول عن الحفاظ على سرية كلمة المرور الخاصة بك',
        'أنت مسؤول عن جميع الأنشطة التي تحدث تحت حسابك',
        'يجب إبلاغنا فوراً عن أي استخدام غير مصرح به لحسابك'
      ]
    },
    {
      title: 'المحتوى المسموح',
      content: 'عند رفع أو مشاركة محتوى على الموقع، فإنك تضمن أن:',
      items: [
        'لديك الحق في مشاركة هذا المحتوى',
        'المحتوى لا ينتهك حقوق الملكية الفكرية لأي طرف',
        'المحتوى لا يحتوي على مواد غير قانونية أو مسيئة',
        'المحتوى مناسب للجمهور العام'
      ]
    },
    {
      title: 'حقوق الملكية الفكرية',
      content: 'نحترم حقوق الملكية الفكرية ونتوقع من مستخدمينا ذلك. الكتب المتاحة على الموقع إما في الملك العام أو مرخصة للنشر المجاني أو مرفوعة بموافقة أصحاب الحقوق. إذا كنت تعتقد أن محتوى ما ينتهك حقوقك، يرجى التواصل معنا لإزالته فوراً.'
    },
    {
      title: 'الاستخدام المحظور',
      content: 'يُحظر عليك:',
      items: [
        'استخدام الموقع لأغراض غير قانونية',
        'محاولة الوصول غير المصرح به إلى أنظمتنا',
        'نشر فيروسات أو برامج ضارة',
        'انتحال شخصية الآخرين',
        'إزالة أو تعديل إشعارات حقوق النشر',
        'استخدام الروبوتات لجمع البيانات دون إذن'
      ]
    },
    {
      title: 'الإعلانات',
      content: 'قد يحتوي الموقع على إعلانات من أطراف ثالثة. هذه الإعلانات ضرورية لتغطية تكاليف تشغيل الموقع وتقديم الخدمة مجاناً. نحن غير مسؤولين عن محتوى الإعلانات أو المنتجات والخدمات المعلن عنها.'
    },
    {
      title: 'إخلاء المسؤولية',
      content: 'الخدمة مقدمة "كما هي" دون أي ضمانات صريحة أو ضمنية. لا نضمن أن الخدمة ستكون متاحة دائماً أو خالية من الأخطاء. لسنا مسؤولين عن أي أضرار ناتجة عن استخدام الموقع.'
    },
    {
      title: 'تعديل الشروط',
      content: 'نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم نشر التغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث". استمرارك في استخدام الموقع بعد التغييرات يعني موافقتك على الشروط المعدلة.'
    }
  ];

  return (
    <Layout>
      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'شروط الاستخدام' }]} />

        {/* Header */}
        <motion.div 
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              شروط الاستخدام
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
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Contact Section */}
          <motion.div variants={itemVariants}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                  التواصل
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  لأي استفسارات حول شروط الاستخدام، يمكنك التواصل معنا عبر{' '}
                  <a href="/contact" className="text-primary hover:underline font-medium">صفحة اتصل بنا</a>.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default TermsOfService;