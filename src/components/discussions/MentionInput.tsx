import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface UserSuggestion {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const MentionInput = ({
  value,
  onChange,
  placeholder = 'اكتب ردك...',
  className,
  minHeight = '80px'
}: MentionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search for users when mention query changes
  useEffect(() => {
    if (mentionQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const searchUsers = async () => {
      const { data, error } = await supabase
        .from('public_profiles')
        .select('id, username, full_name, avatar_url, is_verified')
        .or(`username.ilike.%${mentionQuery}%,full_name.ilike.%${mentionQuery}%`)
        .limit(5);

      if (!error && data) {
        setSuggestions(data);
        setSelectedIndex(0);
      }
    };

    const debounce = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  // Handle text input
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue);

    // Check for @ mention
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @ (active mention)
      if (!textAfterAt.includes(' ')) {
        setMentionQuery(textAfterAt);
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        return;
      }
    }

    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          selectUser(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Select a user from suggestions
  const selectUser = (user: UserSuggestion) => {
    if (mentionStart === -1 || !user.username) return;

    const beforeMention = value.slice(0, mentionStart);
    const afterMention = value.slice(mentionStart + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${user.username} ${afterMention}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery('');
    setMentionStart(-1);

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStart + user.username.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('resize-none bg-background', className)}
        style={{ minHeight }}
      />
      
      {/* Hint for mentions */}
      <p className="text-[10px] text-muted-foreground mt-1">
        استخدم @ للإشارة إلى مستخدم
      </p>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full max-h-48 overflow-y-auto mt-1 bg-popover border border-border rounded-lg shadow-lg"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className={cn(
                'w-full flex items-center gap-3 p-3 text-right hover:bg-muted/50 transition-colors',
                index === selectedIndex && 'bg-muted'
              )}
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {user.full_name?.charAt(0) || user.username?.charAt(0) || 'م'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-foreground truncate">
                    {user.full_name || user.username}
                  </span>
                  {user.is_verified && (
                    <BadgeCheck className="w-4 h-4 text-sky-500 fill-sky-500/20 shrink-0" />
                  )}
                </div>
                {user.username && (
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to parse mentions from text
export const parseMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
};

// Helper function to render text with clickable mentions
export const renderTextWithMentions = (text: string) => {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <a
          key={index}
          href={`/user/${username}`}
          className="text-primary font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default MentionInput;
