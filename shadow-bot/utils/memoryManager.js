import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { botConfig } from '../config/bot-config.js';
import logger from '../utils/logger.js';

export default class MemoryManager {
    constructor() {
        this.memoryThreshold = 500 * 1024 * 1024; // 500 MB
        this.cleanupInterval = 30 * 60 * 1000; // 30 دقيقة
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.lastCleanup = null;
    }

    // بدء مراقبة الذاكرة
    startMonitoring() {
        if (this.isMonitoring) {
            console.log(chalk.yellow('⚠️ مراقب ذاكرة الظل يعمل بالفعل'));
            return;
        }

        this.isMonitoring = true;
        
        this.monitoringInterval = setInterval(async () => {
            await this.checkMemoryUsage();
        }, this.cleanupInterval);

        console.log(chalk.green('✅ تم تشغيل مراقب ذاكرة الظل'));
        logger.logSystemEvent('memory_monitoring_started');
    }

    // إيقاف مراقبة الذاكرة
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            this.isMonitoring = false;
            
            console.log(chalk.yellow('⏹️ تم إيقاف مراقب ذاكرة الظل'));
            logger.logSystemEvent('memory_monitoring_stopped');
        }
    }

    // فحص استخدام الذاكرة
    async checkMemoryUsage() {
        try {
            const memUsage = process.memoryUsage();
            const heapUsed = memUsage.heapUsed;
            const heapTotal = memUsage.heapTotal;
            const external = memUsage.external;
            const rss = memUsage.rss;

            const memoryInfo = {
                heapUsed: Math.round(heapUsed / 1024 / 1024),
                heapTotal: Math.round(heapTotal / 1024 / 1024),
                external: Math.round(external / 1024 / 1024),
                rss: Math.round(rss / 1024 / 1024),
                heapUsagePercent: Math.round((heapUsed / heapTotal) * 100)
            };

            // تسجيل معلومات الذاكرة
            logger.debug('معلومات ذاكرة الظل', memoryInfo);

            // فحص إذا تجاوزت الذاكرة الحد المسموح
            if (heapUsed > this.memoryThreshold) {
                console.log(chalk.yellow(`⚠️ ذاكرة الظل تجاوزت الحد المسموح: ${memoryInfo.heapUsed}MB`));
                
                await this.performCleanup();
                
                // تشغيل garbage collection
                if (global.gc) {
                    global.gc();
                    console.log(chalk.blue('🧹 تم تشغيل منظف ذاكرة الظل'));
                }
            }

            return memoryInfo;

        } catch (error) {
            console.error(chalk.red('❌ خطأ في فحص ذاكرة الظل:'), error);
            logger.error('خطأ في فحص ذاكرة الظل', error);
        }
    }

    // تنفيذ تنظيف الذاكرة
    async performCleanup() {
        try {
            console.log(chalk.blue('🧹 بدء تنظيف ذاكرة الظل...'));
            
            const startTime = Date.now();
            let cleanedItems = 0;

            // تنظيف الملفات المؤقتة
            cleanedItems += await this.cleanTempFiles();

            // تنظيف ملفات الجلسة القديمة
            cleanedItems += await this.cleanOldSessionFiles();

            // تنظيف السجلات القديمة
            cleanedItems += await this.cleanOldLogs();

            // تنظيف ذاكرة التخزين المؤقت
            cleanedItems += await this.clearCaches();

            const duration = Date.now() - startTime;
            this.lastCleanup = new Date();

            console.log(chalk.green(`✅ تم تنظيف ذاكرة الظل: ${cleanedItems} عنصر في ${duration}ms`));
            
            logger.logSystemEvent('memory_cleanup_completed', {
                cleanedItems,
                duration,
                timestamp: this.lastCleanup.toISOString()
            });

            return {
                success: true,
                cleanedItems,
                duration
            };

        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف ذاكرة الظل:'), error);
            logger.error('خطأ في تنظيف ذاكرة الظل', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // تنظيف الملفات المؤقتة
    async cleanTempFiles() {
        try {
            const tempDir = botConfig.paths.temp;
            let cleanedFiles = 0;

            if (await this.directoryExists(tempDir)) {
                const files = await fs.readdir(tempDir);
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة

                for (const file of files) {
                    const filePath = path.join(tempDir, file);
                    const stats = await fs.stat(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.unlink(filePath);
                        cleanedFiles++;
                    }
                }

                if (cleanedFiles > 0) {
                    console.log(chalk.blue(`🗑️ تم حذف ${cleanedFiles} ملف مؤقت من الظل`));
                }
            }

            return cleanedFiles;

        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف الملفات المؤقتة:'), error);
            return 0;
        }
    }

    // تنظيف ملفات الجلسة القديمة
    async cleanOldSessionFiles() {
        try {
            const sessionDir = botConfig.whatsapp.sessionPath;
            let cleanedFiles = 0;

            if (await this.directoryExists(sessionDir)) {
                const files = await fs.readdir(sessionDir);
                const now = Date.now();
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 أيام

                for (const file of files) {
                    // تجاهل الملفات المهمة
                    if (file.includes('creds.json') || file.includes('keys.json')) {
                        continue;
                    }

                    const filePath = path.join(sessionDir, file);
                    const stats = await fs.stat(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.unlink(filePath);
                        cleanedFiles++;
                    }
                }

                if (cleanedFiles > 0) {
                    console.log(chalk.blue(`🗑️ تم حذف ${cleanedFiles} ملف جلسة قديم من الظل`));
                }
            }

            return cleanedFiles;

        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف ملفات الجلسة:'), error);
            return 0;
        }
    }

    // تنظيف السجلات القديمة
    async cleanOldLogs() {
        try {
            const logsDir = botConfig.paths.logs;
            let cleanedFiles = 0;

            if (await this.directoryExists(logsDir)) {
                const files = await fs.readdir(logsDir);
                const now = Date.now();
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 يوم

                for (const file of files) {
                    const filePath = path.join(logsDir, file);
                    const stats = await fs.stat(filePath);

                    if (now - stats.mtime.getTime() > maxAge) {
                        await fs.unlink(filePath);
                        cleanedFiles++;
                    }
                }

                if (cleanedFiles > 0) {
                    console.log(chalk.blue(`🗑️ تم حذف ${cleanedFiles} ملف سجل قديم من الظل`));
                }
            }

            return cleanedFiles;

        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف السجلات القديمة:'), error);
            return 0;
        }
    }

    // تنظيف ذاكرة التخزين المؤقت
    async clearCaches() {
        try {
            let clearedCaches = 0;

            // تنظيف require cache (باستثناء الملفات المهمة)
            const moduleKeys = Object.keys(require.cache);
            for (const key of moduleKeys) {
                // تجاهل الملفات الأساسية
                if (key.includes('node_modules') || 
                    key.includes('config') || 
                    key.includes('database')) {
                    continue;
                }

                delete require.cache[key];
                clearedCaches++;
            }

            if (clearedCaches > 0) {
                console.log(chalk.blue(`🧹 تم تنظيف ${clearedCaches} عنصر من ذاكرة التخزين المؤقت`));
            }

            return clearedCaches;

        } catch (error) {
            console.error(chalk.red('❌ خطأ في تنظيف ذاكرة التخزين المؤقت:'), error);
            return 0;
        }
    }

    // فحص وجود مجلد
    async directoryExists(dirPath) {
        try {
            await fs.access(dirPath);
            return true;
        } catch {
            return false;
        }
    }

    // الحصول على معلومات الذاكرة الحالية
    getCurrentMemoryInfo() {
        const memUsage = process.memoryUsage();
        
        return {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
            threshold: Math.round(this.memoryThreshold / 1024 / 1024),
            isMonitoring: this.isMonitoring,
            lastCleanup: this.lastCleanup
        };
    }

    // تعيين حد الذاكرة
    setMemoryThreshold(thresholdMB) {
        this.memoryThreshold = thresholdMB * 1024 * 1024;
        console.log(chalk.blue(`📊 تم تعيين حد ذاكرة الظل إلى ${thresholdMB}MB`));
        logger.logSystemEvent('memory_threshold_changed', { thresholdMB });
    }

    // تعيين فترة التنظيف
    setCleanupInterval(intervalMinutes) {
        this.cleanupInterval = intervalMinutes * 60 * 1000;
        
        // إعادة تشغيل المراقبة بالفترة الجديدة
        if (this.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
        
        console.log(chalk.blue(`⏰ تم تعيين فترة تنظيف ذاكرة الظل إلى ${intervalMinutes} دقيقة`));
        logger.logSystemEvent('cleanup_interval_changed', { intervalMinutes });
    }

    // إجبار تنظيف الذاكرة
    async forceCleanup() {
        console.log(chalk.blue('🧹 تنظيف إجباري لذاكرة الظل...'));
        return await this.performCleanup();
    }

    // الحصول على إحصائيات التنظيف
    getCleanupStats() {
        return {
            isMonitoring: this.isMonitoring,
            memoryThreshold: Math.round(this.memoryThreshold / 1024 / 1024),
            cleanupInterval: Math.round(this.cleanupInterval / 1000 / 60),
            lastCleanup: this.lastCleanup,
            currentMemory: this.getCurrentMemoryInfo()
        };
    }
}

