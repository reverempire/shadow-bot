import { RateLimiterMemory } from 'rate-limiter-flexible';
import chalk from 'chalk';
import { botConfig } from '../config/bot-config.js';

export default class RateLimitMiddleware {
    constructor() {
        // محدد معدل للأوامر العامة
        this.commandLimiter = new RateLimiterMemory({
            keyGenerator: (req) => req.userId,
            points: botConfig.security.rateLimit.max, // عدد الأوامر المسموحة
            duration: Math.floor(botConfig.security.rateLimit.window / 1000), // النافزة الزمنية بالثواني
            blockDuration: 60, // مدة الحظر بالثواني
        });

        // محدد معدل للأوامر الثقيلة
        this.heavyCommandLimiter = new RateLimiterMemory({
            keyGenerator: (req) => req.userId,
            points: 5, // أوامر أقل للأوامر الثقيلة
            duration: 300, // 5 دقائق
            blockDuration: 300, // 5 دقائق حظر
        });

        // محدد معدل للرسائل العامة
        this.messageLimiter = new RateLimiterMemory({
            keyGenerator: (req) => req.userId,
            points: 100, // رسائل أكثر مسموحة
            duration: 60, // دقيقة واحدة
            blockDuration: 30, // 30 ثانية حظر
        });

        // قائمة الأوامر الثقيلة
        this.heavyCommands = new Set([
            'تحويل_صوت',
            'تحويل_فيديو',
            'تحميل_يوتيوب',
            'بحث_صور',
            'ذكاء_اصطناعي'
        ]);
    }

    async checkCommandLimit(userId, commandName) {
        try {
            const limiter = this.heavyCommands.has(commandName) ? 
                this.heavyCommandLimiter : this.commandLimiter;

            const result = await limiter.consume(userId);
            
            return {
                allowed: true,
                remainingPoints: result.remainingPoints,
                msBeforeNext: result.msBeforeNext,
                totalHits: result.totalHits
            };

        } catch (rejRes) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            
            console.log(chalk.yellow(`⏱️ محدود المعدل: ${userId} - ${commandName} - ${secs}s`));
            
            return {
                allowed: false,
                retryAfter: secs,
                totalHits: rejRes.totalHits,
                message: `🌑 لقد تجاوزت حد استخدام أوامر الظل. انتظر ${secs} ثانية قبل المحاولة مرة أخرى.`
            };
        }
    }

    async checkMessageLimit(userId) {
        try {
            const result = await this.messageLimiter.consume(userId);
            
            return {
                allowed: true,
                remainingPoints: result.remainingPoints
            };

        } catch (rejRes) {
            const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
            
            console.log(chalk.yellow(`⏱️ محدود الرسائل: ${userId} - ${secs}s`));
            
            return {
                allowed: false,
                retryAfter: secs,
                message: `🌑 لقد تجاوزت حد إرسال الرسائل في الظل. انتظر ${secs} ثانية.`
            };
        }
    }

    async resetUserLimits(userId) {
        try {
            await this.commandLimiter.delete(userId);
            await this.heavyCommandLimiter.delete(userId);
            await this.messageLimiter.delete(userId);
            
            console.log(chalk.green(`✅ تم إعادة تعيين حدود المعدل للمستخدم: ${userId}`));
            return true;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إعادة تعيين حدود المعدل:'), error);
            return false;
        }
    }

    async getUserLimitStatus(userId) {
        try {
            const commandStatus = await this.commandLimiter.get(userId);
            const heavyCommandStatus = await this.heavyCommandLimiter.get(userId);
            const messageStatus = await this.messageLimiter.get(userId);

            return {
                commands: {
                    used: commandStatus?.totalHits || 0,
                    remaining: commandStatus?.remainingPoints || botConfig.security.rateLimit.max,
                    resetTime: commandStatus?.msBeforeNext || 0
                },
                heavyCommands: {
                    used: heavyCommandStatus?.totalHits || 0,
                    remaining: heavyCommandStatus?.remainingPoints || 5,
                    resetTime: heavyCommandStatus?.msBeforeNext || 0
                },
                messages: {
                    used: messageStatus?.totalHits || 0,
                    remaining: messageStatus?.remainingPoints || 100,
                    resetTime: messageStatus?.msBeforeNext || 0
                }
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على حالة حدود المعدل:'), error);
            return null;
        }
    }

    getCommandType(commandName) {
        return this.heavyCommands.has(commandName) ? 'heavy' : 'normal';
    }

    formatTimeRemaining(ms) {
        const seconds = Math.ceil(ms / 1000);
        if (seconds < 60) {
            return `${seconds} ثانية`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} دقيقة`;
        } else {
            const hours = Math.ceil(seconds / 3600);
            return `${hours} ساعة`;
        }
    }
}

