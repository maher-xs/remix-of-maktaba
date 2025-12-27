// Content Moderation System - Profanity Filter for Arabic & English

// Common Arabic profanity patterns (obfuscated for safety)
const arabicBadWords = [
  'كلب', 'حمار', 'غبي', 'احمق', 'تافه', 'حقير', 'وسخ', 'قذر',
  'زبال', 'منيوك', 'شرموط', 'عاهر', 'قحب', 'متخلف', 'معوق',
  'ابن الكلب', 'يلعن', 'اللعنة', 'جحش', 'بهيم', 'حيوان',
  'خنزير', 'كس', 'طيز', 'زب', 'نيك', 'عرص', 'مقرف', 'قرف'
];

// Common English profanity patterns
const englishBadWords = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'dick',
  'cock', 'pussy', 'bastard', 'whore', 'slut', 'cunt', 'nigger',
  'fag', 'retard', 'idiot', 'stupid', 'moron', 'dumb', 'jerk',
  'asshole', 'bullshit', 'motherfucker', 'wtf', 'stfu', 'porn',
  'xxx', 'nude', 'naked', 'sex', 'penis', 'vagina', 'boobs'
];

// Leet speak / obfuscation patterns
const leetPatterns: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

export interface ModerationResult {
  isClean: boolean;
  flaggedWords: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  message: string;
}

// Normalize text to catch obfuscation attempts
function normalizeText(text: string): string {
  let normalized = text.toLowerCase();
  
  // Replace leet speak
  Object.entries(leetPatterns).forEach(([leet, char]) => {
    normalized = normalized.replace(new RegExp(leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), char);
  });
  
  // Remove repeated characters (e.g., "fuuuck" -> "fuck")
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');
  
  // Remove spaces between characters (e.g., "f u c k" -> "fuck")
  normalized = normalized.replace(/\s+/g, '');
  
  // Remove special characters that might be used to bypass filters
  normalized = normalized.replace(/[._\-*#]/g, '');
  
  return normalized;
}

// Check if text contains bad words
export function checkTextForProfanity(text: string): ModerationResult {
  if (!text || typeof text !== 'string') {
    return {
      isClean: true,
      flaggedWords: [],
      severity: 'none',
      message: ''
    };
  }

  const normalizedText = normalizeText(text);
  const originalLower = text.toLowerCase();
  const flaggedWords: string[] = [];

  // Check Arabic bad words
  for (const word of arabicBadWords) {
    if (originalLower.includes(word) || normalizedText.includes(word)) {
      flaggedWords.push(word);
    }
  }

  // Check English bad words
  for (const word of englishBadWords) {
    const normalizedWord = normalizeText(word);
    if (normalizedText.includes(normalizedWord) || originalLower.includes(word)) {
      flaggedWords.push(word);
    }
  }

  // Determine severity
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (flaggedWords.length > 0) {
    if (flaggedWords.length >= 3) {
      severity = 'high';
    } else if (flaggedWords.length >= 2) {
      severity = 'medium';
    } else {
      severity = 'low';
    }
  }

  const messages = {
    none: '',
    low: 'يحتوي النص على كلمات غير لائقة',
    medium: 'يحتوي النص على محتوى مسيء',
    high: 'يحتوي النص على محتوى غير مقبول'
  };

  return {
    isClean: flaggedWords.length === 0,
    flaggedWords: [...new Set(flaggedWords)], // Remove duplicates
    severity,
    message: messages[severity]
  };
}

// Validate book content (title, description, author, publisher)
export function validateBookContent(data: {
  title?: string;
  description?: string;
  author?: string;
  publisher?: string;
}): ModerationResult {
  const results: ModerationResult[] = [];

  if (data.title) {
    results.push(checkTextForProfanity(data.title));
  }
  if (data.description) {
    results.push(checkTextForProfanity(data.description));
  }
  if (data.author) {
    results.push(checkTextForProfanity(data.author));
  }
  if (data.publisher) {
    results.push(checkTextForProfanity(data.publisher));
  }

  const allFlaggedWords = results.flatMap(r => r.flaggedWords);
  const hasIssues = results.some(r => !r.isClean);

  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (hasIssues) {
    const maxSeverity = results.reduce((max, r) => {
      const severityOrder = { none: 0, low: 1, medium: 2, high: 3 };
      return severityOrder[r.severity] > severityOrder[max] ? r.severity : max;
    }, 'none' as 'none' | 'low' | 'medium' | 'high');
    severity = maxSeverity;
  }

  return {
    isClean: !hasIssues,
    flaggedWords: [...new Set(allFlaggedWords)],
    severity,
    message: hasIssues ? 'يحتوي المحتوى على كلمات غير لائقة. يرجى مراجعة النص.' : ''
  };
}

// Validate user profile content
export function validateProfileContent(data: {
  fullName?: string;
  username?: string;
  bio?: string;
}): ModerationResult {
  const results: ModerationResult[] = [];

  if (data.fullName) {
    results.push(checkTextForProfanity(data.fullName));
  }
  if (data.username) {
    results.push(checkTextForProfanity(data.username));
  }
  if (data.bio) {
    results.push(checkTextForProfanity(data.bio));
  }

  const allFlaggedWords = results.flatMap(r => r.flaggedWords);
  const hasIssues = results.some(r => !r.isClean);

  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (hasIssues) {
    const maxSeverity = results.reduce((max, r) => {
      const severityOrder = { none: 0, low: 1, medium: 2, high: 3 };
      return severityOrder[r.severity] > severityOrder[max] ? r.severity : max;
    }, 'none' as 'none' | 'low' | 'medium' | 'high');
    severity = maxSeverity;
  }

  return {
    isClean: !hasIssues,
    flaggedWords: [...new Set(allFlaggedWords)],
    severity,
    message: hasIssues ? 'يحتوي الملف الشخصي على كلمات غير لائقة.' : ''
  };
}

// Validate review/comment content
export function validateReviewContent(reviewText: string): ModerationResult {
  return checkTextForProfanity(reviewText);
}

// Validate reading list content
export function validateReadingListContent(data: {
  name?: string;
  description?: string;
}): ModerationResult {
  const results: ModerationResult[] = [];

  if (data.name) {
    results.push(checkTextForProfanity(data.name));
  }
  if (data.description) {
    results.push(checkTextForProfanity(data.description));
  }

  const allFlaggedWords = results.flatMap(r => r.flaggedWords);
  const hasIssues = results.some(r => !r.isClean);

  return {
    isClean: !hasIssues,
    flaggedWords: [...new Set(allFlaggedWords)],
    severity: hasIssues ? 'medium' : 'none',
    message: hasIssues ? 'يحتوي اسم القائمة أو الوصف على كلمات غير لائقة.' : ''
  };
}

// Censor bad words in text (replace with asterisks)
export function censorText(text: string): string {
  if (!text) return text;
  
  let censored = text;
  
  // Censor Arabic words
  for (const word of arabicBadWords) {
    const regex = new RegExp(word, 'gi');
    censored = censored.replace(regex, '*'.repeat(word.length));
  }
  
  // Censor English words
  for (const word of englishBadWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    censored = censored.replace(regex, '*'.repeat(word.length));
  }
  
  return censored;
}
