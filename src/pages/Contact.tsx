import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, MapPin, Send, MessageSquare, Phone, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useGeneralSettings } from '@/hooks/useSiteSettings';
import { motion } from 'framer-motion';
import { useContactRateLimit } from '@/hooks/useContactRateLimit';
import { Alert, AlertDescription } from '@/components/ui/alert';
const contactSchema = z.object({
  name: z.string().trim().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100, 'الاسم طويل جداً'),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح').max(255, 'البريد الإلكتروني طويل جداً'),
  subject: z.string().trim().min(5, 'الموضوع يجب أن يكون 5 أحرف على الأقل').max(200, 'الموضوع طويل جداً'),
  message: z.string().trim().min(20, 'الرسالة يجب أن تكون 20 حرفاً على الأقل').max(2000, 'الرسالة طويلة جداً'),
});

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

const Contact = () => {
  const { data: generalSettings } = useGeneralSettings();
  const { checkRateLimit, recordMessage, getRemainingTime } = useContactRateLimit({
    maxMessages: 3,
    windowMinutes: 60,
  });
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ blocked: boolean; remainingTime: number; remainingMessages: number }>({
    blocked: false,
    remainingTime: 0,
    remainingMessages: 3,
  });

  // Check rate limit on mount and periodically
  useEffect(() => {
    const checkLimit = () => {
      const result = checkRateLimit();
      setRateLimitInfo({
        blocked: !result.allowed,
        remainingTime: result.remainingTime || 0,
        remainingMessages: result.remainingMessages || 0,
      });
    };

    checkLimit();
    const interval = setInterval(checkLimit, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkRateLimit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Check rate limit first
    const limitResult = checkRateLimit();
    if (!limitResult.allowed) {
      toast.error(`لقد تجاوزت الحد المسموح. يرجى الانتظار ${limitResult.remainingTime} دقيقة.`);
      setRateLimitInfo({
        blocked: true,
        remainingTime: limitResult.remainingTime || 0,
        remainingMessages: 0,
      });
      return;
    }

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject,
        message: result.data.message,
      });

      if (error) throw error;

      // Record the message for rate limiting
      recordMessage();
      
      // Update rate limit info
      const newLimitResult = checkRateLimit();
      setRateLimitInfo({
        blocked: !newLimitResult.allowed,
        remainingTime: newLimitResult.remainingTime || 0,
        remainingMessages: newLimitResult.remainingMessages || 0,
      });

      toast.success('تم إرسال رسالتك بنجاح! سنرد عليك في أقرب وقت.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: 'البريد الإلكتروني',
      value: generalSettings.contactEmail,
      href: generalSettings.contactEmail ? `mailto:${generalSettings.contactEmail}` : undefined,
      show: !!generalSettings.contactEmail
    },
    {
      icon: Phone,
      title: 'الهاتف',
      value: generalSettings.contactPhone,
      href: generalSettings.contactPhone ? `tel:${generalSettings.contactPhone}` : undefined,
      show: !!generalSettings.contactPhone,
      dir: 'ltr'
    },
    {
      icon: MapPin,
      title: 'الموقع',
      value: generalSettings.address,
      show: !!generalSettings.address
    }
  ];

  return (
    <Layout>
      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'اتصل بنا' }]} />

        {/* Header */}
        <motion.div 
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              اتصل بنا
            </h1>
            <p className="text-sm text-muted-foreground">
              نحن هنا للإجابة على استفساراتك
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Contact Info */}
          <div className="space-y-4">
            {contactInfo.filter(info => info.show).map((info, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="border-muted-foreground/10 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-foreground text-sm sm:text-base">{info.title}</h3>
                        {info.href ? (
                          <a 
                            href={info.href} 
                            className="text-primary hover:underline text-sm truncate block"
                            dir={info.dir}
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-muted-foreground text-sm truncate">{info.value}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            <motion.div variants={itemVariants}>
              <Card className="border-muted-foreground/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm sm:text-base">ساعات الرد</h3>
                      <p className="text-muted-foreground text-sm">
                        24-48 ساعة عمل
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div className="lg:col-span-2" variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  أرسل لنا رسالة
                </h2>

                {/* Rate Limit Warning */}
                {rateLimitInfo.blocked && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      لقد تجاوزت الحد المسموح للرسائل. يرجى الانتظار {rateLimitInfo.remainingTime} دقيقة قبل إرسال رسالة جديدة.
                    </AlertDescription>
                  </Alert>
                )}

                {!rateLimitInfo.blocked && rateLimitInfo.remainingMessages < 3 && (
                  <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                      متبقي لك {rateLimitInfo.remainingMessages} رسالة/رسائل هذه الساعة.
                    </AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                        الاسم الكامل *
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="أدخل اسمك"
                        className={errors.name ? 'border-destructive' : ''}
                      />
                      {errors.name && (
                        <p className="text-destructive text-xs sm:text-sm mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                        البريد الإلكتروني *
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="example@email.com"
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-destructive text-xs sm:text-sm mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                      الموضوع *
                    </label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="موضوع الرسالة"
                      className={errors.subject ? 'border-destructive' : ''}
                    />
                    {errors.subject && (
                      <p className="text-destructive text-xs sm:text-sm mt-1">{errors.subject}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      الرسالة *
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="اكتب رسالتك هنا..."
                      rows={5}
                      className={errors.message ? 'border-destructive' : ''}
                    />
                    {errors.message && (
                      <p className="text-destructive text-xs sm:text-sm mt-1">{errors.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto gap-2"
                    disabled={isSubmitting || rateLimitInfo.blocked}
                  >
                    {isSubmitting ? (
                      <>جاري الإرسال...</>
                    ) : rateLimitInfo.blocked ? (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        انتظر {rateLimitInfo.remainingTime} دقيقة
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال الرسالة
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Contact;