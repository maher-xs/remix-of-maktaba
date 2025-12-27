import { memo, useMemo } from 'react';
import { checkPasswordStrength } from '@/lib/security';
import { cn } from '@/lib/utils';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
  showSuggestions?: boolean;
}

const PasswordStrengthMeter = memo(({ 
  password, 
  className,
  showSuggestions = true 
}: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  if (!password) return null;

  const colors = [
    'bg-destructive', // 0 - Very weak
    'bg-orange-500',  // 1 - Weak
    'bg-yellow-500',  // 2 - Medium
    'bg-green-500',   // 3 - Strong
    'bg-emerald-500'  // 4 - Very strong
  ];

  const icons = [
    <ShieldX key="0" className="w-4 h-4" />,
    <ShieldAlert key="1" className="w-4 h-4" />,
    <Shield key="2" className="w-4 h-4" />,
    <ShieldCheck key="3" className="w-4 h-4" />,
    <ShieldCheck key="4" className="w-4 h-4" />
  ];

  const textColors = [
    'text-destructive',
    'text-orange-500',
    'text-yellow-600 dark:text-yellow-400',
    'text-green-600 dark:text-green-400',
    'text-emerald-600 dark:text-emerald-400'
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bars */}
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-300',
              index <= strength.score ? colors[strength.score] : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Label */}
      <div className={cn('flex items-center gap-2 text-sm', textColors[strength.score])}>
        {icons[strength.score]}
        <span className="font-medium">{strength.label}</span>
      </div>

      {/* Suggestions */}
      {showSuggestions && strength.suggestions.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
          {strength.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

PasswordStrengthMeter.displayName = 'PasswordStrengthMeter';

export default PasswordStrengthMeter;
