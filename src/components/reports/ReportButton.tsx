import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportContentDialog } from './ReportContentDialog';
import { ContentType } from '@/hooks/useContentReport';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReportButtonProps {
  contentType: ContentType;
  contentId: string;
  contentTitle?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'icon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ReportButton({
  contentType,
  contentId,
  contentTitle,
  variant = 'ghost',
  size = 'sm',
  className,
}: ReportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDialogOpen(true)}
              className={`h-9 w-9 rounded-lg border ${className || ''}`}
            >
              <Flag className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>الإبلاغ عن محتوى مخالف</p>
          </TooltipContent>
        </Tooltip>

        <ReportContentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          contentType={contentType}
          contentId={contentId}
          contentTitle={contentTitle}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        <Flag className="w-4 h-4 ml-2" />
        إبلاغ
      </Button>

      <ReportContentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contentType={contentType}
        contentId={contentId}
        contentTitle={contentTitle}
      />
    </>
  );
}
