import { z } from 'zod';

// ==========================================
// 🔐 Security Utility Functions
// ==========================================

// Rate Limiting - Track requests per user/IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = {
  /**
   * Check if request should be allowed based on rate limit
   * @param identifier - User ID or IP address
   * @param maxRequests - Maximum requests allowed in the time window
   * @param windowMs - Time window in milliseconds
   */
  check: (identifier: string, maxRequests = 100, windowMs = 60000): { allowed: boolean; remaining: number; resetIn: number } => {
    const now = Date.now();
    const record = requestCounts.get(identifier);

    if (!record || now > record.resetTime) {
      requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetTime - now };
  },

  /**
   * Reset rate limit for a specific identifier
   */
  reset: (identifier: string) => {
    requestCounts.delete(identifier);
  },

  /**
   * Clean up expired entries
   */
  cleanup: () => {
    const now = Date.now();
    for (const [key, value] of requestCounts.entries()) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }
  }
};

// ==========================================
// 🛡️ Input Sanitization
// ==========================================

/**
 * Sanitize string input - remove potentially dangerous characters
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive spaces
    .replace(/\s{3,}/g, '  ');
};

/**
 * Sanitize HTML - escape dangerous characters
 */
export const escapeHtml = (input: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return String(input).replace(/[&<>"'`=/]/g, char => htmlEntities[char]);
};

/**
 * Sanitize URL - ensure it's safe
 */
export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email: string): string | null => {
  const schema = z.string().email().max(255);
  const result = schema.safeParse(email.toLowerCase().trim());
  return result.success ? result.data : null;
};

// ==========================================
// 🔍 Validation Schemas
// ==========================================

export const validationSchemas = {
  // User authentication
  email: z.string()
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني طويل جداً')
    .transform(v => v.toLowerCase().trim()),
  
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(128, 'كلمة المرور طويلة جداً')
    .regex(/[A-Za-z]/, 'يجب أن تحتوي على حرف واحد على الأقل')
    .regex(/[0-9]/, 'يجب أن تحتوي على رقم واحد على الأقل'),
  
  username: z.string()
    .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
    .max(30, 'اسم المستخدم طويل جداً')
    .regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يحتوي على أحرف غير مسموحة')
    .transform(v => v.toLowerCase().trim()),
  
  fullName: z.string()
    .min(2, 'الاسم قصير جداً')
    .max(100, 'الاسم طويل جداً')
    .transform(v => sanitizeString(v)),
  
  // Content
  title: z.string()
    .min(1, 'العنوان مطلوب')
    .max(200, 'العنوان طويل جداً')
    .transform(v => sanitizeString(v)),
  
  description: z.string()
    .max(5000, 'الوصف طويل جداً')
    .transform(v => sanitizeString(v))
    .optional(),
  
  message: z.string()
    .min(10, 'الرسالة قصيرة جداً')
    .max(2000, 'الرسالة طويلة جداً')
    .transform(v => sanitizeString(v)),
  
  // Search
  searchQuery: z.string()
    .max(100, 'البحث طويل جداً')
    .transform(v => sanitizeString(v).slice(0, 100)),
  
  // IDs
  uuid: z.string().uuid('معرف غير صالح'),
  
  // Numbers
  positiveInt: z.number().int().positive(),
  page: z.number().int().min(1).max(1000),
  limit: z.number().int().min(1).max(100),
};

// ==========================================
// 🚨 Security Event Types
// ==========================================

export type SecurityEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset_requested'
  | 'password_changed'
  | 'account_locked'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'unauthorized_access'
  | 'admin_action';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ==========================================
// 🔒 Password Strength Checker
// ==========================================

export interface PasswordStrength {
  score: number; // 0-4
  label: 'ضعيفة جداً' | 'ضعيفة' | 'متوسطة' | 'قوية' | 'قوية جداً';
  suggestions: string[];
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) score++;
  else suggestions.push('استخدم 8 أحرف على الأقل');

  if (password.length >= 12) score++;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else suggestions.push('استخدم أحرف كبيرة وصغيرة');

  if (/[0-9]/.test(password)) score++;
  else suggestions.push('أضف أرقام');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push('أضف رموز خاصة (!@#$%^&*)');

  // Check for common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', '111111', 'abc123'];
  if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 2);
    suggestions.push('تجنب الأنماط الشائعة');
  }

  const labels: PasswordStrength['label'][] = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
  
  return {
    score: Math.min(4, Math.max(0, score)),
    label: labels[Math.min(4, Math.max(0, score))],
    suggestions
  };
};

// ==========================================
// 🛡️ CSRF Token Generator
// ==========================================

export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// ==========================================
// 🔐 Secure Storage Helpers
// ==========================================

const STORAGE_PREFIX = 'maktaba_';

export const secureStorage = {
  set: (key: string, value: unknown, expiresInMs?: number) => {
    try {
      const data = {
        value,
        expires: expiresInMs ? Date.now() + expiresInMs : null
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      if (!item) return null;

      const data = JSON.parse(item);
      
      if (data.expires && Date.now() > data.expires) {
        localStorage.removeItem(STORAGE_PREFIX + key);
        return null;
      }

      return data.value as T;
    } catch {
      return null;
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }
};

// ==========================================
// 🔍 Request Fingerprinting
// ==========================================

export const getClientFingerprint = (): string => {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown'
  ];
  
  // Simple hash
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

// Cleanup rate limiter periodically
if (typeof window !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 60000);
}
