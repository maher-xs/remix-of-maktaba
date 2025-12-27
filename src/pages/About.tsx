import Layout from '@/components/layout/Layout';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import ContentCard from '@/components/ui/content-card';
import { BookOpen, Target, Star, Mail, MapPin, Heart, Sparkles, Users, GraduationCap, Baby, Lightbulb } from 'lucide-react';
import { useGeneralSettings } from '@/hooks/useSiteSettings';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const About = () => {
  const { data: generalSettings } = useGeneralSettings();
  const { data: teamMembers = [] } = useTeamMembers();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="hero-gradient py-12 sm:py-16 lg:py-24">
        <div className="section-container text-center px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary-foreground mb-3 sm:mb-4 animate-fade-up">
            عن {generalSettings.siteName}
          </h1>
          <p className="text-base sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
            من غرفة صغيرة... للعالم العربي كله
          </p>
        </div>
      </section>

      <div className="section-container py-6 sm:py-8 lg:py-12 px-4 sm:px-6">
        <Breadcrumb items={[{ label: 'عن المكتبة' }]} />

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
          
          {/* البداية */}
          <ContentCard
            icon={Sparkles}
            title="البداية"
            animationDelay="0ms"
          >
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                بعيداً عن الوطن، جلس شاب سوري أمام حاسوبه يتابع لحظة تحرير سوريا. فرح قلبه بما رأى، لكن سرعان ما خالطت فرحته مرارة حين تأمل الواقع: جيل كامل نشأ بين الركام، مدارس دُمّرت، مكتبات أُحرقت، وملايين لا يملكون ثمن كتاب واحد.
              </p>
              <p>
                تذكّر كيف كانت الكتب حلماً بعيد المنال خلال سنوات الحرب. كيف كان على الطالب أن يختار بين رغيف خبز وكتاب مدرسي. كيف احترقت المكتبات وضاعت كنوز المعرفة تحت الأنقاض.
              </p>
              <p className="font-medium text-foreground">
                سأل نفسه: "كيف سيبني هذا الجيل مستقبله دون معرفة؟ كيف سنُعيد بناء بلدنا ونحن محرومون من أبسط حق - حق القراءة؟"
              </p>
              <p>
                في تلك اللحظة، قرر أن يكون جزءاً من الحل. قرر أن يبني مكتبة مختلفة - مكتبة في السماء لا تحتاج جدراناً، ولا تستطيع القذائف هدمها، ولا يحتاج أحد لدفع قرش واحد ليدخلها.
              </p>
              <p className="text-primary font-semibold">
                هكذا ولدت "{generalSettings.siteName}" - فضاء مفتوح للجميع، يستطيع فيه أي شخص أن يرفع كتاباً أو يقرأ كتاباً أو يشارك المعرفة مع الآخرين.
              </p>
            </div>
          </ContentCard>

          {/* رسالتنا */}
          <ContentCard
            icon={Target}
            title="رسالتنا"
            animationDelay="100ms"
          >
            <div className="space-y-6">
              <p className="text-lg font-semibold text-primary">
                نؤمن أن المعرفة حق أساسي للجميع، لا امتياز للقلة.
              </p>
              
              <div className="space-y-4">
                <p className="text-muted-foreground font-medium">نعمل من أجل:</p>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <GraduationCap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">الطالب الذي فقد مدرسته ويبحث عن طريق للتعلم</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">المعلم الذي يحتاج مراجع وسط الأنقاض</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Baby className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">الأم التي تريد قراءة قصة لأطفالها قبل النوم</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Lightbulb className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">الشاب الذي يريد بناء مستقبله بعد سنوات من الحرمان</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">كل باحث عن المعرفة، في أي مكان كان</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-muted-foreground leading-relaxed">
                  هدفنا واضح: أن نجعل الكتب العربية في متناول الجميع - <span className="text-primary font-semibold">مجاناً، في أي وقت، ومن أي مكان.</span>
                </p>
                <p className="text-muted-foreground mt-2">
                  لأن سوريا الحرة تستحق جيلاً متعلماً. لأن المعرفة هي الأساس الحقيقي لإعادة البناء.
                </p>
              </div>
            </div>
          </ContentCard>

          {/* رؤيتنا */}
          <ContentCard
            icon={Star}
            title="رؤيتنا"
            animationDelay="200ms"
          >
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                نحلم بأن تصبح "{generalSettings.siteName}" المنصة الأولى للمعرفة العربية - مكتبة رقمية ضخمة يساهم فيها الجميع ويستفيد منها الجميع.
              </p>
              <p>
                نحلم بيوم يجد فيه كل طفل سوري - في أي قرية أو مدينة أو مخيم - آلاف الكتب بين يديه بضغطة زر واحدة، رغم كل ما دُمّر.
              </p>
              <p>
                نحلم بمجتمع من القراء، يتشاركون المعرفة ويبنون المستقبل معاً.
              </p>
            </div>
          </ContentCard>

          {/* هذا ليس مجرد موقع */}
          <ContentCard
            icon={Heart}
            title="هذا ليس مجرد موقع..."
            animationDelay="300ms"
          >
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                إنه جسر يربط ماضينا بمستقبلنا.
              </p>
              <p>
                إنه نور يُضيء طريق المعرفة لجيل يستحق فرصة جديدة.
              </p>
              <p>
                إنه رسالة أمل: أن الدمار لن يكسر إرادتنا في التعلم والنهوض.
              </p>
              <p className="text-lg font-semibold text-primary pt-2">
                بعد كل ما مررنا به، حان وقت التعلّم من جديد.
              </p>
            </div>
          </ContentCard>

          {/* Team Section */}
          {teamMembers.length > 0 && (
            <ContentCard
              icon={Users}
              title="فريقنا"
              animationDelay="350ms"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/20 group-hover:border-primary/40 transition-colors mb-2">
                      <AvatarImage src={member.avatar_url || ''} alt={member.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                        {member.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <h4 className="font-semibold text-foreground text-sm">{member.name}</h4>
                    <p className="text-xs text-primary">{member.role}</p>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          {/* Contact Section */}
          <ContentCard
            icon={Mail}
            title="تواصل معنا"
            animationDelay="400ms"
          >
            <div className="space-y-4">
              {generalSettings.contactEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <a href={`mailto:${generalSettings.contactEmail}`} className="hover:text-primary transition-colors">
                    {generalSettings.contactEmail}
                  </a>
                </div>
              )}
              {generalSettings.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>{generalSettings.address}</span>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Slogan */}
          <div className="text-center py-8 space-y-4">
            <p className="text-xl sm:text-2xl font-bold text-primary">
              {generalSettings.siteName} - المعرفة حق للجميع
            </p>
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              صُنع بكل 
              <Heart className="w-5 h-5 text-destructive fill-destructive" />
              من سوريا
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;
