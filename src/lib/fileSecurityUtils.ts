/**
 * 🔐 File Security Utilities
 * Validates files before upload to prevent malicious uploads
 */

// Magic bytes signatures for allowed file types
const FILE_SIGNATURES: Record<string, { magic: number[]; offset?: number }[]> = {
  // PDF files
  'application/pdf': [
    { magic: [0x25, 0x50, 0x44, 0x46] } // %PDF
  ],
  // JPEG images
  'image/jpeg': [
    { magic: [0xFF, 0xD8, 0xFF, 0xE0] },
    { magic: [0xFF, 0xD8, 0xFF, 0xE1] },
    { magic: [0xFF, 0xD8, 0xFF, 0xE2] },
    { magic: [0xFF, 0xD8, 0xFF, 0xE3] },
    { magic: [0xFF, 0xD8, 0xFF, 0xE8] },
    { magic: [0xFF, 0xD8, 0xFF, 0xDB] },
  ],
  // PNG images
  'image/png': [
    { magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
  ],
  // WebP images
  'image/webp': [
    { magic: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF
  ],
  // GIF images
  'image/gif': [
    { magic: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { magic: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  'exe', 'dll', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'vbs', 'js', 'jse',
  'wsf', 'wsh', 'msi', 'msp', 'com', 'scr', 'pif', 'application', 'gadget',
  'hta', 'cpl', 'msc', 'jar', 'php', 'asp', 'aspx', 'jsp', 'py', 'rb',
  'pl', 'cgi', 'htaccess', 'htpasswd', 'ini', 'reg', 'inf', 'scf', 'lnk',
  'svg' // SVG can contain JavaScript
];

// Dangerous patterns in file content
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /vbscript:/i,
  /on\w+\s*=/i, // onclick=, onerror=, etc.
  /data:text\/html/i,
  /<%/,  // ASP/JSP
  /<\?php/i,
  /eval\s*\(/i,
  /exec\s*\(/i,
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedName?: string;
  detectedType?: string;
}

/**
 * Read the first N bytes of a file
 */
async function readFileHeader(file: File, bytes: number = 12): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Check if file header matches expected magic bytes
 */
function matchesMagicBytes(header: Uint8Array, signatures: { magic: number[]; offset?: number }[]): boolean {
  for (const sig of signatures) {
    const offset = sig.offset || 0;
    let matches = true;
    
    for (let i = 0; i < sig.magic.length; i++) {
      if (header[offset + i] !== sig.magic[i]) {
        matches = false;
        break;
      }
    }
    
    if (matches) return true;
  }
  return false;
}

/**
 * Detect actual file type from magic bytes
 */
async function detectFileType(file: File): Promise<string | null> {
  try {
    const header = await readFileHeader(file);
    
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      if (matchesMagicBytes(header, signatures)) {
        return mimeType;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitize file name - remove dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  // Extract extension
  const lastDot = fileName.lastIndexOf('.');
  const ext = lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : '';
  const name = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  
  // Remove dangerous characters
  const sanitizedName = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove Windows forbidden chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/\.+/g, '.') // Remove consecutive dots
    .replace(/^\./, '') // Remove leading dots
    .slice(0, 100); // Limit length
  
  // Generate safe name if original is empty after sanitization
  const finalName = sanitizedName || `file_${Date.now()}`;
  
  return ext ? `${finalName}.${ext}` : finalName;
}

/**
 * Check if file extension is dangerous
 */
function isDangerousExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return DANGEROUS_EXTENSIONS.includes(ext);
}

/**
 * Check for double extensions (e.g., file.pdf.exe)
 */
function hasDoubleExtension(fileName: string): boolean {
  const parts = fileName.split('.');
  if (parts.length <= 2) return false;
  
  // Check if any middle part is a dangerous extension
  for (let i = 1; i < parts.length - 1; i++) {
    if (DANGEROUS_EXTENSIONS.includes(parts[i].toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Scan text content for dangerous patterns
 */
async function containsDangerousContent(file: File): Promise<boolean> {
  // Only scan small text-based files
  if (file.size > 1024 * 1024) return false; // Skip files > 1MB
  
  try {
    const text = await file.text();
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(text));
  } catch {
    return false;
  }
}

/**
 * Validate PDF file specifically
 */
export async function validatePdfFile(file: File): Promise<FileValidationResult> {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'حجم الملف يتجاوز 50 ميجابايت' };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') {
    return { isValid: false, error: 'يجب أن يكون الملف بصيغة PDF' };
  }

  // Check for double extension
  if (hasDoubleExtension(file.name)) {
    return { isValid: false, error: 'اسم الملف يحتوي على امتداد مزدوج مشبوه' };
  }

  // Verify magic bytes
  const detectedType = await detectFileType(file);
  if (detectedType !== 'application/pdf') {
    return { 
      isValid: false, 
      error: 'محتوى الملف لا يطابق صيغة PDF - قد يكون ملف مزيف' 
    };
  }

  return {
    isValid: true,
    sanitizedName: sanitizeFileName(file.name),
    detectedType: 'application/pdf'
  };
}

/**
 * Validate image file
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  // Check file size (max 5MB for images)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'حجم الصورة يتجاوز 5 ميجابايت' };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!ext || !allowedExtensions.includes(ext)) {
    return { isValid: false, error: 'صيغة الصورة غير مدعومة' };
  }

  // Check for double extension
  if (hasDoubleExtension(file.name)) {
    return { isValid: false, error: 'اسم الملف يحتوي على امتداد مزدوج مشبوه' };
  }

  // Verify magic bytes
  const detectedType = await detectFileType(file);
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!detectedType || !allowedMimeTypes.includes(detectedType)) {
    return { 
      isValid: false, 
      error: 'محتوى الملف لا يطابق صيغة صورة صالحة - قد يكون ملف مزيف' 
    };
  }

  return {
    isValid: true,
    sanitizedName: sanitizeFileName(file.name),
    detectedType
  };
}

/**
 * General file validation
 */
export async function validateFile(
  file: File, 
  allowedTypes: ('pdf' | 'image')[]
): Promise<FileValidationResult> {
  // Check for dangerous extension
  if (isDangerousExtension(file.name)) {
    return { isValid: false, error: 'نوع الملف غير مسموح به لأسباب أمنية' };
  }

  // Check for double extension
  if (hasDoubleExtension(file.name)) {
    return { isValid: false, error: 'اسم الملف يحتوي على امتداد مزدوج مشبوه' };
  }

  // Route to specific validator
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (allowedTypes.includes('pdf') && ext === 'pdf') {
    return validatePdfFile(file);
  }
  
  if (allowedTypes.includes('image') && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
    return validateImageFile(file);
  }

  return { isValid: false, error: 'نوع الملف غير مدعوم' };
}

/**
 * Upload rate limiter - track uploads per user
 */
const uploadCounts = new Map<string, { count: number; resetTime: number }>();

export function checkUploadRateLimit(
  userId: string, 
  maxUploads: number = 10, 
  windowMs: number = 3600000 // 1 hour
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = uploadCounts.get(userId);

  if (!record || now > record.resetTime) {
    uploadCounts.set(userId, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxUploads - 1, resetIn: windowMs };
  }

  if (record.count >= maxUploads) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetTime - now 
    };
  }

  record.count++;
  return { 
    allowed: true, 
    remaining: maxUploads - record.count, 
    resetIn: record.resetTime - now 
  };
}

/**
 * Calculate total storage used by user (to be called with Supabase data)
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Cleanup old rate limit entries
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of uploadCounts.entries()) {
      if (now > value.resetTime) {
        uploadCounts.delete(key);
      }
    }
  }, 60000);
}
