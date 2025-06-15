import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// تحميل متغيرات البيئة
config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const botConfig = {
  // معلومات البوت الأساسية
  name: process.env.BOT_NAME || 'شادو - الذي في حديقة الظل',
  version: process.env.BOT_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // إعدادات قاعدة البيانات
  database: {
    path: process.env.DB_PATH || path.join(__dirname, '../database/shadow.db'),
    backup: {
      enabled: process.env.BACKUP_ENABLED === 'true',
      interval: parseInt(process.env.BACKUP_INTERVAL) || 24,
      maxFiles: parseInt(process.env.MAX_BACKUP_FILES) || 7
    }
  },
  
  // إعدادات الأمان
  security: {
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
      window: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'shadow-bot-secret-key-2024',
      expiresIn: '24h'
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    }
  },
  
  // إعدادات السجلات
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || path.join(__dirname, '../logs/shadow.log'),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },
  
  // إعدادات الخادم
  server: {
    enabled: process.env.WEB_ENABLED === 'true',
    port: parseInt(process.env.WEB_PORT) || 3000,
    authEnabled: process.env.WEB_AUTH_ENABLED === 'true'
  },
  
  // إعدادات WhatsApp
  whatsapp: {
    sessionPath: path.join(__dirname, '../session'),
    phoneNumber: process.env.PHONE_NUMBER || '',
    pairingCode: process.env.PAIRING_CODE === 'true',
    qrCode: process.env.QR_CODE === 'true'
  },
  
  // إعدادات المطورين والمشرفين
  permissions: {
    developers: process.env.DEVELOPER_NUMBERS ? process.env.DEVELOPER_NUMBERS.split(',').map(n => n.trim()) : [],
    admins: process.env.ADMIN_NUMBERS ? process.env.ADMIN_NUMBERS.split(',').map(n => n.trim()) : []
  },
  
  // إعدادات الميزات
  features: {
    autoBackup: process.env.AUTO_BACKUP === 'true',
    autoReply: process.env.AUTO_REPLY === 'true',
    welcomeMessage: process.env.WELCOME_MESSAGE === 'true',
    antiLink: process.env.ANTI_LINK === 'true',
    autoSticker: process.env.AUTO_STICKER === 'true'
  },
  
  // إعدادات API الخارجية
  apis: {
    openai: process.env.OPENAI_API_KEY || '',
    google: process.env.GOOGLE_API_KEY || ''
  },
  
  // المسارات
  paths: {
    root: __dirname,
    database: path.join(__dirname, '../database'),
    plugins: path.join(__dirname, '../plugins'),
    logs: path.join(__dirname, '../logs'),
    temp: path.join(__dirname, '../temp'),
    backups: path.join(__dirname, '../backups'),
    assets: path.join(__dirname, '../assets')
  }
};

// التحقق من صحة الإعدادات
export function validateConfig() {
  const required = [];
  
  // التحقق من الإعدادات المطلوبة
  if (!botConfig.name) required.push('BOT_NAME');
  if (!botConfig.database.path) required.push('DB_PATH');
  
  if (required.length > 0) {
    throw new Error(`الإعدادات المطلوبة مفقودة: ${required.join(', ')}`);
  }
  
  return true;
}

export default botConfig;

