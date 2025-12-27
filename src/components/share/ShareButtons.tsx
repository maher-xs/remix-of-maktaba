import { useState } from 'react';
import { Share2, Copy, Check, Twitter, Facebook, MessageCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface ShareButtonsProps {
  title: string;
  description?: string;
  url?: string;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'default' | 'lg';
}

const ShareButtons = ({ 
  title, 
  description = '', 
  url,
  variant = 'button',
  size = 'default'
}: ShareButtonsProps) => {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = `${title}${description ? ` - ${description}` : ''}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('فشل نسخ الرابط');
    }
  };
  
  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };
  
  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };
  
  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border">
            <Share2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size={size} className="gap-2">
            <Share2 className="w-4 h-4" />
            مشاركة
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          نسخ الرابط
        </DropdownMenuItem>
        
        {typeof navigator !== 'undefined' && navigator.share && (
          <DropdownMenuItem onClick={handleNativeShare} className="gap-2 cursor-pointer">
            <Share2 className="w-4 h-4" />
            مشاركة...
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={shareOnTwitter} className="gap-2 cursor-pointer">
          <Twitter className="w-4 h-4" />
          تويتر / X
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareOnFacebook} className="gap-2 cursor-pointer">
          <Facebook className="w-4 h-4" />
          فيسبوك
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={shareOnWhatsApp} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4" />
          واتساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButtons;
