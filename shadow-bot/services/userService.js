import User from '../database/models/User.js';
import dbManager from '../config/database.js';
import chalk from 'chalk';

export default class UserService {
    // الحصول على مستخدم أو إنشاؤه إذا لم يكن موجوداً
    static async getOrCreateUser(whatsappId, additionalData = {}) {
        try {
            let user = await User.findByWhatsappId(whatsappId);
            
            if (!user) {
                // إنشاء مستخدم جديد
                user = new User({
                    whatsappId,
                    displayName: additionalData.displayName || '',
                    username: additionalData.username || '',
                    userType: 'user'
                });
                
                await user.save();
                console.log(chalk.green(`👤 تم تسجيل مستخدم جديد: ${user.displayName || whatsappId}`));
            } else {
                // تحديث آخر نشاط
                await user.updateLastActivity();
            }
            
            return user;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على المستخدم:'), error);
            throw error;
        }
    }

    // معالجة استخدام الأوامر
    static async handleCommandUsage(whatsappId, commandName, success = true, responseTime = 0) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) return;

            // زيادة عداد الأوامر
            await user.incrementCommandUsage();

            if (success) {
                // إضافة خبرة وألماس للأوامر الناجحة
                const xpReward = await this.getDefaultExperiencePerCommand();
                const diamondReward = await this.getDefaultDiamondsPerCommand();
                
                await user.addExperience(xpReward);
                await user.addDiamonds(diamondReward);
            }

            return user;
        } catch (error) {
            console.error(chalk.red('❌ خطأ في معالجة استخدام الأمر:'), error);
            throw error;
        }
    }

    // حظر مستخدم
    static async blockUser(whatsappId, reason, blockedBy) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) {
                throw new Error('المستخدم غير موجود');
            }

            if (user.isBlocked) {
                throw new Error('المستخدم محظور بالفعل');
            }

            await user.block(reason, blockedBy);
            
            return {
                success: true,
                user: user.toJSON(),
                message: 'تم حظر المستخدم بنجاح'
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في حظر المستخدم:'), error);
            throw error;
        }
    }

    // إلغاء حظر مستخدم
    static async unblockUser(whatsappId, unblockedBy) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) {
                throw new Error('المستخدم غير موجود');
            }

            if (!user.isBlocked) {
                throw new Error('المستخدم غير محظور');
            }

            await user.unblock();
            
            return {
                success: true,
                user: user.toJSON(),
                message: 'تم إلغاء حظر المستخدم بنجاح'
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إلغاء حظر المستخدم:'), error);
            throw error;
        }
    }

    // إضافة تحذير لمستخدم
    static async warnUser(whatsappId, reason, warnedBy) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) {
                throw new Error('المستخدم غير موجود');
            }

            const warningsCount = await user.addWarning(reason);
            
            return {
                success: true,
                user: user.toJSON(),
                warningsCount,
                isBlocked: user.isBlocked,
                message: `تم إضافة تحذير للمستخدم. إجمالي التحذيرات: ${warningsCount}`
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إضافة تحذير:'), error);
            throw error;
        }
    }

    // ترقية مستخدم لمشرف
    static async promoteToAdmin(whatsappId, promotedBy, permissions = {}) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) {
                throw new Error('المستخدم غير موجود');
            }

            if (user.userType === 'admin' || user.userType === 'developer') {
                throw new Error('المستخدم مشرف بالفعل أو مطور');
            }

            user.userType = 'admin';
            await user.save();

            // إضافة صلاحيات المشرف
            await dbManager.run(`
                INSERT INTO admins (user_id, can_ban, can_warn, can_manage_groups, can_view_logs, appointed_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                permissions.canBan || false,
                permissions.canWarn || true,
                permissions.canManageGroups || false,
                permissions.canViewLogs || false,
                promotedBy
            ]);

            return {
                success: true,
                user: user.toJSON(),
                message: 'تم ترقية المستخدم لمشرف بنجاح'
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في ترقية المستخدم:'), error);
            throw error;
        }
    }

    // إزالة صلاحيات المشرف
    static async demoteFromAdmin(whatsappId, demotedBy) {
        try {
            const user = await User.findByWhatsappId(whatsappId);
            if (!user) {
                throw new Error('المستخدم غير موجود');
            }

            if (user.userType !== 'admin') {
                throw new Error('المستخدم ليس مشرفاً');
            }

            user.userType = 'user';
            await user.save();

            // إزالة صلاحيات المشرف
            await dbManager.run(`
                UPDATE admins SET is_active = FALSE WHERE user_id = ?
            `, [user.id]);

            return {
                success: true,
                user: user.toJSON(),
                message: 'تم إزالة صلاحيات المشرف بنجاح'
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في إزالة صلاحيات المشرف:'), error);
            throw error;
        }
    }

    // الحصول على إحصائيات عامة
    static async getGeneralStats() {
        try {
            const stats = await dbManager.getStats();
            
            // إحصائيات إضافية
            const avgExperience = await dbManager.get(`
                SELECT AVG(experience_points) as avg_experience FROM users WHERE user_type = 'user'
            `);
            
            const maxLevel = await dbManager.get(`
                SELECT MAX(level) as max_level FROM users
            `);
            
            const totalCommands = await dbManager.get(`
                SELECT SUM(usage_count) as total_commands FROM commands
            `);

            return {
                ...stats,
                avg_experience: avgExperience?.avg_experience || 0,
                max_level: maxLevel?.max_level || 1,
                total_commands: totalCommands?.total_commands || 0
            };
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على الإحصائيات:'), error);
            throw error;
        }
    }

    // الحصول على قائمة المستخدمين النشطين
    static async getActiveUsers(days = 7) {
        try {
            const users = await dbManager.all(`
                SELECT * FROM users 
                WHERE last_activity > datetime('now', '-${days} days')
                ORDER BY last_activity DESC
            `);
            
            return users.map(userData => new User(userData));
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على المستخدمين النشطين:'), error);
            throw error;
        }
    }

    // الحصول على أفضل المستخدمين حسب المستوى
    static async getTopUsersByLevel(limit = 10) {
        try {
            const users = await dbManager.all(`
                SELECT * FROM users 
                WHERE user_type = 'user'
                ORDER BY level DESC, experience_points DESC
                LIMIT ?
            `, [limit]);
            
            return users.map(userData => new User(userData));
        } catch (error) {
            console.error(chalk.red('❌ خطأ في الحصول على أفضل المستخدمين:'), error);
            throw error;
        }
    }

    // حساب الأيام منذ التسجيل
    static getDaysSinceJoined(registrationDate) {
        const now = new Date();
        const joined = new Date(registrationDate);
        const diffTime = Math.abs(now - joined);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // دوال مساعدة للحصول على الإعدادات
    static async getDefaultExperiencePerCommand() {
        try {
            const setting = await dbManager.get(
                'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
                ['default_experience_per_command']
            );
            return parseInt(setting?.setting_value) || 10;
        } catch (error) {
            return 10;
        }
    }

    static async getDefaultDiamondsPerCommand() {
        try {
            const setting = await dbManager.get(
                'SELECT setting_value FROM bot_settings WHERE setting_key = ?',
                ['default_diamonds_per_command']
            );
            return parseInt(setting?.setting_value) || 1;
        } catch (error) {
            return 1;
        }
    }
}

