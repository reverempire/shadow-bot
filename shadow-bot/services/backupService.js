import cron from 'node-cron';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { botConfig } from '../config/bot-config.js';
import dbManager from '../config/database.js';
import logger from '../utils/logger.js';

export default class BackupService {
    constructor() {
        this.isRunning = false;
        this.lastBackupTime = null;
        this.backupSchedule = null;
    }

    // بدء خدمة النسخ الاحتياطي
    start() {
        if (!botConfig.database.backup.enabled) {
            console.log(chalk.yellow('⚠️ خدمة النسخ الاحتياطي معطلة في إعدادات الظل'));
            return;
        }

        // جدولة النسخ الاحتياطي التلقائي
        const interval = botConfig.database.backup.interval;
        const cronExpression = this.getCronExpression(interval);
        
        this.backupSchedule = cron.schedule(cronExpression, async () => {
            await this.performBackup();
        }, {
            scheduled: true,
            timezone: 'Asia/Riyadh'
        });

        console.log(chalk.green(`✅ تم تشغيل خدمة النسخ الاحتياطي للظل (كل ${interval} ساعة)`));
        logger.logSystemEvent('backup_service_started', { interval });
    }

    // إيقاف خدمة النسخ الاحتياطي
    stop() {
        if (this.backupSchedule) {
            this.backupSchedule.stop();
            this.backupSchedule = null;
            console.log(chalk.yellow('⏹️ تم إيقاف خدمة النسخ الاحتياطي للظل'));
            logger.logSystemEvent('backup_service_stopped');
        }
    }

    // تنفيذ النسخ الاحتياطي
    async performBackup() {
        if (this.isRunning) {
            console.log(chalk.yellow('⚠️ النسخ الاحتياطي قيد التشغيل بالفعل'));
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log(chalk.blue('🔄 بدء النسخ الاحتياطي لحديقة الظل...'));
            
            // إنشاء مجلد النسخ الاحتياطي إذا لم يكن موجوداً
            await this.ensureBackupDirectory();
            
            // نسخ قاعدة البيانات
            const dbBackupPath = await this.backupDatabase();
            
            // نسخ ملفات الإعدادات
            const configBackupPath = await this.backupConfigs();
            
            // نسخ السجلات المهمة
            const logsBackupPath = await this.backupLogs();
            
            // إنشاء ملف معلومات النسخة الاحتياطية
            const backupInfo = await this.createBackupInfo({
                dbBackupPath,
                configBackupPath,
                logsBackupPath
            });
            
            // تنظيف النسخ القديمة
            await this.cleanOldBackups();
            
            const duration = Date.now() - startTime;
            this.lastBackupTime = new Date();
            
            console.log(chalk.green(`✅ تم إنجاز النسخ الاحتياطي للظل في ${duration}ms`));
            logger.logSystemEvent('backup_completed', { 
                duration, 
                files: [dbBackupPath, configBackupPath, logsBackupPath] 
            });
            
            return {
                success: true,
                duration,
                files: [dbBackupPath, configBackupPath, logsBackupPath],
                backupInfo
            };
            
        } catch (error) {
            console.error(chalk.red('❌ فشل النسخ الاحتياطي للظل:'), error);
            logger.error('فشل النسخ الاحتياطي للظل', error);
            
            return {
                success: false,
                error: error.message
            };
        } finally {
            this.isRunning = false;
        }
    }

    // نسخ قاعدة البيانات
    async backupDatabase() {
        const timestamp = this.getTimestamp();
        const backupFileName = `shadow-db-${timestamp}.db`;
        const backupPath = path.join(botConfig.paths.backups, backupFileName);
        
        await fs.copyFile(botConfig.database.path, backupPath);
        
        console.log(chalk.green(`📊 تم نسخ قاعدة بيانات الظل: ${backupFileName}`));
        return backupPath;
    }

    // نسخ ملفات الإعدادات
    async backupConfigs() {
        const timestamp = this.getTimestamp();
        const backupFileName = `shadow-configs-${timestamp}.json`;
        const backupPath = path.join(botConfig.paths.backups, backupFileName);
        
        const configs = {
            botConfig: {
                name: botConfig.name,
                version: botConfig.version,
                environment: botConfig.environment,
                features: botConfig.features,
                security: {
                    rateLimit: botConfig.security.rateLimit
                }
            },
            packageInfo: await this.getPackageInfo(),
            timestamp: new Date().toISOString()
        };
        
        await fs.writeFile(backupPath, JSON.stringify(configs, null, 2));
        
        console.log(chalk.green(`⚙️ تم نسخ إعدادات الظل: ${backupFileName}`));
        return backupPath;
    }

    // نسخ السجلات المهمة
    async backupLogs() {
        const timestamp = this.getTimestamp();
        const backupFileName = `shadow-logs-${timestamp}.tar.gz`;
        const backupPath = path.join(botConfig.paths.backups, backupFileName);
        
        try {
            // نسخ ملفات السجلات الحديثة (آخر 7 أيام)
            const logsDir = botConfig.paths.logs;
            const files = await fs.readdir(logsDir);
            const recentLogs = [];
            
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime > sevenDaysAgo) {
                    recentLogs.push(file);
                }
            }
            
            // إنشاء أرشيف مضغوط للسجلات
            const archiveData = {
                files: recentLogs,
                timestamp: new Date().toISOString(),
                totalFiles: recentLogs.length
            };
            
            await fs.writeFile(backupPath, JSON.stringify(archiveData, null, 2));
            
            console.log(chalk.green(`📋 تم نسخ سجلات الظل: ${backupFileName} (${recentLogs.length} ملف)`));
            return backupPath;
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في نسخ سجلات الظل:'), error);
            return null;
        }
    }

    // إنشاء ملف معلومات النسخة الاحتياطية
    async createBackupInfo(backupPaths) {
        const timestamp = this.getTimestamp();
        const infoFileName = `shadow-backup-info-${timestamp}.json`;
        const infoPath = path.join(botConfig.paths.backups, infoFileName);
        
        const backupInfo = {
            timestamp: new Date().toISOString(),
            version: botConfig.version,
            environment: botConfig.environment,
            files: backupPaths,
            stats: await dbManager.getStats(),
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            }
        };
        
        await fs.writeFile(infoPath, JSON.stringify(backupInfo, null, 2));
        
        console.log(chalk.green(`📄 تم إنشاء ملف معلومات النسخة الاحتياطية: ${infoFileName}`));
        return infoPath;
    }

    // تنظيف النسخ الاحتياطية القديمة
    async cleanOldBackups() {
        try {
            const backupsDir = botConfig.paths.backups;
            const files = await fs.readdir(backupsDir);
            
            // تجميع الملفات حسب النوع
            const backupFiles = {
                db: [],
                configs: [],
                logs: [],
                info: []
            };
            
            for (const file of files) {
                const filePath = path.join(backupsDir, file);
                const stats = await fs.stat(filePath);
                
                if (file.includes('shadow-db-')) {
                    backupFiles.db.push({ file, path: filePath, mtime: stats.mtime });
                } else if (file.includes('shadow-configs-')) {
                    backupFiles.configs.push({ file, path: filePath, mtime: stats.mtime });
                } else if (file.includes('shadow-logs-')) {
                    backupFiles.logs.push({ file, path: filePath, mtime: stats.mtime });
                } else if (file.includes('shadow-backup-info-')) {
                    backupFiles.info.push({ file, path: filePath, mtime: stats.mtime });
                }
            }
            
            const maxFiles = botConfig.database.backup.maxFiles;
            
            // تنظيف كل نوع من الملفات
            for (const [type, fileList] of Object.entries(backupFiles)) {
                if (fileList.length > maxFiles) {
                    // ترتيب حسب التاريخ (الأحدث أولاً)
                    fileList.sort((a, b) => b.mtime - a.mtime);
                    
                    // حذف الملفات الزائدة
                    const filesToDelete = fileList.slice(maxFiles);
                    
                    for (const fileInfo of filesToDelete) {
                        await fs.unlink(fileInfo.path);
                        console.log(chalk.yellow(`🗑️ تم حذف نسخة احتياطية قديمة: ${fileInfo.file}`));
                    }
                }
            }
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف النسخ الاحتياطية القديمة:'), error);
        }
    }

    // التأكد من وجود مجلد النسخ الاحتياطي
    async ensureBackupDirectory() {
        const backupsDir = botConfig.paths.backups;
        
        try {
            await fs.access(backupsDir);
        } catch (error) {
            await fs.mkdir(backupsDir, { recursive: true });
            console.log(chalk.green(`📁 تم إنشاء مجلد النسخ الاحتياطي: ${backupsDir}`));
        }
    }

    // الحصول على معلومات package.json
    async getPackageInfo() {
        try {
            const packagePath = path.join(botConfig.paths.root, '../package.json');
            const packageContent = await fs.readFile(packagePath, 'utf8');
            return JSON.parse(packageContent);
        } catch (error) {
            return { error: 'لا يمكن قراءة package.json' };
        }
    }

    // إنشاء تعبير cron
    getCronExpression(hours) {
        // تشغيل كل X ساعة
        return `0 0 */${hours} * * *`;
    }

    // الحصول على طابع زمني
    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    // الحصول على حالة الخدمة
    getStatus() {
        return {
            isRunning: this.isRunning,
            isScheduled: !!this.backupSchedule,
            lastBackupTime: this.lastBackupTime,
            nextBackupTime: this.backupSchedule ? this.backupSchedule.nextDate() : null,
            enabled: botConfig.database.backup.enabled,
            interval: botConfig.database.backup.interval,
            maxFiles: botConfig.database.backup.maxFiles
        };
    }

    // استعادة من نسخة احتياطية
    async restoreFromBackup(backupTimestamp) {
        try {
            console.log(chalk.blue(`🔄 بدء استعادة الظل من النسخة الاحتياطية: ${backupTimestamp}`));
            
            const dbBackupPath = path.join(botConfig.paths.backups, `shadow-db-${backupTimestamp}.db`);
            
            // التحقق من وجود النسخة الاحتياطية
            await fs.access(dbBackupPath);
            
            // إنشاء نسخة احتياطية من قاعدة البيانات الحالية
            const currentBackupPath = path.join(botConfig.paths.backups, `shadow-db-before-restore-${this.getTimestamp()}.db`);
            await fs.copyFile(botConfig.database.path, currentBackupPath);
            
            // استعادة قاعدة البيانات
            await fs.copyFile(dbBackupPath, botConfig.database.path);
            
            console.log(chalk.green(`✅ تم استعادة الظل من النسخة الاحتياطية بنجاح`));
            logger.logSystemEvent('backup_restored', { backupTimestamp, currentBackupPath });
            
            return {
                success: true,
                restoredFrom: dbBackupPath,
                currentBackup: currentBackupPath
            };
            
        } catch (error) {
            console.error(chalk.red('❌ فشل في استعادة الظل من النسخة الاحتياطية:'), error);
            logger.error('فشل في استعادة النسخة الاحتياطية', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // الحصول على قائمة النسخ الاحتياطية المتاحة
    async getAvailableBackups() {
        try {
            const backupsDir = botConfig.paths.backups;
            const files = await fs.readdir(backupsDir);
            
            const backups = [];
            
            for (const file of files) {
                if (file.includes('shadow-backup-info-')) {
                    const infoPath = path.join(backupsDir, file);
                    const infoContent = await fs.readFile(infoPath, 'utf8');
                    const backupInfo = JSON.parse(infoContent);
                    
                    const timestamp = file.replace('shadow-backup-info-', '').replace('.json', '');
                    
                    backups.push({
                        timestamp,
                        date: new Date(backupInfo.timestamp),
                        version: backupInfo.version,
                        environment: backupInfo.environment,
                        files: backupInfo.files,
                        stats: backupInfo.stats
                    });
                }
            }
            
            // ترتيب حسب التاريخ (الأحدث أولاً)
            backups.sort((a, b) => b.date - a.date);
            
            return backups;
            
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على قائمة النسخ الاحتياطية:'), error);
            return [];
        }
    }
}

