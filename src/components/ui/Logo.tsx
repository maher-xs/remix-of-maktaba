import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandingSettings } from "@/hooks/useSiteSettings";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

const iconSizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

const Logo = ({ size = "md", showText = true, className }: LogoProps) => {
  const { data: brandingSettings } = useBrandingSettings();
  
  const displayText = showText && brandingSettings.showLogoText;
  const logoText = brandingSettings.logoText || 'مكتبة';
  const logoUrl = brandingSettings.logoUrl;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={logoText}
          className={cn("object-contain", sizeClasses[size])}
        />
      ) : (
        <div
          className={cn(
            "rounded-xl bg-primary flex items-center justify-center",
            sizeClasses[size]
          )}
        >
          <BookOpen
            className={cn("text-primary-foreground", iconSizeClasses[size])}
          />
        </div>
      )}
      {displayText && (
        <span
          className={cn(
            "font-bold text-foreground",
            textSizeClasses[size]
          )}
        >
          {logoText}
        </span>
      )}
    </div>
  );
};

export default Logo;
