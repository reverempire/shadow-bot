import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import cfonts from 'cfonts';
import { config } from 'dotenv';
import dbManager from './config/database.js';
import { botConfig, validateConfig } from './config/bot-config.js';
import ShadowBot from './bot.js';

// تحميل متغيرات البيئة
config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// عرض شعار شادو
function displayLogo() {
    console.clear();
    
    cfonts.say('SHADOW', {
        font: 'block',
        align: 'center',
        colors: ['red', 'black'],
        background: 'transparent',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: '0',
        gradient: ['red', 'black'],
        independentGradient: false,
        transitionGradient: true,
        env: 'node'
    });

    cfonts.say('الذي في حديقة الظل', {
        font: 'console',
        align: 'center',
        colors: ['red'],
        background: 'transparent',
        letterSpacing: 1,
        lineHeight: 1,
        space: true,
        maxLength: '0'
    });

    console.log(chalk.red('═'.repeat(60)));
    console.log(chalk.red('🌑 شادو - الذي في حديقة الظل'));
    console.log(chalk.gray('📅 تاريخ البناء: ' + new Date().toLocaleDateString('ar-EG')));
    console.log(chalk.red('👨‍💻 مطور بقوة الظل والذكاء الاصطناعي'));
    console.log(chalk.red('═'.repeat(60)));
}

// فحص النظام
async function systemCheck() {
    console.log(chalk.blue('🔍 فحص أنظمة الظل...'));
    
    try {
        console.log(chalk.gray('  ├─ فحص إعدادات الظل...'));
        validateConfig();
        console.log(chalk.green('  ├─ ✅ إعدادات الظل صحيحة'));
        
        console.log(chalk.gray('  ├─ فحص قاعدة بيانات الظل...'));
        await dbManager.connect();
        const dbHealth = await dbManager.healthCheck();
        
        if (dbHealth) {
            console.log(chalk.green('  ├─ ✅ قاعدة بيانات الظل متصلة'));
            
            const dbInfo = await dbManager.getInfo();
            console.log(chalk.blue(`  ├─ 📊 جداول الظل: ${dbInfo.tables.length}`));
            
            let totalRecords = 0;
            dbInfo.tables.forEach(table => {
                totalRecords += table.records;
                console.log(chalk.gray(`  │   ├─ ${table.name}: ${table.records} سجل`));
            });
            
            console.log(chalk.blue(`  ├─ 📈 إجمالي سجلات الظل: ${totalRecords}`));
        } else {
            throw new Error('فشل فحص صحة قاعدة بيانات الظل');
        }
        
        console.log(chalk.gray('  ├─ فحص مجلدات الظل...'));
        const requiredDirs = ['logs', 'temp', 'session', 'backups'];
        const fs = await import('fs');
        
        for (const dir of requiredDirs) {
            const dirPath = join(__dirname, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(chalk.yellow(`  │   ├─ تم إنشاء مجلد الظل: ${dir}`));
            }
        }
        console.log(chalk.green('  ├─ ✅ مجلدات الظل جاهزة'));
        
        console.log(chalk.green('  └─ ✅ فحص أنظمة الظل مكتمل'));
        
    } catch (error) {
        console.log(chalk.red('  └─ ❌ فشل فحص أنظمة الظل'));
        console.error(chalk.red('خطأ في فحص النظام:'), error.message);
        process.exit(1);
    }
}

// معالج إيقاف البرنامج
function setupGracefulShutdown(bot) {
    const shutdown = async (signal) => {
        console.log(chalk.yellow(`\n🔄 تم استلام إشارة ${signal}، شادو يغادر حديقة الظل...`));
        
        try {
            if (bot) {
                await bot.stop();
            }
            
            await dbManager.disconnect();
            
            console.log(chalk.green('✅ شادو غادر حديقة الظل بنجاح'));
            process.exit(0);
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إيقاف شادو:'), error);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// معالج الأخطاء غير المتوقعة
function setupErrorHandlers() {
    process.on('uncaughtException', (error) => {
        console.error(chalk.red('💥 خطأ غير متوقع في الظل:'), error);
        console.error(chalk.red('Stack trace:'), error.stack);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error(chalk.red('💥 رفض غير معالج في الظل:'), promise);
        console.error(chalk.red('السبب:'), reason);
        process.exit(1);
    });
}

// الدالة الرئيسية
async function main() {
    try {
        displayLogo();
        
        setupErrorHandlers();
        
        await systemCheck();
        
        console.log(chalk.blue('\n🌑 شادو يدخل حديقة الظل...'));
        
        const bot = new ShadowBot();
        
        setupGracefulShutdown(bot);
        
        await bot.start();
        
        console.log(chalk.green('\n🎉 شادو جاهز في حديقة الظل!'));
        console.log(chalk.blue('📱 شادو يستمع لأصوات الظل...'));
        
        console.log(chalk.red('\n📋 معلومات شادو:'));
        console.log(chalk.gray(`  ├─ الاسم: ${botConfig.name}`));
        console.log(chalk.gray(`  ├─ الإصدار: ${botConfig.version}`));
        console.log(chalk.gray(`  ├─ البيئة: ${botConfig.environment}`));
        console.log(chalk.gray(`  ├─ قاعدة بيانات الظل: ${botConfig.database.path}`));
        
        if (botConfig.server.enabled) {
            console.log(chalk.gray(`  ├─ خادم الظل: http://localhost:${botConfig.server.port}`));
        }
        
        console.log(chalk.gray(`  └─ معرف العملية: ${process.pid}`));
        
    } catch (error) {
        console.error(chalk.red('\n💥 فشل شادو في دخول حديقة الظل:'), error);
        console.error(chalk.red('Stack trace:'), error.stack);
        process.exit(1);
    }
}

// تشغيل البرنامج
main().catch((error) => {
    console.error(chalk.red('💥 خطأ في البرنامج الرئيسي:'), error);
    process.exit(1);
});

