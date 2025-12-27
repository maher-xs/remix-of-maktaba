import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Heart, Gift, BookOpen, Users, Star, Coffee, Sparkles, Server, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/ui/breadcrumb-nav";
import { motion } from "framer-motion";
import { useGeneralSettings } from "@/hooks/useSiteSettings";

const PAYPAL_DONATE_URL = "https://paypal.me/YOURPAYPAL"; // استبدل برابط PayPal الخاص بك

const donationAmounts = [
  { amount: 5, label: "$5", icon: Coffee, description: "كوب قهوة" },
  { amount: 10, label: "$10", icon: BookOpen, description: "كتاب جديد" },
  { amount: 25, label: "$25", icon: Gift, description: "هدية قيمة" },
  { amount: 50, label: "$50", icon: Star, description: "دعم مميز" },
];

const whyDonateItems = [
  {
    icon: Server,
    title: "تشغيل الخوادم",
    description: "تبرعك يساعد في دفع تكاليف الخوادم التي تستضيف المكتبة",
  },
  {
    icon: Database,
    title: "حفظ البيانات والكتب",
    description: "نحتاج مساحة تخزين لحفظ آلاف الكتب وبياناتكم",
  },
  {
    icon: Shield,
    title: "استمرار الخدمة",
    description: "دعمكم يضمن بقاء المكتبة متاحة للجميع مجاناً",
  },
  {
    icon: Sparkles,
    title: "تطوير المنصة",
    description: "نعمل على إضافة مميزات جديدة وتحسين التجربة",
  },
];

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

export default function Donate() {
  const { data: generalSettings } = useGeneralSettings();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  // القيمة المعروضة في الحقل
  const displayAmount = customAmount || (selectedAmount ? String(selectedAmount) : "");

  const handleDonate = () => {
    const amount = customAmount || selectedAmount;
    if (amount) {
      window.open(`${PAYPAL_DONATE_URL}/${amount}USD`, "_blank");
    } else {
      window.open(PAYPAL_DONATE_URL, "_blank");
    }
  };

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(null);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>ادعم المكتبة | {generalSettings.siteName}</title>
        <meta
          name="description"
          content="ساهم في دعم مكتبة بيتنا لنشر المعرفة والكتب العربية للجميع. تبرعك يصنع الفرق."
        />
      </Helmet>

      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'ادعم المكتبة' }]} />

        {/* Header */}
        <motion.div 
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              ادعم {generalSettings.siteName}
            </h1>
            <p className="text-sm text-muted-foreground">
              تبرعك يساعدنا على الاستمرار في نشر المعرفة
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Donation Form - Main Card */}
          <motion.div className="lg:col-span-2 order-1" variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  اختر مبلغ التبرع
                </h2>

                {/* Preset Amounts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {donationAmounts.map(({ amount, label, icon: Icon, description }) => (
                    <button
                      key={amount}
                      onClick={() => handleAmountSelect(amount)}
                      className={`group relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${
                        selectedAmount === amount
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        <Icon
                          className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${
                            selectedAmount === amount
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-primary"
                          }`}
                        />
                        <span className="text-lg sm:text-2xl font-bold">{label}</span>
                        <span className="text-xs text-muted-foreground">{description}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="mb-6">
                  <label htmlFor="customAmount" className="block text-sm font-medium text-foreground mb-2">
                    أو أدخل مبلغاً مخصصاً
                  </label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">
                      $
                    </span>
                    <Input
                      id="customAmount"
                      type="number"
                      min="1"
                      placeholder="مبلغ آخر"
                      value={displayAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="pr-10 text-lg h-14 text-center font-bold"
                    />
                  </div>
                </div>

                {/* Donate Button */}
                <Button
                  onClick={handleDonate}
                  size="lg"
                  className="w-full gap-2 h-14 text-lg font-bold"
                  disabled={!displayAmount}
                >
                  <Heart className="w-5 h-5" />
                  تبرع الآن عبر PayPal
                  {displayAmount && <span className="mr-1">(${displayAmount})</span>}
                </Button>

                <p className="text-sm text-muted-foreground mt-4 text-center">
                  سيتم توجيهك إلى PayPal لإتمام التبرع بأمان
                </p>
              </CardContent>
            </Card>

            {/* Mission Statement */}
            <motion.div variants={itemVariants} className="mt-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4 sm:p-6">
                  <p className="text-muted-foreground leading-relaxed text-center">
                    <span className="font-bold text-foreground">{generalSettings.siteName}</span> مشروع غير ربحي يهدف لنشر المعرفة والكتب العربية للجميع،
                    خاصة لمن حُرموا منها بسبب الحروب والظروف الصعبة. 
                    <span className="text-primary font-medium"> كل تبرع مهما كان صغيراً يساهم في تحقيق هذه الرسالة.</span>
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Why Donate - Side Cards */}
          <div className="space-y-4 order-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              لماذا ندعم المكتبة؟
            </h3>
            
            {whyDonateItems.map((item, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="border-muted-foreground/10 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Thank You Card */}
            <motion.div variants={itemVariants}>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h4 className="font-bold text-foreground text-sm mb-1">شكراً لدعمكم</h4>
                  <p className="text-muted-foreground text-xs">
                    جزاكم الله خيراً على مساهمتكم
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
