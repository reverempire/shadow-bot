import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeDatabase() {
    try {
        console.log(chalk.blue('🔄 بدء تهيئة قاعدة البيانات...'));
        
        // التأكد من وجود مجلد قاعدة البيانات
        const dbDir = path.dirname(path.join(__dirname, 'shadow.db'));
        await fs.mkdir(dbDir, { recursive: true });
        
        // الاتصال بقاعدة البيانات
        const db = new sqlite3.Database(path.join(__dirname, 'shadow.db'));
        
        // قراءة ملف SQL الأولي
        const sqlFile = path.join(__dirname, 'migrations', '001_initial.sql');
        const sqlContent = await fs.readFile(sqlFile, 'utf8');
        
        // تنفيذ الاستعلامات
        await new Promise((resolve, reject) => {
            db.exec(sqlContent, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        
        // إغلاق الاتصال
        await new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        
        console.log(chalk.green('✅ تم تهيئة قاعدة البيانات بنجاح'));
        console.log(chalk.blue('📊 تم إنشاء 8 جداول رئيسية'));
        console.log(chalk.blue('🔍 تم إنشاء الفهارس لتحسين الأداء'));
        console.log(chalk.blue('📝 تم إدراج البيانات الأولية'));
        
    } catch (error) {
        console.error(chalk.red('❌ خطأ في تهيئة قاعدة البيانات:'), error);
        process.exit(1);
    }
}

// تشغيل التهيئة إذا تم استدعاء الملف مباشرة
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeDatabase();
}

export default initializeDatabase;

