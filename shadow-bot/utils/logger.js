import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';
import { botConfig } from '../config/bot-config.js';
import path from 'path';

class Logger {
    constructor() {
        this.logger = null;
        this.initializeLogger();
    }

    initializeLogger() {
        // إعداد تنسيق السجلات
        const logFormat = winston.format.combine(
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss'
            }),
            winston.format.errors({ stack: true }),
            winston.format.printf(({ level, message, timestamp, stack }) => {
                return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
            })
        );

        // إعداد تنسيق السجلات للوحة التحكم
        const consoleFormat = winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
                format: 'HH:mm:ss'
            }),
            winston.format.printf(({ level, message, timestamp }) => {
                return `${chalk.gray(timestamp)} ${level}: ${message}`;
            })
        );

        // إعداد ملف السجلات الدوار
        const fileRotateTransport = new DailyRotateFile({
            filename: path.join(botConfig.paths.logs, 'shadow-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: botConfig.logging.maxSize,
            maxFiles: botConfig.logging.maxFiles,
            format: logFormat,
            level: botConfig.logging.level
        });

        // إعداد ملف سجلات الأخطاء
        const errorFileTransport = new DailyRotateFile({
            filename: path.join(botConfig.paths.logs, 'shadow-error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: botConfig.logging.maxSize,
            maxFiles: botConfig.logging.maxFiles,
            format: logFormat,
            level: 'error'
        });

        // إنشاء Logger
        this.logger = winston.createLogger({
            level: botConfig.logging.level,
            format: logFormat,
            transports: [
                fileRotateTransport,
                errorFileTransport
            ],
            exceptionHandlers: [
                new winston.transports.File({
                    filename: path.join(botConfig.paths.logs, 'shadow-exceptions.log')
                })
            ],
            rejectionHandlers: [
                new winston.transports.File({
                    filename: path.join(botConfig.paths.logs, 'shadow-rejections.log')
                })
            ]
        });

        // إضافة سجلات وحة التحكم في بيئة التطوير
        if (botConfig.environment === 'development') {
            this.logger.add(new winston.transports.Console({
                format: consoleFormat,
                level: 'debug'
            }));
        }

        // معالج أحداث السجلات
        fileRotateTransport.on('rotate', (oldFilename, newFilename) => {
            console.log(chalk.blue(`📋 تم تدوير ملف سجلات الظل: ${newFilename}`));
        });

        fileRotateTransport.on('new', (newFilename) => {
            console.log(chalk.green(`📋 تم إنشاء ملف سجلات جديد للظل: ${newFilename}`));
        });
    }

    // دوال السجلات الأساسية
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, error = null, meta = {}) {
        if (error) {
            this.logger.error(message, { error: error.message, stack: error.stack, ...meta });
        } else {
            this.logger.error(message, meta);
        }
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // سجلات خاصة بالبوت
    logCommand(userId, commandName, success, responseTime, error = null) {
        const logData = {
            userId,
            commandName,
            success,
            responseTime,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logData.error = error.message;
            this.error(`أمر فاشل في الظل: ${commandName} بواسطة ${userId}`, error, logData);
        } else {
            this.info(`أمر ناجح في الظل: ${commandName} بواسطة ${userId} (${responseTime}ms)`, logData);
        }
    }

    logUserAction(userId, action, details = {}) {
        this.info(`إجراء مستخدم في الظل: ${action}`, {
            userId,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    }

    logSystemEvent(event, details = {}) {
        this.info(`حدث نظام في الظل: ${event}`, {
            event,
            details,
            timestamp: new Date().toISOString()
        });
    }

    logSecurityEvent(userId, event, severity = 'medium', details = {}) {
        const logData = {
            userId,
            event,
            severity,
            details,
            timestamp: new Date().toISOString()
        };

        if (severity === 'high') {
            this.error(`حدث أمني عالي الخطورة في الظل: ${event}`, null, logData);
        } else if (severity === 'medium') {
            this.warn(`حدث أمني متوسط الخطورة في الظل: ${event}`, logData);
        } else {
            this.info(`حدث أمني منخفض الخطورة في الظل: ${event}`, logData);
        }
    }

    logDatabaseOperation(operation, table, success, duration, error = null) {
        const logData = {
            operation,
            table,
            success,
            duration,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logData.error = error.message;
            this.error(`عملية قاعدة بيانات فاشلة في الظل: ${operation} على ${table}`, error, logData);
        } else {
            this.debug(`عملية قاعدة بيانات ناجحة في الظل: ${operation} على ${table} (${duration}ms)`, logData);
        }
    }

    // تنظيف السجلات القديمة
    async cleanOldLogs() {
        try {
            const fs = await import('fs');
            const logsDir = botConfig.paths.logs;
            
            if (!fs.existsSync(logsDir)) {
                return;
            }

            const files = await fs.promises.readdir(logsDir);
            const now = new Date();
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 يوم

            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = await fs.promises.stat(filePath);
                
                if (now - stats.mtime > maxAge) {
                    await fs.promises.unlink(filePath);
                    this.info(`تم حذف ملف سجلات قديم من الظل: ${file}`);
                }
            }
        } catch (error) {
            this.error('خطأ في تنظيف سجلات الظل القديمة', error);
        }
    }

    // الحصول على إحصائيات السجلات
    async getLogStats() {
        try {
            const fs = await import('fs');
            const logsDir = botConfig.paths.logs;
            
            if (!fs.existsSync(logsDir)) {
                return { totalFiles: 0, totalSize: 0 };
            }

            const files = await fs.promises.readdir(logsDir);
            let totalSize = 0;
            
            for (const file of files) {
                const filePath = path.join(logsDir, file);
                const stats = await fs.promises.stat(filePath);
                totalSize += stats.size;
            }

            return {
                totalFiles: files.length,
                totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
                directory: logsDir
            };
        } catch (error) {
            this.error('خطأ في الحصول على إحصائيات سجلات الظل', error);
            return { totalFiles: 0, totalSize: 0 };
        }
    }

    // إنشاء تقرير سجلات
    async generateLogReport(hours = 24) {
        try {
            const fs = await import('fs');
            const logsDir = botConfig.paths.logs;
            const now = new Date();
            const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

            const report = {
                period: `${hours} ساعة`,
                startTime: startTime.toISOString(),
                endTime: now.toISOString(),
                events: {
                    total: 0,
                    info: 0,
                    warn: 0,
                    error: 0
                },
                commands: {
                    total: 0,
                    successful: 0,
                    failed: 0
                },
                users: new Set(),
                errors: []
            };

            // قراءة ملفات السجلات الحديثة
            const files = await fs.promises.readdir(logsDir);
            const logFiles = files.filter(file => file.startsWith('shadow-') && file.endsWith('.log'));

            for (const file of logFiles) {
                const filePath = path.join(logsDir, file);
                const content = await fs.promises.readFile(filePath, 'utf8');
                const lines = content.split('\n');

                for (const line of lines) {
                    if (!line.trim()) continue;

                    try {
                        const logEntry = this.parseLogLine(line);
                        if (!logEntry || new Date(logEntry.timestamp) < startTime) continue;

                        report.events.total++;
                        report.events[logEntry.level]++;

                        if (logEntry.userId) {
                            report.users.add(logEntry.userId);
                        }

                        if (logEntry.commandName) {
                            report.commands.total++;
                            if (logEntry.success) {
                                report.commands.successful++;
                            } else {
                                report.commands.failed++;
                            }
                        }

                        if (logEntry.level === 'error') {
                            report.errors.push({
                                timestamp: logEntry.timestamp,
                                message: logEntry.message,
                                userId: logEntry.userId
                            });
                        }
                    } catch (parseError) {
                        // تجاهل أخطاء التحليل
                    }
                }
            }

            report.users = report.users.size;
            return report;
        } catch (error) {
            this.error('خطأ في إنشاء تقرير سجلات الظل', error);
            return null;
        }
    }

    parseLogLine(line) {
        try {
            const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\]: (.+)$/);
            if (!match) return null;

            const [, timestamp, level, message] = match;
            
            // محاولة استخراج معلومات إضافية من الرسالة
            const result = {
                timestamp,
                level: level.toLowerCase(),
                message
            };

            // استخراج معرف المستخدم
            const userMatch = message.match(/بواسطة (\w+)/);
            if (userMatch) {
                result.userId = userMatch[1];
            }

            // استخراج اسم الأمر
            const commandMatch = message.match(/أمر (?:ناجح|فاشل) في الظل: (\w+)/);
            if (commandMatch) {
                result.commandName = commandMatch[1];
                result.success = message.includes('ناجح');
            }

            return result;
        } catch (error) {
            return null;
        }
    }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
const logger = new Logger();

export default logger;

