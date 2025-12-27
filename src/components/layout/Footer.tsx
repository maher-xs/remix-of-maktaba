import { Link } from "react-router-dom";
import { Mail, MapPin, Heart, Facebook, Twitter, Instagram, Phone } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import Logo from "@/components/ui/Logo";
import { useFooterSettings, useSocialLinks, useGeneralSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { data: categories } = useCategories();
  const { data: footerSettings } = useFooterSettings();
  const { data: socialLinks } = useSocialLinks();
  const { data: generalSettings } = useGeneralSettings();
  
  // Get top 4 categories with the most books
  const displayCategories = categories
    ?.slice()
    .sort((a, b) => (b.book_count || 0) - (a.book_count || 0))
    .slice(0, 4) || [];

  // إذا كان الفوتر معطل، لا نعرض شيء
  if (!footerSettings.showFooter) {
    return null;
  }

  // التحقق من وجود روابط تواصل
  const hasSocialLinks = socialLinks.facebook || socialLinks.twitter || socialLinks.instagram || socialLinks.youtube || socialLinks.telegram;

  return (
    <footer className="bg-card border-t border-border">
      <div className="section-container py-8 sm:py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <Logo size="md" showText={true} />
            </Link>
            <p className="text-muted-foreground leading-relaxed-ar max-w-md mb-6">
              {generalSettings.siteDescription || 'من غرفة صغيرة... للعالم العربي كله. مكتبة رقمية عربية مجانية توفر آلاف الكتب لكل من حرمته الحرب أو الفقر من المعرفة.'}
            </p>
            
            {/* معلومات التواصل */}
            {footerSettings.showContactInfo && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                {generalSettings.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{generalSettings.contactEmail}</span>
                  </div>
                )}
                {generalSettings.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{generalSettings.contactPhone}</span>
                  </div>
                )}
                {generalSettings.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{generalSettings.address}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* روابط التواصل الاجتماعي */}
            {footerSettings.showSocialLinks && hasSocialLinks && (
              <div className="flex items-center gap-3">
                {socialLinks.facebook && (
                  <a 
                    href={socialLinks.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a 
                    href={socialLinks.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a 
                    href={socialLinks.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a 
                    href={socialLinks.youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
                {socialLinks.telegram && (
                  <a 
                    href={socialLinks.telegram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          {footerSettings.showQuickLinks && (
            <div>
              <h3 className="font-bold text-foreground mb-4">روابط سريعة</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                    الرئيسية
                  </Link>
                </li>
                <li>
                  <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors">
                    التصنيفات
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                    عن المكتبة
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                    اتصل بنا
                  </Link>
                </li>
                <li>
                  <Link to="/donate" className="text-muted-foreground hover:text-primary transition-colors">
                    ادعم المكتبة
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Categories - Dynamic from Database */}
          <div>
            <h3 className="font-bold text-foreground mb-4">التصنيفات</h3>
            <ul className="space-y-3">
              {displayCategories.map((category) => (
                <li key={category.id}>
                  <Link 
                    to={`/categories/${category.slug}`} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-foreground mb-4">القانونية</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                  سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                  شروط الاستخدام
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-muted-foreground hover:text-primary transition-colors">
                  خريطة الموقع
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{footerSettings.footerText}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            صُنع بكل <Heart className="w-4 h-4 text-destructive fill-destructive" /> من سوريا
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
